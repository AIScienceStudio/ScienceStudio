# ScienceStudio Development Plan & Tasks

## 🧠 Architecture: Claude Code as Brain

```
┌─────────────────────────────────────────────────────┐
│  ScienceStudio UI Layer                             │
│  ├── VS Code Extension                              │
│  │   ├── OnlyOffice WebView for .docx editing       │
│  │   ├── PDF Library view                           │
│  │   └── Focus Mode (hides complexity)              │
│  └── Claude Code Integration                        │
│      └── Chat interface for research tasks          │
├─────────────────────────────────────────────────────┤
│  OnlyOffice Document Server (Local Docker)          │
│  └── Full Word compatibility, track changes, eqns   │
└─────────────────────┬───────────────────────────────┘
                      │ MCP Protocol
                      ▼
┌─────────────────────────────────────────────────────┐
│  MCP Servers (Research Tools for Claude)            │
│  ├── pdf-mcp: Semantic PDF extraction               │
│  ├── citation-mcp: Paper lookup & verification      │
│  ├── library-mcp: Vector search over papers         │
│  └── docx-mcp: Word document manipulation           │
└─────────────────────────────────────────────────────┘
```

**Key Insight**: We don't build an agent - Claude Code IS the agent. We build research tools (MCP servers) that give Claude research superpowers.

**Editor Choice**: OnlyOffice for pixel-perfect Word compatibility (track changes, equations, sections). See `docs/plans/2024-12-17-onlyoffice-integration-design.md`.

---

## 🏗️ Repository Structure

```
AIScienceStudio/
├── ScienceStudio/                    # Main project repo
│   ├── docs/                         # Documentation
│   ├── plan/                         # Planning documents
│   │   └── tasks.md                  # This file
│   ├── extensions/                   # VS Code extensions
│   │   └── sciencestudio-core/       # Main extension (UI layer)
│   └── mcp-servers/                  # MCP servers (NEW)
│       ├── pdf-mcp/                  # PDF processing
│       ├── citation-mcp/             # Citation lookup
│       ├── library-mcp/              # Vector search
│       └── docx-mcp/                 # Word document handling
│
└── vscode/                           # VS Code fork (optional branding)
```

---

## 📋 Phase 1: MCP Server Foundation

### Task 1.1: Create MCP Server Structure ⬜
```bash
mkdir -p mcp-servers/{pdf-mcp,citation-mcp,library-mcp,docx-mcp}
```

### Task 1.2: pdf-mcp Server ⬜
**Purpose**: Extract semantic content from PDFs

**Tools to expose**:
- `pdf_extract_text(path)` - Full text extraction
- `pdf_extract_sections(path)` - Get Abstract, Methods, Results, etc.
- `pdf_extract_figures(path)` - Get figures with captions
- `pdf_extract_tables(path)` - Get tables as structured data
- `pdf_extract_citations(path)` - Get reference list
- `pdf_get_metadata(path)` - Title, authors, DOI, etc.

**Tech Stack**:
- Python 3.12
- PyMuPDF (fitz) for PDF parsing
- LlamaParse for semantic extraction (optional, API-based)

### Task 1.3: citation-mcp Server ⬜
**Purpose**: Look up and verify academic citations

**Tools to expose**:
- `citation_search(query)` - Search Semantic Scholar
- `citation_lookup_doi(doi)` - Get paper by DOI
- `citation_get_bibtex(doi)` - Get BibTeX entry
- `citation_verify(claim, paper_doi)` - Check if paper supports claim
- `citation_find_related(doi)` - Get related papers
- `citation_get_citing(doi)` - Papers that cite this one

**APIs**:
- Semantic Scholar API (free, good rate limits)
- CrossRef API (DOI resolution)
- OpenAlex API (open alternative)

### Task 1.4: library-mcp Server ⬜
**Purpose**: Vector search over user's paper library

**Tools to expose**:
- `library_index_pdf(path)` - Add PDF to index
- `library_search(query, limit)` - Semantic search
- `library_list_papers()` - List all indexed papers
- `library_get_context(query)` - Get relevant chunks with sources
- `library_remove(paper_id)` - Remove from index

**Tech Stack**:
- ChromaDB (MVP) / LanceDB (scale)
- Sentence Transformers for embeddings
- SQLite for metadata

### Task 1.5: docx-mcp Server ⬜
**Purpose**: Read/write Word documents with formatting

**Tools to expose**:
- `docx_read(path)` - Read document content
- `docx_read_with_formatting(path)` - Include styles
- `docx_write(path, content)` - Write new document
- `docx_insert_at(path, position, content)` - Insert text
- `docx_replace(path, old, new)` - Find and replace
- `docx_get_comments(path)` - Get track changes/comments
- `docx_add_comment(path, position, comment)` - Add comment

**Tech Stack**:
- python-docx for manipulation
- mammoth.js for HTML conversion (if needed)

---

## 📋 Phase 2: VS Code Extension (UI Layer)

### Task 2.1: Extension Already Created ✅
Location: `extensions/sciencestudio-core/`
- Basic structure in place
- Focus Mode implemented
- PDF Library view registered

### Task 2.2: OnlyOffice Integration ⬜
**Purpose**: Pixel-perfect Word editing with full compatibility

**Setup Tasks**:
- [ ] Set up OnlyOffice Document Server (Docker)
- [ ] Create docker-compose.yml for local development
- [ ] Test Document Server API connectivity

**VS Code Integration Tasks**:
- [ ] Create Custom Editor Provider for *.docx
- [ ] Build WebView that embeds OnlyOffice iframe
- [ ] Implement file open flow (copy to Document Server)
- [ ] Implement file save flow (callback URL → copy back)
- [ ] Handle Document Server lifecycle (auto-start/stop)

**UX Tasks**:
- [ ] Add loading indicator while Document Server starts
- [ ] Error handling for Document Server crashes
- [ ] Status bar indicator for connection state

See `docs/plans/2024-12-17-onlyoffice-integration-design.md` for full design.

### Task 2.3: Inline AI Assistant ⬜
**Purpose**: Full research assistant inside the editor (like Cursor for code)

**Architecture**: VS Code Extension Bridge (not OnlyOffice plugin)
- Single Claude Code brain for all AI operations
- Full access to MCP servers (library, pdf, citation)
- postMessage bridge between OnlyOffice WebView ↔ Extension

**Implementation Tasks**:
- [ ] Implement postMessage bridge (OnlyOffice ↔ Extension)
- [ ] Add Cmd+K / Ctrl+K keyboard shortcut in OnlyOffice WebView
- [ ] Build inline AI popup UI (command buttons + custom prompt)
- [ ] Connect to Claude Code for AI responses
- [ ] Implement response streaming with progress indicators
- [ ] Add Accept/Edit/Reject buttons for AI suggestions

**AI Commands**:
| Command | Description | MCP Tools |
|---------|-------------|-----------|
| Refine | Polish writing | - |
| Expand | Elaborate | - |
| Add citations | From library | library_search, pdf_extract |
| Find sources | New papers | citation_search |
| Verify claim | Check sources | library_search, pdf_extract |
| Strengthen | Add evidence | library_search, citation_search |

See `docs/plans/2024-12-17-onlyoffice-integration-design.md` for full design.

### Task 2.4: PDF Viewer Integration ⬜
- [ ] Integrate PDF.js for viewing
- [ ] Add annotation support (sidecar JSON files)
- [ ] Connect to library-mcp for context

### Task 2.5: Claude Code Chat Integration ⬜
- [ ] Create chat panel webview
- [ ] Connect to Claude Code CLI
- [ ] Show research context in chat

---

## 📋 Phase 3: Claude Code Configuration

### Task 3.1: MCP Server Registration ⬜
Location: `~/.claude/claude_desktop_config.json` (or equivalent)

```json
{
  "mcpServers": {
    "pdf": {
      "command": "python",
      "args": ["/path/to/ScienceStudio/mcp-servers/pdf-mcp/server.py"]
    },
    "citation": {
      "command": "python",
      "args": ["/path/to/ScienceStudio/mcp-servers/citation-mcp/server.py"]
    },
    "library": {
      "command": "python",
      "args": ["/path/to/ScienceStudio/mcp-servers/library-mcp/server.py"]
    },
    "docx": {
      "command": "python",
      "args": ["/path/to/ScienceStudio/mcp-servers/docx-mcp/server.py"]
    }
  }
}
```

### Task 3.2: Custom Prompts/Commands ⬜
Create `.claude/commands/` for research workflows:
- `research-paper.md` - Help write a research paper
- `literature-review.md` - Conduct literature review
- `verify-citations.md` - Check all citations in document

---

## 📋 Phase 4: Integration & Polish

### Task 4.1: End-to-End Workflow ⬜
Test the complete flow:
1. User opens ScienceStudio
2. Adds PDFs to library (indexed automatically)
3. Opens or creates .docx document
4. Asks Claude: "Find evidence for [claim] in my library"
5. Claude uses library-mcp to search, pdf-mcp to extract
6. User inserts citation with one click
7. Document saved with proper formatting

### Task 4.2: Research-Specific Prompts ⬜
Optimize Claude's behavior for research:
- Location-aware context (which section of paper)
- Citation formatting (APA, MLA, Chicago)
- Academic writing style
- Claim verification workflows

---

## 🚀 Immediate Next Steps

1. **Build pdf-mcp first** - Most impactful, enables reading papers
2. **Build library-mcp second** - Enables semantic search
3. **Wire up to Claude Code** - Test with real research tasks
4. **Then iterate on UI** - Based on actual usage

---

## 📊 Success Metrics

- [ ] Claude can read any PDF in user's library
- [ ] Claude can search across all papers semantically
- [ ] Claude can verify citations against source papers
- [ ] Claude can help write/edit .docx documents
- [ ] Complete workflow: idea → evidence → written section

---

## 🔧 Development Setup

```bash
# Create conda environment for MCP servers
conda create -n sciencestudio python=3.12
conda activate sciencestudio

# Install MCP SDK
pip install mcp

# Install dependencies for each server
cd mcp-servers/pdf-mcp && pip install pymupdf
cd ../citation-mcp && pip install httpx
cd ../library-mcp && pip install chromadb sentence-transformers
cd ../docx-mcp && pip install python-docx
```

---

## 📝 Notes

- MCP servers are the core value - they give Claude research superpowers
- UI is secondary - VS Code + Claude Code chat is already good
- Focus on tools that researchers actually need
- Test with real research workflows (e.g., girlfriend's PhD work)
