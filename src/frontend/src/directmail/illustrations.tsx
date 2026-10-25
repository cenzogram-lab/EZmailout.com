import type { CSSProperties, ReactNode } from "react";
import { alpha, mix } from "./color";
import type { ResolvedTheme } from "./theme";

/**
 * Flat, palette-aware product illustrations used as placeholders when a
 * product has no image yet (gallery previews, empty states). Each draws in
 * the current template's colours so a grid of them reads as one set.
 */

interface Ink {
  /** main fill */
  a: string;
  /** secondary fill */
  b: string;
  /** outline */
  line: string;
  /** light fill for labels / highlights */
  paper: string;
  /** darker neutral */
  dark: string;
}

type Draw = (k: Ink) => ReactNode;

const S = (k: Ink, w = 2.5) => ({
  stroke: k.line,
  strokeWidth: w,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
});

const DRAW: Record<string, Draw> = {
  candle: (k) => (
    <>
      <rect x="30" y="42" width="40" height="44" rx="7" fill={k.a} {...S(k)} />
      <rect x="38" y="58" width="24" height="12" rx="2" fill={k.paper} />
      <line x1="50" y1="42" x2="50" y2="33" {...S(k)} />
      <path d="M50 18c5 5 7 9 4 13a4 4 0 0 1-8 0c-2-4 0-8 4-13z" fill={k.b} />
    </>
  ),
  dress: (k) => (
    <>
      <path d="M40 22 42 12M60 22 58 12" {...S(k)} />
      <path d="M38 22h24l-2 20H40z" fill={k.b} {...S(k)} />
      <path d="M40 42h20l14 42H26z" fill={k.a} {...S(k)} />
      <line x1="40" y1="42" x2="60" y2="42" {...S(k)} />
    </>
  ),
  tee: (k) => (
    <>
      <path
        d="M30 24l12-6q8 8 16 0l12 6 8 16-12 6v38H34V46l-12-6z"
        fill={k.a}
        {...S(k)}
      />
      <path d="M42 18q8 8 16 0" fill="none" {...S(k)} />
    </>
  ),
  tote: (k) => (
    <>
      <path d="M34 40q0-18 16-18t16 18" fill="none" {...S(k, 3)} />
      <rect x="24" y="40" width="52" height="44" rx="4" fill={k.a} {...S(k)} />
      <rect x="40" y="56" width="20" height="12" rx="2" fill={k.paper} />
    </>
  ),
  sneaker: (k) => (
    <>
      <path
        d="M14 66q0-16 16-16l18-6q12-8 24 4l14 6q6 8 0 14H14z"
        fill={k.a}
        {...S(k)}
      />
      <rect x="14" y="66" width="72" height="10" rx="5" fill={k.b} {...S(k)} />
      <path d="M44 48l6 6M50 44l6 6M56 42l6 6" {...S(k)} />
    </>
  ),
  beanie: (k) => (
    <>
      <circle cx="50" cy="26" r="7" fill={k.paper} {...S(k)} />
      <path d="M26 70q0-40 24-40t24 40z" fill={k.a} {...S(k)} />
      <rect x="22" y="64" width="56" height="14" rx="5" fill={k.b} {...S(k)} />
    </>
  ),
  bottle: (k) => (
    <>
      <rect
        x="42"
        y="18"
        width="16"
        height="12"
        rx="3"
        fill={k.paper}
        {...S(k)}
      />
      <rect x="44" y="30" width="12" height="10" fill={k.b} {...S(k)} />
      <rect x="34" y="40" width="32" height="46" rx="7" fill={k.a} {...S(k)} />
      <rect x="40" y="56" width="20" height="14" rx="2" fill={k.paper} />
    </>
  ),
  jar: (k) => (
    <>
      <rect x="30" y="44" width="40" height="38" rx="8" fill={k.a} {...S(k)} />
      <rect x="28" y="32" width="44" height="12" rx="4" fill={k.b} {...S(k)} />
      <rect x="38" y="58" width="24" height="12" rx="2" fill={k.paper} />
    </>
  ),
  tube: (k) => (
    <>
      <rect x="44" y="16" width="12" height="8" rx="2" fill={k.b} {...S(k)} />
      <path
        d="M40 24h20v10l6 50a6 6 0 0 1-6 6H40a6 6 0 0 1-6-6l6-50z"
        fill={k.a}
        {...S(k)}
      />
      <rect x="40" y="52" width="20" height="14" rx="2" fill={k.paper} />
    </>
  ),
  diffuser: (k) => (
    <>
      <path d="M50 44L30 14M50 44L42 10M50 44l8-32M50 44l20-26" {...S(k)} />
      <rect x="46" y="42" width="8" height="8" fill={k.b} {...S(k)} />
      <rect x="38" y="50" width="24" height="34" rx="6" fill={k.a} {...S(k)} />
    </>
  ),
  vase: (k) => (
    <>
      <path d="M50 40V14M50 36L36 22M50 32l14-12" {...S(k)} />
      <ellipse
        cx="33"
        cy="20"
        rx="6"
        ry="3"
        transform="rotate(-40 33 20)"
        fill={k.b}
      />
      <ellipse
        cx="67"
        cy="18"
        rx="6"
        ry="3"
        transform="rotate(40 67 18)"
        fill={k.b}
      />
      <path d="M38 40q-8 22 0 44h24q8-22 0-44z" fill={k.a} {...S(k)} />
    </>
  ),
  mug: (k) => (
    <>
      <path d="M40 30q-3-6 0-10M50 30q-3-6 0-10" fill="none" {...S(k)} />
      <rect x="26" y="38" width="42" height="42" rx="6" fill={k.a} {...S(k)} />
      <path d="M68 48h6a10 10 0 0 1 0 20h-6" fill="none" {...S(k, 3)} />
    </>
  ),
  ring: (k) => (
    <>
      <circle cx="50" cy="60" r="20" fill="none" stroke={k.a} strokeWidth="9" />
      <circle cx="50" cy="60" r="20" fill="none" {...S(k, 1.5)} />
      <path d="M50 20l12 12-12 12-12-12z" fill={k.b} {...S(k)} />
    </>
  ),
  necklace: (k) => (
    <>
      <path d="M24 22q26 50 52 0" fill="none" {...S(k, 2.5)} />
      <circle cx="50" cy="50" r="9" fill={k.b} {...S(k)} />
      <circle cx="50" cy="50" r="3" fill={k.paper} />
    </>
  ),
  earrings: (k) => (
    <>
      <path d="M36 38V22M64 38V22" {...S(k)} />
      <circle cx="36" cy="54" r="14" fill="none" stroke={k.a} strokeWidth="6" />
      <circle cx="64" cy="54" r="14" fill="none" stroke={k.a} strokeWidth="6" />
      <circle cx="36" cy="20" r="3" fill={k.b} />
      <circle cx="64" cy="20" r="3" fill={k.b} />
    </>
  ),
  beans: (k) => (
    <>
      <path d="M30 32h40l4 52H26z" fill={k.a} {...S(k)} />
      <rect x="27" y="24" width="46" height="10" rx="3" fill={k.b} {...S(k)} />
      <rect x="38" y="48" width="24" height="18" rx="2" fill={k.paper} />
      <ellipse
        cx="44"
        cy="57"
        rx="4"
        ry="6"
        transform="rotate(-30 44 57)"
        fill={k.dark}
      />
      <ellipse
        cx="56"
        cy="57"
        rx="4"
        ry="6"
        transform="rotate(30 56 57)"
        fill={k.dark}
      />
    </>
  ),
  laptop: (k) => (
    <>
      <rect x="24" y="24" width="52" height="36" rx="3" fill={k.a} {...S(k)} />
      <rect x="29" y="29" width="42" height="26" rx="2" fill={k.paper} />
      <path d="M14 64h72l4 8H10z" fill={k.b} {...S(k)} />
    </>
  ),
  phone: (k) => (
    <>
      <rect x="33" y="14" width="34" height="72" rx="8" fill={k.a} {...S(k)} />
      <rect x="38" y="22" width="24" height="52" rx="3" fill={k.paper} />
      <rect x="44" y="30" width="12" height="4" rx="2" fill={k.b} />
      <rect x="42" y="40" width="16" height="16" rx="3" fill={k.b} />
    </>
  ),
  book: (k) => (
    <>
      <rect x="28" y="18" width="46" height="64" rx="3" fill={k.a} {...S(k)} />
      <rect x="28" y="18" width="9" height="64" fill={k.b} {...S(k)} />
      <rect x="44" y="34" width="22" height="4" rx="2" fill={k.paper} />
      <rect x="44" y="42" width="16" height="4" rx="2" fill={k.paper} />
    </>
  ),
  print: (k) => (
    <>
      <rect x="20" y="20" width="60" height="60" fill={k.paper} {...S(k)} />
      <rect x="29" y="29" width="42" height="42" fill={k.a} />
      <circle cx="50" cy="50" r="10" fill={k.b} />
      <path
        d="M29 71l12-14 10 10 8-6 12 10"
        fill="none"
        stroke={k.paper}
        strokeWidth="2"
      />
    </>
  ),
  brush: (k) => (
    <g transform="rotate(-40 50 50)">
      <rect x="44" y="12" width="12" height="46" rx="4" fill={k.a} {...S(k)} />
      <rect x="42" y="58" width="16" height="10" fill={k.b} {...S(k)} />
      <path d="M42 68h16l-2 14H44z" fill={k.dark} {...S(k)} />
    </g>
  ),
  dumbbell: (k) => (
    <>
      <rect x="22" y="46" width="56" height="8" rx="4" fill={k.dark} />
      <rect x="16" y="34" width="10" height="32" rx="3" fill={k.a} {...S(k)} />
      <rect x="26" y="38" width="8" height="24" rx="2" fill={k.b} {...S(k)} />
      <rect x="74" y="34" width="10" height="32" rx="3" fill={k.a} {...S(k)} />
      <rect x="66" y="38" width="8" height="24" rx="2" fill={k.b} {...S(k)} />
    </>
  ),
  mat: (k) => (
    <>
      <rect x="22" y="40" width="58" height="26" rx="13" fill={k.a} {...S(k)} />
      <circle cx="30" cy="53" r="13" fill={k.b} {...S(k)} />
      <circle cx="30" cy="53" r="5" fill={k.paper} />
      <rect
        x="40"
        y="48"
        width="30"
        height="10"
        rx="2"
        fill={k.paper}
        opacity="0.6"
      />
    </>
  ),
  onesie: (k) => (
    <>
      <path
        d="M34 22l8-4q8 8 16 0l8 4 8 16-8 4v18h-8v16H42V60h-8V42l-8-4z"
        fill={k.a}
        {...S(k)}
      />
      <circle cx="46" cy="74" r="1.8" fill={k.dark} />
      <circle cx="54" cy="74" r="1.8" fill={k.dark} />
      <circle cx="50" cy="40" r="4" fill={k.b} />
    </>
  ),
  blocks: (k) => (
    <>
      <rect x="22" y="54" width="26" height="26" rx="3" fill={k.a} {...S(k)} />
      <rect x="52" y="54" width="26" height="26" rx="3" fill={k.b} {...S(k)} />
      <rect
        x="37"
        y="28"
        width="26"
        height="26"
        rx="3"
        fill={k.paper}
        {...S(k)}
      />
      <circle cx="50" cy="41" r="5" fill={k.a} />
    </>
  ),
  bone: (k) => (
    <>
      <path
        d="M30 44a8 8 0 1 1 8 8h24a8 8 0 1 1 8-8 8 8 0 1 1-8 8H38a8 8 0 1 1-8-8z"
        fill={k.a}
        {...S(k)}
        transform="translate(0 6)"
      />
    </>
  ),
  collar: (k) => (
    <>
      <circle
        cx="50"
        cy="46"
        r="26"
        fill="none"
        stroke={k.a}
        strokeWidth="10"
      />
      <circle cx="50" cy="46" r="26" fill="none" {...S(k, 1.5)} />
      <rect x="44" y="14" width="12" height="10" rx="2" fill={k.b} {...S(k)} />
      <circle cx="50" cy="80" r="8" fill={k.b} {...S(k)} />
    </>
  ),
  capsules: (k) => (
    <>
      <rect x="32" y="20" width="32" height="10" rx="3" fill={k.b} {...S(k)} />
      <rect x="34" y="30" width="28" height="54" rx="6" fill={k.a} {...S(k)} />
      <rect x="40" y="46" width="16" height="18" rx="2" fill={k.paper} />
      <rect
        x="64"
        y="66"
        width="22"
        height="9"
        rx="4.5"
        transform="rotate(-30 75 70)"
        fill={k.paper}
        {...S(k, 2)}
      />
    </>
  ),
  tea: (k) => (
    <>
      <path
        d="M26 42h48l-5 30a8 8 0 0 1-8 6H39a8 8 0 0 1-8-6z"
        fill={k.a}
        {...S(k)}
      />
      <path d="M74 48h6a8 8 0 0 1 0 16h-8" fill="none" {...S(k, 3)} />
      <ellipse cx="48" cy="84" rx="30" ry="4" fill={k.b} />
      <path d="M56 42q6-14 14-20" fill="none" {...S(k, 1.5)} />
      <rect
        x="66"
        y="14"
        width="10"
        height="8"
        rx="1"
        fill={k.paper}
        {...S(k, 1.5)}
      />
    </>
  ),
  vinyl: (k) => (
    <>
      <circle cx="50" cy="50" r="34" fill={k.dark} />
      <circle
        cx="50"
        cy="50"
        r="26"
        fill="none"
        stroke={k.paper}
        strokeWidth="0.8"
        opacity="0.5"
      />
      <circle
        cx="50"
        cy="50"
        r="19"
        fill="none"
        stroke={k.paper}
        strokeWidth="0.8"
        opacity="0.5"
      />
      <circle cx="50" cy="50" r="11" fill={k.b} />
      <circle cx="50" cy="50" r="2.5" fill={k.paper} />
    </>
  ),
  headphones: (k) => (
    <>
      <path
        d="M22 60V46a28 28 0 0 1 56 0v14"
        fill="none"
        stroke={k.dark}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect x="14" y="54" width="16" height="24" rx="5" fill={k.a} {...S(k)} />
      <rect x="70" y="54" width="16" height="24" rx="5" fill={k.a} {...S(k)} />
    </>
  ),
  mic: (k) => (
    <>
      <rect x="39" y="14" width="22" height="38" rx="11" fill={k.a} {...S(k)} />
      <path d="M44 26h12M44 34h12" stroke={k.paper} strokeWidth="2" />
      <path d="M30 44a20 20 0 0 0 40 0" fill="none" {...S(k, 3)} />
      <path d="M50 64v16M38 82h24" {...S(k, 3)} />
    </>
  ),
  camera: (k) => (
    <>
      <rect x="36" y="28" width="18" height="10" rx="2" fill={k.b} {...S(k)} />
      <rect x="16" y="36" width="68" height="42" rx="6" fill={k.a} {...S(k)} />
      <circle cx="50" cy="57" r="13" fill={k.paper} {...S(k)} />
      <circle cx="50" cy="57" r="6" fill={k.b} />
      <rect x="66" y="42" width="10" height="5" rx="1" fill={k.paper} />
    </>
  ),
  bread: (k) => (
    <>
      <rect x="20" y="62" width="60" height="16" rx="7" fill={k.b} {...S(k)} />
      <path d="M20 68q0-32 30-32t30 32z" fill={k.a} {...S(k)} />
      <path
        d="M36 48q6 6 0 12M50 44q6 6 0 12M64 48q6 6 0 12"
        fill="none"
        stroke={k.paper}
        strokeWidth="2"
      />
    </>
  ),
  cake: (k) => (
    <>
      <ellipse cx="50" cy="82" rx="32" ry="6" fill={k.b} />
      <rect x="26" y="54" width="48" height="26" rx="4" fill={k.a} {...S(k)} />
      <rect x="34" y="36" width="32" height="18" rx="4" fill={k.a} {...S(k)} />
      <path
        d="M34 42q4 4 8 0t8 0 8 0 8 0"
        fill="none"
        stroke={k.paper}
        strokeWidth="3"
      />
      <rect x="48" y="22" width="4" height="14" fill={k.b} />
      <circle cx="50" cy="19" r="3" fill={k.paper} {...S(k, 1.5)} />
    </>
  ),
  croissant: (k) => (
    <>
      <ellipse cx="50" cy="40" rx="14" ry="10" fill={k.a} {...S(k)} />
      <ellipse
        cx="32"
        cy="50"
        rx="11"
        ry="8"
        transform="rotate(-40 32 50)"
        fill={k.a}
        {...S(k)}
      />
      <ellipse
        cx="68"
        cy="50"
        rx="11"
        ry="8"
        transform="rotate(40 68 50)"
        fill={k.a}
        {...S(k)}
      />
      <ellipse
        cx="22"
        cy="64"
        rx="7"
        ry="5"
        transform="rotate(-60 22 64)"
        fill={k.b}
        {...S(k)}
      />
      <ellipse
        cx="78"
        cy="64"
        rx="7"
        ry="5"
        transform="rotate(60 78 64)"
        fill={k.b}
        {...S(k)}
      />
    </>
  ),
  cookie: (k) => (
    <>
      <circle cx="50" cy="52" r="28" fill={k.a} {...S(k)} />
      {[
        [40, 42],
        [58, 40],
        [36, 60],
        [52, 56],
        [64, 62],
        [48, 70],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill={k.dark} />
      ))}
    </>
  ),
  plant: (k) => (
    <>
      <path d="M50 58V30" {...S(k)} />
      <ellipse
        cx="38"
        cy="36"
        rx="12"
        ry="7"
        transform="rotate(-35 38 36)"
        fill={k.a}
        {...S(k, 1.5)}
      />
      <ellipse
        cx="62"
        cy="34"
        rx="12"
        ry="7"
        transform="rotate(35 62 34)"
        fill={k.a}
        {...S(k, 1.5)}
      />
      <ellipse cx="50" cy="20" rx="7" ry="12" fill={k.a} {...S(k, 1.5)} />
      <rect x="30" y="56" width="40" height="8" rx="2" fill={k.b} {...S(k)} />
      <path d="M34 64h32l-4 22H38z" fill={k.paper} {...S(k)} />
    </>
  ),
  planter: (k) => (
    <>
      <path d="M50 8L34 44M50 8l16 36" {...S(k, 1.5)} />
      <path d="M30 44h40l-6 22H36z" fill={k.b} {...S(k)} />
      <ellipse
        cx="30"
        cy="58"
        rx="10"
        ry="5"
        transform="rotate(60 30 58)"
        fill={k.a}
        {...S(k, 1.5)}
      />
      <ellipse
        cx="70"
        cy="60"
        rx="10"
        ry="5"
        transform="rotate(-60 70 60)"
        fill={k.a}
        {...S(k, 1.5)}
      />
      <ellipse cx="50" cy="38" rx="12" ry="6" fill={k.a} {...S(k, 1.5)} />
    </>
  ),
  keyboard: (k) => (
    <>
      <rect x="12" y="34" width="76" height="32" rx="5" fill={k.a} {...S(k)} />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3, 4, 5, 6].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={18 + c * 9.5}
            y={40 + r * 8}
            width="7"
            height="6"
            rx="1.5"
            fill={k.paper}
          />
        )),
      )}
    </>
  ),
  mountain: (k) => (
    <>
      <circle cx="72" cy="30" r="8" fill={k.b} />
      <path d="M10 80L38 36l14 20 12-12 26 36z" fill={k.a} {...S(k)} />
      <path d="M38 36l6 10 8-4-2-6z" fill={k.paper} />
    </>
  ),
  journal: (k) => (
    <>
      <rect x="30" y="18" width="40" height="64" rx="3" fill={k.a} {...S(k)} />
      <rect x="30" y="52" width="40" height="8" fill={k.b} />
      <path d="M36 18v64" stroke={k.paper} strokeWidth="1.5" opacity="0.6" />
    </>
  ),
  house: (k) => (
    <>
      <path d="M20 54l30-28 30 28v28H20z" fill={k.a} {...S(k)} />
      <path d="M14 56l36-34 36 34" fill="none" {...S(k, 3.5)} />
      <rect x="44" y="62" width="12" height="20" rx="1" fill={k.b} {...S(k)} />
      <rect
        x="26"
        y="60"
        width="10"
        height="10"
        rx="1"
        fill={k.paper}
        {...S(k, 1.5)}
      />
    </>
  ),
  car: (k) => (
    <>
      <path
        d="M14 66V54q0-6 6-6h8l10-12h26l12 12h6q6 0 6 6v12z"
        fill={k.a}
        {...S(k)}
      />
      <path d="M40 48l6-8h14l8 8z" fill={k.paper} />
      <circle cx="32" cy="68" r="8" fill={k.dark} {...S(k)} />
      <circle cx="68" cy="68" r="8" fill={k.dark} {...S(k)} />
    </>
  ),
  tooth: (k) => (
    <>
      <path
        d="M34 24q16-10 32 0 12 12 2 30l-4 28q-4 6-8-4l-4-12q-2-4-4 0l-4 12q-4 10-8 4l-4-28q-10-18 2-30z"
        fill={k.paper}
        {...S(k)}
      />
      <path d="M72 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill={k.b} />
    </>
  ),
  flower: (k) => (
    <>
      <path d="M50 84L38 40M50 84l6-50M50 84l16-42" {...S(k)} />
      {[
        [38, 36],
        [56, 30],
        [66, 44],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="10" fill={k.a} {...S(k, 1.5)} />
          <circle cx={x} cy={y} r="3.5" fill={k.b} />
        </g>
      ))}
      <path d="M34 60h32l-6 26H40z" fill={k.paper} {...S(k)} />
    </>
  ),
  spray: (k) => (
    <>
      <rect x="36" y="42" width="28" height="42" rx="5" fill={k.a} {...S(k)} />
      <rect x="44" y="32" width="12" height="10" fill={k.b} {...S(k)} />
      <path d="M44 26h22l-4 8h-8z" fill={k.b} {...S(k)} />
      <circle cx="74" cy="22" r="2" fill={k.line} />
      <circle cx="80" cy="30" r="2" fill={k.line} />
      <circle cx="76" cy="38" r="2" fill={k.line} />
    </>
  ),
  bolt: (k) => (
    <>
      <circle cx="50" cy="50" r="32" fill={k.a} {...S(k)} />
      <path d="M54 24L36 54h12l-4 22 20-32H52z" fill={k.paper} {...S(k, 1.5)} />
    </>
  ),
  wrench: (k) => (
    <g transform="rotate(-40 50 50)">
      <rect x="45" y="36" width="10" height="48" rx="5" fill={k.a} {...S(k)} />
      <circle cx="50" cy="30" r="13" fill={k.a} {...S(k)} />
      <rect
        x="45"
        y="14"
        width="10"
        height="14"
        fill={k.paper}
        {...S(k, 1.5)}
      />
    </g>
  ),
  scissors: (k) => (
    <>
      <path d="M40 60L54 20l6 4-14 40z" fill={k.b} {...S(k)} />
      <path d="M60 60L46 20l-6 4 14 40z" fill={k.b} {...S(k)} />
      <circle cx="36" cy="70" r="9" fill="none" stroke={k.a} strokeWidth="5" />
      <circle cx="64" cy="70" r="9" fill="none" stroke={k.a} strokeWidth="5" />
    </>
  ),
  bed: (k) => (
    <>
      <rect x="18" y="30" width="64" height="24" rx="4" fill={k.a} {...S(k)} />
      <rect
        x="14"
        y="52"
        width="72"
        height="18"
        rx="3"
        fill={k.paper}
        {...S(k)}
      />
      <rect x="22" y="42" width="22" height="10" rx="3" fill={k.b} {...S(k)} />
      <path d="M18 70v10M82 70v10" {...S(k, 3)} />
    </>
  ),
  gift: (k) => (
    <>
      <rect x="24" y="46" width="52" height="36" fill={k.a} {...S(k)} />
      <rect x="20" y="36" width="60" height="12" rx="2" fill={k.b} {...S(k)} />
      <rect x="46" y="36" width="8" height="46" fill={k.paper} />
      <path
        d="M50 36q-14-12-10-16t10 10q4-14 10-10t-10 16z"
        fill="none"
        {...S(k)}
      />
    </>
  ),
  ticket: (k) => (
    <>
      <path
        d="M18 38a4 4 0 0 1 4-4h56a4 4 0 0 1 4 4v8a6 6 0 0 0 0 12v8a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4v-8a6 6 0 0 0 0-12z"
        fill={k.a}
        {...S(k)}
      />
      <path
        d="M58 36v30"
        stroke={k.paper}
        strokeWidth="2"
        strokeDasharray="3 3"
      />
      <rect x="28" y="46" width="20" height="4" rx="2" fill={k.paper} />
      <rect x="28" y="54" width="14" height="4" rx="2" fill={k.paper} />
    </>
  ),
  burger: (k) => (
    <>
      <path d="M22 46q0-22 28-22t28 22z" fill={k.a} {...S(k)} />
      <rect x="20" y="46" width="60" height="6" rx="3" fill={k.b} />
      <rect x="22" y="52" width="56" height="8" rx="3" fill={k.dark} />
      <rect x="22" y="62" width="56" height="14" rx="6" fill={k.a} {...S(k)} />
      <circle cx="38" cy="34" r="1.6" fill={k.paper} />
      <circle cx="50" cy="30" r="1.6" fill={k.paper} />
      <circle cx="62" cy="34" r="1.6" fill={k.paper} />
    </>
  ),
  bowl: (k) => (
    <>
      <ellipse
        cx="38"
        cy="46"
        rx="10"
        ry="6"
        transform="rotate(-20 38 46)"
        fill={k.b}
      />
      <ellipse
        cx="60"
        cy="44"
        rx="10"
        ry="6"
        transform="rotate(20 60 44)"
        fill={k.b}
      />
      <circle cx="50" cy="44" r="6" fill={k.paper} {...S(k, 1.5)} />
      <path d="M18 50h64q0 32-32 32T18 50z" fill={k.a} {...S(k)} />
    </>
  ),
  scale: (k) => (
    <>
      <path d="M50 22v56M34 78h32M26 34h48" {...S(k, 3)} />
      <path d="M26 34l-10 22h20z" fill={k.a} {...S(k)} />
      <path d="M74 34l-10 22h20z" fill={k.a} {...S(k)} />
      <circle cx="50" cy="22" r="4" fill={k.b} />
    </>
  ),
  graduation: (k) => (
    <>
      <path d="M18 44l32-14 32 14-32 14z" fill={k.a} {...S(k)} />
      <path d="M34 50v12q16 10 32 0V50" fill={k.b} {...S(k)} />
      <path d="M78 46v14" {...S(k)} />
      <circle cx="78" cy="62" r="3" fill={k.b} />
    </>
  ),
  stethoscope: (k) => (
    <>
      <path
        d="M34 18v24a16 16 0 0 0 32 0V18"
        fill="none"
        stroke={k.dark}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M50 58v8a12 12 0 0 0 12 12h2"
        fill="none"
        stroke={k.dark}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="72" cy="78" r="9" fill={k.a} {...S(k)} />
    </>
  ),
  truck: (k) => (
    <>
      <rect x="14" y="34" width="44" height="32" rx="3" fill={k.a} {...S(k)} />
      <path d="M58 42h16l10 10v14H58z" fill={k.b} {...S(k)} />
      <circle cx="30" cy="70" r="7" fill={k.dark} {...S(k)} />
      <circle cx="72" cy="70" r="7" fill={k.dark} {...S(k)} />
    </>
  ),
  leaf: (k) => (
    <>
      <path d="M50 14q36 26 0 72-36-46 0-72z" fill={k.a} {...S(k)} />
      <path
        d="M50 24v56M50 44l-12-8M50 56l12-8"
        fill="none"
        stroke={k.paper}
        strokeWidth="2"
      />
    </>
  ),
  cup: (k) => (
    <>
      <rect x="30" y="24" width="40" height="8" rx="3" fill={k.b} {...S(k)} />
      <path d="M34 32h32l-4 50H38z" fill={k.a} {...S(k)} />
      <rect x="37" y="46" width="26" height="14" fill={k.paper} />
    </>
  ),
  hanger: (k) => (
    <>
      <path d="M50 20a6 6 0 1 1 6-6" fill="none" {...S(k)} />
      <path d="M50 26L14 56h72z" fill="none" {...S(k, 3)} />
      <path d="M22 56h56l-6 28H28z" fill={k.a} {...S(k)} />
    </>
  ),
  calendar: (k) => (
    <>
      <rect
        x="20"
        y="24"
        width="60"
        height="56"
        rx="5"
        fill={k.paper}
        {...S(k)}
      />
      <rect x="20" y="24" width="60" height="14" rx="5" fill={k.a} />
      <path d="M34 18v12M66 18v12" {...S(k, 3)} />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <rect
            key={`${r}${c}`}
            x={28 + c * 12}
            y={44 + r * 10}
            width="8"
            height="6"
            rx="1"
            fill={r === 1 && c === 2 ? k.b : k.a}
            opacity={r === 1 && c === 2 ? 1 : 0.35}
          />
        )),
      )}
    </>
  ),
  star: (k) => (
    <>
      <path
        d="M50 16l9 20 22 2-16 15 5 22-20-12-20 12 5-22-16-15 22-2z"
        fill={k.a}
        {...S(k)}
      />
    </>
  ),
};

export const ILLUSTRATION_NAMES = Object.keys(DRAW);

export function hasIllustration(name?: string): boolean {
  return Boolean(name && DRAW[name]);
}

export function Illustration({
  t,
  name,
  style,
}: { t: ResolvedTheme; name: string; style?: CSSProperties }) {
  const draw = DRAW[name] ?? DRAW.star;
  const accentIsNeutral =
    Math.abs(luma(t.colors.accent) - luma(t.colors.text)) < 0.08;
  const bg = mix(
    t.colors.surface,
    t.colors.accent,
    t.dark ? 0.26 : accentIsNeutral ? 0.07 : 0.12,
  );
  const a = accentIsNeutral
    ? mix(t.colors.surface, t.colors.text, t.dark ? 0.75 : 0.72)
    : t.colors.accent;
  const b =
    t.colors.accent2 === t.colors.accent
      ? mix(t.colors.accent, t.colors.bg, 0.45)
      : t.colors.accent2;
  const paper = t.dark
    ? mix(t.colors.text, t.colors.bg, 0.12)
    : t.colors.surface;
  const ink: Ink = {
    a,
    b,
    line: alpha(t.colors.text, 0.72),
    paper,
    dark: alpha(t.colors.text, 0.78),
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      style={{ display: "block", width: "100%", height: "100%", ...style }}
    >
      <rect width="100" height="100" fill={bg} />
      {draw(ink)}
    </svg>
  );
}

function luma(hex: string): number {
  const n = Number.parseInt(hex.replace("#", "").slice(0, 6), 16);
  return (
    (0.2126 * ((n >> 16) & 255) +
      0.7152 * ((n >> 8) & 255) +
      0.0722 * (n & 255)) /
    255
  );
}
