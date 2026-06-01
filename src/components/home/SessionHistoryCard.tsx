"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Session } from "@/lib/types";

const RULE_LABELS: Record<string, string> = {
  hip_sag: "Hip sag",
  depth: "Depth",
  pike: "Hip pike",
  head_crane: "Head crane",
  lockout: "Lockout",
};

function scoreColor(score: number): "green" | "amber" | "red" {
  if (score >= 80) return "green";
  if (score >= 50) return "amber";
  return "red";
}

interface SessionHistoryCardProps {
  session: Session;
}

export function SessionHistoryCard({ session }: SessionHistoryCardProps) {
  const date = new Date(session.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const score = session.report?.formScore ?? session.formScore;
  const topIssue =
    session.report?.topIssues[0]?.rule ??
    session.violations[0]?.rule ??
    null;

  return (
    <Link href={`/report/${session.id}`}>
      <Card hover>
        <div className="flex justify-between items-start mb-2">
          <span className="text-text-secondary text-sm">{date}</span>
          <span className="font-mono text-sm">
            {session.totalReps} reps · Score: {score}/100
          </span>
        </div>
        {topIssue && (
          <p className="text-sm text-text-secondary mb-3">
            Top issue: {RULE_LABELS[topIssue] ?? topIssue}
          </p>
        )}
        <ProgressBar value={score} color={scoreColor(score)} />
      </Card>
    </Link>
  );
}
