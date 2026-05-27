import { track } from "@vercel/analytics";

export const TRACKED_EVENTS = [
  "app_loaded",
  "walkthrough_started",
  "walkthrough_step_viewed",
  "role_switched",
  "tab_viewed",
  "transfer_initiated",
  "approval_submitted",
  "demo_reset",
] as const;

export type ProductEventName = (typeof TRACKED_EVENTS)[number];

const LOCAL_EVENT_LOG_KEY = "fb_wallet_analytics_events";
const LOCAL_EVENT_LOG_LIMIT = 100;

const BLOCKED_PROPERTY_KEYS =
  /api[_-]?key|secret|token|password|amount|transaction|wallet|address|payload|private|credential|vault|approval_id|tx_id/i;

const SAFE_METADATA_KEYS = new Set([
  "page",
  "role",
  "action",
  "tab",
  "step",
  "path",
  "status",
  "workflow_type",
]);

export interface LocalAnalyticsEvent {
  event: ProductEventName;
  timestamp: string;
  role?: string;
  action?: string;
  tab?: string;
  step?: string;
  path?: string;
  status?: string;
  workflow_type?: string;
}

function sanitizeProperties(
  properties: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const safe: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (BLOCKED_PROPERTY_KEYS.test(key)) continue;
    if (!SAFE_METADATA_KEYS.has(key)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      safe[key] = value;
    }
  }
  return safe;
}

function readLocalEvents(): LocalAnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(LOCAL_EVENT_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalAnalyticsEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function appendLocalEvent(event: LocalAnalyticsEvent) {
  if (typeof window === "undefined") return;
  const next = [event, ...readLocalEvents()].slice(0, LOCAL_EVENT_LOG_LIMIT);
  try {
    window.sessionStorage.setItem(LOCAL_EVENT_LOG_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota errors.
  }
}

export function trackProductEvent(
  event: ProductEventName,
  properties?: Record<string, unknown>,
) {
  const timestamp = new Date().toISOString();
  const safeProps = sanitizeProperties(properties ?? {});
  appendLocalEvent({ event, timestamp, ...safeProps } as LocalAnalyticsEvent);

  if (import.meta.env.PROD) {
    track(event, safeProps);
  }
}
