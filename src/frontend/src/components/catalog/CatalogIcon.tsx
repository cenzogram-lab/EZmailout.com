import type { CatalogIconId } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/**
 * Monochrome line-art icons matching the Click2Mail product sheet
 * (1.5px strokes, round joins, 24×24 grid).
 */
const PATHS: Record<CatalogIconId, React.ReactNode> = {
  postcard: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="1.5" />
      <path d="M5.5 10h6M5.5 13h6M5.5 16h4" />
      <rect x="15" y="8.5" width="3.5" height="3.5" rx="0.5" />
    </>
  ),
  letter: (
    <>
      <path d="M4 10.5 12 5l8 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5z" />
      <path d="M7.5 12.5V4.5h9v8" />
      <path d="M9.5 7h5M9.5 9.5h5" />
      <path d="m4 11 8 5.5L20 11" />
    </>
  ),
  certified: (
    <>
      <path d="M4 10.5 12 5l8 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5z" />
      <path d="M7.5 12.5V4.5h9v8" />
      <path d="m4 11 8 5.5L20 11" />
      <circle cx="18.5" cy="6" r="3" />
      <path d="m17.2 6 1 1 1.8-2" />
    </>
  ),
  eddm: (
    <>
      <path d="M8 18.5V9.5a3.5 3.5 0 0 1 7 0v9h6v-9a3.5 3.5 0 0 0-3.5-3.5H11.5" />
      <path d="M8 18.5h13M11.5 18.5v2.5" />
      <path d="M17 6V2.5h3.5L19 4l1.5 1.5H17" />
      <path d="M2.5 9.5h4M2.5 12.5h3M2.5 15.5h2" />
    </>
  ),
  priority: (
    <>
      <path d="M4 10.5 12 5l8 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5z" />
      <path d="M7.5 12.5V4.5h9v8" />
      <path d="m4 11 8 5.5L20 11" />
      <path d="m10 8.5 1.5 1.5 3-3" />
    </>
  ),
  "priority-express": (
    <>
      <rect x="9" y="3.5" width="12" height="8" rx="1" />
      <path d="m9 4.5 6 4 6-4" />
      <rect x="3" y="12.5" width="12" height="8" rx="1" />
      <path d="m3 13.5 6 4 6-4" />
      <path d="M2 6.5h4M1 9h5M17 15.5h4M16 18h5" />
    </>
  ),
  flyer: (
    <>
      <rect x="9" y="6" width="11" height="14" rx="1" />
      <path d="M12 10h5M12 13h5M12 16h3" />
      <path d="M6.5 8.5v10M4 11v6" />
    </>
  ),
  secure: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="1.5" />
      <path d="m2.5 7 9.5 6.5L21.5 7" />
      <rect x="15" y="14" width="6.5" height="5.5" rx="1" fill="white" />
      <path d="M16.5 14v-1.5a1.75 1.75 0 0 1 3.5 0V14" />
    </>
  ),
  notecard: (
    <>
      <path d="M3 10.5 12 4l9 6.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5z" />
      <path d="M6.5 13V8.5h11V13" />
      <path d="m3 11 9 6 9-6" />
    </>
  ),
  "rack-card": (
    <>
      <rect x="5" y="3.5" width="9" height="15" rx="1" />
      <path d="M7.5 7h4M7.5 9.5h4M7.5 12h3" />
      <path d="M17 6.5v14h-9" />
    </>
  ),
  brochure: (
    <>
      <path d="M4 5.5 11 4v16l-7 1.5z" />
      <path d="M11 4h9v16h-9" />
      <path d="M13.5 8h4M13.5 11h4" />
    </>
  ),
  "reply-mail": (
    <>
      <path d="M6 4h12v9.5" />
      <path d="M6 4v14.5a1.5 1.5 0 0 0 3 0V17h9.5" />
      <path d="M9 8h6M9 11h4" />
      <path d="m20.5 12.5-5 5-1.5.5.5-1.5 5-5a1.06 1.06 0 0 1 1.5 1.5z" />
    </>
  ),
  booklet: (
    <>
      <path d="M5 5.5 12 4v15.5L5 21z" />
      <path d="M12 4l7 1.5V21l-7-1.5" />
      <path d="M8 9.5v8" />
    </>
  ),
  "card-stock": (
    <>
      <rect x="2.5" y="8" width="19" height="8" rx="1" />
      <rect x="5" y="5" width="14" height="3" />
      <path d="M6 12h7" />
    </>
  ),
};

export function CatalogIcon({
  id,
  className,
  title,
}: {
  id: CatalogIconId;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-8", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[id]}
    </svg>
  );
}
