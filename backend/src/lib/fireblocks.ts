import { readFileSync } from "node:fs";
import { Fireblocks } from "@fireblocks/ts-sdk";
import { config } from "../config.js";

// The API secret lives ONLY here, server-side. The mobile client never sees it.
export const fireblocks = new Fireblocks({
  apiKey: config.FIREBLOCKS_API_KEY,
  secretKey: readFileSync(config.FIREBLOCKS_PRIVATE_KEY_PATH, "utf8"),
  basePath: config.FIREBLOCKS_API_BASE_URL,
});
