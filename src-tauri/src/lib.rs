mod migrations;

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    AppHandle, Emitter, Manager, State, WindowEvent,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};

/// SYS-01 "Nový výdaj" (plan F2, E8). The click is stored, not only emitted:
/// right after start the frontend may not listen yet and an event would be lost.
/// The frontend takes it after `listen` and on every `new-expense` event.
#[derive(Default)]
struct NewExpenseRequested(AtomicBool);

impl NewExpenseRequested {
    fn request(&self) {
        self.0.store(true, Ordering::SeqCst);
    }

    fn take(&self) -> bool {
        self.0.swap(false, Ordering::SeqCst)
    }
}

#[tauri::command]
fn take_new_expense(requested: State<NewExpenseRequested>) -> bool {
    requested.take()
}

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
        .manage(NewExpenseRequested::default())
        .invoke_handler(tauri::generate_handler![take_new_expense])
        .setup(|app| {
            // The only UI strings outside src/i18n/cs.ts: the tray menu is native
            // (Rust). Exception from NFR-09 until English is added (PRD v0.6, B4).
            let open = MenuItem::with_id(app, "open", "Otevřít", true, None::<&str>)?;
            let new_expense =
                MenuItem::with_id(app, "new_expense", "Nový výdaj", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Ukončit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &new_expense, &quit])?;
            let icon = app
                .default_window_icon()
                .cloned()
                .expect("bundle icon is configured in tauri.conf.json");
            // Stable id: the default contains the PID, so Omarchy's bar can't remember a pin.
            TrayIconBuilder::with_id(app.config().identifier.clone())
                .icon(icon)
                .tooltip("Life OS")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => show_main_window(app),
                    "new_expense" => {
                        app.state::<NewExpenseRequested>().request();
                        show_main_window(app);
                        let _ = app.emit("new-expense", ());
                    }
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

#[cfg(test)]
mod tests {
    use super::NewExpenseRequested;

    #[test]
    fn a_tray_click_is_taken_exactly_once() {
        let flag = NewExpenseRequested::default();
        assert!(!flag.take(), "nothing requested yet");
        flag.request();
        flag.request(); // two quick clicks still open one dialog
        assert!(flag.take());
        assert!(!flag.take(), "already taken");
    }
}
