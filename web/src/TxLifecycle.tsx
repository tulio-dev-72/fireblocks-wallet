import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { STAGES, stageIndexForStatus, isTerminal, isFailure } from "./lifecycle";

export function TransactionLifecycle({
  txId,
  initialStatus,
}: {
  txId: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  // Track the furthest stage reached so the pipeline only moves forward.
  const [reached, setReached] = useState(() => stageIndexForStatus(initialStatus));
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function apply(s: string) {
      setStatus(s);
      setReached((r) => Math.max(r, stageIndexForStatus(s)));
    }
    timer.current = setInterval(async () => {
      try {
        const tx = await api.getTransfer(txId);
        if (tx.status) {
          apply(tx.status);
          if (isTerminal(tx.status) && timer.current) {
            clearInterval(timer.current);
            timer.current = null;
          }
        }
      } catch {
        /* keep polling */
      }
    }, 1500);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [txId]);

  const failed = isFailure(status);
  const done = status === "COMPLETED";

  return (
    <div className="lifecycle">
      {STAGES.map((stage, i) => {
        const state =
          failed && i === reached
            ? "failed"
            : i < reached || done
            ? "done"
            : i === reached
            ? "active"
            : "pending";
        return (
          <div className={`step ${state}`} key={stage.key}>
            <div className="dot">{state === "done" ? "✓" : state === "failed" ? "✕" : i + 1}</div>
            <div className="step-text">
              <div className="step-label">{stage.label}</div>
              <div className="step-hint">{stage.hint}</div>
            </div>
            {i < STAGES.length - 1 && <div className="connector" />}
          </div>
        );
      })}
      <div className="lifecycle-status">
        Live status: <span className="mono">{status}</span>
      </div>
    </div>
  );
}
