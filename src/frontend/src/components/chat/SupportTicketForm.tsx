import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitSupportTicket } from "@/hooks/use-backend";
import {
  MAX_TICKET_MESSAGE_CHARS,
  MAX_TICKET_SUBJECT_CHARS,
} from "@/lib/inputLimits";
import { useAccountStore } from "@/store/account";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { queueTicket } from "./supportOutbox";

/** Mirrors the limits `submitSupportTicket` enforces in the canister. */
const LIMITS = {
  name: 120,
  email: 254,
  subject: MAX_TICKET_SUBJECT_CHARS,
  message: MAX_TICKET_MESSAGE_CHARS,
} as const;
const EMAIL = /^[^\s@]+@[^\s@.][^\s@]*\.[^\s@]+$/;

export const TICKET_CONFIRMATION =
  "Your ticket has been logged! Our postal team will follow up via your email shortly.";

type Done = { kind: "sent"; ticketId: string } | { kind: "queued" };

/** Contact Support drawer, rendered inside the Stampy panel. */
export function SupportTicketForm({ onBack }: { onBack: () => void }) {
  const account = useAccountStore((s) => s.account);
  const submit = useSubmitSupportTicket();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(account?.email ?? "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const uid = useId();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const ticket = {
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
      pagePath: window.location.pathname,
    };
    if (!ticket.name || !ticket.subject || !ticket.message) {
      setError("Please fill in every field.");
      return;
    }
    if (!EMAIL.test(ticket.email)) {
      setError("Enter a valid email address so we can reply.");
      return;
    }
    try {
      const result = await submit.mutateAsync(ticket);
      if (result.ok && result.ticketId) {
        setDone({ kind: "sent", ticketId: result.ticketId });
      } else {
        // The canister answered and refused (validation or rate limit).
        setError(result.error ?? "The ticket could not be logged.");
      }
    } catch {
      // The canister could not be reached; keep the ticket and resend later.
      queueTicket(ticket);
      setDone({ kind: "queued" });
    }
  }

  if (done) {
    return (
      // Scrolls rather than clipping on a short phone, and keeps clear of the
      // column the seated Stampy launcher takes on phones, like the form below.
      <div
        className="flex h-full flex-col overflow-y-auto py-3 pl-6 pr-20 text-center sm:pr-6 [@media(max-height:500px)]:pr-6"
        data-ocid="stampy.support.confirmation"
      >
        <div className="m-auto flex flex-col items-center gap-3">
          <CheckCircle2 className="size-10 text-emerald-brand" />
          {done.kind === "sent" ? (
            <>
              <p className="font-display text-base font-semibold">
                {TICKET_CONFIRMATION}
              </p>
              <p className="meta-mono">Ticket {done.ticketId}</p>
            </>
          ) : (
            <>
              <p className="font-display text-base font-semibold">
                Saved on this device.
              </p>
              <p className="text-sm text-muted-foreground">
                We couldn't reach our servers just now, so your ticket will be
                sent to our postal team automatically the next time you're
                online.
              </p>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            data-ocid="stampy.support.done"
          >
            Back to chat
          </Button>
        </div>
      </div>
    );
  }

  return (
    // On phones the Stampy launcher is seated in the panel's bottom-right
    // corner (as beside the chat composer), so the whole scrolling form keeps
    // clear of its column; on a short screen the panel covers the launcher.
    <form
      onSubmit={handleSubmit}
      className="flex h-full flex-col gap-3 overflow-y-auto py-3 pl-4 pr-20 sm:pr-4 [@media(max-height:500px)]:pr-4"
      data-ocid="stampy.support.form"
      noValidate
    >
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
        data-ocid="stampy.support.back"
      >
        <ArrowLeft className="size-3.5" /> Back to chat
      </button>
      <div>
        <p className="font-display text-[15px] font-black tracking-tight">
          Contact Support
        </p>
        <p className="text-xs text-muted-foreground">
          A person from our postal team will reply by email.
        </p>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${uid}-name`}>Name</Label>
        <Input
          id={`${uid}-name`}
          value={name}
          maxLength={LIMITS.name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          data-ocid="stampy.support.name"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${uid}-email`}>Email</Label>
        <Input
          id={`${uid}-email`}
          type="email"
          value={email}
          maxLength={LIMITS.email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          data-ocid="stampy.support.email"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${uid}-subject`}>Subject</Label>
        <Input
          id={`${uid}-subject`}
          value={subject}
          maxLength={LIMITS.subject}
          onChange={(e) => setSubject(e.target.value)}
          data-ocid="stampy.support.subject"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${uid}-message`}>Message</Label>
        <Textarea
          id={`${uid}-message`}
          value={message}
          maxLength={LIMITS.message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="resize-none"
          data-ocid="stampy.support.message"
        />
      </div>
      {error ? (
        <p
          role="alert"
          className="text-xs text-destructive"
          data-ocid="stampy.support.error"
        >
          {error}
        </p>
      ) : null}
      {/* As tall as the chat composer's controls on phones. */}
      <Button
        type="submit"
        disabled={submit.isPending}
        className="mt-auto h-11 shrink-0 sm:h-9"
        data-ocid="stampy.support.submit"
      >
        {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Send to support
      </Button>
    </form>
  );
}
