import type { AddressInput } from "@/backend";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_ADDRESS_FIELD_CHARS } from "@/lib/inputLimits";
import { cn } from "@/lib/utils";
import { AlertCircle, Plus } from "lucide-react";
import { useId, useRef, useState } from "react";

type Field =
  | "name"
  | "address_line1"
  | "address_line2"
  | "city"
  | "state"
  | "zip";
type Form = Record<Field, string>;

const EMPTY: Form = {
  name: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  zip: "",
};

/**
 * A typed ZIP as the canister takes it: nine digits become ZIP+4. Nothing is
 * padded (the CSV import pads spreadsheet ZIPs that lost a leading zero; a
 * short ZIP typed by hand is a typo).
 */
function typedZip(raw: string): string {
  const t = raw.trim();
  return /^\d{9}$/.test(t) ? `${t.slice(0, 5)}-${t.slice(5)}` : t;
}

/**
 * The same rules the canister applies before verification
 * (`AddressLib.validateLocal`): name, street, city, a 2-letter state and a
 * 5-digit ZIP or ZIP+4. The first problem, with the field it belongs to.
 */
export function validateAddressForm(
  form: Form,
): { field: Field; message: string } | null {
  if (!form.name.trim())
    return { field: "name", message: "Recipient name is required." };
  if (!form.address_line1.trim())
    return { field: "address_line1", message: "Street address is required." };
  if (!form.city.trim()) return { field: "city", message: "City is required." };
  if (!/^[A-Z]{2}$/.test(form.state.trim().toUpperCase()))
    return { field: "state", message: "State must be a 2-letter code." };
  if (!/^\d{5}(-\d{4})?$/.test(typedZip(form.zip)))
    return {
      field: "zip",
      message: "ZIP must be 5 digits (optionally ZIP+4).",
    };
  return null;
}

function toAddressInput(form: Form): AddressInput {
  const line2 = form.address_line2.trim();
  return {
    name: form.name.trim(),
    address_line1: form.address_line1.trim(),
    address_line2: line2 ? line2 : undefined,
    city: form.city.trim(),
    state: form.state.trim().toUpperCase(),
    zip_code: typedZip(form.zip),
  };
}

const FIELDS: {
  key: Field;
  label: string;
  placeholder: string;
  ocid: string;
  max: number;
  extra?: string;
  numeric?: boolean;
}[] = [
  {
    key: "name",
    label: "Name",
    placeholder: "Jane Rivera",
    ocid: "name",
    max: MAX_ADDRESS_FIELD_CHARS,
  },
  {
    key: "address_line1",
    label: "Address line 1",
    placeholder: "120 Harbor View Dr",
    ocid: "line1",
    max: MAX_ADDRESS_FIELD_CHARS,
  },
  {
    key: "address_line2",
    label: "Address line 2",
    placeholder: "Apt 4B (optional)",
    ocid: "line2",
    max: MAX_ADDRESS_FIELD_CHARS,
  },
  {
    key: "city",
    label: "City",
    placeholder: "Austin",
    ocid: "city",
    max: MAX_ADDRESS_FIELD_CHARS,
  },
  {
    key: "state",
    label: "State",
    placeholder: "TX",
    ocid: "state",
    max: 2,
    extra: "uppercase",
  },
  {
    key: "zip",
    label: "ZIP",
    placeholder: "78701 or 78701-1234",
    ocid: "zip",
    max: 10,
    numeric: true,
  },
];

export interface ManualAddressFormProps {
  /** Adds the typed address; return false to keep the form as it is. */
  onAdd: (address: AddressInput) => boolean;
  disabled?: boolean;
  /** `data-ocid` prefix: `<prefix>.<field>.input`, `<prefix>.add.button`, `<prefix>.error`. */
  ocidPrefix: string;
}

/**
 * Name, Address 1, Address 2, City, State and ZIP (5-digit or ZIP+4), checked
 * locally field by field before the address joins the list to verify. A
 * problem is shown under the form and marks its field invalid.
 */
export function ManualAddressForm({
  onAdd,
  disabled,
  ocidPrefix,
}: ManualAddressFormProps) {
  const id = useId();
  const [form, setForm] = useState<Form>(EMPTY);
  const [error, setError] = useState<{ field: Field; message: string } | null>(
    null,
  );
  const refs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});

  function submit() {
    const problem = validateAddressForm(form);
    if (problem) {
      setError(problem);
      refs.current[problem.field]?.focus();
      return;
    }
    if (onAdd(toAddressInput(form))) {
      setForm(EMPTY);
      setError(null);
      refs.current.name?.focus();
    }
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={`${id}-${f.key}`}>{f.label}</Label>
            <Input
              id={`${id}-${f.key}`}
              ref={(el) => {
                refs.current[f.key] = el;
              }}
              value={form[f.key]}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({ ...prev, [f.key]: value }));
                if (error?.field === f.key) setError(null);
              }}
              placeholder={f.placeholder}
              maxLength={f.max}
              inputMode={f.numeric ? "numeric" : undefined}
              aria-invalid={error?.field === f.key ? true : undefined}
              aria-describedby={
                error?.field === f.key ? `${id}-error` : undefined
              }
              disabled={disabled}
              className={cn("h-11 sm:h-9", f.extra)}
              data-ocid={`${ocidPrefix}.${f.ocid}.input`}
            />
          </div>
        ))}
      </div>
      {error && (
        <Alert
          variant="destructive"
          id={`${id}-error`}
          data-ocid={`${ocidPrefix}.error`}
        >
          <AlertCircle className="size-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      <Button
        type="submit"
        variant="outline"
        disabled={disabled}
        className="h-11 w-full gap-2 sm:h-9 sm:w-auto"
        data-ocid={`${ocidPrefix}.add.button`}
      >
        <Plus className="size-4" /> Add to the list
      </Button>
    </form>
  );
}
