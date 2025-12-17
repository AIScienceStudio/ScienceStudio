# OnlyOffice Integration Design

**Date**: December 17, 2024
**Status**: Approved
**Author**: Andy + Claude

## Overview

ScienceStudio will use OnlyOffice Document Server embedded in VS Code to provide Word-compatible document editing for academic researchers.

## Requirements

| Requirement | Priority | Notes |
|-------------|----------|-------|
| Pixel-perfect .docx compatibility | Must | Journals require Word submission |
| Track changes round-trip | Must | Co-authors edit in Word |
| Equations (LaTeX/MathML) | Must | Academic papers need math |
| Complex tables | Must | Data presentation |
| Section breaks, per-section headers | Must | Thesis/dissertation format |
| Local-first | Should | Privacy, offline work |
| Lightweight | Nice | But compatibility > size |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  VS Code Extension (sciencestudio-core)                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  OnlyOffice WebView (Custom Editor Provider)       │  │
│  │  - Registers for *.docx file extension             │  │
│  │  - Full Word editing experience                    │  │
│  │  - Track changes, equations, tables, etc.          │  │
│  └───────────────────────────────────────────────────┘  │
│                         │                                │
│  ┌──────────────────────┴────────────────────────────┐  │
│  │  OnlyOffice Document Server (Local Docker)         │  │
│  │  - Runs as background container                    │  │
│  │  - Handles document rendering & conversion         │  │
│  │  - Manages collaborative editing sessions          │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. VS Code Custom Editor Provider

```typescript
// src/editor/docxEditorProvider.ts
class DocxEditorProvider implements vscode.CustomEditorProvider {
  // Register for .docx files
  // Create WebView with OnlyOffice iframe
  // Handle save/load through Document Server API
}
```

**Responsibilities:**
- Intercept .docx file opens
- Create WebView with OnlyOffice editor
- Communicate with Document Server via API
- Handle file save/load operations

### 2. OnlyOffice Document Server

**Deployment Options:**

| Option | Pros | Cons |
|--------|------|------|
| Docker container | Easy setup, isolated | Requires Docker |
| Native install | No Docker dependency | Complex install per OS |
| Bundled binary | Self-contained | Large package size |

**Recommended**: Docker container for MVP, bundled binary for distribution.

**Configuration:**
```yaml
# docker-compose.yml
services:
  onlyoffice:
    image: onlyoffice/documentserver
    ports:
      - "8080:80"
    volumes:
      - ./documents:/var/www/onlyoffice/Data
```

### 3. Document API Integration

OnlyOffice uses a JavaScript API for embedding:

```javascript
new DocsAPI.DocEditor("editor-container", {
  document: {
    fileType: "docx",
    key: "unique-doc-key",
    title: "Research Paper.docx",
    url: "http://localhost:8080/docs/paper.docx"
  },
  editorConfig: {
    mode: "edit",
    callbackUrl: "http://localhost:3000/callback",
    user: {
      id: "user-1",
      name: "Researcher"
    }
  }
});
```

### 4. File Flow

```
User opens paper.docx in VS Code
         │
         ▼
Custom Editor Provider activates
         │
         ▼
Copy file to Document Server storage
         │
         ▼
WebView loads OnlyOffice editor
         │
         ▼
User edits document
         │
         ▼
OnlyOffice calls callback URL on save
         │
         ▼
Extension copies file back to original location
```

## Integration with Claude Code

### Architecture: VS Code Extension Bridge

**Decision**: Use VS Code Extension as bridge between OnlyOffice and Claude Code (not a separate OnlyOffice plugin).

**Why this approach:**
- Single brain (Claude Code) for all AI operations
- Full access to MCP servers (library, pdf, citation, docx)
- Consistent context across document + library + chat
- One integration to maintain, not two

```
┌─────────────────────────────────────────────────────────────┐
│  OnlyOffice WebView                                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  User selects text → [Cmd+K] → Inline AI prompt       │  │
│  └──────────────────────────┬────────────────────────────┘  │
│                              │ postMessage                   │
│                              ▼                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  VS Code Extension (Bridge)                           │  │
│  │  - Receives: selection, context, command              │  │
│  │  - Sends to Claude Code                               │  │
│  │  - Returns: AI response → OnlyOffice                  │  │
│  └──────────────────────────┬────────────────────────────┘  │
└──────────────────────────────┼───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  Claude Code (Brain) + MCP Servers                           │
│                                                              │
│  Full research assistant capabilities:                       │
│  - library_search() → find papers in user's library          │
│  - pdf_extract_sections() → get relevant quotes              │
│  - citation_search() → find new papers online                │
│  - Verify claims, suggest citations, improve writing         │
└──────────────────────────────────────────────────────────────┘
```

### Inline AI Assistant

**Trigger**: User selects text in OnlyOffice → presses `Cmd+K` (Mac) / `Ctrl+K` (Windows)

**Available Commands:**

| Command | Description | MCP Tools Used |
|---------|-------------|----------------|
| Refine | Polish writing, fix grammar | - |
| Expand | Elaborate on the point | - |
| Condense | Make more concise | - |
| Add citations | Find supporting papers from library | library_search, pdf_extract |
| Find sources | Search Semantic Scholar for new papers | citation_search |
| Verify claim | Check if claim is supported by sources | library_search, pdf_extract |
| Strengthen | Add evidence + improve reasoning | library_search, citation_search |
| Counter-arguments | Find opposing viewpoints | citation_search |

**UI Flow:**

```
┌─────────────────────────────────────────────┐
│ Selected: "cognitive load affects memory"   │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ What do you want to do?                 │ │
│ │                                         │ │
│ │ [Refine] [Expand] [Add citations]       │ │
│ │ [Find sources] [Verify] [Strengthen]    │ │
│ │                                         │ │
│ │ Or type a custom instruction...         │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
          │
          ▼ (user clicks "Add citations")
┌─────────────────────────────────────────────┐
│ 🔍 Searching your library...                │
│ 📄 Found 3 relevant papers                  │
│ ✅ Adding citations...                      │
├─────────────────────────────────────────────┤
│ "cognitive load affects memory (Sweller,    │
│  1988; Baddeley & Hitch, 1974)"            │
│                                             │
│      [Accept]  [Edit]  [Reject]             │
└─────────────────────────────────────────────┘
```

**Response Streaming:**

Show Claude's work in real-time:
- "🔍 Searching your library..."
- "📄 Found 3 relevant papers"
- "🌐 Checking Semantic Scholar..."
- "✅ Verified: claim supported by 2 sources"

### Message Protocol

**OnlyOffice → VS Code Extension:**

```typescript
interface InlineAIRequest {
  type: 'inline-ai-request';
  selection: string;           // Selected text
  context: {
    before: string;            // 500 chars before selection
    after: string;             // 500 chars after selection
    section: string;           // Current section (Introduction, Methods, etc.)
    documentPath: string;      // Path to .docx file
  };
  command: string;             // 'refine' | 'expand' | 'add-citations' | 'custom'
  customPrompt?: string;       // If command is 'custom'
}
```

**VS Code Extension → OnlyOffice:**

```typescript
interface InlineAIResponse {
  type: 'inline-ai-response';
  status: 'streaming' | 'complete' | 'error';
  progress?: string;           // "Searching library...", etc.
  result?: string;             // Final text to insert
  citations?: Citation[];      // Papers cited (for reference panel)
  error?: string;
}
```

### Basic Workflow (Without Inline AI)

For users who prefer chat-based interaction:

1. User writes in OnlyOffice
2. Opens Claude Code chat panel
3. Asks: "Find evidence for [claim] in my document"
4. Claude uses library-mcp to search papers
5. Claude suggests text with citation
6. User copies into OnlyOffice
7. OnlyOffice maintains formatting

## Licensing

OnlyOffice Document Server is **AGPL-3.0**:
- Free for open source projects ✅
- ScienceStudio is open source ✅
- Commercial use requires paid license or AGPL compliance

**Our approach**: Stay open source, comply with AGPL.

## Implementation Phases

### Phase 1: Basic Integration
- [ ] Set up OnlyOffice Docker container
- [ ] Create Custom Editor Provider
- [ ] Basic WebView embedding
- [ ] File open/save flow

### Phase 2: Inline AI Assistant
- [ ] Implement postMessage bridge (OnlyOffice ↔ Extension)
- [ ] Add Cmd+K keyboard shortcut in OnlyOffice WebView
- [ ] Build inline AI popup UI (command buttons + custom prompt)
- [ ] Connect to Claude Code for AI responses
- [ ] Implement response streaming with progress indicators
- [ ] Add Accept/Edit/Reject buttons for AI suggestions
- [ ] Wire up MCP tools (library_search, citation_search, pdf_extract)

### Phase 3: Enhanced Experience
- [ ] Auto-start Document Server
- [ ] Error handling & status indicators
- [ ] Integration with PDF Library sidebar
- [ ] Citation formatting (APA, MLA, Chicago, etc.)
- [ ] Reference management panel (show cited papers)

### Phase 4: Distribution
- [ ] Bundle Document Server binary
- [ ] One-click installer
- [ ] Auto-update mechanism

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Docker requirement | Friction for non-technical users | Bundle binary for v2 |
| Document Server crashes | Data loss | Auto-save, local backups |
| AGPL license concerns | Legal | Stay open source |
| Large download size | Slow install | Lazy download on first .docx |

## Success Criteria

- [ ] Open .docx → edit → save → open in Word → identical
- [ ] Track changes from Word preserved and editable
- [ ] Equations render correctly
- [ ] Section breaks and headers work
- [ ] < 3 second load time for typical paper

## Alternatives Considered

See `docs/design-choices.md` section on Document Processing Stack for full comparison of ProseMirror, TipTap, LibreOffice, and OnlyOffice.
