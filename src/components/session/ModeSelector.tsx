"use client";

export type SessionMode = "ippt" | "free";

interface ModeSelectorProps {
  mode: SessionMode;
  onChange: (mode: SessionMode) => void;
  locked?: boolean;
}

export function ModeSelector({ mode, onChange, locked = false }: ModeSelectorProps) {
  return (
    <div
      className={`absolute top-3 left-1/2 -translate-x-1/2 z-30 flex gap-2 ${
        locked ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onChange("ippt")}
        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
          mode === "ippt"
            ? "bg-[#FF9500] text-white border-[#FF9500]"
            : "bg-transparent text-text-secondary border-border"
        }`}
      >
        60s IPPT
      </button>
      <button
        type="button"
        onClick={() => onChange("free")}
        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
          mode === "free"
            ? "bg-[#FF9500] text-white border-[#FF9500]"
            : "bg-transparent text-text-secondary border-border"
        }`}
      >
        Free Mode
      </button>
    </div>
  );
}
