import type {
  BedrockReport,
  FlaggedFrame,
  RepData,
  Violation,
} from "@/lib/pose/types";

export interface Session {
  id: string;
  date: string;
  exercise: "push-up";
  /** All rep attempts (good + failed) */
  totalReps: number;
  /** Reps with no critical violations */
  successfulReps: number;
  durationSeconds: number;
  formScore: number;
  violations: Violation[];
  repData: RepData[];
  report: BedrockReport | null;
  flaggedFrames: FlaggedFrame[];
}

export type { BedrockReport };

export interface SessionDataForReport {
  exercise: "push-up";
  totalReps: number;
  successfulReps: number;
  durationSeconds: number;
  violations: {
    rule: string;
    repNumber: number;
    severity: number;
    timestamp: number;
  }[];
  repData: {
    repNumber: number;
    successful: boolean;
    minElbowAngle: number;
    hipDeviation: number;
    durationSeconds: number;
    violations: string[];
  }[];
}
