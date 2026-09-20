/** Formats a canister timestamp (nanoseconds since epoch, bigint) as a date-time string. */
export function formatTimestamp(ns: bigint | number, withTime = true): string {
  const ms = Number(BigInt(ns) / 1_000_000n);
  if (!ms) return "—";
  const d = new Date(ms);
  return withTime ? d.toLocaleString() : d.toLocaleDateString();
}

export function formatNumber(n: number | bigint): string {
  return Number(n).toLocaleString("en-US");
}

/** Human label for a layout variant. */
export function layoutLabel(variant: string): string {
  const labels: Record<string, string> = {
    "4x6": '4" × 6" Postcard',
    "6x9": '6" × 9" Postcard',
    "6x11": '6" × 11" Jumbo Postcard',
    letter: '8.5" × 11" Letter',
    "6x18_bifold": '6" × 18" Bifold',
    "11x17_trifold": '11" × 17" Trifold',
    "8.5x11_perforated": "Snap Pack",
    multi_page: "Booklet",
  };
  return labels[variant] ?? variant;
}
