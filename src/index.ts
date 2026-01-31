#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "./lib/config.js";
import * as rag from "./lib/rag.js";
import { ollama_client } from "./lib/axios.js";
import * as schemas from "./schemas.js";
import * as fs from "fs";
import * as readline from "readline";
import { execSync } from "child_process";

const server = new McpServer({
  name: "rag-memory-server",
  version: "1.0.0",
});

// Tool: save
server.registerTool(
  "save",
  {
    description: "Save knowledge to user's personal database. Use when user shares standards, preferences, conventions, or documentation that should persist across sessions. Before saving, always search first with search to avoid duplicates.",
    inputSchema: schemas.save,
  },
  async ({ content, metadata }) => {
    const id = await rag.save(content, metadata);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              id,
              content,
              metadata,
              message: "Memoria guardada exitosamente",
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool: search
server.registerTool(
  "search",
  {
    description: "Search user's personal knowledge base using semantic similarity. YOU MUST USE THIS TOOL FIRST before answering any technical question about code, architecture, conventions, libraries, or development practices. This RAG contains the user's specific standards and documentation, which take priority over your general knowledge. If in doubt whether to search, always search.",
    inputSchema: schemas.search,
  },
  async ({ query, limit = 5 }) => {
    const results = await rag.search(query, limit);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              query,
              results,
              count: results.length,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool: tag
server.registerTool(
  "tag",
  {
    description: "Add a tag to an existing memory for better organization and future filtering. Use after save to categorize stored knowledge.",
    inputSchema: schemas.tag,
  },
  async ({ id, tag }) => {
    await rag.tag(id, tag);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              id,
              tag,
              message: `Tag '${tag}' agregado a memoria ${id}`,
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
    description: "Permanently delete a memory from the knowledge base. ONLY use this when the user explicitly requests to delete specific information, as this action is irreversible.",
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
              message: `Memoria ${id} eliminada exitosamente`,
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
    description: "List all stored memories with pagination. Use to explore what knowledge is available in the user's database or to audit stored content before adding new memories.",
    inputSchema: schemas.list,
  },
  async ({ limit = 10, offset = 0 }) => {
    const result = await rag.list(limit, offset);
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

// Tool: get
server.registerTool(
  "get",
  {
    description: "Retrieve a specific memory by its exact ID. Use after search or list when you need the full content and metadata of a particular memory.",
    inputSchema: schemas.get,
  },
  async ({ id }) => {
    const memory = await rag.get(id);

    if (!memory) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: false,
                error: `Memoria con id '${id}' no encontrada`,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(memory, null, 2),
        },
      ],
    };
  }
);

// Tool: upload
server.registerTool(
  "upload",
  {
    description: "Carga masiva de memorias desde archivo JSONL. Cada línea debe ser un JSON válido con {context, metadata?, tags?}. Procesa todas las líneas y reporta errores detallados.",
    inputSchema: schemas.upload,
  },
  async ({ filename }) => {
    const errors: Array<{ line: number; error: string }> = [];
    let done = 0;

    try {
      // Leer archivo con readline
      const file_stream = fs.createReadStream(filename);
      const rl = readline.createInterface({ input: file_stream });

      let line_index = 0;
      for await (const line of rl) {
        line_index++;

        try {
          // Parsear JSON
          const item = JSON.parse(line.trim());

          // Validar campo obligatorio
          if (!item.context || typeof item.context !== "string") {
            throw new Error("Missing or invalid context field");
          }

          // Guardar usando función existente
          const id = await rag.save(item.context, item.metadata);

          // Agregar tags si existen
          if (item.tags && typeof item.tags === "string") {
            await rag.tag(id, item.tags);
          }

          done++;
        } catch (error) {
          errors.push({
            line: line_index,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                filename,
                done,
                error: errors,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                filename,
                done,
                error: [{
                  line: 0,
                  error: error instanceof Error ? error.message : "Error al leer archivo"
                }],
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: download
server.registerTool(
  "download",
  {
    description: "Exporta memorias del RAG a archivo JSONL con paginación. Por defecto descarga las primeras 100 memorias a un archivo temporal. Cada línea contiene {context} con el contenido de la memoria.",
    inputSchema: schemas.download,
  },
  async ({ offset = 0, limit = 100, filename }) => {
    try {
      // Generar archivo temporal si no se provee filename
      let output_path = filename;
      if (!output_path) {
        output_path = execSync('mktemp /tmp/rag-export-XXXXXX.jsonl', { encoding: 'utf8' }).trim();
      }

      // Obtener memorias con paginación
      const result = await rag.list(limit, offset);

      // Crear stream de escritura
      const write_stream = fs.createWriteStream(output_path, { encoding: 'utf8' });

      // Escribir cada memoria como línea JSONL
      for (const memory of result.memories) {
        const line = JSON.stringify({ context: memory.content });
        write_stream.write(line + '\n');
      }

      // Cerrar stream
      write_stream.end();

      // Esperar a que termine de escribir
      await new Promise<void>((resolve, reject) => {
        write_stream.on('finish', () => resolve());
        write_stream.on('error', reject);
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                filename: output_path,
                offset,
                limit,
                count: result.total,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                filename: filename || "",
                offset,
                limit,
                count: 0,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  try {
    console.error("🚀 Iniciando RAG Memory Server...");

    // Verificar conexión con Ollama
    console.error(`📡 Conectando a Ollama en ${config.ollama.hostname}...`);
    await ollama_client.get("/api/tags");
    console.error(
      `✅ Ollama conectado (modelo: ${config.ollama.model_name})`
    );

    // Inicializar índice vectorial
    console.error(`💾 Inicializando índice vectorial en ${config.chroma.dirname}...`);
    await rag.init_collection();
    console.error(`✅ Índice vectorial listo`);

    // Conectar servidor MCP via stdio
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("✅ Servidor MCP corriendo en stdio");
    console.error("🎯 Herramientas disponibles:");
    console.error("   - save");
    console.error("   - search");
    console.error("   - list");
    console.error("   - get");
    console.error("   - tag");
    console.error("   - destroy");
    console.error("   - upload");
    console.error("   - download");
  } catch (error) {
    console.error("❌ Error fatal:", error);
    process.exit(1);
  }
}

main();
