"use client";

import { useState } from "react";
import type { BedrockReport } from "@/lib/pose/types";

interface RepTimelineProps {
  repBreakdown: BedrockReport["repBreakdown"];
}

const STATUS_ICON = {
  good: "✅",
  minor_issues: "⚠️",
  needs_work: "❌",
};

export function RepTimeline({ repBreakdown }: RepTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? repBreakdown : repBreakdown.slice(0, 5);

  return (
    <div className="space-y-2">
      {visible.map((rep) => (
        <div
          key={rep.repNumber}
          className={`flex items-center gap-3 py-2 px-3 rounded-lg ${
            rep.status === "good"
              ? "text-text-secondary"
              : "bg-surface-hover text-text-primary"
          }`}
        >
          <span className="font-mono w-12">Rep {rep.repNumber}</span>
          <span>{STATUS_ICON[rep.status]}</span>
          <span className="flex-1">
            {rep.status === "good"
              ? "Good form"
              : rep.note ?? "Form issues detected"}
          </span>
        </div>
      ))}
      {repBreakdown.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-accent-blue text-sm hover:underline"
        >
          {expanded ? "Show less" : `Show all ${repBreakdown.length} reps`}
        </button>
      )}
    </div>
  );
}
