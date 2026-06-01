import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", hover = false, children, ...props }, ref) => (
    <div
      ref={ref}
      className={`glass-card p-4 ${hover ? "hover:bg-surface-hover transition-colors cursor-pointer" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);

Card.displayName = "Card";
