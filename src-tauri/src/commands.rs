use serde_json::{json, Value};
use std::process::{Command, Stdio};
use tauri::AppHandle;

use crate::paths;
use crate::process;
use crate::settings;

fn version_of(path: &std::path::Path, args: &[&str]) -> Option<String> {
    let mut command = Command::new(path);
    command
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    process::hide_window(&mut command);
    let output = command.output().ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let line = stdout.lines().next()?.trim();
    if line.is_empty() {
        return None;
    }
    let mut parts = line.split_whitespace();
    let first = parts.next()?;
    if first.eq_ignore_ascii_case("ffmpeg") {
        parts.next()?;
        let version = parts.next()?;
        return Some(version.split('-').next().unwrap_or(version).to_string());
    }
    Some(first.to_string())
}

#[tauri::command]
pub async fn capabilities(app: AppHandle) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let bin_dir = paths::app_bin_dir(&app);
        let _ = std::fs::create_dir_all(&bin_dir);
        let default_dir = paths::default_download_dir();
        let _ = std::fs::create_dir_all(&default_dir);

        let ytdlp = paths::resolve_tool(&app, "yt-dlp").and_then(|path| version_of(&path, &["--version"]));
        let ffmpeg = paths::resolve_tool(&app, "ffmpeg").and_then(|path| version_of(&path, &["-version"]));

        Ok(json!({
            "ytdlp": ytdlp,
            "ffmpeg": ffmpeg,
            "binDir": bin_dir.to_string_lossy(),
            "platform": std::env::consts::OS,
            "defaultDir": default_dir.to_string_lossy(),
        }))
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn probe(app: AppHandle, args: Vec<String>) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || process::probe_blocking(&app, args))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn start_download(app: AppHandle, id: String, args: Vec<String>) -> Result<(), String> {
    process::spawn_ytdlp(app, id, args)
}

#[tauri::command]
pub fn pause_download(app: AppHandle, id: String) -> Result<(), String> {
    process::pause(&app, &id)
}

#[tauri::command]
pub fn cancel_download(app: AppHandle, id: String) -> Result<(), String> {
    process::cancel(&app, &id)
}

#[tauri::command]
pub fn convert(app: AppHandle, id: String, args: Vec<String>) -> Result<(), String> {
    process::spawn_ffmpeg(app, id, args)
}

#[tauri::command]
pub fn load_settings(app: AppHandle) -> Option<Value> {
    settings::read_settings(&app)
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: Value) -> Result<(), String> {
    crate::settings::write_settings(&app, &settings)
}

#[tauri::command]
pub fn default_download_dir() -> String {
    paths::default_download_dir().to_string_lossy().to_string()
}
