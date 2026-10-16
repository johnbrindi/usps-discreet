/**
 * Quick tools (/tools/[slug]). Each tool is a real service request: the customer submits a form, it is
 * stored in `service_requests` with a reference number, and staff handle it in /admin/requests.
 *
 * Field definitions here drive three things, so they can't drift apart:
 *   - the public form (components/forms/service-request-form.tsx)
 *   - server-side validation (validation/service-request.ts)
 *   - the admin detail view (app/admin/(console)/requests)
 *
 * Client-safe: no server imports.
 */

export type ServiceRequestType = "QUOTE" | "PICKUP" | "SHIPPING" | "ADDRESS_CHANGE" | "CLAIM";

export type FieldDef = {
  name: string;
  label: string;
  kind: "text" | "email" | "tel" | "number" | "date" | "select" | "textarea" | "tracking";
  optional?: boolean;
  hint?: string;
  placeholder?: string;
  options?: readonly { value: string; label: string }[];
  /** Columns out of 6 on ≥640px. Defaults to 6 (full width). */
  span?: 2 | 3 | 4 | 6;
  autoComplete?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
};

export type ToolIcon = "track" | "quote" | "pickup" | "ship" | "address" | "claim";

export type SectionDef = { title: string; description?: string; fields: FieldDef[] };

export type ToolDef = {
  type: ServiceRequestType;
  slug: string;
  /** Short label for tiles, nav and footer. */
  label: string;
  title: string;
  summary: string;
  /** What happens after submitting — shown on the form page and the confirmation. */
  nextSteps: string;
  icon: ToolIcon;
  referencePrefix: string;
  sections: SectionDef[];
};

const WEIGHT_UNITS = [
  { value: "kg", label: "kg" },
  { value: "lb", label: "lb" },
] as const;
const DIM_UNITS = [
  { value: "cm", label: "cm" },
  { value: "in", label: "in" },
] as const;
const SERVICES = [
  { value: "standard", label: "Standard (3–5 business days)" },
  { value: "express", label: "Express (1–2 business days)" },
] as const;

function address(prefix: string, opts: { withName?: boolean } = {}): FieldDef[] {
  return [
    ...(opts.withName
      ? [{ name: `${prefix}Name`, label: "Full name", kind: "text", autoComplete: "name", maxLength: 120 } as FieldDef]
      : []),
    { name: `${prefix}Line1`, label: "Street address", kind: "text", autoComplete: "address-line1", maxLength: 160 },
    {
      name: `${prefix}Line2`,
      label: "Apartment, suite, unit",
      kind: "text",
      optional: true,
      autoComplete: "address-line2",
      maxLength: 160,
    },
    { name: `${prefix}City`, label: "City", kind: "text", span: 2, autoComplete: "address-level2", maxLength: 120 },
    { name: `${prefix}Region`, label: "State / region", kind: "text", span: 2, autoComplete: "address-level1", maxLength: 120 },
    { name: `${prefix}Postcode`, label: "ZIP / postcode", kind: "text", span: 2, autoComplete: "postal-code", maxLength: 20 },
    { name: `${prefix}Country`, label: "Country", kind: "text", autoComplete: "country-name", maxLength: 60 },
  ];
}

const parcelFields: FieldDef[] = [
  { name: "weight", label: "Weight", kind: "number", span: 4, min: 0.01, max: 1000, step: 0.01 },
  { name: "weightUnit", label: "Unit", kind: "select", span: 2, options: WEIGHT_UNITS },
  { name: "length", label: "Length", kind: "number", span: 2, min: 0.1, max: 500, step: 0.1 },
  { name: "width", label: "Width", kind: "number", span: 2, min: 0.1, max: 500, step: 0.1 },
  { name: "height", label: "Height", kind: "number", span: 2, min: 0.1, max: 500, step: 0.1 },
  { name: "dimUnit", label: "Dimension unit", kind: "select", span: 2, options: DIM_UNITS },
  { name: "service", label: "Service", kind: "select", span: 4, options: SERVICES },
];

/** Contact fields shared by every tool; stored in dedicated columns rather than `details`. */
export const contactSection: SectionDef = {
  title: "Your details",
  description: "We'll send updates about this request to this email address.",
  fields: [
    { name: "name", label: "Full name", kind: "text", span: 3, autoComplete: "name", maxLength: 120 },
    { name: "email", label: "Email", kind: "email", span: 3, autoComplete: "email", maxLength: 254 },
    { name: "phone", label: "Phone", kind: "tel", optional: true, span: 3, autoComplete: "tel", maxLength: 40 },
  ],
};

export const TOOLS: readonly ToolDef[] = [
  {
    type: "QUOTE",
    slug: "price",
    label: "Get a Price Quote",
    title: "Get a price quote",
    summary: "Tell us where your parcel is going and how big it is, and we'll send you an exact price.",
    nextSteps: "Our team prices your shipment and emails the quote, usually within one business day.",
    icon: "quote",
    referencePrefix: "QT",
    sections: [
      {
        title: "Route",
        fields: [
          { name: "fromPostcode", label: "From ZIP / postcode", kind: "text", span: 3, maxLength: 20 },
          { name: "fromCountry", label: "From country", kind: "text", span: 3, maxLength: 60 },
          { name: "toPostcode", label: "To ZIP / postcode", kind: "text", span: 3, maxLength: 20 },
          { name: "toCountry", label: "To country", kind: "text", span: 3, maxLength: 60 },
        ],
      },
      {
        title: "Parcel",
        fields: [
          ...parcelFields,
          { name: "contents", label: "Contents", kind: "text", optional: true, maxLength: 200, hint: "Helps us check for restricted items." },
        ],
      },
    ],
  },
  {
    type: "PICKUP",
    slug: "pickup",
    label: "Schedule a Pickup",
    title: "Schedule a pickup",
    summary: "Book a courier to collect parcels from your home or business.",
    nextSteps: "We confirm the pickup slot by email. Please have parcels labelled and ready at the address.",
    icon: "pickup",
    referencePrefix: "PU",
    sections: [
      { title: "Pickup address", fields: address("pickup") },
      {
        title: "Pickup details",
        fields: [
          {
            name: "pickupDate",
            label: "Pickup date",
            kind: "date",
            span: 3,
            hint: "Monday–Friday, from tomorrow up to 30 days ahead.",
          },
          {
            name: "timeWindow",
            label: "Time window",
            kind: "select",
            span: 3,
            options: [
              { value: "morning", label: "Morning (8 am – 12 pm)" },
              { value: "afternoon", label: "Afternoon (12 pm – 5 pm)" },
            ],
          },
          { name: "parcelCount", label: "Number of parcels", kind: "number", span: 2, min: 1, max: 50, step: 1 },
          { name: "totalWeight", label: "Total weight", kind: "number", span: 2, min: 0.01, max: 2000, step: 0.01 },
          { name: "weightUnit", label: "Unit", kind: "select", span: 2, options: WEIGHT_UNITS },
          {
            name: "instructions",
            label: "Instructions for the courier",
            kind: "textarea",
            optional: true,
            maxLength: 1000,
            placeholder: "Gate code, where parcels will be left, etc.",
          },
        ],
      },
    ],
  },
  {
    type: "SHIPPING",
    slug: "ship",
    label: "Ship a Parcel",
    title: "Ship a parcel",
    summary: "Book a shipment online. We create the label and tracking number for you.",
    nextSteps: "We review the booking, email your shipping label and tracking number, and confirm the price.",
    icon: "ship",
    referencePrefix: "SH",
    sections: [
      { title: "Sender", fields: address("from") },
      { title: "Recipient", fields: address("to", { withName: true }) },
      {
        title: "Parcel",
        fields: [
          ...parcelFields,
          { name: "contents", label: "Contents", kind: "text", maxLength: 200 },
          {
            name: "declaredValue",
            label: "Declared value (USD)",
            kind: "number",
            optional: true,
            span: 3,
            min: 0,
            max: 100000,
            step: 0.01,
          },
        ],
      },
    ],
  },
  {
    type: "ADDRESS_CHANGE",
    slug: "change-address",
    label: "Change Delivery Address",
    title: "Change a delivery address",
    summary: "Redirect a parcel that hasn't been delivered yet to a new address.",
    nextSteps:
      "We check whether the parcel can still be redirected and email you the outcome. The tracking page updates once it's rerouted.",
    icon: "address",
    referencePrefix: "AC",
    sections: [
      {
        title: "Parcel",
        fields: [
          {
            name: "trackingNumber",
            label: "Tracking number",
            kind: "tracking",
            hint: "Parcels that are already delivered or returned can't be redirected.",
          },
        ],
      },
      { title: "New delivery address", fields: address("new", { withName: true }) },
      {
        title: "Anything else?",
        fields: [{ name: "reason", label: "Reason for the change", kind: "textarea", optional: true, maxLength: 1000 }],
      },
    ],
  },
  {
    type: "CLAIM",
    slug: "claim",
    label: "File a Claim",
    title: "File a claim",
    summary: "Report a parcel that was lost, damaged, delayed or arrived with items missing.",
    nextSteps:
      "A claims specialist reviews your case and emails you within two business days. Keep the packaging and any damaged items until the claim is settled.",
    icon: "claim",
    referencePrefix: "CL",
    sections: [
      {
        title: "Parcel",
        fields: [
          { name: "trackingNumber", label: "Tracking number", kind: "tracking", span: 3 },
          {
            name: "claimType",
            label: "What happened?",
            kind: "select",
            span: 3,
            options: [
              { value: "lost", label: "Parcel lost" },
              { value: "damaged", label: "Parcel or contents damaged" },
              { value: "missing_contents", label: "Items missing from parcel" },
              { value: "delayed", label: "Delivery significantly delayed" },
            ],
          },
          { name: "itemDescription", label: "Item description", kind: "text", span: 4, maxLength: 200 },
          { name: "declaredValue", label: "Value (USD)", kind: "number", span: 2, min: 0, max: 100000, step: 0.01 },
          {
            name: "incidentDetails",
            label: "Describe the problem",
            kind: "textarea",
            maxLength: 3000,
            hint: "Include the condition of the packaging and when you noticed the issue.",
          },
        ],
      },
    ],
  },
];

export function toolBySlug(slug: string) {
  return TOOLS.find((t) => t.slug === slug);
}

export function toolByType(type: ServiceRequestType) {
  return TOOLS.find((t) => t.type === type)!;
}

export const REQUEST_STATUS_LABEL = { NEW: "New", IN_PROGRESS: "In progress", CLOSED: "Closed" } as const;
