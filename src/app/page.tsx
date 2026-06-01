"use client";

import { useEffect, useState } from "react";
import { HeroSection } from "@/components/home/HeroSection";
import { SessionHistoryCard } from "@/components/home/SessionHistoryCard";
import { getAllSessions } from "@/lib/storage/sessions";
import type { Session } from "@/lib/types";

const STEPS = [
  { icon: "📷", text: "Position your laptop to your side" },
  { icon: "🏃", text: "Do push-ups — AI tracks your form" },
  { icon: "🔊", text: "Get voice cues to fix your form" },
  { icon: "📋", text: "Review your session report after" },
];

export default function HomePage() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    setSessions(getAllSessions());
  }, []);

  return (
    <div className="space-y-12">
      <HeroSection />

      <section>
        <h2 className="text-sm font-semibold text-text-secondary tracking-wider mb-6">
          HOW IT WORKS
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {STEPS.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-blue/20 text-accent-blue flex items-center justify-center font-mono text-sm font-bold">
                {i + 1}
              </span>
              <div>
                <span className="text-2xl mr-2">{step.icon}</span>
                <span className="text-text-secondary">{step.text}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-text-secondary tracking-wider mb-4">
          PAST SESSIONS
        </h2>
        {sessions.length === 0 ? (
          <p className="text-text-secondary text-center py-8">
            No past sessions yet? Start your first!
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <SessionHistoryCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-text-secondary tracking-wider mb-4">
          SETUP TIPS
        </h2>
        <ul className="space-y-2 text-text-secondary text-sm">
          <li>• Laptop at waist height, 1.5m away</li>
          <li>• Side view (left or right)</li>
          <li>• Good lighting — avoid backlight</li>
          <li>• Wear fitted clothing for best tracking</li>
        </ul>
      </section>

      <footer className="text-center text-text-secondary text-xs pt-8 border-t border-border">
        Built with MediaPipe + AWS Bedrock + Polly
      </footer>
    </div>
  );
}
