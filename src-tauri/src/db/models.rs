use serde::{Deserialize, Serialize};

// ============================================
// Deck Models
// ============================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Deck {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub shuffle_cards: bool,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub card_count: Option<i32>,
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
pub struct CardTag {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub deck_id: String,
    pub name: String,
}

// ============================================
// Quiz Models
// ============================================

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QuestionType {
    MultipleChoice,
    FillInBlank,
}

impl QuestionType {
    pub fn from_str(s: &str) -> Self {
        match s {
            "fill_in_blank" => QuestionType::FillInBlank,
            _ => QuestionType::MultipleChoice,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Quiz {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub shuffle_questions: bool,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub questions: Vec<Question>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub question_count: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Question {
    pub id: String,
    pub quiz_id: String,
    pub question_type: QuestionType,
    pub content: String,
    pub content_type: String,
    pub content_language: Option<String>,
    pub correct_answer: Option<String>,
    pub multiple_answers: bool,
    pub explanation: Option<String>,
    pub position: i32,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub choices: Vec<Choice>,
    #[serde(default)]
    pub tags: Vec<QuestionTag>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Choice {
    pub id: String,
    pub question_id: String,
    pub text: String,
    pub is_correct: bool,
    pub position: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuizTag {
    pub id: String,
    pub quiz_id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuestionTag {
    pub id: String,
    pub name: String,
}

// ============================================
// Statistics Models
// ============================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuizAttempt {
    pub id: String,
    pub quiz_id: String,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub duration_seconds: Option<i32>,
    pub total_questions: i32,
    pub correct_answers: i32,
    pub score_percentage: i32,
    #[serde(default)]
    pub question_results: Vec<QuestionResult>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuestionResult {
    pub id: String,
    pub attempt_id: String,
    pub question_id: String,
    pub user_answer: Option<String>,
    pub is_correct: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StudySession {
    pub id: String,
    pub deck_id: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub duration_seconds: Option<i32>,
    pub cards_studied: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuizStats {
    pub quiz_id: String,
    pub total_attempts: i32,
    pub average_score: f64,
    pub best_score: i32,
    pub average_duration_seconds: Option<i32>,
    pub last_attempt_at: Option<String>,
    pub recent_scores: Vec<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DeckStudyStats {
    pub deck_id: String,
    pub total_sessions: i32,
    pub total_study_time_seconds: i32,
    pub total_cards_studied: i32,
    pub last_studied_at: Option<String>,
}

// ============================================
// User Models
// ============================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LocalUser {
    pub id: String,
    pub name: String,
    pub has_password: bool,
    pub avatar: String,
    pub created_at: String,
    pub last_login_at: Option<String>,
}

// ============================================
// Request Types
// ============================================

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDeckRequest {
    pub name: String,
    pub description: Option<String>,
    pub shuffle_cards: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDeckRequest {
    pub name: String,
    pub description: Option<String>,
    pub shuffle_cards: Option<bool>,
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

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateQuizRequest {
    pub name: String,
    pub description: Option<String>,
    pub shuffle_questions: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateQuizRequest {
    pub name: String,
    pub description: Option<String>,
    pub shuffle_questions: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateQuestionRequest {
    pub question_type: String,
    pub content: String,
    pub content_type: Option<String>,
    pub content_language: Option<String>,
    pub correct_answer: Option<String>,
    pub multiple_answers: Option<bool>,
    pub explanation: Option<String>,
    pub choices: Option<Vec<CreateChoiceRequest>>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateQuestionRequest {
    pub question_type: String,
    pub content: String,
    pub content_type: Option<String>,
    pub content_language: Option<String>,
    pub correct_answer: Option<String>,
    pub multiple_answers: Option<bool>,
    pub explanation: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CreateChoiceRequest {
    pub text: String,
    pub is_correct: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitQuizRequest {
    pub answers: Vec<QuestionAnswer>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionAnswer {
    pub question_id: String,
    pub answer: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUserRequest {
    pub name: String,
    pub password: Option<String>,
    pub avatar: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginRequest {
    pub user_id: String,
    pub password: Option<String>,
}
