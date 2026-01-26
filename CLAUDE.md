# Kioku Desktop Development Guide

This file serves as a reference for Claude when working on the kioku-desktop project. The goal is to create a desktop version that matches the kioku-web application exactly.

## Reference Codebases

- **Web App**: `C:\Users\Stephen\Dev\Projects\kioku-web`
- **API**: `C:\Users\Stephen\Dev\Projects\kioku-api`

---

## Color Palette (Monokai Pro Theme)

Always use these exact hex colors:

```
Background:
  --background: #2d2a2e        (main dark background)
  --background-light: #403e41  (container/card background)
  --background-lighter: #5b595c (borders, hover states)

Text:
  --foreground: #fcfcfa        (main text)
  --foreground-dim: #939293    (dimmed text, labels, placeholders)

Accents:
  --yellow: #ffd866            (primary action buttons, focus rings)
  --pink: #ff6188              (destructive actions, delete buttons)
  --green: #a9dc76             (study/positive actions)
  --orange: #fc9867            (secondary accent)
  --purple: #ab9df2            (tags)
  --cyan: #78dce8              (links, edit icons, hover states)
```

---

## Key Web App Files to Reference

When implementing features, check these files for the exact styling and behavior:

| Feature | Web File Path |
|---------|---------------|
| Types/Interfaces | `kioku-web/src/types/index.ts` |
| Global CSS/Animations | `kioku-web/src/app/globals.css` |
| Dashboard | `kioku-web/src/app/dashboard/page.tsx` |
| Deck Detail & Cards | `kioku-web/src/app/decks/[id]/page.tsx` |
| Deck Edit | `kioku-web/src/app/decks/[id]/edit/page.tsx` |
| Study Mode | `kioku-web/src/app/decks/[id]/study/page.tsx` |
| Card Editor Component | `kioku-web/src/components/card/CardContentEditor.tsx` |
| Card Display Component | `kioku-web/src/components/card/CardContentDisplay.tsx` |
| Import/Export | `kioku-web/src/components/deck-import-export.tsx` |
| Auth Library | `kioku-web/src/lib/auth.ts` |
| Cards Library | `kioku-web/src/lib/cards.ts` |
| Decks Library | `kioku-web/src/lib/decks.ts` |
| Tags Library | `kioku-web/src/lib/tags.ts` |

---

## API Endpoints Reference

Base URL: Configured per environment (stored in session)

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user (returns JWT)

### Decks
- `GET /api/decks` - List all decks
- `GET /api/decks/{deckId}` - Get deck
- `POST /api/decks` - Create deck
- `PUT /api/decks/{deckId}` - Update deck
- `DELETE /api/decks/{deckId}` - Delete deck (cascades)

### Cards
- `GET /api/decks/{deckId}/cards` - List cards
- `GET /api/decks/{deckId}/cards/{cardId}` - Get card
- `POST /api/decks/{deckId}/cards` - Create card
- `PUT /api/decks/{deckId}/cards/{cardId}` - Update card
- `DELETE /api/decks/{deckId}/cards/{cardId}` - Delete card

### Card-Tag Association
- `POST /api/decks/{deckId}/cards/{cardId}/tags/{tagId}` - Add tag
- `DELETE /api/decks/{deckId}/cards/{cardId}/tags/{tagId}` - Remove tag

### Tags
- `GET /api/decks/{deckId}/tags` - List tags in deck
- `POST /api/decks/{deckId}/tags` - Create tag
- `PUT /api/decks/{deckId}/tags/{tagId}` - Update tag
- `DELETE /api/decks/{deckId}/tags/{tagId}` - Delete tag

### Import/Export
- `POST /api/import/deck` - Import deck with cards & tags
- `GET /api/export/deck/{deckId}` - Export deck as JSON

---

## TypeScript Types

### Content Types
```typescript
type ContentType = 'TEXT' | 'CODE';

type CodeLanguage =
  | 'PLAINTEXT' | 'JAVASCRIPT' | 'TYPESCRIPT' | 'PYTHON'
  | 'JAVA' | 'RUST' | 'GO' | 'CPP' | 'C' | 'CSHARP'
  | 'HTML' | 'CSS' | 'SQL' | 'JSON' | 'XML' | 'YAML'
  | 'BASH' | 'DOCKER' | 'MARKDOWN' | 'REGEX'
  // ... and more (50+ languages)
```

### Core Models
```typescript
interface Deck {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Card {
  id: number;
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

interface Tag {
  id: number;
  name: string;
}
```

---

## UI Patterns

### Buttons
```
Primary Action:    bg-[#ffd866] text-[#2d2a2e] hover:bg-[#ffd866]/90
Study/Positive:    bg-[#a9dc76] text-[#2d2a2e] hover:bg-[#a9dc76]/90
Destructive:       bg-[#ff6188] text-[#2d2a2e] hover:bg-[#ff6188]/90
Secondary:         bg-[#5b595c] text-[#fcfcfa] hover:bg-[#5b595c]/80
Outline:           border border-[#5b595c] text-[#fcfcfa] hover:bg-[#5b595c]/30
```

### Icons
```
Edit icon:         text-[#78dce8] hover:text-[#ffd866]
Delete icon:       text-[#ff6188] hover:text-[#ff6188]/80
```

### Containers
```
Card/Panel:        bg-[#403e41] rounded-xl border border-[#5b595c]
                   (or rounded-2xl for larger cards like study mode)
```

### Inputs
```
bg-[#2d2a2e] border border-[#5b595c] rounded-lg text-[#fcfcfa]
placeholder-[#939293] focus:outline-none focus:border-[#ffd866]
focus:ring-1 focus:ring-[#ffd866]/50
```

### Tags
```
Selected:          bg-[#ab9df2] text-[#2d2a2e]
Unselected:        bg-[#ab9df2]/20 text-[#ab9df2] hover:bg-[#ab9df2]/30
Display only:      bg-[#ab9df2]/20 text-[#ab9df2] (no hover)
```

### Labels
```
text-xs text-[#939293] uppercase tracking-wider
```

---

## CSS Animations (from globals.css)

```css
/* Card flip */
.card-flip { perspective: 1000px; }
.card-flip-inner {
  transition: transform 0.5s ease-out;
  transform-style: preserve-3d;
}
.card-flip-inner.flipped { transform: rotateY(180deg); }
.card-front, .card-back { backface-visibility: hidden; }
.card-back { transform: rotateY(180deg); }

/* Slide animations for card navigation */
@keyframes slideOutLeft {
  from { transform: translateX(0) rotate(0deg); opacity: 1; }
  to { transform: translateX(-120%) rotate(-10deg); opacity: 0; }
}

@keyframes slideOutRight {
  from { transform: translateX(0) rotate(0deg); opacity: 1; }
  to { transform: translateX(120%) rotate(10deg); opacity: 0; }
}

@keyframes slideIn {
  from { transform: translateX(0) scale(0.95); opacity: 0.5; }
  to { transform: translateX(0) scale(1); opacity: 1; }
}

/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## Study Mode Behavior

1. Cards are shuffled on load
2. Click/tap or Space/Enter to flip
3. Arrow keys or swipe to navigate
4. Progress bar at top
5. "Front"/"Back" labels on cards
6. Show notes and tags on back
7. Completion screen when done with "Study Again" option
8. Card slides out left/right with rotation when navigating

---

## Card Row Behavior (Deck View)

1. No click-to-view behavior (clicking card does nothing)
2. Edit icon (cyan) - opens edit modal directly
3. Delete icon (red) - shows inline confirmation, then deletes
4. Shows Front/Back content with code highlighting if CODE type
5. Shows notes preview (1 line)
6. Shows tags as purple pills

---

## Important Notes

- Always check the web app files before implementing new features
- Match colors exactly using hex values, not CSS variables in Tailwind classes
- The desktop app uses Tauri with React, not Next.js
- Use `invoke` from `@tauri-apps/api/core` for backend calls
- Backend is in Rust at `src-tauri/src/`
- Frontend is in `src/` with React Router (not Next.js app router)
