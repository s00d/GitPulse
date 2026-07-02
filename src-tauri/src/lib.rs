use serde::Serialize;
use tauri::{Emitter, Manager};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn app_ready(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(splash) = app.get_webview_window("splashscreen") {
        let _ = splash.close();
    }
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        let _ = main.set_focus();
    }
    Ok(())
}

#[derive(Serialize, Clone)]
struct TrayMenuPayload {
    id: String,
}

#[cfg(desktop)]
#[tauri::command]
fn tray_toggle_window(app: tauri::AppHandle) -> Result<bool, String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;
    let visible = window.is_visible().map_err(|e| e.to_string())?;
    if visible {
        window.hide().map_err(|e| e.to_string())?;
        Ok(false)
    } else {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        Ok(true)
    }
}

#[cfg(not(desktop))]
#[tauri::command]
fn tray_toggle_window(_app: tauri::AppHandle) -> Result<bool, String> {
    Err("Tray is not supported on this platform".to_string())
}

#[cfg(desktop)]
#[tauri::command]
fn tray_is_window_visible(app: tauri::AppHandle) -> Result<bool, String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;
    window.is_visible().map_err(|e| e.to_string())
}

#[cfg(not(desktop))]
#[tauri::command]
fn tray_is_window_visible(_app: tauri::AppHandle) -> Result<bool, String> {
    Err("Tray is not supported on this platform".to_string())
}

#[cfg(desktop)]
fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    use tauri::menu::{Menu, MenuItem};
    use tauri::tray::TrayIconBuilder;

    let Some(icon) = app.default_window_icon() else {
        return Ok(());
    };

    let show_hide_item = MenuItem::with_id(app, "show_hide", "Show / Hide", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_hide_item, &quit_item])?;

    let _ = TrayIconBuilder::new()
        .icon(icon.clone())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app_handle, event| {
            let id = event.id.as_ref();
            match id {
                "show_hide" => {
                    let _ = tray_toggle_window(app_handle.clone());
                }
                "quit" => {
                    app_handle.exit(0);
                }
                _ => {}
            }
            let _ = app_handle.emit(
                "tray://menu",
                TrayMenuPayload {
                    id: id.to_string(),
                },
            );
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
            #[cfg(desktop)]
            {
                setup_tray(app)?;

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
                .title("tsp")
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
            greet,
            app_ready,
            tray_toggle_window,
            tray_is_window_visible
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
