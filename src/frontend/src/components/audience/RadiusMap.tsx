import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatNumber } from "@/lib/format";
import { estimateEddmAudience, geocodeAddress } from "@/lib/geo";
import type { MapTarget } from "@/types";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import {
  ArrowRight,
  Crosshair,
  Home,
  Loader2,
  MapPin,
  Route,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { toast } from "sonner";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const METERS_PER_MILE = 1609.34;
const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 };
const MIN_RADIUS = 0.5;
const MAX_RADIUS = 25;

export interface RadiusMapProps {
  initialTarget?: MapTarget | null;
  onUseAudience: (target: MapTarget) => void;
}

function zoomForRadius(radiusMiles: number): number {
  if (radiusMiles <= 1) return 13;
  if (radiusMiles <= 3) return 12;
  if (radiusMiles <= 7) return 11;
  if (radiusMiles <= 15) return 10;
  return 9;
}

function ClickToDropPin({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (event) => {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function FlyToCenter({
  lat,
  lng,
  radiusMiles,
}: {
  lat: number;
  lng: number;
  radiusMiles: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoomForRadius(radiusMiles), { duration: 0.8 });
  }, [map, lat, lng, radiusMiles]);
  return null;
}

/** Interactive Leaflet map for drawing an EDDM-style radius audience. */
export function RadiusMap({ initialTarget, onUseAudience }: RadiusMapProps) {
  const [center, setCenter] = useState(() =>
    initialTarget
      ? { lat: initialTarget.lat, lng: initialTarget.lng }
      : DEFAULT_CENTER,
  );
  const [radiusMiles, setRadiusMiles] = useState(
    initialTarget?.radiusMiles ?? 3,
  );
  const [addressQuery, setAddressQuery] = useState(initialTarget?.label ?? "");
  const [zip, setZip] = useState("");
  const [label, setLabel] = useState<string | undefined>(initialTarget?.label);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  const estimate = useMemo(
    () =>
      estimateEddmAudience({
        lat: center.lat,
        lng: center.lng,
        radiusMiles,
        zip: zip.trim() || undefined,
      }),
    [center, radiusMiles, zip],
  );

  async function handleSearch() {
    const query = addressQuery.trim();
    if (!query) {
      toast.error("Enter an address, city or landmark to search.");
      return;
    }
    setSearching(true);
    try {
      const result = await geocodeAddress(query);
      if (!result) {
        toast.error("No match found for that address. Try adding a city.");
        return;
      }
      setCenter({ lat: result.lat, lng: result.lng });
      setLabel(result.label);
      toast.success("Pin moved to the searched address.");
    } finally {
      setSearching(false);
    }
  }

  async function handleZipLookup() {
    const cleaned = zip.replace(/\D/g, "").slice(0, 5);
    if (cleaned.length !== 5) {
      toast.error("Enter a 5-digit ZIP code.");
      return;
    }
    setZip(cleaned);
    setSearching(true);
    try {
      const result = await geocodeAddress(cleaned);
      if (!result) {
        toast.error("Could not locate that ZIP code.");
        return;
      }
      setCenter({ lat: result.lat, lng: result.lng });
      setLabel(result.label);
    } finally {
      setSearching(false);
    }
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Your browser does not support geolocation.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLabel("My location");
        setLocating(false);
      },
      () => {
        toast.error("Could not read your location. Drop a pin instead.");
        setLocating(false);
      },
      { timeout: 10_000 },
    );
  }

  function handleUse() {
    onUseAudience({
      lat: center.lat,
      lng: center.lng,
      radiusMiles,
      zipCodes: estimate.zipCodes,
      estimatedHouseholds: estimate.households,
      carrierRoutes: estimate.carrierRoutes,
      label,
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 gap-2">
            <Input
              value={addressQuery}
              onChange={(e) => setAddressQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSearch();
              }}
              placeholder="Search an address, city or landmark"
              aria-label="Address search"
              data-ocid="audience.map.address.input"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSearch()}
              disabled={searching}
              className="gap-2"
              data-ocid="audience.map.search.button"
            >
              {searching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              Search
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleUseMyLocation}
            disabled={locating}
            className="gap-2"
            data-ocid="audience.map.locate.button"
          >
            {locating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Crosshair className="size-4" />
            )}
            Use my location
          </Button>
        </div>

        <div
          className="h-[380px] w-full overflow-hidden rounded-xl border border-border shadow-sm"
          data-ocid="audience.map.canvas"
        >
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={zoomForRadius(radiusMiles)}
            scrollWheelZoom
            className="h-full w-full"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <Marker position={[center.lat, center.lng]} />
            <Circle
              center={[center.lat, center.lng]}
              radius={radiusMiles * METERS_PER_MILE}
              pathOptions={{
                color: "#f97316",
                fillColor: "#f97316",
                fillOpacity: 0.12,
                weight: 2,
              }}
            />
            <ClickToDropPin
              onPick={(lat, lng) => {
                setCenter({ lat, lng });
                setLabel(undefined);
              }}
            />
            <FlyToCenter
              lat={center.lat}
              lng={center.lng}
              radiusMiles={radiusMiles}
            />
          </MapContainer>
        </div>
        <p className="text-xs text-muted-foreground">
          Click anywhere on the map to drop the pin. Pin:{" "}
          <span className="font-mono">
            {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
          </span>
          {label ? ` · ${label}` : ""}
        </p>
      </div>

      <div className="space-y-4">
        <Card className="bg-card">
          <CardContent className="space-y-5 py-5">
            <div className="space-y-2">
              <Label htmlFor="audience-zip">ZIP code (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="audience-zip"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleZipLookup();
                  }}
                  placeholder="78701"
                  inputMode="numeric"
                  maxLength={10}
                  data-ocid="audience.map.zip.input"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleZipLookup()}
                  disabled={searching}
                  data-ocid="audience.map.zip.button"
                >
                  Go
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="audience-radius">Radius</Label>
                <Badge className="bg-primary text-primary-foreground font-mono">
                  {radiusMiles} mi
                </Badge>
              </div>
              <Slider
                id="audience-radius"
                min={MIN_RADIUS}
                max={MAX_RADIUS}
                step={0.5}
                value={[radiusMiles]}
                onValueChange={(v) => setRadiusMiles(v[0] ?? radiusMiles)}
                data-ocid="audience.map.radius.slider"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{MIN_RADIUS} mi</span>
                <span>{MAX_RADIUS} mi</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="surface-glow border-primary/20 bg-primary/5"
          data-ocid="audience.map.estimate.card"
        >
          <CardContent className="space-y-4 py-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Simulated EDDM saturation estimate
              </span>
              <Badge variant="outline">Estimate</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Home className="size-3.5" /> Households
                </div>
                <div className="mt-1 font-display text-2xl font-bold text-foreground">
                  {formatNumber(estimate.households)}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Route className="size-3.5" /> Carrier routes
                </div>
                <div className="mt-1 font-display text-2xl font-bold text-foreground">
                  {formatNumber(estimate.carrierRoutes)}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5" /> ZIP codes in range
              </div>
              <div className="flex flex-wrap gap-1.5">
                {estimate.zipCodes.map((z) => (
                  <Badge key={z} variant="secondary" className="font-mono">
                    {z}
                  </Badge>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              About {formatNumber(estimate.densityPerSqMi)} households per
              square mile. This sizes and prices the drop; the pieces are mailed
              to the address list you attach next.
            </p>
            <Button
              type="button"
              onClick={handleUse}
              className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              data-ocid="audience.map.use.button"
            >
              Save estimate &amp; add recipients
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
