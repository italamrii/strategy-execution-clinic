import { type ButtonHTMLAttributes } from "react";

const variants = {
  primary:
    "bg-navy text-surface hover:bg-navy-deep border border-navy",
  secondary:
    "bg-surface text-ink border border-line-strong hover:border-navy",
  ghost: "bg-transparent text-ink border border-transparent hover:bg-ivory",
  danger: "bg-danger text-surface border border-danger",
} as const;

type Variant = keyof typeof variants;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center px-5 text-sm font-medium tracking-wide transition-colors duration-[var(--duration-fast)] [transition-timing-function:var(--ease-editorial)] disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
