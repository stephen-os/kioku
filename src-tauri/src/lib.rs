mod auth;
mod db;

use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: r#"
                -- Single user session (remote-first, one user at a time)
                CREATE TABLE IF NOT EXISTS session (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    user_id INTEGER NOT NULL,
                    email TEXT NOT NULL,
                    token TEXT NOT NULL,
                    api_url TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                -- Decks (cached from remote, single user so no user_id needed)
                CREATE TABLE IF NOT EXISTS decks (
                    id TEXT PRIMARY KEY,
                    server_id INTEGER UNIQUE,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    sync_status TEXT NOT NULL DEFAULT 'synced'
                );

                -- Cards
                CREATE TABLE IF NOT EXISTS cards (
                    id TEXT PRIMARY KEY,
                    server_id INTEGER UNIQUE,
                    deck_id TEXT NOT NULL,
                    front TEXT NOT NULL,
                    front_type TEXT NOT NULL DEFAULT 'TEXT',
                    front_language TEXT,
                    back TEXT NOT NULL,
                    back_type TEXT NOT NULL DEFAULT 'TEXT',
                    back_language TEXT,
                    notes TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    sync_status TEXT NOT NULL DEFAULT 'synced',
                    FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
                );

                -- Tags
                CREATE TABLE IF NOT EXISTS tags (
                    id TEXT PRIMARY KEY,
                    server_id INTEGER UNIQUE,
                    deck_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    sync_status TEXT NOT NULL DEFAULT 'synced',
                    FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
                );

                -- Card-Tag relationships
                CREATE TABLE IF NOT EXISTS card_tags (
                    card_id TEXT NOT NULL,
                    tag_id TEXT NOT NULL,
                    PRIMARY KEY (card_id, tag_id),
                    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
                );

                -- Sync queue for offline changes
                CREATE TABLE IF NOT EXISTS sync_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    entity_type TEXT NOT NULL,
                    entity_id TEXT NOT NULL,
                    operation TEXT NOT NULL,
                    payload TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                -- Indexes
                CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
                CREATE INDEX IF NOT EXISTS idx_tags_deck_id ON tags(deck_id);
                CREATE INDEX IF NOT EXISTS idx_card_tags_card_id ON card_tags(card_id);
                CREATE INDEX IF NOT EXISTS idx_card_tags_tag_id ON card_tags(tag_id);
                CREATE INDEX IF NOT EXISTS idx_decks_server_id ON decks(server_id);
                CREATE INDEX IF NOT EXISTS idx_cards_server_id ON cards(server_id);
            "#,
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:kioku.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // Auth commands
            auth::login,
            auth::logout,
            auth::get_session,
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
            db::create_tag,
            db::delete_tag,
            db::add_tag_to_card,
            db::remove_tag_from_card,
            // Import/Export commands
            db::import_deck,
            db::export_deck,
            db::sync_pending,
            db::get_pending_count,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
