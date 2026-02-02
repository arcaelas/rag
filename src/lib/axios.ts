import axios from "axios";
import { config } from "./config.js";

export const ollama_client = axios.create({
  baseURL: config.OLLAMA_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});
