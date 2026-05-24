import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  FIREBLOCKS_API_KEY: z.string().min(1),
  FIREBLOCKS_PRIVATE_KEY_PATH: z.string().min(1),
  FIREBLOCKS_API_BASE_URL: z.string().url(),
  FIREBLOCKS_ENV: z.enum(["sandbox", "production", "eu", "eu2"]).default("sandbox"),
  APPROVAL_THRESHOLD: z.coerce.number().default(0.01),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(z.treeifyError(parsed.error));
  process.exit(1);
}

export const config = parsed.data;
