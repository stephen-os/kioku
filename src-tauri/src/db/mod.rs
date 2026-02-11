// Database module - organized into submodules by domain

pub mod decks;
pub mod models;
pub mod quizzes;
pub mod state;
pub mod stats;
pub mod users;

// Re-export all public types and functions for convenient access
pub use models::*;
pub use state::{init_database, DbState};

// Deck operations
pub use decks::{
    add_tag_to_card, create_card, create_deck, create_tag, delete_card, delete_deck, delete_tag,
    get_all_decks, get_card, get_cards_for_deck, get_deck, get_tag_by_name, get_tags_for_card,
    get_tags_for_deck, remove_tag_from_card, update_card, update_deck,
};

// User operations
pub use users::{
    create_user, delete_user, get_active_user, get_all_users, get_user, login_user, logout_user,
    remove_user_password, update_user,
};

// Quiz operations
pub use quizzes::{
    add_tag_to_question, create_question, create_quiz, create_quiz_tag, delete_question,
    delete_quiz, delete_quiz_tag, get_all_quizzes, get_question, get_questions_for_quiz, get_quiz,
    get_quiz_tag_by_name, get_tags_for_question, get_tags_for_quiz, remove_tag_from_question,
    reorder_questions, update_choices_for_question, update_question, update_quiz,
};

// Statistics operations
pub use stats::{
    end_study_session, get_deck_study_stats, get_quiz_attempt, get_quiz_attempts, get_quiz_stats,
    start_quiz_attempt, start_study_session, submit_quiz_attempt,
};
