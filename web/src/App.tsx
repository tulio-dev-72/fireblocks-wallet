import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  getRole,
  setRole,
  type Role,
  type Vault,
  type Approval,
  type TransferSummary,
} from "./api";
import { Logo } from "./Logo";
import { TransactionLifecycle } from "./TxLifecycle";

type Tab = "balances" | "send" | "approvals" | "activity";

const TAB_ROLES: Record<Tab, Role[]> = {
  balances: ["viewer", "initiator", "approver", "admin"],
  send: ["initiator", "admin"],
  approvals: ["approver", "admin"],
  activity: ["viewer", "initiator", "approver", "admin"],
};

export default function App() {
  const [role, setRoleState] = useState<Role>(getRole());
  const [tab, setTab] = useState<Tab>("balances");
  const [pendingCount, setPendingCount] = useState(0);

  const canApprove = role === "approver" || role === "admin";

  // Keep the approvals badge fresh for roles that can approve.
  useEffect(() => {
    if (!canApprove) {
      setPendingCount(0);
      return;
    }
    let live = true;
    const tick = () => api.listApprovals().then((r) => live && setPendingCount(r.approvals.length)).catch(() => {});
    tick();
    const id = setInterval(tick, 4000);
    return () => { live = false; clearInterval(id); };
  }, [canApprove, tab]);

  function changeRole(r: Role) {
    setRole(r);
    setRoleState(r);
    if (!TAB_ROLES[tab].includes(r)) setTab("balances");
  }

  const visibleTabs = (Object.keys(TAB_ROLES) as Tab[]).filter((t) => TAB_ROLES[t].includes(role));

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <Logo size={28} />
          <h1>Fireblocks Wallet</h1>
          <span className="pill">Sandbox</span>
        </div>
        <div className="role">
          <label>Role</label>
          <select value={role} onChange={(e) => changeRole(e.target.value as Role)}>
            <option value="viewer">Viewer</option>
            <option value="initiator">Initiator</option>
            <option value="approver">Approver</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      <p className="sub">
        Secure custody demo — the browser talks only to the backend, never to Fireblocks. Your role determines
        what you can do.
      </p>

      <div className="tabs">
        {visibleTabs.map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
            {t === "approvals" && pendingCount > 0 && <span className="count">{pendingCount}</span>}
          </button>
        ))}
      </div>

      {tab === "balances" && <Balances />}
      {tab === "send" && <Send />}
      {tab === "approvals" && <Approvals onChange={setPendingCount} />}
      {tab === "activity" && <Activity />}
    </div>
  );
}

function Balances() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { vaults } = await api.listVaults();
      setVaults(vaults);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="row-between">
        <span className="muted">{vaults.length} vault account(s)</span>
        <button className="ghost" onClick={load}>Refresh</button>
      </div>
      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error">Can’t reach backend: {error}</p>}
      {vaults.map((v) => (
        <div className="card" key={v.id}>
          <div className="card-head">
            <span className="name">{v.name}</span>
            <span className="id">#{v.id}</span>
          </div>
          {v.assets.length === 0 && <span className="muted">No assets</span>}
          {v.assets.map((a) => (
            <div className="asset-row" key={a.assetId}>
              <span className="sym">{a.assetId}</span>
              <span className="amt">{a.available}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Send() {
  const [source, setSource] = useState("0");
  const [dest, setDest] = useState("1");
  const [asset, setAsset] = useState("ETH_TEST5");
  const [amount, setAmount] = useState("0.0001");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [held, setHeld] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ txId: string; status: string } | null>(null);

  async function submit() {
    setError(null); setHeld(null); setSubmitted(null); setSubmitting(true);
    try {
      const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const res = await api.createTransfer({
        sourceVaultId: source, destVaultId: dest, assetId: asset, amount,
        note: "Sent from web wallet", idempotencyKey,
      });
      if (res.state === "PENDING_APPROVAL") {
        setHeld(res.approvalId ?? "");
      } else if (res.txId) {
        setSubmitted({ txId: res.txId, status: res.status ?? "SUBMITTED" });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Input label="From vault" value={source} onChange={setSource} />
      <Input label="To vault" value={dest} onChange={setDest} />
      <Input label="Asset" value={asset} onChange={(v) => setAsset(v.toUpperCase())} />
      <Input label="Amount" value={amount} onChange={setAmount} />
      <button className="primary" onClick={submit} disabled={submitting}>
        {submitting ? "Sending…" : "Send"}
      </button>
      {error && <p className="error">{error}</p>}

      {held !== null && (
        <div className="receipt">
          <div className="kv"><span className="k">Status</span><span className="badge warn">PENDING APPROVAL</span></div>
          <p className="note warn">
            ⚑ This amount is above the approval threshold, so it was <b>held</b> — it has not been sent to Fireblocks.
            Switch to the <b>Approver</b> role to release it (segregation of duties).
          </p>
          <div className="kv"><span className="k">Approval ID</span><span className="v mono">{held}</span></div>
        </div>
      )}

      {submitted && (
        <div>
          <p className="note dim">Transfer submitted — tracking the live lifecycle:</p>
          <TransactionLifecycle txId={submitted.txId} initialStatus={submitted.status} />
        </div>
      )}
    </div>
  );
}

function Approvals({ onChange }: { onChange: (n: number) => void }) {
  const [items, setItems] = useState<Approval[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [released, setReleased] = useState<{ txId: string; status: string } | null>(null);
  const unsub = useRef<(() => void) | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { approvals } = await api.listApprovals();
      setItems(approvals);
      onChange(approvals.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [onChange]);

  useEffect(() => { load(); return () => unsub.current?.(); }, [load]);

  async function decide(id: string, decision: "approve" | "reject") {
    setBusy(id);
    try {
      const res = await api.decideApproval(id, decision);
      if (res.state === "APPROVED" && res.txId) setReleased({ txId: res.txId, status: res.status ?? "SUBMITTED" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="row-between">
        <span className="muted">{items.length} awaiting approval</span>
        <button className="ghost" onClick={load}>Refresh</button>
      </div>
      {error && <p className="error">{error}</p>}
      {items.length === 0 && !released && <p className="empty">Nothing pending. Initiate a large transfer to see one here.</p>}

      {items.map((a) => (
        <div className="card" key={a.id}>
          <div className="card-head">
            <span className="name">{a.input.amount} {a.input.assetId}</span>
            <span className="badge role">from {a.requestedByRole}</span>
          </div>
          <div className="kv"><span className="k">Route</span><span className="v">vault #{a.input.sourceVaultId} → #{a.input.destVaultId}</span></div>
          <div className="row-between" style={{ marginTop: 12, marginBottom: 0 }}>
            <button className="reject" disabled={busy === a.id} onClick={() => decide(a.id, "reject")}>Reject</button>
            <button className="approve" disabled={busy === a.id} onClick={() => decide(a.id, "approve")}>
              {busy === a.id ? "…" : "Approve & sign"}
            </button>
          </div>
        </div>
      ))}

      {released && (
        <div>
          <p className="note dim">Approved — released to Fireblocks. Live lifecycle:</p>
          <TransactionLifecycle txId={released.txId} initialStatus={released.status} />
        </div>
      )}
    </div>
  );
}

function Activity() {
  const [txs, setTxs] = useState<TransferSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { transactions } = await api.listTransactions();
      setTxs(transactions);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function badge(status?: string) {
    if (status === "COMPLETED") return "badge good";
    if (status && ["FAILED", "REJECTED", "CANCELLED", "BLOCKED"].includes(status)) return "badge bad";
    return "badge warn";
  }

  return (
    <div>
      <div className="row-between">
        <span className="muted">Recent transactions</span>
        <button className="ghost" onClick={load}>Refresh</button>
      </div>
      {error && <p className="error">{error}</p>}
      {txs.length === 0 && <p className="empty">No transactions yet.</p>}
      {txs.map((t) => (
        <div className="card" key={t.txId}>
          <div className="card-head">
            <span className="name">{t.amount ?? "?"} {t.assetId}</span>
            <span className={badge(t.status)}>{t.status}</span>
          </div>
          <div className="kv">
            <span className="k">{t.sourceName ?? "?"} → {t.destName ?? "?"}</span>
            <span className="v muted">{t.createdAt ? new Date(t.createdAt).toLocaleString() : ""}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
