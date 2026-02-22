# Kioku Toast Notifications

This document lists all toast notifications in the application that you should see during normal use.

## Success Notifications (Green)

### Deck Operations
| Action | Message | Location |
|--------|---------|----------|
| Save deck | "Deck saved" | DeckEdit (after editing) |
| Delete deck | "Deck deleted" | DeckView |
| Export deck | "Deck exported" | DeckView |
| Import deck | "Imported \"[name]\" with [n] cards" | Dashboard |

### Card Operations
| Action | Message | Location |
|--------|---------|----------|
| Add card | "Card added" | DeckEdit |
| Update card | "Card updated" | DeckEdit |
| Delete card | "Card deleted" | DeckEdit |

### Quiz Operations
| Action | Message | Location |
|--------|---------|----------|
| Save quiz | "Quiz saved" | QuizEditor (after editing) |
| Delete quiz | "Quiz deleted" | QuizView, QuizList |
| Export quiz | "Quiz exported" | QuizView |
| Import quiz | "Imported \"[name]\" with [n] questions" | QuizList |

### Question Operations
| Action | Message | Location |
|--------|---------|----------|
| Add question | "Question added" | QuizEditor |
| Update question | "Question updated" | QuizEditor |
| Delete question | "Question deleted" | QuizEditor |

### User/Settings Operations
| Action | Message | Location |
|--------|---------|----------|
| Update profile | "Profile updated successfully" | Settings |
| Import deck (settings) | "Imported \"[name]\" with [n] cards" | Settings |
| Import quiz (settings) | "Imported \"[name]\" with [n] questions" | Settings |

---

## Error Notifications (Red)

### Deck Operations
| Action | Message | Location |
|--------|---------|----------|
| Load deck | "Failed to load deck" | DeckView, DeckEdit |
| Save deck | "Failed to save deck" | DeckEdit |
| Delete deck | "Failed to delete deck" | DeckView |
| Export deck | "Failed to export deck" | DeckView |
| Import deck | "Import failed" | Dashboard |
| Load decks | "Failed to load decks" | Dashboard (implicit) |

### Card Operations
| Action | Message | Location |
|--------|---------|----------|
| Save card | "Failed to save card" | DeckEdit |
| Delete card | "Failed to delete card" | DeckEdit |
| Add tag | "Failed to add tag" | DeckEdit (CardModal) |
| Create tag | "Failed to create tag" | DeckEdit (CardModal) |
| Remove tag | "Failed to remove tag" | DeckEdit (CardModal) |

### Quiz Operations
| Action | Message | Location |
|--------|---------|----------|
| Load quiz | "Failed to load quiz" | QuizView, QuizEditor, TakeQuiz |
| Save quiz | "Failed to save quiz" | QuizEditor |
| Delete quiz | "Failed to delete quiz" | QuizView, QuizList |
| Export quiz | "Failed to export quiz" | QuizView |
| Import quiz | "Failed to import quiz" | QuizList |
| Load quizzes | "Failed to load quizzes" | QuizList |
| Submit quiz | "Failed to submit quiz" | TakeQuiz |

### Question Operations
| Action | Message | Location |
|--------|---------|----------|
| Save question | "Failed to save question" | QuizEditor |
| Delete question | "Failed to delete question" | QuizEditor |
| Reorder questions | "Failed to reorder questions" | QuizEditor |
| Add tag | "Failed to add tag" | QuizEditor (QuestionModal) |
| Create tag | "Failed to create tag" | QuizEditor (QuestionModal) |
| Remove tag | "Failed to remove tag" | QuizEditor (QuestionModal) |

### Study/Listen Mode
| Action | Message | Location |
|--------|---------|----------|
| Load cards | "Failed to load cards" | StudyMode, ListenMode |
| Start study session | "Failed to start study session" | StudyMode |

### User/Settings Operations
| Action | Message | Location |
|--------|---------|----------|
| Login | "Login failed" | Login |
| Create user | "Failed to create user" | Login |
| Update profile | "Failed to update profile" | Settings |
| Delete account | "Failed to delete account" | Settings |
| Import deck | "Import failed" | Settings |
| Import quiz | "Import failed" | Settings |

---

## How to Test

### Success Notifications (Easy to test)
1. **Deck operations**: Create a deck, edit it, add cards, delete cards, export it
2. **Quiz operations**: Create a quiz, edit it, add questions, delete questions, export it
3. **Import**: Drag and drop a valid JSON file or use the import button

### Error Notifications (Harder to test)
Most error notifications require:
- Network issues (disconnect from backend)
- Database corruption
- Invalid data
- Permission issues

Some ways to potentially trigger errors:
- Try to import an invalid/corrupted JSON file
- Interrupt operations mid-way (close app during save)
- Run out of disk space

---

## Notification Appearance
- **Success**: Green background with checkmark icon
- **Error**: Red background with X icon
- **Duration**: Auto-dismiss after a few seconds
- **Position**: Top-right corner of the screen
