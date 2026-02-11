use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

// ============================================
// Sync Status Enum
// ============================================

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncStatus {
    LocalOnly,
    Synced,
    PendingSync,
    Conflict,
}

impl SyncStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            SyncStatus::LocalOnly => "local_only",
            SyncStatus::Synced => "synced",
            SyncStatus::PendingSync => "pending_sync",
            SyncStatus::Conflict => "conflict",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "synced" => SyncStatus::Synced,
            "pending_sync" => SyncStatus::PendingSync,
            "conflict" => SyncStatus::Conflict,
            _ => SyncStatus::LocalOnly,
        }
    }
}

// ============================================
// Data Models with Sync Metadata
// ============================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Deck {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub shuffle_cards: bool,
    pub created_at: String,
    pub updated_at: String,
    pub remote_id: Option<i64>,
    pub sync_status: SyncStatus,
    pub last_synced_at: Option<String>,
    pub remote_updated_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub card_count: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CardTag {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Card {
    pub id: String,
    pub deck_id: String,
    pub front: String,
    pub front_type: String,
    pub front_language: Option<String>,
    pub back: String,
    pub back_type: String,
    pub back_language: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub remote_id: Option<i64>,
    #[serde(default)]
    pub tags: Vec<CardTag>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub deck_id: String,
    pub name: String,
    pub remote_id: Option<i64>,
}

// ============================================
// Quiz Data Models
// ============================================

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QuestionType {
    MultipleChoice,
    FillInBlank,
}

impl QuestionType {
    pub fn from_str(s: &str) -> Self {
        match s {
            "fill_in_blank" => QuestionType::FillInBlank,
            _ => QuestionType::MultipleChoice,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Quiz {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub shuffle_questions: bool,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub questions: Vec<Question>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub question_count: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuizTag {
    pub id: String,
    pub quiz_id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuestionTag {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Question {
    pub id: String,
    pub quiz_id: String,
    pub question_type: QuestionType,
    pub content: String,
    pub content_type: String,
    pub content_language: Option<String>,
    pub correct_answer: Option<String>,  // For fill_in_blank
    pub multiple_answers: bool,           // For multiple_choice
    pub explanation: Option<String>,
    pub position: i32,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub choices: Vec<Choice>,
    #[serde(default)]
    pub tags: Vec<QuestionTag>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Choice {
    pub id: String,
    pub question_id: String,
    pub text: String,
    pub is_correct: bool,
    pub position: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuizAttempt {
    pub id: String,
    pub quiz_id: String,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub duration_seconds: Option<i32>,
    pub total_questions: i32,
    pub correct_answers: i32,
    pub score_percentage: i32,
    #[serde(default)]
    pub question_results: Vec<QuestionResult>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuestionResult {
    pub id: String,
    pub attempt_id: String,
    pub question_id: String,
    pub user_answer: Option<String>,
    pub is_correct: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StudySession {
    pub id: String,
    pub deck_id: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub duration_seconds: Option<i32>,
    pub cards_studied: i32,
}

// ============================================
// Quiz Statistics (aggregated views)
// ============================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuizStats {
    pub quiz_id: String,
    pub total_attempts: i32,
    pub average_score: f64,
    pub best_score: i32,
    pub average_duration_seconds: Option<i32>,
    pub last_attempt_at: Option<String>,
    pub recent_scores: Vec<i32>,  // Last 5 attempts
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DeckStudyStats {
    pub deck_id: String,
    pub total_sessions: i32,
    pub total_study_time_seconds: i32,
    pub total_cards_studied: i32,
    pub last_studied_at: Option<String>,
}

// ============================================
// Request Types
// ============================================

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDeckRequest {
    pub name: String,
    pub description: Option<String>,
    pub shuffle_cards: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDeckRequest {
    pub name: String,
    pub description: Option<String>,
    pub shuffle_cards: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCardRequest {
    pub front: String,
    pub front_type: Option<String>,
    pub front_language: Option<String>,
    pub back: String,
    pub back_type: Option<String>,
    pub back_language: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCardRequest {
    pub front: String,
    pub front_type: Option<String>,
    pub front_language: Option<String>,
    pub back: String,
    pub back_type: Option<String>,
    pub back_language: Option<String>,
    pub notes: Option<String>,
}

// Quiz request types
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateQuizRequest {
    pub name: String,
    pub description: Option<String>,
    pub shuffle_questions: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateQuizRequest {
    pub name: String,
    pub description: Option<String>,
    pub shuffle_questions: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateQuestionRequest {
    pub question_type: String,
    pub content: String,
    pub content_type: Option<String>,
    pub content_language: Option<String>,
    pub correct_answer: Option<String>,
    pub multiple_answers: Option<bool>,
    pub explanation: Option<String>,
    pub choices: Option<Vec<CreateChoiceRequest>>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateQuestionRequest {
    pub question_type: String,
    pub content: String,
    pub content_type: Option<String>,
    pub content_language: Option<String>,
    pub correct_answer: Option<String>,
    pub multiple_answers: Option<bool>,
    pub explanation: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateChoiceRequest {
    pub text: String,
    pub is_correct: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitQuizRequest {
    pub answers: Vec<QuestionAnswer>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionAnswer {
    pub question_id: String,
    pub answer: String,  // Choice IDs (comma-separated for multiple) or text for fill_in_blank
}

// ============================================
// Local User Types
// ============================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LocalUser {
    pub id: String,
    pub name: String,
    pub has_password: bool,
    pub avatar: String,
    pub created_at: String,
    pub last_login_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUserRequest {
    pub name: String,
    pub password: Option<String>,
    pub avatar: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginRequest {
    pub user_id: String,
    pub password: Option<String>,
}

// ============================================
// Database State Management
// ============================================

pub struct DbState(pub Mutex<Connection>);

pub fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    fs::create_dir_all(&app_data).map_err(|e| format!("Failed to create dir: {}", e))?;

    Ok(app_data.join("kioku.db"))
}

pub fn init_database(app: &AppHandle) -> Result<Connection, String> {
    let path = get_db_path(app)?;
    let conn = Connection::open(&path).map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|e| format!("Failed to enable foreign keys: {}", e))?;

    // Initialize schema (all CREATE TABLE IF NOT EXISTS, so safe to run multiple times)
    let schema = include_str!("../migrations/schema.sql");
    conn.execute_batch(schema)
        .map_err(|e| format!("Failed to initialize database schema: {}", e))?;

    // Run migrations for existing databases
    run_migrations(&conn)?;

    Ok(conn)
}

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

// ============================================
// Local User Operations
// ============================================

pub fn get_all_users(conn: &Connection) -> Result<Vec<LocalUser>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, password_hash, avatar, created_at, last_login_at
             FROM users ORDER BY last_login_at DESC NULLS LAST, created_at DESC",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let users = stmt
        .query_map([], |row| {
            let password_hash: Option<String> = row.get(2)?;
            Ok(LocalUser {
                id: row.get(0)?,
                name: row.get(1)?,
                has_password: password_hash.is_some(),
                avatar: row.get(3)?,
                created_at: row.get(4)?,
                last_login_at: row.get(5)?,
            })
        })
        .map_err(|e| format!("Failed to query users: {}", e))?;

    users
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect users: {}", e))
}

pub fn get_user(conn: &Connection, id: &str) -> Result<LocalUser, String> {
    conn.query_row(
        "SELECT id, name, password_hash, avatar, created_at, last_login_at
         FROM users WHERE id = ?1",
        params![id],
        |row| {
            let password_hash: Option<String> = row.get(2)?;
            Ok(LocalUser {
                id: row.get(0)?,
                name: row.get(1)?,
                has_password: password_hash.is_some(),
                avatar: row.get(3)?,
                created_at: row.get(4)?,
                last_login_at: row.get(5)?,
            })
        },
    )
    .map_err(|e| format!("User not found: {}", e))
}

pub fn create_user(conn: &Connection, request: &CreateUserRequest) -> Result<LocalUser, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let avatar = request.avatar.as_deref().unwrap_or("avatar-smile");

    // Hash password if provided (simple hash for local use - not for network security)
    let password_hash = request.password.as_ref().map(|p| {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        p.hash(&mut hasher);
        format!("{:x}", hasher.finish())
    });

    conn.execute(
        "INSERT INTO users (id, name, password_hash, avatar, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, request.name, password_hash, avatar, now],
    )
    .map_err(|e| format!("Failed to create user: {}", e))?;

    get_user(conn, &id)
}

pub fn verify_user_password(conn: &Connection, user_id: &str, password: Option<&str>) -> Result<bool, String> {
    let stored_hash: Option<String> = conn
        .query_row(
            "SELECT password_hash FROM users WHERE id = ?1",
            params![user_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("User not found: {}", e))?;

    match (stored_hash, password) {
        (None, _) => Ok(true), // No password set, always valid
        (Some(_), None) => Ok(false), // Password required but not provided
        (Some(stored), Some(provided)) => {
            use std::collections::hash_map::DefaultHasher;
            use std::hash::{Hash, Hasher};
            let mut hasher = DefaultHasher::new();
            provided.hash(&mut hasher);
            let provided_hash = format!("{:x}", hasher.finish());
            Ok(stored == provided_hash)
        }
    }
}

pub fn login_user(conn: &Connection, user_id: &str, password: Option<&str>) -> Result<LocalUser, String> {
    // Verify password
    if !verify_user_password(conn, user_id, password)? {
        return Err("Invalid password".to_string());
    }

    // Update last login time
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE users SET last_login_at = ?1 WHERE id = ?2",
        params![now, user_id],
    )
    .map_err(|e| format!("Failed to update login time: {}", e))?;

    // Set as active user
    conn.execute(
        "INSERT OR REPLACE INTO app_state (key, value) VALUES ('active_user_id', ?1)",
        params![user_id],
    )
    .map_err(|e| format!("Failed to set active user: {}", e))?;

    get_user(conn, user_id)
}

pub fn get_active_user(conn: &Connection) -> Result<Option<LocalUser>, String> {
    let user_id: Option<String> = conn
        .query_row(
            "SELECT value FROM app_state WHERE key = 'active_user_id'",
            [],
            |row| row.get(0),
        )
        .ok();

    match user_id {
        Some(id) => match get_user(conn, &id) {
            Ok(user) => Ok(Some(user)),
            Err(_) => Ok(None),
        },
        None => Ok(None),
    }
}

pub fn logout_user(conn: &Connection) -> Result<(), String> {
    conn.execute(
        "DELETE FROM app_state WHERE key = 'active_user_id'",
        [],
    )
    .map_err(|e| format!("Failed to logout: {}", e))?;
    Ok(())
}

pub fn delete_user(conn: &Connection, user_id: &str) -> Result<(), String> {
    // First check if this is the active user and log them out
    let active_user = get_active_user(conn)?;
    if let Some(active) = active_user {
        if active.id == user_id {
            logout_user(conn)?;
        }
    }

    // Delete user's decks and quizzes
    conn.execute("DELETE FROM decks WHERE user_id = ?1", params![user_id])
        .map_err(|e| format!("Failed to delete user decks: {}", e))?;
    conn.execute("DELETE FROM quizzes WHERE user_id = ?1", params![user_id])
        .map_err(|e| format!("Failed to delete user quizzes: {}", e))?;

    // Delete the user
    conn.execute("DELETE FROM users WHERE id = ?1", params![user_id])
        .map_err(|e| format!("Failed to delete user: {}", e))?;

    Ok(())
}

pub fn update_user(conn: &Connection, user_id: &str, name: &str, password: Option<&str>, avatar: Option<&str>) -> Result<LocalUser, String> {
    // Hash password if provided
    let password_hash = password.map(|p| {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        p.hash(&mut hasher);
        format!("{:x}", hasher.finish())
    });

    match (password_hash, avatar) {
        (Some(hash), Some(av)) => {
            conn.execute(
                "UPDATE users SET name = ?1, password_hash = ?2, avatar = ?3 WHERE id = ?4",
                params![name, hash, av, user_id],
            )
            .map_err(|e| format!("Failed to update user: {}", e))?;
        }
        (Some(hash), None) => {
            conn.execute(
                "UPDATE users SET name = ?1, password_hash = ?2 WHERE id = ?3",
                params![name, hash, user_id],
            )
            .map_err(|e| format!("Failed to update user: {}", e))?;
        }
        (None, Some(av)) => {
            conn.execute(
                "UPDATE users SET name = ?1, avatar = ?2 WHERE id = ?3",
                params![name, av, user_id],
            )
            .map_err(|e| format!("Failed to update user: {}", e))?;
        }
        (None, None) => {
            conn.execute(
                "UPDATE users SET name = ?1 WHERE id = ?2",
                params![name, user_id],
            )
            .map_err(|e| format!("Failed to update user: {}", e))?;
        }
    }

    get_user(conn, user_id)
}

pub fn remove_user_password(conn: &Connection, user_id: &str) -> Result<LocalUser, String> {
    conn.execute(
        "UPDATE users SET password_hash = NULL WHERE id = ?1",
        params![user_id],
    )
    .map_err(|e| format!("Failed to remove password: {}", e))?;

    get_user(conn, user_id)
}

// ============================================
// Deck Operations
// ============================================

pub fn create_deck_local(
    conn: &Connection,
    name: &str,
    description: Option<&str>,
    shuffle_cards: bool,
) -> Result<Deck, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO decks (id, name, description, shuffle_cards, created_at, updated_at, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'local_only')",
        params![id, name, description, shuffle_cards as i32, now, now],
    )
    .map_err(|e| format!("Failed to create deck: {}", e))?;

    get_deck_local(conn, &id)
}

pub fn get_all_decks_local(conn: &Connection) -> Result<Vec<Deck>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT d.id, d.name, d.description, d.shuffle_cards, d.created_at, d.updated_at,
                    d.remote_id, d.sync_status, d.last_synced_at, d.remote_updated_at,
                    (SELECT COUNT(*) FROM cards WHERE deck_id = d.id) as card_count
             FROM decks d ORDER BY d.updated_at DESC",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let decks = stmt
        .query_map([], |row| {
            Ok(Deck {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                shuffle_cards: row.get::<_, i32>(3)? != 0,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                remote_id: row.get(6)?,
                sync_status: SyncStatus::from_str(&row.get::<_, String>(7)?),
                last_synced_at: row.get(8)?,
                remote_updated_at: row.get(9)?,
                card_count: Some(row.get(10)?),
            })
        })
        .map_err(|e| format!("Failed to query decks: {}", e))?;

    decks
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect decks: {}", e))
}

pub fn get_deck_local(conn: &Connection, id: &str) -> Result<Deck, String> {
    conn.query_row(
        "SELECT id, name, description, shuffle_cards, created_at, updated_at,
                remote_id, sync_status, last_synced_at, remote_updated_at
         FROM decks WHERE id = ?1",
        params![id],
        |row| {
            Ok(Deck {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                shuffle_cards: row.get::<_, i32>(3)? != 0,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                remote_id: row.get(6)?,
                sync_status: SyncStatus::from_str(&row.get::<_, String>(7)?),
                last_synced_at: row.get(8)?,
                remote_updated_at: row.get(9)?,
                card_count: None,
            })
        },
    )
    .map_err(|e| format!("Deck not found: {}", e))
}

pub fn update_deck_local(
    conn: &Connection,
    id: &str,
    name: &str,
    description: Option<&str>,
    shuffle_cards: bool,
) -> Result<Deck, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let current = get_deck_local(conn, id)?;
    let new_status = match current.sync_status {
        SyncStatus::Synced => SyncStatus::PendingSync,
        other => other,
    };

    conn.execute(
        "UPDATE decks SET name = ?1, description = ?2, shuffle_cards = ?3, updated_at = ?4, sync_status = ?5
         WHERE id = ?6",
        params![name, description, shuffle_cards as i32, now, new_status.as_str(), id],
    )
    .map_err(|e| format!("Failed to update deck: {}", e))?;

    get_deck_local(conn, id)
}

pub fn delete_deck_local(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM decks WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete deck: {}", e))?;
    Ok(())
}

// ============================================
// Card Operations
// ============================================

pub fn create_card_local(
    conn: &Connection,
    deck_id: &str,
    request: &CreateCardRequest,
) -> Result<Card, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let front_type = request.front_type.as_deref().unwrap_or("TEXT");
    let back_type = request.back_type.as_deref().unwrap_or("TEXT");

    conn.execute(
        "INSERT INTO cards (id, deck_id, front, front_type, front_language,
         back, back_type, back_language, notes, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            id, deck_id, request.front, front_type, request.front_language,
            request.back, back_type, request.back_language, request.notes, now, now
        ],
    )
    .map_err(|e| format!("Failed to create card: {}", e))?;

    let _ = mark_deck_pending_if_synced(conn, deck_id);
    get_card_local(conn, &id, deck_id)
}

pub fn get_cards_for_deck_local(conn: &Connection, deck_id: &str) -> Result<Vec<Card>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, deck_id, front, front_type, front_language,
                    back, back_type, back_language, notes,
                    created_at, updated_at, remote_id
             FROM cards WHERE deck_id = ?1 ORDER BY created_at ASC",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let cards: Vec<Card> = stmt
        .query_map(params![deck_id], |row| {
            Ok(Card {
                id: row.get(0)?,
                deck_id: row.get(1)?,
                front: row.get(2)?,
                front_type: row.get(3)?,
                front_language: row.get(4)?,
                back: row.get(5)?,
                back_type: row.get(6)?,
                back_language: row.get(7)?,
                notes: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
                remote_id: row.get(11)?,
                tags: vec![],
            })
        })
        .map_err(|e| format!("Failed to query cards: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect cards: {}", e))?;

    let mut result = Vec::with_capacity(cards.len());
    for mut card in cards {
        card.tags = get_tags_for_card_local(conn, &card.id)?;
        result.push(card);
    }

    Ok(result)
}

pub fn get_card_local(conn: &Connection, id: &str, deck_id: &str) -> Result<Card, String> {
    let mut card = conn
        .query_row(
            "SELECT id, deck_id, front, front_type, front_language,
                    back, back_type, back_language, notes,
                    created_at, updated_at, remote_id
             FROM cards WHERE id = ?1 AND deck_id = ?2",
            params![id, deck_id],
            |row| {
                Ok(Card {
                    id: row.get(0)?,
                    deck_id: row.get(1)?,
                    front: row.get(2)?,
                    front_type: row.get(3)?,
                    front_language: row.get(4)?,
                    back: row.get(5)?,
                    back_type: row.get(6)?,
                    back_language: row.get(7)?,
                    notes: row.get(8)?,
                    created_at: row.get(9)?,
                    updated_at: row.get(10)?,
                    remote_id: row.get(11)?,
                    tags: vec![],
                })
            },
        )
        .map_err(|e| format!("Card not found: {}", e))?;

    card.tags = get_tags_for_card_local(conn, &card.id)?;
    Ok(card)
}

pub fn update_card_local(
    conn: &Connection,
    id: &str,
    deck_id: &str,
    request: &UpdateCardRequest,
) -> Result<Card, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let front_type = request.front_type.as_deref().unwrap_or("TEXT");
    let back_type = request.back_type.as_deref().unwrap_or("TEXT");

    conn.execute(
        "UPDATE cards SET front = ?1, front_type = ?2, front_language = ?3,
         back = ?4, back_type = ?5, back_language = ?6, notes = ?7, updated_at = ?8
         WHERE id = ?9 AND deck_id = ?10",
        params![
            request.front, front_type, request.front_language,
            request.back, back_type, request.back_language, request.notes, now, id, deck_id
        ],
    )
    .map_err(|e| format!("Failed to update card: {}", e))?;

    let _ = mark_deck_pending_if_synced(conn, deck_id);
    get_card_local(conn, id, deck_id)
}

pub fn delete_card_local(conn: &Connection, id: &str, deck_id: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM cards WHERE id = ?1 AND deck_id = ?2",
        params![id, deck_id],
    )
    .map_err(|e| format!("Failed to delete card: {}", e))?;

    let _ = mark_deck_pending_if_synced(conn, deck_id);
    Ok(())
}

// ============================================
// Tag Operations
// ============================================

pub fn create_tag_local(conn: &Connection, deck_id: &str, name: &str) -> Result<Tag, String> {
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO tags (id, deck_id, name) VALUES (?1, ?2, ?3)",
        params![id, deck_id, name],
    )
    .map_err(|e| format!("Failed to create tag: {}", e))?;

    let _ = mark_deck_pending_if_synced(conn, deck_id);

    Ok(Tag {
        id,
        deck_id: deck_id.to_string(),
        name: name.to_string(),
        remote_id: None,
    })
}

pub fn get_tags_for_deck_local(conn: &Connection, deck_id: &str) -> Result<Vec<Tag>, String> {
    let mut stmt = conn
        .prepare("SELECT id, deck_id, name, remote_id FROM tags WHERE deck_id = ?1 ORDER BY name")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let tags = stmt
        .query_map(params![deck_id], |row| {
            Ok(Tag {
                id: row.get(0)?,
                deck_id: row.get(1)?,
                name: row.get(2)?,
                remote_id: row.get(3)?,
            })
        })
        .map_err(|e| format!("Failed to query tags: {}", e))?;

    tags.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect tags: {}", e))
}

pub fn get_tags_for_card_local(conn: &Connection, card_id: &str) -> Result<Vec<CardTag>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.name FROM tags t
             INNER JOIN card_tags ct ON t.id = ct.tag_id
             WHERE ct.card_id = ?1 ORDER BY t.name",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let tags = stmt
        .query_map(params![card_id], |row| {
            Ok(CardTag {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| format!("Failed to query tags: {}", e))?;

    tags.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect tags: {}", e))
}

pub fn delete_tag_local(conn: &Connection, deck_id: &str, id: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM tags WHERE id = ?1 AND deck_id = ?2",
        params![id, deck_id],
    )
    .map_err(|e| format!("Failed to delete tag: {}", e))?;

    let _ = mark_deck_pending_if_synced(conn, deck_id);
    Ok(())
}

pub fn add_tag_to_card_local(
    conn: &Connection,
    deck_id: &str,
    card_id: &str,
    tag_id: &str,
) -> Result<(), String> {
    conn.execute(
        "INSERT OR IGNORE INTO card_tags (card_id, tag_id) VALUES (?1, ?2)",
        params![card_id, tag_id],
    )
    .map_err(|e| format!("Failed to add tag to card: {}", e))?;

    let _ = mark_deck_pending_if_synced(conn, deck_id);
    Ok(())
}

pub fn remove_tag_from_card_local(
    conn: &Connection,
    deck_id: &str,
    card_id: &str,
    tag_id: &str,
) -> Result<(), String> {
    conn.execute(
        "DELETE FROM card_tags WHERE card_id = ?1 AND tag_id = ?2",
        params![card_id, tag_id],
    )
    .map_err(|e| format!("Failed to remove tag from card: {}", e))?;

    let _ = mark_deck_pending_if_synced(conn, deck_id);
    Ok(())
}

pub fn get_tag_by_name(conn: &Connection, deck_id: &str, name: &str) -> Result<Option<Tag>, String> {
    match conn.query_row(
        "SELECT id, deck_id, name, remote_id FROM tags WHERE deck_id = ?1 AND name = ?2",
        params![deck_id, name],
        |row| {
            Ok(Tag {
                id: row.get(0)?,
                deck_id: row.get(1)?,
                name: row.get(2)?,
                remote_id: row.get(3)?,
            })
        },
    ) {
        Ok(tag) => Ok(Some(tag)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Query failed: {}", e)),
    }
}

// ============================================
// Quiz Tag Operations
// ============================================

pub fn create_quiz_tag(conn: &Connection, quiz_id: &str, name: &str) -> Result<QuizTag, String> {
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO quiz_tags (id, quiz_id, name) VALUES (?1, ?2, ?3)",
        params![id, quiz_id, name],
    )
    .map_err(|e| format!("Failed to create quiz tag: {}", e))?;

    Ok(QuizTag {
        id,
        quiz_id: quiz_id.to_string(),
        name: name.to_string(),
    })
}

pub fn get_tags_for_quiz(conn: &Connection, quiz_id: &str) -> Result<Vec<QuizTag>, String> {
    let mut stmt = conn
        .prepare("SELECT id, quiz_id, name FROM quiz_tags WHERE quiz_id = ?1 ORDER BY name")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let tags = stmt
        .query_map(params![quiz_id], |row| {
            Ok(QuizTag {
                id: row.get(0)?,
                quiz_id: row.get(1)?,
                name: row.get(2)?,
            })
        })
        .map_err(|e| format!("Failed to query quiz tags: {}", e))?;

    tags.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect quiz tags: {}", e))
}

pub fn get_tags_for_question(conn: &Connection, question_id: &str) -> Result<Vec<QuestionTag>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.name FROM quiz_tags t
             INNER JOIN question_tags qt ON t.id = qt.tag_id
             WHERE qt.question_id = ?1 ORDER BY t.name",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let tags = stmt
        .query_map(params![question_id], |row| {
            Ok(QuestionTag {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| format!("Failed to query question tags: {}", e))?;

    tags.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect question tags: {}", e))
}

pub fn delete_quiz_tag(conn: &Connection, quiz_id: &str, tag_id: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM quiz_tags WHERE id = ?1 AND quiz_id = ?2",
        params![tag_id, quiz_id],
    )
    .map_err(|e| format!("Failed to delete quiz tag: {}", e))?;
    Ok(())
}

pub fn add_tag_to_question(
    conn: &Connection,
    question_id: &str,
    tag_id: &str,
) -> Result<(), String> {
    conn.execute(
        "INSERT OR IGNORE INTO question_tags (question_id, tag_id) VALUES (?1, ?2)",
        params![question_id, tag_id],
    )
    .map_err(|e| format!("Failed to add tag to question: {}", e))?;
    Ok(())
}

pub fn remove_tag_from_question(
    conn: &Connection,
    question_id: &str,
    tag_id: &str,
) -> Result<(), String> {
    conn.execute(
        "DELETE FROM question_tags WHERE question_id = ?1 AND tag_id = ?2",
        params![question_id, tag_id],
    )
    .map_err(|e| format!("Failed to remove tag from question: {}", e))?;
    Ok(())
}

pub fn get_quiz_tag_by_name(conn: &Connection, quiz_id: &str, name: &str) -> Result<Option<QuizTag>, String> {
    match conn.query_row(
        "SELECT id, quiz_id, name FROM quiz_tags WHERE quiz_id = ?1 AND name = ?2",
        params![quiz_id, name],
        |row| {
            Ok(QuizTag {
                id: row.get(0)?,
                quiz_id: row.get(1)?,
                name: row.get(2)?,
            })
        },
    ) {
        Ok(tag) => Ok(Some(tag)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Query failed: {}", e)),
    }
}

// ============================================
// Helper Functions
// ============================================

fn mark_deck_pending_if_synced(conn: &Connection, deck_id: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE decks SET sync_status = 'pending_sync', updated_at = ?1
         WHERE id = ?2 AND sync_status = 'synced'",
        params![chrono::Utc::now().to_rfc3339(), deck_id],
    )
    .map_err(|e| format!("Failed to mark pending: {}", e))?;
    Ok(())
}

// ============================================
// Quiz Operations
// ============================================

pub fn create_quiz(
    conn: &Connection,
    request: &CreateQuizRequest,
) -> Result<Quiz, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let shuffle = request.shuffle_questions.unwrap_or(false);

    conn.execute(
        "INSERT INTO quizzes (id, name, description, shuffle_questions, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, request.name, request.description, shuffle as i32, now, now],
    )
    .map_err(|e| format!("Failed to create quiz: {}", e))?;

    get_quiz(conn, &id)
}

pub fn get_quiz(conn: &Connection, quiz_id: &str) -> Result<Quiz, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, shuffle_questions, created_at, updated_at
             FROM quizzes WHERE id = ?1",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let quiz = stmt
        .query_row(params![quiz_id], |row| {
            Ok(Quiz {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                shuffle_questions: row.get::<_, i32>(3)? != 0,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                questions: vec![],
                question_count: None,
            })
        })
        .map_err(|e| format!("Quiz not found: {}", e))?;

    // Load questions with choices
    let questions = get_questions_for_quiz(conn, quiz_id)?;
    let count = questions.len() as i32;

    Ok(Quiz { questions, question_count: Some(count), ..quiz })
}

pub fn get_all_quizzes(conn: &Connection) -> Result<Vec<Quiz>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT q.id, q.name, q.description, q.shuffle_questions, q.created_at, q.updated_at,
                    (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as question_count
             FROM quizzes q ORDER BY q.created_at DESC",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let quizzes = stmt
        .query_map([], |row| {
            Ok(Quiz {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                shuffle_questions: row.get::<_, i32>(3)? != 0,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                questions: vec![],
                question_count: Some(row.get(6)?),
            })
        })
        .map_err(|e| format!("Failed to query quizzes: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect quizzes: {}", e))?;

    Ok(quizzes)
}

pub fn update_quiz(
    conn: &Connection,
    quiz_id: &str,
    request: &UpdateQuizRequest,
) -> Result<Quiz, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let shuffle = request.shuffle_questions.unwrap_or(false);

    conn.execute(
        "UPDATE quizzes SET name = ?1, description = ?2, shuffle_questions = ?3, updated_at = ?4
         WHERE id = ?5",
        params![request.name, request.description, shuffle as i32, now, quiz_id],
    )
    .map_err(|e| format!("Failed to update quiz: {}", e))?;

    get_quiz(conn, quiz_id)
}

pub fn delete_quiz(conn: &Connection, quiz_id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM quizzes WHERE id = ?1", params![quiz_id])
        .map_err(|e| format!("Failed to delete quiz: {}", e))?;
    Ok(())
}

// ============================================
// Question Operations
// ============================================

pub fn create_question(
    conn: &Connection,
    quiz_id: &str,
    request: &CreateQuestionRequest,
) -> Result<Question, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // Get next position
    let position: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM questions WHERE quiz_id = ?1",
            params![quiz_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let content_type = request.content_type.as_deref().unwrap_or("TEXT");
    let multiple_answers = request.multiple_answers.unwrap_or(false);

    conn.execute(
        "INSERT INTO questions (id, quiz_id, question_type, content, content_type,
         content_language, correct_answer, multiple_answers, explanation, position,
         created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            id,
            quiz_id,
            request.question_type,
            request.content,
            content_type,
            request.content_language,
            request.correct_answer,
            multiple_answers as i32,
            request.explanation,
            position,
            now,
            now
        ],
    )
    .map_err(|e| format!("Failed to create question: {}", e))?;

    // Create choices if provided
    if let Some(choices) = &request.choices {
        for (idx, choice) in choices.iter().enumerate() {
            create_choice(conn, &id, choice, idx as i32)?;
        }
    }

    get_question(conn, &id)
}

pub fn get_question(conn: &Connection, question_id: &str) -> Result<Question, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, quiz_id, question_type, content, content_type, content_language,
             correct_answer, multiple_answers, explanation, position, created_at, updated_at
             FROM questions WHERE id = ?1",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let question = stmt
        .query_row(params![question_id], |row| {
            Ok(Question {
                id: row.get(0)?,
                quiz_id: row.get(1)?,
                question_type: QuestionType::from_str(&row.get::<_, String>(2)?),
                content: row.get(3)?,
                content_type: row.get(4)?,
                content_language: row.get(5)?,
                correct_answer: row.get(6)?,
                multiple_answers: row.get::<_, i32>(7)? != 0,
                explanation: row.get(8)?,
                position: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
                choices: vec![],
                tags: vec![],
            })
        })
        .map_err(|e| format!("Question not found: {}", e))?;

    let choices = get_choices_for_question(conn, question_id)?;
    let tags = get_tags_for_question(conn, question_id)?;

    Ok(Question { choices, tags, ..question })
}

pub fn get_questions_for_quiz(conn: &Connection, quiz_id: &str) -> Result<Vec<Question>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, quiz_id, question_type, content, content_type, content_language,
             correct_answer, multiple_answers, explanation, position, created_at, updated_at
             FROM questions WHERE quiz_id = ?1 ORDER BY position",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let questions = stmt
        .query_map(params![quiz_id], |row| {
            Ok(Question {
                id: row.get(0)?,
                quiz_id: row.get(1)?,
                question_type: QuestionType::from_str(&row.get::<_, String>(2)?),
                content: row.get(3)?,
                content_type: row.get(4)?,
                content_language: row.get(5)?,
                correct_answer: row.get(6)?,
                multiple_answers: row.get::<_, i32>(7)? != 0,
                explanation: row.get(8)?,
                position: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
                choices: vec![],
                tags: vec![],
            })
        })
        .map_err(|e| format!("Failed to query questions: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect questions: {}", e))?;

    // Load choices and tags for each question
    let mut questions_with_data = Vec::new();
    for q in questions {
        let choices = get_choices_for_question(conn, &q.id)?;
        let tags = get_tags_for_question(conn, &q.id)?;
        questions_with_data.push(Question { choices, tags, ..q });
    }

    Ok(questions_with_data)
}

pub fn update_question(
    conn: &Connection,
    question_id: &str,
    request: &UpdateQuestionRequest,
) -> Result<Question, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let content_type = request.content_type.as_deref().unwrap_or("TEXT");
    let multiple_answers = request.multiple_answers.unwrap_or(false);

    conn.execute(
        "UPDATE questions SET question_type = ?1, content = ?2, content_type = ?3,
         content_language = ?4, correct_answer = ?5, multiple_answers = ?6,
         explanation = ?7, updated_at = ?8 WHERE id = ?9",
        params![
            request.question_type,
            request.content,
            content_type,
            request.content_language,
            request.correct_answer,
            multiple_answers as i32,
            request.explanation,
            now,
            question_id
        ],
    )
    .map_err(|e| format!("Failed to update question: {}", e))?;

    get_question(conn, question_id)
}

pub fn delete_question(conn: &Connection, question_id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM questions WHERE id = ?1", params![question_id])
        .map_err(|e| format!("Failed to delete question: {}", e))?;
    Ok(())
}

pub fn reorder_questions(conn: &Connection, quiz_id: &str, question_ids: &[String]) -> Result<(), String> {
    for (idx, qid) in question_ids.iter().enumerate() {
        conn.execute(
            "UPDATE questions SET position = ?1 WHERE id = ?2 AND quiz_id = ?3",
            params![idx as i32, qid, quiz_id],
        )
        .map_err(|e| format!("Failed to reorder question: {}", e))?;
    }
    Ok(())
}

// ============================================
// Choice Operations
// ============================================

pub fn create_choice(
    conn: &Connection,
    question_id: &str,
    request: &CreateChoiceRequest,
    position: i32,
) -> Result<Choice, String> {
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO choices (id, question_id, text, is_correct, position)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, question_id, request.text, request.is_correct as i32, position],
    )
    .map_err(|e| format!("Failed to create choice: {}", e))?;

    Ok(Choice {
        id,
        question_id: question_id.to_string(),
        text: request.text.clone(),
        is_correct: request.is_correct,
        position,
    })
}

pub fn get_choices_for_question(conn: &Connection, question_id: &str) -> Result<Vec<Choice>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, question_id, text, is_correct, position
             FROM choices WHERE question_id = ?1 ORDER BY position",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let choices = stmt
        .query_map(params![question_id], |row| {
            Ok(Choice {
                id: row.get(0)?,
                question_id: row.get(1)?,
                text: row.get(2)?,
                is_correct: row.get::<_, i32>(3)? != 0,
                position: row.get(4)?,
            })
        })
        .map_err(|e| format!("Failed to query choices: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect choices: {}", e))?;

    Ok(choices)
}

pub fn update_choices_for_question(
    conn: &Connection,
    question_id: &str,
    choices: &[CreateChoiceRequest],
) -> Result<(), String> {
    // Delete existing choices
    conn.execute("DELETE FROM choices WHERE question_id = ?1", params![question_id])
        .map_err(|e| format!("Failed to delete old choices: {}", e))?;

    // Create new choices
    for (idx, choice) in choices.iter().enumerate() {
        create_choice(conn, question_id, choice, idx as i32)?;
    }

    Ok(())
}

// ============================================
// Quiz Attempt Operations
// ============================================

pub fn start_quiz_attempt(conn: &Connection, quiz_id: &str) -> Result<QuizAttempt, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // Get question count
    let total_questions: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM questions WHERE quiz_id = ?1",
            params![quiz_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    conn.execute(
        "INSERT INTO quiz_attempts (id, quiz_id, started_at, total_questions, correct_answers, score_percentage)
         VALUES (?1, ?2, ?3, ?4, 0, 0)",
        params![id, quiz_id, now, total_questions],
    )
    .map_err(|e| format!("Failed to start quiz attempt: {}", e))?;

    Ok(QuizAttempt {
        id,
        quiz_id: quiz_id.to_string(),
        started_at: now,
        completed_at: None,
        duration_seconds: None,
        total_questions,
        correct_answers: 0,
        score_percentage: 0,
        question_results: vec![],
    })
}

pub fn submit_quiz_attempt(
    conn: &Connection,
    attempt_id: &str,
    answers: &[QuestionAnswer],
) -> Result<QuizAttempt, String> {
    let now = chrono::Utc::now().to_rfc3339();

    // Get attempt info
    let (_quiz_id, started_at): (String, String) = conn
        .query_row(
            "SELECT quiz_id, started_at FROM quiz_attempts WHERE id = ?1",
            params![attempt_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Attempt not found: {}", e))?;

    // Calculate duration
    let start = chrono::DateTime::parse_from_rfc3339(&started_at)
        .map_err(|e| format!("Invalid start time: {}", e))?;
    let end = chrono::DateTime::parse_from_rfc3339(&now)
        .map_err(|e| format!("Invalid end time: {}", e))?;
    let duration = (end - start).num_seconds() as i32;

    // Grade each answer
    let mut correct_count = 0;
    for answer in answers {
        let is_correct = grade_answer(conn, &answer.question_id, &answer.answer)?;
        if is_correct {
            correct_count += 1;
        }

        // Save question result
        let result_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO question_results (id, attempt_id, question_id, user_answer, is_correct)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![result_id, attempt_id, answer.question_id, answer.answer, is_correct as i32],
        )
        .map_err(|e| format!("Failed to save question result: {}", e))?;
    }

    // Calculate score
    let total: i32 = conn
        .query_row(
            "SELECT total_questions FROM quiz_attempts WHERE id = ?1",
            params![attempt_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let score_percentage = if total > 0 {
        ((correct_count as f64 / total as f64) * 100.0).round() as i32
    } else {
        0
    };

    // Update attempt
    conn.execute(
        "UPDATE quiz_attempts SET completed_at = ?1, duration_seconds = ?2,
         correct_answers = ?3, score_percentage = ?4 WHERE id = ?5",
        params![now, duration, correct_count, score_percentage, attempt_id],
    )
    .map_err(|e| format!("Failed to complete attempt: {}", e))?;

    get_quiz_attempt(conn, attempt_id)
}

fn grade_answer(conn: &Connection, question_id: &str, user_answer: &str) -> Result<bool, String> {
    let (question_type, correct_answer): (String, Option<String>) = conn
        .query_row(
            "SELECT question_type, correct_answer FROM questions WHERE id = ?1",
            params![question_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Question not found: {}", e))?;

    match question_type.as_str() {
        "fill_in_blank" => {
            // Exact match for fill-in-blank
            Ok(correct_answer.as_deref() == Some(user_answer))
        }
        "multiple_choice" => {
            // Get correct choice IDs
            let mut stmt = conn
                .prepare("SELECT id FROM choices WHERE question_id = ?1 AND is_correct = 1")
                .map_err(|e| format!("Failed to prepare query: {}", e))?;

            let correct_ids: Vec<String> = stmt
                .query_map(params![question_id], |row| row.get(0))
                .map_err(|e| format!("Failed to query choices: {}", e))?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| format!("Failed to collect choices: {}", e))?;

            // Parse user's answer (comma-separated choice IDs)
            let mut user_ids: Vec<&str> = user_answer.split(',').map(|s| s.trim()).collect();
            user_ids.sort();

            let mut correct_sorted = correct_ids.clone();
            correct_sorted.sort();

            // Compare
            Ok(user_ids == correct_sorted.iter().map(|s| s.as_str()).collect::<Vec<_>>())
        }
        _ => Ok(false),
    }
}

pub fn get_quiz_attempt(conn: &Connection, attempt_id: &str) -> Result<QuizAttempt, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, quiz_id, started_at, completed_at, duration_seconds,
             total_questions, correct_answers, score_percentage
             FROM quiz_attempts WHERE id = ?1",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let attempt = stmt
        .query_row(params![attempt_id], |row| {
            Ok(QuizAttempt {
                id: row.get(0)?,
                quiz_id: row.get(1)?,
                started_at: row.get(2)?,
                completed_at: row.get(3)?,
                duration_seconds: row.get(4)?,
                total_questions: row.get(5)?,
                correct_answers: row.get(6)?,
                score_percentage: row.get(7)?,
                question_results: vec![],
            })
        })
        .map_err(|e| format!("Attempt not found: {}", e))?;

    // Load question results
    let results = get_question_results_for_attempt(conn, attempt_id)?;

    Ok(QuizAttempt {
        question_results: results,
        ..attempt
    })
}

pub fn get_question_results_for_attempt(
    conn: &Connection,
    attempt_id: &str,
) -> Result<Vec<QuestionResult>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, attempt_id, question_id, user_answer, is_correct
             FROM question_results WHERE attempt_id = ?1",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let results = stmt
        .query_map(params![attempt_id], |row| {
            Ok(QuestionResult {
                id: row.get(0)?,
                attempt_id: row.get(1)?,
                question_id: row.get(2)?,
                user_answer: row.get(3)?,
                is_correct: row.get::<_, i32>(4)? != 0,
            })
        })
        .map_err(|e| format!("Failed to query results: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect results: {}", e))?;

    Ok(results)
}

pub fn get_quiz_attempts(conn: &Connection, quiz_id: &str) -> Result<Vec<QuizAttempt>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, quiz_id, started_at, completed_at, duration_seconds,
             total_questions, correct_answers, score_percentage
             FROM quiz_attempts WHERE quiz_id = ?1 ORDER BY started_at DESC",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let attempts = stmt
        .query_map(params![quiz_id], |row| {
            Ok(QuizAttempt {
                id: row.get(0)?,
                quiz_id: row.get(1)?,
                started_at: row.get(2)?,
                completed_at: row.get(3)?,
                duration_seconds: row.get(4)?,
                total_questions: row.get(5)?,
                correct_answers: row.get(6)?,
                score_percentage: row.get(7)?,
                question_results: vec![],
            })
        })
        .map_err(|e| format!("Failed to query attempts: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect attempts: {}", e))?;

    Ok(attempts)
}

// ============================================
// Quiz Statistics
// ============================================

pub fn get_quiz_stats(conn: &Connection, quiz_id: &str) -> Result<QuizStats, String> {
    // Get aggregate stats
    let (total_attempts, avg_score, best_score, avg_duration, last_attempt): (
        i32, f64, i32, Option<i32>, Option<String>,
    ) = conn
        .query_row(
            "SELECT
                COUNT(*),
                COALESCE(AVG(score_percentage), 0),
                COALESCE(MAX(score_percentage), 0),
                AVG(duration_seconds),
                MAX(completed_at)
             FROM quiz_attempts
             WHERE quiz_id = ?1 AND completed_at IS NOT NULL",
            params![quiz_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
        )
        .unwrap_or((0, 0.0, 0, None, None));

    // Get last 5 scores
    let mut stmt = conn
        .prepare(
            "SELECT score_percentage FROM quiz_attempts
             WHERE quiz_id = ?1 AND completed_at IS NOT NULL
             ORDER BY completed_at DESC LIMIT 5",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let recent_scores: Vec<i32> = stmt
        .query_map(params![quiz_id], |row| row.get(0))
        .map_err(|e| format!("Failed to query scores: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .unwrap_or_default();

    Ok(QuizStats {
        quiz_id: quiz_id.to_string(),
        total_attempts,
        average_score: avg_score,
        best_score,
        average_duration_seconds: avg_duration,
        last_attempt_at: last_attempt,
        recent_scores,
    })
}

// ============================================
// Study Session Operations
// ============================================

pub fn start_study_session(conn: &Connection, deck_id: &str) -> Result<StudySession, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO study_sessions (id, deck_id, started_at, cards_studied)
         VALUES (?1, ?2, ?3, 0)",
        params![id, deck_id, now],
    )
    .map_err(|e| format!("Failed to start study session: {}", e))?;

    Ok(StudySession {
        id,
        deck_id: deck_id.to_string(),
        started_at: now,
        ended_at: None,
        duration_seconds: None,
        cards_studied: 0,
    })
}

pub fn end_study_session(
    conn: &Connection,
    session_id: &str,
    cards_studied: i32,
) -> Result<StudySession, String> {
    let now = chrono::Utc::now().to_rfc3339();

    // Get start time
    let started_at: String = conn
        .query_row(
            "SELECT started_at FROM study_sessions WHERE id = ?1",
            params![session_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Session not found: {}", e))?;

    // Calculate duration
    let start = chrono::DateTime::parse_from_rfc3339(&started_at)
        .map_err(|e| format!("Invalid start time: {}", e))?;
    let end = chrono::DateTime::parse_from_rfc3339(&now)
        .map_err(|e| format!("Invalid end time: {}", e))?;
    let duration = (end - start).num_seconds() as i32;

    conn.execute(
        "UPDATE study_sessions SET ended_at = ?1, duration_seconds = ?2, cards_studied = ?3
         WHERE id = ?4",
        params![now, duration, cards_studied, session_id],
    )
    .map_err(|e| format!("Failed to end study session: {}", e))?;

    // Get updated session
    let mut stmt = conn
        .prepare(
            "SELECT id, deck_id, started_at, ended_at, duration_seconds, cards_studied
             FROM study_sessions WHERE id = ?1",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    stmt.query_row(params![session_id], |row| {
        Ok(StudySession {
            id: row.get(0)?,
            deck_id: row.get(1)?,
            started_at: row.get(2)?,
            ended_at: row.get(3)?,
            duration_seconds: row.get(4)?,
            cards_studied: row.get(5)?,
        })
    })
    .map_err(|e| format!("Failed to get session: {}", e))
}

pub fn get_deck_study_stats(conn: &Connection, deck_id: &str) -> Result<DeckStudyStats, String> {
    let (total_sessions, total_time, total_cards, last_studied): (
        i32, i32, i32, Option<String>,
    ) = conn
        .query_row(
            "SELECT
                COUNT(*),
                COALESCE(SUM(duration_seconds), 0),
                COALESCE(SUM(cards_studied), 0),
                MAX(ended_at)
             FROM study_sessions
             WHERE deck_id = ?1 AND ended_at IS NOT NULL",
            params![deck_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .unwrap_or((0, 0, 0, None));

    Ok(DeckStudyStats {
        deck_id: deck_id.to_string(),
        total_sessions,
        total_study_time_seconds: total_time,
        total_cards_studied: total_cards,
        last_studied_at: last_studied,
    })
}
