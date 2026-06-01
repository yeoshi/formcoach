"use client";

import { POSE_CONNECTIONS } from "@mediapipe/pose";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import type { Landmark } from "@/lib/pose/types";

const KEY_JOINTS = new Set([11, 12, 13, 14, 15, 16, 23, 24, 27, 28]);

interface SkeletonOverlayProps {
  ctx: CanvasRenderingContext2D;
  landmarks: Landmark[];
  width: number;
  height: number;
}

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number
) {
  const mpLandmarks = landmarks.map((lm) => ({
    x: lm.x * width,
    y: lm.y * height,
    z: lm.z,
    visibility: lm.visibility,
  }));

  drawConnectors(ctx, mpLandmarks, POSE_CONNECTIONS, {
    color: "rgba(48, 209, 88, 0.6)",
    lineWidth: 2.5,
  });

  drawLandmarks(ctx, mpLandmarks, {
    color: "rgba(255, 255, 255, 1)",
    fillColor: "rgba(255, 255, 255, 1)",
    lineWidth: 1,
    radius: 5,
  });

  mpLandmarks.forEach((lm, i) => {
    if (KEY_JOINTS.has(i)) {
      ctx.beginPath();
      ctx.arc(lm.x, lm.y, 7, 0, 2 * Math.PI);
      ctx.fillStyle = "#FFD60A";
      ctx.fill();
    }
  });
}

export function SkeletonOverlay({
  ctx,
  landmarks,
  width,
  height,
}: SkeletonOverlayProps) {
  drawSkeleton(ctx, landmarks, width, height);
  return null;
}
