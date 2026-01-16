mod auth;
mod db;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // Auth commands
            auth::login,
            auth::logout,
            auth::get_session,
            // Connection check
            db::check_connection,
            // Deck commands
            db::get_all_decks,
            db::get_deck,
            db::create_deck,
            db::update_deck,
            db::delete_deck,
            // Card commands
            db::get_cards_for_deck,
            db::get_card,
            db::create_card,
            db::update_card,
            db::delete_card,
            // Tag commands
            db::get_tags_for_deck,
            db::get_tags_for_card,
            db::create_tag,
            db::delete_tag,
            db::add_tag_to_card,
            db::remove_tag_from_card,
            // Import/Export commands
            db::import_deck,
            db::export_deck,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
