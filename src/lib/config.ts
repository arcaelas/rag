import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Usar ~/.cache/@arcaelas/rag/data cuando se ejecuta desde npx
// O ./data cuando se ejecuta localmente
const get_data_dir = () => {
  const is_global = __dirname.includes("node_modules");
  if (is_global) {
    return resolve(homedir(), ".cache", "@arcaelas", "mcp-rag", "data");
  }
  return resolve(__dirname, "../../data");
};

export const config = {
  ollama: {
    hostname: process.env.OLLAMA_HOSTNAME || "http://localhost:11434",
    model_name: process.env.OLLAMA_MODEL_NAME || "nomic-embed-text",
  },
  chroma: {
    dirname: get_data_dir(),
    collection: "arcaelas_mcp_rag_collection",
  },
} as const;
