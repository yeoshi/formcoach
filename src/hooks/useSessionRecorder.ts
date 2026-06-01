"use client";

import { useCallback, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { saveSession } from "@/lib/storage/sessions";
import type { Session } from "@/lib/types";
import type {
  FlaggedFrame,
  RepData,
  Violation,
  ViolationRule,
} from "@/lib/pose/types";

const MAX_FLAGGED_FRAMES = 20;
const CAPTURE_COOLDOWN_MS = 2000;

// A blank/black JPEG compresses to very few bytes; real webcam frames are much larger
function isValidFrame(base64: string): boolean {
  return base64.length > 5000;
}

export function useSessionRecorder() {
  const [flaggedFrames, setFlaggedFrames] = useState<FlaggedFrame[]>([]);
  const [repDataList, setRepDataList] = useState<RepData[]>([]);
  const [allViolations, setAllViolations] = useState<Violation[]>([]);
  const sessionStartRef = useRef(Date.now());
  const lastCaptureRef = useRef(0);

  const captureFrame = useCallback(
    (
      canvasRef: React.RefObject<HTMLCanvasElement | null>,
      violation: Violation
    ) => {
      const now = Date.now();
      if (now - lastCaptureRef.current < CAPTURE_COOLDOWN_MS) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      lastCaptureRef.current = now;
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.6);

      if (!isValidFrame(imageBase64)) return;

      const frame: FlaggedFrame = {
        imageBase64,
        timestamp: now,
        violation: violation.rule,
        repNumber: violation.repNumber,
      };

      setFlaggedFrames((prev) => {
        const next = [...prev, frame];
        if (next.length <= MAX_FLAGGED_FRAMES) return next;
        return next
          .sort((a, b) => {
            const severityOrder: Record<ViolationRule, number> = {
              hip_sag: 5,
              pike: 5,
              depth: 4,
              lockout: 3,
              head_crane: 2,
            };
            return severityOrder[b.violation] - severityOrder[a.violation];
          })
          .slice(0, MAX_FLAGGED_FRAMES);
      });
    },
    []
  );

  const recordRep = useCallback((repData: RepData) => {
    setRepDataList((prev) => [...prev, repData]);
  }, []);

  const recordViolation = useCallback((violation: Violation) => {
    setAllViolations((prev) => [...prev, violation]);
  }, []);

  const endSession = useCallback(
    (formScore = 0, report: Session["report"] = null): Session => {
      const durationSeconds = Math.floor(
        (Date.now() - sessionStartRef.current) / 1000
      );
      const successfulReps = repDataList.filter((r) => r.successful).length;
      const session: Session = {
        id: uuidv4(),
        date: new Date().toISOString(),
        exercise: "push-up",
        totalReps: repDataList.length,
        successfulReps,
        durationSeconds,
        formScore,
        violations: allViolations,
        repData: repDataList,
        report,
        flaggedFrames,
      };
      saveSession(session);
      return session;
    },
    [allViolations, flaggedFrames, repDataList]
  );

  const reset = useCallback(() => {
    sessionStartRef.current = Date.now();
    lastCaptureRef.current = 0;
    setFlaggedFrames([]);
    setRepDataList([]);
    setAllViolations([]);
  }, []);

  return {
    captureFrame,
    recordRep,
    recordViolation,
    endSession,
    flaggedFrames,
    repCount: repDataList.length,
    reset,
    repDataList,
    allViolations,
  };
}
