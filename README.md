# @arcaelas/rag

[![npm version](https://badge.fury.io/js/@arcaelas%2Frag.svg)](https://www.npmjs.com/package/@arcaelas/rag)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

MCP server with Ollama + Vectra for semantic memory and RAG operations.

**Build intelligent AI agents with persistent semantic memory** - Store, search, and retrieve knowledge using vector embeddings, powered by local Ollama models and Vectra vector database.

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
git clone https://github.com/arcaelas/rag.git
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

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

See [SECURITY.md](SECURITY.md) for security policies and reporting vulnerabilities.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## License

MIT © Miguel Guevara (Arcaela)

## Links

- [npm Package](https://www.npmjs.com/package/@arcaelas/rag)
- [GitHub Repository](https://github.com/arcaelas/rag)
- [Issues & Bug Reports](https://github.com/arcaelas/rag/issues)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Ollama](https://ollama.com)

## Support

- 📧 Email: arcaela.reyes@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/arcaelas/rag/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/arcaelas/rag/discussions)
