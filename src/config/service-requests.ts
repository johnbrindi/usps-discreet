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

export type ServiceRequestType =
  | "QUOTE"
  | "PICKUP"
  | "SHIPPING"
  | "ADDRESS_CHANGE"
  | "CLAIM"
  | "STAMPS"
  | "PO_BOX"
  | "HOLD_MAIL"
  | "SUPPLIES"
  | "REDELIVERY"
  | "CUSTOMS";

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

export type ToolIcon =
  | "track"
  | "quote"
  | "pickup"
  | "ship"
  | "address"
  | "claim"
  | "stamps"
  | "pobox"
  | "holdmail"
  | "supplies"
  | "redelivery"
  | "customs";

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

  // ── New tools ──────────────────────────────────────────────────────────
  {
    type: "STAMPS",
    slug: "stamps",
    label: "Buy Stamps",
    title: "Order stamps",
    summary: "Order Forever® stamps, postcard stamps, collector sets and stamped envelopes — delivered to you.",
    nextSteps: "Our team reviews your order and contacts you about payment and delivery, usually within one business day.",
    icon: "stamps",
    referencePrefix: "ST",
    sections: [
      {
        title: "Your order",
        fields: [
          {
            name: "item",
            label: "Item / collection",
            kind: "select",
            span: 3,
            options: [
              { value: "forever_stamps", label: "Forever® stamps (book of 20)" },
              { value: "postcard_stamps", label: "Postcard stamps (book of 20)" },
              { value: "collector_set", label: "Collector set" },
              { value: "stamped_envelopes", label: "Stamped envelopes" },
              { value: "gifts", label: "Gift / collectible" },
              { value: "cards_envelopes", label: "Cards & envelopes" },
            ],
          },
          { name: "quantity", label: "Quantity", kind: "number", span: 3, min: 1, max: 100, step: 1 },
        ],
      },
      { title: "Delivery address", fields: address("delivery", { withName: true }) },
    ],
  },
  {
    type: "PO_BOX",
    slug: "po-box",
    label: "PO Box Inquiry",
    title: "PO Box inquiry",
    summary: "Ask about available PO Box sizes and locations nearest to you.",
    nextSteps: "We check availability and email you options, pricing and the next steps to reserve your box.",
    icon: "pobox",
    referencePrefix: "PB",
    sections: [
      {
        title: "Box details",
        fields: [
          {
            name: "size",
            label: "Preferred box size",
            kind: "select",
            span: 3,
            options: [
              { value: "xs", label: "Extra small (envelopes only)" },
              { value: "sm", label: "Small (magazines / flats)" },
              { value: "md", label: "Medium (standard packages)" },
              { value: "lg", label: "Large (large packages)" },
            ],
          },
          { name: "locationZip", label: "Nearest ZIP code", kind: "text", span: 3, maxLength: 10 },
          { name: "startDate", label: "Desired start date", kind: "date", span: 3 },
        ],
      },
    ],
  },
  {
    type: "HOLD_MAIL",
    slug: "hold-mail",
    label: "Hold Mail",
    title: "Hold mail request",
    summary: "Pause delivery while you are away — we keep your mail safe and deliver it when you are back.",
    nextSteps: "We confirm the hold dates by email and pause delivery from your start date.",
    icon: "holdmail",
    referencePrefix: "HM",
    sections: [
      { title: "Delivery address", fields: address("hold") },
      {
        title: "Hold dates",
        fields: [
          { name: "startDate", label: "Start date", kind: "date", span: 3, hint: "First day we hold your mail." },
          { name: "endDate", label: "End date", kind: "date", span: 3, hint: "Last day of the hold (max 30 days after start)." },
        ],
      },
    ],
  },
  {
    type: "SUPPLIES",
    slug: "supplies",
    label: "Order Supplies",
    title: "Order shipping supplies",
    summary: "Order boxes, envelopes and labels — many are free.",
    nextSteps: "We process your request and ship the supplies to your address, usually within 2–3 business days.",
    icon: "supplies",
    referencePrefix: "SP",
    sections: [
      {
        title: "Items",
        fields: [
          {
            name: "item",
            label: "Supply type",
            kind: "select",
            span: 3,
            options: [
              { value: "priority_box_sm", label: "Priority Mail® box (small)" },
              { value: "priority_box_md", label: "Priority Mail® box (medium)" },
              { value: "priority_box_lg", label: "Priority Mail® box (large)" },
              { value: "priority_envelope", label: "Priority Mail® flat-rate envelope" },
              { value: "shipping_label", label: "Shipping labels" },
              { value: "bubble_mailer", label: "Bubble mailers" },
            ],
          },
          { name: "quantity", label: "Quantity", kind: "number", span: 3, min: 1, max: 50, step: 1 },
          { name: "notes", label: "Special requests", kind: "textarea", optional: true, maxLength: 400 },
        ],
      },
      { title: "Delivery address", fields: address("delivery", { withName: true }) },
    ],
  },
  {
    type: "REDELIVERY",
    slug: "redelivery",
    label: "Schedule Redelivery",
    title: "Schedule a redelivery",
    summary: "Missed a delivery? Pick a new date and we will bring it back.",
    nextSteps: "We schedule the redelivery and email a confirmation. Check the tracking page for the updated delivery date.",
    icon: "redelivery",
    referencePrefix: "RD",
    sections: [
      {
        title: "Parcel",
        fields: [
          {
            name: "trackingNumber",
            label: "Tracking number",
            kind: "tracking",
            span: 3,
            hint: "From your missed-delivery notice.",
          },
          { name: "preferredDate", label: "Preferred redelivery date", kind: "date", span: 3, hint: "Monday–Friday, at least one day ahead." },
        ],
      },
    ],
  },
  {
    type: "CUSTOMS",
    slug: "customs",
    label: "Customs / HS Code Help",
    title: "Customs & HS code help",
    summary: "Need help completing customs forms or finding the right Harmonized System code for your shipment?",
    nextSteps: "Our team responds with the correct form and code guidance, usually within one business day.",
    icon: "customs",
    referencePrefix: "CU",
    sections: [
      {
        title: "Shipment details",
        fields: [
          { name: "destinationCountry", label: "Destination country", kind: "text", span: 3, maxLength: 60 },
          { name: "itemDescription", label: "Item description", kind: "text", span: 3, maxLength: 200 },
          {
            name: "helpType",
            label: "I need help with",
            kind: "select",
            span: 3,
            options: [
              { value: "hs_code", label: "Finding an HS / tariff code" },
              { value: "customs_form", label: "Completing a customs declaration" },
              { value: "eu_vat", label: "EU VAT & import duties" },
              { value: "other", label: "Something else" },
            ],
          },
          { name: "details", label: "Additional details", kind: "textarea", optional: true, maxLength: 1000 },
        ],
      },
    ],
  },
];

export function toolBySlug(slug: string) {
  return TOOLS.find((t) => t.slug === slug);
}

export function toolByType(type: ServiceRequestType) {
  const t = TOOLS.find((t) => t.type === type);
  // Graceful fallback so unknown types don't crash admin pages
  if (!t) throw new Error(`Unknown ServiceRequestType: ${type}`);
  return t;
}

export const REQUEST_STATUS_LABEL = { NEW: "New", IN_PROGRESS: "In progress", CLOSED: "Closed" } as const;
