# @arcaelas/rag

MCP server with Ollama + Vectra for semantic memory and RAG operations.

## Features

- 🧠 **Semantic memory** with vector embeddings
- 🔍 **Semantic search** using similarity
- 📦 **Bulk import/export** via JSONL
- 🚀 **Local-first** with Ollama and Vectra
- 🔧 **Zero configuration** with sensible defaults

## Prerequisites

- Node.js >= 18
- [Ollama](https://ollama.com) running locally
- An embedding model installed (e.g., `ollama pull nomic-embed-text`)

## Installation

### Using npx (recommended)

Add to your `~/.claude.json`:

```json
{
  "mcpServers": {
    "rag": {
      "command": "npx",
      "args": ["-y", "@arcaelas/rag"],
      "env": {
        "OLLAMA_HOSTNAME": "http://localhost:11434",
        "OLLAMA_MODEL_NAME": "nomic-embed-text"
      }
    }
  }
}
```

### Global installation

```bash
npm install -g @arcaelas/rag

# Or with yarn
yarn global add @arcaelas/rag
```

Then in `~/.claude.json`:

```json
{
  "mcpServers": {
    "rag": {
      "command": "rag",
      "args": [],
      "env": {
        "OLLAMA_HOSTNAME": "http://localhost:11434",
        "OLLAMA_MODEL_NAME": "nomic-embed-text"
      }
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_HOSTNAME` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL_NAME` | `nomic-embed-text` | Embedding model name |

## Available Tools

### `save(content, metadata?)`
Save knowledge to semantic memory database.

```typescript
await save("TypeScript is a typed superset of JavaScript", {
  category: "programming",
  importance: "high"
})
```

### `search(query, limit?)`
Search knowledge base using semantic similarity.

```typescript
await search("typed javascript", 5)
```

### `list(offset?, limit?)`
List stored memories with pagination.

```typescript
await list(0, 10)
```

### `get(id)`
Retrieve specific memory by ID.

```typescript
await get("uuid-here")
```

### `tag(id, tag)`
Add tag to a memory.

```typescript
await tag("uuid-here", "important")
```

### `destroy(id)`
Permanently delete a memory.

```typescript
await destroy("uuid-here")
```

### `upload(filename)`
Bulk import memories from JSONL file.

```typescript
await upload("/path/to/memories.jsonl")
// Returns: { filename, done: 299, error: [{ line: 297, error: "..." }] }
```

### `download(offset?, limit?, filename?)`
Export memories to JSONL file.

```typescript
await download(0, 100, "/path/to/export.jsonl")
// Returns: { filename, offset, limit, count: 303 }
```

## JSONL Format

Each line in the JSONL file should be:

```json
{"context": "Your knowledge content here"}
```

Optional fields:

```json
{
  "context": "Content here",
  "metadata": {
    "category": "programming",
    "importance": "high",
    "project": "my-project"
  },
  "tags": "tag1,tag2,tag3"
}
```

## Data Storage

Vector database is stored in:
- **npx/global install**: `~/.cache/@arcaelas/rag/data/`
- **Local install**: `<project-root>/data/`

Collection name: `arcaelas_mcp_rag_collection`

## Development

```bash
# Clone repository
git clone https://github.com/arcaela/rag.git
cd rag

# Install dependencies
yarn install

# Build
yarn build

# Run locally
yarn start

# Watch mode
yarn dev
```

## License

MIT © Miguel Guevara (Arcaela)

## Links

- [GitHub](https://github.com/arcaela/rag)
- [Issues](https://github.com/arcaela/rag/issues)
- [npm](https://www.npmjs.com/package/@arcaelas/rag)
