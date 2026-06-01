"use client";

interface CountdownOverlayProps {
  step: string;
}

export function CountdownOverlay({ step }: CountdownOverlayProps) {
  const isGo = step === "GO!";
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center select-none"
      style={{ background: "rgba(0,0,0,0.35)" }}
    >
      <span
        key={step}
        className="font-black animate-pulse-rep leading-none"
        style={{
          fontSize: "clamp(120px, 30vw, 200px)",
          color: isGo ? "#2DD881" : "#FF3B3B",
          textShadow: isGo
            ? "0 0 40px rgba(45,216,129,0.6), 0 0 80px rgba(45,216,129,0.3)"
            : "0 0 40px rgba(255,59,59,0.6), 0 0 80px rgba(255,59,59,0.3)",
        }}
      >
        {step}
      </span>
    </div>
  );
}
