"use client";

interface ReadyPopupProps {
  onStart: () => void;
}

export function ReadyPopup({ onStart }: ReadyPopupProps) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
    >
      <div
        className="bg-surface rounded-3xl p-10 w-80 text-center animate-slide-up"
        style={{ border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}
      >
        <div className="w-16 h-16 rounded-full border-4 border-accent-green flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl text-accent-green font-black">✓</span>
        </div>
        <h2 className="text-4xl font-black text-accent-green mb-2">Ready!</h2>
        <p className="text-text-secondary text-sm mb-8 leading-relaxed">
          Body detected. Get into push-up position and hit Start.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="w-48 h-14 bg-white text-black font-black text-xl rounded-button mx-auto flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-[0.97]"
          style={{ boxShadow: "0 4px 24px rgba(255,255,255,0.2)" }}
        >
          Start
        </button>
      </div>
    </div>
  );
}
