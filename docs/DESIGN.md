# ScienceStudio: Technical Design Specification

**Version:** 0.1.0 (Draft)  
**Repository:** `github.com/AIScienceStudio/ScienceStudio`  
**Architecture:** VS Code Extension with Split-Brain Design

---

## 1. Executive Summary

**ScienceStudio** is an "Agentic IDE for Science" - a VS Code extension that transforms the world's most powerful code editor into an intelligent research environment.

**The Core Problem:** Researchers manage complex graphs of knowledge (PDFs, data, citations) but write in flat, unintelligent text processors (Word).

**The Solution:** An IDE that treats research papers as a structured codebase, with built-in AI assistance that understands academic workflows, semantic document structure, and the relationship between sources and arguments.

---

## 2. System Architecture

ScienceStudio utilizes a **Split-Brain Architecture** to maintain UI responsiveness while performing heavy AI and document processing tasks.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (The Studio)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   VS Code   │  │ ProseMirror │  │    PDF.js   │            │
│  │  Extension  │  │   Editor    │  │   Viewer    │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                 │                 │                    │
│  ┌──────┴─────────────────┴─────────────────┴──────┐           │
│  │          VS Code Extension Host (Node.js)        │           │
│  └──────────────────────┬───────────────────────────┘           │
└─────────────────────────┼───────────────────────────────────────┘
                          │ IPC/WebSocket
┌─────────────────────────┼───────────────────────────────────────┐
│                         │                                        │
│  ┌──────────────────────┴───────────────────────────┐           │
│  │            AI Processing Layer                    │           │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │           │
│  │  │  LangChain  │  │   Vector    │  │  Citation │ │           │
│  │  │ Orchestrator│  │    Store    │  │  Manager  │ │           │
│  │  └─────────────┘  └─────────────┘  └──────────┘ │           │
│  └───────────────────────────────────────────────────┘           │
│                    Backend (The Brain)                           │
└──────────────────────────────────────────────────────────────────┘
```

### Component Communication

- **Frontend ↔ Extension Host**: VS Code API (postMessage)
- **Extension Host ↔ AI Layer**: Node.js IPC or REST API
- **AI Layer ↔ Storage**: Direct file system and database access

---

## 3. Frontend Specification (The Studio)

### 3.1. VS Code Extension Architecture

**Extension Type**: Workspace Extension with Custom Editors  
**Languages**: TypeScript, React (in Webviews)  
**Key APIs**: CustomTextEditor, WebviewView, FileSystemWatcher

#### Extension Manifest Structure
```typescript
{
  "contributes": {
    "customEditors": [{
      "viewType": "sciencestudio.docxEditor",
      "displayName": "Research Document Editor",
      "selector": [{ "filenamePattern": "*.docx" }, { "filenamePattern": "*.research" }]
    }],
    "viewsContainers": {
      "activitybar": [{
        "id": "research",
        "title": "Research",
        "icon": "$(beaker)"
      }]
    },
    "views": {
      "research": [
        { "id": "sciencestudio.library", "name": "PDF Library" },
        { "id": "sciencestudio.outline", "name": "Document Structure" },
        { "id": "sciencestudio.chat", "name": "AI Assistant" }
      ]
    }
  }
}
```

### 3.2. UI Modifications ("Zen Mode")

#### Default Configuration
```json
{
  "workbench.activityBar.visible": true,
  "workbench.sideBar.location": "left",
  "workbench.statusBar.visible": true,
  "workbench.panel.defaultLocation": "bottom",
  
  // Hide developer-focused elements
  "debug.toolBarLocation": "hidden",
  "scm.defaultViewMode": "tree",
  "extensions.autoCheckUpdates": false,
  
  // Research-focused status bar
  "sciencestudio.statusBar.showWordCount": true,
  "sciencestudio.statusBar.showReadability": true,
  "sciencestudio.statusBar.showCitations": true
}
```

#### Welcome Experience
- Replace default "Get Started" with "Research Dashboard"
- Show: Recent documents, thesis progress, library statistics
- Quick actions: New document, Import PDF library, Open tutorial

### 3.3. ProseMirror Integration

#### Architecture
```typescript
interface ResearchEditorProvider extends CustomTextEditorProvider {
  // Handles .docx and .research files
  resolveCustomTextEditor(
    document: TextDocument,
    webviewPanel: WebviewPanel,
    token: CancellationToken
  ): Promise<void>;
}

interface EditorState {
  doc: ProseMirrorNode;
  selection: Selection;
  citations: Citation[];
  comments: Comment[];
  trackChanges: Change[];
}
```

#### Key Features
1. **WYSIWYG Editing**: Paper-like appearance with proper typography
2. **Smart Citations**: Immutable citation nodes linked to sources
3. **Semantic Structure**: Sections, subsections with proper hierarchy
4. **Track Changes**: Full compatibility with Word's revision system
5. **Comments**: Threaded discussions in margins

#### Citation Nodes
```typescript
class CitationNode extends Node {
  attrs: {
    id: string;        // "smith2023"
    page?: number;     // Specific page reference
    prefix?: string;   // "see", "cf."
    suffix?: string;   // "for review"
  };
  
  toDOM(): DOMOutputSpec {
    return ["cite", { 
      class: "citation",
      "data-id": this.attrs.id,
      contenteditable: "false"
    }];
  }
}
```

---

## 4. Backend Specification (The Brain)

### 4.1. AI Processing Layer

**Primary Stack**: Node.js with TypeScript  
**AI Framework**: LangChain.js  
**Vector Store**: ChromaDB (development) / LanceDB (production)  
**Document Processing**: mammoth.js, pdf-parse, pandoc

#### Core Services

```typescript
interface AIServices {
  ingestion: IngestionService;      // PDF/document processing
  memory: SemanticMemoryService;    // Vector store operations
  citation: CitationService;        // Bibliography management
  assistant: ResearchAssistant;     // AI agent orchestration
}
```

### 4.2. Document Ingestion Pipeline

```typescript
class IngestionPipeline {
  async processPDF(path: string): Promise<ProcessedDocument> {
    // 1. Extract text with layout preservation
    const rawText = await pdfParse(path);
    
    // 2. Semantic parsing (sections, figures, citations)
    const structured = await this.semanticParser.parse(rawText);
    
    // 3. Generate embeddings for each section
    const embeddings = await this.embedder.embed(structured.sections);
    
    // 4. Store in vector database
    await this.vectorStore.upsert({
      id: generateId(path),
      metadata: structured.metadata,
      embeddings: embeddings,
      chunks: structured.sections
    });
    
    return structured;
  }
}
```

### 4.3. AI Agent Architecture

#### Agent Tools
```typescript
const researchTools = [
  {
    name: "search_papers",
    description: "Search through PDF library for relevant content",
    schema: z.object({
      query: z.string(),
      filters: z.object({
        authors: z.array(z.string()).optional(),
        yearRange: z.tuple([z.number(), z.number()]).optional(),
        sections: z.array(z.string()).optional()
      }).optional()
    })
  },
  {
    name: "verify_citation",
    description: "Verify a claim against source material",
    schema: z.object({
      claim: z.string(),
      sourceId: z.string(),
      page: z.number().optional()
    })
  },
  {
    name: "suggest_evidence",
    description: "Find evidence to support an argument",
    schema: z.object({
      argument: z.string(),
      context: z.string(),
      strength: z.enum(["strong", "moderate", "weak"])
    })
  }
];
```

### 4.4. Data Models

#### Document Schema
```typescript
interface ResearchDocument {
  id: string;
  version: number;
  metadata: {
    title: string;
    authors: string[];
    created: Date;
    modified: Date;
    wordCount: number;
    citationStyle: CitationStyle;
  };
  content: {
    sections: Section[];
    citations: Citation[];
    figures: Figure[];
    tables: Table[];
    comments: Comment[];
  };
  ai: {
    outline: DocumentOutline;
    claims: Claim[];
    gaps: IdentifiedGap[];
    suggestions: Suggestion[];
  };
}

interface Section {
  id: string;
  type: SectionType; // "abstract" | "introduction" | "methods" | etc.
  level: number;     // 1 = main section, 2 = subsection, etc.
  title: string;
  content: ProseMirrorNode;
  metadata: {
    wordCount: number;
    readability: number;
    citations: string[];
  };
}
```

#### Research Context (RESEARCH.md)
```markdown
# Research Context

## Project Information
- **Title**: [Thesis/Paper Title]
- **Field**: [Psychology/Biology/etc.]
- **Stage**: [Planning/Drafting/Revising/Submitted]

## Core Arguments
1. **Main Hypothesis**: ...
2. **Supporting Claims**: ...
3. **Counter-arguments to Address**: ...

## Methodology
- **Approach**: [Qualitative/Quantitative/Mixed]
- **Key Methods**: ...

## Writing Preferences
- **Citation Style**: APA 7th
- **Tone**: [Formal/Semi-formal]
- **Target Journal**: ...

## Excluded Sources
- Papers to avoid citing
- Outdated theories not to reference
```

---

## 5. Key Technical Decisions

### 5.1. VS Code Extension vs Fork

**Decision**: Start as VS Code Extension  
**Rationale**:
- Faster development and deployment
- Easier updates and maintenance  
- Access to extension marketplace
- Can transition to fork later if needed

### 5.2. Vector Database Selection

**Development**: ChromaDB (embedded, simple API)  
**Production**: LanceDB (better performance, columnar storage)  
**Migration Path**: Abstraction layer for easy switching

### 5.3. Document Format

**Internal**: ProseMirror JSON with custom schema  
**Import/Export**: Perfect .docx round-trip via mammoth + custom processing  
**Version Control**: Git-friendly JSON chunks

---

## 6. Performance Requirements

### Responsiveness
- Document load: < 2 seconds for 100-page document
- AI response: < 3 seconds for contextual suggestions  
- PDF search: < 500ms across 100 documents
- Auto-save: Every 30 seconds with < 100ms blocking

### Scale
- Handle 1000+ PDFs in library
- Support 500-page documents
- Maintain 60 FPS UI performance
- < 500MB memory footprint

---

## 7. Security & Privacy

### Local-First Architecture
- All processing happens locally by default
- No automatic cloud uploads
- Explicit consent for any external API calls
- Encrypted storage for sensitive documents

### API Key Management
```typescript
// Store in VS Code Secret Storage
await context.secrets.store('openai-api-key', apiKey);

// Never in settings.json or config files
```

---

## 8. Development Workflow

### For Contributors

#### Setup
```bash
# Clone repository
git clone https://github.com/AIScienceStudio/ScienceStudio
cd ScienceStudio

# Install dependencies
npm install

# Start development
npm run watch

# Launch Extension Development Host
F5 in VS Code
```

#### Good First Issues
1. **UI Polish**: Implement word count in status bar
2. **Citation Styles**: Add MLA/Chicago style formatters
3. **PDF Extractor**: Improve table extraction accuracy
4. **Themes**: Create paper-like editor themes

### Testing Strategy
- **Unit Tests**: Core services and utilities
- **Integration Tests**: Extension + ProseMirror + AI
- **E2E Tests**: Full workflows with real documents
- **Performance Tests**: Large document handling

---

## 9. Future Considerations

### Phase 2+ Features
- Real-time collaboration
- Cloud sync and backup
- Mobile companion app
- Plugin architecture
- Custom AI model fine-tuning

### Technical Debt Prevention
- Regular dependency updates
- Performance profiling monthly
- Code review for all AI prompt changes
- Document all "temporary" solutions

---

## 10. Success Metrics

### Technical
- 95% .docx compatibility
- < 1% crash rate
- 90% AI suggestion relevance
- 99.9% data integrity

### User
- 50% reduction in time to complete papers
- 80% citation accuracy improvement
- 4.5+ star user satisfaction
- 60% monthly active usage