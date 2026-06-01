"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { usePoseDetection } from "@/hooks/usePoseDetection";
import { drawSkeleton } from "./SkeletonOverlay";
import type { Landmark, ViolationRule } from "@/lib/pose/types";

interface PoseDetectorProps {
  onPoseUpdate?: (landmarks: Landmark[] | null) => void;
  onLoadError?: (message: string | null) => void;
  cameraActive?: boolean;
  violations?: ViolationRule[];
  className?: string;
  children?: React.ReactNode;
}

export function PoseDetector({
  onPoseUpdate,
  onLoadError,
  cameraActive = true,
  violations = [],
  className = "",
  children,
}: PoseDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { landmarks, isLoading, error } = usePoseDetection(
    videoRef,
    cameraActive
  );

  useEffect(() => {
    onPoseUpdate?.(landmarks);
  }, [landmarks, onPoseUpdate]);

  useEffect(() => {
    if (!cameraActive) return;
    if (error) {
      onLoadError?.(error);
      return;
    }
    if (isLoading) {
      loadTimeoutRef.current = setTimeout(() => {
        onLoadError?.(
          "Failed to load pose detection. Check your internet connection and try again."
        );
      }, 25000);
    } else {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      onLoadError?.(null);
    }
    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, [cameraActive, isLoading, error, onLoadError]);

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
      drawSkeleton(ctx, landmarks, width, height, violations);
    }
  }, [landmarks, violations]);

  useEffect(() => {
    let raf: number;
    const loop = () => {
      drawFrame();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [drawFrame]);

  const isPermissionDenied =
    error?.includes("Camera access is required") ||
    error?.includes("address bar");

  if (error && isPermissionDenied) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-8 text-center min-h-[50vh] ${className}`}
      >
        <h2 className="text-xl font-bold mb-2">Camera access required</h2>
        <p className="text-text-secondary mb-6 max-w-sm">
          Click the camera icon in your address bar to enable it
        </p>
        <Link href="/" className="text-accent-blue hover:underline">
          ← Back to Home
        </Link>
      </div>
    );
  }

  const loadFailed =
    error && !isPermissionDenied
      ? error
      : null;

  if (loadFailed) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-8 text-center min-h-[50vh] ${className}`}
      >
        <h2 className="text-xl font-bold mb-2">Failed to load pose detection</h2>
        <p className="text-text-secondary mb-6 max-w-sm">
          Check your internet connection and try again
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-accent-blue underline font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-[4/3] bg-surface overflow-hidden ${className}`}
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
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)" }}
        aria-hidden
      />
      {/* Bottom gradient for feedback banner legibility */}
      <div
        className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none z-10"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)" }}
        aria-hidden
      />
      {/* Top-right gradient for rep counter legibility */}
      <div
        className="absolute top-0 right-0 w-32 h-24 pointer-events-none z-10"
        style={{ background: "radial-gradient(ellipse at top right, rgba(0,0,0,0.45) 0%, transparent 70%)" }}
        aria-hidden
      />
      {cameraActive && isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg/80 z-10">
          <div className="w-10 h-10 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
          <span className="sr-only">Loading pose model…</span>
        </div>
      )}
      {children}
    </div>
  );
}
