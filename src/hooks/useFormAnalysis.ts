"use client";

import { useEffect, useRef, useState } from "react";
import {
  analyzeFrame,
  createRepStateMachine,
  createRepViolationTracker,
  DEFAULT_FORM_BASELINE,
  getRepViolations,
  getSessionThrottler,
  isRepSuccessful,
  recordFrameViolations,
  resetSessionThrottler,
  violationsFromRules,
  type RepViolationTracker,
} from "@/lib/pose/ruleEngine";
import type {
  FormBaseline,
  Landmark,
  RepData,
  Violation,
} from "@/lib/pose/types";

interface UseFormAnalysisOptions {
  enabled?: boolean;
  baseline?: FormBaseline;
  onViolation?: (violation: Violation, isEscalation: boolean) => void;
  onRepComplete?: (repData: RepData) => void;
}

const defaultBaseline: FormBaseline = DEFAULT_FORM_BASELINE;

export function useFormAnalysis(
  landmarks: Landmark[] | null,
  options: UseFormAnalysisOptions = {}
) {
  const {
    enabled = true,
    baseline = defaultBaseline,
    onViolation,
    onRepComplete,
  } = options;

  const repStateRef = useRef(createRepStateMachine());
  const trackerRef = useRef<RepViolationTracker>(createRepViolationTracker());
  const repMinElbowRef = useRef(180);
  const repHipDevRef = useRef(0);

  const [successfulRepCount, setSuccessfulRepCount] = useState(0);
  const [totalRepCount, setTotalRepCount] = useState(0);
  const [currentViolations, setCurrentViolations] = useState<Violation[]>([]);
  const [allViolations, setAllViolations] = useState<Violation[]>([]);
  const [repData, setRepData] = useState<RepData[]>([]);

  const repStartRef = useRef(Date.now());
  const throttlerRef = useRef(getSessionThrottler());
  const onViolationRef = useRef(onViolation);
  const onRepCompleteRef = useRef(onRepComplete);
  const baselineRef = useRef(baseline);

  baselineRef.current = baseline;
  onViolationRef.current = onViolation;
  onRepCompleteRef.current = onRepComplete;

  useEffect(() => {
    if (!enabled) return;
    resetSessionThrottler();
    throttlerRef.current = getSessionThrottler();
    repStateRef.current = createRepStateMachine();
    trackerRef.current = createRepViolationTracker();
    setSuccessfulRepCount(0);
    setTotalRepCount(0);
    setCurrentViolations([]);
    setAllViolations([]);
    setRepData([]);
    repStartRef.current = Date.now();
    repMinElbowRef.current = 180;
  }, [enabled]);

  useEffect(() => {
    if (!landmarks || !enabled) return;

    const prevState = repStateRef.current;
    const result = analyzeFrame(
      landmarks,
      prevState,
      baselineRef.current
    );

    repStateRef.current = result.repState;

    if (result.repState.phase === "descending") {
      repMinElbowRef.current = Math.min(
        repMinElbowRef.current,
        result.metrics.elbowAngle
      );
      repHipDevRef.current = result.metrics.adjustedHipDeviation;
    }

    if (
      result.repState.phase === "descending" ||
      result.repState.phase === "ascending"
    ) {
      if (prevState.phase === "idle" && result.repState.phase === "descending") {
        trackerRef.current = createRepViolationTracker();
        repMinElbowRef.current = result.metrics.elbowAngle;
      }
      recordFrameViolations(trackerRef.current, result.frameViolations);
    }

    const previewRules = getRepViolations(trackerRef.current);
    if (previewRules.length > 0 && !result.repJustCompleted) {
      setCurrentViolations(
        violationsFromRules(
          previewRules,
          trackerRef.current,
          result.repState.repCount + 1
        )
      );
    } else if (!result.repJustCompleted) {
      setCurrentViolations([]);
    }

    if (result.repJustCompleted) {
      const completedRep = result.completedRepNumber;
      const confirmedRules = getRepViolations(trackerRef.current);
      const successful = isRepSuccessful(confirmedRules);
      const throttler = throttlerRef.current;

      const repViolations = violationsFromRules(
        confirmedRules,
        trackerRef.current,
        completedRep
      );

      setCurrentViolations(repViolations);
      trackerRef.current = createRepViolationTracker();
      repMinElbowRef.current = 180;

      repViolations.forEach((v) => {
        throttler.recordRepViolation(v.rule);
        const escalated = throttler.isEscalation(v.rule);
        if (throttler.shouldFire(v.rule)) {
          throttler.markFired(v.rule);
          const violation = escalated
            ? { ...v, voiceCueId: `${v.rule}_escalation` }
            : v;
          setAllViolations((prev) => [...prev, violation]);
          onViolationRef.current?.(violation, escalated);
        }
      });

      const now = Date.now();
      const duration = (now - repStartRef.current) / 1000;
      repStartRef.current = now;

      const rep: RepData = {
        repNumber: completedRep,
        successful,
        minElbowAngle: prevState.minElbowAngle,
        hipDeviation: repHipDevRef.current,
        durationSeconds: duration,
        violations: confirmedRules,
      };

      setRepData((prev) => [...prev, rep]);
      setTotalRepCount(completedRep);
      if (successful) {
        setSuccessfulRepCount((c) => c + 1);
      }
      onRepCompleteRef.current?.(rep);
    }
  }, [landmarks, enabled]);

  return {
    /** Good-form reps only (displayed on RepCounter) */
    successfulRepCount,
    /** All completed rep cycles including failed */
    totalRepCount,
    /** @deprecated use successfulRepCount */
    repCount: successfulRepCount,
    currentViolations,
    repData,
    allViolations,
    repState: repStateRef.current,
  };
}
