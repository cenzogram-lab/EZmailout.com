import { AiImageSize } from "@/backend";
import { SignInPrompt } from "@/components/billing/SignInPrompt";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAccountSync } from "@/hooks/use-account";
import { useGenerateAiImage, usePublicConfig } from "@/hooks/use-backend";
import { AI_COSTS } from "@/lib/credits";
import { cn } from "@/lib/utils";
import { useAccountStore } from "@/store/account";
import { useWizardStore } from "@/store/wizard";
import { ImagePlus, Loader2, Sparkles, Stamp, Wand2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const QUICK_PROMPTS = [
  {
    industry: "Real Estate",
    prompt:
      "Modern suburban craftsman home front lawn at golden hour, clean negative space on the left for text, photorealistic",
  },
  {
    industry: "Home Contractors",
    prompt:
      "Pristine renovated kitchen with quartz countertops, bright natural light, generous negative space for headline text",
  },
  {
    industry: "Dining",
    prompt:
      "Overhead artisan pizza on a rustic dark wood table, moody warm light, copy space along the top",
  },
  {
    industry: "Retail",
    prompt:
      "Minimal boutique storefront display with warm evening lighting, wide copy space, editorial photo",
  },
  {
    industry: "Dental / Medical",
    prompt:
      "Clean bright dental clinic interior, soft blue tones, calming, wide copy space for text",
  },
];

const SIZES: {
  size: AiImageSize;
  label: string;
  credits: number;
  hint: string;
}[] = [
  {
    size: AiImageSize.Square1024,
    label: "Square",
    credits: AI_COSTS.squareImage,
    hint: "1024×1024",
  },
  {
    size: AiImageSize.Wide1792,
    label: "Widescreen",
    credits: AI_COSTS.wideImage,
    hint: "1024×1792 · fits 4.25×6 / 6×9",
  },
  {
    size: AiImageSize.WideHd1792,
    label: "HD widescreen",
    credits: AI_COSTS.hdImage,
    hint: "1024×1792 · HD quality",
  },
];

/** Downloads a remote image into an object URL so the rasterizer can draw it without CORS taint. */
async function localizeImage(url: string): Promise<string> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return url;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return url;
  }
}

/** Turns near-white pixels transparent so a generated badge/logo can sit on any background. */
async function removeWhiteBackground(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height);
        const px = data.data;
        for (let i = 0; i < px.length; i += 4) {
          const [r, g, b] = [px[i], px[i + 1], px[i + 2]];
          if (r > 238 && g > 238 && b > 238) px[i + 3] = 0;
          else if (r > 222 && g > 222 && b > 222)
            px[i + 3] = Math.round(((255 - Math.min(r, g, b)) / 33) * 255);
        }
        ctx.putImageData(data, 0, 0);
        resolve(c.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

interface Generated {
  id: string;
  url: string;
  prompt: string;
  revised?: string;
}

/** "Magic Mail Backgrounds": DALL·E 3 generation paid with credits, piped straight into the canvas. */
export function AiStudioPanel() {
  const { isAuthenticated } = useAccountSync();
  const creditBalance = useAccountStore((s) => s.creditBalance);
  const setCreditBalance = useAccountStore((s) => s.setCreditBalance);
  const setTopUpOpen = useAccountStore((s) => s.setTopUpOpen);
  const activeSide = useWizardStore((s) => s.activeSide);
  const setBackgroundImage = useWizardStore((s) => s.setBackgroundImage);
  const addLogo = useWizardStore((s) => s.addLogo);
  const config = usePublicConfig();
  const generate = useGenerateAiImage();
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<AiImageSize>(AiImageSize.Wide1792);
  const [gallery, setGallery] = useState<Generated[]>([]);
  const [busyLogo, setBusyLogo] = useState<string | null>(null);

  const cost =
    SIZES.find((s) => s.size === size)?.credits ?? AI_COSTS.wideImage;

  if (!isAuthenticated) {
    return (
      <SignInPrompt message="Sign in to use the AI Studio. New members get 50 credits with their membership." />
    );
  }

  async function handleGenerate() {
    const clean = prompt.trim();
    if (!clean) {
      toast.error("Describe the background you want");
      return;
    }
    if (creditBalance < cost) {
      toast.warning(
        `This generation costs ${cost} credits — top up to continue`,
      );
      setTopUpOpen(true);
      return;
    }
    const result = await generate.mutateAsync({ prompt: clean, size });
    if (result.creditBalance !== undefined)
      setCreditBalance(result.creditBalance);
    if (!result.ok || !result.imageUrl) {
      toast.error(result.error ?? "Generation failed");
      if (result.error?.toLowerCase().includes("insufficient"))
        setTopUpOpen(true);
      return;
    }
    const local = await localizeImage(result.imageUrl);
    setBackgroundImage(activeSide, local);
    setGallery((g) =>
      [
        {
          id: `${Date.now()}`,
          url: local,
          prompt: clean,
          revised: result.revisedPrompt,
        },
        ...g,
      ].slice(0, 12),
    );
    toast.success(
      `Background applied · ${Number(result.creditsCharged)} credits used`,
    );
  }

  async function applyAsLogo(item: Generated) {
    setBusyLogo(item.id);
    const cleaned = await removeWhiteBackground(item.url);
    setBusyLogo(null);
    if (!cleaned) {
      toast.error(
        "Could not process this image for transparency; adding it as-is",
      );
      addLogo(activeSide, item.url, { width: 160, height: 160 });
      return;
    }
    addLogo(activeSide, cleaned, { width: 160, height: 160 });
    toast.success("Added as a transparent logo layer");
  }

  return (
    <div className="space-y-4" data-ocid="canvas.ai_studio">
      {config.data && !config.data.openAiConfigured && (
        <p className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs">
          The OpenAI API key isn't configured yet (Admin → OpenAI API Key).
          Generations will fail until it is set.
        </p>
      )}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Industry quick-prompts</Label>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q.industry}
              type="button"
              onClick={() => setPrompt(q.prompt)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-smooth hover:border-primary",
                prompt === q.prompt && "border-primary bg-primary/10",
              )}
              data-ocid={`canvas.ai.quick_prompt.${q.industry.toLowerCase().replace(/[^a-z]+/g, "_")}`}
            >
              {q.industry}
            </button>
          ))}
        </div>
      </div>
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
        rows={3}
        placeholder="Describe the background art: subject, lighting, mood, and where you want empty space for text…"
        data-ocid="canvas.ai.prompt"
      />
      <div className="grid gap-2 sm:grid-cols-3">
        {SIZES.map((s) => (
          <button
            key={s.size}
            type="button"
            onClick={() => setSize(s.size)}
            className={cn(
              "rounded-lg border p-2.5 text-left text-xs transition-smooth",
              size === s.size
                ? "border-primary bg-primary/10"
                : "hover:border-primary/50",
            )}
            data-ocid={`canvas.ai.size.${s.size}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">{s.label}</span>
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                {s.credits} cr
              </span>
            </div>
            <span className="text-muted-foreground">{s.hint}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleGenerate}
          disabled={generate.isPending}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          data-ocid="canvas.ai.generate"
        >
          {generate.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Wand2 className="size-4" />
          )}
          Generate with AI · {cost} credits
        </Button>
        <span className="text-xs text-muted-foreground">
          Balance: <strong>{creditBalance}</strong> credits · applies to the{" "}
          <strong>{activeSide}</strong> side beneath the print guides
        </span>
      </div>
      {gallery.length > 0 && (
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
            This session
          </Label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {gallery.map((g) => (
              <div
                key={g.id}
                className="group relative overflow-hidden rounded-md border"
                data-ocid={`canvas.ai.gallery.${g.id}`}
              >
                <img
                  src={g.url}
                  alt={g.prompt}
                  className="aspect-square w-full object-cover"
                  title={g.revised ?? g.prompt}
                />
                <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => setBackgroundImage(activeSide, g.url)}
                    className="inline-flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium"
                    data-ocid={`canvas.ai.gallery.apply.${g.id}`}
                  >
                    <ImagePlus className="size-3" /> Background
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAsLogo(g)}
                    disabled={busyLogo === g.id}
                    className="inline-flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium"
                    data-ocid={`canvas.ai.gallery.logo.${g.id}`}
                  >
                    {busyLogo === g.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Stamp className="size-3" />
                    )}{" "}
                    Logo
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            <Sparkles className="mr-1 inline size-3 text-primary" />
            “Logo” strips near-white backgrounds so a generated badge or seal
            sits cleanly on your card.
          </p>
        </div>
      )}
    </div>
  );
}
