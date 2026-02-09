#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "./lib/config.js";
import * as rag from "./lib/rag.js";
import { ollama_client } from "./lib/axios.js";
import * as schemas from "./schemas.js";

const server = new McpServer({
  name: "rag-memory-server",
  version: "3.0.0",
});

function ok(data: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(data, null, 2) },
    ],
  };
}

// Tool: remember
server.registerTool(
  "remember",
  {
    description:
      "Store short knowledge in semantic memory. Use for facts, preferences, conventions, or any brief data that should persist. For long text or files, use 'document' instead.",
    inputSchema: schemas.remember,
  },
  async ({ content, tags }) => ok(await rag.remember(content, tags))
);

// Tool: document
server.registerTool(
  "document",
  {
    description:
      "Ingest long text or files. Automatically splits into overlapping chunks, embeds each chunk, and stores with document-chunk hierarchy. Provide 'content' or 'filename'.",
    inputSchema: schemas.document,
  },
  async ({ content, filename, tags }) =>
    ok(await rag.ingest({ content, filename, tags }))
);

// Tool: recall
server.registerTool(
  "recall",
  {
    description:
      "Semantic search across the knowledge base. Returns fully assembled text per document, ranked by relevance. Enable 'hyde' for question-style queries to improve retrieval accuracy.",
    inputSchema: schemas.recall,
  },
  async ({ query, limit, threshold, tags, hyde }) =>
    ok(await rag.recall({ query, limit, threshold, tags, hyde }))
);

// Tool: forget
server.registerTool(
  "forget",
  {
    description:
      "Delete documents or memories by ID with cascade. Removes all associated chunks from the vector index. Accepts a single ID or an array of IDs.",
    inputSchema: schemas.forget,
  },
  async ({ ids }) => ok(await rag.forget(ids))
);

// Tool: list
server.registerTool(
  "list",
  {
    description:
      "List stored documents and memories with pagination. Returns preview, tags, type, and chunk count per entry. Optionally filter by tags.",
    inputSchema: schemas.list,
  },
  async ({ offset, limit, tags }) => ok(await rag.list(offset, limit, tags))
);

// Tool: download
server.registerTool(
  "download",
  {
    description:
      "Export the knowledge base as paginated JSONL. Each line is a complete entry with fully assembled content, type, and tags. Useful for backups or migration.",
    inputSchema: schemas.download,
  },
  async ({ offset, limit, tags }) =>
    ok(await rag.download(offset, limit, tags))
);

// Tool: upload
server.registerTool(
  "upload",
  {
    description:
      "Import documents and memories from JSONL. Each line must be {type: 'memory'|'document', content: string, tags?: string[]}. Re-embeds all content on import.",
    inputSchema: schemas.upload,
  },
  async ({ jsonl }) => ok(await rag.upload(jsonl))
);

async function main() {
  try {
    console.error("Iniciando RAG Memory Server v3.0...");
    console.error("");
    console.error("Configuracion:");
    console.error(`   OLLAMA_BASE_URL: ${config.OLLAMA_BASE_URL}`);
    console.error(`   OLLAMA_EMBEDDING_MODEL: ${config.OLLAMA_EMBEDDING_MODEL}`);
    console.error(`   CHUNK_SIZE: ${config.CHUNK_SIZE}`);
    console.error(`   CHUNK_OVERLAP: ${config.CHUNK_OVERLAP}`);
    console.error(`   DATA_DIR: ${config.DATA_DIR}`);
    console.error("");

    // Verificar conexion con Ollama
    console.error(
      `Conectando a Ollama en ${config.OLLAMA_BASE_URL}...`
    );
    await ollama_client.get("/api/tags");
    console.error("Ollama conectado");

    // Inicializar indice vectorial + registro de documentos
    console.error("Inicializando indice vectorial...");
    await rag.init_collection();
    console.error("Indice vectorial listo");

    // Conectar servidor MCP via stdio
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("");
    console.error("Servidor MCP corriendo en stdio");
    console.error("Herramientas disponibles:");
    console.error("   - remember    (guardar conocimiento puntual)");
    console.error("   - document    (ingestar contenido largo/archivos)");
    console.error("   - recall      (busqueda semantica)");
    console.error("   - forget      (eliminar documentos/memorias)");
    console.error("   - list        (listar documentos y memorias)");
    console.error("   - download    (exportar base de conocimiento)");
    console.error("   - upload      (importar desde JSONL)");
  } catch (error) {
    console.error("Error fatal:", error);
    process.exit(1);
  }
}

main();
