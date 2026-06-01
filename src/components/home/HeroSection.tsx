import Link from "next/link";
import { Button } from "@/components/ui/Button";

function PushUpIllustration() {
  return (
    <svg
      viewBox="0 0 320 180"
      className="w-full max-w-md mx-auto"
      aria-hidden
    >
      <rect width="320" height="180" fill="#141416" rx="12" />
      {/* Body silhouette - side view push-up */}
      <ellipse cx="200" cy="100" rx="60" ry="12" fill="#2A2A2E" />
      <line x1="140" y1="100" x2="80" y2="85" stroke="#8E8E93" strokeWidth="3" />
      <line x1="80" y1="85" x2="60" y2="110" stroke="#8E8E93" strokeWidth="3" />
      <line x1="140" y1="100" x2="160" y2="75" stroke="#8E8E93" strokeWidth="3" />
      <line x1="160" y1="75" x2="175" y2="95" stroke="#8E8E93" strokeWidth="3" />
      <line x1="200" y1="100" x2="250" y2="110" stroke="#8E8E93" strokeWidth="3" />
      <line x1="250" y1="110" x2="270" y2="130" stroke="#8E8E93" strokeWidth="3" />
      <circle cx="70" cy="115" r="8" fill="#FFD60A" />
      <circle cx="165" cy="72" r="6" fill="#FFD60A" />
      <circle cx="255" cy="128" r="6" fill="#FFD60A" />
      {/* Angle guides */}
      <path
        d="M 75 95 A 20 20 0 0 1 85 110"
        fill="none"
        stroke="#30D158"
        strokeWidth="1.5"
        strokeDasharray="4 2"
      />
      <text x="90" y="105" fill="#30D158" fontSize="10">
        90°
      </text>
      {/* Checkmarks */}
      <text x="50" y="70" fill="#30D158" fontSize="16">
        ✓
      </text>
      <text x="180" y="55" fill="#30D158" fontSize="16">
        ✓
      </text>
      <text x="240" y="95" fill="#30D158" fontSize="16">
        ✓
      </text>
    </svg>
  );
}

export function HeroSection() {
  return (
    <section className="text-center mb-12">
      <h1 className="text-4xl md:text-5xl font-bold mb-2">FormCoach</h1>
      <p className="text-xl text-accent-blue mb-4">AI Push-Up Coach</p>
      <p className="text-text-secondary max-w-lg mx-auto mb-8">
        Get real-time form feedback on your push-ups using just your laptop
        webcam.
      </p>
      <div className="mb-8">
        <PushUpIllustration />
      </div>
      <Link href="/session">
        <Button size="lg">Start Session →</Button>
      </Link>
    </section>
  );
}
