"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ERROR_SCREEN_RULES,
  SCREEN_CUE,
  WARNING_SCREEN_RULES,
} from "@/lib/constants";
import type { Violation, ViolationRule } from "@/lib/pose/types";

type BannerVariant = "error" | "warning" | "success" | "paused" | "hidden";

interface FormFeedbackProps {
  violations: Violation[];
  paused?: boolean;
  streakMessage?: string | null;
  positiveMessage?: string | null;
}

const DISPLAY_MS = 2500;
const FADE_OUT_MS = 300;

function variantForRule(rule: ViolationRule): "error" | "warning" {
  if ((ERROR_SCREEN_RULES as readonly string[]).includes(rule)) return "error";
  if ((WARNING_SCREEN_RULES as readonly string[]).includes(rule)) return "warning";
  return "error";
}

const BANNER_STYLES: Record<
  Exclude<BannerVariant, "hidden">,
  { bg: string; color: string }
> = {
  error: { bg: "rgba(255, 69, 58, 0.9)", color: "#ffffff" },
  warning: { bg: "rgba(255, 214, 10, 0.9)", color: "#000000" },
  success: { bg: "rgba(48, 209, 88, 0.9)", color: "#ffffff" },
  paused: { bg: "rgba(0, 0, 0, 0.85)", color: "#ffffff" },
};

export function FormFeedback({
  violations,
  paused = false,
  streakMessage = null,
  positiveMessage = null,
}: FormFeedbackProps) {
  const [message, setMessage] = useState("");
  const [variant, setVariant] = useState<BannerVariant>("hidden");
  const [phase, setPhase] = useState<"hidden" | "in" | "visible" | "out">(
    "hidden"
  );
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    hideTimerRef.current = null;
    fadeTimerRef.current = null;
  };

  const showBanner = useCallback(
    (text: string, v: Exclude<BannerVariant, "hidden">) => {
      clearTimers();
      setMessage(text.slice(0, 30).toUpperCase());
      setVariant(v);
      setPhase("in");
      requestAnimationFrame(() => setPhase("visible"));

      if (v === "paused") return;

      hideTimerRef.current = setTimeout(() => {
        setPhase("out");
        fadeTimerRef.current = setTimeout(() => {
          setVariant("hidden");
          setPhase("hidden");
        }, FADE_OUT_MS);
      }, DISPLAY_MS);
    },
    []
  );

  useEffect(() => {
    if (paused) {
      showBanner("STEP BACK INTO FRAME", "paused");
      return () => clearTimers();
    }

    if (streakMessage) {
      showBanner(SCREEN_CUE.great_streak, "success");
      return () => clearTimers();
    }

    if (positiveMessage) {
      showBanner(SCREEN_CUE.great_rep, "success");
      return () => clearTimers();
    }

    if (violations.length === 0) {
      clearTimers();
      setVariant("hidden");
      setPhase("hidden");
      return;
    }

    const top = violations.reduce((a, b) =>
      a.severity >= b.severity ? a : b
    );
    const text = SCREEN_CUE[top.rule] ?? top.message;
    showBanner(text, variantForRule(top.rule));

    return () => clearTimers();
  }, [violations, paused, streakMessage, positiveMessage, showBanner]);

  if (variant === "hidden" || phase === "hidden") return null;

  const styles = BANNER_STYLES[variant];

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-center form-feedback-banner"
      style={{
        height: 60,
        padding: "0 20px",
        backgroundColor: styles.bg,
        opacity: phase === "out" ? 0 : phase === "in" ? 0 : 1,
        transform:
          phase === "in"
            ? "translateY(100%)"
            : phase === "out"
              ? "translateY(8px)"
              : "translateY(0)",
        transition:
          phase === "out"
            ? `opacity ${FADE_OUT_MS}ms ease-out, transform ${FADE_OUT_MS}ms ease-out`
            : "opacity 200ms ease-out, transform 200ms ease-out",
      }}
      aria-live="polite"
      role="status"
    >
      <p
        className="truncate w-full text-center uppercase font-extrabold leading-none"
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: styles.color,
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        }}
      >
        {message}
      </p>
    </div>
  );
}
