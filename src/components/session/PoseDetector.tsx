"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePoseDetection } from "@/hooks/usePoseDetection";
import { drawSkeleton } from "./SkeletonOverlay";
import type { Landmark } from "@/lib/pose/types";

interface PoseDetectorProps {
  onPoseUpdate?: (landmarks: Landmark[] | null) => void;
  analysisEnabled?: boolean;
  className?: string;
}

export function PoseDetector({
  onPoseUpdate,
  className = "",
}: PoseDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { landmarks, isLoading, error } = usePoseDetection(videoRef);

  useEffect(() => {
    onPoseUpdate?.(landmarks);
  }, [landmarks, onPoseUpdate]);

  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!video || !canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = (width * 3) / 4;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -width, 0, width, height);
    ctx.restore();

    if (landmarks) {
      drawSkeleton(ctx, landmarks, width, height);
    }
  }, [landmarks]);

  useEffect(() => {
    let raf: number;
    const loop = () => {
      drawFrame();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [drawFrame]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
        <p className="text-accent-red mb-4">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-accent-blue underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-w-[800px] mx-auto aspect-[4/3] bg-surface rounded-card overflow-hidden ${className}`}
    >
      <video
        ref={videoRef}
        className="hidden"
        muted
        playsInline
        aria-label="Live camera feed with pose detection overlay"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        aria-hidden
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg/80">
          <div className="w-10 h-10 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
          <span className="sr-only">Loading pose model…</span>
        </div>
      )}
    </div>
  );
}
