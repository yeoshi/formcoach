"use client";

import { useMemo, useState } from "react";
import type { BedrockReport, RepData, ViolationRule } from "@/lib/pose/types";

interface RepTimelineProps {
  repBreakdown?: BedrockReport["repBreakdown"];
  repData?: RepData[];
}

const STATUS_ICON = {
  good: "✅",
  minor_issues: "⚠️",
  needs_work: "❌",
};

const RULE_LABELS: Record<string, string> = {
  hip_sag: "Hip sag",
  depth: "Shallow",
  pike: "Hip pike",
  head_crane: "Head crane",
  lockout: "Lockout",
};

function buildFromRepData(repData: RepData[]) {
  return repData.map((r) => {
    if (!r.successful) {
      const critical = r.violations.find((v) =>
        ["hip_sag", "depth", "pike"].includes(v)
      );
      return {
        repNumber: r.repNumber,
        status: "needs_work" as const,
        note: critical
          ? `Did not count — ${RULE_LABELS[critical] ?? critical}`
          : "Did not count",
      };
    }
    if (r.violations.length === 0) {
      return {
        repNumber: r.repNumber,
        status: "good" as const,
        note: "Counted ✓",
      };
    }
    const labels = r.violations
      .map((v) => RULE_LABELS[v] ?? v)
      .join(", ");
    return {
      repNumber: r.repNumber,
      status: "minor_issues" as const,
      note: `${labels} (still counted)`,
    };
  });
}

export function RepTimeline({ repBreakdown, repData }: RepTimelineProps) {
  const [expanded, setExpanded] = useState(false);

  const items = useMemo(() => {
    if (repData && repData.length > 0) {
      return buildFromRepData(repData);
    }
    return repBreakdown ?? [];
  }, [repBreakdown, repData]);

  const visible = expanded ? items : items.slice(0, 5);

  return (
    <div className="space-y-2">
      {visible.map((rep) => (
        <div
          key={rep.repNumber}
          className={`flex items-center gap-3 py-2.5 px-3 rounded-xl border-l-4 bg-surface ${
            rep.status === "good"
              ? "border-l-accent-green text-text-secondary"
              : rep.status === "needs_work"
                ? "border-l-accent-red text-text-primary"
                : "border-l-accent-amber text-text-primary"
          }`}
        >
          <span className="font-mono text-sm w-12 shrink-0">Rep {rep.repNumber}</span>
          <span className="text-base">{STATUS_ICON[rep.status]}</span>
          <span className={`flex-1 text-sm ${rep.status === "good" ? "text-accent-green" : ""}`}>
            {rep.status === "good"
              ? "Good form"
              : rep.note ?? "Form issues detected"}
          </span>
        </div>
      ))}
      {items.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-accent-orange text-sm hover:underline"
        >
          {expanded ? "Show less" : `Show all ${items.length} reps`}
        </button>
      )}
    </div>
  );
}
