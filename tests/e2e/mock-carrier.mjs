/**
 * Stand-in for the USPS Tracking API during e2e runs (USPS_API_BASE points here). Responses follow the
 * documented v3 shape. Numbers ending in 0000 are "not found".
 */
import http from "node:http";

const port = Number(process.env.MOCK_CARRIER_PORT ?? 4010);
const event = (eventType, local, gmt, offset, city, state) => ({
  eventType, eventTimestamp: local, GMTTimestamp: gmt, GMTOffset: offset, eventCity: city, eventState: state, eventCountry: "",
});

http
  .createServer((req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (req.url === "/health") return send(200, { ok: true });
    if (req.url === "/oauth2/v3/token" && req.method === "POST") return send(200, { access_token: "e2e-token", expires_in: 28800 });
    const m = /^\/tracking\/v3\/tracking\/(\w+)/.exec(req.url ?? "");
    if (!m) return send(404, {});
    if (req.headers.authorization !== "Bearer e2e-token") return send(401, {});
    if (m[1].endsWith("0000")) return send(404, { error: { message: "Tracking number not found" } });
    send(200, {
      trackingNumber: m[1],
      mailClass: "USPS Ground Advantage",
      status: "Out for Delivery",
      statusSummary: "Your item is out for delivery in AUSTIN, TX 78701.",
      originCity: "BROOKLYN", originState: "NY", destinationCity: "AUSTIN", destinationState: "TX",
      expectedDeliveryTimeStamp: "2026-10-17T20:00:00Z",
      trackingEvents: [
        event("Out for Delivery", "2026-10-16T07:10:00", "2026-10-16T12:10:00Z", "-05:00", "AUSTIN", "TX"),
        event("Arrived at USPS Regional Facility", "2026-10-14T21:40:00", "2026-10-15T02:40:00Z", "-05:00", "AUSTIN TX DISTRIBUTION CENTER", ""),
        event("Shipping Label Created, USPS Awaiting Item", "2026-10-12T09:00:00", "2026-10-12T13:00:00Z", "-04:00", "BROOKLYN", "NY"),
      ],
    });
  })
  .listen(port, "127.0.0.1");
