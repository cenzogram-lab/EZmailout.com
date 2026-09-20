import type { ReturnAddress } from "@/backend";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWizardStore } from "@/store/wizard";
import { AlertCircle, CheckCircle2, Mailbox, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const RETURN_ADDRESS_STORAGE_KEY = "ez_return_address";

interface FormState {
  name: string;
  organization: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
}

const EMPTY: FormState = {
  name: "",
  organization: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  zip_code: "",
};

function fromAddress(address: ReturnAddress | null): FormState {
  if (!address) return EMPTY;
  return {
    name: address.name,
    organization: address.organization ?? "",
    address_line1: address.address_line1,
    address_line2: address.address_line2 ?? "",
    city: address.city,
    state: address.state,
    zip_code: address.zip_code,
  };
}

function readStored(): ReturnAddress | null {
  try {
    const raw = window.localStorage.getItem(RETURN_ADDRESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReturnAddress>;
    if (
      typeof parsed.name !== "string" ||
      typeof parsed.address_line1 !== "string" ||
      typeof parsed.city !== "string" ||
      typeof parsed.state !== "string" ||
      typeof parsed.zip_code !== "string"
    ) {
      return null;
    }
    return {
      name: parsed.name,
      organization: parsed.organization || undefined,
      address_line1: parsed.address_line1,
      address_line2: parsed.address_line2 || undefined,
      city: parsed.city,
      state: parsed.state,
      zip_code: parsed.zip_code,
    };
  } catch {
    return null;
  }
}

function writeStored(address: ReturnAddress): void {
  try {
    window.localStorage.setItem(
      RETURN_ADDRESS_STORAGE_KEY,
      JSON.stringify(address),
    );
  } catch {
    // Storage may be unavailable (private mode); the store still has it.
  }
}

/** Validates the form and returns field errors keyed by field name. */
export function validateReturnAddress(
  form: FormState,
): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.name.trim()) errors.name = "Sender name is required.";
  if (!form.address_line1.trim())
    errors.address_line1 = "Street address is required.";
  if (!form.city.trim()) errors.city = "City is required.";
  if (!/^[A-Z]{2}$/.test(form.state.trim().toUpperCase()))
    errors.state = "Use a 2-letter state code.";
  if (!/^\d{5}(-\d{4})?$/.test(form.zip_code.trim()))
    errors.zip_code = "ZIP must be 5 digits (optionally ZIP+4).";
  return errors;
}

function toAddress(form: FormState): ReturnAddress {
  const organization = form.organization.trim();
  const line2 = form.address_line2.trim();
  return {
    name: form.name.trim(),
    organization: organization ? organization : undefined,
    address_line1: form.address_line1.trim(),
    address_line2: line2 ? line2 : undefined,
    city: form.city.trim(),
    state: form.state.trim().toUpperCase(),
    zip_code: form.zip_code.trim(),
  };
}

/**
 * Return address editor for the review step. Seeds from the wizard store or
 * localStorage, validates, and writes back to both on save.
 */
export function ReturnAddressForm() {
  const returnAddress = useWizardStore((s) => s.returnAddress);
  const setReturnAddress = useWizardStore((s) => s.setReturnAddress);
  const [form, setForm] = useState<FormState>(() => fromAddress(returnAddress));
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (returnAddress) return;
    const stored = readStored();
    if (stored) {
      setReturnAddress(stored);
      setForm(fromAddress(stored));
    }
  }, [returnAddress, setReturnAddress]);

  function setField(key: keyof FormState, value: string) {
    setDirty(true);
    setForm((prev) => ({
      ...prev,
      [key]: key === "state" ? value.toUpperCase().slice(0, 2) : value,
    }));
  }

  function handleSave() {
    const nextErrors = validateReturnAddress(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Fix the highlighted return-address fields.");
      return;
    }
    const address = toAddress(form);
    setReturnAddress(address);
    writeStored(address);
    setDirty(false);
    toast.success("Return address saved for this and future campaigns.");
  }

  function handleClear() {
    setForm(EMPTY);
    setErrors({});
    setDirty(true);
  }

  const saved = !!returnAddress && !dirty;

  return (
    <Card className="bg-card" data-ocid="review.return_address.card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Mailbox className="size-4 text-primary" /> Return address
          </span>
          {saved ? (
            <Badge
              variant="outline"
              className="gap-1 border-emerald-brand/30 bg-emerald-brand/10 text-emerald-brand"
            >
              <CheckCircle2 className="size-3" /> Saved
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <AlertCircle className="size-3" /> Required
            </Badge>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Printed on every piece and used by USPS for undeliverable mail.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            id="ra-name"
            label="Sender name"
            value={form.name}
            error={errors.name}
            onChange={(v) => setField("name", v)}
            placeholder="Jane Rivera"
            ocid="review.return_address.name.input"
          />
          <Field
            id="ra-org"
            label="Organization (optional)"
            value={form.organization}
            onChange={(v) => setField("organization", v)}
            placeholder="Rivera Realty"
            ocid="review.return_address.organization.input"
          />
          <Field
            id="ra-line1"
            label="Address line 1"
            value={form.address_line1}
            error={errors.address_line1}
            onChange={(v) => setField("address_line1", v)}
            placeholder="120 Harbor View Dr"
            ocid="review.return_address.line1.input"
          />
          <Field
            id="ra-line2"
            label="Address line 2 (optional)"
            value={form.address_line2}
            onChange={(v) => setField("address_line2", v)}
            placeholder="Suite 200"
            ocid="review.return_address.line2.input"
          />
          <Field
            id="ra-city"
            label="City"
            value={form.city}
            error={errors.city}
            onChange={(v) => setField("city", v)}
            placeholder="Austin"
            ocid="review.return_address.city.input"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              id="ra-state"
              label="State"
              value={form.state}
              error={errors.state}
              onChange={(v) => setField("state", v)}
              placeholder="TX"
              maxLength={2}
              ocid="review.return_address.state.input"
            />
            <Field
              id="ra-zip"
              label="ZIP"
              value={form.zip_code}
              error={errors.zip_code}
              onChange={(v) => setField("zip_code", v)}
              placeholder="78701"
              maxLength={10}
              ocid="review.return_address.zip.input"
            />
          </div>
        </div>
        {Object.keys(errors).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>
              Please correct the highlighted fields before launching.
            </AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            data-ocid="review.return_address.clear.button"
          >
            Clear
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="gap-2"
            data-ocid="review.return_address.save.button"
          >
            <Save className="size-4" /> Save return address
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  id,
  label,
  value,
  error,
  onChange,
  placeholder,
  maxLength,
  ocid,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  ocid: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={!!error}
        data-ocid={ocid}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
