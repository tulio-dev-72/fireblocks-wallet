import { readFileSync } from "node:fs";
import { Fireblocks } from "@fireblocks/ts-sdk";
import { config } from "../config.js";

// The API secret lives ONLY here, server-side. The client never sees it.
// Prefer PEM contents from an env var (cloud secret store); fall back to a
// local file path for development.
const secretKey = config.FIREBLOCKS_PRIVATE_KEY
  ? config.FIREBLOCKS_PRIVATE_KEY.replace(/\\n/g, "\n")
  : readFileSync(config.FIREBLOCKS_PRIVATE_KEY_PATH!, "utf8");

export const fireblocks = new Fireblocks({
  apiKey: config.FIREBLOCKS_API_KEY,
  secretKey,
  basePath: config.FIREBLOCKS_API_BASE_URL,
});
