"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { trackingFormSchema, type TrackingFormInput } from "@/validation/tracking";

/**
 * Tracking search. Works without JavaScript (GET /track?trackingNumber=…); with JS it validates
 * instantly and navigates client-side.
 */
export function TrackingForm({
  defaultValue = "",
  serverError,
  size = "lg",
  autoFocus,
}: {
  defaultValue?: string;
  serverError?: string;
  size?: "md" | "lg";
  autoFocus?: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrackingFormInput, unknown, { trackingNumber: string }>({
    resolver: zodResolver(trackingFormSchema),
    defaultValues: { trackingNumber: defaultValue },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const error = errors.trackingNumber?.message ?? serverError;
  const inputId = `${id}-tn`;

  return (
    <form
      action="/track"
      method="get"
      noValidate
      role="search"
      aria-label="Track a parcel"
      onSubmit={handleSubmit(({ trackingNumber }) =>
        startTransition(() => router.push(`/track/${encodeURIComponent(trackingNumber)}`)),
      )}
    >
      <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-ink">
        Tracking number
      </label>
      <div className={cn("flex flex-col gap-3", size === "lg" && "sm:flex-row")}>
        <input
          id={inputId}
          {...register("trackingNumber")}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus={autoFocus}
          placeholder="e.g. MP 1234 5678 9012 3456 7890"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : `${inputId}-hint`}
          className={cn(
            // flex-1 only in the row layout (lg): in the stacked md layout it would set a 0 height basis and collapse the input.
            "w-full min-w-0 rounded-md border border-line-strong bg-white px-4 font-mono tracking-wide text-ink",
            size === "lg" && "sm:flex-1",
            "placeholder:font-sans placeholder:tracking-normal placeholder:text-muted/80",
            "focus:border-navy-600 focus:ring-3 focus:ring-navy-600/20 focus:outline-none",
            "aria-[invalid=true]:border-danger-700",
            size === "lg" ? "h-14 text-lg" : "h-12 text-base",
          )}
        />
        <button
          type="submit"
          disabled={pending}
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-navy-700 px-6 font-semibold text-white",
            "transition-colors hover:bg-navy-800 active:bg-navy-900 disabled:opacity-70",
            size === "lg" ? "h-14 text-base" : "h-12 text-[0.9375rem]",
          )}
        >
          {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Search className="size-5" aria-hidden />}
          {pending ? "Tracking…" : "Track"}
        </button>
      </div>
      <p
        id={error ? `${inputId}-error` : `${inputId}-hint`}
        role={error ? "alert" : undefined}
        className={cn("mt-2 text-sm", error ? "font-medium text-danger-700" : "text-muted")}
      >
        {error ?? "Find it on your shipping receipt or confirmation email. Spaces and dashes are fine."}
      </p>
    </form>
  );
}
