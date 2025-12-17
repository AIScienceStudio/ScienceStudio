# ScienceStudio Functional Specification

## Vision Statement

ScienceStudio is a research-focused IDE that bridges the gap between traditional word processing and modern AI-assisted writing. Built on VS Code's robust infrastructure, it provides researchers with semantic document editing, intelligent PDF analysis, and context-aware AI assistance while maintaining compatibility with Microsoft Word and LaTeX workflows.

## Target Users

### Primary Users
1. **PhD Students** in psychology, biology, medicine, and social sciences
2. **Academic Researchers** writing papers, grants, and thesis documents
3. **Programmer-Researchers** who work with both code and academic documents

### Secondary Users
1. **Postdocs** managing multiple publications
2. **Industry Researchers** producing technical reports
3. **Professors** responding to reviewers and managing collaborative papers

## Core Features

### 1. Semantic Document Editor
- **Rich Text Editing**: ProseMirror-based editor that understands document structure
- **Document Elements**:
  - Sections with hierarchical structure
  - Citations as live objects linked to source PDFs
  - Figures and tables with captions
  - Track changes and comments preservation
  - Style preservation (APA, MLA, Chicago, etc.)

### 2. PDF Intelligence Engine
- **Semantic PDF Parsing**: Extract structured information from research papers
  - Automatic section detection (Abstract, Methods, Results, Discussion)
  - Figure and table extraction with captions
  - Citation graph building
  - Claim and evidence tagging
- **PDF Library Management**: Organize and search through 50-100+ papers
- **Context Window**: Index entire literature library for AI assistance

### 3. AI Research Assistant

#### Core Capabilities
- **Location-Aware Editing**: AI understands document structure and can:
  - Strengthen arguments in specific sections
  - Find evidence from PDF library for claims
  - Suggest citations from loaded papers
  - Verify citation accuracy
  - Match writing style and tone

#### Research-Specific Tools (via MCP)
1. **search_memory**: Semantic search across PDF library
2. **verify_citation**: Check claims against source material
3. **suggest_evidence**: Find supporting evidence for arguments
4. **append_citation**: Add properly formatted citations
5. **plan_update**: Track research progress in RESEARCH.md

#### Example Commands
- "Find evidence for this claim in my PDFs"
- "Strengthen the causal argument using Study A & B"
- "Convert all citations from APA 6 to APA 7"
- "Check if this claim matches the cited paper"
- "What methods did Smith 2023 use?"

### 4. Document Import/Export
- **Perfect Round-Tripping**:
  - Import .docx with comments and track changes
  - Export clean .docx that preserves all formatting
  - Support for LaTeX import/export
- **Collaboration Features**:
  - Maintain supervisor comments
  - Track changes compatibility
  - Version control integration

### 5. Researcher-Focused UI
- **Focus Mode**: Hide VS Code complexity for non-programmers
- **Split View**: PDF reader alongside document editor
- **Citation Sidebar**: Quick access to bibliography
- **AI Chat Panel**: Context-aware assistance

### 6. Citation Management System
- **BibTeX Integration**: 
  - Real-time monitoring of references.bib file
  - Automatic parsing and indexing of citations
  - Export bibliography in multiple formats
- **Smart Citation Autocomplete**:
  - Trigger with "@" symbol in editor
  - Search by author, year, title, or keywords
  - Preview citation format before insertion
- **Citation Nodes**: 
  - Immutable objects in document (not plain text)
  - Preserve citation metadata and linking
  - One-click navigation to source PDF
- **PDF Annotation System**:
  - Sidecar JSON files (filename.pdf.json)
  - Preserve original PDFs untouched
  - Git-versioned annotations and highlights
  - Sync between PDF viewer and document citations

## Key Differentiators

1. **Semantic Understanding**: Not just text editing, but understanding research document structure
2. **PDF-to-Document Flow**: Direct connection between reading and writing
3. **VS Code Foundation**: Leverage existing ecosystem while hiding complexity
4. **Research Workflows**: Built for academic processes, not generic writing

## User Scenarios

### Scenario 1: Literature Review
1. User loads 50 PDFs into library
2. Searches for "cognitive load in children"
3. AI finds relevant sections across all papers
4. User highlights findings and adds to document with auto-citations

### Scenario 2: Responding to Reviewers
1. Import .docx with reviewer comments
2. AI suggests evidence from PDF library to address concerns
3. User strengthens arguments with AI assistance
4. Export revised .docx with track changes

### Scenario 3: Citation Management
1. User writes claim in document
2. AI flags missing citation
3. Suggests relevant papers from library
4. Auto-inserts citation in correct format

## Technical Architecture

### Split-Brain Design
- **Frontend (The Studio)**: VS Code Extension providing the UI and editing experience
- **Backend (The Brain)**: AI processing layer handling document analysis and intelligence
- **Communication**: IPC/WebSocket between frontend and backend for non-blocking operations

### Core Components

#### Document Processing
- **Import**: mammoth.js for .docx parsing with format preservation
- **Editor**: ProseMirror with custom schema for academic documents
- **Export**: Pandoc integration for multi-format support

#### AI Integration Options
1. **Model Context Protocol (MCP)**: For standardized AI tool exposure
2. **LangChain.js**: For complex AI orchestration
3. **Local LLM Support**: Via Ollama for privacy-conscious users

#### Storage Architecture
- **Documents**: File system with Git-based version control
- **Vector Store**: ChromaDB (dev) / LanceDB (production)
- **Metadata**: SQLite for citation management and document relationships

## Technical Requirements

### Desktop Application
- Cross-platform (Windows, Mac, Linux)
- Based on VS Code Extension framework
- Local-first processing with optional cloud
- Sub-2 second document load times
- Handle 1000+ PDF libraries

### Web Version
- VS Code Web Extension compatibility
- Progressive Web App capabilities
- WebAssembly for performance-critical operations
- IndexedDB for client-side storage

## Success Metrics

1. **Adoption**: 10,000+ active researchers within first year
2. **Retention**: 60%+ monthly active usage
3. **Document Completion**: 50% reduction in time to complete papers
4. **Citation Accuracy**: 90%+ improvement in citation verification

## Constraints

1. Must maintain perfect .docx compatibility
2. Cannot break existing Word workflows
3. Must handle large PDFs (100+ pages) efficiently
4. Must preserve all formatting and metadata
5. Must work offline for desktop version