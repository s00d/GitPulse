use crate::config;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

const DEVICE_CODE_URL: &str = "https://github.com/login/device/code";
const ACCESS_TOKEN_URL: &str = "https://github.com/login/oauth/access_token";
const OAUTH_SCOPE: &str = "repo";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum GitHubAuthStatus {
    NoToken,
    Valid,
    InvalidScope,
}

#[derive(Debug, Clone, Serialize)]
pub struct AuthDeviceCodePayload {
    pub code: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AuthVerificationUrlPayload {
    pub url: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AuthDeviceCompletedPayload {
    pub token: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AuthDeviceErrorPayload {
    pub message: String,
}

#[derive(Debug, Deserialize)]
struct DeviceCodeResponse {
    device_code: String,
    user_code: String,
    verification_uri: String,
    expires_in: u64,
    interval: u64,
}

#[derive(Debug, Deserialize)]
struct AccessTokenResponse {
    access_token: Option<String>,
    error: Option<String>,
    error_description: Option<String>,
}

struct DeviceLoginState {
    cancel: Arc<AtomicBool>,
}

impl Default for DeviceLoginState {
    fn default() -> Self {
        Self {
            cancel: Arc::new(AtomicBool::new(false)),
        }
    }
}

pub struct GitHubAuthState(Mutex<DeviceLoginState>);

impl Default for GitHubAuthState {
    fn default() -> Self {
        Self(Mutex::new(DeviceLoginState::default()))
    }
}

fn http_client() -> Result<reqwest::blocking::Client, String> {
    reqwest::blocking::Client::builder()
        .user_agent("GitPulse")
        .build()
        .map_err(|e| e.to_string())
}

pub fn verify_token_scope(token: &str) -> Result<(), String> {
    let client = http_client()?;
    let resp = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .map_err(|e| e.to_string())?;

    if resp.status() == reqwest::StatusCode::UNAUTHORIZED
        || resp.status() == reqwest::StatusCode::FORBIDDEN
    {
        return Err(
            "Token is missing the `repo` scope. Re-authorize with the `repo` scope and try again."
                .to_string(),
        );
    }

    if !resp.status().is_success() {
        return Err(format!("GitHub API error: HTTP {}", resp.status()));
    }

    if let Some(scopes) = resp.headers().get("x-oauth-scopes") {
        if let Ok(s) = scopes.to_str() {
            if !s.is_empty() {
                let granted: Vec<&str> = s.split(',').map(|v| v.trim()).collect();
                if !granted.contains(&"repo") && !granted.contains(&"public_repo") {
                    return Err(
                        "Token is missing the `repo` scope. Re-authorize with the `repo` scope and try again."
                            .to_string(),
                    );
                }
            }
        }
    }

    Ok(())
}

fn request_device_code(client_id: &str) -> Result<DeviceCodeResponse, String> {
    let client = http_client()?;
    let resp = client
        .post(DEVICE_CODE_URL)
        .header("Accept", "application/json")
        .form(&[("client_id", client_id), ("scope", OAUTH_SCOPE)])
        .send()
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let body = resp.text().unwrap_or_default();
        return Err(format!("Device code request failed: {body}"));
    }

    resp.json::<DeviceCodeResponse>()
        .map_err(|e| format!("Invalid device code response: {e}"))
}

fn poll_access_token(
    client_id: &str,
    device_code: &str,
    interval_secs: u64,
    cancel: &AtomicBool,
) -> Result<String, String> {
    let client = http_client()?;
    let mut wait = Duration::from_secs(interval_secs.max(5));

    loop {
        if cancel.load(Ordering::Relaxed) {
            return Err("Sign-in cancelled.".to_string());
        }

        std::thread::sleep(wait);

        if cancel.load(Ordering::Relaxed) {
            return Err("Sign-in cancelled.".to_string());
        }

        let resp = client
            .post(ACCESS_TOKEN_URL)
            .header("Accept", "application/json")
            .form(&[
                ("client_id", client_id),
                ("device_code", device_code),
                (
                    "grant_type",
                    "urn:ietf:params:oauth:grant-type:device_code",
                ),
            ])
            .send()
            .map_err(|e| e.to_string())?;

        let body = resp.text().map_err(|e| e.to_string())?;
        let parsed: AccessTokenResponse =
            serde_json::from_str(&body).map_err(|e| format!("Invalid token response: {e}"))?;

        if let Some(token) = parsed.access_token {
            return Ok(token);
        }

        match parsed.error.as_deref() {
            Some("authorization_pending") => continue,
            Some("slow_down") => {
                wait = wait + Duration::from_secs(5);
                continue;
            }
            Some("expired_token") => {
                return Err("Device code expired. Start sign-in again.".to_string());
            }
            Some("access_denied") => {
                return Err("Authorization denied.".to_string());
            }
            Some(other) => {
                let desc = parsed.error_description.unwrap_or_default();
                return Err(if desc.is_empty() {
                    format!("OAuth error: {other}")
                } else {
                    desc
                });
            }
            None => {
                return Err(if body.is_empty() {
                    "Unknown OAuth error.".to_string()
                } else {
                    body
                });
            }
        }
    }
}

#[tauri::command]
pub fn github_auth_status(token: Option<String>) -> GitHubAuthStatus {
    let Some(token) = token.filter(|t| !t.trim().is_empty()) else {
        return GitHubAuthStatus::NoToken;
    };
    if verify_token_scope(&token).is_ok() {
        GitHubAuthStatus::Valid
    } else {
        GitHubAuthStatus::InvalidScope
    }
}

#[tauri::command]
pub fn github_auth_verify_token(token: String) -> Result<(), String> {
    verify_token_scope(token.trim())
}

#[tauri::command]
pub fn github_auth_device_start(
    app: AppHandle,
    state: tauri::State<'_, GitHubAuthState>,
) -> Result<(), String> {
    let client_id = config::resolve_client_id(&app)?;

    let cancel = {
        let guard = state.0.lock().map_err(|e| e.to_string())?;
        guard.cancel.store(false, Ordering::Relaxed);
        Arc::clone(&guard.cancel)
    };

    let codes = request_device_code(&client_id)?;

    let _ = app.emit(
        "auth://device-code",
        AuthDeviceCodePayload {
            code: codes.user_code.clone(),
        },
    );
    let _ = app.emit(
        "auth://verification-url",
        AuthVerificationUrlPayload {
            url: codes.verification_uri.clone(),
        },
    );

    let app_poll = app.clone();
    let device_code = codes.device_code;
    let interval = codes.interval;
    let client_id_owned = client_id.to_string();

    std::thread::spawn(move || {
        let result = poll_access_token(&client_id_owned, &device_code, interval, &cancel);
        match result {
            Ok(token) => {
                match verify_token_scope(&token) {
                    Ok(()) => {
                        let _ = app_poll.emit(
                            "auth://device-completed",
                            AuthDeviceCompletedPayload { token },
                        );
                    }
                    Err(message) => {
                        let _ = app_poll.emit("auth://device-error", AuthDeviceErrorPayload {
                            message,
                        });
                    }
                }
            }
            Err(message) => {
                let _ = app_poll.emit("auth://device-error", AuthDeviceErrorPayload { message });
            }
        }
    });

    let _ = codes.expires_in;
    Ok(())
}

#[tauri::command]
pub fn github_oauth_is_configured(app: AppHandle) -> bool {
    config::is_oauth_configured(&app)
}

#[tauri::command]
pub fn github_auth_device_cancel(state: tauri::State<'_, GitHubAuthState>) -> Result<(), String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    guard.cancel.store(true, Ordering::Relaxed);
    Ok(())
}

