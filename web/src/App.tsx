import { useCallback, useEffect, useState } from "react";
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

interface GuideStep {
  label: string;
  title: string;
  body: string;
  tab: Tab;
  role: Role;
  amount?: string;
}

const STEPS: GuideStep[] = [
  {
    label: "Step 1 of 5",
    title: "See your vaults",
    body: "These balances are live from Fireblocks. The browser never talks to Fireblocks directly or holds the API key — it only calls your backend. Even a read-only Viewer can see this.",
    tab: "balances",
    role: "admin",
  },
  {
    label: "Step 2 of 5",
    title: "Initiate a small transfer",
    body: "You're now an Initiator. Amounts under the policy limit go straight through. Hit Send — it submits to Fireblocks immediately.",
    tab: "send",
    role: "initiator",
    amount: "0.0001",
  },
  {
    label: "Step 3 of 5",
    title: "Trigger governance",
    body: "Now the amount is 0.02 — above the policy threshold. Hit Send and watch: it gets HELD, never sent to Fireblocks, because a second person must approve. That's segregation of duties.",
    tab: "send",
    role: "initiator",
    amount: "0.02",
  },
  {
    label: "Step 4 of 5",
    title: "Approve as a second person",
    body: "An Initiator can't approve their own request. As an Approver, release the held transfer — only now does it go to Fireblocks for MPC signing.",
    tab: "approvals",
    role: "approver",
  },
  {
    label: "Step 5 of 5",
    title: "Watch it settle",
    body: "Track the live lifecycle, then find it in Activity. Governed, approved, signed, settled — end to end.",
    tab: "activity",
    role: "approver",
  },
];

export default function App() {
  const [role, setRoleState] = useState<Role>(getRole());
  const [tab, setTab] = useState<Tab>("balances");
  const [pendingCount, setPendingCount] = useState(0);
  const [guideStep, setGuideStep] = useState<number | null>(null);
  const [amountHint, setAmountHint] = useState<string | undefined>();

  const canApprove = role === "approver" || role === "admin";

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

  // Guided demo: entering a step drives the UI to where it needs to be.
  function goToStep(i: number) {
    const s = STEPS[i];
    if (!s) return;
    setGuideStep(i);
    setRole(s.role);
    setRoleState(s.role);
    setTab(s.tab);
    if (s.amount) setAmountHint(s.amount);
  }

  function changeRole(r: Role) {
    setRole(r);
    setRoleState(r);
    if (!TAB_ROLES[tab].includes(r)) setTab("balances");
  }

  const visibleTabs = (Object.keys(TAB_ROLES) as Tab[]).filter((t) => TAB_ROLES[t].includes(role));
  const step = guideStep !== null ? STEPS[guideStep] : null;

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <Logo size={30} />
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

      {step ? (
        <div className="guide">
          <div className="guide-top">
            <span className="guide-step">{step.label}</span>
          </div>
          <div className="guide-title">{step.title}</div>
          <div className="guide-body">{step.body}</div>
          <div className="guide-actions">
            {guideStep! > 0 && <button className="back" onClick={() => goToStep(guideStep! - 1)}>Back</button>}
            <button className="exit" onClick={() => setGuideStep(null)}>Exit demo</button>
            <span className="spacer" />
            {guideStep! < STEPS.length - 1 ? (
              <button className="next" onClick={() => goToStep(guideStep! + 1)}>Next →</button>
            ) : (
              <button className="next" onClick={() => setGuideStep(null)}>Finish</button>
            )}
          </div>
        </div>
      ) : (
        <div className="guide-start">
          <div>
            <div className="t">Guided demo</div>
            <div className="d">A 5-step walkthrough of the governed transfer flow — it switches roles and tabs for you.</div>
          </div>
          <button onClick={() => goToStep(0)}>Start demo</button>
        </div>
      )}

      <div className="tabs">
        {visibleTabs.map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
            {t === "approvals" && pendingCount > 0 && <span className="count">{pendingCount}</span>}
          </button>
        ))}
      </div>

      {tab === "balances" && <Balances />}
      {tab === "send" && <Send amountHint={amountHint} />}
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

function Send({ amountHint }: { amountHint?: string }) {
  const [source, setSource] = useState("0");
  const [dest, setDest] = useState("1");
  const [asset, setAsset] = useState("ETH_TEST5");
  const [amount, setAmount] = useState("0.0001");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [held, setHeld] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ txId: string; status: string } | null>(null);

  // The guided demo can prefill the amount to script the flow.
  useEffect(() => { if (amountHint) setAmount(amountHint); }, [amountHint]);

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

  useEffect(() => { load(); }, [load]);

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
