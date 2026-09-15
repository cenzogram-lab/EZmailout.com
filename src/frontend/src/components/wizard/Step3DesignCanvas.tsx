import { createActor } from "@/backend";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import type { ProductType } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import {
  ArrowRight,
  FlipHorizontal,
  ImagePlus,
  Info,
  Move,
  QrCode,
  RotateCcw,
  RotateCw,
  Type,
  Upload,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";

interface CanvasSize {
  width: number;
  height: number;
}

function getCanvasSize(layoutVariant: string): CanvasSize {
  switch (layoutVariant) {
    case "4x6":
      return { width: 400, height: 600 };
    case "6x9":
      return { width: 450, height: 675 };
    case "6x11":
      return { width: 450, height: 733 };
    case "letter":
      return { width: 550, height: 712 };
    case "6x18_bifold":
      return { width: 600, height: 200 };
    case "11x17_trifold":
      return { width: 600, height: 181 };
    case "8.5x11_perforated":
      return { width: 550, height: 712 };
    case "multi_page":
      return { width: 550, height: 712 };
    default:
      return { width: 450, height: 675 };
  }
}

interface TextBlockItem {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
}

interface QrCodeState {
  visible: boolean;
  x: number;
  y: number;
  size: number;
}

interface LogoItem {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DragState {
  active: boolean;
  id: string | null;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
}

type ResizeCorner = "se" | "sw" | "ne" | "nw";

interface ResizeState {
  active: boolean;
  id: string | null;
  corner: ResizeCorner | null;
  startX: number;
  startY: number;
  initialWidth: number;
  initialHeight: number;
  initialFontSize: number;
}

const DRAG_IDLE: DragState = {
  active: false,
  id: null,
  startX: 0,
  startY: 0,
  initialX: 0,
  initialY: 0,
};

const RESIZE_IDLE: ResizeState = {
  active: false,
  id: null,
  corner: null,
  startX: 0,
  startY: 0,
  initialWidth: 0,
  initialHeight: 0,
  initialFontSize: 0,
};

const HANDLE_SIZE = 8;

export function Step3DesignCanvas() {
  const { selectedLayout, setDesignTemplate, setStep } = useWizardStore();
  const { actor } = useActor(createActor);

  const layout = selectedLayout ?? "6x9";
  const canvasSize = getCanvasSize(layout);

  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [textBlocks, setTextBlocks] = useState<TextBlockItem[]>([]);
  const [logos, setLogos] = useState<LogoItem[]>([]);
  const [qrCode, setQrCode] = useState<QrCodeState>({
    visible: false,
    x: 20,
    y: 20,
    size: 80,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState>(DRAG_IDLE);
  const [resize, setResize] = useState<ResizeState>(RESIZE_IDLE);

  // 3D preview state
  const [rotationY, setRotationY] = useState(0);
  const [rotationX, setRotationX] = useState(-5);
  const [isInteracting, setIsInteracting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Restore canvas from backend on mount
  useEffect(() => {
    if (!actor) return;
    const campaignId = sessionStorage.getItem("mc_current_campaign_id");
    if (!campaignId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actorAny = actor as any;
    if (typeof actorAny.getCanvasState !== "function") return;
    actorAny
      .getCanvasState(campaignId)
      .then(
        (
          result: {
            backgroundImageUrl?: string;
            logos: Array<{
              id: string;
              url: string;
              x: number;
              y: number;
              width: number;
              height: number;
            }>;
            textBlocks: Array<{
              id: string;
              text: string;
              x: number;
              y: number;
              width: number;
              height: number;
              fontSize: number;
              color: string;
            }>;
            qrCode?: {
              id: string;
              x: number;
              y: number;
              url: string;
              size: number;
            };
          } | null,
        ) => {
          if (!result) return;
          if (result.textBlocks?.length) {
            setTextBlocks(
              result.textBlocks.map((t) => ({
                id: t.id,
                text: t.text,
                x: t.x,
                y: t.y,
                width: t.width || 120,
                height: t.height || 32,
                fontSize: t.fontSize || 16,
                color: t.color || "#ffffff",
              })),
            );
          }
          if (result.backgroundImageUrl)
            setBackgroundUrl(result.backgroundImageUrl);
          if (result.qrCode) {
            setQrCode({
              visible: true,
              x: result.qrCode.x,
              y: result.qrCode.y,
              size: result.qrCode.size || 80,
            });
          }
          if (result.logos?.length) {
            setLogos(
              result.logos.map((l) => ({
                id: l.id,
                url: l.url,
                x: l.x,
                y: l.y,
                width: l.width || 100,
                height: l.height || 100,
              })),
            );
          }
        },
      )
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor]);

  // Generate QR code image when visible or size changes
  useEffect(() => {
    if (qrCode.visible && qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        "https://mailcommand.app/track/{{recipientId}}",
        {
          width: qrCode.size,
          margin: 1,
          color: { dark: "#000000", light: "#ffffff" },
        },
      ).catch(() => {});
    }
  }, [qrCode.visible, qrCode.size]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) return;
      setBackgroundUrl(URL.createObjectURL(file));
      e.target.value = "";
    },
    [],
  );

  const handleLogoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      setLogos((prev) => [
        ...prev,
        {
          id: `logo-${Date.now()}`,
          url,
          x: 30,
          y: 30 + prev.length * 20,
          width: 100,
          height: 100,
        },
      ]);
      e.target.value = "";
    },
    [],
  );

  const handleAddTextBlock = useCallback(() => {
    const id = `tb-${Date.now()}`;
    setTextBlocks((prev) => [
      ...prev,
      {
        id,
        text: "Edit me",
        x: 20,
        y: 20 + prev.length * 40,
        width: 120,
        height: 32,
        fontSize: 16,
        color: "#ffffff",
      },
    ]);
  }, []);

  const handleToggleQr = useCallback(() => {
    setQrCode((prev) => ({ ...prev, visible: !prev.visible }));
  }, []);

  const handleDeleteText = useCallback((id: string) => {
    setTextBlocks((prev) => prev.filter((t) => t.id !== id));
    setSelectedId((s) => (s === id ? null : s));
  }, []);

  const handleDeleteLogo = useCallback((id: string) => {
    setLogos((prev) => prev.filter((l) => l.id !== id));
    setSelectedId((s) => (s === id ? null : s));
  }, []);

  const handleTextChange = useCallback((id: string, value: string) => {
    setTextBlocks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, text: value } : t)),
    );
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedId(id);
      const el = textBlocks.find((t) => t.id === id);
      if (!el) return;
      setDrag({
        active: true,
        id,
        startX: e.clientX,
        startY: e.clientY,
        initialX: el.x,
        initialY: el.y,
      });
    },
    [textBlocks],
  );

  const handleLogoMouseDown = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedId(id);
      const el = logos.find((l) => l.id === id);
      if (!el) return;
      setDrag({
        active: true,
        id: `logo-drag-${id}`,
        startX: e.clientX,
        startY: e.clientY,
        initialX: el.x,
        initialY: el.y,
      });
    },
    [logos],
  );

  const handleQrMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedId("qr");
      setDrag({
        active: true,
        id: "qr",
        startX: e.clientX,
        startY: e.clientY,
        initialX: qrCode.x,
        initialY: qrCode.y,
      });
    },
    [qrCode.x, qrCode.y],
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, id: string, corner: ResizeCorner) => {
      e.preventDefault();
      e.stopPropagation();
      const el = textBlocks.find((t) => t.id === id);
      if (!el) return;
      setResize({
        active: true,
        id,
        corner,
        startX: e.clientX,
        startY: e.clientY,
        initialWidth: el.width,
        initialHeight: el.height,
        initialFontSize: el.fontSize,
      });
    },
    [textBlocks],
  );

  const handleLogoResizeMouseDown = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      const el = logos.find((l) => l.id === id);
      if (!el) return;
      setResize({
        active: true,
        id: `logo-resize-${id}`,
        corner: "se",
        startX: e.clientX,
        startY: e.clientY,
        initialWidth: el.width,
        initialHeight: el.height,
        initialFontSize: 0,
      });
    },
    [logos],
  );

  const handleQrResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResize({
        active: true,
        id: "qr-resize",
        corner: "se",
        startX: e.clientX,
        startY: e.clientY,
        initialWidth: qrCode.size,
        initialHeight: qrCode.size,
        initialFontSize: 0,
      });
    },
    [qrCode.size],
  );

  // Unified drag + resize mouse tracking
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (drag.active) {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (drag.id === "qr") {
          setQrCode((prev) => ({
            ...prev,
            x: Math.max(0, drag.initialX + dx),
            y: Math.max(0, drag.initialY + dy),
          }));
        } else if (drag.id?.startsWith("logo-drag-")) {
          const logoId = drag.id.replace("logo-drag-", "");
          setLogos((prev) =>
            prev.map((l) =>
              l.id === logoId
                ? {
                    ...l,
                    x: Math.max(0, drag.initialX + dx),
                    y: Math.max(0, drag.initialY + dy),
                  }
                : l,
            ),
          );
        } else {
          setTextBlocks((prev) =>
            prev.map((t) =>
              t.id === drag.id
                ? {
                    ...t,
                    x: Math.max(0, drag.initialX + dx),
                    y: Math.max(0, drag.initialY + dy),
                  }
                : t,
            ),
          );
        }
        return;
      }
      if (resize.active && resize.id && resize.corner) {
        const dx = e.clientX - resize.startX;
        const dy = e.clientY - resize.startY;
        if (resize.id === "qr-resize") {
          setQrCode((prev) => ({
            ...prev,
            size: Math.max(40, Math.min(200, resize.initialWidth + dx)),
          }));
          return;
        }
        if (resize.id.startsWith("logo-resize-")) {
          const logoId = resize.id.replace("logo-resize-", "");
          setLogos((prev) =>
            prev.map((l) =>
              l.id === logoId
                ? {
                    ...l,
                    width: Math.max(30, resize.initialWidth + dx),
                    height: Math.max(30, resize.initialHeight + dy),
                  }
                : l,
            ),
          );
          return;
        }
        setTextBlocks((prev) =>
          prev.map((t) => {
            if (t.id !== resize.id) return t;
            let w = t.width;
            let h = t.height;
            let fs = t.fontSize;
            switch (resize.corner) {
              case "se":
                w = Math.max(60, resize.initialWidth + dx);
                h = Math.max(24, resize.initialHeight + dy);
                fs = Math.max(8, resize.initialFontSize + dy / 4);
                break;
              case "sw":
                w = Math.max(60, resize.initialWidth - dx);
                h = Math.max(24, resize.initialHeight + dy);
                fs = Math.max(8, resize.initialFontSize + dy / 4);
                break;
              case "ne":
                w = Math.max(60, resize.initialWidth + dx);
                h = Math.max(24, resize.initialHeight - dy);
                fs = Math.max(8, resize.initialFontSize - dy / 4);
                break;
              case "nw":
                w = Math.max(60, resize.initialWidth - dx);
                h = Math.max(24, resize.initialHeight - dy);
                fs = Math.max(8, resize.initialFontSize - dy / 4);
                break;
            }
            return { ...t, width: w, height: h, fontSize: fs };
          }),
        );
      }
    }
    function onMouseUp() {
      setDrag(DRAG_IDLE);
      setResize(RESIZE_IDLE);
    }
    const active = drag.active || resize.active;
    if (active) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [drag, resize]);

  // 3D preview hover parallax
  const handlePreviewMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const pct = y / rect.height;
      const tilt = (pct - 0.5) * 20; // ±10deg
      setRotationX(-5 + tilt);
    },
    [],
  );

  const handlePreviewMouseLeave = useCallback(() => {
    setRotationX(-5);
  }, []);

  const handleRotateLeft = useCallback(() => {
    setIsInteracting(true);
    setRotationY((prev) => prev - 25);
    setTimeout(() => setIsInteracting(false), 600);
  }, []);

  const handleRotateRight = useCallback(() => {
    setIsInteracting(true);
    setRotationY((prev) => prev + 25);
    setTimeout(() => setIsInteracting(false), 600);
  }, []);

  const handleFlipCard = useCallback(() => {
    setIsInteracting(true);
    setRotationY((prev) => prev + 180);
    setTimeout(() => setIsInteracting(false), 600);
  }, []);

  const handleContinue = useCallback(() => {
    setDesignTemplate({
      id: `design-${Date.now()}`,
      name: "Custom Design",
      category: "Custom",
      productType: "Postcard" as ProductType,
      layoutVariant: layout,
      thumbnailDescription: "User-created custom design",
      backgroundColor: "#1e293b",
      textBlocks: textBlocks.map((t) => ({
        id: t.id,
        text: t.text,
        x: t.x,
        y: t.y,
        width: t.width,
        height: t.height,
        fontSize: t.fontSize,
        color: t.color,
      })),
      hasQrCode: qrCode.visible,
      backgroundImage: backgroundUrl,
      qrCode: qrCode.visible
        ? {
            id: "qr-1",
            x: qrCode.x,
            y: qrCode.y,
            url: "https://mailcommand.app/track/{{recipientId}}",
            size: qrCode.size,
          }
        : null,
    });
    // Fire-and-forget canvas persistence
    const campaignId = sessionStorage.getItem("mc_current_campaign_id");
    if (actor && campaignId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const actorAny = actor as any;
      if (typeof actorAny.saveCanvasState === "function") {
        actorAny
          .saveCanvasState(campaignId, {
            backgroundImageUrl: backgroundUrl ?? undefined,
            logos: logos.map((l) => ({
              id: l.id,
              url: l.url,
              x: l.x,
              y: l.y,
              width: l.width,
              height: l.height,
            })),
            textBlocks: textBlocks.map((t) => ({
              id: t.id,
              text: t.text,
              x: t.x,
              y: t.y,
              width: t.width,
              height: t.height,
              fontSize: t.fontSize,
              color: t.color,
            })),
            qrCode: qrCode.visible
              ? {
                  id: "qr-1",
                  x: qrCode.x,
                  y: qrCode.y,
                  url: "https://mailcommand.app/track/{{recipientId}}",
                  size: qrCode.size,
                }
              : undefined,
          })
          .catch(() => {});
      }
    }
    setStep(4);
  }, [
    actor,
    backgroundUrl,
    logos,
    textBlocks,
    qrCode,
    setDesignTemplate,
    setStep,
    layout,
  ]);

  const bleedInset = Math.round(canvasSize.width * 0.04); // ~0.125" scaled
  const cutInset = Math.round(canvasSize.width * 0.08); // ~0.25" scaled
  const safeInset = Math.round(canvasSize.width * 0.12); // ~0.375" scaled

  // 3D preview scale factor to fit in panel
  const previewScale = Math.min(
    320 / canvasSize.width,
    420 / canvasSize.height,
    1,
  );
  const previewWidth = Math.round(canvasSize.width * previewScale);
  const previewHeight = Math.round(canvasSize.height * previewScale);

  // Resize handle sub-renderer
  function ResizeHandles({
    id,
    onResizeStart,
    corners = ["nw", "ne", "sw", "se"] as ResizeCorner[],
  }: {
    id: string;
    onResizeStart: (e: React.MouseEvent, corner: ResizeCorner) => void;
    corners?: ResizeCorner[];
  }) {
    const positions: Record<ResizeCorner, React.CSSProperties> = {
      nw: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 },
      ne: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 },
      sw: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 },
      se: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 },
    };
    const cursors: Record<ResizeCorner, string> = {
      nw: "nw-resize",
      ne: "ne-resize",
      sw: "sw-resize",
      se: "se-resize",
    };
    return (
      <>
        {corners.map((corner) => (
          <div
            key={`${id}-${corner}`}
            className="absolute z-10 rounded-sm bg-blue-400 shadow"
            style={{
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              cursor: cursors[corner],
              ...positions[corner],
            }}
            onMouseDown={(e) => onResizeStart(e, corner)}
          />
        ))}
      </>
    );
  }

  return (
    <div
      className="space-y-6"
      role="presentation"
      onClick={() => {
        if (!editingId) setSelectedId(null);
      }}
      onKeyDown={() => {
        if (!editingId) setSelectedId(null);
      }}
    >
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Design Your Mail Piece
        </h2>
        <p className="mt-2 text-muted-foreground">
          Upload a background, add text, logos, and place a QR code on the
          canvas.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          data-ocid="canvas.upload_input"
        />
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          data-ocid="canvas.upload_button"
          className="gap-2"
        >
          <Upload className="size-4" /> Upload Background
        </Button>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/png,image/webp"
          className="hidden"
          onChange={handleLogoChange}
          data-ocid="canvas.logo_upload_input"
        />
        <Button
          variant="secondary"
          onClick={() => logoInputRef.current?.click()}
          data-ocid="canvas.logo_upload_button"
          className="gap-2"
        >
          <ImagePlus className="size-4" /> Upload Logo PNG
        </Button>
        <Button
          variant="secondary"
          onClick={handleAddTextBlock}
          data-ocid="canvas.add_text_button"
          className="gap-2"
        >
          <Type className="size-4" /> Add Text Block
        </Button>
        <Button
          variant={qrCode.visible ? "default" : "secondary"}
          onClick={handleToggleQr}
          data-ocid="canvas.toggle_qr_button"
          className="gap-2"
        >
          <QrCode className="size-4" />{" "}
          {qrCode.visible ? "Hide QR Code" : "Toggle QR Code"}
        </Button>
      </div>

      {/* Two-column layout: 2D editor + 3D preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: 2D Canvas Editor */}
        <div className="space-y-4">
          <div className="flex justify-center overflow-auto rounded-lg border border-border bg-muted/30 p-4">
            <div
              ref={canvasRef}
              className="relative"
              style={{
                width: canvasSize.width,
                height: canvasSize.height,
                backgroundColor: "#1e293b",
                backgroundImage: backgroundUrl
                  ? `url(${backgroundUrl})`
                  : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="presentation"
            >
              {/* Bleed line */}
              <div
                className="pointer-events-none absolute flex items-start justify-start"
                style={{
                  inset: bleedInset,
                  border: "1px dashed rgba(239,68,68,0.7)",
                }}
              >
                <span className="bg-red-500/80 px-1 text-[10px] font-medium text-white">
                  Bleed
                </span>
              </div>

              {/* Cut line */}
              <div
                className="pointer-events-none absolute flex items-start justify-start"
                style={{
                  inset: cutInset,
                  border: "1px dashed rgba(249,115,22,0.7)",
                }}
              >
                <span className="bg-orange-500/80 px-1 text-[10px] font-medium text-white">
                  Cut
                </span>
              </div>

              {/* Safe zone */}
              <div
                className="pointer-events-none absolute flex items-start justify-start"
                style={{
                  inset: safeInset,
                  border: "1px dashed rgba(34,197,94,0.7)",
                }}
              >
                <span className="bg-green-500/80 px-1 text-[10px] font-medium text-white">
                  Safe
                </span>
              </div>

              {/* Logo layers */}
              {logos.map((logo) => (
                <div
                  key={logo.id}
                  className={cn(
                    "absolute cursor-move select-none",
                    selectedId === logo.id
                      ? "outline outline-2 outline-offset-1 outline-blue-400"
                      : "",
                  )}
                  style={{
                    left: logo.x,
                    top: logo.y,
                    width: logo.width,
                    height: logo.height,
                  }}
                  onMouseDown={(e) => handleLogoMouseDown(e, logo.id)}
                  data-ocid={`canvas.logo.${logo.id}`}
                >
                  <img
                    src={logo.url}
                    alt="Logo"
                    className="h-full w-full"
                    style={{ objectFit: "contain" }}
                    draggable={false}
                  />
                  <button
                    type="button"
                    className="absolute -right-2 -top-2 flex size-4 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLogo(logo.id);
                    }}
                    aria-label="Delete logo"
                  >
                    <X className="size-2.5" />
                  </button>
                  {selectedId === logo.id && (
                    <div
                      className="absolute -bottom-1 -right-1 z-10 cursor-se-resize rounded-sm bg-blue-400 shadow"
                      style={{ width: HANDLE_SIZE, height: HANDLE_SIZE }}
                      onMouseDown={(e) => handleLogoResizeMouseDown(e, logo.id)}
                    />
                  )}
                </div>
              ))}

              {/* Text blocks */}
              {textBlocks.map((block) => (
                <div
                  key={block.id}
                  className={cn(
                    "absolute select-none rounded border",
                    selectedId === block.id || editingId === block.id
                      ? "cursor-default border-primary bg-primary/20"
                      : "cursor-move border-white/20 bg-black/50 hover:border-white/40",
                  )}
                  style={{
                    left: block.x,
                    top: block.y,
                    width: block.width,
                    height: block.height,
                    fontSize: block.fontSize,
                    color: block.color,
                  }}
                  onMouseDown={(e) => {
                    if (editingId === block.id) return;
                    handleMouseDown(e, block.id);
                  }}
                  onDoubleClick={() => setEditingId(block.id)}
                  data-ocid={`canvas.text_block.${block.id}`}
                >
                  <div className="flex h-full items-start gap-1 overflow-hidden px-1.5 py-0.5">
                    {editingId !== block.id && (
                      <Move className="mt-0.5 size-3 shrink-0 text-white/60" />
                    )}
                    {editingId === block.id ? (
                      <input
                        value={block.text}
                        onChange={(e) =>
                          handleTextChange(block.id, e.target.value)
                        }
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setEditingId(null);
                        }}
                        className="h-full w-full bg-transparent font-medium outline-none"
                        style={{ fontSize: block.fontSize, color: block.color }}
                        data-ocid={`canvas.text_input.${block.id}`}
                      />
                    ) : (
                      <span
                        className="truncate font-medium"
                        style={{ fontSize: block.fontSize, color: block.color }}
                      >
                        {block.text}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteText(block.id);
                      }}
                      className="ml-auto shrink-0 rounded p-0.5 text-white/60 hover:bg-red-500/80 hover:text-white"
                      data-ocid={`canvas.text_delete.${block.id}`}
                      aria-label="Delete text block"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                  {selectedId === block.id && (
                    <ResizeHandles
                      id={block.id}
                      onResizeStart={(e, corner) =>
                        handleResizeMouseDown(e, block.id, corner)
                      }
                    />
                  )}
                </div>
              ))}

              {/* QR Code */}
              {qrCode.visible && (
                <div
                  className={cn(
                    "absolute cursor-move rounded border border-white/20 bg-white p-1 shadow-sm",
                    selectedId === "qr"
                      ? "outline outline-2 outline-offset-1 outline-blue-400"
                      : "",
                  )}
                  style={{ left: qrCode.x, top: qrCode.y }}
                  onMouseDown={handleQrMouseDown}
                  data-ocid="canvas.qr_code"
                >
                  <canvas
                    ref={qrCanvasRef}
                    width={qrCode.size}
                    height={qrCode.size}
                  />
                  {selectedId === "qr" && (
                    <div
                      className="absolute -bottom-1 -right-1 z-10 cursor-se-resize rounded-sm bg-blue-400 shadow"
                      style={{ width: HANDLE_SIZE, height: HANDLE_SIZE }}
                      onMouseDown={handleQrResizeMouseDown}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 border-t border-dashed border-red-500" />
              <span>Bleed line</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 border-t border-dashed border-orange-500" />
              <span>Cut line</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 border-t border-dashed border-green-500" />
              <span>Safe zone</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-sm bg-blue-400" />
              <span>Drag to move · handles to resize</span>
            </div>
          </div>
        </div>

        {/* Right: 3D Preview Panel */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-semibold text-foreground">
              3D Preview
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <Info className="size-3" />
              Inspect your mail piece as if holding it
            </span>
          </div>

          <div
            ref={previewRef}
            className="perspective-3d flex flex-1 items-center justify-center rounded-lg border border-border bg-muted/20 p-6"
            style={{ minHeight: 420, width: "100%" }}
            onMouseMove={handlePreviewMouseMove}
            onMouseLeave={handlePreviewMouseLeave}
            data-ocid="canvas.preview_3d_panel"
          >
            <div
              className={cn(
                "preserve-3d relative",
                !isInteracting && "animate-card-float",
              )}
              style={{
                width: previewWidth,
                height: previewHeight,
                transform: `rotateY(${rotationY}deg) rotateX(${rotationX}deg)`,
                transition: isInteracting
                  ? "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
                  : "transform 0.3s ease-out",
              }}
            >
              {/* Front face */}
              <div
                className="backface-hidden absolute inset-0 overflow-hidden rounded shadow-2xl"
                style={{
                  backgroundColor: "#1e293b",
                  backgroundImage: backgroundUrl
                    ? `url(${backgroundUrl})`
                    : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {/* Bleed line on 3D face */}
                <div
                  className="pointer-events-none absolute flex items-start justify-start"
                  style={{
                    inset: Math.round(bleedInset * previewScale),
                    border: "1px dashed rgba(239,68,68,0.7)",
                  }}
                >
                  <span className="bg-red-500/80 px-1 text-[8px] font-medium text-white">
                    Bleed
                  </span>
                </div>

                {/* Cut line on 3D face */}
                <div
                  className="pointer-events-none absolute flex items-start justify-start"
                  style={{
                    inset: Math.round(cutInset * previewScale),
                    border: "1px dashed rgba(249,115,22,0.7)",
                  }}
                >
                  <span className="bg-orange-500/80 px-1 text-[8px] font-medium text-white">
                    Cut
                  </span>
                </div>

                {/* Safe zone on 3D face */}
                <div
                  className="pointer-events-none absolute flex items-start justify-start"
                  style={{
                    inset: Math.round(safeInset * previewScale),
                    border: "1px dashed rgba(34,197,94,0.7)",
                  }}
                >
                  <span className="bg-green-500/80 px-1 text-[8px] font-medium text-white">
                    Safe
                  </span>
                </div>

                {/* Logo layers on 3D face */}
                {logos.map((logo) => (
                  <img
                    key={`3d-logo-${logo.id}`}
                    src={logo.url}
                    alt="Logo"
                    className="pointer-events-none absolute"
                    style={{
                      left: Math.round(logo.x * previewScale),
                      top: Math.round(logo.y * previewScale),
                      width: Math.round(logo.width * previewScale),
                      height: Math.round(logo.height * previewScale),
                      objectFit: "contain",
                    }}
                  />
                ))}

                {/* Text blocks on 3D face */}
                {textBlocks.map((block) => (
                  <div
                    key={`3d-${block.id}`}
                    className="pointer-events-none absolute overflow-hidden rounded bg-primary/80 px-1 font-semibold text-white shadow"
                    style={{
                      left: Math.round(block.x * previewScale),
                      top: Math.round(block.y * previewScale),
                      width: Math.round(block.width * previewScale),
                      height: Math.round(block.height * previewScale),
                      fontSize: Math.round(block.fontSize * previewScale),
                      color: block.color,
                    }}
                  >
                    {block.text}
                  </div>
                ))}

                {/* QR code on 3D face */}
                {qrCode.visible && (
                  <div
                    className="pointer-events-none absolute rounded border border-white/30 bg-white p-0.5 shadow"
                    style={{
                      left: Math.round(qrCode.x * previewScale),
                      top: Math.round(qrCode.y * previewScale),
                    }}
                  >
                    <div
                      className="bg-foreground"
                      style={{
                        width: Math.round(qrCode.size * previewScale),
                        height: Math.round(qrCode.size * previewScale),
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Back face */}
              <div
                className="backface-hidden absolute inset-0 flex items-center justify-center rounded shadow-2xl"
                style={{
                  backgroundColor: "#0f172a",
                  transform: "rotateY(180deg)",
                }}
              >
                <div className="text-center">
                  <div className="font-display text-lg font-bold text-primary">
                    MailCommand
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    Powered by Lob
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3D Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotateLeft}
              data-ocid="canvas.preview_rotate_left"
              className="gap-1.5"
            >
              <RotateCcw className="size-3.5" />
              Rotate Left
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotateRight}
              data-ocid="canvas.preview_rotate_right"
              className="gap-1.5"
            >
              <RotateCw className="size-3.5" />
              Rotate Right
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFlipCard}
              data-ocid="canvas.preview_flip"
              className="gap-1.5"
            >
              <FlipHorizontal className="size-3.5" />
              Flip Card Over
            </Button>
          </div>
        </div>
      </div>

      {/* Continue */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleContinue}
          data-ocid="canvas.continue_button"
          className="gap-2"
        >
          Continue to Review
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
