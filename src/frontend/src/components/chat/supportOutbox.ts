import type { SupportTicketInput } from "@/backend";

/**
 * Tickets that could not reach the canister (offline, or the backend was
 * unavailable). They wait in this browser and are re-sent the next time the
 * backend is reachable, so a queued ticket is delayed, never silently lost.
 */
const OUTBOX_KEY = "ezmailout_support_outbox";
const MAX_QUEUED = 5;

export function readOutbox(): SupportTicketInput[] {
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SupportTicketInput[]) : [];
  } catch {
    return [];
  }
}

export function writeOutbox(items: SupportTicketInput[]): void {
  try {
    if (items.length === 0) window.localStorage.removeItem(OUTBOX_KEY);
    else
      window.localStorage.setItem(
        OUTBOX_KEY,
        JSON.stringify(items.slice(-MAX_QUEUED)),
      );
  } catch {
    // Storage blocked: nothing more we can do from the browser.
  }
}

export function queueTicket(ticket: SupportTicketInput): void {
  writeOutbox([...readOutbox(), ticket]);
}
