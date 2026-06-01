"use client";

import { useEffect, useRef, useState } from "react";
import { initPose } from "@/lib/pose/mediapose";
import type { Landmark } from "@/lib/pose/types";

export function usePoseDetection(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let mounted = true;

    async function start() {
      const el = videoRef.current;
      if (!el) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        el.srcObject = stream;
        await el.play();

        const cleanup = initPose(el, (lms) => {
          if (mounted) {
            setLandmarks(lms);
            setIsLoading(false);
          }
        });

        cleanupRef.current = () => {
          cleanup();
          stream.getTracks().forEach((t) => t.stop());
        };
      } catch (err) {
        if (!mounted) return;
        const e = err as DOMException;
        if (e.name === "NotAllowedError") {
          setError(
            "Camera access is required. Click the camera icon in your browser's address bar to enable it."
          );
        } else if (e.name === "NotFoundError") {
          setError("No webcam detected. Please connect a webcam.");
        } else if (e.name === "NotReadableError") {
          setError(
            "Your camera is being used by another app. Close it and try again."
          );
        } else {
          setError("Failed to start camera. Please try again.");
        }
        setIsLoading(false);
      }
    }

    start();

    return () => {
      mounted = false;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [videoRef]);

  return { landmarks, isLoading, error };
}
