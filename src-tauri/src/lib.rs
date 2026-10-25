mod migrations;

use tauri::{
    AppHandle, Manager, WindowEvent,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};

/// Relative to the app config dir, which differs between dev and release
/// identifiers, so dev never touches real data (PUB-03).
const DB_URL: &str = "sqlite:life-os.db";

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be the first plugin (SYS-03): plugin-sql has no busy_timeout, so a
        // second process on the same DB would fail with SQLITE_BUSY.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            show_main_window(app)
        }))
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DB_URL, migrations::migrations())
                .build(),
        )
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .setup(|app| {
            // The only UI strings outside src/i18n/cs.ts: the tray menu is native (Rust).
            let open = MenuItem::with_id(app, "open", "Otevřít", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Ukončit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &quit])?;
            let icon = app
                .default_window_icon()
                .cloned()
                .expect("bundle icon is configured in tauri.conf.json");
            TrayIconBuilder::new()
                .icon(icon)
                .tooltip("Life OS")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => show_main_window(app),
                    "quit" => app.exit(0), // bypasses CloseRequested below
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // SYS-01: closing the window hides it to the tray; only "Ukončit" quits.
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
