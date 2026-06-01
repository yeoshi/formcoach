"use client";

import { useEffect, useState } from "react";
import { CUE_TEXT } from "@/lib/constants";
import type { Violation } from "@/lib/pose/types";

interface FormFeedbackProps {
  violations: Violation[];
  isEscalation?: boolean;
}

export function FormFeedback({ violations, isEscalation = false }: FormFeedbackProps) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (violations.length === 0) {
      setVisible(false);
      return;
    }

    const top = violations.reduce((a, b) =>
      a.severity >= b.severity ? a : b
    );
    const cue = CUE_TEXT[top.rule];
    setMessage(isEscalation ? cue.escalation : cue.screen);
    setVisible(true);

    const hide = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(hide);
  }, [violations, isEscalation]);

  if (!visible || !message) return null;

  const severity = violations[0]?.severity ?? 0.5;

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 max-w-[90%]"
      aria-live="polite"
      role="status"
    >
      <div
        className={`animate-slide-up px-5 py-3 rounded-full text-sm font-medium ${
          isEscalation
            ? "bg-accent-amber/20 text-accent-amber border-2 border-accent-amber text-base"
            : severity > 0.6
              ? "bg-accent-red/90 text-white"
              : "bg-accent-amber/90 text-bg"
        }`}
      >
        {message}
      </div>
    </div>
  );
}
