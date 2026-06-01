import type { BodyDetectionResult } from "@/lib/pose/bodyDetection";

interface BodyDetectionBannerProps {
  result: BodyDetectionResult;
}

const styles = {
  red: "bg-accent-red/90 text-white",
  amber: "bg-accent-amber/90 text-bg",
  green: "bg-accent-green/90 text-white",
};

export function BodyDetectionBanner({ result }: BodyDetectionBannerProps) {
  return (
    <div
      className={`absolute top-0 left-0 right-0 z-20 px-4 py-4 text-center font-medium text-sm md:text-base ${styles[result.variant]}`}
      role="status"
    >
      {result.message}
    </div>
  );
}
