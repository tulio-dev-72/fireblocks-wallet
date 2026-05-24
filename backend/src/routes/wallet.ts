import { Router, type Request, type Response } from "express";
import { z } from "zod";
import * as wallet from "../services/wallet-service.js";
import * as approvals from "../services/approvals.js";
import { txEvents } from "../services/events.js";
import { config } from "../config.js";
import { roleFromRequest, can } from "../lib/roles.js";

export const walletRouter = Router();

const asyncH =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response) =>
    fn(req, res).catch((err) => {
      const status = err?.response?.statusCode ?? err?.statusCode ?? 500;
      const message = err?.response?.data?.message ?? err?.message ?? "Internal error";
      console.error(`[wallet] ${req.method} ${req.path} -> ${status}: ${message}`);
      res.status(status >= 400 && status < 600 ? status : 502).json({ error: message });
    });

walletRouter.get(
  "/vaults",
  asyncH(async (_req, res) => {
    res.json({ vaults: await wallet.listVaults() });
  })
);

walletRouter.get(
  "/vaults/:id",
  asyncH(async (req, res) => {
    res.json(await wallet.getVaultBalances(String(req.params.id)));
  })
);

const transferSchema = z.object({
  sourceVaultId: z.string().min(1),
  destVaultId: z.string().min(1),
  assetId: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d+)?$/, "amount must be a positive decimal string"),
  note: z.string().max(200).optional(),
});

walletRouter.post(
  "/transfers",
  asyncH(async (req, res) => {
    const role = roleFromRequest(req);
    if (!can.initiate(role)) {
      res.status(403).json({ error: `Role '${role}' cannot initiate transfers` });
      return;
    }
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "validation_failed", details: z.treeifyError(parsed.error) });
      return;
    }
    const input = { ...parsed.data, idempotencyKey: req.header("Idempotency-Key") ?? undefined };

    // Governance: above the threshold, hold for a second actor — don't touch
    // Fireblocks yet (segregation of duties).
    if (Number(input.amount) >= config.APPROVAL_THRESHOLD) {
      const approval = approvals.enqueue(input, role);
      res.status(202).json({
        state: "PENDING_APPROVAL",
        approvalId: approval.id,
        requiresApproval: true,
      });
      return;
    }

    const result = await wallet.createTransfer(input);
    res.status(201).json({ ...result, state: "SUBMITTED" });
  })
);

walletRouter.get(
  "/approvals",
  asyncH(async (_req, res) => {
    res.json({ approvals: approvals.listPending() });
  })
);

const decisionSchema = z.object({ decision: z.enum(["approve", "reject"]) });

walletRouter.post(
  "/approvals/:id",
  asyncH(async (req, res) => {
    const role = roleFromRequest(req);
    if (!can.approve(role)) {
      res.status(403).json({ error: `Role '${role}' cannot approve transfers` });
      return;
    }
    const parsed = decisionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "decision must be 'approve' or 'reject'" });
      return;
    }
    const approval = approvals.get(String(req.params.id));
    if (!approval || approval.state !== "PENDING_APPROVAL") {
      res.status(404).json({ error: "approval not found or already decided" });
      return;
    }

    if (parsed.data.decision === "reject") {
      approvals.markRejected(approval.id, role);
      res.json({ state: "REJECTED", approvalId: approval.id });
      return;
    }

    const result = await wallet.createTransfer(approval.input);
    approvals.markApproved(approval.id, result.txId, role);
    res.json({ state: "APPROVED", approvalId: approval.id, ...result });
  })
);

// Reset the in-memory demo state (pending approvals + cached status events) so
// each run starts clean. Does not touch real Fireblocks balances.
walletRouter.post(
  "/demo/reset",
  asyncH(async (_req, res) => {
    approvals.clear();
    txEvents.clear();
    res.json({ ok: true });
  })
);

walletRouter.get(
  "/transactions",
  asyncH(async (_req, res) => {
    res.json({ transactions: await wallet.listRecentTransfers() });
  })
);

walletRouter.get(
  "/transfers/:txId",
  asyncH(async (req, res) => {
    res.json(await wallet.getTransfer(String(req.params.txId)));
  })
);
