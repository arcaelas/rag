import { LocalIndex } from "vectra";
import { randomUUID } from "crypto";
import { config } from "./config.js";
import { ollama_client } from "./axios.js";

let index: LocalIndex;

/**
 * Inicializa el índice vectorial local
 */
export async function init_collection(): Promise<void> {
  index = new LocalIndex(config.chroma.dirname);

  if (!(await index.isIndexCreated())) {
    await index.createIndex();
  }
}

/**
 * Genera embedding de un texto usando Ollama
 * @param text - Texto a convertir en vector
 * @returns Vector de embedding
 */
export async function embed(text: string): Promise<number[]> {
  const response = await ollama_client.post("/api/embed", {
    model: config.ollama.model_name,
    input: text,
  });
  return response.data.embeddings[0];
}

/**
 * Guarda un texto con su embedding en el índice
 * @param text - Texto a guardar
 * @param metadata - Metadata opcional
 * @returns ID del registro guardado
 */
export async function save(
  text: string,
  metadata?: Record<string, any>
): Promise<string> {
  const id = randomUUID();
  const embedding = await embed(text);
  const created_at = new Date().toISOString();

  await index.insertItem({
    id,
    vector: embedding,
    metadata: {
      content: text,
      ...metadata,
      created_at,
    },
  });

  return id;
}

/**
 * Búsqueda semántica por similitud vectorial
 * @param text - Texto de consulta
 * @param limit - Máximo de resultados
 * @returns Resultados ordenados por similitud
 */
export async function search(text: string, limit: number = 5) {
  const query_embedding = await embed(text);

  const results = await index.queryItems(query_embedding, text, limit);

  return results.map((item) => ({
    id: item.item.id,
    content: item.item.metadata.content as string,
    score: item.score,
    metadata: {
      ...item.item.metadata,
      content: undefined, // No duplicar content en metadata
    },
  }));
}

/**
 * Agrega o actualiza tags en un registro
 * @param id - ID del registro
 * @param tag - Tag a agregar
 */
export async function tag(id: string, tag: string): Promise<void> {
  const item = await index.getItem(id);

  if (!item) {
    throw new Error(`Registro con id '${id}' no encontrado`);
  }

  const existing_tags_str = (item.metadata.tags as string) || "";
  const existing_tags = existing_tags_str ? existing_tags_str.split(",") : [];

  if (!existing_tags.includes(tag)) {
    existing_tags.push(tag);
  }

  await index.upsertItem({
    id,
    vector: item.vector,
    metadata: {
      ...item.metadata,
      tags: existing_tags.join(","),
    },
  });
}

/**
 * Elimina un registro por su ID
 * @param id - ID del registro a eliminar
 */
export async function destroy(id: string): Promise<void> {
  await index.deleteItem(id);
}

/**
 * Obtiene un registro específico por ID
 * @param id - ID del registro
 * @returns Registro encontrado o null
 */
export async function get(id: string) {
  const item = await index.getItem(id);

  if (!item) {
    return null;
  }

  return {
    id: item.id,
    content: item.metadata.content as string,
    metadata: {
      ...item.metadata,
      content: undefined, // No duplicar content
    },
  };
}

/**
 * Lista todos los registros con paginación
 * @param limit - Máximo de registros
 * @param offset - Offset para paginación
 * @returns Lista de registros
 */
export async function list(limit: number = 10, offset: number = 0) {
  const all_items = await index.listItems();
  const paginated = all_items.slice(offset, offset + limit);

  const memories = paginated.map((item) => ({
    id: item.id,
    content: item.metadata.content as string,
    metadata: {
      ...item.metadata,
      content: undefined,
    },
  }));

  return {
    memories,
    count: memories.length,
    total: all_items.length,
  };
}
