"use client";

import { useEffect, useRef } from "react";
import type { ViolationRule } from "@/lib/pose/types";

const RULE_LABELS: Record<ViolationRule, string> = {
  hip_sag: "Hip Sag",
  depth: "Insufficient Depth",
  pike: "Hip Pike",
  head_crane: "Head Crane",
  lockout: "Incomplete Lockout",
};

const HIGHLIGHT_POSITIONS: Record<
  ViolationRule,
  { x: number; y: number; r: number }
> = {
  hip_sag: { x: 0.5, y: 0.55, r: 0.15 },
  pike: { x: 0.5, y: 0.55, r: 0.15 },
  depth: { x: 0.4, y: 0.45, r: 0.12 },
  head_crane: { x: 0.5, y: 0.2, r: 0.1 },
  lockout: { x: 0.4, y: 0.4, r: 0.12 },
};

interface IssueCardProps {
  rule: ViolationRule;
  count: number;
  explanation: string;
  fix: string;
  frameBase64?: string;
  index: number;
}

function AnnotatedFrame({
  src,
  rule,
}: {
  src: string;
  rule: ViolationRule;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const pos = HIGHLIGHT_POSITIONS[rule];
      const cx = pos.x * canvas.width;
      const cy = pos.y * canvas.height;
      const radius = pos.r * Math.min(canvas.width, canvas.height);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(255, 69, 58, 0.9)";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 69, 58, 0.2)";
      ctx.fill();
    };
    img.src = src;
  }, [src, rule]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg border-2 border-accent-red/50 transition-transform hover:scale-[1.02]"
    />
  );
}

export function IssueCard({
  rule,
  count,
  explanation,
  fix,
  frameBase64,
  index,
}: IssueCardProps) {
  return (
    <div
      className="bg-surface border border-border rounded-card overflow-hidden animate-slide-up"
      style={{ animationDelay: `${index * 100}ms`, borderLeft: "4px solid #FF3B3B" } as React.CSSProperties}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg text-text-primary">
            {index + 1}. {RULE_LABELS[rule]}
          </h3>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-accent-orange/20 text-accent-orange border border-accent-orange/30">
            {count} reps
          </span>
        </div>
      </div>
      {frameBase64 && (
        <div className="overflow-hidden border-y border-accent-red/30">
          <AnnotatedFrame src={frameBase64} rule={rule} />
        </div>
      )}
      <div className="p-4 pt-3">
        <p className="text-text-secondary text-sm mb-4 leading-relaxed">{explanation}</p>
        <div
          className="rounded-xl p-3 text-sm leading-relaxed"
          style={{ background: "rgba(255,107,44,0.1)", borderLeft: "3px solid #FF6B2C" }}
        >
          💡 <span className="text-text-primary">{fix}</span>
        </div>
      </div>
    </div>
  );
}
