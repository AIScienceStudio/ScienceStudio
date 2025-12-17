# ScienceStudio Market Research

## Academic Writing Tool Usage

### Overview

| Tool | Est. Usage | Primary Users |
|------|------------|---------------|
| **MS Word** | 60-70% | Biology, Medicine, Social Sciences, Humanities |
| **LaTeX** | 10-30% | Math, Physics, CS, Engineering |
| **Google Docs** | 10-20% | Collaboration, Early Drafts |

*Note: No formal peer-reviewed survey exists. Estimates from academic forums and community data.*

### By Discipline

| Field | Primary Tool | Notes |
|-------|--------------|-------|
| Mathematics | LaTeX (90%+) | Equations, proofs require LaTeX |
| Theoretical Physics | LaTeX (90%+) | Heavy math, arXiv submissions |
| Computer Science | LaTeX (70-80%) | Conferences require LaTeX |
| Engineering | Mixed (50/50) | Depends on subfield |
| Biology | Word (80%+) | Journals accept Word |
| Medicine | Word (90%+) | Clinical journals prefer Word |
| Social Sciences | Word (85%+) | APA formatting in Word |
| Humanities | Word (90%+) | Track changes for editing |
| Law | Word (95%+) | Track changes essential |

### Key Insights

1. **Word dominates overall** - Most researchers use Word/Docs
2. **LaTeX dominates STEM math-heavy fields** - Non-negotiable for equations
3. **Collaboration drives Google Docs** - But final submission usually Word/LaTeX
4. **Journal requirements matter** - Many journals require specific formats

### Why Support Both?

**Word (.docx) via OnlyOffice:**
- 60-70% of researchers
- Required by most journals
- Track changes for co-author collaboration
- Familiar to advisors/reviewers

**LaTeX (.tex) via Custom Editor:**
- 10-30% of researchers (but 70-90% in STEM math fields)
- Required by CS/Math/Physics conferences (ACM, IEEE, arXiv)
- Better equation support
- Version control friendly (plain text)

**Combined Coverage:** ~95%+ of academic researchers

### Competitor Analysis

| Tool | Word | LaTeX | AI | Local |
|------|------|-------|-----|-------|
| MS Word | ✅ | ❌ | ✅ Copilot | ❌ |
| Google Docs | ✅ | ❌ | ✅ Gemini | ❌ |
| Overleaf | ❌ | ✅ | ❌ | ❌ |
| **ScienceStudio** | ✅ | ✅ | ✅ | ✅ |

**Our differentiator:** Only tool that supports BOTH Word AND LaTeX with AI assistance AND local-first architecture.

---

## Why Not Notion or Obsidian?

The difference comes down to one word: **Output.**

### The "Almost, But Not Quite" Competitors

Everything else fails on one of our three core pillars: **IDE-Grade**, **Native `.docx`**, or **Agentic**.

| Product | The Limitation (Why it fails our user) |
|---------|----------------------------------------|
| **Notion** | **It's a Wiki, not a Document.** Creates "Blocks," not "Pages." Cannot format to strict APA/Harvard guidelines with 1-inch margins and page breaks. Impossible to submit a Notion doc to a journal. Cloud-only (HIPAA/GDPR risk). |
| **Obsidian** | **It's for Notes (PKM), not Publishing.** Markdown is amazing for *thinking*, but terrible for *publishing* strict academic papers. "Pandoc Hell" converting to formatted `.docx`. No "Project" view—doesn't understand relationships between Data, Scripts, and Manuscript. |
| **Zettlr** | **Markdown Only.** Forces researchers to write in Markdown and "export" to Word. Breaks formatting, comments, and track-changes. "Note Taking" app, not "Production" environment. |
| **Cursor / Windsurf** | **Code Only.** Fantastic Agentic IDEs, but view PDF or `.docx` as binary blobs. Cannot "refactor" a paragraph of text—optimized for ASTs of code, not semantic arguments. |
| **OnlyOffice Desktop** | **Not an IDE.** Has an "AI Plugin" (ChatGPT/LM Studio sidebar), but it's just a chatbot. No "Project View," Git integration, or programmable API to build a "Research Loop". |
| **Overleaf** | **LaTeX Only.** Alienates the 90% of researchers (Bio, Psych, Med) who *must* use Microsoft Word. Cloud-only (privacy risk). |

### The Key Insight

- **Obsidian** helps you *remember*.
- **ScienceStudio** helps you *produce*.

Because we use **OnlyOffice**, we are WYSIWYG (What You See Is What You Get). The file you see on screen is *exactly* the file the professor receives. No conversion errors.

### Why Our Stack is Unique

The specific combination of **VS Code (Shell)** + **OnlyOffice (Canvas)** + **Local Agent (Brain)** has never been built before.

- **The "Science Writer" Extension:** A VS Code extension exists, but it's just snippets for Markdown. Not a WYSIWYG editor.
- **The "LM Studio" Plugin:** OnlyOffice has an LLM plugin, but it creates a *chatbot*, not an *Agent*. Cannot "Plan" a thesis or "Verify" citations against a library.

### The OnlyOffice Strategic Advantage

Using **OnlyOffice** instead of building a ProseMirror editor from scratch:

**Pros:**
- **Zero Format Risk:** OnlyOffice uses `.docx` (OOXML) natively. 100% Word compatibility guaranteed.
- **Dev Time Saved:** Don't build toolbar, ruler, spellcheck, or comments—all built-in.
- **Bonus:** Excel editing for data files comes free.

**Cons (Solved):**
- **"Black Box" Problem:** Can't inject HTML like ProseMirror.
- **Solution:** Use the **OnlyOffice Connector API** to send commands: `connector.executeCommand("InsertText", { text: "..." })`

### The Pitch Response

If anyone asks "Why not Obsidian?", say:

> "Obsidian is for taking notes. ScienceStudio is for publishing science.
> We use the engine of VS Code to manage your data, and the engine of OnlyOffice to guarantee your formatting. It is the only Local-First environment where you can code your analysis and write your paper in the same window."

**Positioning:** We are building **"Cursor for Scientists."** It does not exist, and the market is wide open.

### Reference

- [Top 7 Open Source AI Agent Frameworks (YouTube)](https://www.youtube.com/watch?v=F8NKVhkZZWI) - Validates that current frameworks (CrewAI, AutoGen) are raw tools for developers, not polished IDEs for end-users like researchers.

### Target User Segments

**Segment 1: Psychology/Biology PhD (Word users)**
- Primary persona (Andy's girlfriend)
- 50-100 PDFs, writes in Word
- Needs: Citation management, evidence finding
- Tool: OnlyOffice + MCP servers

**Segment 2: CS/Math PhD (LaTeX users)**
- Writes papers in LaTeX
- Submits to arXiv, ACM, IEEE
- Needs: BibTeX management, equation help
- Tool: LaTeX editor + MCP servers

**Segment 3: Cross-disciplinary Researcher**
- Sometimes Word, sometimes LaTeX
- Collaborates with people in both camps
- Needs: Both tools in one place
- Tool: ScienceStudio (both editors)

### Market Size (Rough Estimates)

| Segment | Global Estimate |
|---------|-----------------|
| PhD Students | ~3-4 million |
| Postdocs | ~500k |
| Professors | ~2 million |
| Research Staff | ~1 million |
| **Total** | **~7 million researchers** |

Even 1% penetration = 70,000 users

### Pricing Benchmarks

| Tool | Pricing |
|------|---------|
| Overleaf | Free / $15-30/mo premium |
| Mendeley | Free / $5/mo |
| Zotero | Free |
| Grammarly | $12-30/mo |
| Notion AI | $10/mo |
| ChatGPT Plus | $20/mo |

**Potential pricing:**
- Free tier: Local-only, limited AI
- Pro tier: $10-20/mo (cloud sync, unlimited AI)
- Team tier: $20-30/mo (collaboration features)

---

*Last updated: December 2024*
