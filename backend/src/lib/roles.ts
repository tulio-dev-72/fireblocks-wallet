import type { Request } from "express";

// DEMO role model mirroring Fireblocks operational roles. Real authorization is
// enforced by Fireblocks (user roles + TAP); this gates the demo UX.
export const ROLES = ["viewer", "initiator", "approver", "admin"] as const;
export type Role = (typeof ROLES)[number];

export function roleFromRequest(req: Request): Role {
  const raw = String(req.header("X-Demo-Role") ?? "admin").toLowerCase();
  return (ROLES as readonly string[]).includes(raw) ? (raw as Role) : "admin";
}

export const can = {
  initiate: (r: Role) => r === "initiator" || r === "admin",
  approve: (r: Role) => r === "approver" || r === "admin",
};
