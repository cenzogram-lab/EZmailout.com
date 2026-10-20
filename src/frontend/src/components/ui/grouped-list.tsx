import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type * as React from "react";

/**
 * iOS-style grouped inset list: one rounded card, hairline dividers between
 * rows, an optional small-caps heading above and a muted note below.
 */
export function GroupedList({
  title,
  footer,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  title?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className={cn("min-w-0", className)} {...props}>
      {title ? (
        <h2 className="px-4 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </h2>
      ) : null}
      <div className="divide-y divide-border/80 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
        {children}
      </div>
      {footer ? (
        <p className="px-4 pt-2 text-xs text-muted-foreground">{footer}</p>
      ) : null}
    </section>
  );
}

interface GroupedListRowProps {
  icon?: React.ElementType;
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned value before the chevron (e.g. "USD", a badge). */
  value?: React.ReactNode;
  /** Controls after the value (a copy or edit button); rows that carry
   * them are not themselves links. */
  trailing?: React.ReactNode;
  /** Route to open. Rows with `to`, `href` or `onClick` get a chevron. */
  to?: string;
  hash?: string;
  href?: string;
  onClick?: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
  className?: string;
  "data-ocid"?: string;
}

/** One row of a `GroupedList`: icon tile, label, optional value, chevron. */
export function GroupedListRow({
  icon: Icon,
  label,
  description,
  value,
  trailing,
  to,
  hash,
  href,
  onClick,
  tone = "default",
  disabled,
  className,
  "data-ocid": ocid,
}: GroupedListRowProps) {
  const interactive = Boolean(to || href || onClick);
  const danger = tone === "danger";
  const body = (
    <>
      {Icon ? (
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            danger
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-foreground",
          )}
        >
          <Icon className="size-[18px]" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[15px] font-medium",
            danger ? "text-destructive" : "text-foreground",
          )}
        >
          {label}
        </span>
        {description ? (
          <span className="block truncate text-xs font-medium text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      {value !== undefined && value !== null ? (
        <span className="ml-2 flex shrink-0 items-center text-sm text-muted-foreground">
          {value}
        </span>
      ) : null}
      {trailing ? (
        <span className="flex shrink-0 items-center gap-1">{trailing}</span>
      ) : null}
      {interactive && !danger ? (
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground/70"
          aria-hidden
        />
      ) : null}
    </>
  );
  const rowClass = cn(
    "flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left",
    interactive &&
      "transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none",
    disabled && "pointer-events-none opacity-50",
    className,
  );
  if (to) {
    return (
      <Link to={to} hash={hash} className={rowClass} data-ocid={ocid}>
        {body}
      </Link>
    );
  }
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={rowClass}
        data-ocid={ocid}
      >
        {body}
      </a>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={rowClass}
        data-ocid={ocid}
      >
        {body}
      </button>
    );
  }
  return (
    <div className={rowClass} data-ocid={ocid}>
      {body}
    </div>
  );
}
