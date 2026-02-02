import { z } from "zod";

export const save = z.object({
  context: z.string().describe("Texto a guardar en la memoria"),
  relevance: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .describe("Relevancia del contenido (1-10)"),
  tag: z
    .string()
    .optional()
    .describe("Etiquetas separadas por comas o espacios (ej: 'typescript, react' o 'git nextjs')"),
});

export const list = z.object({
  offset: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe("Elementos a omitir antes de retornar"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .optional()
    .describe("Cantidad de elementos a retornar"),
});

export const search = z.object({
  context: z.string().describe("Criterio de búsqueda"),
  offset: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe("Elementos a omitir (paginación)"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .optional()
    .describe("Máximo de resultados a retornar"),
});

export const destroy = z.object({
  id: z.string().describe("Identificador del registro a eliminar"),
});

export const update = z.object({
  id: z.string().describe("Identificador del registro a actualizar"),
  context: z.string().describe("Nuevo texto del registro"),
});

export const download = z.object({
  offset: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe("Elementos a omitir antes de descargar"),
  limit: z
    .number()
    .min(1)
    .max(10000)
    .default(512)
    .optional()
    .describe("Cantidad máxima de elementos a descargar"),
});

export const upload = z.object({
  filename: z.string().describe("Ruta absoluta del archivo JSONL a importar"),
});

export const analyze = z.object({
  context: z.string().describe("Texto completo a procesar y analizar"),
});

export const research = z.object({
  context: z.string().describe("Criterio de búsqueda para investigar"),
  offset: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe("Elementos a omitir (paginación)"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .optional()
    .describe("Máximo de resultados antes de analizar"),
});
