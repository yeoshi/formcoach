"use client";

import { useCallback, useEffect, useState } from "react";
import { preloadAudio, playCue, playDynamicCue, isAudioPlaying } from "@/lib/audio/pollyPlayer";
import type { Violation } from "@/lib/pose/types";

export function useAudioCues() {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    preloadAudio();
  }, []);

  const playViolationCue = useCallback(
    async (violation: Violation, isEscalation: boolean) => {
      const cueId = isEscalation
        ? `${violation.rule}_escalation`
        : violation.rule;
      setIsPlaying(true);
      playCue(cueId);
      setTimeout(() => setIsPlaying(isAudioPlaying()), 3000);
    },
    []
  );

  const playPositiveCue = useCallback((cueId: string) => {
    setIsPlaying(true);
    playCue(cueId);
    setTimeout(() => setIsPlaying(isAudioPlaying()), 3000);
  }, []);

  return { playViolationCue, playPositiveCue, isPlaying, playDynamicCue };
}
