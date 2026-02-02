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
    return resolve(homedir(), ".cache", "@arcaelas", "rag", "data");
  }
  return resolve(__dirname, "../../data");
};

// Parse CLI arguments
const args = process.argv.slice(2);
const get_arg = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index !== -1 && args[index + 1] ? args[index + 1] : undefined;
};

export const config = {
  OLLAMA_BASE_URL:
    get_arg("--ollama-url") ||
    process.env.OLLAMA_BASE_URL ||
    "http://localhost:11434",

  OLLAMA_EMBEDDING_MODEL:
    get_arg("--embedding-model") ||
    process.env.OLLAMA_EMBEDDING_MODEL ||
    "mxbai-embed-large",

  OLLAMA_RESUME_MODEL:
    get_arg("--resume-model") ||
    process.env.OLLAMA_RESUME_MODEL ||
    "qwen2.5:3b",

  COLLECTION_NAME:
    get_arg("--collection") ||
    process.env.COLLECTION_NAME ||
    "arcaelas_mcp_rag_collection",

  DATA_DIR: get_data_dir(),
} as const;
