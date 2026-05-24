import { randomUUID } from "node:crypto";
import { TransferPeerPathType, TransactionOperation } from "@fireblocks/ts-sdk";
import { fireblocks } from "../lib/fireblocks.js";
import { config } from "../config.js";

export interface VaultSummary {
  id: string;
  name: string;
  assets: { assetId: string; total: string; available: string }[];
}

export async function listVaults(): Promise<VaultSummary[]> {
  const { data } = await fireblocks.vaults.getPagedVaultAccounts({ limit: 50 });
  return (data.accounts ?? []).map((a) => ({
    id: a.id ?? "",
    name: a.name ?? "",
    assets: (a.assets ?? []).map((asset) => ({
      assetId: asset.id ?? "",
      total: asset.total ?? "0",
      available: asset.available ?? "0",
    })),
  }));
}

export async function getVaultBalances(vaultId: string): Promise<VaultSummary> {
  const { data } = await fireblocks.vaults.getVaultAccount({ vaultAccountId: vaultId });
  return {
    id: data.id ?? vaultId,
    name: data.name ?? "",
    assets: (data.assets ?? []).map((asset) => ({
      assetId: asset.id ?? "",
      total: asset.total ?? "0",
      available: asset.available ?? "0",
    })),
  };
}

export interface CreateTransferInput {
  sourceVaultId: string;
  destVaultId: string;
  assetId: string;
  amount: string;
  note?: string;
  idempotencyKey?: string;
}

export interface TransferResult {
  txId: string;
  status: string;
  requiresApproval: boolean;
  idempotencyKey: string;
}

export async function createTransfer(input: CreateTransferInput): Promise<TransferResult> {
  // Governance signal: above the configured threshold, surface that this would
  // hit a higher approval tier. The real enforcement lives in the Fireblocks
  // Transaction Authorization Policy (TAP); this mirrors it for the UX.
  const requiresApproval = Number(input.amount) >= config.APPROVAL_THRESHOLD;

  // Idempotency: a client retry (double-tap, network retry) reuses the key, so
  // Fireblocks returns the original transaction instead of creating a duplicate.
  const idempotencyKey = input.idempotencyKey ?? randomUUID();

  const { data } = await fireblocks.transactions.createTransaction({
    idempotencyKey,
    transactionRequest: {
      operation: TransactionOperation.Transfer,
      assetId: input.assetId,
      source: { type: TransferPeerPathType.VaultAccount, id: input.sourceVaultId },
      destination: { type: TransferPeerPathType.VaultAccount, id: input.destVaultId },
      amount: input.amount,
      note: input.note ?? "mobile wallet transfer",
    },
  });

  return {
    txId: data.id ?? "",
    status: data.status ?? "UNKNOWN",
    requiresApproval,
    idempotencyKey,
  };
}

export async function getTransfer(txId: string) {
  const { data } = await fireblocks.transactions.getTransaction({ txId });
  return {
    txId: data.id,
    status: data.status,
    subStatus: data.subStatus,
    assetId: data.assetId,
    amount: data.amountInfo?.amount,
    source: data.source,
    destination: data.destination,
    txHash: data.txHash,
    createdAt: data.createdAt,
    lastUpdated: data.lastUpdated,
  };
}
