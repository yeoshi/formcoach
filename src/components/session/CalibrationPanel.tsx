interface CalibrationPanelProps {
  progress: number;
  inPose: boolean;
  isComplete: boolean;
}

export function CalibrationPanel({
  progress,
  inPose,
  isComplete,
}: CalibrationPanelProps) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-bg/60 backdrop-blur-sm pointer-events-none">
      <div className="text-center px-6 max-w-sm">
        {isComplete ? (
          <>
            <p className="text-xl font-bold text-accent-green mb-2">
              ✅ Calibrated!
            </p>
            <p className="text-text-secondary text-sm">
              Start your push-ups whenever you&apos;re ready
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold mb-1">
              Get into push-up position
            </p>
            <p className="text-text-secondary text-sm mb-6">
              Hold it for 3 seconds — hands on the ground, body level
            </p>
            <div className="relative mx-auto w-[120px] h-[120px] mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="#2A2A2E"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="#30D158"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  className="transition-all duration-100"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-mono text-2xl font-bold">
                {Math.max(0, Math.ceil(3 * (1 - progress / 100)))}
              </span>
            </div>
            <p
              className={`text-sm ${
                inPose ? "text-accent-green" : "text-accent-amber"
              }`}
            >
              {inPose
                ? "Hold steady…"
                : "Lower into a push-up plank to begin calibration"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
