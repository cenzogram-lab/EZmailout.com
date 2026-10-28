import { queueTicket } from "@/components/chat/supportOutbox";
import { MascotStage } from "@/components/stampy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSubmitSupportTicket } from "@/hooks/use-backend";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { CalendarCheck, Clock, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

const WEEKDAY_SLOTS = [
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
];
const WEEKEND_SLOTS = ["10:00 AM", "11:00 AM"];

const VOLUME_OPTIONS = [
  "Under 1,000",
  "1,000–5,000",
  "5,000–25,000",
  "25,000–100,000",
  "100,000+",
];

interface DayCard {
  label: string; // "Mon"
  dateNum: number; // 15
  month: string; // "Jun"
  isWeekend: boolean;
  isoDate: string; // "2026-06-15"
}

function buildNext7Days(): DayCard[] {
  const days: DayCard[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dow = d.getDay();
    days.push({
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      dateNum: d.getDate(),
      month: d.toLocaleDateString("en-US", { month: "short" }),
      isWeekend: dow === 0 || dow === 6,
      isoDate: d.toISOString().split("T")[0],
    });
  }
  return days;
}

interface ContactFormState {
  name: string;
  email: string;
  company: string;
  phone: string;
  volume: string;
}

interface BookDemoModalProps {
  open: boolean;
  onClose: () => void;
}

export function BookDemoModal({ open, onClose }: BookDemoModalProps) {
  const days = buildNext7Days();

  const [selectedDate, setSelectedDate] = useState<DayCard | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<ContactFormState>({
    name: "",
    email: "",
    company: "",
    phone: "",
    volume: "",
  });
  const [errors, setErrors] = useState<Partial<ContactFormState>>({});
  const submit = useSubmitSupportTicket();
  const [sendError, setSendError] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<"sent" | "queued">("sent");

  // Reset when re-opened
  useEffect(() => {
    if (open) {
      setSelectedDate(null);
      setSelectedTime(null);
      setStep(1);
      setForm({ name: "", email: "", company: "", phone: "", volume: "" });
      setErrors({});
      setSendError(null);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const slots = selectedDate?.isWeekend ? WEEKEND_SLOTS : WEEKDAY_SLOTS;

  function handleDateSelect(day: DayCard) {
    setSelectedDate(day);
    setSelectedTime(null);
  }

  function handleTimeSelect(slot: string) {
    setSelectedTime(slot);
    setStep(2);
  }

  function validateForm(): boolean {
    const e: Partial<ContactFormState> = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(form.email))
      e.email = "Valid business email is required";
    if (!form.company.trim()) e.company = "Company name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const formattedSlot =
    selectedDate && selectedTime
      ? `${selectedDate.label}, ${selectedDate.month} ${selectedDate.dateNum} at ${selectedTime}`
      : "";

  /**
   * The request reaches the team as a support ticket (the admin inbox, and
   * email when it is set up). Nothing books a calendar slot by itself, so
   * the team confirms the time by email.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm() || submit.isPending) return;
    setSendError(null);
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const ticket = {
      name: form.name.trim(),
      email: form.email.trim(),
      subject: `Walkthrough request: ${formattedSlot}`.slice(0, 160),
      message: [
        `Preferred time: ${formattedSlot} (${zone})`,
        `Company: ${form.company.trim()}`,
        form.phone.trim() ? `Phone: ${form.phone.trim()}` : null,
        form.volume ? `Monthly mail volume: ${form.volume}` : null,
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 2000),
      pagePath: window.location.pathname,
    };
    try {
      const result = await submit.mutateAsync(ticket);
      if (!result.ok) {
        setSendError(result.error ?? "The request could not be sent.");
        return;
      }
      setDelivery("sent");
    } catch {
      // The canister could not be reached: keep it and send it later.
      queueTicket(ticket);
      setDelivery("queued");
    }
    setStep(3);
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-end justify-center bg-transparent p-0 sm:items-center sm:p-4"
      aria-labelledby="demo-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onClose();
        }}
        role="presentation"
      />

      {/* Card: a bottom sheet on phones, a centred dialog from `sm`. */}
      <div className="surface-sheet relative isolate z-10 flex max-h-[calc(100dvh-0.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-b-none pb-[env(safe-area-inset-bottom,0px)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-b-3xl sm:pb-0">
        <div aria-hidden="true" className="ambient-glow-backdrop" />
        <span aria-hidden="true" className="sheet-handle sm:hidden" />

        {/* Header */}
        <div className="flex shrink-0 items-start justify-between px-6 pb-4 pt-3 sm:pt-6">
          <div>
            <div className="status-pill status-pill-indigo mb-2 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em]">
              <CalendarCheck className="size-3.5" />
              Talk to EZmailout
            </div>
            <h2
              id="demo-modal-title"
              className="font-display text-2xl font-black tracking-tight text-foreground"
            >
              Book a walkthrough
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              A 20-minute call with the EZmailout team — we'll build your first
              campaign with you.{" "}
              <span className="font-semibold text-primary">
                Spots fill fast.
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-3d-neutral ml-4 flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/80"
            aria-label="Close modal"
            data-ocid="demo_modal.close_button"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Step indicator */}
        {step < 3 && (
          <div className="mx-6 mb-4 flex shrink-0 items-center gap-2">
            {([1, 2] as const).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    step >= s
                      ? "btn-3d-primary"
                      : "border border-hairline-strong bg-well text-muted-foreground",
                  )}
                >
                  {s}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    step >= s ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s === 1 ? "Pick Date & Time" : "Contact Info"}
                </span>
                {s < 2 && (
                  <div
                    className={cn(
                      "mx-1 h-0.5 w-8 rounded-full",
                      step > s ? "bg-primary" : "bg-hairline-strong",
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          {/* ── Step 1: Date + Time ── */}
          {step === 1 && (
            <div className="space-y-5" data-ocid="demo_modal.step1_panel">
              {/* Day picker */}
              <div>
                <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Select a Date
                </p>
                <div className="grid grid-cols-7 gap-1.5">
                  {days.map((day) => (
                    <button
                      key={day.isoDate}
                      type="button"
                      onClick={() => handleDateSelect(day)}
                      data-ocid={`demo_modal.date_${day.isoDate}`}
                      className={cn(
                        "flex min-w-0 flex-col items-center rounded-2xl px-0.5 py-2.5 text-center outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-ring/80 motion-safe:hover:-translate-y-0.5",
                        selectedDate?.isoDate === day.isoDate
                          ? "btn-3d-primary"
                          : "border border-hairline bg-card-raised text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.6)] hover:border-primary/50 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]",
                        day.isWeekend && selectedDate?.isoDate !== day.isoDate
                          ? "border-dashed border-hairline-strong bg-transparent shadow-none"
                          : "",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[10px] font-semibold uppercase leading-none tracking-wide",
                          selectedDate?.isoDate === day.isoDate
                            ? "text-primary-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {day.label}
                      </span>
                      <span className="mt-1 text-base font-black leading-none tabular-nums">
                        {day.dateNum}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 text-[10px] leading-none",
                          selectedDate?.isoDate === day.isoDate
                            ? "text-primary-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {day.month}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time slots */}
              {selectedDate && (
                <div>
                  <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <Clock className="mr-1 inline size-3" />
                    Available Times
                    {selectedDate.isWeekend && (
                      <span className="status-pill status-pill-indigo ml-2 inline-flex px-2 py-0 align-middle font-sans text-[10px] normal-case tracking-normal">
                        Weekend hours
                      </span>
                    )}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => handleTimeSelect(slot)}
                        data-ocid="demo_modal.time_slot"
                        className={cn(
                          "min-h-11 rounded-full px-3 py-2 text-sm font-semibold tabular-nums outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-ring/80 motion-safe:hover:-translate-y-0.5 sm:min-h-10",
                          selectedTime === slot
                            ? "btn-3d-primary"
                            : "border border-hairline bg-card-raised text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.6)] hover:border-primary/50 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]",
                        )}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Contact Info ── */}
          {step === 2 && (
            <form
              onSubmit={handleSubmit}
              className="space-y-4"
              noValidate
              data-ocid="demo_modal.step2_panel"
            >
              {/* Selected slot summary */}
              {formattedSlot && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
                  <CalendarCheck className="size-4 shrink-0 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    {formattedSlot}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setSelectedTime(null);
                    }}
                    className="ml-auto shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/80"
                  >
                    Change
                  </button>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="demo-name"
                    className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="demo-name"
                    placeholder="Jane Smith"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    data-ocid="demo_modal.name_input"
                    className={cn(errors.name && "border-destructive")}
                  />
                  {errors.name && (
                    <p
                      className="text-xs text-destructive"
                      data-ocid="demo_modal.name_field_error"
                    >
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="demo-email"
                    className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Business Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="demo-email"
                    type="email"
                    placeholder="jane@yourbusiness.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    data-ocid="demo_modal.email_input"
                    className={cn(errors.email && "border-destructive")}
                  />
                  {errors.email && (
                    <p
                      className="text-xs text-destructive"
                      data-ocid="demo_modal.email_field_error"
                    >
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="demo-company"
                  className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="demo-company"
                  placeholder="Your business"
                  value={form.company}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, company: e.target.value }))
                  }
                  data-ocid="demo_modal.company_input"
                  className={cn(errors.company && "border-destructive")}
                />
                {errors.company && (
                  <p
                    className="text-xs text-destructive"
                    data-ocid="demo_modal.company_field_error"
                  >
                    {errors.company}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="demo-phone"
                    className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Phone Number
                    <span className="ml-1 font-sans text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="demo-phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    data-ocid="demo_modal.phone_input"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="demo-volume"
                    className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Monthly Mail Volume
                  </Label>
                  <Select
                    value={form.volume}
                    onValueChange={(v) => setForm((f) => ({ ...f, volume: v }))}
                  >
                    <SelectTrigger
                      id="demo-volume"
                      data-ocid="demo_modal.volume_select"
                    >
                      <SelectValue placeholder="Select range…" />
                    </SelectTrigger>
                    <SelectContent>
                      {VOLUME_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {sendError && (
                <p
                  className="text-sm text-destructive"
                  data-ocid="demo_modal.send_error"
                >
                  {sendError}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                disabled={submit.isPending}
                className="h-12 w-full gap-2 text-base"
                data-ocid="demo_modal.submit_button"
              >
                {submit.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CalendarCheck className="size-4" />
                )}
                Request my walkthrough
              </Button>
            </form>
          )}

          {/* ── Step 3: Confirmation ── */}
          {step === 3 && (
            <div
              className="flex flex-col items-center py-6 text-center"
              data-ocid="demo_modal.confirmation_panel"
            >
              <MascotStage pose="checklist" size="md" className="mb-2" />
              <h3 className="mt-4 font-display text-2xl font-black tracking-tight text-foreground">
                {delivery === "sent" ? "Request received" : "Request saved"}
              </h3>
              <p
                className="mt-2 max-w-xs text-sm text-muted-foreground"
                data-ocid="demo_modal.confirmation_text"
              >
                {delivery === "sent"
                  ? `We'll confirm your time by email from ${BRAND.supportEmail}. The EZmailout team looks forward to speaking with you.`
                  : "We couldn't reach EZmailout just now, so your request is saved on this device and will be sent the next time you're online."}
              </p>

              {/* Booking summary */}
              <div className="mt-5 w-full rounded-2xl border border-hairline bg-card-raised p-4 text-left text-sm">
                <div className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Booking Summary
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date & Time</span>
                    <span className="font-medium text-foreground">
                      {formattedSlot}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium text-foreground">
                      {form.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium text-foreground">
                      {form.email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Company</span>
                    <span className="font-medium text-foreground">
                      {form.company}
                    </span>
                  </div>
                  {form.volume && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mail Volume</span>
                      <span className="font-medium text-foreground">
                        {form.volume}/mo
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="mt-5 h-11 px-8"
                onClick={onClose}
                data-ocid="demo_modal.done_button"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
