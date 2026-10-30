mod commands;
mod paths;
mod process;
mod settings;

use process::ProcessRegistry;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(ProcessRegistry::default())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.primary_monitor() {
                    let logical = monitor.size().to_logical::<f64>(monitor.scale_factor());
                    let width = (logical.width - 24.0).clamp(960.0, 1280.0);
                    let height = (logical.height - 48.0).clamp(600.0, 820.0);
                    let _ = window.set_size(tauri::LogicalSize::new(width, height));
                    let _ = window.center();
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::capabilities,
            commands::probe,
            commands::start_download,
            commands::pause_download,
            commands::cancel_download,
            commands::convert,
            commands::load_settings,
            commands::save_settings,
            commands::default_download_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Media Downloader");
}
