"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, fieldAria } from "@/components/ui/form";
import { CARRIER_PROVIDERS, PROVIDER_LABELS, type CarrierProviderId } from "@/domain/carriers";
import type { ActionState } from "@/server/actions/types";
import { idleState } from "@/server/actions/types";

export type ShipmentFormValues = Partial<Record<
  | "trackingNumber" | "serviceLevel" | "carrier" | "externalReference"
  | "originCity" | "originRegion" | "originCountry"
  | "destinationCity" | "destinationRegion" | "destinationCountry" | "destinationPostcode"
  | "recipientName" | "internalNotes" | "estimatedDeliveryDate" | "estimateSource"
  | "trackingMode" | "carrierProvider" | "carrierTrackingNumber",
  string
>>;

export function ShipmentForm({
  action,
  initial = {},
  mode,
  configuredProviders = [],
  carrierTracked = false,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial?: ShipmentFormValues;
  mode: "create" | "update";
  /** Providers with API credentials on the server (create mode). */
  configuredProviders?: CarrierProviderId[];
  /** Update mode: the carrier supplies the estimate, so its fields are hidden. */
  carrierTracked?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const err = (k: string) => state.fieldErrors?.[k]?.[0];
  const val = (k: keyof ShipmentFormValues) => state.values?.[k] ?? initial[k] ?? "";
  const [trackingMode, setTrackingMode] = useState(val("trackingMode") === "CARRIER" ? "CARRIER" : "MANUAL");
  const carrierMode = mode === "create" && trackingMode === "CARRIER";

  const text = (name: keyof ShipmentFormValues, label: string, opts: { optional?: boolean; hint?: string; className?: string; max?: number; type?: string } = {}) => (
    <Field id={name} label={label} optional={opts.optional ?? true} hint={opts.hint} error={err(name)} className={opts.className}>
      <Input {...fieldAria(name, err(name), !!opts.hint)} name={name} defaultValue={val(name)} maxLength={opts.max} type={opts.type ?? "text"} />
    </Field>
  );

  return (
    <form key={state.attempt} action={formAction} className="space-y-8" noValidate>
      {state.status === "error" && state.message && <Alert tone="danger" live>{state.message}</Alert>}
      {state.status === "success" && state.message && <Alert tone="success" live>{state.message}</Alert>}

      {mode === "create" && (
        <fieldset className="space-y-4">
          <legend className="mb-3 text-sm font-bold tracking-wide text-navy-900 uppercase">Tracking method</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ["MANUAL", "Recorded by staff", "Your team records each scan in this console."],
              ["CARRIER", "Live from carrier API", "Scans are pulled automatically from USPS, DHL or any carrier via Ship24."],
            ] as const).map(([value, title, desc]) => (
              <label
                key={value}
                className="flex cursor-pointer gap-3 rounded-md border border-line-strong p-4 has-[:checked]:border-navy-600 has-[:checked]:bg-navy-50"
              >
                <input
                  type="radio"
                  name="trackingMode"
                  value={value}
                  checked={trackingMode === value}
                  onChange={() => setTrackingMode(value)}
                  className="mt-1 accent-navy-700"
                />
                <span>
                  <span className="block font-semibold text-ink">{title}</span>
                  <span className="block text-sm text-muted">{desc}</span>
                </span>
              </label>
            ))}
          </div>
          {carrierMode && (
            <div className="grid gap-5 sm:grid-cols-2">
              {text("carrierTrackingNumber", "Carrier tracking number", {
                optional: false,
                max: 60,
                hint: "Exactly as printed on the carrier's label or receipt.",
              })}
              <Field
                id="carrierProvider"
                label="Carrier API"
                error={err("carrierProvider")}
                hint={
                  configuredProviders.length
                    ? `Configured: ${configuredProviders.map((p) => PROVIDER_LABELS[p]).join(", ")}.`
                    : "No carrier credentials are configured yet — see docs/integrations.md."
                }
              >
                <Select {...fieldAria("carrierProvider", err("carrierProvider"), true)} name="carrierProvider" defaultValue={val("carrierProvider") || "auto"}>
                  <option value="auto">Detect from the number</option>
                  {CARRIER_PROVIDERS.map((p) => (
                    <option key={p} value={p} disabled={!configuredProviders.includes(p)}>
                      {PROVIDER_LABELS[p]}
                      {configuredProviders.includes(p) ? "" : " — not configured"}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
        </fieldset>
      )}

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-bold tracking-wide text-navy-900 uppercase">Shipment</legend>
        {mode === "create" ? (
          text("trackingNumber", "Tracking number customers enter", {
            hint: carrierMode
              ? "Leave blank to use the carrier's number."
              : "Leave blank to generate a secure random number.",
            className: "sm:col-span-2",
            max: 40,
          })
        ) : null}
        {text("serviceLevel", "Service level", { max: 80 })}
        {text("carrier", "Carrier", { max: 80, hint: "Only if handed to a partner carrier." })}
        {text("externalReference", "External reference", { max: 120 })}
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-3">
        <legend className="mb-3 text-sm font-bold tracking-wide text-navy-900 uppercase">Origin (shown publicly)</legend>
        {text("originCity", "City", { max: 120 })}
        {text("originRegion", "State / region", { max: 120 })}
        {text("originCountry", "Country", { max: 2, hint: "2-letter code, e.g. US" })}
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-3">
        <legend className="mb-3 text-sm font-bold tracking-wide text-navy-900 uppercase">Destination</legend>
        {text("destinationCity", "City (public)", { max: 120 })}
        {text("destinationRegion", "State / region (public)", { max: 120 })}
        {text("destinationCountry", "Country (public)", { max: 2 })}
        {text("destinationPostcode", "Postcode (private)", { max: 20 })}
        {text("recipientName", "Recipient name (private)", { max: 160, className: "sm:col-span-2" })}
      </fieldset>

      {carrierMode || carrierTracked ? (
        <p className="rounded-md bg-surface px-4 py-3 text-sm text-muted">
          Status, delivery estimate and any blank origin/destination fields are filled in from the carrier on each sync.
        </p>
      ) : (
        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-3 text-sm font-bold tracking-wide text-navy-900 uppercase">Delivery estimate</legend>
          {text("estimatedDeliveryDate", "Estimated delivery date", { type: "date" })}
          {text("estimateSource", "Source of estimate", { max: 120, hint: "Required with a date, e.g. “Carrier API” or “2-day service standard”." })}
        </fieldset>
      )}

      <Field id="internalNotes" label="Internal notes (private)" optional error={err("internalNotes")}>
        <Textarea {...fieldAria("internalNotes", err("internalNotes"))} name="internalNotes" defaultValue={val("internalNotes")} maxLength={4000} rows={3} />
      </Field>

      <div className="flex justify-end border-t border-line pt-5">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {mode === "create" ? "Create shipment" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
