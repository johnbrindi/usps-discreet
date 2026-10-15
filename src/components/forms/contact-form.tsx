"use client";

import { Loader2, Send } from "lucide-react";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, fieldAria } from "@/components/ui/form";
import { submitContact } from "@/server/actions/contact";
import { idleState } from "@/server/actions/types";
import { CONTACT_TOPICS } from "@/validation/contact";

export function ContactForm({ defaultTrackingNumber = "" }: { defaultTrackingNumber?: string }) {
  const [state, action, pending] = useActionState(submitContact, idleState);
  const err = (k: string) => state.fieldErrors?.[k]?.[0];
  const v = (k: string) => state.values?.[k];

  if (state.status === "success") {
    return (
      <Alert tone="success" title="Message sent" live>
        {state.message} We&apos;ll reply by email.
      </Alert>
    );
  }

  return (
    <form key={state.attempt} action={action} className="space-y-5" noValidate>
      {state.status === "error" && state.message && <Alert tone="danger" live>{state.message}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Your name" error={err("name")}>
          <Input {...fieldAria("name", err("name"))} name="name" defaultValue={v("name")} autoComplete="name" required maxLength={120} />
        </Field>
        <Field id="email" label="Email" error={err("email")}>
          <Input {...fieldAria("email", err("email"))} name="email" defaultValue={v("email")} type="email" autoComplete="email" required maxLength={254} />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="topic" label="Topic" error={err("topic")}>
          <Select {...fieldAria("topic", err("topic"))} name="topic" defaultValue={v("topic") ?? "tracking"} required>
            {CONTACT_TOPICS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </Field>
        <Field id="trackingNumber" label="Tracking number" optional error={err("trackingNumber")}>
          <Input
            {...fieldAria("trackingNumber", err("trackingNumber"))}
            name="trackingNumber"
            defaultValue={v("trackingNumber") ?? defaultTrackingNumber}
            autoComplete="off"
            className="font-mono"
            maxLength={60}
          />
        </Field>
      </div>
      <Field id="message" label="How can we help?" error={err("message")} hint="Please don't include card numbers or passwords.">
        <Textarea {...fieldAria("message", err("message"), true)} name="message" defaultValue={v("message")} required maxLength={4000} rows={6} />
      </Field>
      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">We use your details only to respond to this message. See our privacy policy.</p>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          {pending ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
