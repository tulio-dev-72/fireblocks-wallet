import { Router, type Request, type Response } from "express";
import { txEvents, type TxStatusEvent } from "../services/events.js";

export const streamRouter = Router();

// Server-Sent Events: the mobile client opens this once and receives live
// transaction status updates as Fireblocks webhooks arrive.
streamRouter.get("/transactions", (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(": connected\n\n");

  // Replay current known statuses so a late subscriber isn't blank.
  for (const e of txEvents.snapshot()) {
    res.write(`data: ${JSON.stringify(e)}\n\n`);
  }

  const onTx = (e: TxStatusEvent) => res.write(`data: ${JSON.stringify(e)}\n\n`);
  txEvents.on("tx", onTx);

  const heartbeat = setInterval(() => res.write(": ping\n\n"), 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    txEvents.off("tx", onTx);
  });
});
