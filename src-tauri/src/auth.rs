use serde::{Deserialize, Serialize};

// ============================================
// Data Models
// ============================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub server_id: Option<i64>,
    pub is_linked: bool, // true if connected to remote server
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateLocalUserRequest {
    pub display_name: String,
    pub email: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalLoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteLoginRequest {
    pub email: String,
    pub password: String,
    pub api_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkAccountRequest {
    pub email: String,
    pub password: String,
    pub api_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthResponse {
    pub user: User,
    pub is_new: bool,
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
// Auth Commands
// ============================================

/// Create a new local user account (offline-capable)
#[tauri::command]
pub async fn create_local_user(request: CreateLocalUserRequest) -> Result<AuthResponse, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let id = uuid::Uuid::new_v4().to_string();

    // Hash password if provided
    let _password_hash = if let Some(ref password) = request.password {
        if password.len() < 6 {
            return Err("Password must be at least 6 characters".to_string());
        }
        // In a real implementation, use bcrypt or argon2
        // For now, we'll store a simple hash indicator
        Some(format!("local:{}", password.len()))
    } else {
        None
    };

    let user = User {
        id,
        email: request.email,
        display_name: Some(request.display_name),
        server_id: None,
        is_linked: false,
        created_at: now.clone(),
        updated_at: now,
    };

    Ok(AuthResponse {
        user,
        is_new: true,
    })
}

/// Login with local credentials
#[tauri::command]
pub async fn login_local(request: LocalLoginRequest) -> Result<AuthResponse, String> {
    let _ = request;
    // This would query the local SQLite database for the user
    // For now, return an error indicating no local users exist
    Err("No local user found with that email".to_string())
}

/// Login with remote server credentials and create/update local user
#[tauri::command]
pub async fn login_remote(request: RemoteLoginRequest) -> Result<AuthResponse, String> {
    // Call the remote API to authenticate
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
        return Err(format!("Authentication failed ({}): {}", status, error_text));
    }

    let auth_response: RemoteAuthResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let now = chrono::Utc::now().to_rfc3339();
    let local_id = uuid::Uuid::new_v4().to_string();

    // Create or update local user with remote credentials
    let user = User {
        id: local_id,
        email: Some(auth_response.email),
        display_name: None,
        server_id: Some(auth_response.user_id),
        is_linked: true,
        created_at: now.clone(),
        updated_at: now,
    };

    // In a full implementation, we would:
    // 1. Check if a local user with this server_id already exists
    // 2. If yes, update and return that user
    // 3. If no, create a new local user
    // 4. Store the JWT token for future API calls

    Ok(AuthResponse {
        user,
        is_new: false,
    })
}

/// Get the currently logged in user
#[tauri::command]
pub async fn get_current_user() -> Result<Option<User>, String> {
    // Query SQLite for user where is_current = 1
    // For now, return None
    Ok(None)
}

/// Logout the current user
#[tauri::command]
pub async fn logout() -> Result<(), String> {
    // Clear is_current flag and server_token from the user
    // For now, just succeed
    Ok(())
}

/// Link an existing local user to a remote account
#[tauri::command]
pub async fn link_remote_account(
    user_id: String,
    request: LinkAccountRequest,
) -> Result<User, String> {
    // 1. Authenticate with remote server
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
        return Err("Failed to authenticate with remote server".to_string());
    }

    let auth_response: RemoteAuthResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let now = chrono::Utc::now().to_rfc3339();

    // 2. Update local user with remote credentials
    let user = User {
        id: user_id,
        email: Some(auth_response.email),
        display_name: None,
        server_id: Some(auth_response.user_id),
        is_linked: true,
        created_at: now.clone(),
        updated_at: now,
    };

    // In full implementation:
    // - Store server_token and server_token_expires_at
    // - Update server_id on the user
    // - Potentially trigger a sync of local data to remote

    Ok(user)
}

/// Unlink a local user from their remote account
#[tauri::command]
pub async fn unlink_remote_account(user_id: String) -> Result<User, String> {
    let now = chrono::Utc::now().to_rfc3339();

    // Clear remote connection but keep local data
    let user = User {
        id: user_id,
        email: None,
        display_name: Some("Local User".to_string()),
        server_id: None,
        is_linked: false,
        created_at: now.clone(),
        updated_at: now,
    };

    Ok(user)
}
