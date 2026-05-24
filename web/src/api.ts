// Requests are same-origin in dev (Vite proxy) → no CORS, no secrets in the browser.
export interface VaultAsset { assetId: string; total: string; available: string }
export interface Vault { id: string; name: string; assets: VaultAsset[] }
export interface TransferStatus {
  txId: string; status: string; subStatus?: string; assetId?: string; amount?: string; txHash?: string
}
export interface TxStatusEvent {
  txId: string; status: string; subStatus?: string; assetId?: string; amount?: string; at: string
}
export interface TransferSummary {
  txId?: string; status?: string; operation?: string; assetId?: string
  amount?: string; createdAt?: number; sourceName?: string; destName?: string
}
export interface Approval {
  id: string; requestedByRole: string; state: string; createdAt: number
  input: { sourceVaultId: string; destVaultId: string; assetId: string; amount: string; note?: string }
}
// POST /transfers returns either an immediate submission or a held approval.
export interface TransferResponse {
  state: "SUBMITTED" | "PENDING_APPROVAL"
  txId?: string; status?: string; requiresApproval?: boolean; approvalId?: string
}
export interface DecisionResponse {
  state: "APPROVED" | "REJECTED"; approvalId: string; txId?: string; status?: string
}

export type Role = "viewer" | "initiator" | "approver" | "admin"

// The active role is sent on every request so the backend can enforce it.
let currentRole: Role = (localStorage.getItem("role") as Role) || "admin"
export function getRole(): Role { return currentRole }
export function setRole(r: Role) { currentRole = r; localStorage.setItem("role", r) }

// Dev: empty base → Vite proxy. Prod: point at the deployed backend via
// VITE_API_BASE_URL (set in the Vercel/Netlify env).
const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Demo-Role': currentRole, ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

export const api = {
  listVaults: () => req<{ vaults: Vault[] }>('/api/vaults'),
  listTransactions: () => req<{ transactions: TransferSummary[] }>('/api/transactions'),
  listApprovals: () => req<{ approvals: Approval[] }>('/api/approvals'),
  decideApproval: (id: string, decision: "approve" | "reject") =>
    req<DecisionResponse>(`/api/approvals/${id}`, { method: 'POST', body: JSON.stringify({ decision }) }),
  createTransfer: (input: {
    sourceVaultId: string; destVaultId: string; assetId: string; amount: string; note?: string; idempotencyKey: string
  }) =>
    req<TransferResponse>('/api/transfers', {
      method: 'POST',
      headers: { 'Idempotency-Key': input.idempotencyKey },
      body: JSON.stringify(input),
    }),
  getTransfer: (txId: string) => req<TransferStatus>(`/api/transfers/${txId}`),
  resetDemo: () => req<{ ok: boolean }>('/api/demo/reset', { method: 'POST' }),
}

// Live transaction status via Server-Sent Events (native browser EventSource).
export function subscribeToTxStatus(onEvent: (e: TxStatusEvent) => void): () => void {
  const es = new EventSource(`${BASE}/stream/transactions`)
  es.onmessage = (msg) => {
    try { onEvent(JSON.parse(msg.data) as TxStatusEvent) } catch { /* ignore */ }
  }
  return () => es.close()
}
