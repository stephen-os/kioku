use rusqlite::{params, Connection};
use uuid::Uuid;

use super::models::{CreateUserRequest, LocalUser};

/// Get all users ordered by last login
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

/// Get a user by ID
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

/// Create a new user
pub fn create_user(conn: &Connection, request: &CreateUserRequest) -> Result<LocalUser, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let avatar = request.avatar.as_deref().unwrap_or("avatar-smile");

    let password_hash = request.password.as_ref().map(|p| hash_password(p));

    conn.execute(
        "INSERT INTO users (id, name, password_hash, avatar, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, request.name, password_hash, avatar, now],
    )
    .map_err(|e| format!("Failed to create user: {}", e))?;

    get_user(conn, &id)
}

/// Verify a user's password
pub fn verify_user_password(conn: &Connection, user_id: &str, password: Option<&str>) -> Result<bool, String> {
    let stored_hash: Option<String> = conn
        .query_row(
            "SELECT password_hash FROM users WHERE id = ?1",
            params![user_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("User not found: {}", e))?;

    match (stored_hash, password) {
        (None, _) => Ok(true),
        (Some(_), None) => Ok(false),
        (Some(stored), Some(provided)) => {
            let provided_hash = hash_password(provided);
            Ok(stored == provided_hash)
        }
    }
}

/// Log in a user
pub fn login_user(conn: &Connection, user_id: &str, password: Option<&str>) -> Result<LocalUser, String> {
    if !verify_user_password(conn, user_id, password)? {
        return Err("Invalid password".to_string());
    }

    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE users SET last_login_at = ?1 WHERE id = ?2",
        params![now, user_id],
    )
    .map_err(|e| format!("Failed to update login time: {}", e))?;

    conn.execute(
        "INSERT OR REPLACE INTO app_state (key, value) VALUES ('active_user_id', ?1)",
        params![user_id],
    )
    .map_err(|e| format!("Failed to set active user: {}", e))?;

    get_user(conn, user_id)
}

/// Get the currently active user
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

/// Log out the current user
pub fn logout_user(conn: &Connection) -> Result<(), String> {
    conn.execute("DELETE FROM app_state WHERE key = 'active_user_id'", [])
        .map_err(|e| format!("Failed to logout: {}", e))?;
    Ok(())
}

/// Delete a user and their data
pub fn delete_user(conn: &Connection, user_id: &str) -> Result<(), String> {
    let active_user = get_active_user(conn)?;
    if let Some(active) = active_user {
        if active.id == user_id {
            logout_user(conn)?;
        }
    }

    conn.execute("DELETE FROM decks WHERE user_id = ?1", params![user_id])
        .map_err(|e| format!("Failed to delete user decks: {}", e))?;
    conn.execute("DELETE FROM quizzes WHERE user_id = ?1", params![user_id])
        .map_err(|e| format!("Failed to delete user quizzes: {}", e))?;
    conn.execute("DELETE FROM users WHERE id = ?1", params![user_id])
        .map_err(|e| format!("Failed to delete user: {}", e))?;

    Ok(())
}

/// Update a user's profile
pub fn update_user(
    conn: &Connection,
    user_id: &str,
    name: &str,
    password: Option<&str>,
    avatar: Option<&str>,
) -> Result<LocalUser, String> {
    let password_hash = password.map(|p| hash_password(p));

    match (password_hash, avatar) {
        (Some(hash), Some(av)) => {
            conn.execute(
                "UPDATE users SET name = ?1, password_hash = ?2, avatar = ?3 WHERE id = ?4",
                params![name, hash, av, user_id],
            )
        }
        (Some(hash), None) => {
            conn.execute(
                "UPDATE users SET name = ?1, password_hash = ?2 WHERE id = ?3",
                params![name, hash, user_id],
            )
        }
        (None, Some(av)) => {
            conn.execute(
                "UPDATE users SET name = ?1, avatar = ?2 WHERE id = ?3",
                params![name, av, user_id],
            )
        }
        (None, None) => {
            conn.execute(
                "UPDATE users SET name = ?1 WHERE id = ?2",
                params![name, user_id],
            )
        }
    }
    .map_err(|e| format!("Failed to update user: {}", e))?;

    get_user(conn, user_id)
}

/// Remove a user's password
pub fn remove_user_password(conn: &Connection, user_id: &str) -> Result<LocalUser, String> {
    conn.execute(
        "UPDATE users SET password_hash = NULL WHERE id = ?1",
        params![user_id],
    )
    .map_err(|e| format!("Failed to remove password: {}", e))?;

    get_user(conn, user_id)
}

/// Hash a password (simple hash for local use)
fn hash_password(password: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    password.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}
