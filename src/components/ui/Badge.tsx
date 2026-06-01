interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "green" | "amber" | "red" | "blue";
  className?: string;
}

const variants = {
  default: "bg-surface border-border text-text-secondary",
  green: "bg-accent-green/20 text-accent-green border-accent-green/30",
  amber: "bg-accent-amber/20 text-accent-amber border-accent-amber/30",
  red: "bg-accent-red/20 text-accent-red border-accent-red/30",
  blue: "bg-accent-blue/20 text-accent-blue border-accent-blue/30",
};

export function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
