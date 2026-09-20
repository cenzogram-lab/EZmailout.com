import { SignInPrompt } from "@/components/billing/SignInPrompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAccountSync } from "@/hooks/use-account";
import { useGenerateAiCopy } from "@/hooks/use-backend";
import { AI_COSTS } from "@/lib/credits";
import { getLayoutDims, insetRect } from "@/lib/printSpec";
import { useAccountStore } from "@/store/account";
import { useWizardStore } from "@/store/wizard";
import { Loader2, PenLine, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const INDUSTRIES = [
  "Real Estate",
  "Home Contractors",
  "Dining",
  "Retail",
  "Dental / Medical",
  "Other",
];
const TONES = [
  "Confident & friendly",
  "Urgent & bold",
  "Warm & local",
  "Premium & understated",
];

interface CopyResult {
  headlines: string[];
  bullets: string[];
  ctas: string[];
}

/** "Headline & Offer Copilot" — GPT-4o mini copy injected as editable text blocks. */
export function AiCopywriterDrawer({
  open,
  onOpenChange,
}: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { isAuthenticated } = useAccountSync();
  const creditBalance = useAccountStore((s) => s.creditBalance);
  const setCreditBalance = useAccountStore((s) => s.setCreditBalance);
  const setTopUpOpen = useAccountStore((s) => s.setTopUpOpen);
  const activeSide = useWizardStore((s) => s.activeSide);
  const selectedLayout = useWizardStore((s) => s.selectedLayout);
  const addTextBlock = useWizardStore((s) => s.addTextBlock);
  const generate = useGenerateAiCopy();
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [offer, setOffer] = useState("");
  const [cta, setCta] = useState("");
  const [tone, setTone] = useState(TONES[0]);
  const [result, setResult] = useState<CopyResult | null>(null);
  const [inserted, setInserted] = useState(0);

  async function handleGenerate() {
    if (!businessName.trim() && !industry) {
      toast.error("Tell us the business name or industry");
      return;
    }
    if (creditBalance < AI_COSTS.copy) {
      toast.warning(
        "You need 1 credit for the copywriter — top up to continue",
      );
      setTopUpOpen(true);
      return;
    }
    const res = await generate.mutateAsync({
      businessName: businessName.trim(),
      industry,
      offer: offer.trim(),
      callToAction: cta.trim(),
      tone,
    });
    if (res.creditBalance !== undefined) setCreditBalance(res.creditBalance);
    if (!res.ok) {
      toast.error(res.error ?? "Could not generate copy");
      if (res.error?.toLowerCase().includes("insufficient")) setTopUpOpen(true);
      return;
    }
    setResult({
      headlines: res.headlines,
      bullets: res.bullets,
      ctas: res.ctas,
    });
    setInserted(0);
    toast.success(`Copy ready · ${Number(res.creditsCharged)} credit used`);
  }

  function insert(kind: "headline" | "bullets" | "cta", text: string) {
    const dims = getLayoutDims(selectedLayout ?? "6x9");
    const safe = insetRect(dims, dims.safeInsetPct);
    const y = safe.y + 12 + inserted * 52;
    const width = Math.round(safe.w * 0.62);
    if (kind === "headline") {
      addTextBlock(activeSide, {
        text,
        x: safe.x + 12,
        y,
        width,
        height: 56,
        fontSize: 34,
        fontWeight: 800n,
        color: "#0f172a",
      });
    } else if (kind === "bullets") {
      const lines = text.split("\n");
      addTextBlock(activeSide, {
        text,
        x: safe.x + 12,
        y,
        width,
        height: 26 * Math.max(1, lines.length) + 12,
        fontSize: 18,
        fontWeight: 600n,
        color: "#334155",
      });
    } else {
      addTextBlock(activeSide, {
        text,
        x: safe.x + 12,
        y,
        width: Math.round(safe.w * 0.5),
        height: 40,
        fontSize: 22,
        fontWeight: 700n,
        color: "#f97316",
      });
    }
    setInserted((n) => n + 1);
  }

  function insertAll() {
    if (!result) return;
    if (result.headlines[0]) insert("headline", result.headlines[0]);
    if (result.bullets.length)
      insert("bullets", result.bullets.map((b) => `• ${b}`).join("\n"));
    if (result.ctas[0]) insert("cta", result.ctas[0]);
    toast.success("Copy inserted as editable text blocks");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full overflow-y-auto sm:max-w-lg"
        data-ocid="canvas.copywriter.drawer"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-display">
            <PenLine className="size-5 text-accent" /> AI Copywriter
          </SheetTitle>
          <SheetDescription>
            GPT-4o mini writes 3 converting headlines, benefit bullets and CTA
            offers for your mail piece. 1 credit per prompt.
          </SheetDescription>
        </SheetHeader>
        {!isAuthenticated ? (
          <div className="mt-6">
            <SignInPrompt message="Sign in to use the AI Copywriter." />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="cw-business">Business name</Label>
                <Input
                  id="cw-business"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Bright Smile Dental"
                  data-ocid="canvas.copywriter.business"
                />
              </div>
              <div className="space-y-1">
                <Label>Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger data-ocid="canvas.copywriter.industry">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="cw-offer">Offer / discount</Label>
                <Input
                  id="cw-offer"
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                  placeholder="$20 off your first cleaning"
                  data-ocid="canvas.copywriter.offer"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cw-cta">Call to action</Label>
                <Input
                  id="cw-cta"
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  placeholder="Book online this week"
                  data-ocid="canvas.copywriter.cta"
                />
              </div>
              <div className="space-y-1">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger data-ocid="canvas.copywriter.tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleGenerate}
                disabled={generate.isPending}
                className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                data-ocid="canvas.copywriter.generate"
              >
                {generate.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Generate copy · 1 credit
              </Button>
              <span className="text-xs text-muted-foreground">
                Balance: {creditBalance}
              </span>
            </div>
            {result && (
              <div className="space-y-4" data-ocid="canvas.copywriter.results">
                <Section
                  title="Headlines"
                  items={result.headlines}
                  onInsert={(t) => insert("headline", t)}
                  ocid="headline"
                />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-semibold">
                      Benefit bullets
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        insert(
                          "bullets",
                          result.bullets.map((b) => `• ${b}`).join("\n"),
                        )
                      }
                      className="gap-1"
                      data-ocid="canvas.copywriter.insert.bullets"
                    >
                      <Plus className="size-3.5" /> Insert
                    </Button>
                  </div>
                  <ul className="list-disc space-y-1 rounded-md border p-3 pl-7 text-sm">
                    {result.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
                <Section
                  title="Calls to action"
                  items={result.ctas}
                  onInsert={(t) => insert("cta", t)}
                  ocid="cta"
                />
                <Button
                  onClick={insertAll}
                  className="w-full gap-2"
                  data-ocid="canvas.copywriter.insert_all"
                >
                  <Plus className="size-4" /> Insert headline, bullets and CTA
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  items,
  onInsert,
  ocid,
}: {
  title: string;
  items: string[];
  onInsert: (text: string) => void;
  ocid: string;
}) {
  return (
    <div className="space-y-2">
      <span className="font-display text-sm font-semibold">{title}</span>
      <ul className="space-y-1.5">
        {items.map((t) => (
          <li
            key={t}
            className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <span>{t}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onInsert(t)}
              className="h-7 gap-1 text-accent"
              data-ocid={`canvas.copywriter.insert.${ocid}`}
            >
              <Plus className="size-3.5" /> Insert
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
