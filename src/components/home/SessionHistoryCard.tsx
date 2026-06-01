"use client";

import Link from "next/link";
import type { Session } from "@/lib/types";

const RULE_LABELS: Record<string, string> = {
  hip_sag: "Hip sag",
  depth: "Depth",
  pike: "Hip pike",
  head_crane: "Head crane",
  lockout: "Lockout",
};

interface SessionHistoryCardProps {
  session: Session;
}

export function SessionHistoryCard({ session }: SessionHistoryCardProps) {
  const date = new Date(session.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const time = new Date(session.date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const score = session.report?.formScore ?? session.formScore;
  const goodReps =
    session.successfulReps ??
    session.repData.filter((r) => r.successful).length;
  const totalReps = session.totalReps;
  const topIssue =
    session.report?.topIssues[0]?.rule ??
    session.violations[0]?.rule ??
    null;

  const scoreColor =
    score >= 80 ? "#2DD881" : score >= 50 ? "#FF6B2C" : "#FF3B3B";

  const pct = Math.min(100, Math.max(0, score));

  return (
    <Link href={`/report/${session.id}`}>
      <div className="bg-surface border border-border rounded-card p-4 hover:border-border-accent transition-colors cursor-pointer group">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-text-primary text-sm font-semibold">{date}</span>
            <span className="text-text-muted text-xs ml-2">{time}</span>
          </div>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-pill"
            style={{
              background: `${scoreColor}22`,
              color: scoreColor,
              border: `1px solid ${scoreColor}44`,
            }}
          >
            {score}/100
          </span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-text-secondary text-sm">
            <span className="text-text-primary font-bold">{goodReps}</span>
            <span className="text-text-muted">/{totalReps}</span>
            <span className="text-text-muted ml-1">reps</span>
          </span>
          {topIssue && (
            <span className="text-xs text-text-muted">
              {RULE_LABELS[topIssue] ?? topIssue}
            </span>
          )}
        </div>

        <div className="h-1.5 w-full rounded-full bg-surface-elevated overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: scoreColor }}
          />
        </div>
      </div>
    </Link>
  );
}
