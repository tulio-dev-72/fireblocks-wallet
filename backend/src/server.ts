import express from "express";
import { config } from "./config.js";
import { walletRouter } from "./routes/wallet.js";
import { webhookRouter } from "./routes/webhooks.js";
import { streamRouter } from "./routes/stream.js";

const app = express();

// Webhooks need the raw body for signature verification, so they are mounted
// BEFORE the JSON body parser (which would otherwise consume the stream).
app.use("/webhooks", webhookRouter);

app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, env: config.FIREBLOCKS_ENV }));
app.use("/api", walletRouter);
app.use("/stream", streamRouter);

app.listen(config.PORT, () => {
  console.log(`Backend listening on http://localhost:${config.PORT}  (Fireblocks: ${config.FIREBLOCKS_ENV})`);
  console.log(`  GET  /health`);
  console.log(`  GET  /api/vaults`);
  console.log(`  GET  /api/vaults/:id`);
  console.log(`  POST /api/transfers           (Idempotency-Key header supported)`);
  console.log(`  GET  /api/transfers/:txId`);
  console.log(`  GET  /stream/transactions     (SSE live status)`);
  console.log(`  POST /webhooks/fireblocks     (signature-verified)`);
});
