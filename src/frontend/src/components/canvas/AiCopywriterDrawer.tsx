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
import { useCanvasDims } from "@/hooks/use-canvas-dims";
import { DEFAULT_FONT_FAMILY } from "@/lib/canvas";
import { AI_COSTS } from "@/lib/credits";
import { freeSafeRect } from "@/lib/printSpec";
import { measuredHeight } from "@/lib/textFit";
import { useAccountStore } from "@/store/account";
import { useWizardStore } from "@/store/wizard";
import { Loader2, PenLine, Plus, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
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
  const dims = useCanvasDims();
  const addTextBlock = useWizardStore((s) => s.addTextBlock);
  const generate = useGenerateAiCopy();
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [offer, setOffer] = useState("");
  const [cta, setCta] = useState("");
  const [tone, setTone] = useState(TONES[0]);
  const [result, setResult] = useState<CopyResult | null>(null);
  /** Where the next inserted block goes (below the previous one). */
  const nextY = useRef<number | null>(null);
  /** The side and sheet size the current stack belongs to. */
  const stackFor = useRef("");

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
    let res: Awaited<ReturnType<typeof generate.mutateAsync>>;
    try {
      res = await generate.mutateAsync({
        businessName: businessName.trim(),
        industry,
        offer: offer.trim(),
        callToAction: cta.trim(),
        tone,
      });
    } catch {
      toast.error(
        "The AI copywriter couldn't be reached. Try again in a moment.",
      );
      return;
    }
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
    nextY.current = null;
    toast.success(`Copy ready · ${Number(res.creditsCharged)} credit used`);
  }

  /**
   * Places a block below the last one this drawer inserted, sized to its text
   * (`measuredHeight`, as the studio hugs every box), so "Insert all" stacks
   * the headline, bullets and call to action instead of piling them on one
   * spot (each insert used to read the same stale count).
   */
  function insert(kind: "headline" | "bullets" | "cta", text: string) {
    // Beside the USPS zone on an address side; the stack follows the side
    // and sheet it was started on, and starts again at the top rather than
    // running past the safe area.
    const safe = freeSafeRect(dims, activeSide);
    const stackKey = `${activeSide}:${dims.designWidth}x${dims.designHeight}`;
    if (stackFor.current !== stackKey) {
      stackFor.current = stackKey;
      nextY.current = null;
    }
    const wide = Math.max(80, Math.min(Math.round(safe.w * 0.62), safe.w - 24));
    const style =
      kind === "headline"
        ? {
            width: wide,
            fontSize: 34,
            fontWeight: 800 as const,
            color: "#0f172a",
          }
        : kind === "bullets"
          ? {
              width: wide,
              fontSize: 18,
              fontWeight: 600 as const,
              color: "#334155",
            }
          : {
              width: Math.max(
                80,
                Math.min(Math.round(safe.w * 0.5), safe.w - 24),
              ),
              fontSize: 22,
              fontWeight: 700 as const,
              color: "#f97316",
            };
    const height = measuredHeight(text, {
      width: style.width,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontFamily: DEFAULT_FONT_FAMILY,
    });
    let y = nextY.current ?? safe.y + 12;
    if (y + height > safe.y + safe.h) y = safe.y + 12;
    y = Math.max(safe.y, Math.min(y, safe.y + safe.h - height));
    addTextBlock(activeSide, {
      text,
      x: safe.x + 12,
      y,
      width: style.width,
      height,
      fontSize: style.fontSize,
      fontWeight: BigInt(style.fontWeight),
      color: style.color,
    });
    nextY.current = y + height + 12;
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
        <SheetHeader className="ambient-glow-brand pr-14 pt-5 sm:px-6">
          <SheetTitle className="flex items-center gap-2.5 font-display text-lg font-black tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <PenLine className="size-4" />
            </span>
            AI Copywriter
          </SheetTitle>
          <SheetDescription>
            Our AI copywriter writes 3 converting headlines, benefit bullets and
            CTA offers for your mail piece. 1 credit per prompt.
          </SheetDescription>
        </SheetHeader>
        {!isAuthenticated ? (
          <div className="px-4 pb-8 sm:px-6">
            <SignInPrompt message="Sign in to use the AI Copywriter." />
          </div>
        ) : (
          <div className="space-y-4 px-4 pb-8 sm:px-6">
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
                className="gap-2"
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
                Balance:{" "}
                <span className="font-black tabular-nums text-foreground">
                  {creditBalance}
                </span>
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
                    <span className="font-display text-sm font-bold tracking-tight">
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
                  <ul className="list-disc space-y-1 rounded-2xl border border-hairline bg-card-raised p-3 pl-7 text-sm">
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
      <span className="font-display text-sm font-bold tracking-tight">
        {title}
      </span>
      <ul className="space-y-1.5">
        {items.map((t) => (
          <li
            key={t}
            className="flex items-center justify-between gap-2 rounded-2xl border border-hairline bg-card-raised px-3 py-2 text-sm"
          >
            <span>{t}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onInsert(t)}
              className="h-8 shrink-0 gap-1 text-primary hover:bg-primary/10 hover:text-primary-ink"
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
