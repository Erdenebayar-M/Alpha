// Dev and production are both on Neon, so the provider can't tell them apart:
// production is recognised by its compute endpoint instead. On Neon that is the
// endpoint id (`ep-…`, the first DNS label), which every hostname for the
// endpoint carries — pooled ("-pooler"), direct, with or without a cell label.
// Elsewhere it is host and port. Database name and credentials are ignored on
// purpose: a second database on production's endpoint is still production's
// compute.

const NEON_ENDPOINT_RE = /^(ep-[a-z0-9-]+?)(?:-pooler)?$/;

function endpointOf(url: string, label: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${label} is not a valid database URL`);
  }
  const host = parsed.hostname.toLowerCase();
  if (!host) throw new Error(`${label} has no host`);
  const neon = NEON_ENDPOINT_RE.exec(host.split(".")[0]);
  if (neon) return neon[1];
  return `${host}:${parsed.port || "5432"}`;
}

/** Throws unless `targetUrl` is on a different database endpoint than
 *  `productionUrl`. Missing or unparseable URLs throw too: never guess. */
export function assertNotProduction(targetUrl: string, productionUrl: string): void {
  const target = endpointOf(targetUrl, "Target database URL");
  const production = endpointOf(productionUrl, "Production database URL");
  if (target === production) {
    throw new Error(
      `Refusing to write: the target database (${target}) is the production database`,
    );
  }
}
