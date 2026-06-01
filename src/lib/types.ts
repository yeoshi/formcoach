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
  totalReps: number;
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
  durationSeconds: number;
  violations: {
    rule: string;
    repNumber: number;
    severity: number;
    timestamp: number;
  }[];
  repData: {
    repNumber: number;
    minElbowAngle: number;
    hipDeviation: number;
    durationSeconds: number;
    violations: string[];
  }[];
}
