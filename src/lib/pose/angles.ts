import type { Landmark } from "./types";

export function calculateAngle(
  a: Landmark,
  b: Landmark,
  c: Landmark
): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let degrees = Math.abs((radians * 180) / Math.PI);
  if (degrees > 180) degrees = 360 - degrees;
  return degrees;
}

export function getPerpendicularDistance(
  point: Landmark,
  lineStart: Landmark,
  lineEnd: Landmark
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return 0;
  return (dy * (point.x - lineStart.x) - dx * (point.y - lineStart.y)) / length;
}

const LEFT_INDICES = [11, 13, 15, 23, 27];
const RIGHT_INDICES = [12, 14, 16, 24, 28];

export function getVisibleSide(landmarks: Landmark[]): "left" | "right" {
  const avgVisibility = (indices: number[]) => {
    const sum = indices.reduce((acc, i) => acc + (landmarks[i]?.visibility ?? 0), 0);
    return sum / indices.length;
  };
  const leftVis = avgVisibility(LEFT_INDICES);
  const rightVis = avgVisibility(RIGHT_INDICES);
  return leftVis >= rightVis ? "left" : "right";
}

export interface SideLandmarks {
  shoulder: Landmark;
  elbow: Landmark;
  wrist: Landmark;
  hip: Landmark;
  knee: Landmark;
  ankle: Landmark;
  ear: Landmark;
}

export function getLandmarksBySide(
  landmarks: Landmark[],
  side: "left" | "right"
): SideLandmarks {
  const indices =
    side === "left"
      ? { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27, ear: 7 }
      : { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28, ear: 8 };

  const get = (i: number): Landmark =>
    landmarks[i] ?? { x: 0, y: 0, z: 0, visibility: 0 };

  return {
    shoulder: get(indices.shoulder),
    elbow: get(indices.elbow),
    wrist: get(indices.wrist),
    hip: get(indices.hip),
    knee: get(indices.knee),
    ankle: get(indices.ankle),
    ear: get(indices.ear),
  };
}
