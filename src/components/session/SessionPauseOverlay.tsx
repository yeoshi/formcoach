interface SessionPauseOverlayProps {
  resumed?: boolean;
}

export function SessionPauseOverlay({ resumed = false }: SessionPauseOverlayProps) {
  if (resumed) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/50 pointer-events-none">
        <p className="text-xl font-bold text-accent-green animate-pulse-rep">
          Tracking resumed!
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/85">
      <div className="text-center px-6">
        <p className="text-3xl font-bold mb-2">⏸️ Paused</p>
        <p className="text-lg text-text-secondary">
          Step back into frame
        </p>
        <p className="text-sm text-text-secondary mt-2">
          Rep counting is paused until you&apos;re fully visible again
        </p>
      </div>
    </div>
  );
}
