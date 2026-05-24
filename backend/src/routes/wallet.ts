import { Router, type Request, type Response } from "express";
import { z } from "zod";
import * as wallet from "../services/wallet-service.js";

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
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "validation_failed", details: z.treeifyError(parsed.error) });
      return;
    }
    const idempotencyKey = req.header("Idempotency-Key") ?? undefined;
    const result = await wallet.createTransfer({ ...parsed.data, idempotencyKey });
    res.status(201).json(result);
  })
);

walletRouter.get(
  "/transfers/:txId",
  asyncH(async (req, res) => {
    res.json(await wallet.getTransfer(String(req.params.txId)));
  })
);
