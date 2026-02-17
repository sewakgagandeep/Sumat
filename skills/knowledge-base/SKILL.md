---
name: knowledge-base
description: Simple RAG (Retrieval-Augmented Generation) system for document knowledge. Indexes Markdown/Text files in the workspace and allows semantic searching.
tools:
  - read_file
  - list_dir
  - memory_store
  - memory_retrieve
dependencies: []
---

# Knowledge Base Skill

Index and search documentation within the workspace.

## Concept

Sumat uses its **Memory** system and **File System** as a knowledge base.

-   **Indexing**: "Read all docs in /docs and memorize key concepts."
-   **Retrieval**: "Search memory/files for 'deployment'."

## Usage

### 1. Indexing (Manual/Agent-Driven)

"Scan the `docs/` folder and summarize the architecture."

1.  Agent runs `list_dir("docs")`.
2.  Agent reads each file `read_file("docs/arch.md")`.
3.  Agent stores summary in memory:
    `memory_store("docs:arch", "The system uses a microservices architecture...", "knowledge")`

### 2. Retrieval

"How do I deploy the app?"

1.  Agent checks memory: `memory_retrieve("deploy")`.
2.  Agent checks files: `list_dir("docs")` -> finds `deployment.md`.
3.  Agent reads `deployment.md` and generates an answer.

## File Organization

Keep your knowledge base in a dedicated folder, e.g., `knowledge/` or `docs/`.
-   `docs/api.md`
-   `docs/setup.md`
-   `docs/troubleshooting.md`

## Future Expansion

-   **Vector Database**: Integration with vector stores (Chroma, Pinecone) for semantic search over millions of tokens.
-   **PDF Parsing**: Use a PDF tool to read binary docs.
