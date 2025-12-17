#!/usr/bin/env python3
"""
Library MCP Server for ScienceStudio

Provides vector search over user's PDF library:
- Index PDFs into vector database
- Semantic search across papers
- Get relevant context with sources
"""

import asyncio
import json
import hashlib
from pathlib import Path
from typing import Any, Optional

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# Initialize MCP server
server = Server("library-mcp")

# Global state for the library
LIBRARY_PATH = Path.home() / ".sciencestudio" / "library"
DB_PATH = LIBRARY_PATH / "chroma_db"

# Lazy-loaded components
_chroma_client = None
_collection = None
_embedding_model = None


def get_chroma_client():
    """Lazy-load ChromaDB client."""
    global _chroma_client, _collection
    if _chroma_client is None:
        import chromadb
        LIBRARY_PATH.mkdir(parents=True, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(path=str(DB_PATH))
        _collection = _chroma_client.get_or_create_collection(
            name="papers",
            metadata={"hnsw:space": "cosine"}
        )
    return _chroma_client, _collection


def get_embedding_model():
    """Lazy-load sentence transformer model."""
    global _embedding_model
    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer
        _embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    return _embedding_model


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk.strip())
        start += chunk_size - overlap
    return chunks


def generate_doc_id(path: str, chunk_index: int) -> str:
    """Generate unique ID for a document chunk."""
    path_hash = hashlib.md5(path.encode()).hexdigest()[:8]
    return f"{path_hash}_{chunk_index}"


def index_pdf(pdf_path: str) -> dict:
    """Index a PDF into the vector database."""
    import fitz  # PyMuPDF

    path = Path(pdf_path)
    if not path.exists():
        return {"success": False, "error": f"File not found: {pdf_path}"}

    if not path.suffix.lower() == ".pdf":
        return {"success": False, "error": f"Not a PDF: {pdf_path}"}

    # Extract text
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()

    # Get metadata
    metadata = doc.metadata
    title = metadata.get("title", path.stem)
    author = metadata.get("author", "Unknown")
    doc.close()

    if not text.strip():
        return {"success": False, "error": "No text content found in PDF"}

    # Chunk the text
    chunks = chunk_text(text)

    if not chunks:
        return {"success": False, "error": "No chunks generated"}

    # Get embeddings
    model = get_embedding_model()
    embeddings = model.encode(chunks).tolist()

    # Store in ChromaDB
    _, collection = get_chroma_client()

    # Generate IDs and prepare data
    ids = [generate_doc_id(pdf_path, i) for i in range(len(chunks))]
    metadatas = [
        {
            "source": str(pdf_path),
            "title": title,
            "author": author,
            "chunk_index": i,
            "total_chunks": len(chunks)
        }
        for i in range(len(chunks))
    ]

    # Remove existing entries for this file
    try:
        existing = collection.get(where={"source": str(pdf_path)})
        if existing["ids"]:
            collection.delete(ids=existing["ids"])
    except Exception:
        pass  # Collection might be empty

    # Add new entries
    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas
    )

    return {
        "success": True,
        "path": str(pdf_path),
        "title": title,
        "chunks_indexed": len(chunks)
    }


def search_library(query: str, limit: int = 5) -> list[dict]:
    """Search the library for relevant content."""
    _, collection = get_chroma_client()

    # Check if collection has any documents
    if collection.count() == 0:
        return []

    model = get_embedding_model()
    query_embedding = model.encode([query]).tolist()

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(limit, collection.count())
    )

    # Format results
    formatted = []
    for i, doc in enumerate(results["documents"][0]):
        formatted.append({
            "content": doc,
            "source": results["metadatas"][0][i].get("source", "Unknown"),
            "title": results["metadatas"][0][i].get("title", "Unknown"),
            "relevance_score": 1 - results["distances"][0][i] if results["distances"] else None
        })

    return formatted


def list_indexed_papers() -> list[dict]:
    """List all indexed papers."""
    _, collection = get_chroma_client()

    if collection.count() == 0:
        return []

    # Get all unique sources
    all_data = collection.get()

    papers = {}
    for metadata in all_data["metadatas"]:
        source = metadata.get("source", "Unknown")
        if source not in papers:
            papers[source] = {
                "path": source,
                "title": metadata.get("title", "Unknown"),
                "author": metadata.get("author", "Unknown"),
                "chunks": metadata.get("total_chunks", 0)
            }

    return list(papers.values())


def remove_paper(pdf_path: str) -> dict:
    """Remove a paper from the index."""
    _, collection = get_chroma_client()

    try:
        existing = collection.get(where={"source": str(pdf_path)})
        if existing["ids"]:
            collection.delete(ids=existing["ids"])
            return {"success": True, "removed": str(pdf_path)}
        else:
            return {"success": False, "error": "Paper not found in index"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# Register tools with MCP server
@server.list_tools()
async def list_tools() -> list[Tool]:
    """List available library tools."""
    return [
        Tool(
            name="library_index_pdf",
            description="Index a PDF file into the research library for semantic search",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Absolute path to the PDF file to index"
                    }
                },
                "required": ["path"]
            }
        ),
        Tool(
            name="library_search",
            description="Search the research library for content relevant to a query",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query (natural language)"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results (default: 5)",
                        "default": 5
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="library_list_papers",
            description="List all papers currently indexed in the library",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="library_remove",
            description="Remove a paper from the library index",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path of the PDF to remove from index"
                    }
                },
                "required": ["path"]
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """Handle tool calls."""
    try:
        if name == "library_index_pdf":
            result = index_pdf(arguments["path"])
            return [TextContent(type="text", text=json.dumps(result, indent=2))]

        elif name == "library_search":
            query = arguments["query"]
            limit = arguments.get("limit", 5)
            results = search_library(query, limit)
            return [TextContent(type="text", text=json.dumps(results, indent=2))]

        elif name == "library_list_papers":
            papers = list_indexed_papers()
            return [TextContent(type="text", text=json.dumps(papers, indent=2))]

        elif name == "library_remove":
            result = remove_paper(arguments["path"])
            return [TextContent(type="text", text=json.dumps(result, indent=2))]

        else:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]

    except Exception as e:
        return [TextContent(type="text", text=f"Error: {str(e)}")]


async def main():
    """Run the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)


if __name__ == "__main__":
    asyncio.run(main())
