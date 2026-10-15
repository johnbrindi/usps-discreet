import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "block w-full rounded-md border bg-white px-3.5 text-ink placeholder:text-muted/80 transition-colors " +
  "focus:border-navy-600 focus:outline-none focus:ring-3 focus:ring-navy-600/20 " +
  "disabled:cursor-not-allowed disabled:bg-surface aria-[invalid=true]:border-danger-700 aria-[invalid=true]:focus:ring-danger-700/20";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11 border-line-strong", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-32 border-line-strong py-2.5", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "h-11 border-line-strong pr-8", className)} {...props} />;
}

export function Field({
  id,
  label,
  hint,
  error,
  optional,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}

/** aria props for a control inside <Field>. */
export function fieldAria(id: string, error?: string, hint?: boolean) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}
