use serde::Serialize;
use std::path::Path;

/// How the running binary was installed. Only some layouts can replace
/// themselves safely: an MSI lives in Program Files (machine-wide), a .deb is
/// owned by the package manager and a .dmg is not signed/notarized yet.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeInfo {
    pub version: String,
    pub os: String,
    pub install_kind: String,
    pub can_self_update: bool,
}

pub fn classify(os: &str, path: &Path, appimage: bool, debug: bool) -> (&'static str, bool) {
    if debug {
        return ("dev", false);
    }

    match os {
        "linux" => {
            if appimage {
                ("appimage", true)
            } else {
                ("package", false)
            }
        }
        "windows" => {
            let location = path.to_string_lossy().to_lowercase();
            if location.contains("program files") {
                ("msi", false)
            } else {
                ("nsis", true)
            }
        }
        "macos" => ("dmg", false),
        _ => ("unknown", false),
    }
}

#[tauri::command]
pub fn runtime_info() -> RuntimeInfo {
    let os = std::env::consts::OS;
    let path = std::env::current_exe().unwrap_or_default();
    let appimage = std::env::var_os("APPIMAGE").is_some();
    let (install_kind, can_self_update) = classify(os, &path, appimage, cfg!(debug_assertions));

    RuntimeInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        os: os.to_string(),
        install_kind: install_kind.to_string(),
        can_self_update,
    }
}

#[cfg(test)]
mod tests {
    use super::classify;
    use std::path::Path;

    #[test]
    fn debug_builds_never_self_update() {
        assert_eq!(classify("windows", Path::new("C:/app.exe"), false, true), ("dev", false));
    }

    #[test]
    fn nsis_is_per_user_and_can_update() {
        let path = Path::new("C:/Users/ana/AppData/Local/Media Downloader/media-downloader.exe");
        assert_eq!(classify("windows", path, false, false), ("nsis", true));
    }

    #[test]
    fn msi_installs_do_not_update_themselves() {
        let path = Path::new("C:/Program Files/Media Downloader/media-downloader.exe");
        assert_eq!(classify("windows", path, false, false), ("msi", false));
    }

    #[test]
    fn appimage_updates_but_deb_does_not() {
        assert_eq!(classify("linux", Path::new("/tmp/app"), true, false), ("appimage", true));
        assert_eq!(classify("linux", Path::new("/usr/bin/app"), false, false), ("package", false));
    }

    #[test]
    fn macos_stays_manual() {
        assert_eq!(classify("macos", Path::new("/Applications/App.app"), false, false), ("dmg", false));
    }
}
