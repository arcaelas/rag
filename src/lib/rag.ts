import { LocalIndex } from "vectra";
import { randomUUID } from "crypto";
import { config } from "./config.js";
import { ollama_client } from "./axios.js";

let index: LocalIndex;

/**
 * Inicializa el índice vectorial local
 */
export async function init_collection(): Promise<void> {
  index = new LocalIndex(config.DATA_DIR);

  if (!(await index.isIndexCreated())) {
    await index.createIndex();
  }
}

/**
 * Genera embedding de un texto usando Ollama
 * @param text - Texto a convertir en vector
 * @returns Vector de embedding
 */
async function embed(text: string): Promise<number[]> {
  const response = await ollama_client.post("/api/embed", {
    model: config.OLLAMA_EMBEDDING_MODEL,
    input: text,
  });
  return response.data.embeddings[0];
}

/**
 * Guarda conocimiento en la base de datos
 * @param context - Texto a guardar
 * @param options - Opciones de metadata
 * @returns ID del registro creado
 */
export async function save(
  context: string,
  options?: {
    relevance?: number;
    tag?: string;
  }
): Promise<string> {
  const id = randomUUID();
  const embedding = await embed(context);
  const created_at = new Date().toISOString();

  // Procesar tags
  const tags = options?.tag
    ? options.tag
        .split(/\s+|,/g)
        .filter((t) => t.trim())
        .join(",")
    : undefined;

  const metadata: Record<string, any> = {
    content: context,
    created_at,
  };

  if (options?.relevance !== undefined) {
    metadata.relevance = options.relevance;
  }

  if (tags !== undefined) {
    metadata.tags = tags;
  }

  await index.insertItem({
    id,
    vector: embedding,
    metadata,
  });

  return id;
}

/**
 * Lista registros con paginación
 * @param offset - Elementos a omitir
 * @param limit - Elementos a retornar
 * @returns Lista paginada de registros
 */
export async function list(offset: number = 0, limit: number = 10) {
  const all_items = await index.listItems();
  const paginated = all_items.slice(offset, offset + limit);

  const memories = paginated.map((item) => ({
    id: item.id,
    content: item.metadata.content as string,
    relevance: item.metadata.relevance as number | undefined,
    tags: item.metadata.tags as string | undefined,
    created_at: item.metadata.created_at as string,
  }));

  return {
    memories,
    count: memories.length,
    total: all_items.length,
    offset,
    limit,
  };
}

/**
 * Búsqueda semántica por similitud
 * @param context - Criterio de búsqueda
 * @param offset - Elementos a omitir (default: 0)
 * @param limit - Máximo de resultados (default: 10)
 * @returns Resultados ordenados por relevancia
 */
export async function search(
  context: string,
  offset: number = 0,
  limit: number = 10
) {
  const query_embedding = await embed(context);
  const total_needed = offset + limit;

  const results = await index.queryItems(query_embedding, context, total_needed);

  // Aplicar offset y limit
  const paginated = results.slice(offset, offset + limit);

  return paginated.map((item) => ({
    id: item.item.id,
    content: item.item.metadata.content as string,
    score: item.score,
    relevance: item.item.metadata.relevance as number | undefined,
    tags: item.item.metadata.tags as string | undefined,
    created_at: item.item.metadata.created_at as string,
  }));
}

/**
 * Elimina un registro por ID
 * @param id - Identificador del registro
 */
export async function destroy(id: string): Promise<void> {
  await index.deleteItem(id);
}

/**
 * Actualiza un registro
 * @param id - Identificador del registro
 * @param context - Nuevo texto del registro
 */
export async function update(id: string, context: string): Promise<void> {
  // Obtener metadata anterior
  const item = await index.getItem(id);

  // Eliminar registro anterior
  await destroy(id);

  // Crear nuevo registro con mismo ID y metadata
  const embedding = await embed(context);

  const metadata: Record<string, any> = {
    content: context,
    updated_at: new Date().toISOString(),
  };

  if (item?.metadata.relevance !== undefined) {
    metadata.relevance = item.metadata.relevance;
  }

  if (item?.metadata.tags !== undefined) {
    metadata.tags = item.metadata.tags;
  }

  if (item?.metadata.created_at !== undefined) {
    metadata.created_at = item.metadata.created_at;
  }

  await index.insertItem({
    id,
    vector: embedding,
    metadata,
  });
}

/**
 * Exporta memorias a archivo JSONL
 * @param offset - Elementos a omitir
 * @param limit - Máximo de elementos (default: 512)
 * @returns Ruta del archivo generado
 */
export async function download(
  offset: number = 0,
  limit: number = 512
): Promise<string> {
  const { execSync } = await import("child_process");
  const fs = await import("fs");

  // Generar archivo temporal
  const output_path = execSync("mktemp /tmp/rag-export-XXXXXX.jsonl", {
    encoding: "utf8",
  }).trim();

  // Obtener memorias
  const result = await list(offset, limit);

  // Escribir JSONL
  const write_stream = fs.createWriteStream(output_path, { encoding: "utf8" });

  for (const memory of result.memories) {
    const line = JSON.stringify({
      context: memory.content,
      relevance: memory.relevance,
      tag: memory.tags,
    });
    write_stream.write(line + "\n");
  }

  write_stream.end();

  // Esperar escritura
  await new Promise<void>((resolve, reject) => {
    write_stream.on("finish", () => resolve());
    write_stream.on("error", reject);
  });

  return output_path;
}

/**
 * Importa memorias desde archivo JSONL
 * @param filename - Ruta del archivo JSONL
 * @returns Estadísticas de importación
 */
export async function upload(filename: string) {
  const fs = await import("fs");
  const readline = await import("readline");

  const errors: Array<{ line: number; error: string }> = [];
  let done = 0;

  try {
    const file_stream = fs.createReadStream(filename);
    const rl = readline.createInterface({ input: file_stream });

    let line_index = 0;
    for await (const line of rl) {
      line_index++;

      try {
        const item = JSON.parse(line.trim());

        if (!item.context || typeof item.context !== "string") {
          throw new Error("Missing or invalid context field");
        }

        await save(item.context, {
          relevance: item.relevance,
          tag: item.tag,
        });

        done++;
      } catch (error) {
        errors.push({
          line: line_index,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      filename,
      done,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Error al leer archivo"
    );
  }
}

/**
 * Analiza texto usando modelo LLM
 * @param context - Texto a analizar
 * @returns Resumen generado
 */
export async function analyze(context: string): Promise<string> {
  const response = await ollama_client.post("/api/chat", {
    model: config.OLLAMA_RESUME_MODEL,
    messages: [
      {
        role: "system",
        content: `Eres un asistente técnico experto en análisis y síntesis de documentación. Tu tarea es analizar el contexto proporcionado y generar un resumen preciso, técnico y objetivo.

REGLAS ESTRICTAS:
- Analiza SOLO el contenido proporcionado
- NO agregues observaciones personales
- NO uses frases como "Ok, aquí está el resumen", "Basándome en el contexto", "Claro, puedo ayudarte", etc.
- Genera directamente la respuesta final
- Sé técnico y preciso
- Preserva detalles importantes (código, ejemplos, listas)
- Si hay tablas o estructuras, manténlas
- Responde en el mismo idioma del contexto`,
      },
      {
        role: "user",
        content: context,
      },
      {
        role: "system",
        content: `Genera ahora el análisis completo. Recuerda: respuesta directa, sin meta-comentarios, sin saludos, sin introducciones.`,
      },
    ],
    options: {
      temperature: 0.2,
      num_predict: 2000,
    },
    stream: false,
  });

  return response.data.message.content.trim();
}

/**
 * Investiga en el RAG: búsqueda + análisis
 * @param context - Criterio de búsqueda
 * @param offset - Elementos a omitir (default: 0)
 * @param limit - Máximo de resultados (default: 10)
 * @returns Análisis sintético
 */
export async function research(
  context: string,
  offset: number = 0,
  limit: number = 10
): Promise<string> {
  const results = await search(context, offset, limit);

  if (results.length === 0) {
    return "No se encontró información relevante en la base de conocimiento.";
  }

  const concatenated = results
    .map(
      (item, idx) =>
        `--- Documento ${idx + 1} (Relevancia: ${(item.score * 100).toFixed(1)}%) ---\n${item.content}`
    )
    .join("\n\n");

  return await analyze(concatenated);
}
