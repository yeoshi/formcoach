"use client";

import { useEffect, useRef, useState } from "react";

interface SessionControlsProps {
  onEndSession: () => void;
  disabled?: boolean;
}

export function SessionControls({
  onEndSession,
  disabled = false,
}: SessionControlsProps) {
  const [confirming, setConfirming] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleClick = () => {
    if (disabled) return;
    if (confirming) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      onEndSession();
    } else {
      setConfirming(true);
      timeoutRef.current = setTimeout(() => setConfirming(false), 3000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`w-full h-14 font-bold text-base tracking-wide transition-colors disabled:opacity-40 ${
        confirming
          ? "bg-red-700 text-white animate-pulse"
          : "bg-red-600 hover:bg-red-700 text-white"
      }`}
    >
      {confirming ? "TAP AGAIN TO END" : "END SESSION"}
    </button>
  );
}
