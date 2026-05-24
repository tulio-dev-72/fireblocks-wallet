import { Router, type Request, type Response, raw } from "express";
import { isAuthenticWebhook } from "../lib/verify-webhook.js";
import { txEvents } from "../services/events.js";

export const webhookRouter = Router();

// Raw body required: the signature is over the exact bytes Fireblocks sent.
webhookRouter.post("/fireblocks", raw({ type: "*/*" }), (req: Request, res: Response) => {
  const rawBody = req.body as Buffer;
  const signature = req.header("Fireblocks-Signature") ?? "";

  if (!isAuthenticWebhook(rawBody, signature)) {
    console.warn("[webhook] REJECTED — bad/missing signature");
    return res.status(401).send("invalid signature");
  }

  let event: any;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).send("invalid json");
  }

  const type = event.type ?? event.eventType;
  const d = event.data ?? {};

  if (d.id && d.status) {
    txEvents.publish({
      txId: d.id,
      status: d.status,
      subStatus: d.subStatus,
      assetId: d.assetId,
      amount: d.amountInfo?.amount ?? String(d.amount ?? ""),
      at: new Date().toISOString(),
    });
    console.log(`[webhook] ${type}  tx=${d.id}  status=${d.status}`);
  }

  // Ack fast (2xx) or Fireblocks retries.
  res.sendStatus(200);
});
