import { useCallback, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Coords = { top: number; left: number };

const BUBBLE_WIDTH = 248;

/** Small accessible info tooltip rendered into <body> so it never clips. */
export function InfoTip({ label, content }: { label: string; content: ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<Coords | null>(null);

  const open = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    let left = r.left + r.width / 2 - BUBBLE_WIDTH / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - BUBBLE_WIDTH - margin));
    const top = r.bottom + 8;
    setCoords({ top, left });
  }, []);

  const close = useCallback(() => setCoords(null), []);

  return (
    <span className="tip">
      <button
        ref={ref}
        type="button"
        className="tip-btn"
        aria-label={label}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        onClick={(e) => {
          e.preventDefault();
          coords ? close() : open();
        }}
      >
        i
      </button>
      {coords
        ? createPortal(
            <span className="tip-bubble" role="tooltip" style={{ top: coords.top, left: coords.left }}>
              {content}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
