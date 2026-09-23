export interface GeoEstimateInput {
  lat: number;
  lng: number;
  radiusMiles: number;
  zip?: string;
}

export interface GeoEstimate {
  households: number;
  carrierRoutes: number;
  zipCodes: string[];
  densityPerSqMi: number;
  source: "simulated";
}

function hash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Deterministic pseudo-random in [0,1) for a seed string. */
function seeded(seed: string): number {
  return (hash32(seed) % 100000) / 100000;
}

/**
 * Deterministic EDDM-style audience estimate. Real carrier-route counts come
 * from the USPS EDDM tool; this simulation keys off the rounded pin location
 * so the same target always yields the same numbers.
 */
export function estimateEddmAudience(input: GeoEstimateInput): GeoEstimate {
  const seedKey = `${input.lat.toFixed(2)}:${input.lng.toFixed(2)}:${(input.zip ?? "").trim()}`;
  const r = seeded(seedKey);
  const areaSqMi = Math.PI * input.radiusMiles * input.radiusMiles;
  // Suburban-to-urban density band: 150 – 1,900 households per square mile.
  const densityPerSqMi = Math.round(150 + r * 1750);
  const households = Math.min(
    250000,
    Math.max(120, Math.round(areaSqMi * densityPerSqMi)),
  );
  const carrierRoutes = Math.max(1, Math.round(households / (380 + r * 240)));
  const zipSeedBase = input.zip?.replace(/\D/g, "").slice(0, 5);
  const base =
    zipSeedBase && zipSeedBase.length === 5
      ? Number(zipSeedBase)
      : 10000 + (hash32(seedKey) % 89000);
  const zipCount = Math.min(
    12,
    Math.max(1, Math.round(input.radiusMiles / 2.5)),
  );
  const zipCodes = Array.from({ length: zipCount }, (_, i) =>
    String((base + i * 3) % 100000).padStart(5, "0"),
  );
  return {
    households,
    carrierRoutes,
    zipCodes,
    densityPerSqMi,
    source: "simulated",
  };
}

export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

/** Best-effort forward geocoding through OpenStreetMap Nominatim (browser fetch). */
export async function geocodeAddress(
  query: string,
): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    if (!data.length) return null;
    return {
      lat: Number(data[0].lat),
      lng: Number(data[0].lon),
      label: data[0].display_name,
    };
  } catch {
    return null;
  }
}
