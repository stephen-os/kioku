use tauri::State;

use crate::db::{
    self, CreateNotebookRequest, CreatePageRequest, DbState, Notebook, Page,
    PageSearchResult, ReorderPagesRequest, UpdateNotebookRequest, UpdatePageRequest,
};

// ============================================
// Notebook Commands
// ============================================

#[tauri::command]
pub fn get_all_notebooks(state: State<DbState>) -> Result<Vec<Notebook>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let active_user = db::get_active_user(&conn)?
        .ok_or_else(|| "No active user".to_string())?;
    db::get_all_notebooks(&conn, &active_user.id)
}

#[tauri::command]
pub fn get_notebook(state: State<DbState>, id: String) -> Result<Option<Notebook>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    db::get_notebook(&conn, &id)
}

#[tauri::command]
pub fn create_notebook(state: State<DbState>, request: CreateNotebookRequest) -> Result<Notebook, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let active_user = db::get_active_user(&conn)?
        .ok_or_else(|| "No active user".to_string())?;
    db::create_notebook(&conn, &active_user.id, &request)
}

#[tauri::command]
pub fn update_notebook(
    state: State<DbState>,
    id: String,
    request: UpdateNotebookRequest,
) -> Result<Notebook, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    db::update_notebook(&conn, &id, &request)
}

#[tauri::command]
pub fn delete_notebook(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    db::delete_notebook(&conn, &id)
}

#[tauri::command]
pub fn toggle_notebook_favorite(state: State<DbState>, notebook_id: String) -> Result<bool, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let active_user = db::get_active_user(&conn)?
        .ok_or_else(|| "No active user".to_string())?;
    db::toggle_notebook_favorite(&conn, &active_user.id, &notebook_id)
}

// ============================================
// Page Commands
// ============================================

#[tauri::command]
pub fn get_pages_for_notebook(state: State<DbState>, notebook_id: String) -> Result<Vec<Page>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    db::get_pages_for_notebook(&conn, &notebook_id)
}

#[tauri::command]
pub fn get_page(state: State<DbState>, id: String) -> Result<Option<Page>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    db::get_page(&conn, &id)
}

#[tauri::command]
pub fn create_page(
    state: State<DbState>,
    notebook_id: String,
    request: CreatePageRequest,
) -> Result<Page, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    db::create_page(&conn, &notebook_id, &request)
}

#[tauri::command]
pub fn update_page(
    state: State<DbState>,
    id: String,
    request: UpdatePageRequest,
) -> Result<Page, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    db::update_page(&conn, &id, &request)
}

#[tauri::command]
pub fn delete_page(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    db::delete_page(&conn, &id)
}

#[tauri::command]
pub fn reorder_pages(
    state: State<DbState>,
    notebook_id: String,
    request: ReorderPagesRequest,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    db::reorder_pages(&conn, &notebook_id, &request.page_ids)
}

#[tauri::command]
pub fn toggle_page_pin(state: State<DbState>, id: String) -> Result<bool, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    db::toggle_page_pin(&conn, &id)
}

// ============================================
// Search Commands
// ============================================

#[tauri::command]
pub fn search_pages(
    state: State<DbState>,
    query: String,
    limit: Option<i32>,
) -> Result<Vec<PageSearchResult>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let active_user = db::get_active_user(&conn)?
        .ok_or_else(|| "No active user".to_string())?;
    db::search_pages(&conn, &active_user.id, &query, limit)
}

#[tauri::command]
pub fn get_recent_pages(
    state: State<DbState>,
    limit: Option<i32>,
) -> Result<Vec<PageSearchResult>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let active_user = db::get_active_user(&conn)?
        .ok_or_else(|| "No active user".to_string())?;
    db::get_recent_pages(&conn, &active_user.id, limit)
}

// ============================================
// Page Organization Commands
// ============================================

#[tauri::command]
pub fn duplicate_page(state: State<DbState>, page_id: String) -> Result<Page, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    db::duplicate_page(&conn, &page_id)
}

#[tauri::command]
pub fn move_page(
    state: State<DbState>,
    page_id: String,
    target_notebook_id: String,
) -> Result<Page, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    db::move_page(&conn, &page_id, &target_notebook_id)
}

// ============================================
// Backlinks Commands
// ============================================

#[tauri::command]
pub fn get_backlinks(
    state: State<DbState>,
    page_id: String,
) -> Result<Vec<PageSearchResult>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let active_user = db::get_active_user(&conn)?
        .ok_or_else(|| "No active user".to_string())?;
    db::get_backlinks(&conn, &page_id, &active_user.id)
}

#[tauri::command]
pub fn get_all_page_titles(state: State<DbState>) -> Result<Vec<PageSearchResult>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let active_user = db::get_active_user(&conn)?
        .ok_or_else(|| "No active user".to_string())?;
    db::get_all_page_titles(&conn, &active_user.id)
}
