import { getLandmarksBySide, getPerpendicularDistance, getVisibleSide } from "./angles";
import type { Landmark } from "./types";

const VISIBILITY_GOOD = 0.6;
const VISIBILITY_CRITICAL = 0.4;
const VISIBILITY_PUSHUP = 0.5;
const MIN_BODY_SPAN = 0.35;
const FRAME_MARGIN = 0.03;

export type BodyDetectionStatus =
  | "no_pose"
  | "incomplete"
  | "too_far"
  | "too_close"
  | "ready";

export interface BodyDetectionResult {
  status: BodyDetectionStatus;
  message: string;
  variant: "red" | "amber" | "green";
}

export type SetupOverlayState =
  | "no_person"
  | "not_pushup"
  | "holding"
  | "countdown";

function keyIndices(side: "left" | "right") {
  return side === "left"
    ? { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 }
    : { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 };
}

export function isPersonDetected(landmarks: Landmark[] | null): boolean {
  if (!landmarks || landmarks.length < 29) return false;
  const body = assessBodyInFrame(landmarks);
  return body.status !== "no_pose";
}

export function isInPushUpPosition(
  landmarks: Landmark[],
  side: "left" | "right"
): boolean {
  const pts = getLandmarksBySide(landmarks, side);

  if (
    pts.shoulder.visibility < VISIBILITY_PUSHUP ||
    pts.hip.visibility < VISIBILITY_PUSHUP ||
    pts.ankle.visibility < VISIBILITY_PUSHUP ||
    pts.elbow.visibility < VISIBILITY_PUSHUP ||
    pts.wrist.visibility < VISIBILITY_PUSHUP
  ) {
    return false;
  }

  const bodyAngle = Math.abs(
    Math.atan2(pts.ankle.y - pts.shoulder.y, pts.ankle.x - pts.shoulder.x) *
      (180 / Math.PI)
  );
  const isHorizontal = bodyAngle < 30 || bodyAngle > 150;

  const wristBelowShoulder = pts.wrist.y >= pts.shoulder.y - 0.05;
  const hipShoulderYDiff = Math.abs(pts.hip.y - pts.shoulder.y);
  const isNotStanding = hipShoulderYDiff < 0.15;

  const hipDeviation = getPerpendicularDistance(
    pts.hip,
    pts.shoulder,
    pts.ankle
  );
  const isStraight =
    hipDeviation <= 0.08 && hipDeviation >= -0.08;

  return isHorizontal && wristBelowShoulder && isNotStanding && isStraight;
}

export function assessBodyInFrame(
  landmarks: Landmark[] | null
): BodyDetectionResult {
  if (!landmarks || landmarks.length < 29) {
    return {
      status: "no_pose",
      message: "❌ Can't see you — step into frame",
      variant: "red",
    };
  }

  const side = getVisibleSide(landmarks);
  const idx = keyIndices(side);
  const points = [
    landmarks[idx.shoulder],
    landmarks[idx.elbow],
    landmarks[idx.wrist],
    landmarks[idx.hip],
    landmarks[idx.knee],
    landmarks[idx.ankle],
  ];

  const avgVis =
    points.reduce((s, p) => s + (p?.visibility ?? 0), 0) / points.length;

  if (avgVis < 0.25) {
    return {
      status: "no_pose",
      message: "❌ Can't see you — step into frame",
      variant: "red",
    };
  }

  const missing = points.some((p) => (p?.visibility ?? 0) < VISIBILITY_GOOD);
  if (missing) {
    return {
      status: "incomplete",
      message: "⚠️ Move further back — I need to see your full body",
      variant: "amber",
    };
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const span = Math.max(spanX, spanY);

  if (span < MIN_BODY_SPAN) {
    return {
      status: "too_far",
      message: "⚠️ Move a bit closer",
      variant: "amber",
    };
  }

  const offScreen = points.some(
    (p) =>
      p.x < FRAME_MARGIN ||
      p.x > 1 - FRAME_MARGIN ||
      p.y < FRAME_MARGIN ||
      p.y > 1 - FRAME_MARGIN
  );
  if (offScreen) {
    return {
      status: "too_close",
      message: "⚠️ Move further back",
      variant: "amber",
    };
  }

  return {
    status: "ready",
    message: "✅ Looking good! I can see you clearly",
    variant: "green",
  };
}

export function isTrackingPaused(landmarks: Landmark[] | null): boolean {
  if (!landmarks) return true;
  const side = getVisibleSide(landmarks);
  const idx = keyIndices(side);
  const shoulder = landmarks[idx.shoulder];
  const hip = landmarks[idx.hip];
  const ankle = landmarks[idx.ankle];
  return [shoulder, hip, ankle].some(
    (p) => (p?.visibility ?? 0) < VISIBILITY_CRITICAL
  );
}

/** @deprecated use isInPushUpPosition */
export function isPushUpCalibrationPose(landmarks: Landmark[] | null): boolean {
  if (!landmarks) return false;
  const side = getVisibleSide(landmarks);
  return isInPushUpPosition(landmarks, side);
}

export function resolveSetupOverlayState(
  landmarks: Landmark[] | null,
  holdProgress: number,
  inCountdown: boolean
): SetupOverlayState {
  if (inCountdown) return "countdown";
  if (!isPersonDetected(landmarks)) return "no_person";
  if (!landmarks) return "no_person";
  const side = getVisibleSide(landmarks);
  if (!isInPushUpPosition(landmarks, side)) return "not_pushup";
  if (holdProgress > 0) return "holding";
  return "not_pushup";
}
