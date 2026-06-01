"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SETUP_HOLD_MS } from "@/lib/constants";
import {
  isInPushUpPosition,
  isPersonDetected,
  isTrackingPaused,
} from "@/lib/pose/bodyDetection";
import { getVisibleSide } from "@/lib/pose/angles";
import {
  buildFormBaseline,
  createPersonalBaselineFromSamples,
  sampleToCalibration,
  type CalibrationSample,
} from "@/lib/pose/ruleEngine";
import type { FormBaseline, Landmark } from "@/lib/pose/types";

const COUNTDOWN_LABELS = ["3", "2", "1", "GO!"] as const;

export function useAutoSessionStart(
  landmarks: Landmark[] | null,
  enabled: boolean,
  onReady: (baseline: FormBaseline) => void
) {
  const [holdProgress, setHoldProgress] = useState(0);
  const [countdownLabel, setCountdownLabel] = useState<string | null>(null);
  const [inCountdown, setInCountdown] = useState(false);
  const [modeLocked, setModeLocked] = useState(false);

  const holdStartRef = useRef<number | null>(null);
  const samplesRef = useRef<CalibrationSample[]>([]);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIndexRef = useRef(0);

  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setInCountdown(false);
    setCountdownLabel(null);
    countdownIndexRef.current = 0;
  }, []);

  const resetHold = useCallback(() => {
    holdStartRef.current = null;
    samplesRef.current = [];
    setHoldProgress(0);
  }, []);

  const startCountdown = useCallback(() => {
    setInCountdown(true);
    setModeLocked(true);
    countdownIndexRef.current = 0;
    setCountdownLabel(COUNTDOWN_LABELS[0]);

    countdownTimerRef.current = setInterval(() => {
      countdownIndexRef.current += 1;
      if (countdownIndexRef.current >= COUNTDOWN_LABELS.length) {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        const personal = createPersonalBaselineFromSamples(samplesRef.current);
        const baseline = buildFormBaseline(personal);
        setInCountdown(false);
        setCountdownLabel(null);
        onReady(baseline);
        return;
      }
      setCountdownLabel(COUNTDOWN_LABELS[countdownIndexRef.current]);
    }, 1000);
  }, [onReady]);

  useEffect(() => {
    if (!enabled) {
      resetHold();
      clearCountdown();
      setModeLocked(false);
      return;
    }

    if (inCountdown) {
      if (!landmarks || isTrackingPaused(landmarks)) {
        clearCountdown();
        resetHold();
        return;
      }
      const side = getVisibleSide(landmarks);
      if (!isInPushUpPosition(landmarks, side)) {
        clearCountdown();
        resetHold();
      }
      return;
    }

    if (!isPersonDetected(landmarks)) {
      resetHold();
      return;
    }

    if (!landmarks) {
      resetHold();
      return;
    }

    const side = getVisibleSide(landmarks);
    const inPushUp = isInPushUpPosition(landmarks, side);

    if (!inPushUp) {
      resetHold();
      return;
    }

    if (!modeLocked) setModeLocked(true);

    const sample = sampleToCalibration(landmarks);
    if (sample) samplesRef.current.push(sample);

    if (holdStartRef.current === null) {
      holdStartRef.current = Date.now();
    }

    const elapsed = Date.now() - holdStartRef.current;
    setHoldProgress(Math.min(100, (elapsed / SETUP_HOLD_MS) * 100));

    if (elapsed >= SETUP_HOLD_MS) {
      holdStartRef.current = null;
      startCountdown();
    }
  }, [
    landmarks,
    enabled,
    inCountdown,
    modeLocked,
    resetHold,
    clearCountdown,
    startCountdown,
  ]);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  return {
    holdProgress,
    countdownLabel,
    inCountdown,
    modeLocked,
    isHolding: holdProgress > 0 && !inCountdown,
  };
}
