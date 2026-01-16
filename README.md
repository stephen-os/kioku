# Kioku Desktop

A desktop flashcard study application with offline support, built with Tauri and React.

## Features

- **Offline-First**: Study your flashcards without an internet connection
- **Local Storage**: All data stored securely on your device using SQLite
- **Sync Support**: Optionally sync with Kioku API server when online
- **Code Cards**: Support for code snippets with syntax highlighting (30+ languages)
- **Tags**: Organize cards with tags and filter during study
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Prerequisites

- [Node.js](https://nodejs.org/) (v20 or later)
- [Rust](https://rustup.rs/) (latest stable)
- Platform-specific dependencies for Tauri:
  - **Windows**: Microsoft Visual Studio C++ Build Tools
  - **macOS**: Xcode Command Line Tools
  - **Linux**: See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

## Installation

```bash
# Clone the repository
git clone https://github.com/stephen-os/kioku-desktop.git
cd kioku-desktop

# Install dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

## Development

```bash
# Start frontend only (for rapid UI development)
npm run dev

# Start full Tauri app
npm run tauri:dev
```

## Project Structure

```
├── src/                 # React frontend
│   ├── components/      # UI components
│   ├── pages/          # Route pages
│   ├── lib/            # Tauri command wrappers
│   └── types/          # TypeScript definitions
├── src-tauri/          # Rust/Tauri backend
│   └── src/            # Rust source files
└── public/             # Static assets
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **Desktop**: Tauri 2 (Rust)
- **Database**: SQLite (via tauri-plugin-sql)
- **Routing**: React Router v7

## Related Projects

- [kioku-api](https://github.com/stephen-os/kioku-api) - Backend API server
- [kioku-web](https://github.com/stephen-os/kioku-web) - Web application

## License

ISC
