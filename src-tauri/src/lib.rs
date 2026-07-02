mod config;
mod gh_cli;
mod github_auth;

use serde::Serialize;
use tauri::{Emitter, Manager};

use gh_cli::{gh_cli_import_token, gh_cli_status};
use config::OAuthConfigState;
use github_auth::{
    GitHubAuthState, github_auth_device_cancel, github_auth_device_start, github_auth_status,
    github_auth_verify_token, github_oauth_is_configured,
};

#[cfg(target_os = "macos")]
fn set_dock_visible(app: &tauri::AppHandle, visible: bool) {
    let policy = if visible {
        tauri::ActivationPolicy::Regular
    } else {
        tauri::ActivationPolicy::Accessory
    };
    let _ = app.set_activation_policy(policy);
}

#[tauri::command]
fn app_ready(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(splash) = app.get_webview_window("splashscreen") {
        let _ = splash.close();
    }
    #[cfg(desktop)]
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.hide();
    }
    #[cfg(target_os = "macos")]
    set_dock_visible(&app, false);
    let _ = app.emit("app://ready", ());
    Ok(())
}

#[tauri::command]
fn show_main_window(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    set_dock_visible(&app, true);

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    let _ = app.emit("app://screen", "dashboard");
    let _ = app.emit("app://refresh-requested", ());
    Ok(())
}

#[tauri::command]
fn show_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    set_dock_visible(&app, true);

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    let _ = app.emit("app://screen", "settings");
    let _ = app.emit("app://refresh-requested", ());
    Ok(())
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[derive(Serialize, Clone)]
struct TrayBadgePayload {
    count: u32,
}

#[cfg(desktop)]
#[tauri::command]
fn tray_set_badge(app: tauri::AppHandle, count: u32) -> Result<(), String> {
    let tray = app
        .tray_by_id("main-tray")
        .ok_or_else(|| "Tray icon not found".to_string())?;
    let title = if count > 0 {
        format!(" {count}")
    } else {
        String::new()
    };
    tray.set_title(Some(&title)).map_err(|e| e.to_string())?;
    let tooltip = if count > 0 {
        format!("GitPulse — {count} items")
    } else {
        "GitPulse".to_string()
    };
    tray.set_tooltip(Some(&tooltip)).map_err(|e| e.to_string())?;
    let _ = app.emit("tray://badge", TrayBadgePayload { count });
    Ok(())
}

#[cfg(not(desktop))]
#[tauri::command]
fn tray_set_badge(_app: tauri::AppHandle, _count: u32) -> Result<(), String> {
    Err("Tray is not supported on this platform".to_string())
}

#[cfg(desktop)]
fn configure_main_window(app: &tauri::App) -> tauri::Result<()> {
    use tauri::WindowEvent;

    if let Some(main) = app.get_webview_window("main") {
        let window = main.clone();
        let app_handle = app.handle().clone();
        main.on_window_event(move |event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
                #[cfg(target_os = "macos")]
                set_dock_visible(&app_handle, false);
            }
        });
    }

    Ok(())
}

#[cfg(desktop)]
fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    use tauri::menu::{Menu, MenuItem};
    use tauri::tray::TrayIconBuilder;
    use tauri_plugin_opener::OpenerExt;

    let Some(icon) = app.default_window_icon() else {
        return Ok(());
    };

    let loading = MenuItem::with_id(app, "loading", "Loading…", false, None::<&str>)?;
    let menu = Menu::with_items(app, &[&loading])?;

    let _ = TrayIconBuilder::with_id("main-tray")
        .icon(icon.clone())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app_handle, event| {
            let id = event.id.as_ref();
            if id == "action:quit" {
                app_handle.exit(0);
            } else if id == "action:open" {
                let _ = show_main_window(app_handle.clone());
            } else if id == "action:settings" {
                let _ = show_settings_window(app_handle.clone());
            } else if id == "action:refresh" {
                let _ = app_handle.emit("tray://action", "refresh");
            } else if id == "action:about" {
                let _ = app_handle.opener().open_url("https://github.com/s00d/GitPulse", None::<&str>);
            } else if let Some(url) = id.strip_prefix("open:") {
                let _ = app_handle.emit("tray://open", url.to_string());
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(GitHubAuthState::default())
        .plugin(tauri_plugin_keyring_store::init())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_iap::init())
        .setup(|app| {
            let oauth_client_id = config::load_oauth_config(app.handle());
            app.manage(OAuthConfigState(oauth_client_id));

            #[cfg(desktop)]
            {
                setup_tray(app)?;
                configure_main_window(app)?;

                let dark_bg = tauri::window::Color(0x0F, 0x17, 0x2A, 0xFF);
                let light_bg = tauri::window::Color(0xF7, 0xF8, 0xFB, 0xFF);
                let is_dark = app
                    .get_webview_window("main")
                    .and_then(|w| w.theme().ok())
                    .map(|t| matches!(t, tauri::Theme::Dark))
                    .unwrap_or(true);
                let splash_bg = if is_dark { dark_bg } else { light_bg };

                if let Some(main) = app.get_webview_window("main") {
                    let _ = main.set_background_color(Some(splash_bg));
                }

                let _ = tauri::WebviewWindowBuilder::new(
                    app,
                    "splashscreen",
                    tauri::WebviewUrl::App("splashscreen.html".into()),
                )
                .title("GitPulse")
                .inner_size(360.0, 420.0)
                .resizable(false)
                .decorations(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .center()
                .background_color(splash_bg)
                .build();
            }

            #[cfg(any(target_os = "android", target_os = "ios"))]
            {
                if let Some(main) = app.get_webview_window("main") {
                    let _ = main.show();
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_ready,
            show_main_window,
            show_settings_window,
            quit_app,
            tray_set_badge,
            gh_cli_status,
            gh_cli_import_token,
            github_auth_status,
            github_auth_verify_token,
            github_auth_device_start,
            github_auth_device_cancel,
            github_oauth_is_configured,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            if let tauri::RunEvent::ExitRequested { api, code, .. } = event {
                if code.is_none() {
                    api.prevent_exit();
                }
            }
        });
}
