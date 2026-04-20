use rusqlite::{params, Connection};
use uuid::Uuid;

use super::models::{CreateNotebookRequest, CreatePageRequest, Notebook, Page, UpdateNotebookRequest, UpdatePageRequest};

// ============================================
// Notebook Operations
// ============================================

pub fn create_notebook(
    conn: &Connection,
    user_id: &str,
    request: &CreateNotebookRequest,
) -> Result<Notebook, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let icon = request.icon.as_deref().unwrap_or("notebook");

    conn.execute(
        "INSERT INTO notebooks (id, user_id, name, description, icon, color, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id, user_id, request.name, request.description, icon, request.color, now, now],
    )
    .map_err(|e| format!("Failed to create notebook: {}", e))?;

    get_notebook(conn, &id)?
        .ok_or_else(|| "Failed to retrieve created notebook".to_string())
}

pub fn get_all_notebooks(conn: &Connection, user_id: &str) -> Result<Vec<Notebook>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT n.id, n.user_id, n.name, n.description, n.icon, n.color,
                    n.created_at, n.updated_at,
                    (SELECT COUNT(*) FROM pages WHERE notebook_id = n.id) as page_count,
                    (SELECT COUNT(*) FROM notebook_favorites WHERE notebook_id = n.id AND user_id = ?1) as is_fav
             FROM notebooks n WHERE n.user_id = ?1 ORDER BY n.updated_at DESC",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let notebooks = stmt
        .query_map(params![user_id], |row| {
            Ok(Notebook {
                id: row.get(0)?,
                user_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                icon: row.get(4)?,
                color: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                page_count: Some(row.get(8)?),
                is_favorite: Some(row.get::<_, i32>(9)? > 0),
            })
        })
        .map_err(|e| format!("Failed to query notebooks: {}", e))?;

    notebooks
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect notebooks: {}", e))
}

pub fn get_notebook(conn: &Connection, id: &str) -> Result<Option<Notebook>, String> {
    match conn.query_row(
        "SELECT id, user_id, name, description, icon, color, created_at, updated_at
         FROM notebooks WHERE id = ?1",
        params![id],
        |row| {
            Ok(Notebook {
                id: row.get(0)?,
                user_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                icon: row.get(4)?,
                color: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                page_count: None,
                is_favorite: None,
            })
        },
    ) {
        Ok(notebook) => Ok(Some(notebook)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Database error: {}", e)),
    }
}

pub fn update_notebook(
    conn: &Connection,
    id: &str,
    request: &UpdateNotebookRequest,
) -> Result<Notebook, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let icon = request.icon.as_deref().unwrap_or("notebook");

    conn.execute(
        "UPDATE notebooks SET name = ?1, description = ?2, icon = ?3, color = ?4, updated_at = ?5
         WHERE id = ?6",
        params![request.name, request.description, icon, request.color, now, id],
    )
    .map_err(|e| format!("Failed to update notebook: {}", e))?;

    get_notebook(conn, id)?
        .ok_or_else(|| format!("Notebook not found after update: {}", id))
}

pub fn delete_notebook(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM notebooks WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete notebook: {}", e))?;
    Ok(())
}

// ============================================
// Page Operations
// ============================================

pub fn create_page(
    conn: &Connection,
    notebook_id: &str,
    request: &CreatePageRequest,
) -> Result<Page, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let content = request.content.as_deref().unwrap_or("");

    // Get the next position if not specified
    let position = match request.position {
        Some(pos) => pos,
        None => {
            let max_pos: i32 = conn
                .query_row(
                    "SELECT COALESCE(MAX(position), -1) FROM pages WHERE notebook_id = ?1",
                    params![notebook_id],
                    |row| row.get(0),
                )
                .unwrap_or(-1);
            max_pos + 1
        }
    };

    conn.execute(
        "INSERT INTO pages (id, notebook_id, title, content, position, is_pinned, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7)",
        params![id, notebook_id, request.title, content, position, now, now],
    )
    .map_err(|e| format!("Failed to create page: {}", e))?;

    // Update notebook's updated_at
    conn.execute(
        "UPDATE notebooks SET updated_at = ?1 WHERE id = ?2",
        params![now, notebook_id],
    )
    .ok();

    get_page(conn, &id)?
        .ok_or_else(|| "Failed to retrieve created page".to_string())
}

pub fn get_pages_for_notebook(conn: &Connection, notebook_id: &str) -> Result<Vec<Page>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, notebook_id, title, content, position, is_pinned, created_at, updated_at
             FROM pages WHERE notebook_id = ?1
             ORDER BY is_pinned DESC, position ASC",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let pages = stmt
        .query_map(params![notebook_id], |row| {
            Ok(Page {
                id: row.get(0)?,
                notebook_id: row.get(1)?,
                title: row.get(2)?,
                content: row.get(3)?,
                position: row.get(4)?,
                is_pinned: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| format!("Failed to query pages: {}", e))?;

    pages
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect pages: {}", e))
}

pub fn get_page(conn: &Connection, id: &str) -> Result<Option<Page>, String> {
    match conn.query_row(
        "SELECT id, notebook_id, title, content, position, is_pinned, created_at, updated_at
         FROM pages WHERE id = ?1",
        params![id],
        |row| {
            Ok(Page {
                id: row.get(0)?,
                notebook_id: row.get(1)?,
                title: row.get(2)?,
                content: row.get(3)?,
                position: row.get(4)?,
                is_pinned: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    ) {
        Ok(page) => Ok(Some(page)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Database error: {}", e)),
    }
}

pub fn update_page(
    conn: &Connection,
    id: &str,
    request: &UpdatePageRequest,
) -> Result<Page, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let is_pinned = request.is_pinned.unwrap_or(false);

    conn.execute(
        "UPDATE pages SET title = ?1, content = ?2, is_pinned = ?3, updated_at = ?4
         WHERE id = ?5",
        params![request.title, request.content, is_pinned as i32, now, id],
    )
    .map_err(|e| format!("Failed to update page: {}", e))?;

    // Update parent notebook's updated_at
    if let Ok(Some(page)) = get_page(conn, id) {
        conn.execute(
            "UPDATE notebooks SET updated_at = ?1 WHERE id = ?2",
            params![now, page.notebook_id],
        )
        .ok();
    }

    get_page(conn, id)?
        .ok_or_else(|| format!("Page not found after update: {}", id))
}

pub fn delete_page(conn: &Connection, id: &str) -> Result<(), String> {
    // Get notebook_id before deleting
    let notebook_id: Option<String> = conn
        .query_row(
            "SELECT notebook_id FROM pages WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .ok();

    conn.execute("DELETE FROM pages WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete page: {}", e))?;

    // Update parent notebook's updated_at
    if let Some(nb_id) = notebook_id {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE notebooks SET updated_at = ?1 WHERE id = ?2",
            params![now, nb_id],
        )
        .ok();
    }

    Ok(())
}

pub fn reorder_pages(conn: &Connection, notebook_id: &str, page_ids: &[String]) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();

    for (index, page_id) in page_ids.iter().enumerate() {
        conn.execute(
            "UPDATE pages SET position = ?1, updated_at = ?2 WHERE id = ?3 AND notebook_id = ?4",
            params![index as i32, now, page_id, notebook_id],
        )
        .map_err(|e| format!("Failed to reorder page {}: {}", page_id, e))?;
    }

    // Update notebook's updated_at
    conn.execute(
        "UPDATE notebooks SET updated_at = ?1 WHERE id = ?2",
        params![now, notebook_id],
    )
    .ok();

    Ok(())
}

pub fn toggle_page_pin(conn: &Connection, id: &str) -> Result<bool, String> {
    let now = chrono::Utc::now().to_rfc3339();

    // Get current pin status
    let current_pinned: i32 = conn
        .query_row(
            "SELECT is_pinned FROM pages WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Page not found: {}", e))?;

    let new_pinned = if current_pinned == 0 { 1 } else { 0 };

    conn.execute(
        "UPDATE pages SET is_pinned = ?1, updated_at = ?2 WHERE id = ?3",
        params![new_pinned, now, id],
    )
    .map_err(|e| format!("Failed to toggle pin: {}", e))?;

    Ok(new_pinned == 1)
}

// ============================================
// Favorite Operations
// ============================================

pub fn add_notebook_favorite(conn: &Connection, user_id: &str, notebook_id: &str) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT OR IGNORE INTO notebook_favorites (user_id, notebook_id, created_at) VALUES (?1, ?2, ?3)",
        params![user_id, notebook_id, now],
    )
    .map_err(|e| format!("Failed to add favorite: {}", e))?;
    Ok(())
}

pub fn remove_notebook_favorite(conn: &Connection, user_id: &str, notebook_id: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM notebook_favorites WHERE user_id = ?1 AND notebook_id = ?2",
        params![user_id, notebook_id],
    )
    .map_err(|e| format!("Failed to remove favorite: {}", e))?;
    Ok(())
}

pub fn is_notebook_favorite(conn: &Connection, user_id: &str, notebook_id: &str) -> Result<bool, String> {
    let count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM notebook_favorites WHERE user_id = ?1 AND notebook_id = ?2",
            params![user_id, notebook_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check favorite: {}", e))?;
    Ok(count > 0)
}

pub fn toggle_notebook_favorite(conn: &Connection, user_id: &str, notebook_id: &str) -> Result<bool, String> {
    if is_notebook_favorite(conn, user_id, notebook_id)? {
        remove_notebook_favorite(conn, user_id, notebook_id)?;
        Ok(false)
    } else {
        add_notebook_favorite(conn, user_id, notebook_id)?;
        Ok(true)
    }
}
