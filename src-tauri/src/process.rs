use serde_json::{json, Value};
use std::collections::HashMap;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

use crate::paths;

pub struct JobHandle {
    pub child: Child,
    pub paused: bool,
    pub canceled: bool,
}

#[derive(Default)]
pub struct ProcessRegistry {
    pub jobs: Mutex<HashMap<String, JobHandle>>,
}

#[cfg(windows)]
pub fn hide_window(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    command.creation_flags(0x0800_0000);
}

#[cfg(not(windows))]
pub fn hide_window(_command: &mut Command) {}

fn emit(app: &AppHandle, payload: Value) {
    let _ = app.emit("engine://event", payload);
}

fn emit_phase(app: &AppHandle, id: &str, phase: &str) {
    emit(
        app,
        json!({
            "type": "progress",
            "id": id,
            "phase": phase,
        }),
    );
}

fn number(value: &str) -> Option<f64> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed == "NA" || trimmed == "None" || trimmed == "null" {
        return None;
    }
    trimmed.parse::<f64>().ok()
}

struct Progress {
    downloaded: i64,
    total: Option<i64>,
    speed: Option<f64>,
    eta: Option<f64>,
    percent: f64,
}

fn parse_progress(line: &str) -> Option<Progress> {
    let rest = line.strip_prefix("dl|")?;
    let parts: Vec<&str> = rest.split('|').collect();
    let value = |index: usize| parts.get(index).copied();
    let downloaded = number(value(0)?)?;
    let total = number(value(1).unwrap_or("")).or_else(|| number(value(2).unwrap_or("")));
    let speed = number(value(3).unwrap_or(""));
    let eta = number(value(4).unwrap_or(""));
    let mut percent = number(value(5).unwrap_or(""));
    if percent.is_none() {
        percent = match total {
            Some(total) if total > 0.0 => Some(downloaded / total),
            _ => Some(0.0),
        };
    }
    let mut percent = percent.unwrap_or(0.0);
    if percent > 1.0001 {
        percent /= 100.0;
    }
    Some(Progress {
        downloaded: downloaded.max(0.0).round() as i64,
        total: total.filter(|value| *value > 0.0).map(|value| value.round() as i64),
        speed,
        eta,
        percent: percent.clamp(0.0, 1.0),
    })
}

fn is_post_process(line: &str) -> bool {
    line.starts_with("[Merger]")
        || line.starts_with("[ExtractAudio]")
        || line.starts_with("[VideoConvertor]")
        || line.starts_with("[VideoRemuxer]")
        || line.starts_with("[EmbedThumbnail]")
        || line.starts_with("[Metadata]")
        || line.starts_with("[FixupM3u8]")
        || line.starts_with("[FixupM4a]")
}

fn absolute_path(line: &str) -> Option<String> {
    let trimmed = line.trim();
    if trimmed.starts_with('/') || trimmed.starts_with("\\\\") {
        return Some(trimmed.to_string());
    }
    let bytes = trimmed.as_bytes();
    if bytes.len() > 3
        && bytes[0].is_ascii_alphabetic()
        && bytes[1] == b':'
        && (bytes[2] == b'\\' || bytes[2] == b'/')
    {
        return Some(trimmed.to_string());
    }
    None
}

pub fn kill_tree(child: &mut Child) {
    #[cfg(windows)]
    {
        let pid = child.id();
        let _ = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
    let _ = child.kill();
}

fn last_error(lines: &[String]) -> String {
    lines
        .iter()
        .rev()
        .map(|line| line.trim())
        .find(|line| !line.is_empty() && !line.starts_with("WARNING"))
        .map(|line| line.strip_prefix("ERROR: ").unwrap_or(line).to_string())
        .unwrap_or_else(|| "La descarga falló".to_string())
}

fn with_ffmpeg(app: &AppHandle, mut args: Vec<String>) -> Vec<String> {
    if args.iter().any(|arg| arg == "--ffmpeg-location") {
        return args;
    }
    if let Some(dir) = paths::ffmpeg_dir(app) {
        let at = args.len().saturating_sub(1);
        args.insert(at, dir);
        args.insert(at, "--ffmpeg-location".to_string());
    }
    args
}

pub fn probe_blocking(app: &AppHandle, args: Vec<String>) -> Result<Value, String> {
    let tool = paths::resolve_tool(app, "yt-dlp")
        .ok_or_else(|| "No se encontró yt-dlp. Instalalo con npm run setup:engine.".to_string())?;
    let args = with_ffmpeg(app, args);

    let mut command = Command::new(tool);
    command
        .args(&args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    hide_window(&mut command);

    let output = command
        .output()
        .map_err(|error| format!("No se pudo ejecutar yt-dlp: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let lines: Vec<String> = stderr.lines().map(|line| line.to_string()).collect();
        return Err(last_error(&lines));
    }

    serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("Respuesta inesperada del motor: {error}"))
}

fn read_new_lines(
    path: &std::path::Path,
    position: &mut u64,
    pending: &mut Vec<u8>,
    on_line: &mut dyn FnMut(String),
) {
    use std::io::{Read, Seek, SeekFrom};

    let Ok(mut file) = std::fs::File::open(path) else {
        return;
    };
    let length = file.metadata().map(|meta| meta.len()).unwrap_or(0);
    if length <= *position {
        return;
    }
    if file.seek(SeekFrom::Start(*position)).is_err() {
        return;
    }
    let mut buffer = Vec::new();
    if file.read_to_end(&mut buffer).is_err() {
        return;
    }
    *position = length;
    pending.extend_from_slice(&buffer);

    while let Some(index) = pending.iter().position(|byte| *byte == b'\n') {
        let bytes: Vec<u8> = pending.drain(..=index).collect();
        let line = String::from_utf8_lossy(&bytes).trim_end().to_string();
        on_line(line);
    }
}

pub fn spawn_ytdlp(app: AppHandle, id: String, args: Vec<String>) -> Result<(), String> {
    use std::fs::File;

    let tool = paths::resolve_tool(&app, "yt-dlp")
        .ok_or_else(|| "No se encontró yt-dlp. Instalalo con npm run setup:engine.".to_string())?;
    let args = with_ffmpeg(&app, args);

    let log_path = std::env::temp_dir().join(format!("media-downloader-{id}.log"));
    let log_file = File::create(&log_path).map_err(|error| format!("No se pudo crear el log: {error}"))?;
    let log_for_stderr = log_file
        .try_clone()
        .map_err(|error| format!("No se pudo duplicar el log: {error}"))?;

    let mut command = Command::new(tool);
    command
        .args(&args)
        .stdin(Stdio::null())
        .stdout(Stdio::from(log_file))
        .stderr(Stdio::from(log_for_stderr));
    hide_window(&mut command);

    let child = command
        .spawn()
        .map_err(|error| format!("No se pudo iniciar yt-dlp: {error}"))?;

    {
        let registry = app.state::<ProcessRegistry>();
        let mut jobs = registry.jobs.lock().map_err(|_| "Registry bloqueado")?;
        if let Some(mut previous) = jobs.remove(&id) {
            kill_tree(&mut previous.child);
        }
        jobs.insert(
            id.clone(),
            JobHandle {
                child,
                paused: false,
                canceled: false,
            },
        );
    }

    thread::spawn(move || {
        let registry = app.state::<ProcessRegistry>();
        let mut position = 0_u64;
        let mut pending: Vec<u8> = Vec::new();
        let mut last_emit = Instant::now() - Duration::from_secs(1);
        let mut last_percent = -1.0_f64;
        let mut processing = false;
        let mut file_path: Option<String> = None;
        let mut error_line: Option<String> = None;

        let mut handle = |line: String| {
            if let Some(progress) = parse_progress(&line) {
                let now = Instant::now();
                let is_terminal = progress.percent >= 1.0;
                if is_terminal
                    || last_percent < 0.0
                    || now.duration_since(last_emit) >= Duration::from_millis(120)
                    || (progress.percent - last_percent).abs() >= 0.01
                {
                    last_emit = now;
                    last_percent = progress.percent;
                    emit(
                        &app,
                        json!({
                            "type": "progress",
                            "id": id,
                            "phase": if processing { "processing" } else { "downloading" },
                            "percent": progress.percent,
                            "downloadedBytes": progress.downloaded,
                            "totalBytes": progress.total,
                            "speedBps": progress.speed,
                            "etaSec": progress.eta,
                        }),
                    );
                }
                return;
            }

            if is_post_process(&line) {
                if !processing {
                    processing = true;
                    emit_phase(&app, &id, "processing");
                }
                return;
            }

            if line.starts_with("ERROR:") {
                error_line = Some(line.clone());
                return;
            }

            if let Some(path) = absolute_path(&line) {
                file_path = Some(path);
            }
        };

        loop {
            thread::sleep(Duration::from_millis(150));
            read_new_lines(&log_path, &mut position, &mut pending, &mut handle);

            let mut jobs = match registry.jobs.lock() {
                Ok(jobs) => jobs,
                Err(_) => return,
            };

            let Some(job) = jobs.get_mut(&id) else {
                return;
            };

            match job.child.try_wait() {
                Ok(Some(status)) => {
                    let paused = job.paused;
                    let canceled = job.canceled;
                    jobs.remove(&id);
                    drop(jobs);

                    read_new_lines(&log_path, &mut position, &mut pending, &mut handle);

                    if paused {
                        emit_phase(&app, &id, "paused");
                    } else if canceled {
                        emit_phase(&app, &id, "canceled");
                    } else if status.success() {
                        emit(
                            &app,
                            json!({
                                "type": "progress",
                                "id": id,
                                "phase": "done",
                                "percent": 1.0,
                                "filePath": file_path,
                            }),
                        );
                    } else {
                        emit(
                            &app,
                            json!({
                                "type": "progress",
                                "id": id,
                                "phase": "error",
                                "message": error_line
                                    .map(|line| line.trim_start_matches("ERROR: ").to_string())
                                    .unwrap_or_else(|| format!("yt-dlp terminó con código {status}")),
                            }),
                        );
                    }

                    let _ = std::fs::remove_file(&log_path);
                    return;
                }
                Ok(None) => {
                    drop(jobs);
                }
                Err(error) => {
                    jobs.remove(&id);
                    drop(jobs);
                    emit(
                        &app,
                        json!({
                            "type": "progress",
                            "id": id,
                            "phase": "error",
                            "message": error.to_string(),
                        }),
                    );
                    let _ = std::fs::remove_file(&log_path);
                    return;
                }
            }
        }
    });

    Ok(())
}

pub fn pause(app: &AppHandle, id: &str) -> Result<(), String> {
    {
        let registry = app.state::<ProcessRegistry>();
        let mut jobs = registry.jobs.lock().map_err(|_| "Registry bloqueado")?;
        if let Some(job) = jobs.get_mut(id) {
            job.paused = true;
            kill_tree(&mut job.child);
        }
    }
    emit_phase(app, id, "paused");
    Ok(())
}

pub fn cancel(app: &AppHandle, id: &str) -> Result<(), String> {
    {
        let registry = app.state::<ProcessRegistry>();
        let mut jobs = registry.jobs.lock().map_err(|_| "Registry bloqueado")?;
        if let Some(job) = jobs.get_mut(id) {
            job.canceled = true;
            kill_tree(&mut job.child);
        }
    }
    emit_phase(app, id, "canceled");
    Ok(())
}

pub fn spawn_ffmpeg(app: AppHandle, id: String, args: Vec<String>) -> Result<(), String> {
    let tool = paths::resolve_tool(&app, "ffmpeg")
        .ok_or_else(|| "No se encontró ffmpeg. Instalalo con npm run setup:engine.".to_string())?;

    let output_path = args.last().cloned();
    emit_phase(&app, &id, "processing");

    thread::spawn(move || {
        let mut command = Command::new(tool);
        command
            .args(&args)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::piped());
        hide_window(&mut command);

        match command.output() {
            Ok(output) if output.status.success() => {
                emit(
                    &app,
                    json!({
                        "type": "progress",
                        "id": id,
                        "phase": "done",
                        "percent": 1.0,
                        "filePath": output_path,
                    }),
                );
            }
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let lines: Vec<String> = stderr.lines().map(|line| line.to_string()).collect();
                emit(
                    &app,
                    json!({
                        "type": "progress",
                        "id": id,
                        "phase": "error",
                        "message": last_error(&lines),
                    }),
                );
            }
            Err(error) => {
                emit(
                    &app,
                    json!({
                        "type": "progress",
                        "id": id,
                        "phase": "error",
                        "message": error.to_string(),
                    }),
                );
            }
        }
    });

    Ok(())
}
