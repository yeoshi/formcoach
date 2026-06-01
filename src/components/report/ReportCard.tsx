"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProgressBar } from "@/components/ui/ProgressBar";
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
    score >= 80 ? "#2DD881" : score >= 50 ? "#FF6B2C" : "#FF3B3B";

  return (
    <span className="font-mono text-3xl font-extrabold" style={{ color }}>
      {score}
    </span>
  );
}

function scoreColor(score: number): "green" | "orange" | "red" {
  if (score >= 80) return "green";
  if (score >= 50) return "orange";
  return "red";
}

function StatCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-card p-4 text-center">
      {children}
    </div>
  );
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
        successfulReps:
          session.successfulReps ??
          session.repData.filter((r) => r.successful).length,
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
      <div className="bg-surface border border-border rounded-card p-6 text-center">
        <p className="text-text-secondary mb-4">Session not found.</p>
        <Link href="/" className="text-accent-orange hover:underline">
          ← Back to Home
        </Link>
      </div>
    );
  }

  if (!session.report) {
    return (
      <div className="bg-surface border border-border rounded-card p-6 text-center space-y-4">
        <p className="text-text-secondary">Report couldn&apos;t be generated.</p>
        <button
          type="button"
          onClick={handleRetryReport}
          disabled={retrying}
          className="w-full h-14 text-white font-bold rounded-button disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #FF6B2C 0%, #FF8A50 100%)" }}
        >
          {retrying ? "Generating…" : "Retry Report"}
        </button>
      </div>
    );
  }

  const report = session.report;
  const date = new Date(session.date).toLocaleDateString("en-SG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const successfulReps =
    session.successfulReps ??
    session.repData.filter((r) => r.successful).length;
  const totalAttempts = session.totalReps;

  return (
    <div className="space-y-8 page-fade">
      {/* Header */}
      <div>
        <p className="section-header">Session Complete</p>
        <p className="text-text-muted text-sm">{date} · Push-ups</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard>
          <div className="font-mono font-extrabold leading-none mb-1">
            <span className="text-3xl text-accent-green">{successfulReps}</span>
            <span className="text-base text-text-muted">/{totalAttempts}</span>
          </div>
          <div className="text-xs text-text-secondary uppercase tracking-wide">reps</div>
        </StatCard>
        <StatCard>
          <div className="font-mono text-3xl font-extrabold leading-none mb-1">
            {formatTime(session.durationSeconds)}
          </div>
          <div className="text-xs text-text-secondary uppercase tracking-wide">time</div>
        </StatCard>
        <StatCard>
          <div className="leading-none mb-1">
            <AnimatedScore target={report.formScore} />
          </div>
          <div className="text-xs text-text-secondary uppercase tracking-wide">score</div>
        </StatCard>
      </div>

      {/* Progress bar + summary */}
      <div>
        <ProgressBar
          value={report.formScore}
          color={scoreColor(report.formScore)}
          animated
          className="mb-4 h-2"
        />
        <div className="border-l-4 border-accent-orange pl-4 py-1">
          <p className="text-text-secondary italic text-sm">&ldquo;{report.summary}&rdquo;</p>
        </div>
      </div>

      {/* Top Issues */}
      {report.topIssues.length > 0 && (
        <section>
          <p className="section-header">Top Issues to Fix</p>
          <div className="space-y-4">
            {report.topIssues.map((issue, i) => (
              <IssueCard
                key={issue.rule}
                rule={issue.rule as ViolationRule}
                count={issue.count}
                explanation={issue.explanation}
                fix={issue.fix}
                frameBase64={session.flaggedFrames[issue.frameIndex]?.imageBase64}
                index={i}
              />
            ))}
          </div>
        </section>
      )}

      {/* Next Session Focus */}
      <section>
        <p className="section-header">Next Session Focus</p>
        <div
          className="bg-surface rounded-card p-4 flex items-start gap-3"
          style={{ borderLeft: "4px solid #FF6B2C" }}
        >
          <span className="text-xl shrink-0">🎯</span>
          <p className="text-text-primary text-sm leading-relaxed">
            {report.nextSessionFocus}
          </p>
        </div>
      </section>

      {/* Rep Breakdown */}
      <section>
        <p className="section-header">Rep-by-Rep Breakdown</p>
        <RepTimeline
          repBreakdown={report.repBreakdown}
          repData={session.repData}
        />
      </section>

      {/* CTA */}
      <Link href="/session">
        <button
          type="button"
          className="w-full h-14 text-white font-bold text-base rounded-button transition-all hover:brightness-110 active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #FF6B2C 0%, #FF8A50 100%)",
            boxShadow: "0 4px 20px rgba(255, 107, 44, 0.3)",
          }}
        >
          Start New Session →
        </button>
      </Link>
    </div>
  );
}
