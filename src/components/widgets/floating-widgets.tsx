import { siteConfig, whatsappUrl } from "@/config/site";
import { describeSupportHours } from "@/lib/support-hours";
import { ChatWidget } from "./chat-widget";
import { WhatsAppIcon } from "./whatsapp-icon";

/**
 * Fixed support launchers, bottom-right. Chat (upper) and WhatsApp (lower) share one
 * container so spacing, safe-area insets and z-index are defined in one place.
 */
export function FloatingWidgets() {
  return (
    <div
      className="pointer-events-none fixed flex flex-col items-end"
      style={{ right: "var(--fab-right)", bottom: "var(--fab-bottom)", gap: "var(--fab-gap)", zIndex: "var(--z-fab)" }}
    >
      <ChatWidget agentName={siteConfig.chatAgentName} hoursLabel={describeSupportHours()} />
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Contact us on WhatsApp (${siteConfig.whatsappDisplay}, opens in a new tab)`}
        className="group pointer-events-auto relative inline-flex items-center justify-center rounded-full bg-whatsapp text-white shadow-float transition-colors hover:bg-whatsapp-dark active:bg-whatsapp-dark focus-visible:outline-offset-4"
        style={{ width: "var(--fab-size)", height: "var(--fab-size)" }}
      >
        <WhatsAppIcon className="size-7" />
        <FabTooltip>Contact us on WhatsApp</FabTooltip>
      </a>
    </div>
  );
}

export function FabTooltip({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute right-full mr-3 hidden rounded-md bg-navy-950 px-2.5 py-1.5 text-sm font-semibold whitespace-nowrap text-white opacity-0 shadow-float transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:block"
    >
      {children}
    </span>
  );
}
