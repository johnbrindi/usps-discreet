"use client";

import { Loader2, Plus } from "lucide-react";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, fieldAria } from "@/components/ui/form";
import { STATUS_META, type ShipmentStatus } from "@/domain/shipment-status";
import type { ActionState } from "@/server/actions/types";
import { idleState } from "@/server/actions/types";

export function EventForm({
  action,
  options,
  defaultTimeZone,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  options: ShipmentStatus[];
  defaultTimeZone?: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const err = (k: string) => state.fieldErrors?.[k]?.[0];
  const val = (k: string, d = "") => state.values?.[k] ?? d;

  if (options.length === 0) {
    return <p className="text-sm text-muted">This shipment is in a final state. No further events can be recorded.</p>;
  }

  return (
    <form key={state.attempt} action={formAction} className="space-y-4" noValidate>
      {state.status === "error" && state.message && <Alert tone="danger" live>{state.message}</Alert>}
      {state.status === "success" && state.message && <Alert tone="success" live>{state.message}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ev-status" label="Status" error={err("status")}>
          <Select {...fieldAria("ev-status", err("status"))} name="status" defaultValue={val("status", options[0])}>
            {options.map((s) => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </Select>
        </Field>
        <Field id="ev-occurredAt" label="Date & time (local to the location)" error={err("occurredAt")}>
          <Input {...fieldAria("ev-occurredAt", err("occurredAt"))} name="occurredAt" type="datetime-local" defaultValue={val("occurredAt")} required />
        </Field>
      </div>
      <Field id="ev-description" label="Description (shown publicly)" error={err("description")}>
        <Input {...fieldAria("ev-description", err("description"))} name="description" defaultValue={val("description")} maxLength={280} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field id="ev-city" label="City" optional error={err("city")}>
          <Input {...fieldAria("ev-city", err("city"))} name="city" defaultValue={val("city")} maxLength={120} />
        </Field>
        <Field id="ev-region" label="Region" optional error={err("region")}>
          <Input {...fieldAria("ev-region", err("region"))} name="region" defaultValue={val("region")} maxLength={120} />
        </Field>
        <Field id="ev-country" label="Country" optional error={err("country")}>
          <Input {...fieldAria("ev-country", err("country"))} name="country" defaultValue={val("country")} maxLength={2} />
        </Field>
        <Field id="ev-timeZone" label="Time zone" optional error={err("timeZone")}>
          <Input {...fieldAria("ev-timeZone", err("timeZone"))} name="timeZone" defaultValue={val("timeZone", defaultTimeZone ?? "")} placeholder="America/Chicago" maxLength={64} />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
          Record event
        </Button>
      </div>
    </form>
  );
}
