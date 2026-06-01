"use client";

import type { SetupOverlayState } from "@/lib/pose/bodyDetection";

interface SetupOverlayProps {
  state: SetupOverlayState;
  holdProgress: number;
  countdownLabel: string | null;
  showSkeleton?: boolean;
}

const RING_SIZE = 120;
const RING_RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function SetupOverlay({
  state,
  holdProgress,
  countdownLabel,
  showSkeleton = false,
}: SetupOverlayProps) {
  const offset = CIRCUMFERENCE - (holdProgress / 100) * CIRCUMFERENCE;

  return (
    <div
      className={`absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6 ${
        showSkeleton ? "bg-bg/40" : "bg-bg/70 backdrop-blur-sm"
      }`}
    >
      {state === "no_person" && (
        <div className="animate-setup-pulse">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            STEP INTO FRAME
          </h2>
          <p className="text-text-secondary text-sm md:text-base">
            Position your laptop to your side, about 1.5m away
          </p>
        </div>
      )}

      {state === "not_pushup" && (
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-accent-amber mb-3">
            GET INTO PUSH-UP POSITION
          </h2>
          <p className="text-text-secondary text-sm md:text-base">
            I&apos;ll start the countdown when you&apos;re ready
          </p>
        </div>
      )}

      {state === "holding" && (
        <div>
          <h2 className="text-xl font-bold text-[#2DD881] mb-6">
            HOLD POSITION...
          </h2>
          <div className="relative mx-auto mb-4" style={{ width: RING_SIZE, height: RING_SIZE }}>
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={RING_RADIUS}
                fill="none"
                stroke="#2A2A2E"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r={RING_RADIUS}
                fill="none"
                stroke="#2DD881"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={offset}
                className="transition-all duration-75"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-mono text-3xl font-bold text-white">
              {Math.max(1, Math.ceil(3 * (1 - holdProgress / 100)))}
            </span>
          </div>
          <p className="text-[#2DD881] text-sm">
            Stay still — starting in 3 seconds
          </p>
        </div>
      )}

      {state === "countdown" && countdownLabel && (
        <div>
          <div
            className="relative mx-auto mb-4 flex items-center justify-center rounded-full border-4 border-[#2DD881]"
            style={{ width: RING_SIZE, height: RING_SIZE }}
          >
            <span className="font-mono text-5xl font-bold text-white animate-pulse-rep">
              {countdownLabel}
            </span>
          </div>
          <p className="text-[#2DD881] text-sm">Calibrating your form…</p>
        </div>
      )}
    </div>
  );
}
