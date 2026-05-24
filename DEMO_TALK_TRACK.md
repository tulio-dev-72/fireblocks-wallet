# Fireblocks Digital-Asset Custody — Demo Talk Track

**Live demo:** https://tulio-dev-72.github.io/fireblocks-wallet/
**Audience:** revenue / GTM leadership · **Runtime:** ~2–3 minutes · **Environment:** Fireblocks Sandbox (test funds only)

---

## 🎯 Open with this (the one-liner)

> "This is a working digital-asset custody app built on Fireblocks. I want to show you, in two minutes, how a governed transfer actually works — and why that governance is the thing enterprises pay for."

Then: *"Everything you'll see runs against a live Fireblocks workspace. No slides — it's real."*

---

## 💡 Why it matters (the CRO frame)

Lead with revenue, not technology:

| Theme | The point to land |
|---|---|
| **Time-to-revenue** | Integrating custody used to take weeks. This governed flow — initiate, approve, sign, settle — was built and deployed in a single working session. Faster integration = customers go live sooner = revenue lands sooner. |
| **Cost-to-serve** | The platform enforces the rules (policy, approvals, signing). Fewer bespoke builds, fewer support tickets. |
| **Differentiation** | MPC custody + policy governance is the moat. Competitors make you bolt this on; here it's native. |

> "The headline isn't 'we can move tokens.' It's 'no single person can move funds alone, and the platform proves it.'"

---

## 🎬 The live demo — what to say at each step

The app **auto-starts a guided walkthrough** and switches roles/tabs for you. Just read along and click the pulsing button.

**Step 1 — Welcome / Balances**
> "These are live balances pulled from Fireblocks. Notice: the browser never holds the API key — it only talks to our backend. That separation is the first security principle."

**Step 2 — Send a small payment**
> "As an Initiator, I send a small amount. It's under the policy limit, so it goes straight through — fast path for routine activity."

**Step 3 — Send a large one (governance kicks in)**
> "Now a larger amount. Watch — instead of going through, it gets **held**. It was *never sent to Fireblocks*. A second person has to approve. This is segregation of duties, enforced."

**Step 4 — Approve as a second person**
> "I switch hats to an Approver. An initiator can't approve their own request. I approve it — *only now* does it go to Fireblocks for MPC signing."

**Step 5 — Settled**
> "And it settles — live, end to end. Initiate → policy hold → approval → MPC signing → settled. That's institutional custody in one flow."

**Close:**
> "Every control you just saw — roles, policy thresholds, approvals, signing — is how Fireblocks turns 'moving crypto' into 'governed treasury operations.' That's what we sell."

---

## 🛠️ Under the hood — what I built (backend reference)

Use this to answer "how does this actually work?" with confidence.

**Architecture — the security boundary**
```
Browser / web app  →  Our backend (holds credentials, enforces policy)  →  Fireblocks API
                                   ↑ signed webhooks (live status)
```
The Fireblocks API key + private key live **only** on the server. The front-end is a thin client — it never sees a secret. This is the non-negotiable enterprise pattern.

**Backend service** (Node + TypeScript + Express, Fireblocks TS SDK):
- **Vaults & balances** — reads vault accounts and per-asset balances.
- **Transfers** — creates transactions with **idempotency keys** (a double-tap or network retry never double-spends).
- **Governance gate** — transfers at/above a configured threshold are **held server-side** for approval and are *not* sent to Fireblocks until released. This demonstrates segregation of duties at the app tier; in production the authoritative enforcement is the **Fireblocks Transaction Authorization Policy (TAP)**.
- **Role-based access** — `viewer / initiator / approver / admin`, **enforced on the server** (an initiator literally cannot call the approve endpoint).
- **Approval queue** — approve/reject endpoints, role-checked.
- **Webhook receiver** — verifies Fireblocks' **RSA-SHA512 signature** on every event (forged status updates are rejected).
- **Live status (SSE)** — streams transaction status to the UI in real time as webhooks land.
- **Input validation** at every boundary (zod schemas).

**Deployment**
- **Backend:** Render (always-on) — credentials stored as a secret file, never in the repo.
- **Web:** static build on GitHub Pages, talks to the backend over HTTPS with CORS locked appropriately.

**The meta-point worth making to a technical CRO:**
> "I went from reading the docs to this deployed, governed app fast — using Fireblocks' developer tooling. That developer velocity *is* a GTM asset: it's how customers get to production quickly."

---

## ❓ Likely questions (and honest answers)

- **"Is this production-ready?"** — No, it's a Sandbox demo of the *flow*. Production adds: real authentication, the Fireblocks API Co-Signer in a secure enclave, TAP policy as the enforcement layer, audit logging, and a secrets manager. The *architecture* (secret isolation, segregation of duties) is already right.
- **"Could a customer break in?"** — The demo link has no login (test funds only). Production gates every call behind auth + policy.
- **"How long to real deployment?"** — The integration pattern is done; the remaining work is the production hardening above, most of which is Fireblocks configuration, not custom code.

---

## ✅ One-paragraph version (if you only have 30 seconds)

> "I built a working Fireblocks custody app. A user initiates a transfer; if it's over the policy limit, the platform holds it and requires a *different* person to approve before it's ever signed. That's segregation of duties, MPC signing, and live settlement — the governance enterprises pay for — and I stood it up fast using Fireblocks' developer tooling. Faster integration means faster time-to-revenue for our customers."
