export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PoseFrame {
  landmarks: Landmark[];
  timestamp: number;
}

export type RepPhase = "idle" | "descending" | "ascending" | "complete";

export interface RepState {
  phase: RepPhase;
  repCount: number;
  minElbowAngle: number;
  maxElbowAngle: number;
  lastPhaseChange: number;
}

export type ViolationRule =
  | "hip_sag"
  | "depth"
  | "pike"
  | "head_crane"
  | "lockout";

export interface Violation {
  rule: ViolationRule;
  severity: number;
  message: string;
  voiceCueId: string;
  timestamp: number;
  repNumber: number;
}

export interface FormCheckResult {
  violations: Violation[];
  repState: RepState;
  bodyAlignment: {
    hipDeviation: number;
    isAligned: boolean;
  };
}

export interface FlaggedFrame {
  imageBase64: string;
  timestamp: number;
  violation: ViolationRule;
  repNumber: number;
}

export interface RepData {
  repNumber: number;
  successful: boolean;
  minElbowAngle: number;
  hipDeviation: number;
  durationSeconds: number;
  violations: ViolationRule[];
}

/** Personal baseline from 3s calibration hold (session ref only) */
export interface PersonalBaseline {
  hipDeviation: number;
  headAngle: number;
  bodyAngle: number;
  shoulderHeight: number;
  elbowAngleRest: number;
}

/** Used by form engine — offsets + widened thresholds */
export interface FormBaseline extends PersonalBaseline {
  adjustedHipSagThreshold: number;
  adjustedPikeThreshold: number;
  adjustedHeadCraneThreshold: number;
}

export interface BedrockReport {
  summary: string;
  formScore: number;
  topIssues: {
    rule: ViolationRule;
    count: number;
    explanation: string;
    fix: string;
    frameIndex: number;
  }[];
  nextSessionFocus: string;
  repBreakdown: {
    repNumber: number;
    status: "good" | "minor_issues" | "needs_work";
    note?: string;
  }[];
}
