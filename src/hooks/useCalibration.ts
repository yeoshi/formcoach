"use client";

import { useCallback, useRef, useState } from "react";
import { SETUP_HOLD_MS } from "@/lib/constants";
import { isPushUpCalibrationPose } from "@/lib/pose/bodyDetection";
import {
  buildFormBaseline,
  createPersonalBaselineFromSamples,
  sampleToCalibration,
  type CalibrationSample,
} from "@/lib/pose/ruleEngine";
import type { FormBaseline, Landmark } from "@/lib/pose/types";

export function useCalibration() {
  const samplesRef = useRef<CalibrationSample[]>([]);
  const holdStartRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [inPose, setInPose] = useState(false);
  const [baseline, setBaseline] = useState<FormBaseline | null>(null);

  const reset = useCallback(() => {
    samplesRef.current = [];
    holdStartRef.current = null;
    setProgress(0);
    setIsComplete(false);
    setInPose(false);
    setBaseline(null);
  }, []);

  const tick = useCallback((landmarks: Landmark[] | null) => {
    if (isComplete) return;

    const poseOk = isPushUpCalibrationPose(landmarks);
    setInPose(poseOk);

    if (!poseOk || !landmarks) {
      holdStartRef.current = null;
      samplesRef.current = [];
      setProgress(0);
      return;
    }

    const sample = sampleToCalibration(landmarks);
    if (sample) samplesRef.current.push(sample);

    if (holdStartRef.current === null) {
      holdStartRef.current = Date.now();
    }

    const elapsed = Date.now() - holdStartRef.current;
    const pct = Math.min(100, (elapsed / SETUP_HOLD_MS) * 100);
    setProgress(pct);

    if (elapsed >= SETUP_HOLD_MS) {
      const personal = createPersonalBaselineFromSamples(samplesRef.current);
      const formBaseline = buildFormBaseline(personal);
      setBaseline(formBaseline);
      setIsComplete(true);
      setProgress(100);
    }
  }, [isComplete]);

  return {
    progress,
    isComplete,
    inPose,
    baseline,
    tick,
    reset,
  };
}
