# ScienceStudio

> **An IDE for Research** — Word + LaTeX + AI, local-first.

![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-Pre--Alpha-orange)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Mac%20%7C%20Linux-lightgrey)

> **A local-first research ideation and writing workspace** — combine ideas from many papers, stay focused while reading, and write in **Word or LaTeX** with grounded AI assistance.

---

## Why ScienceStudio exists

Researchers rarely write from a single source.

Real research writing looks like this:

* reading **10–50 PDFs**
* pulling **paragraphs, figures, and ideas** from many papers
* mentally grouping them into sections (“Related Work”, “Methods”, “Discussion”)
* jumping back and forth between text, references, and citations
* losing focus every time a citation sends you to the end of a paper

ScienceStudio was built around a simple question:

> **What if reading, collecting ideas, recombining them, and writing all happened in one focused workspace — without breaking context?**

---

## The core idea

ScienceStudio is a **research ideation layer** on top of Word and LaTeX.

It helps you:

* **consume knowledge** without losing focus
* **collect ideas** from many papers into shared, section-level memory
* **recombine and rewrite** those ideas into your own narrative
* **inspect citations inline**, instead of jumping away

AI is used to **assist synthesis**, not to fabricate content.

---

## What ScienceStudio enables (conceptually)

### 1. Idea collection across papers

While reading PDFs, you can:

* select paragraphs, figures, or claims
* attach them to a **global context** (e.g. “Introduction”, “Related Work”, “Discussion”)
* keep ideas from **multiple papers** grouped together

Think of it as:

> *a living scratchpad of evidence and ideas for each section of your paper.*

---

### 2. Section-level global memory

Each section of your paper can have:

* a shared pool of collected excerpts
* notes and paraphrases
* citations linked to their source PDFs

When you ask the AI to help rewrite or expand a section, it works from:

* **your selected ideas**
* **your actual papers**
* **your local context**

Not from vague internet priors.

---

### 3. Focused reading with inline citation previews

Traditional PDFs force you to:

> click citation → jump to references → lose reading context

ScienceStudio aims to keep you focused:

* citations open **inline on hover or popup**
* abstracts, metadata, or cited sections appear **in place**
* no forced jumps to the end of the document

Reading stays continuous.

---

### 4. Writing where synthesis happens

Writing happens **in the same editor** where:

* ideas were collected
* sources are visible
* citations are inspectable
* AI suggestions remain grounded

No copying between tools.
No mental context switching.

---

## What ScienceStudio is (and is not)

**ScienceStudio is:**

* a **research ideation & synthesis workspace**
* a **local-first assistant** grounded in your PDFs
* compatible with **Word (.docx) and LaTeX (.tex)**
* designed to support *how researchers actually think*

**ScienceStudio is not:**

* a Word or LaTeX replacement
* a general-purpose IDE
* a “write the paper for you” AI
* a cloud service that uploads your drafts

---

## Architecture (high level)

```
┌─────────────────────────────────────────────────────┐
│  Writing & Reading Interface                        │
│  ├── Word (.docx)                                   │
│  ├── LaTeX (.tex)                                   │
│  ├── PDF Reader with inline previews                │
│  └── Section-level idea memory                      │
├─────────────────────────────────────────────────────┤
│  AI Agent (user-chosen)                             │
│  ├── Claude Code (default)                          │
│  ├── OpenCode (GPT, Gemini, LLaMA, local models)    │
└───────────────┬─────────────────────────────────────┘
                │ MCP (tool protocol)
                ▼
┌─────────────────────────────────────────────────────┐
│  Research Tools (MCP Servers)                       │
│  ├── PDF extraction & navigation                    │
│  ├── Local semantic search over papers              │
│  ├── Citation lookup & metadata                     │
│  └── Document read/write helpers                    │
└─────────────────────────────────────────────────────┘
```

---

## Editors: Word and LaTeX (by design)

| Format           | Who typically uses it                          |
| ---------------- | ---------------------------------------------- |
| **Word (.docx)** | Biology, Medicine, Psychology, Social Sciences |
| **LaTeX (.tex)** | Math, Physics, CS, Engineering                 |

ScienceStudio does **not** force format migration.
It brings the **same ideation and synthesis workflow** to both.

---

## AI: assistive, not generative-first

ScienceStudio is **agent-agnostic**.

| Agent           | Models                      | Notes                    |
| --------------- | --------------------------- | ------------------------ |
| **Claude Code** | Claude 3.5 / 4              | Default, strong tool use |
| **OpenCode**    | GPT-4, Gemini, LLaMA, local | User choice              |

AI operates on:

* your selected ideas
* your section context
* your actual sources

Not on hallucinated citations.

---

## Current status (honest)

**Pre-alpha research prototype.**

What exists today:

* MCP servers for PDFs, library search, citations, docx
* local research toolchain
* VS Code extension skeleton

What is being built:

* inline ideation + writing commands
* Word (.docx) integration
* citation preview & focused reading UX

This is **not yet a polished editor** — it’s a foundation for a research workflow.

---

## Who this is for

* PhD students
* academic researchers
* anyone synthesizing ideas from **many papers into one narrative**

Especially relevant if you:

* constantly jump between PDFs and your draft
* lose focus when following citations
* write in Word *or* LaTeX
* want AI that respects evidence

---

## Contributing

ScienceStudio is open-source and early.

We especially welcome:

* research workflow & UX ideas
* reading / citation interaction designs
* ideation and synthesis primitives
* real researcher feedback

If you’ve ever thought
*“my problem isn’t writing — it’s combining ideas”* — this project is for you.

---

## License

MIT — open source, local-first, no lock-in.

---

**Your ideas stay local.**
**Your sources stay visible.**
**AI helps you think — not replace you.**


[Documentation](docs/) · [Issues](https://github.com/AIScienceStudio/ScienceStudio/issues) · [Discussions](https://github.com/AIScienceStudio/ScienceStudio/discussions)
