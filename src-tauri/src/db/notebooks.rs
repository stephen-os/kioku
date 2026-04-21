use rusqlite::{params, Connection};
use uuid::Uuid;

use super::models::{CreateNotebookRequest, CreatePageRequest, Notebook, Page, PageSearchResult, UpdateNotebookRequest, UpdatePageRequest};

// ============================================
// Notebook Operations
// ============================================

/// Generate a unique notebook name by appending a number if needed
fn get_unique_notebook_name(conn: &Connection, user_id: &str, base_name: &str) -> Result<String, String> {
    // Check if the base name is available
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM notebooks WHERE user_id = ?1 AND name = ?2)",
            params![user_id, base_name],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check notebook name: {}", e))?;

    if !exists {
        return Ok(base_name.to_string());
    }

    // Find the next available number
    for i in 2..=100 {
        let candidate = format!("{} {}", base_name, i);
        let exists: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM notebooks WHERE user_id = ?1 AND name = ?2)",
                params![user_id, &candidate],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check notebook name: {}", e))?;

        if !exists {
            return Ok(candidate);
        }
    }

    // Fallback: use timestamp
    Ok(format!("{} {}", base_name, chrono::Utc::now().timestamp()))
}

pub fn create_notebook(
    conn: &Connection,
    user_id: &str,
    request: &CreateNotebookRequest,
) -> Result<Notebook, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let icon = request.icon.as_deref().unwrap_or("notebook");
    let name = get_unique_notebook_name(conn, user_id, &request.name)?;

    conn.execute(
        "INSERT INTO notebooks (id, user_id, name, description, icon, color, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id, user_id, name, request.description, icon, request.color, now, now],
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

pub fn delete_notebook(conn: &Connection, user_id: &str, id: &str) -> Result<(), String> {
    let rows_affected = conn
        .execute(
            "DELETE FROM notebooks WHERE id = ?1 AND user_id = ?2",
            params![id, user_id],
        )
        .map_err(|e| format!("Failed to delete notebook: {}", e))?;

    if rows_affected == 0 {
        return Err("Notebook not found or access denied".to_string());
    }
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
    if let Err(e) = conn.execute(
        "UPDATE notebooks SET updated_at = ?1 WHERE id = ?2",
        params![now, notebook_id],
    ) {
        eprintln!("Warning: Failed to update notebook timestamp: {}", e);
    }

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
        if let Err(e) = conn.execute(
            "UPDATE notebooks SET updated_at = ?1 WHERE id = ?2",
            params![now, page.notebook_id],
        ) {
            eprintln!("Warning: Failed to update notebook timestamp: {}", e);
        }
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
        if let Err(e) = conn.execute(
            "UPDATE notebooks SET updated_at = ?1 WHERE id = ?2",
            params![now, nb_id],
        ) {
            eprintln!("Warning: Failed to update notebook timestamp: {}", e);
        }
    }

    Ok(())
}

pub fn reorder_pages(conn: &Connection, notebook_id: &str, page_ids: &[String]) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();

    // Begin transaction for atomic reordering
    conn.execute("BEGIN TRANSACTION", [])
        .map_err(|e| format!("Failed to begin transaction: {}", e))?;

    let result = (|| -> Result<(), String> {
        for (index, page_id) in page_ids.iter().enumerate() {
            conn.execute(
                "UPDATE pages SET position = ?1, updated_at = ?2 WHERE id = ?3 AND notebook_id = ?4",
                params![index as i32, now, page_id, notebook_id],
            )
            .map_err(|e| format!("Failed to reorder page {}: {}", page_id, e))?;
        }

        // Update notebook's updated_at
        if let Err(e) = conn.execute(
            "UPDATE notebooks SET updated_at = ?1 WHERE id = ?2",
            params![now, notebook_id],
        ) {
            eprintln!("Warning: Failed to update notebook timestamp: {}", e);
        }

        Ok(())
    })();

    match result {
        Ok(()) => {
            conn.execute("COMMIT", [])
                .map_err(|e| format!("Failed to commit transaction: {}", e))?;
            Ok(())
        }
        Err(e) => {
            if let Err(rollback_err) = conn.execute("ROLLBACK", []) {
                eprintln!("Warning: Failed to rollback transaction: {}", rollback_err);
            }
            Err(e)
        }
    }
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

// ============================================
// Search Operations
// ============================================

/// Search pages across all notebooks for a user
/// Returns results ordered by relevance (title match) then by updated_at
pub fn search_pages(
    conn: &Connection,
    user_id: &str,
    query: &str,
    limit: Option<i32>,
) -> Result<Vec<PageSearchResult>, String> {
    let limit = limit.unwrap_or(20);
    let search_pattern = format!("%{}%", query.to_lowercase());

    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.notebook_id, p.title, n.name as notebook_name, p.updated_at
             FROM pages p
             INNER JOIN notebooks n ON p.notebook_id = n.id
             WHERE n.user_id = ?1 AND LOWER(p.title) LIKE ?2
             ORDER BY
                CASE WHEN LOWER(p.title) LIKE ?3 THEN 0 ELSE 1 END,
                p.updated_at DESC
             LIMIT ?4",
        )
        .map_err(|e| format!("Failed to prepare search query: {}", e))?;

    // For ranking: exact prefix match gets priority
    let prefix_pattern = format!("{}%", query.to_lowercase());

    let results = stmt
        .query_map(params![user_id, search_pattern, prefix_pattern, limit], |row| {
            Ok(PageSearchResult {
                id: row.get(0)?,
                notebook_id: row.get(1)?,
                title: row.get(2)?,
                notebook_name: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| format!("Failed to search pages: {}", e))?;

    results
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect search results: {}", e))
}

/// Get recent pages across all notebooks for a user
pub fn get_recent_pages(
    conn: &Connection,
    user_id: &str,
    limit: Option<i32>,
) -> Result<Vec<PageSearchResult>, String> {
    let limit = limit.unwrap_or(10);

    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.notebook_id, p.title, n.name as notebook_name, p.updated_at
             FROM pages p
             INNER JOIN notebooks n ON p.notebook_id = n.id
             WHERE n.user_id = ?1
             ORDER BY p.updated_at DESC
             LIMIT ?2",
        )
        .map_err(|e| format!("Failed to prepare recent pages query: {}", e))?;

    let results = stmt
        .query_map(params![user_id, limit], |row| {
            Ok(PageSearchResult {
                id: row.get(0)?,
                notebook_id: row.get(1)?,
                title: row.get(2)?,
                notebook_name: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| format!("Failed to get recent pages: {}", e))?;

    results
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect recent pages: {}", e))
}

// ============================================
// Page Organization Operations
// ============================================

/// Duplicate a page within the same notebook
pub fn duplicate_page(conn: &Connection, page_id: &str) -> Result<Page, String> {
    // Get the original page
    let original = get_page(conn, page_id)?
        .ok_or_else(|| format!("Page not found: {}", page_id))?;

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // Get the next position in the notebook
    let max_pos: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(position), -1) FROM pages WHERE notebook_id = ?1",
            params![original.notebook_id],
            |row| row.get(0),
        )
        .unwrap_or(-1);
    let position = max_pos + 1;

    // Create the duplicate with " (copy)" suffix
    let title = format!("{} (copy)", original.title);

    conn.execute(
        "INSERT INTO pages (id, notebook_id, title, content, position, is_pinned, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7)",
        params![id, original.notebook_id, title, original.content, position, now, now],
    )
    .map_err(|e| format!("Failed to duplicate page: {}", e))?;

    // Update notebook's updated_at
    if let Err(e) = conn.execute(
        "UPDATE notebooks SET updated_at = ?1 WHERE id = ?2",
        params![now, original.notebook_id],
    ) {
        eprintln!("Warning: Failed to update notebook timestamp: {}", e);
    }

    get_page(conn, &id)?
        .ok_or_else(|| "Failed to retrieve duplicated page".to_string())
}

/// Move a page to a different notebook
pub fn move_page(
    conn: &Connection,
    page_id: &str,
    target_notebook_id: &str,
) -> Result<Page, String> {
    let now = chrono::Utc::now().to_rfc3339();

    // Get the current page to find its source notebook
    let page = get_page(conn, page_id)?
        .ok_or_else(|| format!("Page not found: {}", page_id))?;

    let source_notebook_id = page.notebook_id.clone();

    // Get the next position in the target notebook
    let max_pos: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(position), -1) FROM pages WHERE notebook_id = ?1",
            params![target_notebook_id],
            |row| row.get(0),
        )
        .unwrap_or(-1);
    let position = max_pos + 1;

    // Move the page
    conn.execute(
        "UPDATE pages SET notebook_id = ?1, position = ?2, updated_at = ?3 WHERE id = ?4",
        params![target_notebook_id, position, now, page_id],
    )
    .map_err(|e| format!("Failed to move page: {}", e))?;

    // Update both notebooks' updated_at
    if let Err(e) = conn.execute(
        "UPDATE notebooks SET updated_at = ?1 WHERE id = ?2",
        params![now, source_notebook_id],
    ) {
        eprintln!("Warning: Failed to update source notebook timestamp: {}", e);
    }
    if let Err(e) = conn.execute(
        "UPDATE notebooks SET updated_at = ?1 WHERE id = ?2",
        params![now, target_notebook_id],
    ) {
        eprintln!("Warning: Failed to update target notebook timestamp: {}", e);
    }

    get_page(conn, page_id)?
        .ok_or_else(|| "Failed to retrieve moved page".to_string())
}

// ============================================
// Backlinks Operations
// ============================================

/// Get all pages that link to a given page using [[Page Title]] syntax
/// Searches for [[exact_title]] pattern in page content
pub fn get_backlinks(
    conn: &Connection,
    page_id: &str,
    user_id: &str,
) -> Result<Vec<PageSearchResult>, String> {
    // First get the target page's title
    let page = get_page(conn, page_id)?
        .ok_or_else(|| format!("Page not found: {}", page_id))?;

    // Search for [[Page Title]] or [[Page Title|...]] in content
    // We need to match both [[Title]] and [[Title|Display Text]]
    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.notebook_id, p.title, n.name as notebook_name, p.updated_at
             FROM pages p
             INNER JOIN notebooks n ON p.notebook_id = n.id
             WHERE n.user_id = ?1
               AND p.id != ?2
               AND (p.content LIKE ?3 OR p.content LIKE ?4)
             ORDER BY p.updated_at DESC",
        )
        .map_err(|e| format!("Failed to prepare backlinks query: {}", e))?;

    // Pattern for [[Title]] anywhere in content
    let pattern1 = format!("%[[{}]]%", page.title);
    // Pattern for [[Title|...]] (with display text)
    let pattern2 = format!("%[[{}|%", page.title);

    let results = stmt
        .query_map(params![user_id, page_id, pattern1, pattern2], |row| {
            Ok(PageSearchResult {
                id: row.get(0)?,
                notebook_id: row.get(1)?,
                title: row.get(2)?,
                notebook_name: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| format!("Failed to get backlinks: {}", e))?;

    results
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect backlinks: {}", e))
}

/// Get all pages for autocomplete (lightweight query)
pub fn get_all_page_titles(
    conn: &Connection,
    user_id: &str,
) -> Result<Vec<PageSearchResult>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.notebook_id, p.title, n.name as notebook_name, p.updated_at
             FROM pages p
             INNER JOIN notebooks n ON p.notebook_id = n.id
             WHERE n.user_id = ?1
             ORDER BY p.title ASC",
        )
        .map_err(|e| format!("Failed to prepare page titles query: {}", e))?;

    let results = stmt
        .query_map(params![user_id], |row| {
            Ok(PageSearchResult {
                id: row.get(0)?,
                notebook_id: row.get(1)?,
                title: row.get(2)?,
                notebook_name: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| format!("Failed to get page titles: {}", e))?;

    results
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect page titles: {}", e))
}
