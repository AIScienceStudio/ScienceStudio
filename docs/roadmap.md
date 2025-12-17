# ScienceStudio Roadmap 🗺️

**Vision:** Build the "IDE for Science" by transforming VS Code into an Agentic Research Environment.  
**Strategy:** Start with VS Code Extension → Strip the "Coder" UI → Inject "Researcher" Tools → Connect the Agentic Brain.

---

## 🏗️ Phase 1: The "Zen" Foundation

**Goal:** A working, branded application that opens `.docx` files in a clean, distraction-free interface. **No AI yet.** Just a better writer than Word.

### 1.1. The VS Code Extension Setup
- [ ] Create VS Code Extension scaffold with TypeScript
- [ ] Successfully build with `npm run compile`
- [ ] Update `package.json`: Set name to **ScienceStudio**
- [ ] Design and add extension icon (Emerald theme)

### 1.2. The "De-Coding" (UI Cleanup)
- [ ] **Hide the Noise:** Configure to hide "Run", "Debug", and "Source Control" panels by default
- [ ] **Zen Status Bar:** Remove code-specific items, show "Word Count" only
- [ ] **Welcome View:** Replace default with "My Research" dashboard (Recent Papers, Thesis Progress)
- [ ] **Focus Mode Command:** Implement command to toggle minimal UI

### 1.3. The Writer (ProseMirror Integration)
- [ ] **Custom Editor API:** Register provider for `.docx` and `.research` files
- [ ] **The Webview:** Mount React app running **ProseMirror** inside editor pane
- [ ] **The Bridge:** Implement `vscode.postMessage` bridge for file system sync
- [ ] **Academic Styles:** Apply paper-appropriate CSS (Times New Roman, standard margins)
- [ ] **Basic .docx Import:** Use mammoth.js for initial conversion

**✅ Definition of Done:** You can install the extension, open `thesis.docx`, write formatted text, hit Save, and it persists correctly.

---

## 🧠 Phase 2: The "Read" Loop (PDF Intelligence)

**Goal:** The application becomes "aware" of the user's library. Drop 50 PDFs in, and the system indexes them intelligently.

### 2.1. The PDF Processing Pipeline
- [ ] **Library Folder:** Create workspace structure with `library/` folder
- [ ] **File Watcher:** Monitor for new PDF additions
- [ ] **PDF.js Integration:** Basic PDF rendering in custom editor
- [ ] **Text Extraction:** Extract text with layout preservation

### 2.2. The Ingestion Engine
- [ ] **Semantic Parser:** Integrate LlamaParse or MarkItDown for structure extraction
- [ ] **Section Detection:** Identify Abstract, Methods, Results, Discussion
- [ ] **Vector Storage:** Implement ChromaDB for semantic search
- [ ] **Metadata Extraction:** Parse title, authors, year, journal

### 2.3. The "Chat with Library" Feature
- [ ] **Sidebar Chat:** Add webview panel for AI interaction
- [ ] **Search Tool:** Implement `search_papers` command
- [ ] **Context Retrieval:** RAG pipeline with source citations
- [ ] **Example Queries:** "What methods did Smith 2023 use?" with accurate answers

**✅ Definition of Done:** Drop a folder of PDFs, ask "What do my papers say about cognitive load?", get accurate answer with sources.

---

## 🎓 Phase 3: The "Scholar" Loop (Citations & Context)

**Goal:** Move from "Chatbot" to "Research Assistant." Handle the strict rules and workflows of academia.

### 3.1. Citation Management
- [ ] **BibTeX Support:** Parse and manage `references.bib`
- [ ] **Citation Autocomplete:** Type `@` to trigger paper dropdown
- [ ] **Smart Citations:** Create citation nodes `<cite id="smith2023"/>` not just text
- [ ] **Reference List:** Auto-generate bibliography from used citations

### 3.2. The Research Context System
- [ ] **`RESEARCH.md`:** Create project context file that feeds every AI prompt
- [ ] **Document Awareness:** AI understands current section and structure
- [ ] **Writing Suggestions:** Context-aware next section recommendations
- [ ] **Argument Tracking:** Monitor claims and supporting evidence

### 3.3. The PDF-Document Link
- [ ] **Synchronized Highlighting:** Click citation → open PDF to exact location
- [ ] **Annotation Sync:** PDF highlights create notes in document
- [ ] **Evidence Linking:** Drag PDF text to create supported claim
- [ ] **Split View:** PDF and document side-by-side with sync scrolling

**✅ Definition of Done:** Write a page citing 5 papers with autocomplete, click any citation to verify source at exact page.

---

## 🚀 Phase 4: The "Power" Loop (Production Ready)

**Goal:** Handle real research workloads - 100+ page theses, 1000+ papers, zero data loss.

### 4.1. Performance & Scale
- [ ] **LanceDB Upgrade:** Implement high-performance vector store
- [ ] **Lazy Loading:** Stream large documents efficiently
- [ ] **Background Processing:** Non-blocking PDF analysis
- [ ] **Cache Strategy:** Smart caching for instant response

### 4.2. Version Control Integration
- [ ] **Auto-Save with Git:** Every save creates hidden commit
- [ ] **Time Travel UI:** Visual slider for document history
- [ ] **Diff Viewer:** See what changed between versions
- [ ] **Branch for Reviews:** Create branches for supervisor feedback

### 4.3. Professional Export
- [ ] **Perfect .docx Export:** Maintain all Word formatting
- [ ] **LaTeX Pipeline:** Clean .tex generation via Pandoc
- [ ] **Journal Templates:** One-click format for target journal
- [ ] **Submission Package:** Generate all required files

**✅ Definition of Done:** 100-page thesis with no lag, perfect Word export that professors think was native Word.

---

## 🌐 Phase 5: The Cloud & Collaboration

**Goal:** Enable anywhere access and team research via vscode.dev.

### 5.1. Web Extension
- [ ] **Browser Compatibility:** Full feature parity in browser
- [ ] **Cloud Storage:** Sync documents and library
- [ ] **Offline Mode:** Progressive web app capabilities
- [ ] **Mobile View:** Responsive design for tablets

### 5.2. Collaboration Features
- [ ] **Real-time Editing:** Multiple users in document
- [ ] **Comment Threads:** Contextual discussions
- [ ] **Shared Libraries:** Team PDF collections
- [ ] **Review Workflows:** Supervisor approval process

---

## 🔮 Phase 6: The Moonshots

- [ ] **Graph View:** Visualize paper connections like Obsidian
- [ ] **Podcast Mode:** AI converts papers to audio summaries
- [ ] **Writing Analytics:** Track productivity and progress
- [ ] **Grant Assistant:** Specialized mode for proposals
- [ ] **Peer Review Mode:** Anonymize and format for review
- [ ] **Citation Network:** Discover related papers automatically

---

## Key Differences from Original Approach

### Gemini's Insights Incorporated:
1. **Faster to Dogfooding**: Focus on working writer first, AI second
2. **Concrete Checkboxes**: More specific, actionable tasks
3. **Git Integration**: Version control as core feature, not afterthought
4. **MCP Architecture**: Consider Model Context Protocol for AI integration
5. **Clear "Definition of Done"**: Each phase has specific success criteria

### My Additions Retained:
1. **Performance Metrics**: Specific targets for speed and scale
2. **Market Validation**: User testing throughout
3. **Technical Decisions**: Explicit choice points
4. **Risk Mitigation**: Proactive problem solving

---

## Critical Path to First User (Your Girlfriend)

**Week 1-2**: Phase 1.1-1.2 (Extension scaffold + UI cleanup)  
**Week 3-4**: Phase 1.3 (Basic ProseMirror)  
**Week 5-6**: Phase 2.1-2.2 (PDF viewing + extraction)  
**Week 7-8**: Phase 2.3 (Basic chat)  
**Week 9**: First user test → "Can you write a page of your thesis?"

After this milestone, development is guided by real user feedback.