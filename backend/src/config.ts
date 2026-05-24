import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  FIREBLOCKS_API_KEY: z.string().min(1),
  // Provide the key either as PEM contents (cloud) or a file path (local dev).
  FIREBLOCKS_PRIVATE_KEY: z.string().optional(),
  FIREBLOCKS_PRIVATE_KEY_PATH: z.string().optional(),
  FIREBLOCKS_API_BASE_URL: z.string().url(),
  FIREBLOCKS_ENV: z.enum(["sandbox", "production", "eu", "eu2"]).default("sandbox"),
  APPROVAL_THRESHOLD: z.coerce.number().default(0.01),
  // Allowed browser origin for the deployed web app (CORS). "*" by default for the demo.
  WEB_ORIGIN: z.string().default("*"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(z.treeifyError(parsed.error));
  process.exit(1);
}

if (!parsed.data.FIREBLOCKS_PRIVATE_KEY && !parsed.data.FIREBLOCKS_PRIVATE_KEY_PATH) {
  console.error("Set FIREBLOCKS_PRIVATE_KEY (PEM contents) or FIREBLOCKS_PRIVATE_KEY_PATH (file).");
  process.exit(1);
}

export const config = parsed.data;
