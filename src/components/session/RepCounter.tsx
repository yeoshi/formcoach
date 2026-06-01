"use client";

import { useEffect, useState } from "react";

interface RepCounterProps {
  count: number;
  successFlash?: boolean;
}

export function RepCounter({ count, successFlash = false }: RepCounterProps) {
  const [animating, setAnimating] = useState(false);
  const [flashGreen, setFlashGreen] = useState(false);
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

  useEffect(() => {
    if (!successFlash) return;
    setFlashGreen(true);
    const t = setTimeout(() => setFlashGreen(false), 200);
    return () => clearTimeout(t);
  }, [successFlash]);

  return (
    <div
      className={`absolute top-4 right-4 z-10 px-5 py-4 rounded-full bg-bg/70 backdrop-blur-md border transition-colors duration-200 ${
        flashGreen
          ? "border-accent-green bg-accent-green/20"
          : "border-border"
      } ${animating ? "animate-pulse-rep" : ""}`}
    >
      <div
        className={`font-mono font-bold leading-none transition-colors duration-200 ${
          flashGreen ? "text-accent-green" : "text-text-primary"
        }`}
        style={{ fontSize: "56px" }}
      >
        {String(count).padStart(2, "0")}
      </div>
      <div className="text-xs text-text-secondary text-center tracking-widest mt-1">
        REPS
      </div>
    </div>
  );
}
