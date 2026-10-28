import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatNumber } from "@/lib/format";
import { estimateEddmAudience, geocodeAddress } from "@/lib/geo";
import { cn } from "@/lib/utils";
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

/**
 * Leaflet's own chrome (zoom bar, attribution strip, the ground shown before
 * tiles load) in the app's theme tokens instead of its fixed white and grey,
 * which sat as light boxes on the dark card. The attribution stays readable:
 * the tile licence requires it. In the dark theme the tiles are dimmed a
 * little so the map does not glare. Arbitrary variants on the wrapper outrank
 * leaflet.css (`.leaflet-bar a`, `.leaflet-container …`) by specificity.
 */
const MAP_CHROME = [
  "[&_.leaflet-container]:bg-well",
  "dark:[&_.leaflet-tile-pane]:brightness-[.85]",
  "[&_.leaflet-bar]:overflow-hidden [&_.leaflet-bar]:rounded-xl [&_.leaflet-bar]:border [&_.leaflet-bar]:border-hairline-strong [&_.leaflet-bar]:bg-popover [&_.leaflet-bar]:shadow-raised",
  "[&_.leaflet-bar_a]:border-hairline [&_.leaflet-bar_a]:bg-popover [&_.leaflet-bar_a]:text-foreground",
  "[&_.leaflet-bar_a:hover]:bg-muted [&_.leaflet-bar_a:focus-visible]:bg-muted [&_.leaflet-bar_a:focus-visible]:outline [&_.leaflet-bar_a:focus-visible]:outline-2 [&_.leaflet-bar_a:focus-visible]:-outline-offset-2 [&_.leaflet-bar_a:focus-visible]:outline-ring",
  "[&_.leaflet-bar_a.leaflet-disabled]:bg-popover [&_.leaflet-bar_a.leaflet-disabled]:text-muted-foreground",
  "[&_.leaflet-control-attribution]:rounded-tl-lg [&_.leaflet-control-attribution]:bg-popover [&_.leaflet-control-attribution]:px-1.5 [&_.leaflet-control-attribution]:text-muted-foreground",
  "[&_.leaflet-control-attribution_a]:text-primary",
].join(" ");

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

/**
 * Leaflet measures its box once. From lg the map grows to the height of the
 * column beside it, which changes as ZIP codes come and go, so it measures
 * again whenever its box changes size (keeping the pin centred).
 */
function KeepMapSized() {
  const map = useMap();
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
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
      {/* min-w-0: a grid item is otherwise as wide as its content (the
          search row), which widened a 320 px phone page. */}
      <div className="flex min-w-0 flex-col gap-4">
        {/* Phones: the search field takes the whole row (its placeholder
            was cut mid-word beside the button) and Search and Use my
            location share the next one; from sm all three sit in one row.
            Below 380 px the placeholder steps down to 14 px and the field
            gives up 2 px of padding a side, so it stays whole down to a
            320 px phone; typed text stays 16 px (iOS zooms below that). */}
        <div className="flex flex-wrap gap-2">
          <Input
            value={addressQuery}
            onChange={(e) => setAddressQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSearch();
            }}
            placeholder="Search an address, city or landmark"
            aria-label="Address search"
            className="h-11 basis-full max-[379px]:px-2.5 max-[379px]:placeholder:text-sm sm:h-9 sm:flex-1"
            data-ocid="audience.map.address.input"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleSearch()}
            disabled={searching}
            className="h-11 flex-1 gap-2 sm:h-9 sm:flex-none"
            data-ocid="audience.map.search.button"
          >
            {searching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleUseMyLocation}
            disabled={locating}
            className="h-11 flex-1 gap-2 sm:h-9 sm:flex-none"
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
          className={cn(
            // From lg the map takes the column's full height, so it ends
            // level with the estimate card instead of leaving a gap.
            "h-[380px] w-full overflow-hidden rounded-2xl border border-hairline-strong shadow-surface lg:h-auto lg:min-h-[380px] lg:flex-1",
            MAP_CHROME,
          )}
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
                color: "#5c5ee8",
                fillColor: "#5c5ee8",
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
            <KeepMapSized />
          </MapContainer>
        </div>
        <p className="text-xs text-muted-foreground">
          Click anywhere on the map to drop the pin. Pin:{" "}
          <span className="font-mono tabular-nums">
            {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
          </span>
          {label ? ` · ${label}` : ""}
        </p>
      </div>

      <div className="min-w-0 space-y-4">
        <Card className="rounded-2xl bg-card-raised py-5 shadow-none">
          <CardContent className="space-y-5 px-4 sm:px-5">
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
                  className="h-11 sm:h-9"
                  data-ocid="audience.map.zip.input"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleZipLookup()}
                  disabled={searching}
                  className="h-11 sm:h-9"
                  data-ocid="audience.map.zip.button"
                >
                  Go
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="audience-radius">Radius</Label>
                <Badge className="font-mono tabular-nums">
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
              <div className="meta-mono flex justify-between text-[11px] tracking-normal">
                <span>{MIN_RADIUS} mi</span>
                <span>{MAX_RADIUS} mi</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="relative isolate rounded-2xl border-primary/25 bg-card-raised py-5 shadow-raised"
          data-ocid="audience.map.estimate.card"
        >
          <div aria-hidden className="ambient-glow-backdrop" />
          <CardContent className="space-y-4 px-4 max-[379px]:px-3 sm:px-5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Simulated EDDM saturation estimate
              </span>
              <Badge variant="info">Estimate</Badge>
            </div>
            <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
              <div className="min-w-0 rounded-2xl border border-hairline bg-well p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Home className="size-3.5" /> Households
                </div>
                <div className="mt-1.5 text-2xl font-black leading-none tracking-tight tabular-nums text-foreground [overflow-wrap:anywhere] sm:text-3xl">
                  {formatNumber(estimate.households)}
                </div>
              </div>
              <div className="min-w-0 rounded-2xl border border-hairline bg-well p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Route className="size-3.5" /> Carrier routes
                </div>
                <div className="mt-1.5 text-2xl font-black leading-none tracking-tight tabular-nums text-foreground [overflow-wrap:anywhere] sm:text-3xl">
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
                  <Badge key={z} variant="neutral" className="font-mono">
                    {z}
                  </Badge>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              About {formatNumber(estimate.densityPerSqMi)} households per
              square mile. This sizes the drop; the address list you attach next
              is what is mailed and priced.
            </p>
            {/* One line down to a 320 px phone: below 380 px the label steps
                down to 14 px and the panels give up a little padding, and
                below 340 px the decorative arrow goes, or the pill wrapped
                with its arrow stranded at the right. */}
            <Button
              type="button"
              onClick={handleUse}
              size="lg"
              className="h-auto min-h-11 w-full gap-2 whitespace-normal py-2.5 text-center max-[379px]:text-sm max-[379px]:has-[>svg]:px-4 max-[339px]:has-[>svg]:px-3 max-[339px]:[&>svg]:hidden"
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
