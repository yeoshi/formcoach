import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary:
    "text-white font-bold focus:ring-accent-orange hover:brightness-110 active:scale-[0.98]",
  secondary:
    "bg-surface border border-border text-text-primary hover:bg-surface-hover hover:border-border-accent",
  danger:
    "bg-accent-red/15 text-accent-red border border-accent-red/30 hover:bg-accent-red/25",
  ghost: "bg-transparent text-text-secondary hover:text-text-primary",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm min-h-[36px]",
  md: "px-4 py-2 text-base min-h-[48px]",
  lg: "px-6 py-3 text-base font-bold min-h-[56px]",
};

const primaryStyle = {
  background: "linear-gradient(135deg, #FF6B2C 0%, #FF8A50 100%)",
  boxShadow: "0 4px 20px rgba(255, 107, 44, 0.3)",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", style, children, ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-button font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      style={variant === "primary" ? { ...primaryStyle, ...style } : style}
      {...props}
    >
      {children}
    </button>
  )
);

Button.displayName = "Button";
