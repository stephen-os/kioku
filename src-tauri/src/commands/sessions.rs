use tauri::State;

use crate::db::{self, DbState, DeckStudyStats, StudySession};

#[tauri::command]
pub fn start_study_session(state: State<DbState>, deck_id: String) -> Result<StudySession, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    db::start_study_session(&conn, &deck_id)
}

#[tauri::command]
pub fn end_study_session(
    state: State<DbState>,
    session_id: String,
    cards_studied: i32,
) -> Result<StudySession, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    db::end_study_session(&conn, &session_id, cards_studied)
}

#[tauri::command]
pub fn get_deck_study_stats(
    state: State<DbState>,
    deck_id: String,
) -> Result<DeckStudyStats, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    db::get_deck_study_stats(&conn, &deck_id)
}
