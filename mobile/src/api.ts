import { API_BASE_URL } from "./config";

export interface VaultAsset {
  assetId: string;
  total: string;
  available: string;
}
export interface Vault {
  id: string;
  name: string;
  assets: VaultAsset[];
}
export interface TransferResult {
  txId: string;
  status: string;
  requiresApproval: boolean;
  idempotencyKey: string;
}
export interface TransferStatus {
  txId: string;
  status: string;
  subStatus?: string;
  assetId?: string;
  amount?: string;
  txHash?: string;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listVaults: () => req<{ vaults: Vault[] }>("/api/vaults"),

  createTransfer: (input: {
    sourceVaultId: string;
    destVaultId: string;
    assetId: string;
    amount: string;
    note?: string;
    idempotencyKey: string;
  }) =>
    req<TransferResult>("/api/transfers", {
      method: "POST",
      headers: { "Idempotency-Key": input.idempotencyKey },
      body: JSON.stringify(input),
    }),

  getTransfer: (txId: string) => req<TransferStatus>(`/api/transfers/${txId}`),
};
