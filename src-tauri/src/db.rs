use serde::{Deserialize, Serialize};

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
// Deck Commands
// ============================================

#[tauri::command]
pub async fn get_all_decks() -> Result<Vec<Deck>, String> {
    // This will be implemented with actual SQL queries via the frontend
    // The tauri-plugin-sql exposes the database to the frontend
    Ok(vec![])
}

#[tauri::command]
pub async fn get_deck(id: String) -> Result<Option<Deck>, String> {
    let _ = id;
    Ok(None)
}

#[tauri::command]
pub async fn create_deck(request: CreateDeckRequest) -> Result<Deck, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let id = uuid::Uuid::new_v4().to_string();

    Ok(Deck {
        id,
        name: request.name,
        description: request.description,
        created_at: now.clone(),
        updated_at: now,
        sync_status: "pending".to_string(),
        server_id: None,
    })
}

#[tauri::command]
pub async fn update_deck(id: String, request: UpdateDeckRequest) -> Result<Deck, String> {
    let now = chrono::Utc::now().to_rfc3339();

    Ok(Deck {
        id,
        name: request.name,
        description: request.description,
        created_at: now.clone(),
        updated_at: now,
        sync_status: "pending".to_string(),
        server_id: None,
    })
}

#[tauri::command]
pub async fn delete_deck(id: String) -> Result<(), String> {
    let _ = id;
    Ok(())
}

// ============================================
// Card Commands
// ============================================

#[tauri::command]
pub async fn get_cards_for_deck(deck_id: String) -> Result<Vec<Card>, String> {
    let _ = deck_id;
    Ok(vec![])
}

#[tauri::command]
pub async fn get_card(id: String) -> Result<Option<Card>, String> {
    let _ = id;
    Ok(None)
}

#[tauri::command]
pub async fn create_card(deck_id: String, request: CreateCardRequest) -> Result<Card, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let id = uuid::Uuid::new_v4().to_string();

    Ok(Card {
        id,
        deck_id,
        front: request.front,
        front_type: request.front_type.unwrap_or_else(|| "TEXT".to_string()),
        front_language: request.front_language,
        back: request.back,
        back_type: request.back_type.unwrap_or_else(|| "TEXT".to_string()),
        back_language: request.back_language,
        notes: request.notes,
        created_at: now.clone(),
        updated_at: now,
        sync_status: "pending".to_string(),
        server_id: None,
    })
}

#[tauri::command]
pub async fn update_card(id: String, deck_id: String, request: UpdateCardRequest) -> Result<Card, String> {
    let now = chrono::Utc::now().to_rfc3339();

    Ok(Card {
        id,
        deck_id,
        front: request.front,
        front_type: request.front_type.unwrap_or_else(|| "TEXT".to_string()),
        front_language: request.front_language,
        back: request.back,
        back_type: request.back_type.unwrap_or_else(|| "TEXT".to_string()),
        back_language: request.back_language,
        notes: request.notes,
        created_at: now.clone(),
        updated_at: now,
        sync_status: "pending".to_string(),
        server_id: None,
    })
}

#[tauri::command]
pub async fn delete_card(id: String) -> Result<(), String> {
    let _ = id;
    Ok(())
}

// ============================================
// Tag Commands
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
