# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-31

### Added
- Initial release of @arcaelas/rag
- MCP server with semantic memory using Ollama + Vectra
- Tools: `save`, `search`, `list`, `get`, `tag`, `destroy`
- Bulk operations: `upload` (import JSONL), `download` (export JSONL)
- Automatic embedding dimensions detection
- Support for metadata and tags
- Zero-configuration setup with sensible defaults
- Works with npx without global installation

### Features
- **Semantic Search**: Vector-based similarity search using Ollama embeddings
- **Local Storage**: Data stored in `~/.cache/@arcaelas/rag/data/` for npx usage
- **JSONL Import/Export**: Bulk operations for backup and migration
- **Minimal Configuration**: Only 2 environment variables (with defaults)
- **Error Handling**: Detailed error reporting with line numbers for failed imports

### Configuration
- `OLLAMA_HOSTNAME`: Ollama server URL (default: `http://localhost:11434`)
- `OLLAMA_MODEL_NAME`: Embedding model (default: `nomic-embed-text`)

[1.0.0]: https://github.com/arcaelas/rag/releases/tag/v1.0.0
