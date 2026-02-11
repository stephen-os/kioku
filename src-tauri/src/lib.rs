mod local_db;

use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

use local_db::{
    Card, CardTag, CreateCardRequest, CreateDeckRequest, DbState, Deck, Tag,
    UpdateCardRequest, UpdateDeckRequest,
    // Quiz types
    Quiz, Question, QuizAttempt, QuizStats, QuizTag, QuestionTag,
    CreateQuizRequest, UpdateQuizRequest, CreateQuestionRequest, UpdateQuestionRequest,
    CreateChoiceRequest, SubmitQuizRequest,
    // Study session types
    StudySession, DeckStudyStats,
    // Local user types
    LocalUser, CreateUserRequest,
};
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportResult {
    deck: Deck,
    cards_imported: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct QuizImportResult {
    quiz: Quiz,
    questions_imported: usize,
}

// ============================================
// Database Initialization
// ============================================

fn init_db(app: &AppHandle) -> Result<(), String> {
    let conn = local_db::init_database(app)?;
    app.manage(DbState(Mutex::new(conn)));
    Ok(())
}

// ============================================
// Local User Commands
// ============================================

#[tauri::command]
fn get_all_users(state: State<DbState>) -> Result<Vec<LocalUser>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::get_all_users(&conn)
}

#[tauri::command]
fn get_user(state: State<DbState>, user_id: String) -> Result<LocalUser, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::get_user(&conn, &user_id)
}

#[tauri::command]
fn create_user(state: State<DbState>, request: CreateUserRequest) -> Result<LocalUser, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::create_user(&conn, &request)
}

#[tauri::command]
fn login_user(state: State<DbState>, user_id: String, password: Option<String>) -> Result<LocalUser, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::login_user(&conn, &user_id, password.as_deref())
}

#[tauri::command]
fn get_active_user(state: State<DbState>) -> Result<Option<LocalUser>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::get_active_user(&conn)
}

#[tauri::command]
fn logout_user(state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::logout_user(&conn)
}

#[tauri::command]
fn delete_user(state: State<DbState>, user_id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::delete_user(&conn, &user_id)
}

#[tauri::command]
fn update_user(state: State<DbState>, user_id: String, name: String, password: Option<String>, avatar: Option<String>) -> Result<LocalUser, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::update_user(&conn, &user_id, &name, password.as_deref(), avatar.as_deref())
}

#[tauri::command]
fn remove_user_password(state: State<DbState>, user_id: String) -> Result<LocalUser, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::remove_user_password(&conn, &user_id)
}

// ============================================
// Deck Commands
// ============================================

#[tauri::command]
fn get_all_decks(state: State<DbState>) -> Result<Vec<Deck>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::get_all_decks_local(&conn)
}

#[tauri::command]
fn get_deck(state: State<DbState>, id: String) -> Result<Option<Deck>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    match local_db::get_deck_local(&conn, &id) {
        Ok(deck) => Ok(Some(deck)),
        Err(_) => Ok(None),
    }
}

#[tauri::command]
fn create_deck(state: State<DbState>, request: CreateDeckRequest) -> Result<Deck, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::create_deck_local(
        &conn,
        &request.name,
        request.description.as_deref(),
        request.shuffle_cards.unwrap_or(false),
    )
}

#[tauri::command]
fn update_deck(
    state: State<DbState>,
    id: String,
    request: UpdateDeckRequest,
) -> Result<Deck, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::update_deck_local(
        &conn,
        &id,
        &request.name,
        request.description.as_deref(),
        request.shuffle_cards.unwrap_or(false),
    )
}

#[tauri::command]
fn delete_deck(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::delete_deck_local(&conn, &id)
}

// ============================================
// Card Commands
// ============================================

#[tauri::command]
fn get_cards_for_deck(state: State<DbState>, deck_id: String) -> Result<Vec<Card>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::get_cards_for_deck_local(&conn, &deck_id)
}

#[tauri::command]
fn get_card(state: State<DbState>, id: String, deck_id: String) -> Result<Option<Card>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    match local_db::get_card_local(&conn, &id, &deck_id) {
        Ok(card) => Ok(Some(card)),
        Err(_) => Ok(None),
    }
}

#[tauri::command]
fn create_card(
    state: State<DbState>,
    deck_id: String,
    request: CreateCardRequest,
) -> Result<Card, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::create_card_local(&conn, &deck_id, &request)
}

#[tauri::command]
fn update_card(
    state: State<DbState>,
    id: String,
    deck_id: String,
    request: UpdateCardRequest,
) -> Result<Card, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::update_card_local(&conn, &id, &deck_id, &request)
}

#[tauri::command]
fn delete_card(state: State<DbState>, id: String, deck_id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::delete_card_local(&conn, &id, &deck_id)
}

// ============================================
// Tag Commands
// ============================================

#[tauri::command]
fn get_tags_for_deck(state: State<DbState>, deck_id: String) -> Result<Vec<Tag>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::get_tags_for_deck_local(&conn, &deck_id)
}

#[tauri::command]
fn get_tags_for_card(state: State<DbState>, card_id: String) -> Result<Vec<CardTag>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::get_tags_for_card_local(&conn, &card_id)
}

#[tauri::command]
fn create_tag(state: State<DbState>, deck_id: String, name: String) -> Result<Tag, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::create_tag_local(&conn, &deck_id, &name)
}

#[tauri::command]
fn delete_tag(state: State<DbState>, deck_id: String, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::delete_tag_local(&conn, &deck_id, &id)
}

#[tauri::command]
fn add_tag_to_card(
    state: State<DbState>,
    deck_id: String,
    card_id: String,
    tag_id: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::add_tag_to_card_local(&conn, &deck_id, &card_id, &tag_id)
}

#[tauri::command]
fn remove_tag_from_card(
    state: State<DbState>,
    deck_id: String,
    card_id: String,
    tag_id: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::remove_tag_from_card_local(&conn, &deck_id, &card_id, &tag_id)
}

// ============================================
// Quiz Tag Commands
// ============================================

#[tauri::command]
fn get_tags_for_quiz(state: State<DbState>, quiz_id: String) -> Result<Vec<QuizTag>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::get_tags_for_quiz(&conn, &quiz_id)
}

#[tauri::command]
fn get_tags_for_question(state: State<DbState>, question_id: String) -> Result<Vec<QuestionTag>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::get_tags_for_question(&conn, &question_id)
}

#[tauri::command]
fn create_quiz_tag(state: State<DbState>, quiz_id: String, name: String) -> Result<QuizTag, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::create_quiz_tag(&conn, &quiz_id, &name)
}

#[tauri::command]
fn delete_quiz_tag(state: State<DbState>, quiz_id: String, tag_id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::delete_quiz_tag(&conn, &quiz_id, &tag_id)
}

#[tauri::command]
fn add_tag_to_question(
    state: State<DbState>,
    question_id: String,
    tag_id: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::add_tag_to_question(&conn, &question_id, &tag_id)
}

#[tauri::command]
fn remove_tag_from_question(
    state: State<DbState>,
    question_id: String,
    tag_id: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::remove_tag_from_question(&conn, &question_id, &tag_id)
}

// ============================================
// Import/Export (file-based)
// ============================================

#[tauri::command]
fn import_deck_from_file(
    state: State<DbState>,
    file_path: String,
) -> Result<ImportResult, String> {
    let content = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct DeckImport {
        name: String,
        description: Option<String>,
        #[serde(default)]
        shuffle_cards: bool,
        cards: Vec<CardImport>,
    }

    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct CardImport {
        front: String,
        back: String,
        #[serde(default = "default_text")]
        front_type: String,
        #[serde(default = "default_text")]
        back_type: String,
        front_language: Option<String>,
        back_language: Option<String>,
        notes: Option<String>,
        #[serde(default)]
        tags: Vec<String>,
    }

    fn default_text() -> String {
        "TEXT".to_string()
    }

    let import_data: DeckImport = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let cards_count = import_data.cards.len();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    let deck = local_db::create_deck_local(
        &conn,
        &import_data.name,
        import_data.description.as_deref(),
        import_data.shuffle_cards,
    )?;

    // Keep track of created tags to avoid duplicates
    let mut tag_cache: std::collections::HashMap<String, String> = std::collections::HashMap::new();

    for card in import_data.cards {
        let request = CreateCardRequest {
            front: card.front,
            front_type: Some(card.front_type),
            front_language: card.front_language,
            back: card.back,
            back_type: Some(card.back_type),
            back_language: card.back_language,
            notes: card.notes,
        };
        let created_card = local_db::create_card_local(&conn, &deck.id, &request)?;

        // Handle tags for this card
        for tag_name in card.tags {
            let tag_id = if let Some(id) = tag_cache.get(&tag_name) {
                id.clone()
            } else {
                // Check if tag exists or create it
                let tag = match local_db::get_tag_by_name(&conn, &deck.id, &tag_name)? {
                    Some(existing) => existing,
                    None => local_db::create_tag_local(&conn, &deck.id, &tag_name)?,
                };
                tag_cache.insert(tag_name.clone(), tag.id.clone());
                tag.id
            };
            // Link tag to card
            let _ = local_db::add_tag_to_card_local(&conn, &deck.id, &created_card.id, &tag_id);
        }
    }

    let final_deck = local_db::get_deck_local(&conn, &deck.id)?;
    Ok(ImportResult {
        deck: final_deck,
        cards_imported: cards_count,
    })
}

#[tauri::command]
fn export_deck_to_json(state: State<DbState>, deck_id: String) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    let deck = local_db::get_deck_local(&conn, &deck_id)?;
    let cards = local_db::get_cards_for_deck_local(&conn, &deck_id)?;

    #[derive(serde::Serialize)]
    #[serde(rename_all = "camelCase")]
    struct DeckExport {
        name: String,
        description: Option<String>,
        shuffle_cards: bool,
        cards: Vec<CardExport>,
        exported_at: String,
    }

    #[derive(serde::Serialize)]
    #[serde(rename_all = "camelCase")]
    struct CardExport {
        front: String,
        back: String,
        front_type: String,
        back_type: String,
        front_language: Option<String>,
        back_language: Option<String>,
        notes: Option<String>,
        tags: Vec<String>,
    }

    let export = DeckExport {
        name: deck.name,
        description: deck.description,
        shuffle_cards: deck.shuffle_cards,
        cards: cards
            .into_iter()
            .map(|c| CardExport {
                front: c.front,
                back: c.back,
                front_type: c.front_type,
                back_type: c.back_type,
                front_language: c.front_language,
                back_language: c.back_language,
                notes: c.notes,
                tags: c.tags.into_iter().map(|t| t.name).collect(),
            })
            .collect(),
        exported_at: chrono::Utc::now().to_rfc3339(),
    };

    serde_json::to_string_pretty(&export).map_err(|e| format!("Failed to serialize: {}", e))
}

#[tauri::command]
fn export_quiz_to_json(state: State<DbState>, quiz_id: String) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    let quiz = local_db::get_quiz(&conn, &quiz_id)?;

    #[derive(serde::Serialize)]
    #[serde(rename_all = "camelCase")]
    struct QuizExport {
        name: String,
        description: Option<String>,
        shuffle_questions: bool,
        questions: Vec<QuestionExport>,
        exported_at: String,
    }

    #[derive(serde::Serialize)]
    #[serde(rename_all = "camelCase")]
    struct QuestionExport {
        #[serde(rename = "type")]
        question_type: String,
        content: String,
        content_type: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        content_language: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        correct_answer: Option<String>,
        #[serde(skip_serializing_if = "Vec::is_empty")]
        choices: Vec<ChoiceExport>,
        multiple_answers: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        explanation: Option<String>,
        #[serde(skip_serializing_if = "Vec::is_empty")]
        tags: Vec<String>,
    }

    #[derive(serde::Serialize)]
    #[serde(rename_all = "camelCase")]
    struct ChoiceExport {
        text: String,
        is_correct: bool,
    }

    let export = QuizExport {
        name: quiz.name,
        description: quiz.description,
        shuffle_questions: quiz.shuffle_questions,
        questions: quiz
            .questions
            .into_iter()
            .map(|q| QuestionExport {
                question_type: match q.question_type {
                    local_db::QuestionType::MultipleChoice => "multiple_choice".to_string(),
                    local_db::QuestionType::FillInBlank => "fill_in_blank".to_string(),
                },
                content: q.content,
                content_type: q.content_type,
                content_language: q.content_language,
                correct_answer: q.correct_answer,
                choices: q
                    .choices
                    .into_iter()
                    .map(|c| ChoiceExport {
                        text: c.text,
                        is_correct: c.is_correct,
                    })
                    .collect(),
                multiple_answers: q.multiple_answers,
                explanation: q.explanation,
                tags: q.tags.into_iter().map(|t| t.name).collect(),
            })
            .collect(),
        exported_at: chrono::Utc::now().to_rfc3339(),
    };

    serde_json::to_string_pretty(&export).map_err(|e| format!("Failed to serialize: {}", e))
}

#[tauri::command]
fn import_quiz_from_file(
    state: State<DbState>,
    file_path: String,
) -> Result<QuizImportResult, String> {
    let content = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct QuizImport {
        name: String,
        description: Option<String>,
        #[serde(default)]
        shuffle_questions: bool,
        questions: Vec<QuestionImport>,
    }

    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct QuestionImport {
        #[serde(rename = "type")]
        question_type: String,
        content: String,
        #[serde(default = "default_text")]
        content_type: String,
        content_language: Option<String>,
        #[serde(default)]
        choices: Vec<ChoiceImport>,
        #[serde(default)]
        multiple_answers: bool,
        correct_answer: Option<String>,
        explanation: Option<String>,
        #[serde(default)]
        tags: Vec<String>,
    }

    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct ChoiceImport {
        text: String,
        #[serde(default)]
        is_correct: bool,
    }

    fn default_text() -> String {
        "TEXT".to_string()
    }

    let import_data: QuizImport = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let questions_count = import_data.questions.len();
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    // Create the quiz
    let quiz_request = CreateQuizRequest {
        name: import_data.name,
        description: import_data.description,
        shuffle_questions: Some(import_data.shuffle_questions),
    };
    let quiz = local_db::create_quiz(&conn, &quiz_request)?;

    // Keep track of created tags to avoid duplicates
    let mut tag_cache: std::collections::HashMap<String, String> = std::collections::HashMap::new();

    // Create questions
    for question in import_data.questions {
        let question_request = CreateQuestionRequest {
            question_type: question.question_type,
            content: question.content,
            content_type: Some(question.content_type),
            content_language: question.content_language,
            correct_answer: question.correct_answer,
            multiple_answers: Some(question.multiple_answers),
            explanation: question.explanation,
            choices: Some(question.choices.into_iter().map(|c| CreateChoiceRequest {
                text: c.text,
                is_correct: c.is_correct,
            }).collect()),
        };
        let created_question = local_db::create_question(&conn, &quiz.id, &question_request)?;

        // Handle tags for this question
        for tag_name in question.tags {
            let tag_id = if let Some(id) = tag_cache.get(&tag_name) {
                id.clone()
            } else {
                // Check if tag exists or create it
                let tag = match local_db::get_quiz_tag_by_name(&conn, &quiz.id, &tag_name)? {
                    Some(existing) => existing,
                    None => local_db::create_quiz_tag(&conn, &quiz.id, &tag_name)?,
                };
                tag_cache.insert(tag_name.clone(), tag.id.clone());
                tag.id
            };
            // Link tag to question
            let _ = local_db::add_tag_to_question(&conn, &created_question.id, &tag_id);
        }
    }

    let final_quiz = local_db::get_quiz(&conn, &quiz.id)?;
    Ok(QuizImportResult {
        quiz: final_quiz,
        questions_imported: questions_count,
    })
}

// ============================================
// Quiz Commands
// ============================================

#[tauri::command]
fn get_all_quizzes(state: State<DbState>) -> Result<Vec<Quiz>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::get_all_quizzes(&conn)
}

#[tauri::command]
fn get_quiz(state: State<DbState>, quiz_id: String) -> Result<Quiz, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::get_quiz(&conn, &quiz_id)
}

#[tauri::command]
fn create_quiz(state: State<DbState>, request: CreateQuizRequest) -> Result<Quiz, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::create_quiz(&conn, &request)
}

#[tauri::command]
fn update_quiz(state: State<DbState>, quiz_id: String, request: UpdateQuizRequest) -> Result<Quiz, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::update_quiz(&conn, &quiz_id, &request)
}

#[tauri::command]
fn delete_quiz(state: State<DbState>, quiz_id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::delete_quiz(&conn, &quiz_id)
}

// ============================================
// Question Commands
// ============================================

#[tauri::command]
fn get_questions_for_quiz(state: State<DbState>, quiz_id: String) -> Result<Vec<Question>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::get_questions_for_quiz(&conn, &quiz_id)
}

#[tauri::command]
fn get_question(state: State<DbState>, question_id: String) -> Result<Question, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::get_question(&conn, &question_id)
}

#[tauri::command]
fn create_question(state: State<DbState>, quiz_id: String, request: CreateQuestionRequest) -> Result<Question, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::create_question(&conn, &quiz_id, &request)
}

#[tauri::command]
fn update_question(state: State<DbState>, question_id: String, request: UpdateQuestionRequest) -> Result<Question, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::update_question(&conn, &question_id, &request)
}

#[tauri::command]
fn delete_question(state: State<DbState>, question_id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::delete_question(&conn, &question_id)
}

#[tauri::command]
fn reorder_questions(state: State<DbState>, quiz_id: String, question_ids: Vec<String>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::reorder_questions(&conn, &quiz_id, &question_ids)
}

#[tauri::command]
fn update_question_choices(state: State<DbState>, question_id: String, choices: Vec<CreateChoiceRequest>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::update_choices_for_question(&conn, &question_id, &choices)
}

// ============================================
// Quiz Attempt Commands
// ============================================

#[tauri::command]
fn start_quiz_attempt(state: State<DbState>, quiz_id: String) -> Result<QuizAttempt, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::start_quiz_attempt(&conn, &quiz_id)
}

#[tauri::command]
fn submit_quiz_attempt(state: State<DbState>, attempt_id: String, request: SubmitQuizRequest) -> Result<QuizAttempt, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::submit_quiz_attempt(&conn, &attempt_id, &request.answers)
}

#[tauri::command]
fn get_quiz_attempt(state: State<DbState>, attempt_id: String) -> Result<QuizAttempt, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::get_quiz_attempt(&conn, &attempt_id)
}

#[tauri::command]
fn get_quiz_attempts(state: State<DbState>, quiz_id: String) -> Result<Vec<QuizAttempt>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::get_quiz_attempts(&conn, &quiz_id)
}

#[tauri::command]
fn get_quiz_stats(state: State<DbState>, quiz_id: String) -> Result<QuizStats, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::get_quiz_stats(&conn, &quiz_id)
}

// ============================================
// Study Session Commands
// ============================================

#[tauri::command]
fn start_study_session(state: State<DbState>, deck_id: String) -> Result<StudySession, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::start_study_session(&conn, &deck_id)
}

#[tauri::command]
fn end_study_session(state: State<DbState>, session_id: String, cards_studied: i32) -> Result<StudySession, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::end_study_session(&conn, &session_id, cards_studied)
}

#[tauri::command]
fn get_deck_study_stats(state: State<DbState>, deck_id: String) -> Result<DeckStudyStats, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    local_db::get_deck_study_stats(&conn, &deck_id)
}

// ============================================
// Application Entry Point
// ============================================

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
            // Local user commands
            get_all_users,
            get_user,
            create_user,
            login_user,
            get_active_user,
            logout_user,
            delete_user,
            update_user,
            remove_user_password,
            // Deck commands
            get_all_decks,
            get_deck,
            create_deck,
            update_deck,
            delete_deck,
            // Card commands
            get_cards_for_deck,
            get_card,
            create_card,
            update_card,
            delete_card,
            // Tag commands
            get_tags_for_deck,
            get_tags_for_card,
            create_tag,
            delete_tag,
            add_tag_to_card,
            remove_tag_from_card,
            // Quiz tag commands
            get_tags_for_quiz,
            get_tags_for_question,
            create_quiz_tag,
            delete_quiz_tag,
            add_tag_to_question,
            remove_tag_from_question,
            // Import/Export (file-based)
            import_deck_from_file,
            export_deck_to_json,
            import_quiz_from_file,
            export_quiz_to_json,
            // Quiz commands
            get_all_quizzes,
            get_quiz,
            create_quiz,
            update_quiz,
            delete_quiz,
            // Question commands
            get_questions_for_quiz,
            get_question,
            create_question,
            update_question,
            delete_question,
            reorder_questions,
            update_question_choices,
            // Quiz attempt commands
            start_quiz_attempt,
            submit_quiz_attempt,
            get_quiz_attempt,
            get_quiz_attempts,
            get_quiz_stats,
            // Study session commands
            start_study_session,
            end_study_session,
            get_deck_study_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
