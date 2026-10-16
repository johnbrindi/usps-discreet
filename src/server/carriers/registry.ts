import "server-only";
import { CARRIER_PROVIDERS, type CarrierProviderId } from "@/domain/carriers";
import { serverEnv } from "@/lib/env";
import { createDhlClient } from "./dhl";
import { createShip24Client } from "./ship24";
import { createTrackingMoreClient } from "./trackingmore";
import type { CarrierClient } from "./types";
import { createUspsClient } from "./usps";

let clients: Partial<Record<CarrierProviderId, CarrierClient>> | undefined;

/** Clients for every provider whose credentials are configured. Built once per server instance. */
function configured() {
  if (clients) return clients;
  const env = serverEnv();
  clients = {};
  if (env.USPS_CLIENT_ID && env.USPS_CLIENT_SECRET) {
    clients.usps = createUspsClient({ clientId: env.USPS_CLIENT_ID, clientSecret: env.USPS_CLIENT_SECRET, baseUrl: env.USPS_API_BASE });
  }
  if (env.DHL_API_KEY) clients.dhl = createDhlClient({ apiKey: env.DHL_API_KEY });
  if (env.SHIP24_API_KEY) clients.ship24 = createShip24Client({ apiKey: env.SHIP24_API_KEY });
  if (env.TRACKINGMORE_API_KEY) clients.trackingmore = createTrackingMoreClient({ apiKey: env.TRACKINGMORE_API_KEY });
  return clients;
}

export function getCarrierClient(id: string | null | undefined): CarrierClient | undefined {
  return id && (CARRIER_PROVIDERS as readonly string[]).includes(id) ? configured()[id as CarrierProviderId] : undefined;
}

export function configuredProviders(): CarrierProviderId[] {
  return CARRIER_PROVIDERS.filter((id) => configured()[id]);
}
