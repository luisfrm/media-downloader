use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub fn home_dir() -> PathBuf {
    std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."))
}

pub fn default_download_dir() -> PathBuf {
    home_dir().join("Downloads").join("Media Downloader")
}

pub fn app_bin_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join("bin"))
        .unwrap_or_else(|_| default_download_dir())
}

fn executable_name(name: &str) -> String {
    if cfg!(windows) {
        format!("{name}.exe")
    } else {
        name.to_string()
    }
}

pub fn resolve_tool(app: &AppHandle, name: &str) -> Option<PathBuf> {
    let exe = executable_name(name);
    let mut candidates: Vec<PathBuf> = Vec::new();

    candidates.push(app_bin_dir(app).join(&exe));

    if cfg!(debug_assertions) {
        candidates.push(
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("binaries")
                .join(&exe),
        );
    }

    for candidate in candidates {
        if candidate.is_file() {
            return Some(candidate);
        }
    }

    if let Some(path) = std::env::var_os("PATH") {
        for dir in std::env::split_paths(&path) {
            let candidate = dir.join(&exe);
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }

    None
}

pub fn ffmpeg_dir(app: &AppHandle) -> Option<String> {
    resolve_tool(app, "ffmpeg")
        .and_then(|path| path.parent().map(|dir| dir.to_string_lossy().to_string()))
}
