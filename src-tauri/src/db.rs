use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{AppHandle, Manager};

use crate::auth::Session;

// ============================================
// Data Models
// ============================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Deck {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub sync_status: String,
    pub server_id: Option<i64>,
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
    pub sync_status: String,
    pub server_id: Option<i64>,
    #[serde(default)]
    pub tags: Vec<CardTag>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub deck_id: String,
    pub name: String,
    pub sync_status: String,
    pub server_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDeckRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDeckRequest {
    pub name: String,
    pub description: Option<String>,
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

// ============================================
// Remote API Response Types
// ============================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RemoteDeck {
    id: i64,
    name: String,
    description: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RemoteCardTag {
    id: i64,
    name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RemoteCard {
    id: i64,
    front: String,
    front_type: String,
    front_language: Option<String>,
    back: String,
    back_type: String,
    back_language: Option<String>,
    notes: Option<String>,
    created_at: String,
    updated_at: String,
    #[serde(default)]
    tags: Vec<RemoteCardTag>,
}

// ============================================
// Session Helper
// ============================================

fn load_session(app: &AppHandle) -> Result<Session, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let path = app_data.join("session.json");

    if !path.exists() {
        return Err("Not logged in".to_string());
    }

    let json = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read session: {}", e))?;

    serde_json::from_str(&json)
        .map_err(|e| format!("Failed to parse session: {}", e))
}

// ============================================
// Deck Commands
// ============================================

#[tauri::command]
pub async fn get_all_decks(app: AppHandle) -> Result<Vec<Deck>, String> {
    let session = load_session(&app)?;

    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/decks", session.api_url))
        .header("Authorization", format!("Bearer {}", session.token))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to fetch decks ({}): {}", status, error_text));
    }

    let remote_decks: Vec<RemoteDeck> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse decks: {}", e))?;

    // Convert remote decks to local format
    let decks = remote_decks
        .into_iter()
        .map(|d| Deck {
            id: d.id.to_string(),
            name: d.name,
            description: d.description,
            created_at: d.created_at,
            updated_at: d.updated_at,
            sync_status: "synced".to_string(),
            server_id: Some(d.id),
        })
        .collect();

    Ok(decks)
}

#[tauri::command]
pub async fn get_deck(app: AppHandle, id: String) -> Result<Option<Deck>, String> {
    let session = load_session(&app)?;

    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/decks/{}", session.api_url, id))
        .header("Authorization", format!("Bearer {}", session.token))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(None);
    }

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to fetch deck ({}): {}", status, error_text));
    }

    let remote_deck: RemoteDeck = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse deck: {}", e))?;

    Ok(Some(Deck {
        id: remote_deck.id.to_string(),
        name: remote_deck.name,
        description: remote_deck.description,
        created_at: remote_deck.created_at,
        updated_at: remote_deck.updated_at,
        sync_status: "synced".to_string(),
        server_id: Some(remote_deck.id),
    }))
}

#[tauri::command]
pub async fn create_deck(app: AppHandle, request: CreateDeckRequest) -> Result<Deck, String> {
    let session = load_session(&app)?;

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/decks", session.api_url))
        .header("Authorization", format!("Bearer {}", session.token))
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to create deck ({}): {}", status, error_text));
    }

    let remote_deck: RemoteDeck = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse deck: {}", e))?;

    Ok(Deck {
        id: remote_deck.id.to_string(),
        name: remote_deck.name,
        description: remote_deck.description,
        created_at: remote_deck.created_at,
        updated_at: remote_deck.updated_at,
        sync_status: "synced".to_string(),
        server_id: Some(remote_deck.id),
    })
}

#[tauri::command]
pub async fn update_deck(app: AppHandle, id: String, request: UpdateDeckRequest) -> Result<Deck, String> {
    let session = load_session(&app)?;

    let client = reqwest::Client::new();
    let response = client
        .put(format!("{}/decks/{}", session.api_url, id))
        .header("Authorization", format!("Bearer {}", session.token))
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to update deck ({}): {}", status, error_text));
    }

    let remote_deck: RemoteDeck = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse deck: {}", e))?;

    Ok(Deck {
        id: remote_deck.id.to_string(),
        name: remote_deck.name,
        description: remote_deck.description,
        created_at: remote_deck.created_at,
        updated_at: remote_deck.updated_at,
        sync_status: "synced".to_string(),
        server_id: Some(remote_deck.id),
    })
}

#[tauri::command]
pub async fn delete_deck(app: AppHandle, id: String) -> Result<(), String> {
    let session = load_session(&app)?;

    let client = reqwest::Client::new();
    let response = client
        .delete(format!("{}/decks/{}", session.api_url, id))
        .header("Authorization", format!("Bearer {}", session.token))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to delete deck ({}): {}", status, error_text));
    }

    Ok(())
}

// ============================================
// Card Commands
// ============================================

#[tauri::command]
pub async fn get_cards_for_deck(app: AppHandle, deck_id: String) -> Result<Vec<Card>, String> {
    let session = load_session(&app)?;

    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/decks/{}/cards", session.api_url, deck_id))
        .header("Authorization", format!("Bearer {}", session.token))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to fetch cards ({}): {}", status, error_text));
    }

    let remote_cards: Vec<RemoteCard> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse cards: {}", e))?;

    let cards = remote_cards
        .into_iter()
        .map(|c| Card {
            id: c.id.to_string(),
            deck_id: deck_id.clone(),
            front: c.front,
            front_type: c.front_type,
            front_language: c.front_language,
            back: c.back,
            back_type: c.back_type,
            back_language: c.back_language,
            notes: c.notes,
            created_at: c.created_at,
            updated_at: c.updated_at,
            sync_status: "synced".to_string(),
            server_id: Some(c.id),
            tags: c.tags.into_iter().map(|t| CardTag {
                id: t.id.to_string(),
                name: t.name,
            }).collect(),
        })
        .collect();

    Ok(cards)
}

#[tauri::command]
pub async fn get_card(app: AppHandle, id: String) -> Result<Option<Card>, String> {
    // For now, return None - individual card fetching would need deck_id
    let _ = (app, id);
    Ok(None)
}

#[tauri::command]
pub async fn create_card(app: AppHandle, deck_id: String, request: CreateCardRequest) -> Result<Card, String> {
    let session = load_session(&app)?;

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/decks/{}/cards", session.api_url, deck_id))
        .header("Authorization", format!("Bearer {}", session.token))
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to create card ({}): {}", status, error_text));
    }

    let remote_card: RemoteCard = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse card: {}", e))?;

    Ok(Card {
        id: remote_card.id.to_string(),
        deck_id,
        front: remote_card.front,
        front_type: remote_card.front_type,
        front_language: remote_card.front_language,
        back: remote_card.back,
        back_type: remote_card.back_type,
        back_language: remote_card.back_language,
        notes: remote_card.notes,
        created_at: remote_card.created_at,
        updated_at: remote_card.updated_at,
        sync_status: "synced".to_string(),
        server_id: Some(remote_card.id),
        tags: remote_card.tags.into_iter().map(|t| CardTag {
            id: t.id.to_string(),
            name: t.name,
        }).collect(),
    })
}

#[tauri::command]
pub async fn update_card(app: AppHandle, id: String, deck_id: String, request: UpdateCardRequest) -> Result<Card, String> {
    let session = load_session(&app)?;

    let client = reqwest::Client::new();
    let response = client
        .put(format!("{}/decks/{}/cards/{}", session.api_url, deck_id, id))
        .header("Authorization", format!("Bearer {}", session.token))
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to update card ({}): {}", status, error_text));
    }

    let remote_card: RemoteCard = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse card: {}", e))?;

    Ok(Card {
        id: remote_card.id.to_string(),
        deck_id,
        front: remote_card.front,
        front_type: remote_card.front_type,
        front_language: remote_card.front_language,
        back: remote_card.back,
        back_type: remote_card.back_type,
        back_language: remote_card.back_language,
        notes: remote_card.notes,
        created_at: remote_card.created_at,
        updated_at: remote_card.updated_at,
        sync_status: "synced".to_string(),
        server_id: Some(remote_card.id),
        tags: remote_card.tags.into_iter().map(|t| CardTag {
            id: t.id.to_string(),
            name: t.name,
        }).collect(),
    })
}

#[tauri::command]
pub async fn delete_card(app: AppHandle, id: String, deck_id: String) -> Result<(), String> {
    let session = load_session(&app)?;

    let client = reqwest::Client::new();
    let response = client
        .delete(format!("{}/decks/{}/cards/{}", session.api_url, deck_id, id))
        .header("Authorization", format!("Bearer {}", session.token))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to delete card ({}): {}", status, error_text));
    }

    Ok(())
}

// ============================================
// Tag API Response Types
// ============================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RemoteTag {
    id: i64,
    name: String,
}

// ============================================
// Tag Commands
// ============================================

#[tauri::command]
pub async fn get_tags_for_deck(app: AppHandle, deck_id: String) -> Result<Vec<Tag>, String> {
    let session = load_session(&app)?;

    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/decks/{}/tags", session.api_url, deck_id))
        .header("Authorization", format!("Bearer {}", session.token))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        // If tags endpoint doesn't exist, return empty
        return Ok(vec![]);
    }

    let remote_tags: Vec<RemoteTag> = response
        .json()
        .await
        .unwrap_or_default();

    let tags = remote_tags
        .into_iter()
        .map(|t| Tag {
            id: t.id.to_string(),
            deck_id: deck_id.clone(),
            name: t.name,
            sync_status: "synced".to_string(),
            server_id: Some(t.id),
        })
        .collect();

    Ok(tags)
}

#[tauri::command]
pub async fn create_tag(app: AppHandle, deck_id: String, name: String) -> Result<Tag, String> {
    let session = load_session(&app)?;

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/decks/{}/tags", session.api_url, deck_id))
        .header("Authorization", format!("Bearer {}", session.token))
        .json(&serde_json::json!({ "name": name }))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to create tag ({}): {}", status, error_text));
    }

    let remote_tag: RemoteTag = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse tag: {}", e))?;

    Ok(Tag {
        id: remote_tag.id.to_string(),
        deck_id,
        name: remote_tag.name,
        sync_status: "synced".to_string(),
        server_id: Some(remote_tag.id),
    })
}

#[tauri::command]
pub async fn delete_tag(app: AppHandle, deck_id: String, id: String) -> Result<(), String> {
    let session = load_session(&app)?;

    let client = reqwest::Client::new();
    let response = client
        .delete(format!("{}/decks/{}/tags/{}", session.api_url, deck_id, id))
        .header("Authorization", format!("Bearer {}", session.token))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to delete tag ({}): {}", status, error_text));
    }

    Ok(())
}

#[tauri::command]
pub async fn get_tags_for_card(app: AppHandle, deck_id: String, card_id: String) -> Result<Vec<Tag>, String> {
    let session = load_session(&app)?;

    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/decks/{}/cards/{}/tags", session.api_url, deck_id, card_id))
        .header("Authorization", format!("Bearer {}", session.token))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        // If endpoint doesn't exist or fails, return empty
        return Ok(vec![]);
    }

    let remote_tags: Vec<RemoteTag> = response
        .json()
        .await
        .unwrap_or_default();

    let tags = remote_tags
        .into_iter()
        .map(|t| Tag {
            id: t.id.to_string(),
            deck_id: deck_id.clone(),
            name: t.name,
            sync_status: "synced".to_string(),
            server_id: Some(t.id),
        })
        .collect();

    Ok(tags)
}

#[tauri::command]
pub async fn add_tag_to_card(app: AppHandle, deck_id: String, card_id: String, tag_id: String) -> Result<(), String> {
    let session = load_session(&app)?;

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/decks/{}/cards/{}/tags/{}", session.api_url, deck_id, card_id, tag_id))
        .header("Authorization", format!("Bearer {}", session.token))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to add tag to card ({}): {}", status, error_text));
    }

    Ok(())
}

#[tauri::command]
pub async fn remove_tag_from_card(app: AppHandle, deck_id: String, card_id: String, tag_id: String) -> Result<(), String> {
    let session = load_session(&app)?;

    let client = reqwest::Client::new();
    let response = client
        .delete(format!("{}/decks/{}/cards/{}/tags/{}", session.api_url, deck_id, card_id, tag_id))
        .header("Authorization", format!("Bearer {}", session.token))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to remove tag from card ({}): {}", status, error_text));
    }

    Ok(())
}

// ============================================
// Import/Export Types
// ============================================

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeckImport {
    pub name: String,
    pub description: Option<String>,
    pub cards: Vec<CardImport>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CardImport {
    pub front: String,
    pub back: String,
    #[serde(default = "default_content_type")]
    pub front_type: String,
    #[serde(default = "default_content_type")]
    pub back_type: String,
    pub front_language: Option<String>,
    pub back_language: Option<String>,
    pub notes: Option<String>,
}

fn default_content_type() -> String {
    "TEXT".to_string()
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeckExport {
    pub name: String,
    pub description: Option<String>,
    pub cards: Vec<CardExport>,
    pub exported_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CardExport {
    pub front: String,
    pub back: String,
    pub front_type: String,
    pub back_type: String,
    pub front_language: Option<String>,
    pub back_language: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub deck: Deck,
    pub cards_imported: usize,
    pub synced: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SyncQueueItem {
    id: i64,
    entity_type: String,
    entity_id: String,
    operation: String,
    payload: Option<String>,
}

// ============================================
// Local Database Helpers
// ============================================

fn get_db_path(app: &AppHandle) -> Result<String, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    Ok(app_data.join("kioku.db").to_string_lossy().to_string())
}

// ============================================
// Import/Export Commands
// ============================================

/// Import a deck from JSON file
/// If online, syncs to server immediately
/// If offline, stores locally with pending status
#[tauri::command]
pub async fn import_deck(app: AppHandle, file_path: String) -> Result<ImportResult, String> {
    // Read and parse the JSON file
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let import_data: DeckImport = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let session = load_session(&app)?;
    let client = reqwest::Client::new();
    let now = chrono::Utc::now().to_rfc3339();

    // Try to create deck on server
    let server_result = client
        .post(format!("{}/decks", session.api_url))
        .header("Authorization", format!("Bearer {}", session.token))
        .json(&serde_json::json!({
            "name": import_data.name,
            "description": import_data.description
        }))
        .send()
        .await;

    match server_result {
        Ok(response) if response.status().is_success() => {
            // Server is online - sync everything
            let remote_deck: RemoteDeck = response
                .json()
                .await
                .map_err(|e| format!("Failed to parse deck response: {}", e))?;

            let deck_id = remote_deck.id.to_string();
            let mut cards_imported = 0;

            // Import cards to server
            for card in &import_data.cards {
                let card_result = client
                    .post(format!("{}/decks/{}/cards", session.api_url, deck_id))
                    .header("Authorization", format!("Bearer {}", session.token))
                    .json(&serde_json::json!({
                        "front": card.front,
                        "back": card.back,
                        "frontType": card.front_type,
                        "backType": card.back_type,
                        "frontLanguage": card.front_language,
                        "backLanguage": card.back_language,
                        "notes": card.notes
                    }))
                    .send()
                    .await;

                if let Ok(resp) = card_result {
                    if resp.status().is_success() {
                        cards_imported += 1;
                    }
                }
            }

            Ok(ImportResult {
                deck: Deck {
                    id: deck_id,
                    name: remote_deck.name,
                    description: remote_deck.description,
                    created_at: remote_deck.created_at,
                    updated_at: remote_deck.updated_at,
                    sync_status: "synced".to_string(),
                    server_id: Some(remote_deck.id),
                },
                cards_imported,
                synced: true,
            })
        }
        _ => {
            // Server is offline - store locally with pending status
            let deck_id = uuid::Uuid::new_v4().to_string();

            // Store deck and cards in local SQLite
            let db_path = get_db_path(&app)?;
            let conn = rusqlite::Connection::open(&db_path)
                .map_err(|e| format!("Failed to open database: {}", e))?;

            // Insert deck
            conn.execute(
                "INSERT INTO decks (id, name, description, created_at, updated_at, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, 'pending')",
                rusqlite::params![deck_id, import_data.name, import_data.description, now, now]
            ).map_err(|e| format!("Failed to insert deck: {}", e))?;

            // Add deck to sync queue
            let deck_payload = serde_json::to_string(&serde_json::json!({
                "name": import_data.name,
                "description": import_data.description
            })).unwrap();

            conn.execute(
                "INSERT INTO sync_queue (entity_type, entity_id, operation, payload, created_at) VALUES ('deck', ?1, 'create', ?2, ?3)",
                rusqlite::params![deck_id, deck_payload, now]
            ).map_err(|e| format!("Failed to add deck to sync queue: {}", e))?;

            let mut cards_imported = 0;

            // Insert cards
            for card in &import_data.cards {
                let card_id = uuid::Uuid::new_v4().to_string();

                conn.execute(
                    "INSERT INTO cards (id, deck_id, front, back, front_type, back_type, front_language, back_language, notes, created_at, updated_at, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'pending')",
                    rusqlite::params![
                        card_id,
                        deck_id,
                        card.front,
                        card.back,
                        card.front_type,
                        card.back_type,
                        card.front_language,
                        card.back_language,
                        card.notes,
                        now,
                        now
                    ]
                ).map_err(|e| format!("Failed to insert card: {}", e))?;

                // Add card to sync queue
                let card_payload = serde_json::to_string(&card).unwrap();
                conn.execute(
                    "INSERT INTO sync_queue (entity_type, entity_id, operation, payload, created_at) VALUES ('card', ?1, 'create', ?2, ?3)",
                    rusqlite::params![card_id, card_payload, now]
                ).map_err(|e| format!("Failed to add card to sync queue: {}", e))?;

                cards_imported += 1;
            }

            Ok(ImportResult {
                deck: Deck {
                    id: deck_id,
                    name: import_data.name,
                    description: import_data.description,
                    created_at: now.clone(),
                    updated_at: now,
                    sync_status: "pending".to_string(),
                    server_id: None,
                },
                cards_imported,
                synced: false,
            })
        }
    }
}

/// Export a deck to JSON format
#[tauri::command]
pub async fn export_deck(app: AppHandle, deck_id: String) -> Result<DeckExport, String> {
    let session = load_session(&app)?;
    let client = reqwest::Client::new();

    // Fetch deck
    let deck_response = client
        .get(format!("{}/decks/{}", session.api_url, deck_id))
        .header("Authorization", format!("Bearer {}", session.token))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !deck_response.status().is_success() {
        return Err("Failed to fetch deck".to_string());
    }

    let remote_deck: RemoteDeck = deck_response
        .json()
        .await
        .map_err(|e| format!("Failed to parse deck: {}", e))?;

    // Fetch cards
    let cards_response = client
        .get(format!("{}/decks/{}/cards", session.api_url, deck_id))
        .header("Authorization", format!("Bearer {}", session.token))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let remote_cards: Vec<RemoteCard> = if cards_response.status().is_success() {
        cards_response.json().await.unwrap_or_default()
    } else {
        vec![]
    };

    let cards_export: Vec<CardExport> = remote_cards
        .into_iter()
        .map(|c| CardExport {
            front: c.front,
            back: c.back,
            front_type: c.front_type,
            back_type: c.back_type,
            front_language: c.front_language,
            back_language: c.back_language,
            notes: c.notes,
        })
        .collect();

    Ok(DeckExport {
        name: remote_deck.name,
        description: remote_deck.description,
        cards: cards_export,
        exported_at: chrono::Utc::now().to_rfc3339(),
    })
}

/// Sync all pending items to the server
#[tauri::command]
pub async fn sync_pending(app: AppHandle) -> Result<usize, String> {
    let session = load_session(&app)?;
    let db_path = get_db_path(&app)?;

    // Phase 1: Collect all data from database (no await points)
    let (items, card_deck_ids): (Vec<SyncQueueItem>, std::collections::HashMap<String, (String, Option<i64>)>) = {
        let conn = rusqlite::Connection::open(&db_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        let mut stmt = conn.prepare(
            "SELECT id, entity_type, entity_id, operation, payload FROM sync_queue ORDER BY entity_type DESC, created_at ASC"
        ).map_err(|e| format!("Failed to prepare statement: {}", e))?;

        let items: Vec<SyncQueueItem> = stmt
            .query_map([], |row| {
                Ok(SyncQueueItem {
                    id: row.get(0)?,
                    entity_type: row.get(1)?,
                    entity_id: row.get(2)?,
                    operation: row.get(3)?,
                    payload: row.get(4)?,
                })
            })
            .map_err(|e| format!("Failed to query sync queue: {}", e))?
            .filter_map(|r| r.ok())
            .collect();

        // Pre-fetch deck IDs for cards
        let mut card_deck_ids: std::collections::HashMap<String, (String, Option<i64>)> = std::collections::HashMap::new();
        for item in &items {
            if item.entity_type == "card" {
                if let Ok((deck_id, server_id)) = conn.query_row(
                    "SELECT c.deck_id, d.server_id FROM cards c LEFT JOIN decks d ON c.deck_id = d.id WHERE c.id = ?1",
                    rusqlite::params![item.entity_id],
                    |row| Ok((row.get::<_, String>(0)?, row.get::<_, Option<i64>>(1)?))
                ) {
                    card_deck_ids.insert(item.entity_id.clone(), (deck_id, server_id));
                }
            }
        }

        (items, card_deck_ids)
    }; // conn dropped here

    // Phase 2: Do network calls
    let client = reqwest::Client::new();
    let mut synced_items: Vec<(i64, String, Option<i64>)> = Vec::new(); // (queue_id, entity_id, server_id)
    let mut deck_id_map: std::collections::HashMap<String, i64> = std::collections::HashMap::new();

    for item in items {
        match (item.entity_type.as_str(), item.operation.as_str()) {
            ("deck", "create") => {
                if let Some(payload) = &item.payload {
                    let deck_data: serde_json::Value = serde_json::from_str(payload).unwrap_or_default();

                    let response = client
                        .post(format!("{}/decks", session.api_url))
                        .header("Authorization", format!("Bearer {}", session.token))
                        .json(&deck_data)
                        .send()
                        .await;

                    if let Ok(resp) = response {
                        if resp.status().is_success() {
                            if let Ok(remote_deck) = resp.json::<RemoteDeck>().await {
                                deck_id_map.insert(item.entity_id.clone(), remote_deck.id);
                                synced_items.push((item.id, item.entity_id.clone(), Some(remote_deck.id)));
                            }
                        }
                    }
                }
            }
            ("card", "create") => {
                if let Some(payload) = &item.payload {
                    let card_data: CardImport = serde_json::from_str(payload).unwrap_or(CardImport {
                        front: String::new(),
                        back: String::new(),
                        front_type: "TEXT".to_string(),
                        back_type: "TEXT".to_string(),
                        front_language: None,
                        back_language: None,
                        notes: None,
                    });

                    // Get server deck ID from map or pre-fetched data
                    let server_deck_id = card_deck_ids.get(&item.entity_id)
                        .and_then(|(local_id, existing_server_id)| {
                            deck_id_map.get(local_id).copied().or(*existing_server_id)
                        });

                    if let Some(server_deck_id) = server_deck_id {
                        let response = client
                            .post(format!("{}/decks/{}/cards", session.api_url, server_deck_id))
                            .header("Authorization", format!("Bearer {}", session.token))
                            .json(&serde_json::json!({
                                "front": card_data.front,
                                "back": card_data.back,
                                "frontType": card_data.front_type,
                                "backType": card_data.back_type,
                                "frontLanguage": card_data.front_language,
                                "backLanguage": card_data.back_language,
                                "notes": card_data.notes
                            }))
                            .send()
                            .await;

                        if let Ok(resp) = response {
                            if resp.status().is_success() {
                                if let Ok(remote_card) = resp.json::<RemoteCard>().await {
                                    synced_items.push((item.id, item.entity_id.clone(), Some(remote_card.id)));
                                }
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }

    // Phase 3: Update database with results
    let synced_count = synced_items.len();
    {
        let conn = rusqlite::Connection::open(&db_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        for (queue_id, entity_id, server_id) in &synced_items {
            // Determine entity type by checking tables
            if let Some(sid) = server_id {
                // Try updating deck first
                let deck_updated = conn.execute(
                    "UPDATE decks SET server_id = ?1, sync_status = 'synced' WHERE id = ?2",
                    rusqlite::params![sid, entity_id]
                ).unwrap_or(0);

                if deck_updated == 0 {
                    // Try updating card
                    let _ = conn.execute(
                        "UPDATE cards SET server_id = ?1, sync_status = 'synced' WHERE id = ?2",
                        rusqlite::params![sid, entity_id]
                    );
                }
            }

            // Remove from sync queue
            let _ = conn.execute(
                "DELETE FROM sync_queue WHERE id = ?1",
                rusqlite::params![queue_id]
            );
        }
    }

    Ok(synced_count)
}

/// Get the count of pending sync items
#[tauri::command]
pub async fn get_pending_count(app: AppHandle) -> Result<usize, String> {
    let db_path = get_db_path(&app)?;
    let conn = rusqlite::Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM sync_queue", [], |row| row.get(0))
        .map_err(|e| format!("Failed to count sync queue: {}", e))?;

    Ok(count as usize)
}
