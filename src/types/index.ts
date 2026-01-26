// ============================================
// Session (Remote-first auth)
// ============================================

export interface Session {
  userId: number;
  email: string;
  token: string;
  apiUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  apiUrl: string;
}

// Default API URL (can be changed on login screen)
export const DEFAULT_API_URL = "https://kioku-api-production.up.railway.app/api";

// ============================================
// Core Domain Types
// ============================================

export interface Deck {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
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

