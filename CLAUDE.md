# Kioku Desktop - Development Guide

## Overview

Kioku Desktop is a flashcard study application built with Tauri 2, React, and TypeScript. It provides offline-first functionality with local SQLite storage and optional sync to the Kioku API server.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Desktop Framework**: Tauri 2 (Rust)
- **Styling**: Tailwind CSS v4 (Monokai Pro theme)
- **Local Database**: SQLite via `tauri-plugin-sql`
- **Routing**: React Router v7

## Project Structure

```
kioku-desktop/
├── src/                      # React frontend
│   ├── components/           # Reusable UI components
│   ├── pages/               # Route pages
│   ├── lib/                 # Business logic & Tauri commands
│   └── types/               # TypeScript interfaces
├── src-tauri/               # Rust backend
│   ├── src/
│   │   ├── main.rs          # Entry point
│   │   ├── lib.rs           # Tauri setup & commands
│   │   └── db.rs            # Database operations
│   ├── Cargo.toml           # Rust dependencies
│   └── tauri.conf.json      # Tauri configuration
├── public/                  # Static assets
└── package.json             # Node dependencies
```

## Commands

```bash
# Install dependencies
npm install

# Start development (frontend only)
npm run dev

# Start Tauri development (full desktop app)
npm run tauri:dev

# Build for production
npm run tauri:build
```

## Database Schema

The SQLite database (`kioku.db`) contains:

- `decks` - Flashcard decks
- `cards` - Individual flashcards
- `tags` - Tags for organizing cards
- `card_tags` - Many-to-many relationship
- `sync_queue` - Pending changes for sync
- `settings` - App configuration

## Key Patterns

### Tauri Commands

Frontend calls Rust functions via `invoke()`:

```typescript
import { invoke } from "@tauri-apps/api/core";
const decks = await invoke<Deck[]>("get_all_decks");
```

### Offline-First

- All data stored locally in SQLite
- `sync_status` field tracks sync state: `synced`, `pending`, `conflict`
- Changes queued in `sync_queue` when offline
- Sync service pushes/pulls when online

### Styling

Uses Tailwind CSS with custom Monokai Pro theme:

- `--background`: #2d2a2e (dark)
- `--yellow`: #ffd866 (primary)
- `--pink`: #ff6188 (error)
- `--green`: #a9dc76 (success)
- `--cyan`: #78dce8 (links)
- `--purple`: #ab9df2 (tags)

## Related Projects

- `kioku-api` - Spring Boot backend server
- `kioku-web` - Next.js web frontend
