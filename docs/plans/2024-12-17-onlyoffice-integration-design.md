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

OnlyOffice handles editing. Claude Code (via MCP servers) handles research:

```
┌─────────────────┐     ┌─────────────────┐
│  OnlyOffice     │     │  Claude Code    │
│  (Editing)      │     │  (Research)     │
│                 │     │                 │
│  - Write text   │     │  - Find papers  │
│  - Format       │     │  - Verify cites │
│  - Track changes│     │  - Suggest text │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │  .docx file │
              │  (on disk)  │
              └─────────────┘
```

**Workflow:**
1. User writes in OnlyOffice
2. Asks Claude: "Find evidence for [claim]"
3. Claude uses library-mcp to search papers
4. Claude suggests text with citation
5. User pastes into OnlyOffice
6. OnlyOffice maintains formatting

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

### Phase 2: Enhanced Experience
- [ ] Auto-start Document Server
- [ ] Error handling & status indicators
- [ ] Integration with PDF Library sidebar
- [ ] Citation insertion from Claude

### Phase 3: Distribution
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
