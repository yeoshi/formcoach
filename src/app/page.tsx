"use client";

import { useEffect, useState } from "react";
import { HeroSection } from "@/components/home/HeroSection";
import { SessionHistoryCard } from "@/components/home/SessionHistoryCard";
import { getAllSessions } from "@/lib/storage/sessions";
import type { Session } from "@/lib/types";

const STEPS = [
  {
    icon: "📷",
    title: "Position your camera",
    desc: "Place your laptop to your side, about 1.5m away at waist height",
  },
  {
    icon: "💪",
    title: "Do push-ups",
    desc: "AI tracks your form in real-time as you exercise",
  },
  {
    icon: "🔊",
    title: "Get live coaching",
    desc: "Voice and visual cues help you fix form instantly",
  },
  {
    icon: "📊",
    title: "Review your report",
    desc: "See annotated frames and personalised tips after",
  },
];

const TIPS = [
  { icon: "📐", text: "Laptop at waist height, about 1.5m away" },
  { icon: "↔️", text: "Side view — left or right works" },
  { icon: "💡", text: "Good lighting, avoid strong backlight" },
  { icon: "👕", text: "Fitted clothing helps tracking accuracy" },
];

export default function HomePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tipsOpen, setTipsOpen] = useState(false);

  useEffect(() => {
    setSessions(getAllSessions());
  }, []);

  return (
    <div className="space-y-10">
      <HeroSection />

      {/* Mode preview */}
      <section>
        <p className="section-header">Choose From Two Modes</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface border border-border-accent rounded-card p-4">
            <div className="text-2xl mb-2">⏱️</div>
            <p className="text-white font-semibold text-sm mb-1">60s IPPT Mode</p>
            <p className="text-text-muted text-xs">Max reps in 60 seconds</p>
          </div>
          <div className="bg-surface border border-border-accent rounded-card p-4">
            <div className="text-2xl mb-2">∞</div>
            <p className="text-white font-semibold text-sm mb-1">Free Mode</p>
            <p className="text-text-muted text-xs">No time limit</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section>
        <p className="section-header">How It Works</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-card p-4 flex items-start gap-3 hover:border-border-accent transition-colors"
            >
              <span
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{
                  background: "linear-gradient(135deg, #FF6B2C 0%, #FF8A50 100%)",
                }}
              >
                {i + 1}
              </span>
              <div>
                <p className="text-white text-sm font-semibold mb-0.5">
                  {step.icon} {step.title}
                </p>
                <p className="text-text-secondary text-xs leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Past Sessions */}
      <section>
        <p className="section-header">Past Sessions</p>
        {sessions.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">
            No sessions yet — start your first above
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.slice(0, 5).map((s) => (
              <SessionHistoryCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </section>

      {/* Setup Tips (collapsible) */}
      <section>
        <button
          type="button"
          onClick={() => setTipsOpen((v) => !v)}
          className="flex items-center gap-2 text-text-secondary text-sm font-semibold tracking-wider uppercase hover:text-text-primary transition-colors"
        >
          Setup Tips
          <span className={`transition-transform ${tipsOpen ? "rotate-180" : ""}`}>▾</span>
        </button>
        {tipsOpen && (
          <ul className="mt-4 space-y-3">
            {TIPS.map((tip, i) => (
              <li key={i} className="flex items-center gap-3 text-text-secondary text-sm">
                <span className="text-accent-orange text-base leading-none">{tip.icon}</span>
                {tip.text}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="text-center space-y-1 pt-6 border-t border-border">
        <p className="text-text-muted text-xs">Built with MediaPipe · AWS Bedrock · Amazon Polly</p>
        <p className="text-text-muted text-xs">Made for SuperAI NEXT Hackathon 2026</p>
      </footer>
    </div>
  );
}
