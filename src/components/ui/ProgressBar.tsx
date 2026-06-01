interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  color?: "green" | "amber" | "red" | "blue" | "orange";
  animated?: boolean;
}

const colorMap = {
  green: "bg-accent-green",
  amber: "bg-accent-amber",
  red: "bg-accent-red",
  blue: "bg-accent-blue",
  orange: "bg-accent-orange",
};

export function ProgressBar({
  value,
  max = 100,
  className = "",
  color = "orange",
  animated = false,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      className={`h-2 w-full rounded-full bg-surface-elevated overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={`h-full rounded-full transition-all duration-700 ${colorMap[color]} ${animated ? "animate-score-fill" : ""}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
