use crate::github_auth::verify_token_scope;
use serde::Serialize;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum GhCliStatus {
    NotInstalled,
    InstalledNotAuthed,
    Authed,
}

fn locate_gh() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = Command::new("where").arg("gh").output() {
            let path = String::from_utf8_lossy(&output.stdout)
                .lines()
                .next()
                .unwrap_or("")
                .trim()
                .to_string();
            if !path.is_empty() {
                return Some(PathBuf::from(path));
            }
        }
        for c in [
            r"C:\Program Files\GitHub CLI\gh.exe",
            r"C:\Program Files (x86)\GitHub CLI\gh.exe",
        ] {
            let p = PathBuf::from(c);
            if p.is_file() {
                return Some(p);
            }
        }
        return None;
    }

    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(output) = Command::new("sh").arg("-lc").arg("command -v gh").output() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Some(PathBuf::from(path));
            }
        }
        for c in ["/opt/homebrew/bin/gh", "/usr/local/bin/gh", "/usr/bin/gh"] {
            let p = PathBuf::from(c);
            if p.is_file() {
                return Some(p);
            }
        }
        None
    }
}

fn run_gh(args: &[&str]) -> Result<(i32, String, String), String> {
    let gh = locate_gh().ok_or_else(|| "GitHub CLI (gh) is not installed.".to_string())?;
    let output = Command::new(&gh)
        .args(args)
        .output()
        .map_err(|e| e.to_string())?;
    Ok((
        output.status.code().unwrap_or(-1),
        String::from_utf8_lossy(&output.stdout).to_string(),
        String::from_utf8_lossy(&output.stderr).to_string(),
    ))
}

#[tauri::command]
pub fn gh_cli_status() -> GhCliStatus {
    let Some(_) = locate_gh() else {
        return GhCliStatus::NotInstalled;
    };
    match run_gh(&["auth", "status", "--hostname", "github.com"]) {
        Ok((0, _, _)) => GhCliStatus::Authed,
        Ok(_) => GhCliStatus::InstalledNotAuthed,
        Err(_) => GhCliStatus::NotInstalled,
    }
}

#[tauri::command]
pub fn gh_cli_import_token() -> Result<String, String> {
    let (status, stdout, stderr) = run_gh(&["auth", "token", "--hostname", "github.com"])?;
    if status != 0 {
        return Err(if stderr.trim().is_empty() {
            "GitHub CLI is not signed in.".to_string()
        } else {
            stderr.trim().to_string()
        });
    }
    let token = stdout.trim().to_string();
    if token.is_empty() {
        return Err("GitHub CLI is not signed in.".to_string());
    }
    verify_token_scope(&token)?;
    Ok(token)
}
