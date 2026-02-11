import { invoke } from "@tauri-apps/api/core";
import type {
  Deck,
  Card,
  Tag,
  CreateDeckRequest,
  CreateCardRequest,
  UpdateCardRequest,
  // Quiz types
  Quiz,
  Question,
  QuizAttempt,
  QuizStats,
  CreateQuizRequest,
  UpdateQuizRequest,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  CreateChoiceRequest,
  SubmitQuizRequest,
  // Study session types
  StudySession,
  DeckStudyStats,
  // Local user types
  LocalUser,
  CreateUserRequest,
} from "@/types";

// ============================================
// Local User Operations
// ============================================

export async function getAllUsers(): Promise<LocalUser[]> {
  return invoke<LocalUser[]>("get_all_users");
}

export async function getUser(userId: string): Promise<LocalUser> {
  return invoke<LocalUser>("get_user", { userId });
}

export async function createUser(request: CreateUserRequest): Promise<LocalUser> {
  return invoke<LocalUser>("create_user", { request });
}

export async function loginUser(userId: string, password?: string): Promise<LocalUser> {
  return invoke<LocalUser>("login_user", { userId, password });
}

export async function getActiveUser(): Promise<LocalUser | null> {
  return invoke<LocalUser | null>("get_active_user");
}

export async function logoutUser(): Promise<void> {
  return invoke("logout_user");
}

export async function deleteUser(userId: string): Promise<void> {
  return invoke("delete_user", { userId });
}

export async function updateUser(userId: string, name: string, password?: string): Promise<LocalUser> {
  return invoke<LocalUser>("update_user", { userId, name, password });
}

export async function removeUserPassword(userId: string): Promise<LocalUser> {
  return invoke<LocalUser>("remove_user_password", { userId });
}

// ============================================
// Deck Operations
// ============================================

export async function getAllDecks(): Promise<Deck[]> {
  return invoke<Deck[]>("get_all_decks");
}

export async function getDeck(id: string): Promise<Deck | null> {
  return invoke<Deck | null>("get_deck", { id });
}

export async function createDeck(request: CreateDeckRequest): Promise<Deck> {
  return invoke<Deck>("create_deck", { request });
}

export async function updateDeck(
  id: string,
  request: CreateDeckRequest
): Promise<Deck> {
  return invoke<Deck>("update_deck", { id, request });
}

export async function deleteDeck(id: string): Promise<void> {
  return invoke("delete_deck", { id });
}

// ============================================
// Card Operations
// ============================================

// Card tag type from API
interface CardTagResponse {
  id: string;
  name: string;
}

// Card response type from API
interface CardResponse {
  id: string;
  deckId: string;
  front: string;
  frontType: string;
  frontLanguage: string | null;
  back: string;
  backType: string;
  backLanguage: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  tags: CardTagResponse[];
}

export async function getCardsForDeck(deckId: string): Promise<Card[]> {
  const cards = await invoke<CardResponse[]>("get_cards_for_deck", {
    deckId,
  });

  // Transform card tags to full Tag format
  return cards.map((card) => ({
    ...card,
    tags: card.tags.map((t) => ({
      id: t.id,
      deckId: deckId,
      name: t.name,
    })),
  })) as Card[];
}

export async function getCard(id: string, deckId?: string): Promise<Card | null> {
  const card = await invoke<CardResponse | null>("get_card", { id });
  if (!card) return null;

  return {
    ...card,
    tags: card.tags.map((t) => ({
      id: t.id,
      deckId: deckId || card.deckId,
      name: t.name,
    })),
  } as Card;
}

export async function createCard(
  deckId: string,
  request: CreateCardRequest
): Promise<Card> {
  const card = await invoke<CardResponse>("create_card", {
    deckId,
    request,
  });
  return {
    ...card,
    tags: card.tags?.map((t) => ({
      id: t.id,
      deckId: deckId,
      name: t.name,
    })) || [],
  } as Card;
}

export async function updateCard(
  id: string,
  deckId: string,
  request: UpdateCardRequest
): Promise<Card> {
  const card = await invoke<CardResponse>("update_card", {
    id,
    deckId,
    request,
  });
  return {
    ...card,
    tags: card.tags?.map((t) => ({
      id: t.id,
      deckId: deckId,
      name: t.name,
    })) || [],
  } as Card;
}

export async function deleteCard(id: string, deckId: string): Promise<void> {
  return invoke("delete_card", { id, deckId });
}

// ============================================
// Tag Operations
// ============================================

export async function getTagsForDeck(deckId: string): Promise<Tag[]> {
  return invoke<Tag[]>("get_tags_for_deck", { deckId });
}

export async function createTag(deckId: string, name: string): Promise<Tag> {
  return invoke<Tag>("create_tag", { deckId, name });
}

export async function deleteTag(deckId: string, id: string): Promise<void> {
  return invoke("delete_tag", { deckId, id });
}

export async function addTagToCard(
  deckId: string,
  cardId: string,
  tagId: string
): Promise<void> {
  return invoke("add_tag_to_card", { deckId, cardId, tagId });
}

export async function removeTagFromCard(
  deckId: string,
  cardId: string,
  tagId: string
): Promise<void> {
  return invoke("remove_tag_from_card", { deckId, cardId, tagId });
}

// ============================================
// Quiz Tag Operations
// ============================================

export interface QuizTag {
  id: string;
  quizId: string;
  name: string;
}

export interface QuestionTag {
  id: string;
  name: string;
}

export async function getTagsForQuiz(quizId: string): Promise<QuizTag[]> {
  return invoke<QuizTag[]>("get_tags_for_quiz", { quizId });
}

export async function getTagsForQuestion(questionId: string): Promise<QuestionTag[]> {
  return invoke<QuestionTag[]>("get_tags_for_question", { questionId });
}

export async function createQuizTag(quizId: string, name: string): Promise<QuizTag> {
  return invoke<QuizTag>("create_quiz_tag", { quizId, name });
}

export async function deleteQuizTag(quizId: string, tagId: string): Promise<void> {
  return invoke("delete_quiz_tag", { quizId, tagId });
}

export async function addTagToQuestion(
  questionId: string,
  tagId: string
): Promise<void> {
  return invoke("add_tag_to_question", { questionId, tagId });
}

export async function removeTagFromQuestion(
  questionId: string,
  tagId: string
): Promise<void> {
  return invoke("remove_tag_from_question", { questionId, tagId });
}

// ============================================
// Import/Export Operations
// ============================================

export interface ImportResult {
  deck: Deck;
  cardsImported: number;
}

export interface DeckExport {
  name: string;
  description: string | null;
  cards: CardExport[];
  exportedAt: string;
}

export interface CardExport {
  front: string;
  back: string;
  frontType: string;
  backType: string;
  frontLanguage: string | null;
  backLanguage: string | null;
  notes: string | null;
}

export async function importDeck(filePath: string): Promise<ImportResult> {
  return invoke<ImportResult>("import_deck_from_file", { filePath });
}

export async function exportDeck(deckId: string): Promise<string> {
  return invoke<string>("export_deck_to_json", { deckId });
}


// ============================================
// Quiz Import
// ============================================

export interface QuizImportResult {
  quiz: Quiz;
  questionsImported: number;
}

export async function importQuiz(filePath: string): Promise<QuizImportResult> {
  return invoke<QuizImportResult>("import_quiz_from_file", { filePath });
}

// ============================================
// Quiz Operations
// ============================================

export async function getAllQuizzes(): Promise<Quiz[]> {
  return invoke<Quiz[]>("get_all_quizzes");
}

export async function getQuiz(quizId: string): Promise<Quiz> {
  return invoke<Quiz>("get_quiz", { quizId });
}

export async function createQuiz(request: CreateQuizRequest): Promise<Quiz> {
  return invoke<Quiz>("create_quiz", { request });
}

export async function updateQuiz(
  quizId: string,
  request: UpdateQuizRequest
): Promise<Quiz> {
  return invoke<Quiz>("update_quiz", { quizId, request });
}

export async function deleteQuiz(quizId: string): Promise<void> {
  return invoke("delete_quiz", { quizId });
}

// ============================================
// Question Operations
// ============================================

export async function getQuestionsForQuiz(quizId: string): Promise<Question[]> {
  return invoke<Question[]>("get_questions_for_quiz", { quizId });
}

export async function getQuestion(questionId: string): Promise<Question> {
  return invoke<Question>("get_question", { questionId });
}

export async function createQuestion(
  quizId: string,
  request: CreateQuestionRequest
): Promise<Question> {
  return invoke<Question>("create_question", { quizId, request });
}

export async function updateQuestion(
  questionId: string,
  request: UpdateQuestionRequest
): Promise<Question> {
  return invoke<Question>("update_question", { questionId, request });
}

export async function deleteQuestion(questionId: string): Promise<void> {
  return invoke("delete_question", { questionId });
}

export async function reorderQuestions(
  quizId: string,
  questionIds: string[]
): Promise<void> {
  return invoke("reorder_questions", { quizId, questionIds });
}

export async function updateQuestionChoices(
  questionId: string,
  choices: CreateChoiceRequest[]
): Promise<void> {
  return invoke("update_question_choices", { questionId, choices });
}

// ============================================
// Quiz Attempt Operations
// ============================================

export async function startQuizAttempt(quizId: string): Promise<QuizAttempt> {
  return invoke<QuizAttempt>("start_quiz_attempt", { quizId });
}

export async function submitQuizAttempt(
  attemptId: string,
  request: SubmitQuizRequest
): Promise<QuizAttempt> {
  return invoke<QuizAttempt>("submit_quiz_attempt", { attemptId, request });
}

export async function getQuizAttempt(attemptId: string): Promise<QuizAttempt> {
  return invoke<QuizAttempt>("get_quiz_attempt", { attemptId });
}

export async function getQuizAttempts(quizId: string): Promise<QuizAttempt[]> {
  return invoke<QuizAttempt[]>("get_quiz_attempts", { quizId });
}

export async function getQuizStats(quizId: string): Promise<QuizStats> {
  return invoke<QuizStats>("get_quiz_stats", { quizId });
}

// ============================================
// Study Session Operations
// ============================================

export async function startStudySession(deckId: string): Promise<StudySession> {
  return invoke<StudySession>("start_study_session", { deckId });
}

export async function endStudySession(
  sessionId: string,
  cardsStudied: number
): Promise<StudySession> {
  return invoke<StudySession>("end_study_session", { sessionId, cardsStudied });
}

export async function getDeckStudyStats(deckId: string): Promise<DeckStudyStats> {
  return invoke<DeckStudyStats>("get_deck_study_stats", { deckId });
}
