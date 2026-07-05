import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return <button className={cn("ui-button", `ui-button-${variant}`, className)} {...props} />;
}

export type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
};

export function LinkButton({ className, variant = "primary", ...props }: LinkButtonProps) {
  return <a className={cn("ui-button", `ui-button-${variant}`, className)} {...props} />;
}

export function Badge({ className, children, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("ui-badge", className)} {...props}>
      {children}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  className
}: {
  label: string;
  value: string;
  detail?: string;
  className?: string;
}) {
  return (
    <section className={cn("metric-card", className)}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </section>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const boundedValue = Math.max(0, Math.min(100, value));

  return (
    <div className="progress-wrap" aria-label={label} aria-valuenow={boundedValue} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${boundedValue}%` }} />
    </div>
  );
}

export function Panel({ className, children, ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section className={cn("panel", className)} {...props}>
      {children}
    </section>
  );
}
