# Kioku Data Schemas

This document defines the JSON schemas for importing decks and quizzes into Kioku Desktop.

---

## Deck Schema

Decks contain flashcards for study mode.

### Structure

```json
{
  "name": "Deck Name",
  "description": "Optional description of the deck",
  "shuffleCards": false,
  "cards": [
    {
      "front": "Question or prompt text",
      "back": "Answer or response text",
      "frontType": "TEXT",
      "backType": "TEXT",
      "frontLanguage": null,
      "backLanguage": null,
      "notes": "Optional notes or hints",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

### Field Definitions

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | - | Name of the deck |
| `description` | string | No | null | Description of the deck's content |
| `shuffleCards` | boolean | No | false | Randomize card order when studying |
| `cards` | array | Yes | - | Array of card objects |

#### Card Object

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `front` | string | Yes | - | Front side content (question/prompt) |
| `back` | string | Yes | - | Back side content (answer) |
| `frontType` | string | No | "TEXT" | Content type: "TEXT" or "CODE" |
| `backType` | string | No | "TEXT" | Content type: "TEXT" or "CODE" |
| `frontLanguage` | string | No | null | Programming language (required if frontType is "CODE") |
| `backLanguage` | string | No | null | Programming language (required if backType is "CODE") |
| `notes` | string | No | null | Additional notes, hints, or context |
| `tags` | array | No | [] | Array of tag names for categorizing the card |

### Supported Languages

When `frontType` or `backType` is "CODE", use one of these language identifiers:

```
PLAINTEXT, JAVASCRIPT, TYPESCRIPT, PYTHON, JAVA, RUST, GO, CPP, C, CSHARP,
HTML, CSS, SQL, JSON, XML, YAML, BASH, DOCKER, MARKDOWN, REGEX, RUBY, PHP,
SWIFT, KOTLIN, SCALA, R, MATLAB, PERL, LUA, HASKELL, ELIXIR, CLOJURE, FSHARP,
OCAML, ERLANG, JULIA, DART, GROOVY, POWERSHELL, VIM, LATEX, GRAPHQL, PRISMA,
TOML, INI, DIFF, MAKEFILE, NGINX, APACHE, OBJECTIVEC, ASSEMBLY, FORTRAN, COBOL
```

### Example: Text-Only Deck

```json
{
  "name": "JavaScript Basics",
  "description": "Fundamental JavaScript concepts",
  "shuffleCards": true,
  "cards": [
    {
      "front": "What is a closure in JavaScript?",
      "back": "A closure is a function that has access to variables from its outer (enclosing) scope, even after the outer function has returned.",
      "notes": "Common interview question",
      "tags": ["functions", "scope", "interview"]
    },
    {
      "front": "What is the difference between let and var?",
      "back": "let is block-scoped and not hoisted, var is function-scoped and hoisted.",
      "tags": ["variables", "scope"]
    }
  ]
}
```

### Example: Code Deck

```json
{
  "name": "Python Syntax",
  "description": "Python code patterns and syntax",
  "shuffleCards": false,
  "cards": [
    {
      "front": "How do you define a list comprehension?",
      "frontType": "TEXT",
      "back": "[expression for item in iterable if condition]",
      "backType": "CODE",
      "backLanguage": "PYTHON",
      "notes": "The 'if condition' part is optional",
      "tags": ["lists", "comprehensions"]
    },
    {
      "front": "for i in range(5):\n    print(i)",
      "frontType": "CODE",
      "frontLanguage": "PYTHON",
      "back": "Prints numbers 0 through 4, each on a new line",
      "backType": "TEXT",
      "tags": ["loops", "range"]
    }
  ]
}
```

---

## Quiz Schema

Quizzes contain questions with graded answers.

### Structure

```json
{
  "name": "Quiz Name",
  "description": "Optional description of the quiz",
  "shuffleQuestions": false,
  "questions": [
    {
      "type": "multiple_choice",
      "content": "Question text or code",
      "contentType": "TEXT",
      "contentLanguage": null,
      "choices": [
        { "text": "Option A", "isCorrect": false },
        { "text": "Option B", "isCorrect": true },
        { "text": "Option C", "isCorrect": false },
        { "text": "Option D", "isCorrect": false }
      ],
      "multipleAnswers": false,
      "explanation": "Optional explanation shown after answering",
      "tags": ["tag1", "tag2"]
    },
    {
      "type": "fill_in_blank",
      "content": "Question with a _____ to fill in",
      "contentType": "TEXT",
      "contentLanguage": null,
      "correctAnswer": "blank",
      "explanation": "Optional explanation",
      "tags": ["tag1"]
    }
  ]
}
```

### Field Definitions

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | - | Name of the quiz |
| `description` | string | No | null | Description of the quiz |
| `shuffleQuestions` | boolean | No | false | Randomize question order when taking quiz |
| `questions` | array | Yes | - | Array of question objects |

#### Question Object (Common Fields)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | string | Yes | - | Question type: "multiple_choice" or "fill_in_blank" |
| `content` | string | Yes | - | The question text or code |
| `contentType` | string | No | "TEXT" | Content type: "TEXT" or "CODE" |
| `contentLanguage` | string | No | null | Programming language (if contentType is "CODE") |
| `explanation` | string | No | null | Explanation shown when reviewing wrong answers |
| `tags` | array | No | [] | Array of tag names for categorizing the question |

#### Multiple Choice Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `choices` | array | Yes | Array of choice objects |
| `multipleAnswers` | boolean | No | If true, UI shows "select all that apply" |

##### Choice Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | Yes | The choice text |
| `isCorrect` | boolean | Yes | Whether this choice is correct |

#### Fill-in-the-Blank Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `correctAnswer` | string | Yes | The exact correct answer (case-sensitive) |

### Example: Multiple Choice Quiz

```json
{
  "name": "JavaScript Quiz",
  "description": "Test your JavaScript knowledge",
  "shuffleQuestions": true,
  "questions": [
    {
      "type": "multiple_choice",
      "content": "Which of the following are falsy values in JavaScript?",
      "contentType": "TEXT",
      "choices": [
        { "text": "0", "isCorrect": true },
        { "text": "\"\"", "isCorrect": true },
        { "text": "[]", "isCorrect": false },
        { "text": "null", "isCorrect": true }
      ],
      "multipleAnswers": true,
      "explanation": "Falsy values are: false, 0, '', null, undefined, NaN. Empty arrays [] are truthy.",
      "tags": ["types", "truthy-falsy"]
    },
    {
      "type": "multiple_choice",
      "content": "What does this return?\n\ntypeof null",
      "contentType": "CODE",
      "contentLanguage": "JAVASCRIPT",
      "choices": [
        { "text": "\"null\"", "isCorrect": false },
        { "text": "\"object\"", "isCorrect": true },
        { "text": "\"undefined\"", "isCorrect": false },
        { "text": "null", "isCorrect": false }
      ],
      "multipleAnswers": false,
      "explanation": "This is a known bug in JavaScript. typeof null returns 'object'.",
      "tags": ["types", "quirks"]
    }
  ]
}
```

### Example: Fill-in-the-Blank Quiz

```json
{
  "name": "Python Syntax Quiz",
  "description": "Fill in the correct Python syntax",
  "shuffleQuestions": false,
  "questions": [
    {
      "type": "fill_in_blank",
      "content": "To create an empty list in Python, use: my_list = _____",
      "contentType": "TEXT",
      "correctAnswer": "[]",
      "explanation": "Empty lists are created with square brackets [] or list()",
      "tags": ["lists", "basics"]
    },
    {
      "type": "fill_in_blank",
      "content": "Complete the function definition:\n\n_____ greet(name):\n    return f\"Hello, {name}!\"",
      "contentType": "CODE",
      "contentLanguage": "PYTHON",
      "correctAnswer": "def",
      "explanation": "Python functions are defined using the 'def' keyword",
      "tags": ["functions", "basics"]
    }
  ]
}
```

### Example: Mixed Quiz

```json
{
  "name": "Rust Fundamentals",
  "description": "Mixed question types about Rust",
  "shuffleQuestions": true,
  "questions": [
    {
      "type": "multiple_choice",
      "content": "Which keyword is used to declare an immutable variable in Rust?",
      "choices": [
        { "text": "let", "isCorrect": true },
        { "text": "var", "isCorrect": false },
        { "text": "const", "isCorrect": false },
        { "text": "mut", "isCorrect": false }
      ],
      "explanation": "'let' declares immutable variables by default. 'let mut' makes them mutable.",
      "tags": ["variables", "basics"]
    },
    {
      "type": "fill_in_blank",
      "content": "fn main() {\n    let x: _____ = 42;\n}",
      "contentType": "CODE",
      "contentLanguage": "RUST",
      "correctAnswer": "i32",
      "explanation": "i32 is the default integer type in Rust",
      "tags": ["types", "integers"]
    },
    {
      "type": "multiple_choice",
      "content": "Which of these are valid Rust string types?",
      "choices": [
        { "text": "String", "isCorrect": true },
        { "text": "&str", "isCorrect": true },
        { "text": "str", "isCorrect": false },
        { "text": "char[]", "isCorrect": false }
      ],
      "multipleAnswers": true,
      "explanation": "String is an owned string, &str is a string slice. 'str' alone is unsized.",
      "tags": ["types", "strings"]
    }
  ]
}
```

---

## Validation Rules

### Deck Validation
- `name` must be non-empty
- `cards` array must have at least 1 card
- Each card must have non-empty `front` and `back`
- If `frontType` is "CODE", `frontLanguage` should be provided
- If `backType` is "CODE", `backLanguage` should be provided

### Quiz Validation
- `name` must be non-empty
- `questions` array must have at least 1 question
- Each question must have non-empty `content`
- Multiple choice questions must have at least 2 choices
- Multiple choice questions must have at least 1 correct answer
- Fill-in-blank questions must have non-empty `correctAnswer`
- If `contentType` is "CODE", `contentLanguage` should be provided

---

## Notes for Content Generation

When generating decks or quizzes:

1. **For coding topics**: Use CODE contentType with appropriate language
2. **For math**: Use TEXT type; special characters render as-is
3. **Keep answers exact**: Fill-in-blank uses exact string matching
4. **Provide explanations**: Help users learn from mistakes
5. **Use multipleAnswers: true**: Only when genuinely multiple correct answers exist
6. **shuffleQuestions/shuffleCards**: Good for practice, disable for sequential learning
7. **Use tags for organization**: Tags help filter cards/questions by topic during study/review
