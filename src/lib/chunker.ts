export interface ChunkOptions {
  /** Max caracteres por chunk (~1600 ≈ 400 tokens) */
  size?: number;
  /** Caracteres de solapamiento entre chunks (~200 ≈ 50 tokens) */
  overlap?: number;
}

/**
 * Divide texto en chunks respetando límites naturales (párrafos, oraciones)
 * con overlap configurable para preservar contexto entre chunks.
 */
export function chunk(text: string, options?: ChunkOptions): string[] {
  const size = options?.size ?? 1600;
  const overlap = options?.overlap ?? 200;

  if (text.length <= size) return [text];

  const segments = split_segments(text);

  if (segments.length <= 1) {
    return force_split(text, size, overlap);
  }

  const chunks: string[] = [];
  let current: string[] = [];
  let current_len = 0;

  for (const seg of segments) {
    if (current_len + seg.length > size && current.length > 0) {
      chunks.push(current.join("").trim());

      // Retener segmentos del final como overlap
      let overlap_len = 0;
      let keep = 0;
      for (let j = current.length - 1; j >= 0; j--) {
        if (overlap_len + current[j].length > overlap) break;
        overlap_len += current[j].length;
        keep++;
      }

      current = keep > 0 ? current.slice(-keep) : [];
      current_len = current.reduce((s, p) => s + p.length, 0);
    }

    current.push(seg);
    current_len += seg.length;
  }

  if (current.length > 0) {
    const last = current.join("").trim();
    if (last.length > 0) chunks.push(last);
  }

  return chunks;
}

/**
 * Divide texto en segmentos naturales: párrafos, oraciones, líneas.
 */
function split_segments(text: string): string[] {
  const segments = text.split(/(?<=\n\n)|(?<=[.!?]\s)|(?<=\n)/g);
  return segments.filter((s) => s.length > 0);
}

/**
 * Fallback: divide por tamaño fijo cuando no hay límites naturales.
 */
function force_split(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = [];
  const step = Math.max(size - overlap, 1);
  let pos = 0;

  while (pos < text.length) {
    chunks.push(text.slice(pos, pos + size));
    pos += step;
    if (pos + step > text.length && pos < text.length) {
      // Último fragmento
      const last = text.slice(pos).trim();
      if (last.length > 0) chunks.push(last);
      break;
    }
  }

  return chunks;
}
