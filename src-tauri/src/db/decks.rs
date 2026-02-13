use rusqlite::{params, Connection};
use uuid::Uuid;

use super::models::{Card, CardTag, CreateCardRequest, Deck, Tag, UpdateCardRequest};

// ============================================
// Deck Operations
// ============================================

pub fn create_deck(
    conn: &Connection,
    user_id: &str,
    name: &str,
    description: Option<&str>,
    shuffle_cards: bool,
) -> Result<Deck, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO decks (id, user_id, name, description, shuffle_cards, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, user_id, name, description, shuffle_cards as i32, now, now],
    )
    .map_err(|e| format!("Failed to create deck: {}", e))?;

    get_deck(conn, &id)
}

pub fn get_all_decks(conn: &Connection, user_id: &str) -> Result<Vec<Deck>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT d.id, d.name, d.description, d.shuffle_cards, d.created_at, d.updated_at,
                    (SELECT COUNT(*) FROM cards WHERE deck_id = d.id) as card_count
             FROM decks d WHERE d.user_id = ?1 ORDER BY d.updated_at DESC",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let decks = stmt
        .query_map(params![user_id], |row| {
            Ok(Deck {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                shuffle_cards: row.get::<_, i32>(3)? != 0,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                card_count: Some(row.get(6)?),
            })
        })
        .map_err(|e| format!("Failed to query decks: {}", e))?;

    decks
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect decks: {}", e))
}

pub fn get_deck(conn: &Connection, id: &str) -> Result<Deck, String> {
    conn.query_row(
        "SELECT id, name, description, shuffle_cards, created_at, updated_at
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
                card_count: None,
            })
        },
    )
    .map_err(|e| format!("Deck not found: {}", e))
}

pub fn update_deck(
    conn: &Connection,
    id: &str,
    name: &str,
    description: Option<&str>,
    shuffle_cards: bool,
) -> Result<Deck, String> {
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE decks SET name = ?1, description = ?2, shuffle_cards = ?3, updated_at = ?4
         WHERE id = ?5",
        params![name, description, shuffle_cards as i32, now, id],
    )
    .map_err(|e| format!("Failed to update deck: {}", e))?;

    get_deck(conn, id)
}

pub fn delete_deck(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM decks WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete deck: {}", e))?;
    Ok(())
}

// ============================================
// Card Operations
// ============================================

pub fn create_card(
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
    get_card(conn, &id, deck_id)
}

pub fn get_cards_for_deck(conn: &Connection, deck_id: &str) -> Result<Vec<Card>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, deck_id, front, front_type, front_language,
                    back, back_type, back_language, notes,
                    created_at, updated_at
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
                tags: vec![],
            })
        })
        .map_err(|e| format!("Failed to query cards: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect cards: {}", e))?;

    let mut result = Vec::with_capacity(cards.len());
    for mut card in cards {
        card.tags = get_tags_for_card(conn, &card.id)?;
        result.push(card);
    }

    Ok(result)
}

pub fn get_card(conn: &Connection, id: &str, deck_id: &str) -> Result<Card, String> {
    let mut card = conn
        .query_row(
            "SELECT id, deck_id, front, front_type, front_language,
                    back, back_type, back_language, notes,
                    created_at, updated_at
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
                    tags: vec![],
                })
            },
        )
        .map_err(|e| format!("Card not found: {}", e))?;

    card.tags = get_tags_for_card(conn, &card.id)?;
    Ok(card)
}

pub fn update_card(
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
    get_card(conn, id, deck_id)
}

pub fn delete_card(conn: &Connection, id: &str, deck_id: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM cards WHERE id = ?1 AND deck_id = ?2",
        params![id, deck_id],
    )
    .map_err(|e| format!("Failed to delete card: {}", e))?;
    Ok(())
}

// ============================================
// Tag Operations
// ============================================

pub fn create_tag(conn: &Connection, deck_id: &str, name: &str) -> Result<Tag, String> {
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO tags (id, deck_id, name) VALUES (?1, ?2, ?3)",
        params![id, deck_id, name],
    )
    .map_err(|e| format!("Failed to create tag: {}", e))?;

    Ok(Tag {
        id,
        deck_id: deck_id.to_string(),
        name: name.to_string(),
    })
}

pub fn get_tags_for_deck(conn: &Connection, deck_id: &str) -> Result<Vec<Tag>, String> {
    let mut stmt = conn
        .prepare("SELECT id, deck_id, name FROM tags WHERE deck_id = ?1 ORDER BY name")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let tags = stmt
        .query_map(params![deck_id], |row| {
            Ok(Tag {
                id: row.get(0)?,
                deck_id: row.get(1)?,
                name: row.get(2)?,
            })
        })
        .map_err(|e| format!("Failed to query tags: {}", e))?;

    tags.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect tags: {}", e))
}

pub fn get_tags_for_card(conn: &Connection, card_id: &str) -> Result<Vec<CardTag>, String> {
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

pub fn delete_tag(conn: &Connection, deck_id: &str, id: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM tags WHERE id = ?1 AND deck_id = ?2",
        params![id, deck_id],
    )
    .map_err(|e| format!("Failed to delete tag: {}", e))?;
    Ok(())
}

pub fn add_tag_to_card(
    conn: &Connection,
    _deck_id: &str,
    card_id: &str,
    tag_id: &str,
) -> Result<(), String> {
    conn.execute(
        "INSERT OR IGNORE INTO card_tags (card_id, tag_id) VALUES (?1, ?2)",
        params![card_id, tag_id],
    )
    .map_err(|e| format!("Failed to add tag to card: {}", e))?;
    Ok(())
}

pub fn remove_tag_from_card(
    conn: &Connection,
    _deck_id: &str,
    card_id: &str,
    tag_id: &str,
) -> Result<(), String> {
    conn.execute(
        "DELETE FROM card_tags WHERE card_id = ?1 AND tag_id = ?2",
        params![card_id, tag_id],
    )
    .map_err(|e| format!("Failed to remove tag from card: {}", e))?;
    Ok(())
}

pub fn get_tag_by_name(conn: &Connection, deck_id: &str, name: &str) -> Result<Option<Tag>, String> {
    match conn.query_row(
        "SELECT id, deck_id, name FROM tags WHERE deck_id = ?1 AND name = ?2",
        params![deck_id, name],
        |row| {
            Ok(Tag {
                id: row.get(0)?,
                deck_id: row.get(1)?,
                name: row.get(2)?,
            })
        },
    ) {
        Ok(tag) => Ok(Some(tag)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Query failed: {}", e)),
    }
}
