import {
  CRITICAL_VIOLATION_RULES,
  CUE_TEXT,
  SCREEN_CUE,
  FORM_THRESHOLDS,
  HIGH_SEVERITY_THRESHOLD,
  MIN_PHASE_TRANSITION_MS,
  PUSHUP_HORIZONTAL_TOLERANCE_DEG,
  REP_VIOLATION_FRAME_RATIO,
} from "@/lib/constants";
import {
  calculateAngle,
  getLandmarksBySide,
  getPerpendicularDistance,
  getVisibleSide,
} from "./angles";
import type {
  FormBaseline,
  FormCheckResult,
  Landmark,
  PersonalBaseline,
  RepState,
  Violation,
  ViolationRule,
} from "./types";

const EMPTY_PERSONAL: PersonalBaseline = {
  hipDeviation: 0,
  headAngle: 0,
  bodyAngle: 0,
  shoulderHeight: 0,
  elbowAngleRest: 160,
};

export function buildFormBaseline(
  personal: PersonalBaseline = EMPTY_PERSONAL
): FormBaseline {
  const absHip = Math.abs(personal.hipDeviation);
  return {
    ...personal,
    adjustedHipSagThreshold: FORM_THRESHOLDS.HIP_SAG_THRESHOLD + absHip,
    adjustedPikeThreshold: FORM_THRESHOLDS.PIKE_THRESHOLD - absHip,
    adjustedHeadCraneThreshold:
      FORM_THRESHOLDS.HEAD_CRANE_THRESHOLD +
      Math.abs(personal.headAngle) * 0.25,
  };
}

export const DEFAULT_FORM_BASELINE = buildFormBaseline();

const ALL_RULES: ViolationRule[] = [
  "hip_sag",
  "pike",
  "depth",
  "head_crane",
  "lockout",
];

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
  const elapsed = now - state.lastPhaseChange;
  const canTransition = elapsed >= MIN_PHASE_TRANSITION_MS;
  const next = { ...state };

  switch (state.phase) {
    case "idle":
      if (canTransition && elbowAngle < FORM_THRESHOLDS.REP_START_ANGLE) {
        next.phase = "descending";
        next.minElbowAngle = elbowAngle;
        next.maxElbowAngle = 0;
        next.lastPhaseChange = now;
      }
      break;
    case "descending":
      next.minElbowAngle = Math.min(state.minElbowAngle, elbowAngle);
      if (
        canTransition &&
        elbowAngle > state.minElbowAngle + 10
      ) {
        next.phase = "ascending";
        next.lastPhaseChange = now;
      }
      break;
    case "ascending":
      next.maxElbowAngle = Math.max(state.maxElbowAngle, elbowAngle);
      if (
        canTransition &&
        elbowAngle > FORM_THRESHOLDS.REP_COMPLETE_ANGLE
      ) {
        next.phase = "complete";
        next.lastPhaseChange = now;
      }
      break;
    case "complete":
      if (canTransition) {
        next.repCount = state.repCount + 1;
        next.phase = "idle";
        next.minElbowAngle = 180;
        next.maxElbowAngle = 0;
        next.lastPhaseChange = now;
      }
      break;
  }

  return next;
}

/** Angle of shoulder→hip segment from horizontal (0° = perfectly level) */
export function shoulderHipDeviationFromHorizontal(
  shoulder: Landmark,
  hip: Landmark
): number {
  const dx = hip.x - shoulder.x;
  const dy = hip.y - shoulder.y;
  const angleFromHorizontal = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
  return Math.min(angleFromHorizontal, 180 - angleFromHorizontal);
}

export function isPushUpHorizontalPosition(
  shoulder: Landmark,
  hip: Landmark
): boolean {
  return (
    shoulderHipDeviationFromHorizontal(shoulder, hip) <=
    PUSHUP_HORIZONTAL_TOLERANCE_DEG
  );
}

export interface FormMetrics {
  elbowAngle: number;
  hipDeviation: number;
  adjustedHipDeviation: number;
  /** Ear–shoulder–hip angle minus baseline */
  headAngle: number;
  rawHeadAngle: number;
  isHorizontal: boolean;
  side: "left" | "right";
}

export function computeFormMetrics(
  landmarks: Landmark[],
  baseline: FormBaseline = DEFAULT_FORM_BASELINE,
  side?: "left" | "right"
): FormMetrics {
  const visibleSide = side ?? getVisibleSide(landmarks);
  const lm = getLandmarksBySide(landmarks, visibleSide);

  const hipDeviation = getPerpendicularDistance(lm.hip, lm.shoulder, lm.ankle);
  const adjustedHipDeviation = hipDeviation - baseline.hipDeviation;
  const rawHeadAngle = calculateAngle(lm.ear, lm.shoulder, lm.hip);
  const headAngle = Math.max(0, rawHeadAngle - baseline.headAngle);

  return {
    elbowAngle: calculateAngle(lm.shoulder, lm.elbow, lm.wrist),
    hipDeviation,
    adjustedHipDeviation,
    headAngle,
    rawHeadAngle,
    isHorizontal: isPushUpHorizontalPosition(lm.shoulder, lm.hip),
    side: visibleSide,
  };
}

export interface CalibrationSample {
  hipDeviation: number;
  headAngle: number;
  bodyAngle: number;
  shoulderHeight: number;
  elbowAngle: number;
}

export function createPersonalBaselineFromSamples(
  samples: CalibrationSample[]
): PersonalBaseline {
  const avg = (fn: (s: CalibrationSample) => number) =>
    samples.length === 0
      ? 0
      : samples.reduce((a, s) => a + fn(s), 0) / samples.length;
  const elbows = samples.map((s) => s.elbowAngle);
  return {
    hipDeviation: avg((s) => s.hipDeviation),
    headAngle: avg((s) => s.headAngle),
    bodyAngle: avg((s) => s.bodyAngle),
    shoulderHeight: avg((s) => s.shoulderHeight),
    elbowAngleRest: avg((s) => s.elbowAngle),
  };
}

export function sampleToCalibration(
  landmarks: Landmark[]
): CalibrationSample | null {
  const metrics = computeFormMetrics(landmarks, DEFAULT_FORM_BASELINE);
  const lm = getLandmarksBySide(landmarks, metrics.side);
  return {
    hipDeviation: metrics.hipDeviation,
    headAngle: metrics.rawHeadAngle,
    bodyAngle: shoulderHipDeviationFromHorizontal(lm.shoulder, lm.hip),
    shoulderHeight: lm.shoulder.y,
    elbowAngle: metrics.elbowAngle,
  };
}

export interface FrameViolation {
  rule: ViolationRule;
  severity: number;
}

/** Per-frame violation signals (accumulated into rep tracker, not emitted directly) */
export function getFrameViolations(
  metrics: FormMetrics,
  repState: RepState,
  prevPhase: RepState["phase"],
  baseline: FormBaseline = DEFAULT_FORM_BASELINE
): FrameViolation[] {
  const flags: FrameViolation[] = [];
  const { adjustedHipDeviation, headAngle, elbowAngle, isHorizontal } = metrics;

  if (adjustedHipDeviation > baseline.adjustedHipSagThreshold) {
    flags.push({
      rule: "hip_sag",
      severity: Math.min(1, adjustedHipDeviation / 0.12),
    });
  }
  if (adjustedHipDeviation < baseline.adjustedPikeThreshold) {
    flags.push({
      rule: "pike",
      severity: Math.min(1, Math.abs(adjustedHipDeviation) / 0.12),
    });
  }

  const inActiveRep =
    repState.phase === "descending" || repState.phase === "ascending";

  if (
    isHorizontal &&
    inActiveRep &&
    headAngle > baseline.adjustedHeadCraneThreshold
  ) {
    flags.push({
      rule: "head_crane",
      severity: Math.min(1, headAngle / 50),
    });
  }

  if (
    repState.phase === "descending" &&
    elbowAngle > FORM_THRESHOLDS.MIN_DEPTH_ANGLE &&
    elbowAngle <= repState.minElbowAngle + 15
  ) {
    flags.push({
      rule: "depth",
      severity: Math.min(1, (elbowAngle - 90) / 50),
    });
  }

  if (
    repState.phase === "ascending" &&
    elbowAngle < FORM_THRESHOLDS.MIN_LOCKOUT_ANGLE &&
    elbowAngle >= repState.maxElbowAngle - 15
  ) {
    flags.push({
      rule: "lockout",
      severity: Math.min(1, (FORM_THRESHOLDS.MIN_LOCKOUT_ANGLE - elbowAngle) / 40),
    });
  }

  // Catch depth/lockout at phase transitions (single strong sample)
  if (repState.phase === "ascending" && prevPhase === "descending") {
    if (repState.minElbowAngle > FORM_THRESHOLDS.MIN_DEPTH_ANGLE) {
      flags.push({
        rule: "depth",
        severity: Math.min(1, (repState.minElbowAngle - 90) / 50),
      });
    }
  }
  if (repState.phase === "complete" && prevPhase === "ascending") {
    if (repState.maxElbowAngle < FORM_THRESHOLDS.MIN_LOCKOUT_ANGLE) {
      flags.push({
        rule: "lockout",
        severity: Math.min(
          1,
          (FORM_THRESHOLDS.MIN_LOCKOUT_ANGLE - repState.maxElbowAngle) / 40
        ),
      });
    }
  }

  return flags;
}

export interface RepViolationTracker {
  totalFrames: number;
  violationFrames: Partial<Record<ViolationRule, number>>;
  maxSeverity: Partial<Record<ViolationRule, number>>;
}

export function createRepViolationTracker(): RepViolationTracker {
  return { totalFrames: 0, violationFrames: {}, maxSeverity: {} };
}

export function recordFrameViolations(
  tracker: RepViolationTracker,
  frameViolations: FrameViolation[]
): void {
  tracker.totalFrames += 1;
  for (const { rule, severity } of frameViolations) {
    tracker.violationFrames[rule] = (tracker.violationFrames[rule] ?? 0) + 1;
    tracker.maxSeverity[rule] = Math.max(
      tracker.maxSeverity[rule] ?? 0,
      severity
    );
  }
}

export function isRepSuccessful(confirmedRules: ViolationRule[]): boolean {
  return !confirmedRules.some((r) =>
    (CRITICAL_VIOLATION_RULES as readonly string[]).includes(r)
  );
}

export function getRepViolations(
  tracker: RepViolationTracker
): ViolationRule[] {
  if (tracker.totalFrames === 0) return [];

  return ALL_RULES.filter((rule) => {
    const count = tracker.violationFrames[rule] ?? 0;
    const ratio = count / tracker.totalFrames;
    const maxSev = tracker.maxSeverity[rule] ?? 0;
    return (
      ratio > REP_VIOLATION_FRAME_RATIO ||
      maxSev >= HIGH_SEVERITY_THRESHOLD
    );
  });
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
    message: SCREEN_CUE[rule] ?? cue.screen,
    voiceCueId: escalated ? `${rule}_escalation` : rule,
    timestamp: Date.now(),
    repNumber,
  };
}

export function violationsFromRules(
  rules: ViolationRule[],
  tracker: RepViolationTracker,
  repNumber: number,
  escalatedRules: Set<ViolationRule> = new Set()
): Violation[] {
  return rules.map((rule) =>
    makeViolation(
      rule,
      tracker.maxSeverity[rule] ?? 0.5,
      repNumber,
      escalatedRules.has(rule)
    )
  );
}

export interface AnalyzeFrameResult {
  repState: RepState;
  metrics: FormMetrics;
  frameViolations: FrameViolation[];
  repJustCompleted: boolean;
  completedRepNumber: number;
}

export function analyzeFrame(
  landmarks: Landmark[],
  repState: RepState,
  baseline: FormBaseline = DEFAULT_FORM_BASELINE,
  side?: "left" | "right"
): AnalyzeFrameResult {
  const metrics = computeFormMetrics(landmarks, baseline, side);
  const prevPhase = repState.phase;
  const newRepState = updateRepState(repState, metrics.elbowAngle);
  const frameViolations = getFrameViolations(
    metrics,
    newRepState,
    prevPhase,
    baseline
  );

  const repJustCompleted =
    newRepState.repCount > repState.repCount &&
    newRepState.phase === "idle";

  return {
    repState: newRepState,
    metrics,
    frameViolations,
    repJustCompleted,
    completedRepNumber: newRepState.repCount,
  };
}

/** @deprecated Use analyzeFrame + rep tracker instead */
export function checkForm(
  landmarks: Landmark[],
  repState: RepState,
  side?: "left" | "right",
  baseline: FormBaseline = DEFAULT_FORM_BASELINE
): FormCheckResult {
  const result = analyzeFrame(landmarks, repState, baseline, side);
  return {
    violations: [],
    repState: result.repState,
    bodyAlignment: {
      hipDeviation: result.metrics.adjustedHipDeviation,
      isAligned:
        result.metrics.adjustedHipDeviation <= baseline.adjustedHipSagThreshold &&
        result.metrics.adjustedHipDeviation >= baseline.adjustedPikeThreshold,
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

let sessionThrottler: FeedbackThrottler | null = null;
export function getSessionThrottler(): FeedbackThrottler {
  if (!sessionThrottler) sessionThrottler = createFeedbackThrottler();
  return sessionThrottler;
}
export function resetSessionThrottler(): void {
  sessionThrottler = null;
}
