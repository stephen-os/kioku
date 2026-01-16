use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

// ============================================
// Data Models
// ============================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub user_id: i64,
    pub email: String,
    pub token: String,
    pub api_url: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    pub api_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct RemoteAuthResponse {
    token: String,
    #[serde(rename = "type")]
    token_type: String,
    #[serde(rename = "userId")]
    user_id: i64,
    email: String,
}

// ============================================
// Session Storage Helpers
// ============================================

fn get_session_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    // Ensure directory exists
    fs::create_dir_all(&app_data)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;

    Ok(app_data.join("session.json"))
}

fn save_session(app: &AppHandle, session: &Session) -> Result<(), String> {
    let path = get_session_path(app)?;
    let json = serde_json::to_string_pretty(session)
        .map_err(|e| format!("Failed to serialize session: {}", e))?;
    fs::write(&path, json)
        .map_err(|e| format!("Failed to write session: {}", e))?;
    Ok(())
}

fn load_session(app: &AppHandle) -> Result<Option<Session>, String> {
    let path = get_session_path(app)?;

    if !path.exists() {
        return Ok(None);
    }

    let json = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read session: {}", e))?;

    let session: Session = serde_json::from_str(&json)
        .map_err(|e| format!("Failed to parse session: {}", e))?;

    Ok(Some(session))
}

fn clear_session(app: &AppHandle) -> Result<(), String> {
    let path = get_session_path(app)?;

    if path.exists() {
        fs::remove_file(&path)
            .map_err(|e| format!("Failed to delete session: {}", e))?;
    }

    Ok(())
}

// ============================================
// Auth Commands
// ============================================

/// Login with remote server credentials
/// Stores session locally for persistent login
#[tauri::command]
pub async fn login(app: AppHandle, request: LoginRequest) -> Result<Session, String> {
    // 1. Authenticate with remote API
    let client = reqwest::Client::new();

    let response = client
        .post(format!("{}/auth/login", request.api_url))
        .json(&serde_json::json!({
            "email": request.email,
            "password": request.password
        }))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Login failed ({}): {}", status, error_text));
    }

    let auth_response: RemoteAuthResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let now = chrono::Utc::now().to_rfc3339();

    let session = Session {
        user_id: auth_response.user_id,
        email: auth_response.email,
        token: auth_response.token,
        api_url: request.api_url,
        created_at: now.clone(),
        updated_at: now,
    };

    // 2. Store session locally
    save_session(&app, &session)?;

    Ok(session)
}

/// Get the current session (for auto-login on app start)
#[tauri::command]
pub async fn get_session(app: AppHandle) -> Result<Option<Session>, String> {
    load_session(&app)
}

/// Logout - clears session
#[tauri::command]
pub async fn logout(app: AppHandle) -> Result<(), String> {
    clear_session(&app)
}
