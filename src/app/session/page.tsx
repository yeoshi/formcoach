"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PoseDetector } from "@/components/session/PoseDetector";
import { RepCounter } from "@/components/session/RepCounter";
import { FormFeedback } from "@/components/session/FormFeedback";
import { SessionControls } from "@/components/session/SessionControls";
import { SetupOverlay } from "@/components/session/SetupOverlay";
import { ModeSelector, type SessionMode } from "@/components/session/ModeSelector";
import { SessionPauseOverlay } from "@/components/session/SessionPauseOverlay";
import { playSuccessDing } from "@/lib/audio/successDing";
import { playCountdownBeep, playTimesUpBuzzer } from "@/lib/audio/countdownBeep";
import { useFormAnalysis } from "@/hooks/useFormAnalysis";
import { useAutoSessionStart } from "@/hooks/useAutoSessionStart";
import { useAudioCues } from "@/hooks/useAudioCues";
import { useSessionRecorder } from "@/hooks/useSessionRecorder";
import { generateReport } from "@/lib/api/bedrock";
import { updateSession } from "@/lib/storage/sessions";
import { preloadAudio } from "@/lib/audio/pollyPlayer";
import {
  isInPushUpPosition,
  isPersonDetected,
  isTrackingPaused,
  type SetupOverlayState,
} from "@/lib/pose/bodyDetection";
import { getVisibleSide } from "@/lib/pose/angles";
import { IPPT_DURATION_SECONDS } from "@/lib/constants";
import { DEFAULT_FORM_BASELINE } from "@/lib/pose/ruleEngine";
import type { FormBaseline, Landmark, Violation } from "@/lib/pose/types";
import type { SessionDataForReport } from "@/lib/types";

type SessionPhase = "preparing" | "active" | "ending" | "generating";

export default function SessionPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<SessionPhase>("preparing");
  const [sessionMode, setSessionMode] = useState<SessionMode>("ippt");
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [sessionBaseline, setSessionBaseline] = useState<FormBaseline | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [displayViolations, setDisplayViolations] = useState<Violation[]>([]);
  const [streakMessage, setStreakMessage] = useState<string | null>(null);
  const [streakCount, setStreakCount] = useState(0);
  const [showResumed, setShowResumed] = useState(false);
  const [repSuccessFlash, setRepSuccessFlash] = useState(false);
  const [showNiceRep, setShowNiceRep] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const cleanRepsRef = useRef(0);
  const prevPausedRef = useRef(false);
  const endingRef = useRef(false);

  const recorder = useSessionRecorder();
  const { playViolationCue, playPositiveCue } = useAudioCues();

  const handleSessionReady = useCallback(
    (baseline: FormBaseline) => {
      setSessionBaseline(baseline);
      recorder.reset();
      setPhase("active");
      setTimerSeconds(0);
      playPositiveCue("session_start");
    },
    [recorder, playPositiveCue]
  );

  // Go straight into the session — no popup, no countdown
  const handleBaselineReady = useCallback(
    (baseline: FormBaseline) => {
      handleSessionReady(baseline);
    },
    [handleSessionReady]
  );

  const autoStart = useAutoSessionStart(
    landmarks,
    phase === "preparing",
    handleBaselineReady
  );

  const paused = phase === "active" && isTrackingPaused(landmarks);

  const setupOverlayState: SetupOverlayState = useMemo(() => {
    if (phase !== "preparing") return "no_person";
    if (autoStart.inCountdown) return "countdown";
    if (!isPersonDetected(landmarks)) return "no_person";
    if (!landmarks) return "no_person";
    const side = getVisibleSide(landmarks);
    if (!isInPushUpPosition(landmarks, side)) return "not_pushup";
    return "holding";
  }, [phase, landmarks, autoStart.inCountdown]);

  const showSkeleton = phase === "preparing" && setupOverlayState !== "no_person";

  const getCanvas = useCallback((): HTMLCanvasElement | null => {
    return canvasContainerRef.current?.querySelector("canvas") ?? null;
  }, []);

  const handleViolation = useCallback(
    (violation: Violation, escalated: boolean) => {
      setDisplayViolations([violation]);
      recorder.recordViolation(violation);
      playViolationCue(violation, escalated);
      const canvas = getCanvas();
      if (canvas) {
        recorder.captureFrame({ current: canvas }, violation);
      }
      cleanRepsRef.current = 0;
      setStreakCount(0);
    },
    [recorder, playViolationCue, getCanvas]
  );

  const handleRepComplete = useCallback(
    (repData: Parameters<typeof recorder.recordRep>[0]) => {
      recorder.recordRep(repData);
      if (!repData.successful) {
        cleanRepsRef.current = 0;
        setStreakCount(0);
        return;
      }
      playSuccessDing();
      setRepSuccessFlash(true);
      setTimeout(() => setRepSuccessFlash(false), 200);
      if (repData.violations.length === 0) {
        setShowNiceRep(true);
        setTimeout(() => setShowNiceRep(false), 2000);
        cleanRepsRef.current += 1;
        setStreakCount(cleanRepsRef.current);
        if (cleanRepsRef.current >= 3) {
          setStreakMessage("🔥 Great streak!");
          setTimeout(() => setStreakMessage(null), 2000);
        }
      } else {
        cleanRepsRef.current = 0;
        setStreakCount(0);
      }
    },
    [recorder]
  );

  const {
    successfulRepCount,
    totalRepCount,
    currentViolations,
    allViolations,
    repData,
  } = useFormAnalysis(landmarks, {
    enabled: phase === "active" && !paused && sessionBaseline !== null,
    baseline: sessionBaseline ?? DEFAULT_FORM_BASELINE,
    onViolation: handleViolation,
    onRepComplete: handleRepComplete,
  });

  useEffect(() => {
    preloadAudio();
  }, []);

  // Beep on each calibration countdown step (3, 2, 1, GO!)
  useEffect(() => {
    if (!autoStart.countdownLabel) return;
    playCountdownBeep(autoStart.countdownLabel === "GO!");
  }, [autoStart.countdownLabel]);

  const endSession = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    setPhase("ending");
    playPositiveCue("session_end");
    await new Promise((r) => setTimeout(r, 2000));
    setPhase("generating");

    const sessionData: SessionDataForReport = {
      exercise: "push-up",
      totalReps: totalRepCount,
      successfulReps: successfulRepCount,
      durationSeconds: timerSeconds,
      violations: allViolations.map((v) => ({
        rule: v.rule,
        repNumber: v.repNumber,
        severity: v.severity,
        timestamp: v.timestamp,
      })),
      repData,
    };

    let report = null;
    let formScore = 75;
    try {
      report = await generateReport(sessionData);
      formScore = report.formScore;
    } catch {
      console.error("Report generation failed");
    }

    const session = recorder.endSession(formScore, report);
    if (report) {
      updateSession({ ...session, report, formScore });
    }

    router.push(`/report/${session.id}`);
  }, [
    allViolations,
    playPositiveCue,
    recorder,
    repData,
    router,
    successfulRepCount,
    timerSeconds,
    totalRepCount,
  ]);

  useEffect(() => {
    if (phase !== "active") return;
    const interval = setInterval(() => setTimerSeconds((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "active" || sessionMode !== "ippt") return;
    if (timerSeconds >= IPPT_DURATION_SECONDS) {
      playTimesUpBuzzer();
      void endSession();
    }
  }, [timerSeconds, phase, sessionMode, endSession]);

  useEffect(() => {
    if (phase !== "active") {
      prevPausedRef.current = false;
      return;
    }
    if (prevPausedRef.current && !paused) {
      setShowResumed(true);
      const t = setTimeout(() => setShowResumed(false), 2000);
      return () => clearTimeout(t);
    }
    prevPausedRef.current = paused;
  }, [paused, phase]);

  const displaySeconds = sessionMode === "ippt"
    ? Math.max(0, IPPT_DURATION_SECONDS - timerSeconds)
    : timerSeconds;

  const timerColor =
    sessionMode !== "ippt" ? "#FFFFFF"
    : displaySeconds <= 10 ? "#FF3B3B"
    : displaySeconds <= 20 ? "#FFB800"
    : "#FFFFFF";

  const showCamera = phase === "preparing" || phase === "active";

  return (
    <div className="-mx-4 px-0 py-2">
      {showCamera && (
        <div ref={canvasContainerRef} className="relative w-full">
          <PoseDetector
            cameraActive
            onPoseUpdate={setLandmarks}
            violations={phase === "active" && !paused ? currentViolations.map(v => v.rule) : []}
          >
            <ModeSelector
              mode={sessionMode}
              onChange={setSessionMode}
              locked={autoStart.modeLocked}
            />

            {phase === "preparing" && (
              <SetupOverlay
                state={setupOverlayState}
                holdProgress={autoStart.holdProgress}
                countdownLabel={autoStart.countdownLabel}
                showSkeleton={showSkeleton}
              />
            )}

            {phase === "active" && (
              <>
                <RepCounter
                  count={successfulRepCount}
                  successFlash={repSuccessFlash}
                />

                {/* Timer — top-center */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
                  <div
                    className={`px-5 py-2 rounded-xl tabular-nums font-mono font-black leading-none ${
                      displaySeconds <= 10 && sessionMode === "ippt" ? "animate-pulse" : ""
                    }`}
                    style={{
                      background: "rgba(0,0,0,0.6)",
                      fontSize: "clamp(40px, 10vw, 72px)",
                      color: timerColor,
                    }}
                  >
                    {sessionMode === "ippt"
                      ? String(displaySeconds).padStart(2, "0")
                      : `${String(Math.floor(displaySeconds / 60)).padStart(2, "0")}:${String(displaySeconds % 60).padStart(2, "0")}`}
                  </div>
                </div>

                {/* REC dot — bottom-left */}
                <div className="absolute bottom-16 left-3 z-20 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <span className="text-xs text-red-400 font-bold tracking-widest">REC</span>
                </div>

                {/* Streak indicator — top-left */}
                {streakCount >= 1 && !paused && (
                  <div
                    className={`absolute top-4 left-3 z-20 flex items-center gap-1 bg-black/60 rounded-xl px-3 py-1.5 ${
                      streakCount >= 5 ? "animate-streak-glow" : ""
                    }`}
                  >
                    <span className="text-base leading-none">🔥</span>
                    <span className="font-bold text-white text-sm">{streakCount}</span>
                  </div>
                )}

                <FormFeedback
                  violations={
                    paused
                      ? []
                      : displayViolations.length
                        ? displayViolations
                        : currentViolations
                  }
                  paused={paused}
                  streakMessage={!paused && streakMessage ? streakMessage : null}
                  positiveMessage={!paused && showNiceRep ? "nice_rep" : null}
                />
                {showResumed && !paused && <SessionPauseOverlay resumed />}
              </>
            )}
          </PoseDetector>

          {phase === "active" && (
            <SessionControls
              onEndSession={() => void endSession()}
              disabled={paused}
            />
          )}
        </div>
      )}

      {phase === "ending" && (
        <div className="text-center py-20 px-4">
          <p className="text-2xl font-bold">Session complete!</p>
        </div>
      )}

      {phase === "generating" && (
        <div className="space-y-4 py-12 px-4">
          <p className="text-center text-lg">Analysing your form…</p>
          <div className="h-4 bg-surface rounded animate-pulse" />
          <div className="h-32 bg-surface rounded-card animate-pulse" />
          <div className="h-24 bg-surface rounded-card animate-pulse" />
        </div>
      )}
    </div>
  );
}
