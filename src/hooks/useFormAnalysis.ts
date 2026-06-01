"use client";

import { useEffect, useRef, useState } from "react";
import { getVisibleSide } from "@/lib/pose/angles";
import {
  checkForm,
  createRepStateMachine,
  getSessionThrottler,
  resetSessionThrottler,
} from "@/lib/pose/ruleEngine";
import type {
  Landmark,
  RepData,
  RepState,
  Violation,
} from "@/lib/pose/types";

interface UseFormAnalysisOptions {
  enabled?: boolean;
  onViolation?: (violation: Violation, isEscalation: boolean) => void;
  onRepComplete?: (repData: RepData) => void;
}

export function useFormAnalysis(
  landmarks: Landmark[] | null,
  options: UseFormAnalysisOptions = {}
) {
  const { enabled = true, onViolation, onRepComplete } = options;
  const repStateRef = useRef<RepState>(createRepStateMachine());
  const [repCount, setRepCount] = useState(0);
  const [currentViolations, setCurrentViolations] = useState<Violation[]>([]);
  const [allViolations, setAllViolations] = useState<Violation[]>([]);
  const [repData, setRepData] = useState<RepData[]>([]);
  const prevRepCountRef = useRef(0);
  const repStartRef = useRef<number>(Date.now());
  const throttlerRef = useRef(getSessionThrottler());
  const onViolationRef = useRef(onViolation);
  const onRepCompleteRef = useRef(onRepComplete);

  onViolationRef.current = onViolation;
  onRepCompleteRef.current = onRepComplete;

  useEffect(() => {
    if (!enabled) return;
    resetSessionThrottler();
    throttlerRef.current = getSessionThrottler();
    repStateRef.current = createRepStateMachine();
    setRepCount(0);
    setCurrentViolations([]);
    setAllViolations([]);
    setRepData([]);
    prevRepCountRef.current = 0;
    repStartRef.current = Date.now();
  }, [enabled]);

  useEffect(() => {
    if (!landmarks || !enabled) return;

    const side = getVisibleSide(landmarks);
    const prevState = repStateRef.current;
    const result = checkForm(landmarks, prevState, side);
    const throttler = throttlerRef.current;

    repStateRef.current = result.repState;
    setRepCount(result.repState.repCount);
    setCurrentViolations(result.violations);

    result.violations.forEach((v) => {
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

    if (result.repState.repCount > prevRepCountRef.current) {
      const now = Date.now();
      const duration = (now - repStartRef.current) / 1000;
      repStartRef.current = now;

      const rep: RepData = {
        repNumber: result.repState.repCount,
        minElbowAngle: prevState.minElbowAngle,
        hipDeviation: result.bodyAlignment.hipDeviation,
        durationSeconds: duration,
        violations: result.violations.map((v) => v.rule),
        formScore: Math.max(20, 100 - result.violations.length * 10),
      };
      setRepData((prev) => [...prev, rep]);
      onRepCompleteRef.current?.(rep);
      prevRepCountRef.current = result.repState.repCount;
    }
  }, [landmarks, enabled]);

  return {
    repCount,
    currentViolations,
    repData,
    allViolations,
    repState: repStateRef.current,
  };
}
