use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

/// Database state wrapper for Tauri state management
pub struct DbState(pub Mutex<Connection>);

/// Get the path to the SQLite database file
pub fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    fs::create_dir_all(&app_data).map_err(|e| format!("Failed to create dir: {}", e))?;

    Ok(app_data.join("kioku.db"))
}

/// Initialize the database connection and schema
pub fn init_database(app: &AppHandle) -> Result<Connection, String> {
    let path = get_db_path(app)?;
    let conn = Connection::open(&path).map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|e| format!("Failed to enable foreign keys: {}", e))?;

    // Initialize schema (all CREATE TABLE IF NOT EXISTS, so safe to run multiple times)
    let schema = include_str!("../../migrations/schema.sql");
    conn.execute_batch(schema)
        .map_err(|e| format!("Failed to initialize database schema: {}", e))?;

    // Run migrations for existing databases
    run_migrations(&conn)?;

    Ok(conn)
}

/// Run database migrations for schema updates
fn run_migrations(conn: &Connection) -> Result<(), String> {
    // Migration: Add shuffle_cards column to decks table
    let has_shuffle_cards: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('decks') WHERE name = 'shuffle_cards'",
            [],
            |row| row.get::<_, i32>(0),
        )
        .map(|count| count > 0)
        .unwrap_or(false);

    if !has_shuffle_cards {
        conn.execute(
            "ALTER TABLE decks ADD COLUMN shuffle_cards INTEGER NOT NULL DEFAULT 0",
            [],
        )
        .map_err(|e| format!("Failed to add shuffle_cards column: {}", e))?;
    }

    // Migration: Add avatar column to users table
    let has_avatar: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('users') WHERE name = 'avatar'",
            [],
            |row| row.get::<_, i32>(0),
        )
        .map(|count| count > 0)
        .unwrap_or(false);

    if !has_avatar {
        conn.execute(
            "ALTER TABLE users ADD COLUMN avatar TEXT NOT NULL DEFAULT 'avatar-smile'",
            [],
        )
        .map_err(|e| format!("Failed to add avatar column: {}", e))?;
    }

    Ok(())
}
