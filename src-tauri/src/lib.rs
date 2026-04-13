mod commands;
mod db;

use std::sync::Mutex;
use tauri::{AppHandle, Manager};

use db::DbState;

fn init_db(app: &AppHandle) -> Result<(), String> {
    let conn = db::init_database(app)?;
    app.manage(DbState(Mutex::new(conn)));
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            init_db(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // User commands
            commands::users::get_all_users,
            commands::users::get_user,
            commands::users::create_user,
            commands::users::login_user,
            commands::users::get_active_user,
            commands::users::logout_user,
            commands::users::delete_user,
            commands::users::update_user,
            commands::users::remove_user_password,
            // Deck commands
            commands::decks::get_all_decks,
            commands::decks::get_deck,
            commands::decks::create_deck,
            commands::decks::update_deck,
            commands::decks::delete_deck,
            // Card commands
            commands::decks::get_cards_for_deck,
            commands::decks::get_card,
            commands::decks::create_card,
            commands::decks::update_card,
            commands::decks::delete_card,
            // Tag commands
            commands::decks::get_tags_for_deck,
            commands::decks::get_tags_for_card,
            commands::decks::create_tag,
            commands::decks::delete_tag,
            commands::decks::add_tag_to_card,
            commands::decks::remove_tag_from_card,
            // Quiz tag commands
            commands::quizzes::get_tags_for_quiz,
            commands::quizzes::get_tags_for_question,
            commands::quizzes::create_quiz_tag,
            commands::quizzes::delete_quiz_tag,
            commands::quizzes::add_tag_to_question,
            commands::quizzes::remove_tag_from_question,
            // Quiz commands
            commands::quizzes::get_all_quizzes,
            commands::quizzes::get_quiz,
            commands::quizzes::create_quiz,
            commands::quizzes::update_quiz,
            commands::quizzes::delete_quiz,
            // Question commands
            commands::quizzes::get_questions_for_quiz,
            commands::quizzes::get_question,
            commands::quizzes::create_question,
            commands::quizzes::update_question,
            commands::quizzes::delete_question,
            commands::quizzes::reorder_questions,
            commands::quizzes::update_question_choices,
            // Quiz attempt commands
            commands::quizzes::start_quiz_attempt,
            commands::quizzes::submit_quiz_attempt,
            commands::quizzes::get_quiz_attempt,
            commands::quizzes::get_quiz_attempts,
            commands::quizzes::get_quiz_stats,
            // Study session commands
            commands::sessions::start_study_session,
            commands::sessions::end_study_session,
            commands::sessions::get_deck_study_stats,
            // Import / Export commands
            commands::transfer::import_deck_from_file,
            commands::transfer::export_deck_to_json,
            commands::transfer::import_quiz_from_file,
            commands::transfer::export_quiz_to_json,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
