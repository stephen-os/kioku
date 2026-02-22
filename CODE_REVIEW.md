# Code Review Report - Kioku Desktop

**Date:** 2026-02-22
**Reviewer:** Claude Code

---

## CRITICAL ISSUES (2)

### 1. Race Condition in StudyMode Session Tracking
**File:** `src/pages/StudyMode.tsx` (lines 56-57, 127-138, 141-152)
**Status:** [ ] Not Fixed

**Issue:** Session tracking uses ref-based state that may not properly sync with React state. The `sessionIdRef` is initialized after study starts, but there's a potential race condition where `studyStarted` changes before session ID is set.

```typescript
if (studyStarted && id && cards.length > 0 && !sessionIdRef.current) {
  startStudySession(id)
    .then((session) => {
      sessionIdRef.current = session.id;
      cardsViewedRef.current = new Set([0]);
    })
}
```

**Risk:** Session may not end properly if component unmounts before sessionId is assigned.

**Fix:** Use proper async/await with cleanup in useEffect, or add a mounted ref check.

---

### 2. Duplicate Stats Section in DeckView
**File:** `src/pages/DeckView.tsx` (lines 360-390 AND 442-472)
**Status:** [ ] Not Fixed

**Issue:** Stats section is rendered **twice** with identical code - this is dead code from copy-paste error.

**Fix:** Remove one of the duplicate stats sections.

---

## HIGH PRIORITY BUGS (3)

### 1. Unhandled Promise in TakeQuiz Navigation
**File:** `src/pages/TakeQuiz.tsx` (lines 89-106)
**Status:** [ ] Not Fixed

**Issue:** After submitting quiz, navigation occurs but if the submit request fails, `submitting` is set to false, but the user may already be viewing the results page if navigation succeeded before error handling.

**Fix:** Only navigate after confirmed successful submission.

---

### 2. Double Filtering in StudyMode
**File:** `src/pages/StudyMode.tsx` (lines 59-123)
**Status:** [ ] Not Fixed

**Issue:** URL filters are applied during initial load (lines 74-107), but then `handleStartStudy()` at line 183-189 re-applies filtering with in-memory state (`selectedTagFilters`). This can cause double-filtering or state inconsistency.

**Fix:** Consolidate filtering to one location.

---

### 3. No Unsaved Changes Warning in DeckEdit
**File:** `src/pages/DeckEdit.tsx`
**Status:** [ ] Not Fixed

**Issue:** No warning when user navigates away with unsaved changes. Cards can be edited and lost without confirmation.

**Fix:** Add `beforeunload` event listener and/or React Router blocker.

---

## MEDIUM PRIORITY (8)

### 1. Error Swallowed in get_deck
**File:** `src-tauri/src/lib.rs` (lines 115-120)
**Status:** [ ] Not Fixed

```rust
match db::get_deck(&conn, &id) {
    Ok(deck) => Ok(Some(deck)),
    Err(_) => Ok(None),  // Errors swallowed!
}
```

**Issue:** Errors are silently converted to None, making it impossible to distinguish "not found" from "database error".

**Fix:** Return proper Result with error types.

---

### 2. No File Size Validation on Import
**File:** `src-tauri/src/lib.rs` (lines 307-400)
**Status:** [ ] Not Fixed

**Issue:** File is read without size validation - could cause memory issues with very large JSON files. No validation of JSON structure before parsing.

**Fix:** Add file size check before reading, validate JSON schema.

---

### 3. Missing Toast on QuizResults Load Error
**File:** `src/pages/QuizResults.tsx` (lines 16-33)
**Status:** [ ] Not Fixed

**Issue:** Quiz loading error is caught but only logs to console. User gets no feedback that data failed to load.

**Fix:** Add `toast.error()` in catch block.

---

### 4. CodeEditor Language Fallbacks Incorrect
**File:** `src/components/CodeEditor.tsx` (lines 88-99)
**Status:** [ ] Not Fixed

**Issues:**
- C# uses Java highlighter (line 89) - poor match
- R uses Python (line 94) - poor match
- DART uses Swift (line 72) - incorrect grouping

**Fix:** Add proper language support or better fallbacks.

---

### 5. localStorage Access Without Try-Catch
**File:** `src/hooks/useListenMode.ts` (lines 14-30)
**Status:** [ ] Not Fixed

**Issue:** `localStorage` accessed without error handling, could fail in incognito mode.

**Fix:** Wrap in try-catch.

---

### 6. No Transaction Support in Import
**File:** `src-tauri/src/lib.rs` (lines 365-393)
**Status:** [ ] Not Fixed

**Issue:** Creating deck, then multiple cards in loop. If any card fails mid-import, deck exists with partial data.

**Fix:** Wrap import in database transaction.

---

### 7. Answer State Not Reset in TakeQuiz
**File:** `src/pages/TakeQuiz.tsx` (lines 14-19, 54-71)
**Status:** [ ] Not Fixed

**Issue:** If user navigates to TakeQuiz, answers state persists if component remounts.

**Fix:** Reset state on mount or add quiz ID to dependency.

---

### 8. Toast Timeouts Not Cleaned Up
**File:** `src/context/ToastContext.tsx` (lines 33-48)
**Status:** [ ] Not Fixed

**Issue:** If a toast with duration > 0 is created but the component unmounts before the timeout fires, the timeout persists.

**Fix:** Store timeout IDs and clear on unmount.

---

## PERFORMANCE ISSUES (3)

### 1. Excessive Re-renders in DeckView
**File:** `src/pages/DeckView.tsx` (lines 148-177)
**Status:** [ ] Not Fixed

**Issue:** `filteredCards` recalculated on every search keystroke. Fine for small decks, poor for large ones.

**Fix:** Add debouncing to search input.

---

### 2. Event Listener Churn in StudyMode
**File:** `src/pages/StudyMode.tsx` (lines 280-306)
**Status:** [ ] Not Fixed

**Issue:** Keyboard event listener added/removed every render due to changing useCallback dependencies.

**Fix:** Memoize callbacks properly or use refs for handlers.

---

### 3. Event Listener Cleanup in StudyMode
**File:** `src/pages/StudyMode.tsx`
**Status:** [ ] Not Fixed

**Issue:** Event listeners may not be properly cleaned up on unmount.

**Fix:** Verify cleanup in useEffect return.

---

## TYPE SAFETY ISSUES (3)

### 1. Unsafe Type Cast
**File:** `src/pages/StudyMode.tsx` (line 29)
**Status:** [ ] Not Fixed

```typescript
const urlTagMode = (searchParams.get("tagMode") as FilterLogic) || "any";
```

**Issue:** Allows invalid values silently.

**Fix:** Validate value before casting.

---

### 2. Mixed Null Checks
**File:** `src/pages/DeckView.tsx` (line 724)
**Status:** [ ] Not Fixed

```typescript
{card.tags && card.tags.length > 0 && (
```

**Fix:** Use optional chaining: `card.tags?.length > 0`

---

### 3. Missing Return Types
**File:** `src/pages/Dashboard.tsx` (line 56)
**Status:** [ ] Not Fixed

**Issue:** Callback missing explicit `Promise<void>` return type.

**Fix:** Add explicit return type annotations.

---

## CODE STYLE INCONSISTENCIES

### 1. Inconsistent Error Messages
**Status:** [ ] Not Fixed

- Some use generic "Failed to X": Dashboard.tsx, DeckView.tsx
- Some use detailed error.message: TakeQuiz.tsx
- Some use string concatenation: StudyMode

**Fix:** Create error handling utility, standardize pattern.

---

### 2. Mixed Console Logging Patterns
**Status:** [ ] Not Fixed

- `src/lib/tts.ts` uses `[TTS]` prefix
- `src/hooks/useListenMode.ts` uses `[ListenMode]` prefix
- Other files have no prefix

**Fix:** Use consistent logging strategy or remove debug logs in production.

---

### 3. Magic Numbers
**File:** `src/pages/StudyMode.tsx`
**Status:** [ ] Not Fixed

```typescript
setTimeout(() => { ... }, 280);  // Why 280ms?
```

**Fix:** Extract to named constants with comments.

---

## SUMMARY

| Severity | Count | Fixed |
|----------|-------|-------|
| Critical | 2 | 0 |
| High | 3 | 0 |
| Medium | 8 | 0 |
| Performance | 3 | 0 |
| Type Safety | 3 | 0 |
| Style | 3 | 0 |
| **Total** | **22** | **0** |

---

## RECOMMENDED FIX ORDER

1. [ ] Remove duplicate stats section in DeckView (easy win)
2. [ ] Fix race condition in StudyMode session tracking
3. [ ] Fix `get_deck` error handling in Rust backend
4. [ ] Add unsaved changes warning in DeckEdit
5. [ ] Add toast for QuizResults load error
6. [ ] Add file size validation for imports
7. [ ] Fix type safety issues
8. [ ] Address performance issues
9. [ ] Standardize error handling patterns
