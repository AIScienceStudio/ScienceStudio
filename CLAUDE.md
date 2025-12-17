# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ScienceStudio is a research-focused IDE that gives AI coding agents research superpowers through MCP servers. Instead of building a custom AI agent, we use **existing CLI agents as the brain** and build research tools (MCP servers) that any MCP-compatible agent can use.

**Supported Brains:**
- **Claude Code** (default, recommended) - Anthropic's Claude
- **OpenCode** (alternative) - Supports GPT-4, Gemini, Claude, LLaMA, and 75+ other models

### Target Users
- PhD students and academic researchers (primary focus: psychology, biology, medicine)
- Programmer-researchers who work with both code and academic documents
- Professors and postdocs managing publications and reviews

### Primary User Persona
Psychology PhD student (Andy's girlfriend) who needs to:
- Manage 50-100 PDFs
- Write in Word (.docx)
- Find evidence across papers
- Verify and manage citations

## Architecture: Agent-Agnostic Brain

```
┌─────────────────────────────────────────────────────┐
│  ScienceStudio UI Layer                             │
│  ├── VS Code Extension (sciencestudio-core)         │
│  │   ├── OnlyOffice WebView for .docx editing       │
│  │   ├── PDF Library view                           │
│  │   └── Focus Mode (hides VS Code complexity)      │
│  └── Agent Integration (user's choice)              │
│      └── Chat interface for research tasks          │
├─────────────────────────────────────────────────────┤
│  OnlyOffice Document Server (Local Docker)          │
│  └── Full Word compatibility, track changes, eqns   │
├─────────────────────────────────────────────────────┤
│  Choose Your Brain:                                 │
│  ┌─────────────┐  ┌─────────────┐                   │
│  │ Claude Code │  │  OpenCode   │                   │
│  │ (Claude)    │  │ (Any LLM)   │                   │
│  │ [Default]   │  │ GPT/Gemini/ │                   │
│  │             │  │ LLaMA/etc   │                   │
│  └──────┬──────┘  └──────┬──────┘                   │
│         └────────┬───────┘                          │
└──────────────────┼──────────────────────────────────┘
                   │ MCP Protocol
                   ▼
┌─────────────────────────────────────────────────────┐
│  MCP Servers (Research Tools - Agent Agnostic)      │
│  ├── pdf-mcp: Semantic PDF extraction               │
│  ├── library-mcp: Vector search over papers         │
│  ├── citation-mcp: Paper lookup & verification      │
│  └── docx-mcp: Word document manipulation           │
└─────────────────────────────────────────────────────┘
```

**Editor Choice**: OnlyOffice for pixel-perfect Word compatibility. See `docs/design-choices.md` section 4.

**Key Insight**: We don't build an agent - we build research tools (MCP servers) that work with ANY MCP-compatible agent. Users choose their preferred brain.

## Project Structure

```
AIScienceStudio/
├── ScienceStudio/                    # Main project repo
│   ├── docs/                         # Documentation
│   │   ├── functional-specification.md
│   │   ├── technology-stack.md
│   │   ├── roadmap.md
│   │   └── design-choices.md         # Architecture decisions
│   ├── plan/
│   │   └── tasks.md                  # Current development plan
│   ├── extensions/
│   │   └── sciencestudio-core/       # VS Code extension
│   │       ├── src/
│   │       │   ├── extension.ts      # Main entry point
│   │       │   ├── ui/focusMode.ts   # Focus mode controller
│   │       │   └── editor/           # ProseMirror integration
│   │       └── package.json
│   └── mcp-servers/                  # MCP servers (Python)
│       ├── pdf-mcp/                  # PDF processing
│       ├── library-mcp/              # Vector search (ChromaDB)
│       ├── citation-mcp/             # Semantic Scholar/CrossRef
│       └── docx-mcp/                 # Word document handling
│
├── vscode/                           # VS Code fork (optional branding)
│
└── docs/
    └── Initial_brain_storming_with_gemini3_15Dec2025.txt
```

## MCP Servers

### pdf-mcp
- `pdf_extract_text(path)` - Full text extraction
- `pdf_extract_sections(path)` - Abstract, Methods, Results, etc.
- `pdf_extract_references(path)` - Bibliography extraction
- `pdf_get_metadata(path)` - Title, authors, DOI

### library-mcp
- `library_index_pdf(path)` - Add PDF to vector index
- `library_search(query, limit)` - Semantic search
- `library_list_papers()` - List indexed papers
- `library_remove(path)` - Remove from index

### citation-mcp
- `citation_search(query)` - Search Semantic Scholar
- `citation_lookup_doi(doi)` - Get paper by DOI
- `citation_get_bibtex(doi)` - Get BibTeX entry
- `citation_find_related(paper_id)` - Related papers

### docx-mcp
- `docx_read(path)` - Read as plain text
- `docx_read_structured(path)` - With formatting info
- `docx_write(path, content)` - Create new document
- `docx_append(path, content)` - Add to existing
- `docx_replace(path, find, replace)` - Find and replace

## Development Setup

### VS Code Extension
```bash
cd ScienceStudio/extensions/sciencestudio-core
npm install
npm run compile

# Test in VS Code
code --extensionDevelopmentPath=$(pwd) /path/to/test/folder
```

### MCP Servers
```bash
# Create conda environment
conda create -n sciencestudio python=3.12
conda activate sciencestudio

# Install each server
cd mcp-servers/pdf-mcp && pip install -r requirements.txt
cd ../library-mcp && pip install -r requirements.txt
cd ../citation-mcp && pip install -r requirements.txt
cd ../docx-mcp && pip install -r requirements.txt
```

### Register MCP Servers with Your Agent

#### Option 1: Claude Code (Recommended)
Add to `~/.claude.json`:
```json
{
  "mcpServers": {
    "pdf": {
      "command": "python",
      "args": ["/path/to/ScienceStudio/mcp-servers/pdf-mcp/server.py"]
    },
    "library": {
      "command": "python",
      "args": ["/path/to/ScienceStudio/mcp-servers/library-mcp/server.py"]
    },
    "citation": {
      "command": "python",
      "args": ["/path/to/ScienceStudio/mcp-servers/citation-mcp/server.py"]
    },
    "docx": {
      "command": "python",
      "args": ["/path/to/ScienceStudio/mcp-servers/docx-mcp/server.py"]
    }
  }
}
```

#### Option 2: OpenCode (For GPT/Gemini/LLaMA users)
OpenCode supports 75+ LLM providers. Install and configure:

```bash
# Install OpenCode
# See: https://github.com/opencode-ai/opencode

# Configure your preferred model provider
opencode config set provider openai  # or: anthropic, google, ollama, etc.
opencode config set api_key YOUR_API_KEY
```

Add MCP servers to `~/.config/opencode/opencode.json`:
```json
{
  "mcpServers": {
    "pdf": {
      "command": "python",
      "args": ["/path/to/ScienceStudio/mcp-servers/pdf-mcp/server.py"]
    },
    "library": {
      "command": "python",
      "args": ["/path/to/ScienceStudio/mcp-servers/library-mcp/server.py"]
    },
    "citation": {
      "command": "python",
      "args": ["/path/to/ScienceStudio/mcp-servers/citation-mcp/server.py"]
    },
    "docx": {
      "command": "python",
      "args": ["/path/to/ScienceStudio/mcp-servers/docx-mcp/server.py"]
    }
  }
}
```

**Supported Models via OpenCode:**
| Provider | Models |
|----------|--------|
| OpenAI | GPT-4, GPT-4o, GPT-3.5 |
| Anthropic | Claude 3.5, Claude 3 |
| Google | Gemini Pro, Gemini Ultra |
| Ollama | LLaMA, Mistral, CodeLlama (local) |
| + 75 more | See OpenCode docs |

## Current Status (December 2024)

### Completed ✅
- Project documentation (functional spec, roadmap, design choices)
- VS Code extension skeleton with Focus Mode
- MCP server implementations (pdf, library, citation, docx)
- Architecture: Agent-agnostic brain (Claude Code default, OpenCode alternative)
- OnlyOffice integration design with inline AI assistant

### In Progress 🔄
- Testing MCP servers with real PDFs
- OnlyOffice Docker setup

### Next Steps 📋
1. Install MCP server dependencies
2. Test each MCP server individually
3. Register with Claude Code (or OpenCode) config
4. Set up OnlyOffice Document Server
5. Build inline AI assistant (Cmd+K)

## Key Principles

1. **Agent-Agnostic**: MCP servers work with Claude Code, OpenCode, or any MCP-compatible agent
2. **User Choice**: Default to Claude Code, but support GPT/Gemini/LLaMA via OpenCode
3. **MCP Servers are Tools**: Build research-specific tools any agent can use
4. **Local-First**: All processing on user's machine by default
5. **Perfect .docx Round-Trip**: Never break Word compatibility (via OnlyOffice)
6. **Focus Mode**: Hide VS Code complexity for non-programmer users

## Important Notes

1. **Git Commits**: Never add "generated by Claude" or similar attribution
2. **Privacy**: User data stays local - no cloud uploads without consent
3. **Academic Integrity**: Never fabricate citations or sources
4. **Performance**: Must handle 100+ page docs and 100+ PDFs efficiently

## Useful Commands

```bash
# Run extension in dev mode
code --extensionDevelopmentPath=/Users/andy/Documents/projects/AIScienceStudio/ScienceStudio/extensions/sciencestudio-core

# Test PDF MCP server
python mcp-servers/pdf-mcp/server.py

# Check git status
git status

# Compile extension
cd extensions/sciencestudio-core && npm run compile
```
