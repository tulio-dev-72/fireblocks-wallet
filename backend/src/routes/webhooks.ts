import { Router, type Request, type Response, raw } from "express";
import { isAuthenticWebhook } from "../lib/verify-webhook.js";
import { txEvents } from "../services/events.js";

export const webhookRouter = Router();

// Raw body required: the signature is over the exact bytes Fireblocks sent.
webhookRouter.post("/fireblocks", raw({ type: "*/*" }), async (req: Request, res: Response) => {
  const rawBody = req.body as Buffer;
  const v2Signature = req.header("Fireblocks-Webhook-Signature") ?? "";
  const legacySignature = req.header("Fireblocks-Signature") ?? "";

  const verification = await isAuthenticWebhook(rawBody, { v2Signature, legacySignature });
  if (!verification.valid) {
    console.warn("[webhook] REJECTED — bad/missing signature");
    return res.status(401).send("invalid signature");
  }

  let event: any;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).send("invalid json");
  }

  // Webhooks v2 uses dotted event names (transaction.status.updated) plus a
  // resourceId at the root; v1 used TRANSACTION_STATUS_UPDATED. Handle both.
  const type = event.eventType ?? event.type;
  const d = event.data ?? {};
  const txId = d.id ?? event.resourceId;

  if (txId && d.status) {
    txEvents.publish({
      txId,
      status: d.status,
      subStatus: d.subStatus,
      assetId: d.assetId,
      amount: d.amountInfo?.amount ?? String(d.amount ?? ""),
      at: new Date().toISOString(),
    });
    console.log(`[webhook v=${verification.method}] ${type}  tx=${txId}  status=${d.status}`);
  }

  // Ack fast (2xx) or Fireblocks retries.
  res.sendStatus(200);
});
