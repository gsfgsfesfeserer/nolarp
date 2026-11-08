"use client";

import { useEffect, useMemo, useState } from "react";

interface PetalSpec {
  left: string;
  size: string;
  dur: string;
  delay: string;
  sway: string;
  amp: string;
  drift: string;
  spin: string;
  op: string;
  pc: string;
  pc2: string;
}

const PALETTE: Array<[string, string]> = [
  ["#ffb7c9", "#ff8fab"],
  ["#ffc7d4", "#ff9eb4"],
  ["#f6a8c0", "#e87ea6"],
  ["#ffd4de", "#ffabc3"],
  ["#f9b8cc", "#e97ba1"],
];

export function Petals({ count = 14, className = "" }: { count?: number; className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const petals = useMemo<PetalSpec[]>(
    () =>
      Array.from({ length: count }, (_, i) => {
        const [pc, pc2] = PALETTE[i % PALETTE.length];
        const size = 7 + Math.random() * 9;
        return {
          left: `${Math.random() * 100}%`,
          size: `${size.toFixed(1)}px`,
          dur: `${(7 + Math.random() * 7).toFixed(2)}s`,
          delay: `${(-Math.random() * 14).toFixed(2)}s`,
          sway: `${(2.4 + Math.random() * 2.6).toFixed(2)}s`,
          amp: `${(10 + Math.random() * 26).toFixed(0)}px`,
          drift: `${(Math.random() * 120 - 60).toFixed(0)}px`,
          spin: `${(3 + Math.random() * 4).toFixed(2)}s`,
          op: (0.35 + Math.random() * 0.45).toFixed(2),
          pc,
          pc2,
        };
      }),
    [count]
  );

  if (!mounted) return null;

  return (
    <div className={`petal-layer ${className}`} aria-hidden="true">
      {petals.map((p, i) => (
        <div
          key={i}
          className="petal-fall"
          style={
            {
              left: p.left,
              "--dur": p.dur,
              "--delay": p.delay,
              "--drift": p.drift,
            } as React.CSSProperties
          }
        >
          <div
            className="petal-sway"
            style={{ "--sway": p.sway, "--amp": p.amp, "--delay": p.delay } as React.CSSProperties}
          >
            <div
              className="petal-leaf"
              style={
                {
                  "--size": p.size,
                  "--spin": p.spin,
                  "--op": p.op,
                  "--pc": p.pc,
                  "--pc2": p.pc2,
                  "--delay": p.delay,
                } as React.CSSProperties
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}
