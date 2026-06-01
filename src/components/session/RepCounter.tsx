"use client";

import { useEffect, useState } from "react";

interface RepCounterProps {
  count: number;
  pulse?: boolean;
}

export function RepCounter({ count, pulse = false }: RepCounterProps) {
  const [animating, setAnimating] = useState(false);
  const [prevCount, setPrevCount] = useState(count);

  useEffect(() => {
    if (count > prevCount) {
      setAnimating(true);
      const t = setTimeout(() => setAnimating(false), 400);
      setPrevCount(count);
      return () => clearTimeout(t);
    }
    setPrevCount(count);
  }, [count, prevCount]);

  return (
    <div
      className={`absolute top-4 right-4 z-10 px-4 py-3 rounded-full bg-bg/70 backdrop-blur-md border border-border ${
        animating || pulse ? "animate-pulse-rep" : ""
      }`}
    >
      <div
        className={`font-mono text-5xl font-bold text-text-primary leading-none ${
          pulse ? "text-accent-green" : ""
        }`}
      >
        {String(count).padStart(2, "0")}
      </div>
      <div className="text-xs text-text-secondary text-center tracking-widest mt-1">
        REPS
      </div>
    </div>
  );
}
