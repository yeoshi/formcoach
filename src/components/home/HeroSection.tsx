import Link from "next/link";

export function HeroSection() {
  return (
    <section className="text-center mb-4">
      <p className="text-xs font-bold tracking-widest uppercase text-accent-orange mb-1">
        AI Push-Up Coach
      </p>
      <h1 className="text-5xl font-black text-white mb-3 tracking-tight">
        FormCoach
      </h1>
      <p className="text-text-secondary max-w-sm mx-auto mb-8 text-sm leading-relaxed">
        Real-time form feedback on your push-ups using just your laptop webcam.
      </p>
      <Link href="/session">
        <button
          type="button"
          className="w-full max-w-xs mx-auto flex items-center justify-center text-white font-bold text-base rounded-button h-14 transition-all hover:brightness-110 active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #FF6B2C 0%, #FF8A50 100%)",
            boxShadow: "0 4px 20px rgba(255, 107, 44, 0.35)",
          }}
        >
          Start Session →
        </button>
      </Link>
    </section>
  );
}
