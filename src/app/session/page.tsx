"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PoseDetector } from "@/components/session/PoseDetector";
import { RepCounter } from "@/components/session/RepCounter";
import { FormFeedback } from "@/components/session/FormFeedback";
import { SessionControls } from "@/components/session/SessionControls";
import { Button } from "@/components/ui/Button";
import { useFormAnalysis } from "@/hooks/useFormAnalysis";
import { useAudioCues } from "@/hooks/useAudioCues";
import { useSessionRecorder } from "@/hooks/useSessionRecorder";
import { generateReport } from "@/lib/api/bedrock";
import { updateSession } from "@/lib/storage/sessions";
import { preloadAudio } from "@/lib/audio/pollyPlayer";
import type { Landmark, Violation } from "@/lib/pose/types";
import type { SessionDataForReport } from "@/lib/types";

type ViewState = "setup" | "active" | "ending" | "generating";

export default function SessionPage() {
  const router = useRouter();
  const [viewState, setViewState] = useState<ViewState>("setup");
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [displayViolations, setDisplayViolations] = useState<Violation[]>([]);
  const [isEscalation, setIsEscalation] = useState(false);
  const [streakMessage, setStreakMessage] = useState<string | null>(null);
  const [positionReady, setPositionReady] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const cleanRepsRef = useRef(0);

  const recorder = useSessionRecorder();
  const { playViolationCue, playPositiveCue } = useAudioCues();

  const getCanvas = useCallback((): HTMLCanvasElement | null => {
    return canvasContainerRef.current?.querySelector("canvas") ?? null;
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    canvasRef.current = getCanvas();
  });

  const handleViolation = useCallback(
    (violation: Violation, escalated: boolean) => {
      setDisplayViolations([violation]);
      setIsEscalation(escalated);
      recorder.recordViolation(violation);
      playViolationCue(violation, escalated);

      const canvas = getCanvas();
      if (canvas) {
        recorder.captureFrame({ current: canvas }, violation);
      }
      cleanRepsRef.current = 0;
    },
    [recorder, playViolationCue, getCanvas]
  );

  const handleRepComplete = useCallback(
    (repData: Parameters<typeof recorder.recordRep>[0]) => {
      recorder.recordRep(repData);
      if (repData.violations.length === 0) {
        cleanRepsRef.current += 1;
        if (cleanRepsRef.current >= 3) {
          setStreakMessage("🔥 Great streak!");
          setTimeout(() => setStreakMessage(null), 2000);
        }
        playPositiveCue("great_rep");
      }
    },
    [recorder, playPositiveCue]
  );

  const { repCount, currentViolations, allViolations, repData } =
    useFormAnalysis(landmarks, {
      enabled: viewState === "active",
      onViolation: handleViolation,
      onRepComplete: handleRepComplete,
    });

  useEffect(() => {
    preloadAudio();
    recorder.reset();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (viewState !== "active") return;
    const interval = setInterval(() => setTimerSeconds((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [viewState]);

  useEffect(() => {
    if (!landmarks) {
      setPositionReady(false);
      return;
    }
    const avgVis =
      landmarks.reduce((s, l) => s + l.visibility, 0) / landmarks.length;
    setPositionReady(avgVis > 0.5);
  }, [landmarks]);

  const startSession = () => {
    recorder.reset();
    setViewState("active");
    setTimerSeconds(0);
    playPositiveCue("session_start");
  };

  const endSession = async () => {
    setViewState("ending");
    playPositiveCue("session_end");
    await new Promise((r) => setTimeout(r, 2000));
    setViewState("generating");

    const sessionData: SessionDataForReport = {
      exercise: "push-up",
      totalReps: repCount,
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
  };

  const outOfFrame =
    viewState === "active" && landmarks && landmarks[0]?.visibility < 0.3;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <Link href="/" className="text-text-secondary text-sm hover:text-text-primary">
          ← Back to Home
        </Link>
        <span className="font-bold">FormCoach</span>
      </div>

      {viewState === "setup" && (
        <div className="space-y-4">
          <div className="glass-card p-3 text-center text-sm text-text-secondary">
            Stand to the side of your laptop · Side-view push-up position
          </div>
          <div ref={canvasContainerRef}>
            <PoseDetector onPoseUpdate={setLandmarks} />
          </div>
          {positionReady && (
            <p className="text-accent-green text-center text-sm">
              ✓ Position detected!
            </p>
          )}
          <Button
            size="lg"
            className="w-full"
            onClick={startSession}
            disabled={!positionReady}
          >
            Start Session
          </Button>
          <p className="text-xs text-text-secondary text-center">
            Setup tip: Position laptop to your side, about 1.5m away, at waist
            height.
          </p>
        </div>
      )}

      {viewState === "active" && (
        <>
          <div ref={canvasContainerRef} className="relative">
            <PoseDetector onPoseUpdate={setLandmarks} />
            <RepCounter count={repCount} />
            <FormFeedback
              violations={displayViolations.length ? displayViolations : currentViolations}
              isEscalation={isEscalation}
            />
            {streakMessage && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-2xl font-bold text-accent-green animate-pulse-rep">
                {streakMessage}
              </div>
            )}
            {outOfFrame && (
              <div className="absolute inset-0 flex items-center justify-center bg-bg/70 z-10">
                <p className="text-accent-amber font-medium">
                  Step back into frame
                </p>
              </div>
            )}
          </div>
          <SessionControls
            timerSeconds={timerSeconds}
            onEndSession={endSession}
          />
        </>
      )}

      {viewState === "ending" && (
        <div className="text-center py-20">
          <p className="text-2xl font-bold">Session complete! 🎉</p>
        </div>
      )}

      {viewState === "generating" && (
        <div className="space-y-4 py-12">
          <p className="text-center text-lg">Analyzing your form…</p>
          <div className="h-4 bg-surface rounded animate-pulse" />
          <div className="h-32 bg-surface rounded-card animate-pulse" />
          <div className="h-24 bg-surface rounded-card animate-pulse" />
        </div>
      )}
    </div>
  );
}
