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
  serverId: number | null;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface Card {
  id: string;
  serverId: number | null;
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
  syncStatus: SyncStatus;
}

export interface Tag {
  id: string;
  serverId: number | null;
  deckId: string;
  name: string;
  syncStatus: SyncStatus;
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
// Sync Types
// ============================================

export type SyncStatus = "synced" | "pending" | "conflict";

export interface SyncQueueItem {
  id: number;
  entityType: "deck" | "card" | "tag";
  entityId: string;
  operation: "create" | "update" | "delete";
  payload: string;
  createdAt: string;
}
