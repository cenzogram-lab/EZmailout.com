import type { CSSProperties } from "react";

/**
 * Generic stroke icons (24×24, currentColor). Used for link rows, contact
 * tiles and CTAs. Brand/social glyphs live in SocialIcon.tsx.
 */
const PATHS: Record<string, string> = {
  "arrow-right": "M5 12h14M13 6l6 6-6 6",
  "arrow-up-right": "M7 17 17 7M8 7h9v9",
  "chevron-right": "m9 6 6 6-6 6",
  external:
    "M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5",
  bag: "M6 8h12l1 12H5L6 8zM9 8V6a3 3 0 0 1 6 0v2",
  cart: "M3 4h2l2.4 11h11.2L21 7H6M9 20h.01M17 20h.01",
  phone:
    "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  "map-pin":
    "M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10zM14 11a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 7v5l3 2",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  star: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z",
  play: "M8 5l12 7-12 7z",
  globe:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  check: "m5 12 5 5L20 7",
  heart: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z",
  scissors:
    "M9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12",
  leaf: "M4 20c0-8 6-14 16-14-1 10-7 14-14 14zM4 20c3-5 7-8 12-10",
  hammer: "M14 4l6 6-2 2-6-6zM12 6 4 14l2 2 8-8M5 15l4 4",
  utensils: "M6 3v8a2 2 0 0 0 2 2v8M10 3v8M6 3h4M16 3c-2 1-2 7-2 9h4v9M18 3v9",
  car: "M5 16l1.5-5h11L19 16M3 16h18v3H3zM7 19v2M17 19v2",
  home: "m3 11 9-8 9 8M5 10v10h14V10M10 20v-6h4v6",
  briefcase: "M4 8h16v12H4zM9 8V5h6v3M4 13h16",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM15 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  music:
    "M9 18V6l10-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM19 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M6 17h13",
  gift: "M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-2 0-4-1-4-2.5S9.5 2 12 7c2.5-5 4-3.5 4-2.5S14 7 12 7z",
  coffee:
    "M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 10h2a2 2 0 0 1 0 4h-2M7 4v2M10 4v2M13 4v2",
  dumbbell: "M4 10v4M7 8v8M17 8v8M20 10v4M7 12h10",
  sparkle:
    "m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  shield: "m12 3 8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  tag: "M3 12V4h8l9 9-8 8zM8.5 8.5h.01",
  truck:
    "M2 7h12v9H2zM14 10h4l3 3v3h-7M8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM19 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
  download: "M12 4v11M7 10l5 5 5-5M4 19h16",
  ticket:
    "M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4zM9 6v2M9 11v2M9 16v2",
  mic: "M9 6a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0zM5 11a7 7 0 0 0 14 0M12 18v3M8 21h8",
  users:
    "M12 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM3 20a6 6 0 0 1 12 0M19.5 9a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM16 14a5 5 0 0 1 5 5",
  file: "M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h6",
  percent:
    "M19 5 5 19M9 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM19 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
  wrench:
    "M21 7a5 5 0 0 1-6.6 4.7L6 20l-2-2 8.3-8.4A5 5 0 0 1 17 3l-3 3 2 2 3-3a5 5 0 0 1 2 2z",
  brush: "m18 3 3 3-9 9-3-3zM9 12c-3 0-4 2-4 4s-1 3-3 3c3 1 7 0 7-4z",
  flower:
    "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM12 3v6M12 15v6M3 12h6M15 12h6M6 6l4 4M14 14l4 4M18 6l-4 4M10 14l-4 4",
  paw: "M9 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM19 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM12 11c-3 0-6 3-6 6a2 2 0 0 0 3 2h6a2 2 0 0 0 3-2c0-3-3-6-6-6z",
  graduation: "m2 9 10-5 10 5-10 5zM6 11v5c0 2 3 3 6 3s6-1 6-3v-5",
  list: "M4 6h16M4 12h16M4 18h16",
  info: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 11v5M12 8h.01",
  zap: "M13 2 4 14h7l-1 8 9-12h-7z",
  key: "M12 15a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM11 12l9-9M17 6l2 2M14 9l2 2",
  message: "M4 5h16v11H9l-5 4z",
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
  bed: "M3 18V8M3 13h18v5M3 16h18M7 13v-3h6v3",
  dot: "M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  minus: "M5 12h14",
  plus: "M12 5v14M5 12h14",
  spray: "M8 7h6v13H8zM10 4h2v3h-2M16 6h2M16 9h3M16 12h2",
  paint: "M4 4h12v5H4zM16 6h3v6h-8v3M9 15h4v6H9z",
  tooth:
    "M12 4c-2-1.5-6-1-6 3 0 4 2 5 2 9 0 2 1 4 2 4s1.5-4 2-4 1 4 2 4 2-2 2-4c0-4 2-5 2-9 0-4-4-4.5-6-3z",
  pizza: "M12 3 3 20h18zM12 3c4 2 6 5 7 9M9 13h.01M13 16h.01M11 9h.01",
  scale:
    "M12 3v18M4 21h16M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0zM4 7h16",
  stethoscope:
    "M5 3v6a5 5 0 0 0 10 0V3M10 14v2a4 4 0 0 0 8 0v-3M20 11a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
  trophy:
    "M8 4h8v6a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 14v4M8 20h8",
  compass: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM15 9l-2 5-4 2 2-5z",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4",
  mappin2: "M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z",
  quote: "M8 6H4v6h4v4H6M18 6h-4v6h4v4h-2",
};

export type IconName = keyof typeof PATHS | (string & {});

export interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  style?: CSSProperties;
  className?: string;
  title?: string;
}

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
  style,
  className,
  title,
}: IconProps) {
  const d = PATHS[name] ?? PATHS.link;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      <path d={d} />
    </svg>
  );
}

export const ICON_NAMES = Object.keys(PATHS);
