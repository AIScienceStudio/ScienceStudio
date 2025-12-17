# ScienceStudio

> **An IDE for Research** — Word + LaTeX + AI, local-first.

![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-Pre--Alpha-orange)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Mac%20%7C%20Linux-lightgrey)

## What is ScienceStudio?

A research-focused IDE that gives AI coding agents research superpowers. Instead of building another AI, we use **Claude Code or OpenCode as the brain** and build research tools (MCP servers) that any agent can use.

**Supports both Word AND LaTeX** — covering ~95% of academic researchers.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  VS Code Extension                                  │
│  ├── OnlyOffice (.docx) ─┬─ Inline AI (Cmd+K)       │
│  ├── LaTeX Editor (.tex) ─┘                         │
│  ├── PDF Library                                    │
│  └── Focus Mode (hides VS Code complexity)          │
├─────────────────────────────────────────────────────┤
│  Choose Your Brain:                                 │
│  ┌─────────────┐  ┌─────────────┐                   │
│  │ Claude Code │  │  OpenCode   │                   │
│  │ (Claude)    │  │ GPT/Gemini/ │                   │
│  │ [Default]   │  │ LLaMA/etc   │                   │
│  └──────┬──────┘  └──────┬──────┘                   │
│         └────────┬───────┘                          │
└──────────────────┼──────────────────────────────────┘
                   │ MCP Protocol
                   ▼
┌─────────────────────────────────────────────────────┐
│  MCP Servers (Research Tools)                       │
│  ├── pdf-mcp: Read and extract from PDFs            │
│  ├── library-mcp: Vector search over your papers    │
│  ├── citation-mcp: Find papers, get BibTeX          │
│  └── docx-mcp: Read/write Word documents            │
└─────────────────────────────────────────────────────┘
```

## Key Features

### Inline AI Assistant (Cmd+K)

Select text in your document, press `Cmd+K`, and get research-powered AI:

| Command | What it does |
|---------|--------------|
| **Refine** | Polish your writing |
| **Expand** | Elaborate on the point |
| **Add citations** | Find supporting papers from your library |
| **Find sources** | Search Semantic Scholar for new papers |
| **Verify claim** | Check if your sources support the claim |
| **Strengthen** | Add evidence and improve reasoning |

### Two Editors, One Experience

| Format | Editor | Users |
|--------|--------|-------|
| **.docx** (Word) | OnlyOffice | Bio, Med, Social Sciences (~60-70%) |
| **.tex** (LaTeX) | Monaco | Math, Physics, CS (~10-30%, 70-90% in STEM) |

**Both editors share the same inline AI and MCP tools.**

### Choose Your AI Brain

| Agent | Models | Best For |
|-------|--------|----------|
| **Claude Code** (default) | Claude 3.5/4 | Best agent orchestration |
| **OpenCode** | GPT-4, Gemini, LLaMA, 75+ | User choice, open-source |

### Research MCP Servers

```bash
# Search your paper library
> library_search("cognitive load affects memory")
Found 3 papers: Smith 2023, Jones 2022, ...

# Look up a paper by DOI
> citation_lookup_doi("10.1038/nature12373")
Title: "Structural basis of...", Authors: ...

# Extract sections from a PDF
> pdf_extract_sections("/path/to/paper.pdf")
Abstract: "...", Methods: "...", Results: "..."
```

## Why ScienceStudio?

| Tool | Word | LaTeX | AI | Local-First |
|------|------|-------|-----|-------------|
| MS Word | ✅ | ❌ | ✅ Copilot | ❌ |
| Google Docs | ✅ | ❌ | ✅ Gemini | ❌ |
| Overleaf | ❌ | ✅ | ❌ | ❌ |
| **ScienceStudio** | ✅ | ✅ | ✅ | ✅ |

**Our differentiator:** Only tool that supports BOTH Word AND LaTeX with AI + local-first + agent-agnostic.

## Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/AIScienceStudio/ScienceStudio.git
cd ScienceStudio
```

### 2. Install the VS Code extension
```bash
cd extensions/sciencestudio-core
npm install
npm run compile
```

### 3. Set up MCP servers
```bash
# Create Python environment
conda create -n sciencestudio python=3.12
conda activate sciencestudio

# Install MCP servers
cd mcp-servers/pdf-mcp && pip install -r requirements.txt
cd ../library-mcp && pip install -r requirements.txt
cd ../citation-mcp && pip install -r requirements.txt
cd ../docx-mcp && pip install -r requirements.txt
```

### 4. Register MCP servers with your agent

**For Claude Code** (`~/.claude.json`):
```json
{
  "mcpServers": {
    "pdf": { "command": "python", "args": ["/path/to/mcp-servers/pdf-mcp/server.py"] },
    "library": { "command": "python", "args": ["/path/to/mcp-servers/library-mcp/server.py"] },
    "citation": { "command": "python", "args": ["/path/to/mcp-servers/citation-mcp/server.py"] },
    "docx": { "command": "python", "args": ["/path/to/mcp-servers/docx-mcp/server.py"] }
  }
}
```

**For OpenCode** — same format in `~/.config/opencode/opencode.json`

### 5. Launch
```bash
code --extensionDevelopmentPath=/path/to/extensions/sciencestudio-core
```

## Roadmap

### Phase 1: Foundation (Current)
- [x] Project architecture defined
- [x] MCP servers implemented (pdf, library, citation, docx)
- [x] VS Code extension skeleton
- [ ] OnlyOffice integration
- [ ] Inline AI assistant (Cmd+K)

### Phase 2: Editors
- [ ] OnlyOffice WebView for .docx
- [ ] LaTeX editor with PDF preview
- [ ] PDF viewer with annotations

### Phase 3: Intelligence
- [ ] Full inline AI with MCP tools
- [ ] Citation autocomplete
- [ ] Claim verification
- [ ] Smart search across library

### Phase 4: Polish
- [ ] Focus Mode (hide VS Code complexity)
- [ ] One-click installer
- [ ] Cloud sync (optional)

## Documentation

| Doc | Description |
|-----|-------------|
| [CLAUDE.md](CLAUDE.md) | Project overview and setup |
| [Design Choices](docs/design-choices.md) | Architecture decisions |
| [Market Research](docs/market-research.md) | Word vs LaTeX usage data |
| [OnlyOffice Design](docs/plans/2024-12-17-onlyoffice-integration-design.md) | Editor integration plan |
| [Tasks](plan/tasks.md) | Current development tasks |

## Project Structure

```
ScienceStudio/
├── extensions/
│   └── sciencestudio-core/     # VS Code extension
├── mcp-servers/
│   ├── pdf-mcp/                # PDF extraction
│   ├── library-mcp/            # Vector search (ChromaDB)
│   ├── citation-mcp/           # Semantic Scholar API
│   └── docx-mcp/               # Word document handling
├── docs/
│   ├── design-choices.md
│   ├── market-research.md
│   └── plans/
└── plan/
    └── tasks.md
```

## Target Users

**Primary:** PhD students and academic researchers
- Psychology, Biology, Medicine (Word users)
- Math, Physics, CS (LaTeX users)

**Use case:** Manage 50-100+ PDFs, write papers, find evidence, verify citations.

## Contributing

We're building the future of research tools. Contributions welcome!

- **UI/UX** — Make OnlyOffice/LaTeX integration seamless
- **AI/ML** — Improve MCP server capabilities
- **Research** — Help us understand researcher workflows

## License

MIT — Open source forever.

---

<div align="center">

**Your data stays on your machine. Always.**

[Documentation](docs/) · [Issues](https://github.com/AIScienceStudio/ScienceStudio/issues) · [Discussions](https://github.com/AIScienceStudio/ScienceStudio/discussions)

</div>
