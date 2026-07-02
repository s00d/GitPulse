use serde::Deserialize;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const PLACEHOLDER: &str = "YOUR_CLIENT_ID_HERE";

const CONFIG_HINT: &str = "GitHub OAuth is not configured. Copy src-tauri/config/oauth.example.json to oauth.json and set github_client_id. See src-tauri/config/README.md. You can also use a PAT or import from gh.";

#[derive(Debug, Deserialize)]
struct OAuthFile {
    github_client_id: String,
}

/// Loaded once at app startup; used by device login.
pub struct OAuthConfigState(pub Option<String>);

pub fn load_oauth_config(app: &AppHandle) -> Option<String> {
    if let Ok(id) = std::env::var("GITPULSE_GITHUB_CLIENT_ID") {
        let id = id.trim().to_string();
        if is_valid_client_id(&id) {
            return Some(id);
        }
    }

    if let Some(id) = option_env!("GITPULSE_GITHUB_CLIENT_ID") {
        let id = id.trim();
        if is_valid_client_id(id) {
            return Some(id.to_string());
        }
    }

    for path in config_file_candidates(app) {
        if let Some(id) = read_oauth_file(&path) {
            return Some(id);
        }
    }

    None
}

pub fn resolve_client_id(app: &AppHandle) -> Result<String, String> {
    app.try_state::<OAuthConfigState>()
        .and_then(|state| state.0.clone())
        .ok_or_else(|| CONFIG_HINT.to_string())
}

pub fn is_oauth_configured(app: &AppHandle) -> bool {
    resolve_client_id(app).is_ok()
}

fn is_valid_client_id(id: &str) -> bool {
    !id.is_empty() && id != PLACEHOLDER
}

fn read_oauth_file(path: &PathBuf) -> Option<String> {
    let content = std::fs::read_to_string(path).ok()?;
    let cfg: OAuthFile = serde_json::from_str(&content).ok()?;
    let id = cfg.github_client_id.trim().to_string();
    if is_valid_client_id(&id) {
        Some(id)
    } else {
        None
    }
}

fn config_file_candidates(app: &AppHandle) -> Vec<PathBuf> {
    let mut paths = Vec::new();

    if let Ok(dir) = app.path().resource_dir() {
        paths.push(dir.join("config").join("oauth.json"));
    }

    paths.push(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("config")
            .join("oauth.json"),
    );
    paths.push(PathBuf::from("src-tauri/config/oauth.json"));

    paths
}
