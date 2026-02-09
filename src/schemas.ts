import { z } from "zod";

const Tags = z.union([z.string(), z.array(z.string())]);

export const remember = z.object({
  content: z.string().describe("Text to store in semantic memory"),
  tags: Tags.optional().describe("Tags for categorization"),
});

export const document = z.object({
  content: z
    .string()
    .optional()
    .describe("Long text to process and split into chunks"),
  filename: z
    .string()
    .optional()
    .describe("Absolute file path to ingest"),
  tags: Tags.optional().describe("Tags for categorization"),
});

export const recall = z.object({
  query: z.string().describe("Semantic search query"),
  limit: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .optional()
    .describe("Max results to return"),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe("Minimum relevance score (0-1)"),
  tags: Tags.optional().describe("Filter results by tags"),
  hyde: z
    .boolean()
    .default(false)
    .optional()
    .describe("Use HyDE (Hypothetical Document Embedding) for question-style queries"),
});

export const list = z.object({
  offset: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe("Entries to skip"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .optional()
    .describe("Max entries to return"),
  tags: Tags.optional().describe("Filter by tags"),
});

export const forget = z.object({
  ids: z
    .union([z.string(), z.array(z.string())])
    .describe("ID or array of IDs to delete"),
});

export const download = z.object({
  offset: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe("Entries to skip"),
  limit: z
    .number()
    .min(1)
    .max(200)
    .default(50)
    .optional()
    .describe("Max entries to export per page"),
  tags: Tags.optional().describe("Filter by tags"),
});

export const upload = z.object({
  jsonl: z
    .string()
    .describe(
      "JSONL content to import. Each line: {type: 'memory'|'document', content: string, tags?: string[]}"
    ),
});
