"use client";

import { CheckCircle2, Loader2, Search } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { lookupCityByZip, lookupZipByAddress, type ZipLookupResult } from "@/server/actions/zip-lookup";

type Mode = "address" | "zip";

const initialState: ZipLookupResult | null = null;

function Result({ r }: { r: ZipLookupResult | null }) {
  if (!r) return null;
  if (r.kind === "rate_limited") return <Alert tone="warning" live>Too many lookups — please wait a moment and try again.</Alert>;
  if (r.kind === "error") return <Alert tone="danger" live>{r.message}</Alert>;
  if (r.kind === "not_found") return <Alert tone="warning" live>{r.message}</Alert>;

  if (r.kind === "address_result") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" aria-hidden />
        <div>
          <p className="font-semibold text-green-900">ZIP Code found</p>
          <p className="mt-1 text-2xl font-mono font-bold text-green-800">
            {r.zip5}{r.zip4 ? `-${r.zip4}` : ""}
          </p>
          <p className="mt-1 text-sm text-green-700">{r.city}, {r.state}</p>
        </div>
      </div>
    );
  }

  if (r.kind === "zip_result") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" aria-hidden />
        <div>
          <p className="font-semibold text-green-900">Location found</p>
          <p className="mt-1 text-2xl font-semibold text-green-800">{r.city}, {r.state}</p>
          <p className="mt-1 font-mono text-sm text-green-700">ZIP {r.zip}</p>
        </div>
      </div>
    );
  }
  return null;
}

export function ZipLookupForm() {
  const [mode, setMode] = useState<Mode>("address");
  const [addrState, addrAction, addrPending] = useActionState(lookupZipByAddress, initialState);
  const [zipState, zipAction, zipPending] = useActionState(lookupCityByZip, initialState);

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("address")}
          className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
            mode === "address"
              ? "border-usps-blue bg-usps-blue text-white"
              : "border-line text-muted hover:border-navy-400 hover:text-ink"
          }`}
        >
          Address → ZIP
        </button>
        <button
          type="button"
          onClick={() => setMode("zip")}
          className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
            mode === "zip"
              ? "border-usps-blue bg-usps-blue text-white"
              : "border-line text-muted hover:border-navy-400 hover:text-ink"
          }`}
        >
          ZIP → City
        </button>
      </div>

      {mode === "address" && (
        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 text-base font-semibold text-navy-900">Find the ZIP code for an address</h2>
          <form action={addrAction} className="space-y-4">
            <Field id="street" label="Street address">
              <Input id="street" name="street" type="text" autoComplete="street-address" maxLength={200} placeholder="1600 Pennsylvania Ave NW" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="city" label="City">
                <Input id="city" name="city" type="text" autoComplete="address-level2" maxLength={100} placeholder="Washington" />
              </Field>
              <Field id="state" label="State">
                <Input id="state" name="state" type="text" autoComplete="address-level1" maxLength={100} placeholder="DC" />
              </Field>
            </div>
            <Button type="submit" disabled={addrPending}>
              {addrPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
              {addrPending ? "Looking up…" : "Find ZIP code"}
            </Button>
          </form>
          {addrState && <div className="mt-4"><Result r={addrState} /></div>}
        </Card>
      )}

      {mode === "zip" && (
        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 text-base font-semibold text-navy-900">Find the city for a ZIP code</h2>
          <form action={zipAction} className="space-y-4">
            <Field id="zip" label="ZIP code">
              <Input id="zip" name="zip" type="text" inputMode="numeric" maxLength={5} placeholder="20500" className="font-mono" />
            </Field>
            <Button type="submit" disabled={zipPending}>
              {zipPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
              {zipPending ? "Looking up…" : "Find city"}
            </Button>
          </form>
          {zipState && <div className="mt-4"><Result r={zipState} /></div>}
        </Card>
      )}
    </div>
  );
}
