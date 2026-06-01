import { CUE_TEXT, FORM_THRESHOLDS } from "@/lib/constants";
import {
  calculateAngle,
  getLandmarksBySide,
  getPerpendicularDistance,
  getVisibleSide,
} from "./angles";
import type {
  FormCheckResult,
  Landmark,
  RepState,
  Violation,
  ViolationRule,
} from "./types";

export function createRepStateMachine(): RepState {
  return {
    phase: "idle",
    repCount: 0,
    minElbowAngle: 180,
    maxElbowAngle: 0,
    lastPhaseChange: Date.now(),
  };
}

export function updateRepState(state: RepState, elbowAngle: number): RepState {
  const now = Date.now();
  const next = { ...state };

  switch (state.phase) {
    case "idle":
      if (elbowAngle < FORM_THRESHOLDS.REP_START_ANGLE) {
        next.phase = "descending";
        next.minElbowAngle = elbowAngle;
        next.maxElbowAngle = 0;
        next.lastPhaseChange = now;
      }
      break;
    case "descending":
      next.minElbowAngle = Math.min(state.minElbowAngle, elbowAngle);
      if (elbowAngle > state.minElbowAngle + 10) {
        next.phase = "ascending";
        next.lastPhaseChange = now;
      }
      break;
    case "ascending":
      next.maxElbowAngle = Math.max(state.maxElbowAngle, elbowAngle);
      if (elbowAngle > FORM_THRESHOLDS.REP_COMPLETE_ANGLE) {
        next.phase = "complete";
        next.lastPhaseChange = now;
      }
      break;
    case "complete":
      next.repCount = state.repCount + 1;
      next.phase = "idle";
      next.minElbowAngle = 180;
      next.maxElbowAngle = 0;
      next.lastPhaseChange = now;
      break;
  }

  return next;
}

function makeViolation(
  rule: ViolationRule,
  severity: number,
  repNumber: number,
  escalated: boolean
): Violation {
  const cue = CUE_TEXT[rule];
  return {
    rule,
    severity,
    message: escalated ? cue.escalation : cue.screen,
    voiceCueId: escalated ? `${rule}_escalation` : rule,
    timestamp: Date.now(),
    repNumber,
  };
}

export function checkForm(
  landmarks: Landmark[],
  repState: RepState,
  side?: "left" | "right"
): FormCheckResult {
  const visibleSide = side ?? getVisibleSide(landmarks);
  const lm = getLandmarksBySide(landmarks, visibleSide);

  const elbowAngle = calculateAngle(lm.shoulder, lm.elbow, lm.wrist);
  const hipDeviation = getPerpendicularDistance(lm.hip, lm.shoulder, lm.ankle);
  const headAngle = calculateAngle(lm.ear, lm.shoulder, lm.hip);

  const newRepState = updateRepState(repState, elbowAngle);
  const violations: Violation[] = [];

  if (hipDeviation > FORM_THRESHOLDS.HIP_SAG_THRESHOLD) {
    violations.push(
      makeViolation("hip_sag", Math.min(1, hipDeviation / 0.08), newRepState.repCount, false)
    );
  }
  if (hipDeviation < FORM_THRESHOLDS.PIKE_THRESHOLD) {
    violations.push(
      makeViolation("pike", Math.min(1, Math.abs(hipDeviation) / 0.08), newRepState.repCount, false)
    );
  }
  if (headAngle > FORM_THRESHOLDS.HEAD_CRANE_THRESHOLD) {
    violations.push(
      makeViolation(
        "head_crane",
        Math.min(1, headAngle / 40),
        newRepState.repCount,
        false
      )
    );
  }

  if (newRepState.phase === "ascending" && repState.phase === "descending") {
    if (newRepState.minElbowAngle > FORM_THRESHOLDS.MIN_DEPTH_ANGLE) {
      violations.push(
        makeViolation(
          "depth",
          Math.min(1, (newRepState.minElbowAngle - 90) / 40),
          newRepState.repCount + 1,
          false
        )
      );
    }
  }

  if (newRepState.phase === "complete" && repState.phase === "ascending") {
    if (newRepState.maxElbowAngle < FORM_THRESHOLDS.MIN_LOCKOUT_ANGLE) {
      violations.push(
        makeViolation(
          "lockout",
          Math.min(1, (160 - newRepState.maxElbowAngle) / 30),
          newRepState.repCount,
          false
        )
      );
    }
  }

  return {
    violations,
    repState: newRepState,
    bodyAlignment: {
      hipDeviation,
      isAligned:
        hipDeviation <= FORM_THRESHOLDS.HIP_SAG_THRESHOLD &&
        hipDeviation >= FORM_THRESHOLDS.PIKE_THRESHOLD,
    },
  };
}

export interface FeedbackThrottler {
  shouldFire: (rule: ViolationRule) => boolean;
  markFired: (rule: ViolationRule) => void;
  isEscalation: (rule: ViolationRule) => boolean;
  recordRepViolation: (rule: ViolationRule) => void;
}

export function createFeedbackThrottler(): FeedbackThrottler {
  const lastFired: Partial<Record<ViolationRule, number>> = {};
  const consecutive: Partial<Record<ViolationRule, number>> = {};

  return {
    shouldFire(rule) {
      const last = lastFired[rule] ?? 0;
      return Date.now() - last >= FORM_THRESHOLDS.CUE_COOLDOWN_MS;
    },
    markFired(rule) {
      lastFired[rule] = Date.now();
    },
    isEscalation(rule) {
      return (consecutive[rule] ?? 0) >= FORM_THRESHOLDS.ESCALATION_THRESHOLD;
    },
    recordRepViolation(rule) {
      consecutive[rule] = (consecutive[rule] ?? 0) + 1;
    },
  };
}

// Export throttler factory for hooks (singleton per session)
let sessionThrottler: FeedbackThrottler | null = null;
export function getSessionThrottler(): FeedbackThrottler {
  if (!sessionThrottler) sessionThrottler = createFeedbackThrottler();
  return sessionThrottler;
}
export function resetSessionThrottler(): void {
  sessionThrottler = null;
}
