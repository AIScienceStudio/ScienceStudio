#!/usr/bin/env python3
"""
Citation MCP Server for ScienceStudio

Provides tools for Claude to look up and verify academic citations:
- Search Semantic Scholar
- DOI lookup
- BibTeX retrieval
- Find related papers
"""

import asyncio
import json
from typing import Any

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# Initialize MCP server
server = Server("citation-mcp")

# Semantic Scholar API base URL
SEMANTIC_SCHOLAR_API = "https://api.semanticscholar.org/graph/v1"


async def search_papers(query: str, limit: int = 10) -> list[dict]:
    """Search for papers on Semantic Scholar."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SEMANTIC_SCHOLAR_API}/paper/search",
            params={
                "query": query,
                "limit": limit,
                "fields": "title,authors,year,abstract,citationCount,url,externalIds"
            },
            timeout=30.0
        )
        response.raise_for_status()
        data = response.json()

        papers = []
        for paper in data.get("data", []):
            authors = [a.get("name", "") for a in paper.get("authors", [])]
            external_ids = paper.get("externalIds", {})

            papers.append({
                "title": paper.get("title", ""),
                "authors": authors,
                "year": paper.get("year"),
                "abstract": paper.get("abstract", ""),
                "citation_count": paper.get("citationCount", 0),
                "url": paper.get("url", ""),
                "doi": external_ids.get("DOI"),
                "arxiv_id": external_ids.get("ArXiv"),
                "paper_id": paper.get("paperId")
            })

        return papers


async def lookup_doi(doi: str) -> dict:
    """Look up a paper by DOI."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SEMANTIC_SCHOLAR_API}/paper/DOI:{doi}",
            params={
                "fields": "title,authors,year,abstract,citationCount,url,externalIds,references,citations"
            },
            timeout=30.0
        )
        response.raise_for_status()
        paper = response.json()

        authors = [a.get("name", "") for a in paper.get("authors", [])]

        return {
            "title": paper.get("title", ""),
            "authors": authors,
            "year": paper.get("year"),
            "abstract": paper.get("abstract", ""),
            "citation_count": paper.get("citationCount", 0),
            "url": paper.get("url", ""),
            "reference_count": len(paper.get("references", [])),
            "citing_paper_count": len(paper.get("citations", []))
        }


async def get_bibtex(doi: str) -> str:
    """Get BibTeX citation for a DOI."""
    async with httpx.AsyncClient() as client:
        # CrossRef provides BibTeX
        response = await client.get(
            f"https://api.crossref.org/works/{doi}/transform/application/x-bibtex",
            timeout=30.0
        )
        if response.status_code == 200:
            return response.text

        # Fallback: construct basic BibTeX from Semantic Scholar data
        paper = await lookup_doi(doi)
        first_author = paper["authors"][0].split()[-1] if paper["authors"] else "Unknown"
        year = paper.get("year", "")
        key = f"{first_author}{year}"

        bibtex = f"""@article{{{key},
    title = {{{paper['title']}}},
    author = {{{' and '.join(paper['authors'])}}},
    year = {{{year}}},
    doi = {{{doi}}}
}}"""
        return bibtex


async def find_related(paper_id: str, limit: int = 10) -> list[dict]:
    """Find papers related to a given paper."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SEMANTIC_SCHOLAR_API}/paper/{paper_id}/references",
            params={
                "limit": limit,
                "fields": "title,authors,year,citationCount"
            },
            timeout=30.0
        )
        response.raise_for_status()
        data = response.json()

        related = []
        for ref in data.get("data", []):
            cited = ref.get("citedPaper", {})
            if cited:
                authors = [a.get("name", "") for a in cited.get("authors", [])]
                related.append({
                    "title": cited.get("title", ""),
                    "authors": authors,
                    "year": cited.get("year"),
                    "citation_count": cited.get("citationCount", 0)
                })

        return related


# Register tools with MCP server
@server.list_tools()
async def list_tools() -> list[Tool]:
    """List available citation tools."""
    return [
        Tool(
            name="citation_search",
            description="Search for academic papers by keywords or topic",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query (keywords, topic, or paper title)"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results (default: 10)",
                        "default": 10
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="citation_lookup_doi",
            description="Look up detailed information about a paper by its DOI",
            inputSchema={
                "type": "object",
                "properties": {
                    "doi": {
                        "type": "string",
                        "description": "DOI of the paper (e.g., '10.1038/nature12373')"
                    }
                },
                "required": ["doi"]
            }
        ),
        Tool(
            name="citation_get_bibtex",
            description="Get BibTeX citation entry for a paper by DOI",
            inputSchema={
                "type": "object",
                "properties": {
                    "doi": {
                        "type": "string",
                        "description": "DOI of the paper"
                    }
                },
                "required": ["doi"]
            }
        ),
        Tool(
            name="citation_find_related",
            description="Find papers related to (cited by or citing) a given paper",
            inputSchema={
                "type": "object",
                "properties": {
                    "paper_id": {
                        "type": "string",
                        "description": "Semantic Scholar paper ID"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results (default: 10)",
                        "default": 10
                    }
                },
                "required": ["paper_id"]
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """Handle tool calls."""
    try:
        if name == "citation_search":
            results = await search_papers(
                arguments["query"],
                arguments.get("limit", 10)
            )
            return [TextContent(type="text", text=json.dumps(results, indent=2))]

        elif name == "citation_lookup_doi":
            paper = await lookup_doi(arguments["doi"])
            return [TextContent(type="text", text=json.dumps(paper, indent=2))]

        elif name == "citation_get_bibtex":
            bibtex = await get_bibtex(arguments["doi"])
            return [TextContent(type="text", text=bibtex)]

        elif name == "citation_find_related":
            related = await find_related(
                arguments["paper_id"],
                arguments.get("limit", 10)
            )
            return [TextContent(type="text", text=json.dumps(related, indent=2))]

        else:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]

    except httpx.HTTPStatusError as e:
        return [TextContent(type="text", text=f"API error: {e.response.status_code}")]
    except Exception as e:
        return [TextContent(type="text", text=f"Error: {str(e)}")]


async def main():
    """Run the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)


if __name__ == "__main__":
    asyncio.run(main())
