import type { AudiencePresetShared, VerifiedAddress } from "@/backend";
import { CsvUploader } from "@/components/audience/CsvUploader";
import { PresetEditor } from "@/components/audience/PresetEditor";
import { PresetPicker } from "@/components/audience/PresetPicker";
import { RadiusMap } from "@/components/audience/RadiusMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumber } from "@/lib/format";
import { useWizardStore } from "@/store/wizard";
import type { MapTarget, WizardAudienceType } from "@/types";
import { ArrowLeft, Bookmark, FileSpreadsheet, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const TAB_VALUES: WizardAudienceType[] = ["map", "csv", "preset"];

function isTab(value: string): value is WizardAudienceType {
  return (TAB_VALUES as string[]).includes(value);
}

/** Step 2: choose the audience via radius map, CSV upload or a saved preset. */
export function Step2AudienceIntake() {
  const setStep = useWizardStore((s) => s.setStep);
  const audienceType = useWizardStore((s) => s.audienceType);
  const recipientCount = useWizardStore((s) => s.recipientCount);
  const geoTarget = useWizardStore((s) => s.geoTarget);
  const setAudienceType = useWizardStore((s) => s.setAudienceType);
  const setRecipientCount = useWizardStore((s) => s.setRecipientCount);
  const setVerifiedAddresses = useWizardStore((s) => s.setVerifiedAddresses);
  const setGeoTarget = useWizardStore((s) => s.setGeoTarget);
  const setSourcePresetId = useWizardStore((s) => s.setSourcePresetId);

  const [tab, setTab] = useState<WizardAudienceType>(audienceType ?? "map");
  const [selectedPreset, setSelectedPreset] =
    useState<AudiencePresetShared | null>(null);

  function applyMapAudience(target: MapTarget) {
    setGeoTarget(target);
    setAudienceType("map");
    setRecipientCount(target.estimatedHouseholds);
    setVerifiedAddresses([]);
    setSourcePresetId(null);
    toast.success(
      `Targeting about ${formatNumber(target.estimatedHouseholds)} households.`,
    );
    setStep(3);
  }

  function applyCsvAudience(addresses: VerifiedAddress[]) {
    if (addresses.length === 0) {
      toast.error("No verified addresses to continue with.");
      return;
    }
    setVerifiedAddresses(addresses);
    setRecipientCount(addresses.length);
    setAudienceType("csv");
    setGeoTarget(null);
    setSourcePresetId(null);
    setStep(3);
  }

  function applyPresetAudience(addresses: VerifiedAddress[], presetId: string) {
    if (addresses.length === 0) {
      toast.error("This preset has no recipients.");
      return;
    }
    setVerifiedAddresses(addresses);
    setRecipientCount(addresses.length);
    setSourcePresetId(presetId);
    setAudienceType("preset");
    setGeoTarget(null);
    setStep(3);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Who should receive it?
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Saturate a neighbourhood, upload your own list, or reuse an audience
            you have mailed before.
          </p>
        </div>
        {audienceType && recipientCount > 0 && (
          <Badge
            variant="outline"
            className="w-fit border-emerald-brand/30 bg-emerald-brand/10 text-emerald-brand"
            data-ocid="audience.current.badge"
          >
            Current: {formatNumber(recipientCount)} recipients (
            {audienceType === "map"
              ? "radius"
              : audienceType === "csv"
                ? "CSV"
                : "preset"}
            )
          </Badge>
        )}
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          if (isTab(v)) setTab(v);
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 sm:w-auto">
          <TabsTrigger value="map" data-ocid="audience.tab.map">
            <MapPin className="size-4" /> Radius Map
          </TabsTrigger>
          <TabsTrigger value="csv" data-ocid="audience.tab.csv">
            <FileSpreadsheet className="size-4" /> CSV Upload
          </TabsTrigger>
          <TabsTrigger value="preset" data-ocid="audience.tab.preset">
            <Bookmark className="size-4" /> Saved Presets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="pt-3">
          <Card className="bg-card">
            <CardContent className="py-5">
              <RadiusMap
                initialTarget={geoTarget}
                onUseAudience={applyMapAudience}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="csv" className="pt-3">
          <Card className="bg-card">
            <CardContent className="py-5">
              <CsvUploader onUseAudience={applyCsvAudience} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preset" className="pt-3">
          <Card className="bg-card">
            <CardContent className="py-5">
              {selectedPreset ? (
                <PresetEditor
                  key={selectedPreset.id}
                  preset={selectedPreset}
                  onBack={() => setSelectedPreset(null)}
                  onDeleted={() => setSelectedPreset(null)}
                  onRerun={applyPresetAudience}
                />
              ) : (
                <PresetPicker
                  selectedId={null}
                  onSelect={(preset) => setSelectedPreset(preset)}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-start border-t border-border pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep(1)}
          className="gap-2"
          data-ocid="audience.back.button"
        >
          <ArrowLeft className="size-4" /> Back to products
        </Button>
      </div>
    </div>
  );
}
