import { randomUUID } from "crypto";
import { createReadStream, existsSync } from "fs";
import { appendFile, mkdir, readFile, unlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { createInterface } from "readline";
import { LocalIndex } from "vectra";
import { ollama_client } from "./axios.js";
import { chunk as split_chunks } from "./chunker.js";
import { config } from "./config.js";
import { Mutex } from "./rwlock.js";

// --- Types ---

export interface DocumentRecord {
  id: string;
  type: "memory" | "document";
  preview: string;
  tags: string[];
  source?: string;
  chunk_count: number;
  created_at: string;
  updated_at?: string;
}

// --- State ---

let index: LocalIndex;
let documents: Record<string, DocumentRecord> = {};
const mutex = new Mutex();

const VECTORS_DIR = join(config.DATA_DIR, "vectors");
const DOCS_PATH = join(config.DATA_DIR, "documents.json");

// --- Primitives ---

export async function init_collection(): Promise<void> {
  await mkdir(config.DATA_DIR, { recursive: true });

  index = new LocalIndex(VECTORS_DIR);
  if (!(await index.isIndexCreated())) {
    await index.createIndex();
  }

  if (existsSync(DOCS_PATH)) {
    const raw = await readFile(DOCS_PATH, "utf-8");
    documents = JSON.parse(raw);
  }
}

async function embed(input: string | string[]): Promise<number[][]> {
  const response = await ollama_client.post("/api/embed", {
    model: config.OLLAMA_EMBEDDING_MODEL,
    input,
  });
  return response.data.embeddings;
}

async function save_registry(): Promise<void> {
  await writeFile(DOCS_PATH, JSON.stringify(documents, null, 2), "utf-8");
}

function parse_tags(tags?: string | string[]): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.flatMap((t) => t.split(/[,\s]+/).filter(Boolean));
  }
  return tags.split(/[,\s]+/).filter(Boolean);
}

function assemble_chunks(chunks: string[]): string {
  if (chunks.length === 0) return "";
  if (chunks.length === 1) return chunks[0];

  let result = chunks[0];
  for (let i = 1; i < chunks.length; i++) {
    const max = Math.min(
      config.CHUNK_OVERLAP * 2,
      result.length,
      chunks[i].length
    );
    let overlap = 0;
    for (let len = max; len > 10; len--) {
      if (result.endsWith(chunks[i].slice(0, len))) {
        overlap = len;
        break;
      }
    }
    result += chunks[i].slice(overlap);
  }
  return result;
}

// --- Remember ---

export async function remember(
  content: string,
  tags?: string | string[]
): Promise<{ document_id: string; chunk_id: string }> {
  const [vector] = await embed(content);
  const parsed_tags = parse_tags(tags);

  return await mutex.run(async () => {
    const document_id = randomUUID();
    const chunk_id = randomUUID();

    await index.insertItem({
      id: chunk_id,
      vector,
      metadata: {
        document_id,
        chunk_index: 0,
        total_chunks: 1,
        content,
      },
    });

    documents[document_id] = {
      id: document_id,
      type: "memory",
      preview:
        content.length <= 200 ? content : content.slice(0, 200) + "...",
      tags: parsed_tags,
      chunk_count: 1,
      created_at: new Date().toISOString(),
    };
    await save_registry();

    return { document_id, chunk_id };
  });
}

// --- Document (ingest) ---

export async function ingest(params: {
  content?: string;
  filename?: string;
  tags?: string | string[];
}): Promise<{ document_id: string; chunk_count: number; preview: string }> {
  let text: string;
  let source: string | undefined;

  if (params.filename) {
    text = await readFile(params.filename, "utf-8");
    source = params.filename;
  } else if (params.content) {
    text = params.content;
  } else {
    throw new Error("Se requiere 'content' o 'filename'");
  }

  const tags = parse_tags(params.tags);
  const chunks = split_chunks(text, {
    size: config.CHUNK_SIZE,
    overlap: config.CHUNK_OVERLAP,
  });

  const vectors = await embed(chunks);

  return await mutex.run(async () => {
    const document_id = randomUUID();
    const preview =
      text.length <= 200 ? text : text.slice(0, 200) + "...";

    const items = chunks.map((chunk_text, i) => ({
      id: randomUUID(),
      vector: vectors[i],
      metadata: {
        document_id,
        chunk_index: i,
        total_chunks: chunks.length,
        content: chunk_text,
      },
    }));
    await index.batchInsertItems(items);

    documents[document_id] = {
      id: document_id,
      type: "document",
      preview,
      tags,
      source,
      chunk_count: chunks.length,
      created_at: new Date().toISOString(),
    };
    await save_registry();

    return { document_id, chunk_count: chunks.length, preview };
  });
}

// --- Recall ---

export async function recall(params: {
  query: string;
  limit?: number;
  threshold?: number;
  tags?: string | string[];
  hyde?: boolean;
}): Promise<Array<{ id: string; content: string; score: number }>> {
  const limit = params.limit ?? 5;
  const threshold = params.threshold ?? 0.3;
  const filter_tags = parse_tags(params.tags);

  let query_vector: number[];

  if (params.hyde) {
    const response = await ollama_client.post(
      "/api/chat",
      {
        model: config.OLLAMA_RESUME_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Genera una respuesta hipotetica breve y directa a la consulta. Sin explicaciones ni meta-comentarios. Responde como si conocieras la respuesta exacta.",
          },
          { role: "user", content: params.query },
        ],
        options: { temperature: 0.3, num_predict: 300 },
        stream: false,
      },
      { timeout: 30000 }
    );
    [query_vector] = await embed(response.data.message.content.trim());
  } else {
    [query_vector] = await embed(params.query);
  }

  return await mutex.run(async () => {
    const raw = await index.queryItems(
      query_vector,
      params.query,
      limit * 3
    );

    let results = raw.filter((r) => r.score >= threshold);

    if (filter_tags.length > 0) {
      results = results.filter((r) => {
        const doc = documents[r.item.metadata.document_id as string];
        return doc && filter_tags.some((t) => doc.tags.includes(t));
      });
    }

    const groups = new Map<
      string,
      { score: number; indices: Set<number>; total: number }
    >();
    for (const r of results) {
      const doc_id = r.item.metadata.document_id as string;
      const chunk_idx = r.item.metadata.chunk_index as number;
      const total = r.item.metadata.total_chunks as number;

      if (!groups.has(doc_id)) {
        groups.set(doc_id, { score: r.score, indices: new Set(), total });
      }
      const g = groups.get(doc_id)!;
      g.score = Math.max(g.score, r.score);
      g.indices.add(chunk_idx);
    }

    const assembled: Array<{ id: string; content: string; score: number }> =
      [];

    for (const [doc_id, group] of groups) {
      const needed = new Set<number>();
      for (const idx of group.indices) {
        if (idx > 0) needed.add(idx - 1);
        needed.add(idx);
        if (idx < group.total - 1) needed.add(idx + 1);
      }

      const doc_items = await index.listItemsByMetadata({
        document_id: doc_id,
      });

      const selected = doc_items
        .filter((item) => needed.has(item.metadata.chunk_index as number))
        .sort(
          (a, b) =>
            (a.metadata.chunk_index as number) -
            (b.metadata.chunk_index as number)
        );

      const content = assemble_chunks(
        selected.map((s) => s.metadata.content as string)
      );

      assembled.push({ id: doc_id, content, score: group.score });
    }

    assembled.sort((a, b) => b.score - a.score);
    return assembled.slice(0, limit);
  });
}

// --- Forget ---

export async function forget(
  ids: string | string[]
): Promise<{ deleted: string[]; not_found: string[]; chunks_removed: number }> {
  const id_list = Array.isArray(ids) ? ids : [ids];

  return await mutex.run(async () => {
    const deleted: string[] = [];
    const not_found: string[] = [];
    let chunks_removed = 0;

    for (const id of id_list) {
      const doc = documents[id];
      if (!doc) {
        not_found.push(id);
        continue;
      }

      const items = await index.listItemsByMetadata({ document_id: id });
      if (items.length > 0) {
        await index.beginUpdate();
        for (const item of items) {
          await index.deleteItem(item.id);
        }
        await index.endUpdate();
        chunks_removed += items.length;
      }

      delete documents[id];
      deleted.push(id);
    }

    if (deleted.length > 0) {
      await save_registry();
    }

    return { deleted, not_found, chunks_removed };
  });
}

// --- List ---

export async function list(
  offset: number = 0,
  limit: number = 10,
  tags?: string | string[]
): Promise<{
  entries: DocumentRecord[];
  total: number;
  offset: number;
  limit: number;
}> {
  return await mutex.run(async () => {
    let docs = Object.values(documents);

    const filter_tags = parse_tags(tags);
    if (filter_tags.length > 0) {
      docs = docs.filter((d) =>
        filter_tags.some((t) => d.tags.includes(t))
      );
    }

    docs.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return {
      entries: docs.slice(offset, offset + limit),
      total: docs.length,
      offset,
      limit,
    };
  });
}

// --- Download ---

export async function download(
  offset: number = 0,
  limit: number = 50,
  tags?: string | string[]
): Promise<{ content: string; total: number; offset: number; limit: number }> {
  const { entries, total } = await list(offset, limit, tags);
  const lines: string[] = [];

  for (const doc of entries) {
    const items = await index.listItemsByMetadata({ document_id: doc.id });
    items.sort(
      (a, b) =>
        (a.metadata.chunk_index as number) -
        (b.metadata.chunk_index as number)
    );

    const content = assemble_chunks(
      items.map((i) => i.metadata.content as string)
    );

    lines.push(
      JSON.stringify({
        type: doc.type,
        content,
        tags: doc.tags,
        ...(doc.source ? { source: doc.source } : {}),
      })
    );
  }

  return { content: lines.join("\n"), total, offset, limit };
}

// --- Upload ---

export async function upload(params: {
  jsonl?: string;
  filename?: string;
}): Promise<{ imported: number; errors: string[] }> {
  if (!params.jsonl && !params.filename) {
    throw new Error("Se requiere 'jsonl' o 'filename'");
  }

  const tmp_path = join(tmpdir(), `rag_upload_${randomUUID()}.jsonl`);
  let imported = 0;
  const errors: string[] = [];

  try {
    if (params.jsonl) {
      await appendFile(tmp_path, params.jsonl, "utf-8");
    }
    if (params.filename) {
      const content = await readFile(params.filename, "utf-8");
      if (params.jsonl) await appendFile(tmp_path, "\n", "utf-8");
      await appendFile(tmp_path, content, "utf-8");
    }

    const rl = createInterface({
      input: createReadStream(tmp_path, "utf-8"),
      crlfDelay: Infinity,
    });

    let line_num = 0;
    for await (const line of rl) {
      line_num++;
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;

      try {
        const entry = JSON.parse(trimmed);
        const type = entry.type ?? "document";
        const content = entry.content;

        if (!content || typeof content !== "string" || content.trim().length === 0) {
          errors.push(`Line ${line_num}: missing or empty 'content'`);
          continue;
        }

        if (type === "memory") {
          await remember(content, entry.tags);
        } else if (type === "document") {
          await ingest({ content, tags: entry.tags });
        } else {
          errors.push(`Line ${line_num}: unknown type '${type}'`);
          continue;
        }

        imported++;
      } catch (e) {
        errors.push(`Line ${line_num}: ${(e as Error).message}`);
      }
    }
  } finally {
    await unlink(tmp_path).catch(() => {});
  }

  return { imported, errors };
}
