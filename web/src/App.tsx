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
import { SpeedInsights } from "@vercel/speed-insights/react";

type Tab = "balances" | "send" | "approvals" | "activity";

const TAB_ROLES: Record<Tab, Role[]> = {
  balances: ["viewer", "initiator", "approver", "admin"],
  send: ["initiator", "admin"],
  approvals: ["approver", "admin"],
  activity: ["viewer", "initiator", "approver", "admin"],
};

// Tab nav labels — "send" shows as "Transfer" so it isn't confused with the Send button.
const TAB_LABELS: Record<Tab, string> = {
  balances: "Balances",
  send: "Transfer",
  approvals: "Approvals",
  activity: "Activity",
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
    title: "👋 Welcome — secure digital-asset custody",
    body: "These are live balances straight from Fireblocks. The browser never holds the API key — it only talks to your backend. 👉 Click “Next →” below to begin the walkthrough.",
    tab: "balances",
    role: "admin",
  },
  {
    label: "Step 2 of 5",
    title: "Send a small payment",
    body: "You're acting as an Initiator. The amount (0.0001) is below the policy limit, so it goes straight through. 👉 Click the blue “Send” button below.",
    tab: "send",
    role: "initiator",
    amount: "0.0001",
  },
  {
    label: "Step 3 of 5",
    title: "Now try a large one — watch governance kick in",
    body: "The amount is now 0.02 — above the policy limit. 👉 Click “Send”. Instead of going through, it gets HELD for a second person to approve. That's segregation of duties.",
    tab: "send",
    role: "initiator",
    amount: "0.02",
  },
  {
    label: "Step 4 of 5",
    title: "Approve as a second person",
    body: "You're now an Approver (an Initiator can't approve their own request). 👉 Click the green “Approve & sign” button to release it to Fireblocks for MPC signing.",
    tab: "approvals",
    role: "approver",
  },
  {
    label: "Step 5 of 5",
    title: "✅ Settled — end to end",
    body: "Watch the live status below move to Completed. That's the full governed flow: initiate → policy hold → approval → MPC signing → settled. 👉 Click “Finish & reset” to leave it clean for the next person.",
    tab: "activity",
    role: "approver",
  },
];

export default function App() {
  const [role, setRoleState] = useState<Role>(getRole());
  const [tab, setTab] = useState<Tab>("balances");
  const [pendingCount, setPendingCount] = useState(0);
  const [guideStep, setGuideStep] = useState<number | null>(0); // auto-start the guide
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

  // Auto-advance the guide when the user completes the key action of a step.
  function handleHeld() { if (guideStep === 2) goToStep(3); }       // large send → held → approve step
  function handleApproved() { if (guideStep === 3) goToStep(4); }   // approved → live-status step

  // Clear server demo state (pending approvals + status cache) and reload clean.
  async function resetDemo() {
    try { await api.resetDemo(); } catch { /* ignore */ }
    setRole("admin");
    window.location.reload();
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
          <button className="ghost" onClick={resetDemo} title="Clear demo state and start fresh">Reset demo</button>
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
              <button className="next" onClick={resetDemo}>Finish &amp; reset for next person</button>
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
            {TAB_LABELS[t]}
            {t === "approvals" && pendingCount > 0 && <span className="count">{pendingCount}</span>}
          </button>
        ))}
      </div>

      {tab === "balances" && <Balances />}
      {tab === "send" && <Send amountHint={amountHint} onHeld={handleHeld} pulse={guideStep === 1 || guideStep === 2} />}
      {tab === "approvals" && <Approvals onChange={setPendingCount} onApproved={handleApproved} pulse={guideStep === 3} />}
      {tab === "activity" && <Activity />}
      <SpeedInsights />
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

function Send({ amountHint, onHeld, pulse }: { amountHint?: string; onHeld?: () => void; pulse?: boolean }) {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [source, setSource] = useState("0");
  const [dest, setDest] = useState("1");
  const [asset, setAsset] = useState("ETH_TEST5");
  const [amount, setAmount] = useState("0.0001");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [held, setHeld] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ txId: string; status: string } | null>(null);

  // Load vaults so the user picks by name instead of typing IDs.
  useEffect(() => { api.listVaults().then(({ vaults }) => setVaults(vaults)).catch(() => {}); }, []);

  // The guided demo can prefill the amount to script the flow.
  useEffect(() => { if (amountHint) setAmount(amountHint); }, [amountHint]);

  const label = (v: Vault) => `${v.name} (#${v.id})`;
  const sourceVault = vaults.find((v) => v.id === source);
  const assetOptions = sourceVault?.assets.map((a) => a.assetId) ?? ["ETH_TEST5"];

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
        onHeld?.();
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
      <SelectField label="From" value={source} onChange={setSource}>
        {vaults.map((v) => <option key={v.id} value={v.id}>{label(v)}</option>)}
      </SelectField>
      <SelectField label="To" value={dest} onChange={setDest}>
        {vaults.map((v) => <option key={v.id} value={v.id}>{label(v)}</option>)}
      </SelectField>
      <SelectField label="Asset" value={asset} onChange={setAsset}>
        {assetOptions.map((a) => <option key={a} value={a}>{a}</option>)}
      </SelectField>
      <Input label="Amount" value={amount} onChange={setAmount} />
      <button className={`primary ${pulse ? "pulse-btn" : ""}`} onClick={submit} disabled={submitting}>
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

function Approvals({ onChange, onApproved, pulse }: { onChange: (n: number) => void; onApproved?: () => void; pulse?: boolean }) {
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
      if (res.state === "APPROVED" && res.txId) {
        setReleased({ txId: res.txId, status: res.status ?? "SUBMITTED" });
        onApproved?.();
      }
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
            <button className={`approve ${pulse ? "pulse-btn" : ""}`} disabled={busy === a.id} onClick={() => decide(a.id, "approve")}>
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

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
    </div>
  );
}
