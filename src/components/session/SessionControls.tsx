"use client";

import { Button } from "@/components/ui/Button";

interface SessionControlsProps {
  timerSeconds: number;
  onEndSession: () => void;
  disabled?: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SessionControls({
  timerSeconds,
  onEndSession,
  disabled = false,
}: SessionControlsProps) {
  return (
    <div className="flex items-center gap-4 w-full max-w-[800px] mx-auto mt-4">
      <div className="flex-1 glass-card px-4 py-3 font-mono text-xl animate-blink-timer">
        ⏱ {formatTime(timerSeconds)}
      </div>
      <Button
        variant="danger"
        size="lg"
        onClick={onEndSession}
        disabled={disabled}
        className="flex-1"
        aria-label="End session"
      >
        End Session ■
      </Button>
    </div>
  );
}
