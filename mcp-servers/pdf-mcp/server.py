#!/usr/bin/env python3
"""
PDF MCP Server for ScienceStudio

Provides tools for Claude to extract content from academic PDFs:
- Text extraction
- Section detection (Abstract, Methods, Results, etc.)
- Figure/table extraction
- Citation/reference extraction
- Metadata extraction
"""

import asyncio
import json
from pathlib import Path
from typing import Any

import fitz  # PyMuPDF
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# Initialize MCP server
server = Server("pdf-mcp")


def extract_text(pdf_path: str) -> str:
    """Extract full text from PDF."""
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text


def extract_metadata(pdf_path: str) -> dict:
    """Extract metadata from PDF."""
    doc = fitz.open(pdf_path)
    metadata = doc.metadata

    # Try to extract DOI from first page
    first_page_text = doc[0].get_text() if len(doc) > 0 else ""
    doi = None
    import re
    doi_match = re.search(r'10\.\d{4,}/[^\s]+', first_page_text)
    if doi_match:
        doi = doi_match.group(0).rstrip('.,;')

    doc.close()

    return {
        "title": metadata.get("title", ""),
        "author": metadata.get("author", ""),
        "subject": metadata.get("subject", ""),
        "keywords": metadata.get("keywords", ""),
        "creator": metadata.get("creator", ""),
        "producer": metadata.get("producer", ""),
        "creation_date": metadata.get("creationDate", ""),
        "modification_date": metadata.get("modDate", ""),
        "doi": doi,
        "page_count": doc.page_count if hasattr(doc, 'page_count') else len(doc)
    }


def extract_sections(pdf_path: str) -> dict:
    """
    Attempt to extract common academic paper sections.
    Returns dict with section names as keys and text as values.
    """
    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    doc.close()

    # Common section headers in academic papers
    section_patterns = [
        "abstract",
        "introduction",
        "background",
        "related work",
        "literature review",
        "methods",
        "methodology",
        "materials and methods",
        "results",
        "findings",
        "discussion",
        "conclusion",
        "conclusions",
        "references",
        "bibliography",
        "acknowledgments",
        "appendix"
    ]

    import re
    sections = {}
    text_lower = full_text.lower()

    # Find section positions
    positions = []
    for pattern in section_patterns:
        # Match section headers (usually on their own line or with numbering)
        matches = list(re.finditer(
            rf'(?:^|\n)\s*(?:\d+\.?\s*)?{pattern}s?\s*(?:\n|$)',
            text_lower,
            re.IGNORECASE
        ))
        for match in matches:
            positions.append((match.start(), pattern, match.group()))

    # Sort by position
    positions.sort(key=lambda x: x[0])

    # Extract text between sections
    for i, (pos, name, _) in enumerate(positions):
        end_pos = positions[i + 1][0] if i + 1 < len(positions) else len(full_text)
        section_text = full_text[pos:end_pos].strip()

        # Clean up section name
        clean_name = name.replace(" ", "_")
        if clean_name not in sections:
            sections[clean_name] = section_text

    return sections


def extract_references(pdf_path: str) -> list:
    """
    Extract references/citations from the PDF.
    Returns list of reference strings.
    """
    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    doc.close()

    import re

    # Find References section
    ref_match = re.search(
        r'(?:references|bibliography)\s*\n',
        full_text,
        re.IGNORECASE
    )

    if not ref_match:
        return []

    ref_text = full_text[ref_match.end():]

    # Try to split into individual references
    # Common patterns: numbered [1], (1), 1., or bullet points
    references = []

    # Try numbered references
    numbered = re.split(r'\n\s*\[?\d+\]?\.?\s*', ref_text)
    if len(numbered) > 1:
        references = [ref.strip() for ref in numbered if ref.strip() and len(ref.strip()) > 20]

    return references[:100]  # Limit to 100 references


# Register tools with MCP server
@server.list_tools()
async def list_tools() -> list[Tool]:
    """List available PDF tools."""
    return [
        Tool(
            name="pdf_extract_text",
            description="Extract full text content from a PDF file",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Absolute path to the PDF file"
                    }
                },
                "required": ["path"]
            }
        ),
        Tool(
            name="pdf_get_metadata",
            description="Get metadata from a PDF (title, author, DOI, page count, etc.)",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Absolute path to the PDF file"
                    }
                },
                "required": ["path"]
            }
        ),
        Tool(
            name="pdf_extract_sections",
            description="Extract common academic paper sections (Abstract, Introduction, Methods, Results, Discussion, etc.)",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Absolute path to the PDF file"
                    }
                },
                "required": ["path"]
            }
        ),
        Tool(
            name="pdf_extract_references",
            description="Extract the references/bibliography from a PDF",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Absolute path to the PDF file"
                    }
                },
                "required": ["path"]
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """Handle tool calls."""
    path = arguments.get("path", "")

    if not Path(path).exists():
        return [TextContent(type="text", text=f"Error: File not found: {path}")]

    if not path.lower().endswith(".pdf"):
        return [TextContent(type="text", text=f"Error: Not a PDF file: {path}")]

    try:
        if name == "pdf_extract_text":
            text = extract_text(path)
            return [TextContent(type="text", text=text)]

        elif name == "pdf_get_metadata":
            metadata = extract_metadata(path)
            return [TextContent(type="text", text=json.dumps(metadata, indent=2))]

        elif name == "pdf_extract_sections":
            sections = extract_sections(path)
            return [TextContent(type="text", text=json.dumps(sections, indent=2))]

        elif name == "pdf_extract_references":
            refs = extract_references(path)
            return [TextContent(type="text", text=json.dumps(refs, indent=2))]

        else:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]

    except Exception as e:
        return [TextContent(type="text", text=f"Error processing PDF: {str(e)}")]


async def main():
    """Run the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)


if __name__ == "__main__":
    asyncio.run(main())
