"use client";

import { CheckCircle2, Copy, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input, Select, Textarea, fieldAria } from "@/components/ui/form";
import { contactSection, toolBySlug, type FieldDef } from "@/config/service-requests";
import { cn } from "@/lib/utils";
import { submitServiceRequest, type ServiceRequestState } from "@/server/actions/service-requests";

const SPAN: Record<number, string> = { 2: "sm:col-span-2", 3: "sm:col-span-3", 4: "sm:col-span-4", 6: "sm:col-span-6" };
const initial: ServiceRequestState = { status: "idle" };

function Control({ f, error, value }: { f: FieldDef; error?: string; value?: string }) {
  const aria = fieldAria(f.name, error, Boolean(f.hint));
  const common = { ...aria, name: f.name, defaultValue: value, required: !f.optional, autoComplete: f.autoComplete ?? "off" };
  switch (f.kind) {
    case "select":
      return (
        <Select {...common} defaultValue={value ?? f.options?.[0]?.value}>
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      );
    case "textarea":
      return <Textarea {...common} rows={4} maxLength={f.maxLength} placeholder={f.placeholder} />;
    case "number":
      return <Input {...common} type="number" inputMode="decimal" min={f.min} max={f.max} step={f.step ?? "any"} />;
    case "tracking":
      return <Input {...common} className="font-mono" maxLength={60} placeholder="e.g. MP 1234 5678 9012 3456 7890" />;
    default:
      return <Input {...common} type={f.kind} maxLength={f.maxLength} placeholder={f.placeholder} />;
  }
}

export function ServiceRequestForm({ slug, defaultTrackingNumber = "" }: { slug: string; defaultTrackingNumber?: string }) {
  const tool = toolBySlug(slug)!;
  const [state, action, pending] = useActionState(submitServiceRequest.bind(null, slug), initial);
  const [copied, setCopied] = useState(false);
  const err = (k: string) => state.fieldErrors?.[k]?.[0];
  const val = (k: string) => state.values?.[k] ?? (k === "trackingNumber" && defaultTrackingNumber ? defaultTrackingNumber : undefined);

  if (state.status === "success" && state.reference) {
    return (
      <div role="status" className="py-4 text-center sm:py-8">
        <CheckCircle2 className="mx-auto size-10 text-success-700" aria-hidden />
        <h2 className="mt-4 text-xl font-semibold text-navy-900">Request received</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{tool.nextSteps}</p>
        <div className="mx-auto mt-6 inline-flex items-center gap-3 rounded-lg border border-line bg-slate-50 px-4 py-3">
          <div className="text-left">
            <p className="text-xs font-medium text-muted">Your reference</p>
            <p className="font-mono text-lg font-semibold tracking-wide text-navy-900">{state.reference}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(state.reference!).then(() => setCopied(true));
            }}
            className={buttonClasses("ghost", "sm")}
          >
            <Copy className="size-4" aria-hidden />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">Quote this reference if you contact us about this request.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/tools" className={buttonClasses("secondary")}>All tools</Link>
          <Link href="/track" className={buttonClasses("primary")}>Track a parcel</Link>
        </div>
      </div>
    );
  }

  const sections = [...tool.sections, contactSection];
  return (
    <form key={state.attempt} action={action} className="space-y-8" noValidate>
      {state.status === "error" && state.message && <Alert tone="danger" live>{state.message}</Alert>}
      {sections.map((section, i) => (
        <fieldset key={section.title} className={cn(i > 0 && "border-t border-line pt-8")}>
          <legend className="text-base font-semibold text-navy-900">{section.title}</legend>
          {section.description && <p className="mt-1 text-sm text-muted">{section.description}</p>}
          <div className="mt-4 grid gap-x-4 gap-y-5 sm:grid-cols-6">
            {section.fields.map((f) => (
              <Field
                key={f.name}
                id={f.name}
                label={f.label}
                optional={f.optional}
                hint={f.hint}
                error={err(f.name)}
                className={SPAN[f.span ?? 6]}
              >
                <Control f={f} error={err(f.name)} value={val(f.name)} />
              </Field>
            ))}
          </div>
        </fieldset>
      ))}
      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="flex flex-col-reverse items-start gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          We use these details only to handle this request. See our{" "}
          <Link href="/privacy" className="underline underline-offset-2">privacy policy</Link>.
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          {pending ? "Submitting…" : "Submit request"}
        </Button>
      </div>
    </form>
  );
}
