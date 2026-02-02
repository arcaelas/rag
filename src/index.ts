#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "./lib/config.js";
import * as rag from "./lib/rag.js";
import { ollama_client } from "./lib/axios.js";
import * as schemas from "./schemas.js";

const server = new McpServer({
  name: "rag-memory-server",
  version: "2.0.0",
});

// Tool: save
server.registerTool(
  "save",
  {
    description:
      "Guarda conocimiento en la base de datos personal. Usa cuando el usuario comparte estándares, preferencias, convenciones o documentación que debe persistir. Soporta relevancia (1-10) y etiquetas.",
    inputSchema: schemas.save,
  },
  async ({ context, relevance, tag }) => {
    const id = await rag.save(context, { relevance, tag });
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              id,
              context,
              relevance,
              tag,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool: list
server.registerTool(
  "list",
  {
    description:
      "Lista todos los registros almacenados con paginación. Retorna ID, content, relevance, tags, created_at.",
    inputSchema: schemas.list,
  },
  async ({ offset, limit }) => {
    const result = await rag.list(offset, limit);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: search
server.registerTool(
  "search",
  {
    description:
      "Búsqueda semántica en el RAG. Retorna documentos ordenados por relevancia (score) con paginación. Usa para ver resultados detallados con metadatos.",
    inputSchema: schemas.search,
  },
  async ({ context, offset, limit }) => {
    const results = await rag.search(context, offset, limit);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              context,
              results,
              count: results.length,
              offset,
              limit,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool: destroy
server.registerTool(
  "destroy",
  {
    description: "Elimina permanentemente un registro por su ID. Acción irreversible.",
    inputSchema: schemas.destroy,
  },
  async ({ id }) => {
    await rag.destroy(id);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              id,
              message: `Registro ${id} eliminado`,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool: update
server.registerTool(
  "update",
  {
    description:
      "Actualiza el contenido de un registro existente. Preserva relevance, tags y created_at. Agrega updated_at.",
    inputSchema: schemas.update,
  },
  async ({ id, context }) => {
    await rag.update(id, context);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              id,
              context,
              message: `Registro ${id} actualizado`,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool: download
server.registerTool(
  "download",
  {
    description:
      "Exporta registros a archivo JSONL temporal. Retorna ruta del archivo generado. Default: 512 registros.",
    inputSchema: schemas.download,
  },
  async ({ offset, limit }) => {
    const filename = await rag.download(offset, limit);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              filename,
              offset,
              limit,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool: upload
server.registerTool(
  "upload",
  {
    description:
      "Importa registros desde archivo JSONL. Cada línea debe tener 'context' (requerido), opcionalmente 'relevance' y 'tag'. Retorna estadísticas de importación.",
    inputSchema: schemas.upload,
  },
  async ({ filename }) => {
    const result = await rag.upload(filename);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: analyze
server.registerTool(
  "analyze",
  {
    description:
      "Analiza texto usando modelo LLM local (config.OLLAMA_RESUME_MODEL). Genera resumen técnico objetivo sin meta-comentarios. Retorna texto directo.",
    inputSchema: schemas.analyze,
  },
  async ({ context }) => {
    const analysis = await rag.analyze(context);
    return {
      content: [
        {
          type: "text" as const,
          text: analysis,
        },
      ],
    };
  }
);

// Tool: research
server.registerTool(
  "research",
  {
    description:
      "Investiga en el RAG: búsqueda semántica + análisis automático. Retorna síntesis directa de los documentos encontrados. Una llamada = búsqueda + análisis.",
    inputSchema: schemas.research,
  },
  async ({ context, offset, limit }) => {
    const analysis = await rag.research(context, offset, limit);
    return {
      content: [
        {
          type: "text" as const,
          text: analysis,
        },
      ],
    };
  }
);

async function main() {
  try {
    console.error("🚀 Iniciando RAG Memory Server v2.0...");
    console.error("");
    console.error("📋 Configuración:");
    console.error(`   OLLAMA_BASE_URL: ${config.OLLAMA_BASE_URL}`);
    console.error(`   OLLAMA_EMBEDDING_MODEL: ${config.OLLAMA_EMBEDDING_MODEL}`);
    console.error(`   OLLAMA_RESUME_MODEL: ${config.OLLAMA_RESUME_MODEL}`);
    console.error(`   COLLECTION_NAME: ${config.COLLECTION_NAME}`);
    console.error(`   DATA_DIR: ${config.DATA_DIR}`);
    console.error("");

    // Verificar conexión con Ollama
    console.error(`📡 Conectando a Ollama en ${config.OLLAMA_BASE_URL}...`);
    await ollama_client.get("/api/tags");
    console.error(`✅ Ollama conectado`);

    // Inicializar índice vectorial
    console.error(`💾 Inicializando índice vectorial...`);
    await rag.init_collection();
    console.error(`✅ Índice vectorial listo`);

    // Conectar servidor MCP via stdio
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("");
    console.error("✅ Servidor MCP corriendo en stdio");
    console.error("🎯 Herramientas disponibles:");
    console.error("   - save         (guardar con relevance + tags)");
    console.error("   - list         (listar con paginación)");
    console.error("   - search       (búsqueda con metadatos)");
    console.error("   - destroy      (eliminar por ID)");
    console.error("   - update       (actualizar registro)");
    console.error("   - download     (exportar a JSONL)");
    console.error("   - upload       (importar desde JSONL)");
    console.error("   - analyze      (análisis LLM) ⭐");
    console.error("   - research     (búsqueda + análisis) ⭐");
  } catch (error) {
    console.error("❌ Error fatal:", error);
    process.exit(1);
  }
}

main();
