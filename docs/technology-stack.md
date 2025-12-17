# ScienceStudio Technology Stack

## Core Platform

### VS Code Extension Framework
- **Base**: VS Code Extension API v1.90+
- **Custom Editor API**: For .docx file handling
- **Webview API**: For ProseMirror integration
- **Language**: TypeScript 5.0+
- **Build System**: Webpack 5 with esbuild loader

## Frontend Technologies

### Document Editor
- **ProseMirror**: Core rich text editing engine
  - prosemirror-state
  - prosemirror-view
  - prosemirror-model
  - prosemirror-transform
  - prosemirror-schema-basic
- **React 18**: UI components and state management
- **MobX**: State management for document state
- **TailwindCSS**: Styling framework

### PDF Processing
- **PDF.js**: Mozilla's PDF rendering library
- **pdfplumber** (Python): Advanced PDF text extraction
- **LlamaParse API**: Semantic PDF parsing (optional cloud service)

## Backend Technologies

### Local Processing (Extension Host)
- **Node.js 18+**: Runtime environment
- **TypeScript**: Type-safe development
- **SQLite**: Local document and citation database
- **Chroma/LanceDB**: Vector database for semantic search

### Document Processing
- **mammoth.js**: .docx to HTML conversion
- **pandoc-js**: Document format conversions
- **docx**: Programmatic .docx creation and manipulation
- **unified**: AST-based document processing pipeline

### AI Integration
- **LangChain.js**: AI orchestration framework
- **OpenAI API**: GPT-4 integration
- **Anthropic API**: Claude integration
- **Ollama**: Local LLM support (optional)

## Cloud Infrastructure (Phase 2+)

### Web Extension
- **VS Code Web Extension API**: Browser compatibility
- **IndexedDB**: Client-side storage
- **WebAssembly**: Performance-critical operations

### Backend Services
- **Framework**: Express.js or Fastify
- **Database**: PostgreSQL with pgvector
- **Cache**: Redis
- **Object Storage**: S3-compatible for PDFs
- **Queue**: BullMQ for PDF processing jobs

### Deployment
- **Container**: Docker with multi-stage builds
- **Orchestration**: Kubernetes or AWS ECS
- **CDN**: CloudFront or Cloudflare
- **API Gateway**: Kong or AWS API Gateway

## Development Tools

### Code Quality
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Jest**: Unit testing
- **Playwright**: E2E testing
- **Storybook**: Component development

### Build & CI/CD
- **GitHub Actions**: CI/CD pipeline
- **Turbo**: Monorepo build system
- **Changesets**: Version management
- **Semantic Release**: Automated releases

## Data Models

### Document Schema
```typescript
interface ResearchDocument {
  id: string;
  title: string;
  sections: Section[];
  citations: Citation[];
  figures: Figure[];
  tables: Table[];
  metadata: DocumentMetadata;
  version: number;
}

interface Section {
  id: string;
  type: 'abstract' | 'introduction' | 'methods' | 'results' | 'discussion' | 'references';
  content: ProseMirrorNode;
  claims: Claim[];
}

interface Citation {
  id: string;
  key: string; // e.g., "Smith2023"
  source: PDFReference;
  metadata: CitationMetadata;
}
```

## Security Considerations

### Data Protection
- **Encryption**: AES-256 for local storage
- **Authentication**: OAuth2 for cloud features
- **API Keys**: Secure storage in VS Code Secret Storage API
- **CORS**: Strict origin policies for web version

### Privacy
- **Local-First**: All processing happens locally by default
- **Opt-In Cloud**: Explicit user consent for cloud features
- **Data Isolation**: Tenant isolation for cloud version
- **GDPR Compliance**: Data export and deletion capabilities

## Performance Targets

- **Document Load**: < 2 seconds for 100-page document
- **PDF Search**: < 500ms for semantic search across 100 PDFs
- **AI Response**: < 3 seconds for context-aware suggestions
- **Export Time**: < 5 seconds for complex .docx export

## Integration Points

### External Services
- **Zotero**: Citation management integration
- **Mendeley**: Reference import
- **Google Scholar**: Citation search
- **CrossRef**: DOI resolution
- **Unpaywall**: Open access paper detection

### File Format Support
- **Import**: .docx, .tex, .md, .pdf, .bib
- **Export**: .docx, .tex, .md, .pdf
- **Real-time**: .rtf, .odt (future)