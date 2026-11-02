import { LEGAL_UPDATED } from "@/lib/legal";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

export interface LegalSection {
  /** Anchor id: `/privacy#retention`. */
  id: string;
  title: string;
  body: ReactNode;
}

const OTHER_PAGES = [
  { to: "/terms", label: "Terms of Service" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/cookies", label: "Cookie Policy" },
] as const;

/**
 * A legal document: heading, last updated date, a short summary, the
 * sections in one readable card, and a contents list (sticky beside the
 * text from `lg`, a collapsible list above it on smaller screens) that
 * follows the section being read. Theme tokens throughout, so it is obsidian
 * in the dark theme and white in the light one like the rest of the app.
 */
export function LegalPage({
  slug,
  title,
  summary,
  sections,
}: {
  slug: "terms" | "privacy" | "cookies";
  title: string;
  summary: ReactNode;
  sections: LegalSection[];
}) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  // The contents list marks the section nearest the top of the screen.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const seen = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) seen.set(e.target.id, e.boundingClientRect.top);
          else seen.delete(e.target.id);
        }
        const first = sections.find((s) => seen.has(s.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  const contents = (onPick?: () => void) => (
    <ol className="space-y-0.5 text-sm">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            onClick={onPick}
            aria-current={active === s.id ? "location" : undefined}
            className={cn(
              "flex gap-2 rounded-xl px-3 py-1.5 leading-snug transition-smooth focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80",
              active === s.id
                ? "bg-primary/10 font-semibold text-primary-ink"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span className="w-5 shrink-0 tabular-nums">{i + 1}.</span>
            <span className="min-w-0">{s.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <div
      className="relative isolate bg-background"
      data-ocid={`legal.${slug}.page`}
    >
      <div aria-hidden className="ambient-glow-backdrop" />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <header className="max-w-3xl">
          <p className="meta-mono uppercase tracking-[0.18em]">Legal</p>
          <h1 className="display-heading mt-2 text-4xl leading-tight sm:text-5xl">
            {title}
          </h1>
          <p
            className="mt-3 text-sm text-muted-foreground"
            data-ocid={`legal.${slug}.updated`}
          >
            Last updated {LEGAL_UPDATED}
          </p>
          <div className="mt-5 text-base leading-relaxed text-foreground/85">
            {summary}
          </div>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
          <nav aria-label={`${title} contents`} className="min-w-0">
            {/* Phones and tablets: a collapsible list above the text. */}
            <MobileContents title={title}>{contents}</MobileContents>
            {/* Desktop: pinned beside the text while it scrolls. */}
            <div className="sticky top-[calc(var(--header-h)+1.5rem+env(safe-area-inset-top,0px))] hidden max-h-[calc(100dvh-var(--header-h)-3rem)] overflow-y-auto pr-1 lg:block">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                On this page
              </p>
              {contents()}
            </div>
          </nav>

          <article
            className="min-w-0 rounded-3xl border border-hairline bg-card px-5 py-7 shadow-surface sm:px-8 sm:py-9 lg:px-10"
            data-ocid={`legal.${slug}.article`}
          >
            <div className="space-y-10">
              {sections.map((s, i) => (
                <section
                  key={s.id}
                  id={s.id}
                  aria-labelledby={`${s.id}-title`}
                  className="scroll-mt-[calc(var(--header-h)+1.5rem+env(safe-area-inset-top,0px))]"
                >
                  <h2
                    id={`${s.id}-title`}
                    className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
                  >
                    <span className="mr-2 text-muted-foreground tabular-nums">
                      {i + 1}.
                    </span>
                    {s.title}
                  </h2>
                  <div className="legal-prose mt-3 space-y-3 text-sm leading-relaxed text-foreground/85 md:text-base">
                    {s.body}
                  </div>
                </section>
              ))}
            </div>
            <footer className="mt-12 border-t border-hairline pt-6 text-sm text-muted-foreground">
              <p>Related documents:</p>
              <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                {OTHER_PAGES.filter((p) => p.to !== `/${slug}`).map((p) => (
                  <li key={p.to}>
                    <Link
                      to={p.to}
                      className="font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      {p.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
}

function MobileContents({
  title,
  children,
}: {
  title: string;
  children: (onPick?: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-3xl border border-hairline bg-card shadow-surface lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-3xl px-4 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
        data-ocid="legal.contents.toggle"
      >
        <span>On this page</span>
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
        <span className="sr-only">: {title}</span>
      </button>
      {open && (
        <div className="px-1 pb-3">{children(() => setOpen(false))}</div>
      )}
    </div>
  );
}

/** Small building blocks the documents share. */
export function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-muted-foreground">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

export function Sub({ children }: { children: ReactNode }) {
  return (
    <h3 className="pt-1 text-base font-bold tracking-tight text-foreground">
      {children}
    </h3>
  );
}

export function Mail({ to }: { to: string }) {
  return (
    <a
      href={`mailto:${to}`}
      className="font-semibold text-primary underline-offset-4 hover:underline"
    >
      {to}
    </a>
  );
}
