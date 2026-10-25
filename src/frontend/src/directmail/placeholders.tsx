import { type CSSProperties, type ReactNode, useId } from "react";
import { alpha, mix } from "./color";
import { Illustration, hasIllustration } from "./illustrations";
import type { ResolvedTheme } from "./theme";
import type { PhotoTreatment } from "./types";

/* ------------------------------------------------------------------ */
/* Deterministic pseudo-random                                         */
/* ------------------------------------------------------------------ */
export function seeded(seed: number) {
  let s = (seed * 9301 + 49297) % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const star4 = (x: number, y: number, s: number) =>
  `M${x} ${y - s}L${x + s * 0.22} ${y - s * 0.22}L${x + s} ${y}L${x + s * 0.22} ${y + s * 0.22}L${x} ${y + s}L${x - s * 0.22} ${y + s * 0.22}L${x - s} ${y}L${x - s * 0.22} ${y - s * 0.22}Z`;
const leafPath = (x: number, y: number, s: number) =>
  `M${x} ${y - s}q${s * 0.9} ${s * 0.7} 0 ${s * 2}q${-s * 0.9} ${-s * 1.3} 0 ${-s * 2}z`;

/* ------------------------------------------------------------------ */
/* Pattern layer — fills its positioned parent                          */
/* ------------------------------------------------------------------ */

/** An SVG that tiles `children` (one `tile` × `tile` cell) over w × h. */
function TiledPattern({
  w,
  h,
  tile,
  rotate,
  style,
  children,
}: {
  w: number;
  h: number;
  tile: number;
  rotate?: number;
  style: CSSProperties;
  children: ReactNode;
}) {
  const id = `p${useId().replace(/:/g, "")}`;
  return (
    <svg
      aria-hidden="true"
      style={style}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
    >
      <defs>
        <pattern
          id={id}
          width={tile}
          height={tile}
          patternUnits="userSpaceOnUse"
          patternTransform={rotate ? `rotate(${rotate})` : undefined}
        >
          {children}
        </pattern>
      </defs>
      <rect width={w} height={h} fill={`url(#${id})`} />
    </svg>
  );
}

export function Pattern({
  t,
  w,
  h,
  kind,
  tint,
  opacity,
  scale,
  style,
}: {
  t: ResolvedTheme;
  w: number;
  h: number;
  kind?: ResolvedTheme["pattern"]["kind"];
  tint?: string;
  opacity?: number;
  scale?: number;
  style?: CSSProperties;
}) {
  const k = kind ?? t.pattern.kind;
  const col = alpha(tint ?? t.pattern.tint, opacity ?? t.pattern.opacity);
  const sc = (scale ?? t.pattern.scale) * Math.max(0.6, Math.min(w, h) / 420);
  const base: CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    ...style,
  };
  switch (k) {
    // Tiled patterns are drawn as SVG, not CSS gradients: the studio turns a
    // template into vector layers, and SVG survives that (and the 300 DPI
    // export) exactly, where repeating and conic gradients have no SVG form.
    case "chevron": {
      const s = Math.round(26 * sc);
      return (
        <TiledPattern style={base} w={w} h={h} tile={s}>
          <polygon
            points={`0,0 ${s / 2},${s / 2} ${s},0 ${s},${s / 2} ${s / 2},${s} 0,${s / 2}`}
            fill={col}
          />
        </TiledPattern>
      );
    }
    case "stripes": {
      const s = Math.round(22 * sc);
      return (
        <TiledPattern style={base} w={w} h={h} tile={s} rotate={45}>
          <rect width={Math.round(6 * sc)} height={s} fill={col} />
        </TiledPattern>
      );
    }
    case "dots": {
      const s = Math.round(22 * sc);
      return (
        <TiledPattern style={base} w={w} h={h} tile={s}>
          <circle cx={s / 2} cy={s / 2} r={2.3 * sc} fill={col} />
        </TiledPattern>
      );
    }
    case "grid": {
      const s = Math.round(32 * sc);
      return (
        <TiledPattern style={base} w={w} h={h} tile={s}>
          <rect width={s} height={1} fill={col} />
          <rect width={1} height={s} fill={col} />
        </TiledPattern>
      );
    }
    case "checker": {
      const s = Math.round(40 * sc);
      return (
        <TiledPattern style={base} w={w} h={h} tile={s}>
          <rect x={s / 2} width={s / 2} height={s / 2} fill={col} />
          <rect y={s / 2} width={s / 2} height={s / 2} fill={col} />
        </TiledPattern>
      );
    }
    case "rings": {
      const cx = w * 0.85;
      const cy = h * 0.15;
      const step = 40 * sc;
      const far = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
      return (
        <svg
          aria-hidden="true"
          style={base}
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
        >
          {Array.from({ length: Math.ceil(far / step) }).map((_, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={i * step + 1}
              fill="none"
              stroke={col}
              strokeWidth={2}
            />
          ))}
        </svg>
      );
    }
    case "sunburst": {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.hypot(w, h);
      const ray = (i: number) => {
        const a0 = ((i * 10 - 90) * Math.PI) / 180;
        const a1 = ((i * 10 - 85) * Math.PI) / 180;
        return `${cx},${cy} ${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)}`;
      };
      return (
        <svg
          aria-hidden="true"
          style={base}
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
        >
          {Array.from({ length: 36 }).map((_, i) => (
            <polygon key={i} points={ray(i)} fill={col} />
          ))}
        </svg>
      );
    }
    case "halftone": {
      const rows = Math.ceil(h / (18 * sc));
      const cols = Math.ceil(w / (18 * sc));
      const dots: ReactNode[] = [];
      for (let r = 0; r < rows; r++) {
        const rad = (2 + (r / rows) * 7) * sc;
        for (let c = 0; c < cols; c++)
          dots.push(
            <circle
              key={`${r}-${c}`}
              cx={c * 18 * sc + 9 * sc}
              cy={r * 18 * sc + 9 * sc}
              r={rad}
              fill={col}
            />,
          );
      }
      return (
        <svg
          aria-hidden="true"
          style={base}
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
        >
          {dots}
        </svg>
      );
    }
    case "memphis": {
      const rnd = seeded(23);
      const cols2 = [
        alpha(t.colors.accent, opacity ?? 0.9),
        alpha(t.colors.accent2, opacity ?? 0.9),
        alpha(t.ink, (opacity ?? 0.9) * 0.9),
      ];
      const items: ReactNode[] = [];
      for (let i = 0; i < 16; i++) {
        const x = rnd() * w;
        const y = rnd() * h;
        const s = (18 + rnd() * 40) * sc;
        const c = cols2[i % 3];
        const k2 = i % 5;
        if (k2 === 0)
          items.push(<circle key={i} cx={x} cy={y} r={s / 2} fill={c} />);
        else if (k2 === 1)
          items.push(
            <path
              key={i}
              d={`M${x} ${y}q${s / 3} ${-s / 2} ${(s * 2) / 3} 0t${(s * 2) / 3} 0t${(s * 2) / 3} 0`}
              fill="none"
              stroke={c}
              strokeWidth={4 * sc}
              strokeLinecap="round"
            />,
          );
        else if (k2 === 2)
          items.push(
            <path
              key={i}
              d={`M${x} ${y}l${s} 0 -${s / 2} -${s * 0.86}z`}
              fill={c}
              transform={`rotate(${rnd() * 360} ${x} ${y})`}
            />,
          );
        else if (k2 === 3)
          items.push(
            <path
              key={i}
              d={`M${x} ${y}a${s / 2} ${s / 2} 0 0 1 ${s} 0z`}
              fill={c}
              transform={`rotate(${rnd() * 360} ${x} ${y})`}
            />,
          );
        else
          items.push(
            <rect
              key={i}
              x={x}
              y={y}
              width={s * 0.5}
              height={s * 0.5}
              fill={c}
              transform={`rotate(${rnd() * 60} ${x} ${y})`}
            />,
          );
      }
      return (
        <svg
          aria-hidden="true"
          style={base}
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
        >
          {items}
        </svg>
      );
    }
    case "leaves": {
      const rnd = seeded(5);
      const n = Math.round((w * h) / (9000 / sc));
      return (
        <svg
          aria-hidden="true"
          style={base}
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
        >
          {Array.from({ length: n }).map((_, i) => {
            const x = rnd() * w;
            const y = rnd() * h;
            const s = (10 + rnd() * 14) * sc;
            return (
              <g
                key={i}
                transform={`rotate(${rnd() * 360} ${x} ${y})`}
                fill="none"
                stroke={col}
                strokeWidth={1.5 * sc}
                strokeLinejoin="round"
              >
                <path d={leafPath(x, y, s)} />
                <path d={`M${x} ${y - s * 0.8}V${y + s * 0.9}`} />
              </g>
            );
          })}
        </svg>
      );
    }
    case "florals": {
      const branch = (
        <g
          fill="none"
          stroke={col}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M-10 60C40 60 70 40 110 0" />
          <path d="M20 58c-6-16 2-26 14-30-4 14-2 22-14 30z" fill={col} />
          <path d="M44 48c-10-14-4-26 8-30-2 14 0 22-8 30z" />
          <path d="M70 32c-10-10-6-22 4-28 0 12 2 20-4 28z" fill={col} />
          <path d="M30 70c8-12 20-12 30-6-12 4-20 8-30 6z" />
          <path d="M58 56c8-8 20-6 26 2-12 2-18 4-26-2z" fill={col} />
          <circle cx="92" cy="18" r="5" />
          <circle cx="98" cy="8" r="3" fill={col} />
          <circle cx="12" cy="40" r="3.5" fill={col} />
        </g>
      );
      const s2 = 1.6 * sc;
      return (
        <svg
          aria-hidden="true"
          style={base}
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
        >
          <g transform={`translate(-6 -8) scale(${s2})`}>{branch}</g>
          <g
            transform={`translate(${w + 6} ${h + 8}) rotate(180) scale(${s2})`}
          >
            {branch}
          </g>
          <g transform={`translate(${w + 6} -8) rotate(90) scale(${s2 * 0.8})`}>
            {branch}
          </g>
          <g
            transform={`translate(-6 ${h + 8}) rotate(-90) scale(${s2 * 0.8})`}
          >
            {branch}
          </g>
        </svg>
      );
    }
    case "waves":
      return (
        <svg
          aria-hidden="true"
          style={base}
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
        >
          {Array.from({ length: Math.ceil(h / (28 * sc)) + 1 }).map((_, i) => {
            const y = i * 28 * sc;
            return (
              <path
                key={i}
                d={`M0 ${y} C ${w * 0.17} ${y - 16 * sc}, ${w * 0.33} ${y + 16 * sc}, ${w / 2} ${y} S ${w * 0.83} ${y - 16 * sc}, ${w} ${y}`}
                fill="none"
                stroke={col}
                strokeWidth={1.6 * sc}
              />
            );
          })}
        </svg>
      );
    case "topo":
      return (
        <svg
          aria-hidden="true"
          style={base}
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
        >
          {Array.from({ length: 9 }).map((_, i) => {
            const r = (30 + i * 34) * sc;
            const cx = w * 0.7;
            const cy = h * 0.4;
            return (
              <path
                key={i}
                d={`M${cx - r} ${cy} C ${cx - r} ${cy - r * 0.9}, ${cx + r * 0.6} ${cy - r * 1.1}, ${cx + r} ${cy} S ${cx + r * 0.4} ${cy + r * 1.1}, ${cx - r * 0.2} ${cy + r * 0.9} S ${cx - r} ${cy + r * 0.4}, ${cx - r} ${cy} Z`}
                fill="none"
                stroke={col}
                strokeWidth={1.4 * sc}
              />
            );
          })}
        </svg>
      );
    case "arches":
      return (
        <svg
          aria-hidden="true"
          style={base}
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
        >
          {Array.from({ length: 6 }).map((_, i) => {
            const aw = w - i * w * 0.13;
            const x = (w - aw) / 2;
            const top = h * 0.35 + i * 10 * sc;
            return (
              <path
                key={i}
                d={`M${x} ${h} V ${top} A ${aw / 2} ${aw / 2} 0 0 1 ${x + aw} ${top} V ${h}`}
                fill="none"
                stroke={col}
                strokeWidth={1.6 * sc}
              />
            );
          })}
        </svg>
      );
    case "confetti": {
      const rnd = seeded(7);
      const n = Math.round((w * h) / (6000 / sc));
      return (
        <svg
          aria-hidden="true"
          style={base}
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
        >
          {Array.from({ length: n }).map((_, i) => {
            const x = rnd() * w;
            const y = rnd() * h;
            const s = (5 + rnd() * 9) * sc;
            const fill =
              i % 2
                ? alpha(t.colors.accent, (opacity ?? 0.12) * 4)
                : alpha(t.colors.accent2, (opacity ?? 0.12) * 4);
            if (i % 3 === 0)
              return <circle key={i} cx={x} cy={y} r={s / 2} fill={fill} />;
            if (i % 3 === 1)
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={s}
                  height={s}
                  rx={2}
                  fill={fill}
                  transform={`rotate(${rnd() * 90} ${x} ${y})`}
                />
              );
            return (
              <path
                key={i}
                d={`M${x} ${y} l${s} ${s * 0.6} l-${s} ${s * 0.6} z`}
                fill={fill}
              />
            );
          })}
        </svg>
      );
    }
    case "sparkles": {
      const rnd = seeded(11);
      const n = Math.round((w * h) / (9000 / sc));
      const c2 = alpha(
        tint ?? t.pattern.tint,
        Math.min((opacity ?? 0.12) * 3, 0.7),
      );
      return (
        <svg
          aria-hidden="true"
          style={base}
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
        >
          {Array.from({ length: n }).map((_, i) => {
            const x = rnd() * w;
            const y = rnd() * h;
            const s = (4 + rnd() * 10) * sc;
            return i % 3 === 0 ? (
              <path
                key={i}
                d={star4(x, y, s)}
                fill="none"
                stroke={c2}
                strokeWidth={1.2}
              />
            ) : (
              <path key={i} d={star4(x, y, s)} fill={c2} />
            );
          })}
        </svg>
      );
    }
    case "none":
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Photo placeholder + image slot with treatment                       */
/* ------------------------------------------------------------------ */

export function Photo({
  t,
  seed = 0,
  style,
}: { t: ResolvedTheme; seed?: number; style?: CSSProperties }) {
  const id = useId().replace(/:/g, "");
  const rnd = seeded(31 + seed * 7);
  const base = mix(t.colors.surface, t.colors.accent, t.dark ? 0.3 : 0.22);
  const c1 = mix(base, t.colors.accent, 0.7);
  const c2 = mix(base, t.colors.accent2, 0.6);
  const c3 = mix(base, t.colors.text, t.dark ? 0.1 : 0.32);
  const hi = alpha(t.dark ? t.colors.text : "#FFFFFF", 0.55);
  const j = () => (rnd() - 0.5) * 26;
  return (
    <svg
      data-dm="photo"
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      style={{ display: "block", width: "100%", height: "100%", ...style }}
    >
      <defs>
        <filter id={`b${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <rect width="100" height="100" fill={base} />
      <g filter={`url(#b${id})`}>
        <circle cx={28 + j()} cy={34 + j()} r="30" fill={c1} />
        <circle cx={74 + j()} cy={28 + j()} r="24" fill={c2} />
        <circle cx={62 + j()} cy={78 + j()} r="30" fill={c3} />
        <circle cx={22 + j()} cy={74 + j()} r="18" fill={hi} />
        <circle cx={84 + j()} cy={60 + j()} r="9" fill={hi} />
      </g>
    </svg>
  );
}

function treatmentStyles(
  t: ResolvedTheme,
  treatment: PhotoTreatment,
): { img: CSSProperties; overlay?: CSSProperties } {
  switch (treatment) {
    case "duotone":
      return {
        img: { filter: "grayscale(1) contrast(1.05)" },
        overlay: {
          background: t.colors.accent,
          mixBlendMode: "color",
          opacity: 0.9,
        },
      };
    case "mono":
      return { img: { filter: "grayscale(1) contrast(1.08)" } };
    case "warm":
      return { img: { filter: "sepia(.35) saturate(1.1)" } };
    default:
      return { img: {} };
  }
}

/** Image slot: real image, illustration, or bokeh placeholder — with the theme's photo treatment. */
export function ImageSlot({
  t,
  src,
  illustration,
  seed = 0,
  alt = "",
  treatment,
  radius = 0,
  style,
  children,
}: {
  t: ResolvedTheme;
  src?: string;
  illustration?: string;
  seed?: number;
  alt?: string;
  treatment?: PhotoTreatment;
  radius?: number | string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const tr = treatmentStyles(t, treatment ?? t.photo);
  const useIllo = !src && hasIllustration(illustration);
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: radius,
        background: mix(t.colors.surface, t.colors.text, 0.06),
        ...style,
      }}
    >
      {src ? (
        <img
          data-dm="photo"
          src={src}
          alt={alt}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            ...tr.img,
          }}
        />
      ) : useIllo ? (
        <Illustration t={t} name={illustration!} />
      ) : (
        <div style={{ width: "100%", height: "100%", ...tr.img }}>
          <Photo t={t} seed={seed} />
        </div>
      )}
      {tr.overlay && !useIllo && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            ...tr.overlay,
          }}
        />
      )}
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

export function Starburst({
  t,
  lines,
  size = 120,
  color,
  textColor,
  rotate = -8,
  style,
}: {
  t: ResolvedTheme;
  lines: string[];
  size?: number;
  color?: string;
  textColor?: string;
  rotate?: number;
  style?: CSSProperties;
}) {
  const pts: string[] = [];
  const n = 16;
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? 50 : 42;
    const a = (Math.PI * i) / n;
    pts.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`);
  }
  const fill = color ?? t.colors.accent2;
  const fg = textColor ?? (color ? t.colors.onAccent : t.colors.onAccent2);
  const big = lines[0] ?? "";
  const rest = lines.slice(1);
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ transform: `rotate(${rotate}deg)`, flexShrink: 0, ...style }}
    >
      <polygon points={pts.join(" ")} fill={fill} />
      <text
        x="50"
        y={rest.length ? 48 : 54}
        textAnchor="middle"
        fontFamily={t.font.display}
        fontWeight="800"
        fontSize={big.length > 5 ? 16 : 22}
        fill={fg}
      >
        {big}
      </text>
      {rest.map((l, i) => (
        <text
          key={i}
          x="50"
          y={62 + i * 10}
          textAnchor="middle"
          fontFamily={t.font.body}
          fontWeight="700"
          fontSize="8.5"
          letterSpacing="0.6"
          fill={fg}
        >
          {l.toUpperCase()}
        </text>
      ))}
    </svg>
  );
}

export function CircleStamp({
  t,
  text,
  inner,
  size = 110,
  variant,
  style,
}: {
  t: ResolvedTheme;
  text: string;
  inner?: string;
  size?: number;
  variant?: "fill" | "outline";
  style?: CSSProperties;
}) {
  const id = useId().replace(/:/g, "");
  const v = variant ?? "fill";
  const fg = v === "fill" ? t.colors.onAccent2 : t.colors.text;
  const bg = v === "fill" ? t.colors.accent2 : "transparent";
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ flexShrink: 0, ...style }}
    >
      <defs>
        <path
          id={`c${id}`}
          d="M50 50m-35 0a35 35 0 1 1 70 0a35 35 0 1 1-70 0"
        />
      </defs>
      <circle
        cx="50"
        cy="50"
        r="49"
        fill={bg}
        stroke={v === "outline" ? t.colors.text : "none"}
        strokeWidth="1.5"
      />
      <circle
        cx="50"
        cy="50"
        r="27"
        fill="none"
        stroke={fg}
        strokeWidth="0.8"
        opacity="0.6"
      />
      <text
        fontFamily={t.font.body}
        fontSize="9.2"
        fontWeight="700"
        letterSpacing="1.8"
        fill={fg}
      >
        <textPath href={`#c${id}`}>{text.toUpperCase()}</textPath>
      </text>
      {inner ? (
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={t.font.accent}
          fontSize={t.scriptAccent ? 18 : 11}
          fontWeight={t.scriptAccent ? 400 : 700}
          fill={fg}
        >
          {inner}
        </text>
      ) : (
        <path
          d="M40 50h20M52 42l8 8-8 8"
          fill="none"
          stroke={fg}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function Ribbon({
  t,
  text,
  style,
  color,
  textColor,
  fontSize = 14,
}: {
  t: ResolvedTheme;
  text: string;
  style?: CSSProperties;
  color?: string;
  textColor?: string;
  fontSize?: number;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        background: color ?? t.colors.accent2,
        color: textColor ?? t.colors.onAccent2,
        fontFamily: t.font.body,
        fontWeight: 800,
        fontSize,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        padding: `${fontSize * 0.55}px ${fontSize * 1.2}px`,
        clipPath:
          "polygon(0 0, 100% 0, calc(100% - 10px) 50%, 100% 100%, 0 100%, 10px 50%)",
        ...style,
      }}
    >
      {text}
    </span>
  );
}

export function Tag({
  t,
  text,
  sub,
  style,
}: { t: ResolvedTheme; text: string; sub?: string; style?: CSSProperties }) {
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "10px 16px 10px 22px",
        background: t.colors.accent2,
        color: t.colors.onAccent2,
        clipPath: "polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 0 50%)",
        fontFamily: t.font.display,
        fontWeight: 800,
        ...style,
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1 }}>{text}</span>
      {sub && (
        <span
          style={{
            fontFamily: t.font.body,
            fontSize: 9,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {sub}
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* QR code (placeholder pattern or supplied SVG)                        */
/* ------------------------------------------------------------------ */

export function QrCode({
  t,
  svg,
  size = 72,
  style,
  light = false,
}: {
  t: ResolvedTheme;
  svg?: string;
  size?: number;
  style?: CSSProperties;
  light?: boolean;
}) {
  const fg = light ? "#FFFFFF" : "#111111";
  const bg = light ? "transparent" : "#FFFFFF";
  if (svg) {
    return (
      <div
        data-dm="qr"
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          background: bg,
          padding: light ? 0 : 4,
          boxSizing: "border-box",
          flexShrink: 0,
          ...style,
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }
  const rnd = seeded(97);
  const n = 21;
  const cells: ReactNode[] = [];
  const finder = (x: number, y: number) => (
    <g key={`f${x}${y}`}>
      <rect x={x} y={y} width="7" height="7" fill={fg} />
      <rect
        x={x + 1}
        y={y + 1}
        width="5"
        height="5"
        fill={bg === "transparent" ? t.colors.bg : bg}
      />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill={fg} />
    </g>
  );
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const inFinder =
        (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
      if (!inFinder && rnd() > 0.5)
        cells.push(
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fg} />,
        );
    }
  }
  return (
    <svg
      data-dm="qr"
      data-dm-light={light ? "" : undefined}
      aria-hidden="true"
      viewBox={`-1 -1 ${n + 2} ${n + 2}`}
      width={size}
      height={size}
      style={{ background: bg, flexShrink: 0, display: "block", ...style }}
      shapeRendering="crispEdges"
    >
      {cells}
      {finder(0, 0)}
      {finder(14, 0)}
      {finder(0, 14)}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Map + logo mark                                                     */
/* ------------------------------------------------------------------ */

export function MapPlaceholder({
  t,
  style,
}: { t: ResolvedTheme; style?: CSSProperties }) {
  const road = alpha(t.colors.text, t.dark ? 0.25 : 0.14);
  const land = mix(t.colors.surface, t.colors.accent, t.dark ? 0.18 : 0.08);
  const park = alpha(t.colors.accent2, t.dark ? 0.25 : 0.2);
  const pin = t.colors.accent === t.colors.bg ? t.colors.text : t.colors.accent;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 390 150"
      preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block", ...style }}
    >
      <rect width="390" height="150" fill={land} />
      <rect x="220" y="10" width="110" height="60" rx="8" fill={park} />
      <rect x="20" y="110" width="90" height="50" rx="8" fill={park} />
      <path
        d="M0 40 H390 M0 105 H390 M70 0 V150 M180 0 V150 M300 0 V150"
        stroke={road}
        strokeWidth="6"
      />
      <path
        d="M0 72 Q120 60 200 90 T390 70"
        stroke={road}
        strokeWidth="4"
        fill="none"
      />
      <circle cx="195" cy="75" r="16" fill={pin} />
      <circle cx="195" cy="75" r="6" fill={t.colors.onAccent} />
    </svg>
  );
}

export function initialsOf(name: string): string {
  const parts = name
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .split(" ")
    .filter(Boolean);
  if (!parts.length) return "•";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function LogoMark({
  t,
  name,
  logoUrl,
  size = 48,
  shape = "circle",
  invert = false,
  style,
}: {
  t: ResolvedTheme;
  name: string;
  logoUrl?: string;
  size?: number;
  shape?: "circle" | "square" | "rounded";
  invert?: boolean;
  style?: CSSProperties;
}) {
  const radius =
    shape === "circle"
      ? "50%"
      : shape === "rounded"
        ? Math.round(size * 0.22)
        : 2;
  if (logoUrl)
    return (
      <img
        src={logoUrl}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          objectFit: "cover",
          flexShrink: 0,
          ...style,
        }}
      />
    );
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: invert ? t.colors.onAccent : t.colors.accent,
        color: invert ? t.colors.accent : t.colors.onAccent,
        fontFamily: t.font.display,
        fontWeight: 800,
        fontSize: Math.round(size * 0.38),
        letterSpacing: "0.02em",
        flexShrink: 0,
        ...style,
      }}
    >
      {initialsOf(name)}
    </span>
  );
}
