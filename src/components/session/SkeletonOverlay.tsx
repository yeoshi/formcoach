"use client";

import { calculateAngle, getVisibleSide } from "@/lib/pose/angles";
import type { Landmark, ViolationRule } from "@/lib/pose/types";

const KEY_JOINTS = new Set([11, 12, 13, 14, 23, 24]); // shoulders + hips (larger dots)
const MED_JOINTS = new Set([15, 16]);                  // wrists (medium)

const CONNECTIONS: [number, number][] = [
  [11, 13], [13, 15], // left: shoulder→elbow→wrist
  [12, 14], [14, 16], // right: shoulder→elbow→wrist
  [11, 23], [23, 25], [25, 27], // left: shoulder→hip→knee→ankle
  [12, 24], [24, 26], [26, 28], // right: shoulder→hip→knee→ankle
  [11, 12], // shoulder to shoulder
  [23, 24], // hip to hip
  [7, 11], [8, 12], // ears to shoulders
];

// Segments affected by each violation rule
const VIOLATION_SEGMENTS: Record<ViolationRule, [number, number][]> = {
  hip_sag: [[11, 23], [12, 24], [23, 25], [24, 26]],
  pike:    [[11, 23], [12, 24], [23, 25], [24, 26]],
  depth:   [[11, 13], [12, 14], [13, 15], [14, 16]],
  lockout: [[11, 13], [12, 14], [13, 15], [14, 16]],
  head_crane: [[7, 11], [8, 12]],
};

function buildViolatedSet(violations: ViolationRule[]): Set<string> {
  const keys = new Set<string>();
  for (const rule of violations) {
    for (const [a, b] of VIOLATION_SEGMENTS[rule] ?? []) {
      keys.add(`${Math.min(a, b)},${Math.max(a, b)}`);
    }
  }
  return keys;
}

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  canvasWidth: number,
  canvasHeight: number,
  violations: ViolationRule[] = []
) {
  const px = (lm: Landmark) => lm.x * canvasWidth;
  const py = (lm: Landmark) => lm.y * canvasHeight;
  const vis = (lm: Landmark) => lm?.visibility ?? 0;

  const violatedKeys = buildViolatedSet(violations);
  const isViolated = (a: number, b: number) =>
    violatedKeys.has(`${Math.min(a, b)},${Math.max(a, b)}`);

  // --- 1. Connector lines ---
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.setLineDash([]);

  for (const [ai, bi] of CONNECTIONS) {
    const a = landmarks[ai];
    const b = landmarks[bi];
    if (!a || !b) continue;
    const minVis = Math.min(vis(a), vis(b));
    if (minVis < 0.5) continue;

    const violated = isViolated(ai, bi);
    const alpha = Math.min(1, minVis) * (violated ? 0.9 : 0.8);
    ctx.strokeStyle = violated
      ? `rgba(255, 69, 58, ${alpha})`
      : `rgba(48, 209, 88, ${alpha})`;

    ctx.beginPath();
    ctx.moveTo(px(a), py(a));
    ctx.lineTo(px(b), py(b));
    ctx.stroke();
  }

  // --- 2. Hip alignment dotted line ---
  const side = getVisibleSide(landmarks);
  const hipIdx = side === "left"
    ? { shoulder: 11, hip: 23, ankle: 27 }
    : { shoulder: 12, hip: 24, ankle: 28 };

  const hs = landmarks[hipIdx.shoulder];
  const hh = landmarks[hipIdx.hip];
  const ha = landmarks[hipIdx.ankle];

  if (hs && hh && ha && vis(hs) > 0.5 && vis(hh) > 0.5 && vis(ha) > 0.5) {
    const hipViolated = violations.some(v => v === "hip_sag" || v === "pike");
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = hipViolated
      ? "rgba(255, 69, 58, 0.45)"
      : "rgba(48, 209, 88, 0.25)";
    ctx.beginPath();
    ctx.moveTo(px(hs), py(hs));
    ctx.lineTo(px(hh), py(hh));
    ctx.lineTo(px(ha), py(ha));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // --- 3. Landmark dots ---
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    if (!lm || vis(lm) < 0.5) continue;

    const r = KEY_JOINTS.has(i) ? 5 : MED_JOINTS.has(i) ? 4 : 3;
    ctx.beginPath();
    ctx.arc(px(lm), py(lm), r, 0, 2 * Math.PI);
    ctx.fillStyle = "#FFD60A";
    ctx.fill();
  }

  // --- 4. Elbow angle label ---
  const elbowIdx = side === "left"
    ? { shoulder: 11, elbow: 13, wrist: 15 }
    : { shoulder: 12, elbow: 14, wrist: 16 };

  const es = landmarks[elbowIdx.shoulder];
  const ee = landmarks[elbowIdx.elbow];
  const ew = landmarks[elbowIdx.wrist];

  if (es && ee && ew && vis(es) > 0.5 && vis(ee) > 0.5 && vis(ew) > 0.5) {
    const angle = Math.round(calculateAngle(es, ee, ew));
    const elbowViolated = violations.some(v => v === "depth" || v === "lockout");

    const ax = px(es) - px(ee);
    const ay = py(es) - py(ee);
    const bx = px(ew) - px(ee);
    const by = py(ew) - py(ee);

    const startAngle = Math.atan2(ay, ax);
    const endAngle = Math.atan2(by, bx);

    let sweep = endAngle - startAngle;
    while (sweep > Math.PI) sweep -= 2 * Math.PI;
    while (sweep < -Math.PI) sweep += 2 * Math.PI;

    ctx.beginPath();
    ctx.arc(px(ee), py(ee), 18, startAngle, endAngle, sweep < 0);
    ctx.strokeStyle = elbowViolated
      ? "rgba(255, 69, 58, 0.85)"
      : "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const bisect = startAngle + sweep / 2;
    const textX = px(ee) + Math.cos(bisect) * 32;
    const textY = py(ee) + Math.sin(bisect) * 32;

    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = elbowViolated ? "#FF453A" : "#FFFFFF";
    ctx.fillText(`${angle}°`, textX, textY);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}
