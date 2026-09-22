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
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { CalendarCheck, CheckCircle2, Clock, X } from "lucide-react";
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

  // Reset when re-opened
  useEffect(() => {
    if (open) {
      setSelectedDate(null);
      setSelectedTime(null);
      setStep(1);
      setForm({ name: "", email: "", company: "", phone: "", volume: "" });
      setErrors({});
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    setStep(3);
  }

  const formattedSlot =
    selectedDate && selectedTime
      ? `${selectedDate.label}, ${selectedDate.month} ${selectedDate.dateNum} at ${selectedTime}`
      : "";

  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 flex h-full w-full max-w-none items-center justify-center bg-transparent p-4"
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

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Top primary line */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-primary to-primary" />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
              <CalendarCheck className="size-3.5" />
              Talk to EZmailout
            </div>
            <h2
              id="demo-modal-title"
              className="font-display text-xl font-bold text-foreground sm:text-2xl"
            >
              Book a walkthrough
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A 20-minute call with the EZmailout team — we'll build your first
              campaign with you.{" "}
              <span className="font-medium text-primary">Spots fill fast.</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close modal"
            data-ocid="demo_modal.close_button"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Step indicator */}
        {step < 3 && (
          <div className="mx-6 mb-4 flex items-center gap-2">
            {([1, 2] as const).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    step >= s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
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
                {s < 2 && <div className="mx-1 h-px w-8 bg-border" />}
              </div>
            ))}
          </div>
        )}

        <div className="max-h-[70vh] overflow-y-auto px-6 pb-6">
          {/* ── Step 1: Date + Time ── */}
          {step === 1 && (
            <div className="space-y-5" data-ocid="demo_modal.step1_panel">
              {/* Day picker */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                        "flex flex-col items-center rounded-xl border px-1 py-2.5 text-center transition-all hover:-translate-y-0.5",
                        selectedDate?.isoDate === day.isoDate
                          ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "border-border bg-muted/30 text-foreground hover:border-primary/50 hover:bg-muted",
                        day.isWeekend && selectedDate?.isoDate !== day.isoDate
                          ? "opacity-60"
                          : "",
                      )}
                    >
                      <span className="text-[10px] font-medium leading-none opacity-70">
                        {day.label}
                      </span>
                      <span className="mt-1 text-sm font-bold leading-none">
                        {day.dateNum}
                      </span>
                      <span className="mt-0.5 text-[10px] leading-none opacity-60">
                        {day.month}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time slots */}
              {selectedDate && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Clock className="mr-1 inline size-3" />
                    Available Times
                    {selectedDate.isWeekend && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
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
                          "rounded-lg border px-3 py-2 text-sm font-medium transition-all hover:-translate-y-0.5",
                          selectedTime === slot
                            ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                            : "border-border bg-muted/30 text-foreground hover:border-primary/50 hover:bg-muted",
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
                <div className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                  <CalendarCheck className="size-4 shrink-0 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {formattedSlot}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setSelectedTime(null);
                    }}
                    className="ml-auto text-xs text-muted-foreground hover:text-primary"
                  >
                    Change
                  </button>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="demo-name"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
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
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
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
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
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
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Phone Number
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground/60">
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
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
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

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2 text-base"
                data-ocid="demo_modal.submit_button"
              >
                <CalendarCheck className="size-4" />
                Confirm my walkthrough
              </Button>
            </form>
          )}

          {/* ── Step 3: Confirmation ── */}
          {step === 3 && (
            <div
              className="flex flex-col items-center py-6 text-center"
              data-ocid="demo_modal.confirmation_panel"
            >
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-brand/10 ring-4 ring-emerald-brand/20">
                <CheckCircle2 className="size-9 text-emerald-brand" />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-foreground">
                You're on the calendar!
              </h3>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                We'll send a calendar invite from {BRAND.supportEmail} shortly.
                The EZmailout team looks forward to speaking with you.
              </p>

              {/* Booking summary */}
              <div className="mt-5 w-full rounded-xl border border-border bg-muted/30 p-4 text-left text-sm">
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                className="mt-5"
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
