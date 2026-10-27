"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, fieldAria } from "@/components/ui/form";
import { CARRIER_PROVIDERS, PROVIDER_LABELS, type CarrierProviderId } from "@/domain/carriers";
import { countryNames } from "@/domain/countries";
import { PACKAGE_DESCRIPTIONS } from "@/domain/shipment-status";
import type { ActionState } from "@/server/actions/types";
import { idleState } from "@/server/actions/types";

const PAYMENT_MODES = ["Apple Pay", "Cash App", "Zelle", "PayPal", "Venmo", "Chime", "Credit / debit card", "Bank transfer", "Bitcoin", "Cash"];
const SHIPMENT_TYPES = ["Van Move", "Parcel", "Courier", "Freight", "Express"];
const COUNTRY_NAMES = countryNames();
const SHIPMENT_MODES = ["Land Shipping", "Air Freight", "Sea Freight", "Road Freight"];

export type ShipmentFormValues = Partial<Record<
  | "trackingNumber" | "serviceLevel" | "packageDescription" | "carrier" | "externalReference"
  | "originCity" | "originRegion" | "originCountry"
  | "destinationCity" | "destinationRegion" | "destinationCountry" | "destinationPostcode"
  | "shipperName" | "shipperEmail" | "shipperPhone" | "recipientName" | "recipientEmail" | "recipientPhone" | "internalNotes"
  | "paymentMode" | "pickupDate" | "pickupTime" | "departureTime" | "shipmentType" | "shipmentMode"
  | "product" | "quantity" | "weight" | "totalFreight" | "comments" | "estimatedDeliveryDate" | "estimateSource"
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

  const text = (
    name: keyof ShipmentFormValues,
    label: string,
    opts: {
      optional?: boolean;
      hint?: string;
      className?: string;
      max?: number;
      type?: string;
      placeholder?: string;
      /** Suggestions offered while typing; any other value is still allowed. */
      suggestions?: readonly string[];
    } = {},
  ) => (
    <Field id={name} label={label} optional={opts.optional ?? true} hint={opts.hint} error={err(name)} className={opts.className}>
      <Input
        {...fieldAria(name, err(name), !!opts.hint)}
        name={name}
        defaultValue={val(name)}
        maxLength={opts.max}
        type={opts.type ?? "text"}
        placeholder={opts.placeholder}
        list={opts.suggestions ? `${name}-suggestions` : undefined}
      />
      {opts.suggestions && (
        <datalist id={`${name}-suggestions`}>
          {opts.suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </Field>
  );

  return (
    <form key={state.attempt} action={formAction} className="space-y-8" noValidate>
      {state.status === "error" && state.message && <Alert tone="danger" live>{state.message}</Alert>}
      {state.status === "success" && state.message && <Alert tone="success" live>{state.message}</Alert>}

      {mode === "create" && (
        <fieldset className="min-w-0 space-y-4">
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
                placeholder: "e.g. 9400 1112 0206 2111 2233 44",
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

      <fieldset className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-bold tracking-wide text-navy-900 uppercase">Shipment</legend>
        {mode === "create" ? (
          text("trackingNumber", "Tracking number customers enter", {
            hint: carrierMode
              ? "Leave blank to use the carrier's number."
              : "Leave blank to generate a secure random number.",
            className: "sm:col-span-2",
            max: 40,
            placeholder: carrierMode ? "Leave blank to reuse the carrier number" : "Leave blank — a number like MP 4821 7730 1956 is created for you",
          })
        ) : null}
        {text("serviceLevel", "Service level", { max: 80, placeholder: "e.g. Standard, Express or Overnight" })}
        {text("packageDescription", "Package description", {
          max: 80,
          placeholder: "e.g. Discreet",
          hint: "Describes the package and its contents. Pick Discreet or type anything. Shown publicly.",
          suggestions: PACKAGE_DESCRIPTIONS,
        })}
        {text("carrier", "Carrier", { max: 80, hint: "Only if handed to a partner carrier.", placeholder: "e.g. DHL — leave blank if you deliver it" })}
        {text("externalReference", "External reference", {
          max: 120,
          placeholder: "e.g. Order #10482 or invoice INV-2291",
          hint: "Your own reference, to find the shipment later. Not shown to customers.",
        })}
      </fieldset>

      <fieldset className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-3">
        <legend className="mb-3 text-sm font-bold tracking-wide text-navy-900 uppercase">Origin (shown publicly)</legend>
        {text("originCity", "City", { max: 120, placeholder: "e.g. Brooklyn", hint: "Where the parcel starts. Spell the city in full so it shows on the map." })}
        {text("originRegion", "State / region", { max: 120, placeholder: "e.g. NY or New York" })}
        {text("originCountry", "Country", { max: 80, hint: "Full name or code, e.g. United States or US", placeholder: "e.g. United States", suggestions: COUNTRY_NAMES })}
      </fieldset>

      <fieldset className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-3">
        <legend className="mb-3 text-sm font-bold tracking-wide text-navy-900 uppercase">Destination</legend>
        {text("destinationCity", "City (public)", { max: 120, placeholder: "e.g. Austin", hint: "Where it's going. Shown on the map as the destination." })}
        {text("destinationRegion", "State / region (public)", { max: 120, placeholder: "e.g. TX or Texas" })}
        {text("destinationCountry", "Country (public)", { max: 80, hint: "Full name or code, e.g. United Arab Emirates or AE", placeholder: "e.g. United Arab Emirates", suggestions: COUNTRY_NAMES })}
        {text("destinationPostcode", "Postcode (private)", { max: 20, placeholder: "e.g. 78701", hint: "Staff only — never shown publicly." })}
      </fieldset>

      <fieldset className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-3">
        <legend className="mb-3 text-sm font-bold tracking-wide text-navy-900 uppercase">Shipper &amp; receiver (shown publicly)</legend>
        {text("shipperName", "Shipper name", { max: 160, placeholder: "e.g. Acme Store" })}
        {text("shipperEmail", "Shipper email", { max: 254, type: "email", placeholder: "e.g. orders@acme.com" })}
        {text("shipperPhone", "Shipper phone", { max: 40, type: "tel", placeholder: "e.g. +1 512 555 0142" })}
        {text("recipientName", "Receiver name", { max: 160, placeholder: "e.g. Jane Smith" })}
        {text("recipientEmail", "Receiver email", { max: 254, type: "email", placeholder: "e.g. jane@example.com" })}
        {text("recipientPhone", "Receiver phone", { max: 40, type: "tel", placeholder: "e.g. +1 318 555 0199" })}
      </fieldset>

      <fieldset className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-3">
        <legend className="mb-3 text-sm font-bold tracking-wide text-navy-900 uppercase">Shipment information (shown publicly)</legend>
        {text("paymentMode", "Payment mode", { max: 80, placeholder: "e.g. Apple Pay", suggestions: PAYMENT_MODES })}
        {text("pickupDate", "Pick-up date", { type: "date" })}
        {text("pickupTime", "Pick-up time", { type: "time" })}
        {text("departureTime", "Departure time", { type: "time" })}
        {text("shipmentType", "Type of shipment", { max: 80, placeholder: "e.g. Van Move", suggestions: SHIPMENT_TYPES })}
        {text("shipmentMode", "Shipment mode", { max: 80, placeholder: "e.g. Land Shipping", suggestions: SHIPMENT_MODES })}
        {text("product", "Product", { max: 120, placeholder: "e.g. Discreet" })}
        {text("quantity", "Qty", { max: 40, placeholder: "e.g. 1 or Discreet" })}
        {text("weight", "Weight", { max: 40, placeholder: "e.g. 2 kg or Discreet" })}
        {text("totalFreight", "Total freight", { max: 40, placeholder: "e.g. 1" })}
        <Field id="comments" label="Comments" optional error={err("comments")} className="sm:col-span-3">
          <Textarea
            {...fieldAria("comments", err("comments"))}
            name="comments"
            defaultValue={val("comments")}
            maxLength={1000}
            rows={2}
            placeholder="e.g. This package has been registered for shipment as a discreet package"
          />
        </Field>
      </fieldset>

      {carrierMode || carrierTracked ? (
        <p className="rounded-md bg-surface px-4 py-3 text-sm text-muted">
          Status, delivery estimate and any blank origin/destination fields are filled in from the carrier on each sync.
        </p>
      ) : (
        <fieldset className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
          <legend className="mb-3 text-sm font-bold tracking-wide text-navy-900 uppercase">Delivery estimate</legend>
          {text("estimatedDeliveryDate", "Estimated delivery date", { type: "date", hint: "Leave blank if you don't know yet." })}
          {text("estimateSource", "Source of estimate", {
            max: 120,
            placeholder: "e.g. 2-day service standard",
            hint: "Required with a date, so customers know where it comes from.",
          })}
        </fieldset>
      )}

      <Field id="internalNotes" label="Internal notes (private)" optional error={err("internalNotes")}>
        <Textarea
          {...fieldAria("internalNotes", err("internalNotes"))}
          name="internalNotes"
          defaultValue={val("internalNotes")}
          maxLength={4000}
          rows={3}
          placeholder="Staff only — e.g. fragile, call the recipient before delivery"
        />
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
