"use client";

interface NiceRepBannerProps {
  visible: boolean;
}

export function NiceRepBanner({ visible }: NiceRepBannerProps) {
  if (!visible) return null;

  return (
    <div
      className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 animate-slide-up pointer-events-none"
      role="status"
    >
      <div className="px-6 py-3 rounded-full bg-accent-green/95 text-white font-bold text-lg shadow-lg">
        NICE REP! ✅
      </div>
    </div>
  );
}
