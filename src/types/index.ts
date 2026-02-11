// ============================================
// Local User Types
// ============================================

export interface LocalUser {
  id: string;
  name: string;
  hasPassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface CreateUserRequest {
  name: string;
  password?: string;
}

// ============================================
// Core Domain Types
// ============================================

export interface Deck {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  cardCount?: number;
}

export interface Card {
  id: string;
  deckId: string;
  front: string;
  frontType: ContentType;
  frontLanguage: CodeLanguage | null;
  back: string;
  backType: ContentType;
  backLanguage: CodeLanguage | null;
  notes: string | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  deckId: string;
  name: string;
}

// ============================================
// Content Types for Cards
// ============================================

export type ContentType = "TEXT" | "CODE";

export type CodeLanguage =
  // Plain text
  | "PLAINTEXT"
  // Web
  | "JAVASCRIPT"
  | "TYPESCRIPT"
  | "HTML"
  | "CSS"
  // Systems
  | "C"
  | "CPP"
  | "RUST"
  | "GO"
  // JVM
  | "JAVA"
  | "KOTLIN"
  | "SCALA"
  // Scripting
  | "PYTHON"
  | "RUBY"
  | "PHP"
  | "PERL"
  // Mobile
  | "SWIFT"
  | "DART"
  // .NET
  | "CSHARP"
  | "FSHARP"
  // Functional
  | "HASKELL"
  | "ELIXIR"
  | "CLOJURE"
  // Data & Query
  | "SQL"
  | "GRAPHQL"
  | "R"
  // Config & Data Formats
  | "JSON"
  | "YAML"
  | "XML"
  | "TOML"
  | "MARKDOWN"
  // Shell
  | "BASH"
  | "POWERSHELL"
  // Other
  | "DOCKER"
  | "REGEX";

// Language display labels for UI
export const CODE_LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  PLAINTEXT: "Plain Text",
  JAVASCRIPT: "JavaScript",
  TYPESCRIPT: "TypeScript",
  HTML: "HTML",
  CSS: "CSS",
  C: "C",
  CPP: "C++",
  RUST: "Rust",
  GO: "Go",
  JAVA: "Java",
  KOTLIN: "Kotlin",
  SCALA: "Scala",
  PYTHON: "Python",
  RUBY: "Ruby",
  PHP: "PHP",
  PERL: "Perl",
  SWIFT: "Swift",
  DART: "Dart",
  CSHARP: "C#",
  FSHARP: "F#",
  HASKELL: "Haskell",
  ELIXIR: "Elixir",
  CLOJURE: "Clojure",
  SQL: "SQL",
  GRAPHQL: "GraphQL",
  R: "R",
  JSON: "JSON",
  YAML: "YAML",
  XML: "XML",
  TOML: "TOML",
  MARKDOWN: "Markdown",
  BASH: "Bash",
  POWERSHELL: "PowerShell",
  DOCKER: "Dockerfile",
  REGEX: "Regex",
};

// All available languages for dropdowns
export const CODE_LANGUAGES: CodeLanguage[] = [
  "PLAINTEXT",
  "JAVASCRIPT",
  "TYPESCRIPT",
  "HTML",
  "CSS",
  "C",
  "CPP",
  "RUST",
  "GO",
  "JAVA",
  "KOTLIN",
  "SCALA",
  "PYTHON",
  "RUBY",
  "PHP",
  "PERL",
  "SWIFT",
  "DART",
  "CSHARP",
  "FSHARP",
  "HASKELL",
  "ELIXIR",
  "CLOJURE",
  "SQL",
  "GRAPHQL",
  "R",
  "JSON",
  "YAML",
  "XML",
  "TOML",
  "MARKDOWN",
  "BASH",
  "POWERSHELL",
  "DOCKER",
  "REGEX",
];

// ============================================
// Listen Mode Types
// ============================================

export type LoopMode = 'none' | 'all' | 'single';
export type ListenPhase = 'idle' | 'front' | 'pause' | 'back' | 'transition';

export interface ListenModeSettings {
  voice: string;
  pauseDuration: number; // seconds (10-30)
  volume: number; // 0-1
  loopMode: LoopMode;
  isShuffled: boolean;
}

export interface TTSVoice {
  id: string;
  name: string;
  locale: string;
  gender: 'Male' | 'Female';
}

// ============================================
// Request/Response Types
// ============================================

export interface CreateDeckRequest {
  name: string;
  description?: string;
}

export interface CreateCardRequest {
  front: string;
  frontType?: ContentType;
  frontLanguage?: CodeLanguage;
  back: string;
  backType?: ContentType;
  backLanguage?: CodeLanguage;
  notes?: string;
}

export interface UpdateCardRequest {
  front: string;
  frontType?: ContentType;
  frontLanguage?: CodeLanguage;
  back: string;
  backType?: ContentType;
  backLanguage?: CodeLanguage;
  notes?: string;
}

// ============================================
// Quiz Types
// ============================================

export type QuestionType = "multiple_choice" | "fill_in_blank";

export interface Quiz {
  id: string;
  name: string;
  description: string | null;
  shuffleQuestions: boolean;
  createdAt: string;
  updatedAt: string;
  questions: Question[];
  questionCount?: number;
}

export interface QuestionTag {
  id: string;
  name: string;
}

export interface QuizTag {
  id: string;
  quizId: string;
  name: string;
}

export interface Question {
  id: string;
  quizId: string;
  questionType: QuestionType;
  content: string;
  contentType: ContentType;
  contentLanguage: CodeLanguage | null;
  correctAnswer: string | null; // For fill_in_blank
  multipleAnswers: boolean; // For multiple_choice
  explanation: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  choices: Choice[];
  tags: QuestionTag[];
}

export interface Choice {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  position: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  questionResults: QuestionResult[];
}

export interface QuestionResult {
  id: string;
  attemptId: string;
  questionId: string;
  userAnswer: string | null;
  isCorrect: boolean;
}

export interface QuizStats {
  quizId: string;
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
  averageDurationSeconds: number | null;
  lastAttemptAt: string | null;
  recentScores: number[]; // Last 5 attempts
}

// ============================================
// Study Session Types
// ============================================

export interface StudySession {
  id: string;
  deckId: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  cardsStudied: number;
}

export interface DeckStudyStats {
  deckId: string;
  totalSessions: number;
  totalStudyTimeSeconds: number;
  totalCardsStudied: number;
  lastStudiedAt: string | null;
}

// ============================================
// Quiz Request Types
// ============================================

export interface CreateQuizRequest {
  name: string;
  description?: string;
  shuffleQuestions?: boolean;
}

export interface UpdateQuizRequest {
  name: string;
  description?: string;
  shuffleQuestions?: boolean;
}

export interface CreateQuestionRequest {
  questionType: QuestionType;
  content: string;
  contentType?: ContentType;
  contentLanguage?: CodeLanguage;
  correctAnswer?: string;
  multipleAnswers?: boolean;
  explanation?: string;
  choices?: CreateChoiceRequest[];
}

export interface UpdateQuestionRequest {
  questionType: QuestionType;
  content: string;
  contentType?: ContentType;
  contentLanguage?: CodeLanguage;
  correctAnswer?: string;
  multipleAnswers?: boolean;
  explanation?: string;
}

export interface CreateChoiceRequest {
  text: string;
  isCorrect: boolean;
}

export interface QuestionAnswer {
  questionId: string;
  answer: string; // Choice IDs (comma-separated) or text for fill_in_blank
}

export interface SubmitQuizRequest {
  answers: QuestionAnswer[];
}

