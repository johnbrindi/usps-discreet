/** Runs once when a server instance starts. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Load the route-map place list in the background so the first tracking page doesn't pay for it (~250 ms).
  const { places } = await import("@/server/geo/places");
  setTimeout(() => {
    try {
      places();
    } catch {
      /* the page loads it on demand instead */
    }
  }, 0);
}
