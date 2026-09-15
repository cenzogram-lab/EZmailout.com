import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVerifyAddresses } from "@/hooks/use-backend";
import { useWizardStore } from "@/store/wizard";
import type { AddressInput, AddressVerificationResult } from "@/types";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  MapPin,
  Upload,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ParsedRow {
  name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
}

function simulateHouseholdCount(radius: number, zip: string): number {
  if (zip.trim()) {
    const seed = Number.parseInt(zip.replace(/\D/g, "").slice(0, 5), 10) || 0;
    return Math.min((seed % 10000) + 5000, 50000);
  }
  return Math.min(Math.round(radius * radius * 450), 50000);
}

function parseCSV(raw: string): ParsedRow[] {
  const lines = raw.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const col = (name: string) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? idx : -1;
  };
  const cName = col("name");
  const cLine1 = col("address_line1");
  const cLine2 = col("address_line2");
  const cCity = col("city");
  const cState = col("state");
  const cZip = col("zip_code");
  if (cName < 0 || cLine1 < 0 || cCity < 0 || cState < 0 || cZip < 0) return [];
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim());
    rows.push({
      name: cells[cName] || "",
      address_line1: cells[cLine1] || "",
      address_line2: cLine2 >= 0 ? cells[cLine2] || "" : "",
      city: cells[cCity] || "",
      state: cells[cState] || "",
      zip_code: cells[cZip] || "",
    });
  }
  return rows;
}

function rowsToInputs(rows: ParsedRow[]): AddressInput[] {
  return rows.map((r) => ({
    name: r.name,
    address_line1: r.address_line1,
    address_line2: r.address_line2 || undefined,
    city: r.city,
    state: r.state,
    zip_code: r.zip_code,
  }));
}

function MapPlaceholder({
  lat,
  lng,
  radius,
}: {
  lat: number;
  lng: number;
  radius: number;
}) {
  return (
    <div className="relative flex h-80 w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-[#0d1117]">
      {/* Grid lines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Radius circle */}
      <div
        className="pointer-events-none absolute rounded-full border border-primary/40 bg-primary/5"
        style={{
          width: `${Math.min(radius * 8, 280)}px`,
          height: `${Math.min(radius * 8, 280)}px`,
        }}
      />
      {/* Pin */}
      <div className="relative z-10 flex flex-col items-center">
        <MapPin className="size-8 text-primary drop-shadow-lg" />
        <div className="mt-1 rounded bg-card px-2 py-0.5 text-xs font-mono text-muted-foreground shadow">
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </div>
      </div>
      <div className="absolute bottom-2 right-2 rounded bg-card/80 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
        Radius: {radius} mi
      </div>
    </div>
  );
}

export function Step2AudienceIntake() {
  const setStep = useWizardStore((s) => s.setStep);
  const setAudienceType = useWizardStore((s) => s.setAudienceType);
  const setRecipientCount = useWizardStore((s) => s.setRecipientCount);
  const setVerifiedAddresses = useWizardStore((s) => s.setVerifiedAddresses);

  const [activeTab, setActiveTab] = useState<"map" | "csv">("map");

  // Map state
  const [mapLat, setMapLat] = useState(40.7128);
  const [mapLng, setMapLng] = useState(-74.006);
  const [addressText, setAddressText] = useState("");
  const [radius, setRadius] = useState([5]);
  const [zipInput, setZipInput] = useState("");
  const [geoError, setGeoError] = useState<string | null>(null);

  // CSV state
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [verificationResults, setVerificationResults] = useState<
    AddressVerificationResult[] | null
  >(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const verifyMutation = useVerifyAddresses();

  // Geolocation on tab load
  useEffect(() => {
    if (activeTab !== "map") return;
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMapLat(pos.coords.latitude);
        setMapLng(pos.coords.longitude);
        setGeoError(null);
      },
      () => {
        setGeoError("Unable to retrieve location");
      },
    );
  }, [activeTab]);

  const simulatedCount = useMemo(
    () => simulateHouseholdCount(radius[0], zipInput),
    [radius, zipInput],
  );

  const handleUseMapAudience = useCallback(() => {
    setAudienceType("map");
    setRecipientCount(simulatedCount);
    setStep(3);
  }, [setAudienceType, setRecipientCount, setStep, simulatedCount]);

  const handleFile = useCallback(async (file: File) => {
    setCsvError(null);
    setVerificationResults(null);
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) {
      setCsvError(
        "Could not parse CSV. Ensure headers include: name, address_line1, address_line2, city, state, zip_code",
      );
      setParsedRows([]);
      return;
    }
    setParsedRows(rows);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleVerify = useCallback(async () => {
    if (parsedRows.length === 0) return;
    setIsVerifying(true);
    setVerificationResults(null);
    try {
      const inputs = rowsToInputs(parsedRows);
      const results = await verifyMutation.mutateAsync(inputs);
      setVerificationResults(results);
    } catch {
      setCsvError("Address verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }, [parsedRows, verifyMutation]);

  const validCount = useMemo(() => {
    if (!verificationResults) return 0;
    return verificationResults.filter((r) => r.isValid).length;
  }, [verificationResults]);

  const invalidCount = useMemo(() => {
    if (!verificationResults) return 0;
    return verificationResults.filter((r) => !r.isValid).length;
  }, [verificationResults]);

  const handleUseCsvAudience = useCallback(() => {
    if (!verificationResults) return;
    const verified = verificationResults
      .filter((r) => r.isValid && r.verified)
      .map((r) => r.verified!);
    setAudienceType("csv");
    setVerifiedAddresses(verified);
    setRecipientCount(validCount);
    setStep(3);
  }, [
    verificationResults,
    setAudienceType,
    setVerifiedAddresses,
    setRecipientCount,
    setStep,
    validCount,
  ]);

  const isRowInvalid = (index: number) => {
    if (!verificationResults) return false;
    const r = verificationResults[index];
    return !!r && !r.isValid;
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Audience Targeting
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how you want to reach your recipients.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "map" | "csv")}
        className="w-full"
      >
        <TabsList className="mb-4 grid w-full grid-cols-2 sm:w-auto">
          <TabsTrigger value="map" data-ocid="audience.tab.map">
            <MapPin className="mr-2 size-4" />
            Geo-Target (Map)
          </TabsTrigger>
          <TabsTrigger value="csv" data-ocid="audience.tab.csv">
            <FileSpreadsheet className="mr-2 size-4" />
            Upload CSV
          </TabsTrigger>
        </TabsList>

        {/* TAB A — Geo-Target */}
        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">
                Drop a Pin &amp; Set Radius
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {geoError && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  {geoError}
                </div>
              )}

              <MapPlaceholder lat={mapLat} lng={mapLng} radius={radius[0]} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="target-address"
                    className="text-sm font-medium text-foreground"
                  >
                    Target Address
                  </label>
                  <Input
                    id="target-address"
                    placeholder="Enter an address..."
                    value={addressText}
                    onChange={(e) => setAddressText(e.target.value)}
                    data-ocid="audience.map.address_input"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="zip-code"
                    className="text-sm font-medium text-foreground"
                  >
                    ZIP Code
                  </label>
                  <Input
                    id="zip-code"
                    placeholder="Or enter ZIP code"
                    value={zipInput}
                    onChange={(e) => setZipInput(e.target.value)}
                    data-ocid="audience.map.zip_input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="radius-slider"
                    className="text-sm font-medium text-foreground"
                  >
                    Radius
                  </label>
                  <Badge variant="secondary">{radius[0]} miles</Badge>
                </div>
                <Slider
                  id="radius-slider"
                  min={0.5}
                  max={25}
                  step={0.5}
                  value={radius}
                  onValueChange={setRadius}
                  data-ocid="audience.map.radius_slider"
                />
              </div>

              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="flex items-center gap-3 py-4">
                  <MapPin className="size-6 text-primary" />
                  <div>
                    <div className="font-display text-2xl font-bold text-foreground">
                      {simulatedCount.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Verified Mailboxes Found in this Area
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  onClick={handleUseMapAudience}
                  data-ocid="audience.map.use_button"
                >
                  Use This Audience
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB B — CSV Upload */}
        <TabsContent value="csv" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">
                Upload Recipient List
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drop zone */}
              <button
                type="button"
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-10 transition-colors hover:bg-muted/50"
                data-ocid="audience.csv.dropzone"
              >
                <Upload className="mb-3 size-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Drop your CSV file here or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Required columns: name, address_line1, city, state, zip_code
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={onFileInputChange}
                  data-ocid="audience.csv.file_input"
                />
              </button>

              {csvError && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  {csvError}
                </div>
              )}

              {/* Preview table */}
              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Preview ({Math.min(parsedRows.length, 10)} of{" "}
                      {parsedRows.length} rows)
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleVerify}
                      disabled={isVerifying || parsedRows.length === 0}
                      data-ocid="audience.csv.verify_button"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify Addresses"
                      )}
                    </Button>
                  </div>

                  {isVerifying && (
                    <div className="space-y-1">
                      <Progress value={undefined} className="h-2 w-full" />
                      <p className="text-xs text-muted-foreground">
                        Sending addresses to Lob verification...
                      </p>
                    </div>
                  )}

                  <div className="max-h-64 overflow-auto rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>ZIP</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedRows.slice(0, 10).map((row, i) => {
                          const invalid = isRowInvalid(i);
                          return (
                            <TableRow
                              key={`row-${i}-${row.name || ""}-${row.address_line1 || ""}`}
                              className={
                                invalid
                                  ? "bg-destructive/10 text-destructive"
                                  : undefined
                              }
                              data-ocid={`audience.csv.item.${i + 1}`}
                            >
                              <TableCell>{row.name}</TableCell>
                              <TableCell>
                                {row.address_line1}
                                {row.address_line2
                                  ? `, ${row.address_line2}`
                                  : ""}
                              </TableCell>
                              <TableCell>{row.city}</TableCell>
                              <TableCell>{row.state}</TableCell>
                              <TableCell>{row.zip_code}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Verification summary */}
              {verificationResults && (
                <Card className="border-border">
                  <CardContent className="flex flex-wrap items-center gap-4 py-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-5 text-emerald-400" />
                      <span className="text-sm font-medium text-foreground">
                        {validCount} Addresses Verified
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="size-5 text-destructive" />
                      <span className="text-sm font-medium text-foreground">
                        {invalidCount} Invalid Rows Removed
                      </span>
                    </div>
                    <div className="ml-auto">
                      <Button
                        onClick={handleUseCsvAudience}
                        disabled={validCount === 0}
                        data-ocid="audience.csv.use_button"
                      >
                        Use This Audience
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
