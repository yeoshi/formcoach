"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { IssueCard } from "./IssueCard";
import { RepTimeline } from "./RepTimeline";
import { generateReport } from "@/lib/api/bedrock";
import { getSession, updateSession } from "@/lib/storage/sessions";
import type { Session } from "@/lib/types";
import type { SessionDataForReport } from "@/lib/types";
import type { ViolationRule } from "@/lib/pose/types";

interface ReportCardProps {
  sessionId: string;
}

function AnimatedScore({ target }: { target: number }) {
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 20));
    const interval = setInterval(() => {
      current = Math.min(target, current + step);
      setScore(current);
      if (current >= target) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [target]);

  const color =
    score >= 80 ? "text-accent-green" : score >= 50 ? "text-accent-amber" : "text-accent-red";

  return <span className={`font-mono text-3xl font-bold ${color}`}>{score}</span>;
}

function scoreColor(score: number): "green" | "amber" | "red" {
  if (score >= 80) return "green";
  if (score >= 50) return "amber";
  return "red";
}

export function ReportCard({ sessionId }: ReportCardProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const s = getSession(sessionId);
    setSession(s);
    setLoading(false);
  }, [sessionId]);

  const handleRetryReport = async () => {
    if (!session) return;
    setRetrying(true);
    try {
      const sessionData: SessionDataForReport = {
        exercise: "push-up",
        totalReps: session.totalReps,
        durationSeconds: session.durationSeconds,
        violations: session.violations.map((v) => ({
          rule: v.rule,
          repNumber: v.repNumber,
          severity: v.severity,
          timestamp: v.timestamp,
        })),
        repData: session.repData,
      };
      const report = await generateReport(sessionData);
      const updated = { ...session, report, formScore: report.formScore };
      updateSession(updated);
      setSession(updated);
    } catch {
      alert("Report generation failed. Please try again.");
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 page-fade">
        <div className="h-8 w-48 bg-surface rounded animate-pulse" />
        <div className="h-32 bg-surface rounded-card animate-pulse" />
        <div className="h-48 bg-surface rounded-card animate-pulse" />
      </div>
    );
  }

  if (!session) {
    return (
      <Card>
        <p className="text-text-secondary mb-4">Session not found.</p>
        <Link href="/" className="text-accent-blue hover:underline">
          ← Back to Home
        </Link>
      </Card>
    );
  }

  if (!session.report) {
    return (
      <Card>
        <p className="text-text-secondary mb-4">
          Report couldn&apos;t be generated.
        </p>
        <Button onClick={handleRetryReport} disabled={retrying}>
          {retrying ? "Generating…" : "Retry Report"}
        </Button>
      </Card>
    );
  }

  const report = session.report;
  const date = new Date(session.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-8 page-fade">
      <div>
        <h1 className="text-2xl font-bold mb-1">SESSION COMPLETE ✅</h1>
        <p className="text-text-secondary">
          {date} · Push-ups
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <div className="font-mono text-3xl font-bold">{session.totalReps}</div>
          <div className="text-xs text-text-secondary mt-1">reps</div>
        </Card>
        <Card className="text-center">
          <div className="font-mono text-3xl font-bold">
            {formatTime(session.durationSeconds)}
          </div>
          <div className="text-xs text-text-secondary mt-1">time</div>
        </Card>
        <Card className="text-center">
          <AnimatedScore target={report.formScore} />
          <div className="text-xs text-text-secondary mt-1">score</div>
        </Card>
      </div>

      <div>
        <ProgressBar
          value={report.formScore}
          color={scoreColor(report.formScore)}
          className="mb-3"
        />
        <p className="text-text-secondary italic">&ldquo;{report.summary}&rdquo;</p>
      </div>

      {report.topIssues.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-text-secondary tracking-wider mb-4">
            TOP ISSUES TO FIX
          </h2>
          <div className="space-y-4">
            {report.topIssues.map((issue, i) => (
              <IssueCard
                key={issue.rule}
                rule={issue.rule as ViolationRule}
                count={issue.count}
                explanation={issue.explanation}
                fix={issue.fix}
                frameBase64={
                  session.flaggedFrames[issue.frameIndex]?.imageBase64
                }
                index={i}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-text-secondary tracking-wider mb-3">
          🎯 NEXT SESSION FOCUS
        </h2>
        <Card className="border-l-4 border-l-accent-blue">
          {report.nextSessionFocus}
        </Card>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-text-secondary tracking-wider mb-4">
          REP-BY-REP BREAKDOWN
        </h2>
        <RepTimeline repBreakdown={report.repBreakdown} />
      </section>

      <Link href="/session">
        <Button size="lg" className="w-full">
          Start New Session →
        </Button>
      </Link>
    </div>
  );
}
