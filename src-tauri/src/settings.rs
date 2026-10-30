use serde_json::Value;
use std::fs;
use tauri::{AppHandle, Manager};

fn settings_path(app: &AppHandle) -> Option<std::path::PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|dir| dir.join("settings.json"))
}

pub fn read_settings(app: &AppHandle) -> Option<Value> {
    let path = settings_path(app)?;
    let raw = fs::read_to_string(path).ok()?;
    serde_json::from_str(&raw).ok()
}

pub fn write_settings(app: &AppHandle, settings: &Value) -> Result<(), String> {
    let path = settings_path(app).ok_or_else(|| "No se pudo resolver la carpeta de configuración".to_string())?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let raw = serde_json::to_string_pretty(settings).map_err(|error| error.to_string())?;
    fs::write(path, raw).map_err(|error| error.to_string())
}
