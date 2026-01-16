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
    #[serde(default)]
    pub tags: Vec<CardTag>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub deck_id: String,
    pub name: String,
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
// Connection Check
// ============================================

#[tauri::command]
pub async fn check_connection(app: AppHandle) -> Result<bool, String> {
    let session = load_session(&app)?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| format!("Failed to create client: {}", e))?;

    match client
        .get(format!("{}/decks", session.api_url))
        .header("Authorization", format!("Bearer {}", session.token))
        .send()
        .await
    {
        Ok(response) => Ok(response.status().is_success() || response.status() == reqwest::StatusCode::UNAUTHORIZED),
        Err(_) => Ok(false),
    }
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
        .map_err(|e| format!("Network error: Unable to connect. Please check your internet connection. ({})", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to fetch decks ({}): {}", status, error_text));
    }

    let remote_decks: Vec<RemoteDeck> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse decks: {}", e))?;

    let decks = remote_decks
        .into_iter()
        .map(|d| Deck {
            id: d.id.to_string(),
            name: d.name,
            description: d.description,
            created_at: d.created_at,
            updated_at: d.updated_at,
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
        .map_err(|e| format!("Network error: Unable to connect. Please check your internet connection. ({})", e))?;

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
        .map_err(|_| "Network error: Unable to connect. Creating decks requires an internet connection.".to_string())?;

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
        .map_err(|_| "Network error: Unable to connect. Updating decks requires an internet connection.".to_string())?;

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
        .map_err(|_| "Network error: Unable to connect. Deleting decks requires an internet connection.".to_string())?;

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
        .map_err(|e| format!("Network error: Unable to connect. Please check your internet connection. ({})", e))?;

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
        .map_err(|_| "Network error: Unable to connect. Creating cards requires an internet connection.".to_string())?;

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
        .map_err(|_| "Network error: Unable to connect. Updating cards requires an internet connection.".to_string())?;

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
        .map_err(|_| "Network error: Unable to connect. Deleting cards requires an internet connection.".to_string())?;

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
        .map_err(|_| "Network error: Unable to connect. Creating tags requires an internet connection.".to_string())?;

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
        .map_err(|_| "Network error: Unable to connect. Deleting tags requires an internet connection.".to_string())?;

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
        .map_err(|_| "Network error: Unable to connect. Adding tags requires an internet connection.".to_string())?;

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
        .map_err(|_| "Network error: Unable to connect. Removing tags requires an internet connection.".to_string())?;

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
}

// ============================================
// Import/Export Commands
// ============================================

/// Import a deck from JSON file (requires online connection)
#[tauri::command]
pub async fn import_deck(app: AppHandle, file_path: String) -> Result<ImportResult, String> {
    // Read and parse the JSON file
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let import_data: DeckImport = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let session = load_session(&app)?;
    let client = reqwest::Client::new();

    // Create deck on server (required - no offline support)
    let response = client
        .post(format!("{}/decks", session.api_url))
        .header("Authorization", format!("Bearer {}", session.token))
        .json(&serde_json::json!({
            "name": import_data.name,
            "description": import_data.description
        }))
        .send()
        .await
        .map_err(|_| "Network error: Unable to connect. Importing decks requires an internet connection.".to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to create deck ({}): {}", status, error_text));
    }

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
        },
        cards_imported,
    })
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
        .map_err(|_| "Network error: Unable to connect. Exporting decks requires an internet connection.".to_string())?;

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
        .map_err(|_| "Network error: Unable to connect.".to_string())?;

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
