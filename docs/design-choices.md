# ScienceStudio Design Choices

This document captures key architectural decisions and their rationale. It serves as a reference for contributors to understand why certain technologies and approaches were chosen over alternatives.

---

## 1. Open Source Strategy

### Decision: Open Source from Day 1

**Chosen Approach**: MIT License, fully open source from initial commit

**Rationale**:

1. **Trust Factor**: Researchers are paranoid about their data (unpublished findings, patient data, novel hypotheses). Open source proves the tool is local-first and privacy-respecting - they can audit the code themselves.

2. **Community Maintenance**: VS Code requires monthly upstream merges. Open source attracts contributors (CS PhD students who hate Word) to help maintain the plumbing while core team focuses on the "brain".

3. **Marketing Advantage**: "Open Source" is the biggest differentiator in the research tools space. It immediately signals trustworthiness.

4. **Business Model Compatibility**: Open Core model works - desktop app is free/open, cloud collaboration features can be monetized later (see GitLab, Supabase).

**Implementation**:
- MIT License (required for VS Code compatibility)
- Clear "Pre-Alpha" status in README
- DESIGN.md as north star for contributors
- Desktop app: 100% open source
- Future cloud services: Premium features

---

## 2. Vector Database Selection

### Decision: ChromaDB → LanceDB Migration Path

**Current State**: Repository pattern supporting both databases
- ChromaDB for MVP/Lite users (50-100 papers)
- LanceDB for Power users (1,000-10,000+ papers)

### Why NOT Milvus

**Rejected Because**:
1. **Cloud-Native Design**: Requires Docker/Kubernetes, too heavy for desktop
2. **Complex Packaging**: Difficult to bundle in Electron installer
3. **Resource Overhead**: Designed for servers, not laptops
4. **Deployment Friction**: "Milvus Lite" still heavier than alternatives

**Verdict**: "You don't need a Ferrari engine to power a bicycle"

### Why NOT Qdrant (for v1)

**Considered But Rejected**:
1. **Server Architecture**: Built as separate process, not truly embedded
2. **RAM Usage**: HNSW index lives in memory (500MB-1GB for 500k chunks)
3. **Packaging Complexity**: Rust backend + Python client = deployment friction
4. **Desktop Mismatch**: Optimized for cloud servers, not MacBook Airs

**Note**: Qdrant is excellent for cloud deployments, just not for embedded desktop apps

### Why ChromaDB (MVP Choice)

**Chosen For Initial Version**:
1. **Simplicity**: "SQLite of vector DBs" - runs in-process
2. **Zero Setup**: Creates `./.sciencestudio/memory.db` folder, no configuration
3. **Pure Python**: Easy PyInstaller packaging, no binary dependencies
4. **Documentation**: Extensive tutorials and community support
5. **Time to MVP**: Zero hours debugging connection errors

**Limitations**: RAM-heavy at scale (loads HNSW index into memory)

### Why LanceDB (Production Choice)

**Chosen For Scale**:
1. **Disk-Native**: Built on Apache Arrow, streams from disk
2. **Memory Efficient**: 50GB indexed PDFs = ~100MB RAM usage
3. **Columnar Storage**: "Pandas for vectors" - fast analytics
4. **Future-Proof**: Native support for images/tables (v2 features)
5. **Desktop-Optimized**: Designed for embedded use cases

**Example**: 10,000 papers (500k chunks) uses 100MB RAM vs 1GB+ for alternatives

### Implementation Strategy

```python
# Repository Pattern enables seamless migration
class MemoryStore(Protocol):
    def add_document(self, text: str, metadata: Dict) -> bool: ...
    def search(self, query: str, limit: int = 5) -> List[Dict]: ...

# Start with ChromaDB
memory = ChromaMemory() if lite_mode else LanceMemory()
```

---

## 3. Architecture: VS Code vs BrowserOS vs Extension

### Decision: VS Code Extension (Not BrowserOS Fork)

**Alternatives Considered**:

#### BrowserOS Fork
- **Pros**: Built-in agentic capabilities, LLM integration, web automation
- **Cons**: 
  - Designed for consumption, not creation
  - No file system, project management, or version control
  - Would need to rebuild text editor from scratch
  - No concept of documents, only "tabs"

#### VS Code Fork
- **Pros**: Full control over UI, deep customization possible
- **Cons**: Heavy maintenance burden (monthly upstream merges)

#### VS Code Extension (Chosen)
- **Pros**:
  1. All creation tools included (file system, Git, editor)
  2. Electron = Chromium inside (can spawn browsers for agents)
  3. Extension marketplace distribution
  4. User keeps existing VS Code setup
  5. Can embed web views (PDF.js, agentic features)

**The Key Insight**: 
- **BrowserOS**: Optimized for *consuming* web content (reading, browsing)
- **VS Code**: Optimized for *creating* documents (writing, organizing)
- **ScienceStudio Need**: 80% creation, 20% consumption

### Hybrid Architecture Solution

Instead of forking BrowserOS, we can integrate its "brain":

```python
# In backend/agent.py
from playwright.async_api import async_playwright

class ResearchAgent:
    async def find_papers(self, query):
        # Launch headless browser
        browser = await playwright.chromium.launch()
        page = await browser.new_page()
        
        # Navigate to Google Scholar
        await page.goto(f"https://scholar.google.com/scholar?q={query}")
        
        # Extract and download PDFs
        # Save to library/ folder
```

**Result**: We get VS Code's creation tools + browser automation capabilities without the complexity of maintaining a browser fork.

**Future Option**: Can always add BrowserOS as a companion tool for advanced web research

---

## 4. Document Processing Stack

### Decision: ProseMirror + mammoth.js + Pandoc

**ProseMirror** (Editor):
- True WYSIWYG for researchers
- Immutable citation nodes
- Track changes support
- Academic document schema

**mammoth.js** (Import):
- Preserves Word formatting
- Handles comments/track changes
- Pure JavaScript (easy bundling)

**Pandoc** (Export):
- Industry standard for conversion
- Perfect LaTeX support
- Journal-ready outputs

**Rejected Alternatives**:
- **Quill/TinyMCE**: Not flexible enough for academic needs
- **Slate**: Too low-level, longer development time
- **Direct .docx manipulation**: Loss of semantic structure

---

## 5. AI Integration Approach

### Decision: Claude Code as Brain + MCP Research Tools

**PIVOT (December 2024)**: Instead of building a custom agentic AI system, we leverage Claude Code as the orchestration brain.

#### Why NOT Build a Custom Agent

**Rejected Approach**: Custom Python agent with LangChain/LangGraph
- Would reinvent what Claude Code already does (planning, tool use, multi-step execution)
- Significant development and maintenance burden
- Would always be playing catch-up with Claude's capabilities

#### Why Claude Code as Brain

**Chosen Approach**: Use Claude Code for all agentic orchestration

**Benefits**:
1. **Already Has Planning**: Claude Code plans tasks, breaks them down, iterates
2. **Already Has Tool Use**: File read/write/edit, bash commands, search
3. **Already Has Memory**: Context management across conversations
4. **Free Updates**: As Claude improves, ScienceStudio gets smarter
5. **Battle-Tested**: Used by thousands of developers daily

#### Architecture

```
┌─────────────────────────────────────────────────────┐
│  ScienceStudio UI Layer                             │
│  - VS Code Extension                                │
│  - ProseMirror for .docx editing                    │
│  - PDF Library view                                 │
│  - Research-focused interface                       │
│  - Focus Mode (hides VS Code complexity)            │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  Claude Code = THE BRAIN                            │
│  (No custom agent needed)                           │
│                                                     │
│  + MCP Servers for Research Superpowers:            │
│    ├── pdf-mcp: Semantic PDF extraction             │
│    ├── citation-mcp: Paper lookup & verification   │
│    ├── library-mcp: Vector search over papers       │
│    └── docx-mcp: Word document manipulation        │
└─────────────────────────────────────────────────────┘
```

#### MCP Servers (What We Build)

Instead of building an agent, we build **research tools** that Claude Code can use:

1. **pdf-mcp**: Extract text, sections, figures, tables from PDFs
2. **citation-mcp**: Query Semantic Scholar, CrossRef, DOI lookup
3. **library-mcp**: Vector search over user's paper library (ChromaDB/LanceDB)
4. **docx-mcp**: Read/write .docx with formatting preservation

#### Comparison: Old vs New Architecture

| Aspect | Old (Custom Agent) | New (Claude Code Brain) |
|--------|-------------------|------------------------|
| Planning | Build from scratch | Already exists |
| Tool use | Build from scratch | Already exists |
| Context | Build from scratch | Already exists |
| Our focus | Agent + Tools + UI | Tools + UI only |
| Maintenance | High | Low |
| Capability ceiling | Limited by us | Limited by Anthropic |

**The Key Insight**: Cursor didn't build their own agent - they built a great interface and tools for Claude/GPT to use. We do the same for researchers.

#### Local LLM Fallback

For offline/privacy needs:
- MCP servers can also work with Ollama
- But Claude Code remains the recommended brain for full capabilities

---

## 6. Development Language

### Decision: TypeScript Everywhere (Where Possible)

**Rationale**:
1. **Type Safety**: Critical for document structure integrity
2. **VS Code Native**: First-class support in extension APIs
3. **Team Scalability**: Easier onboarding with types
4. **Refactoring**: Confident large-scale changes

**Exception**: Python for AI/PDF processing (ecosystem maturity)

---

## 7. Storage Philosophy

### Decision: Local-First with Git Integration

**Principles**:
1. **User owns their data**: No automatic cloud uploads
2. **Version control built-in**: Every save creates Git commit
3. **Conflict-free**: Researchers can use existing backup solutions
4. **Privacy default**: Opt-in for any cloud features

**Implementation**:
- Documents: File system + Git
- Metadata: SQLite
- Vectors: ChromaDB/LanceDB
- Settings: VS Code configuration

---

## 8. Performance Targets

### Decision: Laptop-First Optimization

**Key Metrics**:
- Document load: <2 seconds (100 pages)
- Search response: <500ms (100 PDFs)
- RAM usage: <500MB baseline
- CPU: Minimal background processing

**Rationale**: Researchers often use older laptops, work on battery, run multiple applications

---

## 9. UI/UX Philosophy

### Decision: Progressive Disclosure + Researcher Defaults

**Core Principle**: "Start simple, reveal complexity"

**Implementation**:
1. Hide developer tools by default
2. Word-like appearance out of box
3. Power features in command palette
4. Researcher-specific status bar
5. PDF-first file explorer

**Rejected**: 
- Full VS Code UI (too complex)
- Minimal editor (too simple)
- Web-only interface (offline needs)

---

## 10. Business Model Consideration

### Decision: Open Core Model

**Free/Open Source**:
- Desktop application
- Core AI features
- Local processing
- Community extensions

**Future Premium**:
- Cloud collaboration
- Team libraries
- Advanced AI models
- Priority support
- Journal submission integration

**Rationale**: Sustainable development while maintaining trust

---

## Decision Documentation Template

For future decisions, use this format:

### Decision: [Title]

**Chosen Approach**: [What we decided]

**Alternatives Considered**:
- Option A: [Why rejected]
- Option B: [Why rejected]

**Rationale**:
1. [Key reason 1]
2. [Key reason 2]

**Trade-offs Acknowledged**:
- [What we're giving up]
- [What we're gaining]

**Migration Path**: [If applicable]

---

## Appendix: Conversation History

### Should We Include Development Conversations?

**Question**: Should we include the AI conversation that led to these decisions in the repository?

**Consideration**: 
- **Pros**: Shows thought process, educational for contributors, transparency
- **Cons**: Large file size, potentially confusing, may contain outdated ideas

**Recommendation**: 
- Create a `docs/history/` folder for significant design conversations
- Extract and summarize key decisions into this design-choices.md
- Keep raw conversations in a separate repository or archive

The design choices document should be the canonical reference, with conversations serving as historical context when needed.

---

This is a living document. As the project evolves, new decisions should be documented here with clear rationale.