import { z } from "zod";

export const save = z.object({
  content: z.string().describe("El contenido textual a guardar"),
  metadata: z
    .object({
      category: z.string().optional(),
      project: z.string().optional(),
      importance: z.enum(["low", "medium", "high"]).optional(),
      source: z.string().optional(),
    })
    .optional()
    .describe("Metadata opcional"),
});

export const search = z.object({
  query: z.string().describe("La pregunta o tema a buscar"),
  limit: z.number().min(1).max(20).default(5).describe("Número máximo de resultados"),
});

export const tag = z.object({
  id: z.string().describe("ID de la memoria a etiquetar"),
  tag: z.string().describe("Etiqueta a agregar"),
});

export const destroy = z.object({
  id: z.string().describe("ID de la memoria a eliminar"),
});

export const list = z.object({
  limit: z.number().min(1).max(50).default(10).describe("Número de memorias por página"),
  offset: z.number().min(0).default(0).describe("Offset para paginación"),
});

export const get = z.object({
  id: z.string().describe("ID de la memoria a obtener"),
});

export const upload = z.object({
  filename: z.string().describe("Ruta absoluta al archivo JSONL a importar"),
});

export const download = z.object({
  offset: z.number().min(0).default(0).describe("Offset para paginación"),
  limit: z.number().min(1).max(10000).default(100).describe("Número máximo de memorias a exportar"),
  filename: z.string().optional().describe("Ruta absoluta donde guardar el archivo JSONL. Si no se especifica, genera un archivo temporal"),
});
