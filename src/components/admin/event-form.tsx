"use client";

import { Clock, Loader2, Plus, Zap } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, fieldAria } from "@/components/ui/form";
import { statusIcons } from "@/components/tracking/status-badge";
import { STATUS_META, type ShipmentStatus } from "@/domain/shipment-status";
import { suggestTimeZone } from "@/server/actions/admin-shipments";
import type { ActionState } from "@/server/actions/types";
import { idleState } from "@/server/actions/types";

export type EventPlace = { city?: string | null; region?: string | null; country?: string | null };

/** Where a quick-add scan usually happens. "new" clears the location so staff type the facility's city. */
const PRESETS: Record<ShipmentStatus, { description: string; place: "origin" | "last" | "destination" | "new" }> = {
  INFO_RECEIVED: { description: "Shipping label created, awaiting parcel", place: "origin" },
  ACCEPTED: { description: "Picked up from sender", place: "origin" },
  IN_TRANSIT: { description: "Departed facility, in transit to next facility", place: "last" },
  ARRIVED_AT_FACILITY: { description: "Arrived at sorting facility", place: "new" },
  OUT_FOR_DELIVERY: { description: "Out for delivery", place: "destination" },
  ON_HOLD: { description: "On hold", place: "last" },
  DELIVERED: { description: "Delivered", place: "destination" },
  EXCEPTION: { description: "Delivery attempted, recipient not available", place: "last" },
  RETURNED_TO_SENDER: { description: "Returning to sender", place: "last" },
};

/** Current wall-clock time in `timeZone` (browser zone if blank/invalid), formatted for datetime-local. */
function nowLocal(timeZone: string) {
  const opts: Intl.DateTimeFormatOptions = { hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" };
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", { ...opts, timeZone: timeZone || undefined }).formatToParts(new Date());
  } catch {
    parts = new Intl.DateTimeFormat("en-US", opts).formatToParts(new Date());
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function EventForm({
  action,
  options,
  defaultTimeZone,
  places = {},
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  options: ShipmentStatus[];
  defaultTimeZone?: string | null;
  places?: { origin?: EventPlace; last?: EventPlace; destination?: EventPlace };
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const err = (k: string) => state.fieldErrors?.[k]?.[0];
  const val = (k: string, d = "") => state.values?.[k] ?? d;
  const formRef = useRef<HTMLFormElement>(null);
  const [filled, setFilled] = useState<ShipmentStatus | null>(null);

  const field = (name: string) => formRef.current?.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
  const set = (name: string, value: string | null | undefined) => {
    const el = field(name);
    if (el) el.value = value ?? "";
  };
  // The time zone follows the city unless staff type one themselves; a time set with "Now" follows it too.
  const tzTyped = useRef(false);
  const timeIsNow = useRef(false);
  const fillNow = () => {
    set("occurredAt", nowLocal(field("timeZone")?.value ?? ""));
    timeIsNow.current = true;
  };
  async function syncTimeZone() {
    if (tzTyped.current) return;
    const value = (name: string) => field(name)?.value.trim() || undefined;
    const city = value("city");
    if (!city) return;
    const tz = await suggestTimeZone({ city, region: value("region"), country: value("country") }).catch(() => null);
    if (!tz || tzTyped.current) return;
    set("timeZone", tz);
    if (timeIsNow.current) fillNow();
  }

  function applyPreset(status: ShipmentStatus) {
    const preset = PRESETS[status];
    set("status", status);
    set("description", preset.description);
    const place = preset.place === "new" ? {} : (places[preset.place] ?? places.last ?? {});
    set("city", place.city);
    set("region", place.region);
    set("country", place.country);
    fillNow();
    void syncTimeZone();
    setFilled(status);
    (preset.place === "new" ? field("city") : field("description"))?.focus();
  }

  if (options.length === 0) {
    return <p className="text-sm text-muted">This shipment is in a final state. No further events can be recorded.</p>;
  }

  return (
    <form key={state.attempt} ref={formRef} action={formAction} onSubmit={() => setFilled(null)} className="space-y-4" noValidate>
      {/* This device's time zone, so a time typed without any location is read as local time. */}
      <input type="hidden" name="clientTimeZone" ref={(el) => void (el && (el.value = Intl.DateTimeFormat().resolvedOptions().timeZone))} />
      {state.status === "error" && state.message && <Alert tone="danger" live>{state.message}</Alert>}
      {state.status === "success" && state.message && <Alert tone="success" live>{state.message}</Alert>}
      <div className="rounded-md border border-line bg-surface/70 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
          <Zap className="size-3.5" aria-hidden /> Quick add
        </p>
        <div className="flex flex-wrap gap-2">
          {options.map((s) => {
            const Icon = statusIcons[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => applyPreset(s)}
                aria-pressed={filled === s}
                className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-white px-3 py-1.5 text-sm font-medium text-navy-900 transition-colors hover:border-navy-600 hover:bg-navy-50 aria-pressed:border-navy-700 aria-pressed:bg-navy-700 aria-pressed:text-white"
              >
                <Icon className="size-4" aria-hidden />
                {STATUS_META[s].label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted" aria-live="polite">
          {filled
            ? `Filled in "${STATUS_META[filled].label}" with the time now. Check the location, then press Record event.`
            : "Fills the form with the usual wording, location and the current time. Nothing is saved until you press Record event."}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
        <Field id="ev-status" label="Status" error={err("status")}>
          <Select
            {...fieldAria("ev-status", err("status"))}
            name="status"
            defaultValue={val("status", options[0])}
            onChange={(e) => {
              // Keep the wording in step with the status unless staff wrote their own.
              const desc = field("description")?.value.trim() ?? "";
              const isPreset = desc === "" || Object.values(PRESETS).some((p) => p.description === desc);
              if (isPreset) set("description", PRESETS[e.currentTarget.value as ShipmentStatus].description);
            }}
          >
            {options.map((s) => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </Select>
        </Field>
        <Field id="ev-occurredAt" label="Date & time (local to the location)" error={err("occurredAt")}>
          <div className="flex min-w-0 gap-2">
            <Input className="min-w-0 flex-1" {...fieldAria("ev-occurredAt", err("occurredAt"))} name="occurredAt" type="datetime-local" defaultValue={val("occurredAt")} required onInput={() => (timeIsNow.current = false)} />
            <Button type="button" variant="secondary" onClick={fillNow} className="shrink-0">
              <Clock className="size-4" aria-hidden /> Now
            </Button>
          </div>
        </Field>
      </div>
      <Field id="ev-description" label="Description (shown publicly)" error={err("description")}>
        <Input {...fieldAria("ev-description", err("description"))} name="description" defaultValue={val("description")} maxLength={280} required placeholder="e.g. Arrived at sorting facility" />
      </Field>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 [&>*]:min-w-0">
        <Field id="ev-city" label="City" optional error={err("city")}>
          <Input {...fieldAria("ev-city", err("city"))} name="city" defaultValue={val("city")} maxLength={120} placeholder="e.g. Memphis" onBlur={syncTimeZone} />
        </Field>
        <Field id="ev-region" label="Region" optional error={err("region")}>
          <Input {...fieldAria("ev-region", err("region"))} name="region" defaultValue={val("region")} maxLength={120} placeholder="e.g. TN" onBlur={syncTimeZone} />
        </Field>
        <Field id="ev-country" label="Country" optional error={err("country")}>
          <Input {...fieldAria("ev-country", err("country"))} name="country" defaultValue={val("country")} maxLength={2} placeholder="US" onBlur={syncTimeZone} />
        </Field>
        <Field id="ev-timeZone" label="Time zone" optional error={err("timeZone")}>
          <Input {...fieldAria("ev-timeZone", err("timeZone"))} name="timeZone" defaultValue={val("timeZone", defaultTimeZone ?? "")} placeholder="Filled in from the city" maxLength={64} onInput={(e) => (tzTyped.current = e.currentTarget.value.trim() !== "")} />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="max-sm:w-full">
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
          Record event
        </Button>
      </div>
    </form>
  );
}
