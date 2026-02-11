# Kioku Desktop Roadmap

## Current State (v0.1.0)

### Completed Features

**Core Flashcard System:**
- Deck management (create, edit, delete)
- Card management with text and code content types
- 50+ programming language syntax highlighting
- Tag system for organizing cards
- Study mode with card flipping and navigation
- Listen mode with text-to-speech

**Local Storage:**
- SQLite database for offline-first storage
- Import/export decks as JSON files

**Sync Infrastructure (Deprioritized):**
- Local-first architecture with sync metadata
- Sync status tracking (local_only, synced, pending_sync, conflict)
- Conflict resolution UI
- Auto-sync on login
- *Note: Remote API currently offline; sync features on hold*

**UI/UX:**
- Monokai Pro dark theme
- Responsive layout
- Connection status indicator
- Progress tracking in study mode

---

## Planned Features

### Phase 1: Testing & Quality Assurance

**Unit Testing Framework:**
- [ ] Set up Vitest for React components
- [ ] Set up Rust unit tests for backend logic
- [ ] Test coverage for core CRUD operations
- [ ] Test coverage for quiz grading logic

---

### Phase 2: Quiz System

**Quiz Data Model:**
- [ ] SQLite schema for quizzes, questions, and attempts
- [ ] Question types: multiple choice, fill-in-the-blank
- [ ] Support for text and code content (like cards)
- [ ] Multiple correct answers support
- [ ] Question randomization option per quiz

**Quiz CRUD:**
- [ ] Create, read, update, delete quizzes
- [ ] Add/remove/reorder questions
- [ ] Import quizzes from JSON
- [ ] Export quizzes to JSON

**Quiz Editor UI:**
- [ ] Quiz creation/editing page
- [ ] Question editor with type selection
- [ ] Multiple choice answer management
- [ ] Fill-in-the-blank input
- [ ] Code editor integration for code questions
- [ ] Preview mode

**Quiz Taking UI:**
- [ ] Quiz session page
- [ ] Question navigation
- [ ] Answer selection/input
- [ ] "Multiple answers may apply" indicator
- [ ] Submit and grade
- [ ] Results summary with percentage
- [ ] Review wrong answers with correct answers shown

---

### Phase 3: Statistics System

**Study Time Tracking:**
- [ ] Track time spent in deck study mode
- [ ] Session start/end timestamps
- [ ] Cumulative study time per deck
- [ ] Study session history

**Quiz Statistics:**
- [ ] Store every quiz attempt with:
  - Timestamp
  - Duration (time to complete)
  - Score (correct/total)
  - Individual question results
- [ ] Calculate aggregates:
  - Average score (all time)
  - Average of last N attempts
  - Best score
  - Most recent scores
  - Total attempts
  - Average completion time

**Statistics Dashboard:**
- [ ] Deck stats view (study time, sessions)
- [ ] Quiz stats view (attempts, scores, trends)
- [ ] Visual charts/graphs (optional)
- [ ] Per-question analysis (which questions missed most)

---

### Phase 4: Polish & Enhancements

**UI Improvements:**
- [ ] Dashboard stats summary
- [ ] Quick actions menu
- [ ] Keyboard shortcuts guide
- [ ] Onboarding flow for new users

**Data Management:**
- [ ] Bulk import/export (multiple decks/quizzes)
- [ ] Data backup/restore
- [ ] Clear statistics option

**Future Considerations:**
- [ ] Spaced repetition algorithm for study mode
- [ ] Custom themes
- [ ] Plugin system
- [ ] Re-enable remote sync when API is ready

---

## Technical Debt

- [ ] Remove unused Remote* structs from db.rs and sync.rs
- [ ] Add proper error handling UI (toast notifications)
- [ ] Reduce bundle size (code splitting)
- [ ] Add loading states to all async operations

---

## File Structure Reference

```
kioku-desktop/
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── context/            # React context providers
│   ├── lib/                # Utility functions, API calls
│   ├── pages/              # Route pages
│   └── types/              # TypeScript type definitions
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── lib.rs          # Tauri commands
│   │   ├── local_db.rs     # SQLite operations
│   │   ├── sync.rs         # Sync logic (deprioritized)
│   │   └── auth.rs         # Authentication
│   └── migrations/         # SQLite schema migrations
├── CLAUDE.md               # Development guide for Claude
├── ROADMAP.md              # This file
└── SCHEMA.md               # JSON schema documentation
```
