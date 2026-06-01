import { Button } from "@/components/ui/Button";

interface PositionGuideProps {
  onContinue: () => void;
}

function SetupDiagram() {
  return (
    <svg viewBox="0 0 360 200" className="w-full max-w-md mx-auto" aria-hidden>
      <rect width="360" height="200" fill="#141416" rx="12" />
      {/* Table + laptop */}
      <rect x="40" y="100" width="80" height="8" fill="#2A2A2E" rx="2" />
      <rect x="55" y="72" width="50" height="32" fill="#1C1C1F" stroke="#2A2A2E" rx="3" />
      <circle cx="80" cy="88" r="4" fill="#0A84FF" />
      {/* Person side view */}
      <circle cx="220" cy="55" r="10" fill="#8E8E93" />
      <line x1="220" y1="65" x2="250" y2="95" stroke="#8E8E93" strokeWidth="4" />
      <line x1="250" y1="95" x2="280" y2="130" stroke="#8E8E93" strokeWidth="4" />
      <line x1="250" y1="95" x2="210" y2="110" stroke="#8E8E93" strokeWidth="3" />
      <line x1="280" y1="130" x2="300" y2="155" stroke="#8E8E93" strokeWidth="3" />
      {/* Distance arrow */}
      <line x1="110" y1="145" x2="200" y2="145" stroke="#30D158" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="130" y="165" fill="#30D158" fontSize="11">
        1.5–2m
      </text>
      {/* Camera sight line */}
      <line x1="80" y1="88" x2="220" y2="95" stroke="#0A84FF" strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
      <text x="12" y="24" fill="#8E8E93" fontSize="10">
        Waist-height camera · side view
      </text>
    </svg>
  );
}

const CHECKLIST = [
  "Laptop is at your side (not in front)",
  "Full body visible from head to ankles",
  "Good lighting (no strong backlight)",
  "About 1.5m away from camera",
];

export function PositionGuide({ onContinue }: PositionGuideProps) {
  return (
    <div className="space-y-6 page-fade">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Set Up Your Camera</h1>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          Position your laptop on a chair or table at waist height, pointing
          sideways at you from 1.5–2 meters away.
        </p>
      </div>

      <SetupDiagram />

      <ul className="space-y-3 max-w-md mx-auto">
        {CHECKLIST.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm">
            <span className="text-accent-green shrink-0">✅</span>
            <span className="text-text-secondary">{item}</span>
          </li>
        ))}
      </ul>

      <Button size="lg" className="w-full max-w-md mx-auto block" onClick={onContinue}>
        Turn On Camera →
      </Button>
    </div>
  );
}
