import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "accent" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-colors " +
  "disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-offset-2";

const variants: Record<Variant, string> = {
  primary: "bg-navy-700 text-white hover:bg-navy-800 active:bg-navy-900",
  secondary: "border border-line-strong bg-white text-navy-900 hover:bg-navy-50 active:bg-navy-100",
  accent: "bg-amber-500 text-navy-950 hover:bg-amber-600 active:bg-amber-600",
  ghost: "text-navy-800 hover:bg-navy-50 active:bg-navy-100",
  danger: "border border-danger-700/30 bg-white text-danger-700 hover:bg-danger-50",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-[0.9375rem]",
  lg: "h-13 px-6 text-base",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
