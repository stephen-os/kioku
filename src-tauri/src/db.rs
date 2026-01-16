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
// Tag Commands (stub for now)
// ============================================

#[tauri::command]
pub async fn get_tags_for_deck(deck_id: String) -> Result<Vec<Tag>, String> {
    let _ = deck_id;
    Ok(vec![])
}

#[tauri::command]
pub async fn create_tag(deck_id: String, name: String) -> Result<Tag, String> {
    let id = uuid::Uuid::new_v4().to_string();

    Ok(Tag {
        id,
        deck_id,
        name,
        sync_status: "pending".to_string(),
        server_id: None,
    })
}

#[tauri::command]
pub async fn delete_tag(id: String) -> Result<(), String> {
    let _ = id;
    Ok(())
}

#[tauri::command]
pub async fn add_tag_to_card(card_id: String, tag_id: String) -> Result<(), String> {
    let _ = (card_id, tag_id);
    Ok(())
}

#[tauri::command]
pub async fn remove_tag_from_card(card_id: String, tag_id: String) -> Result<(), String> {
    let _ = (card_id, tag_id);
    Ok(())
}
