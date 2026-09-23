import type { AddressInput, VerifiedAddress } from "@/backend";

export interface CsvParseResult {
  rows: AddressInput[];
  errors: string[];
  headers: string[];
}

/** RFC-4180-style parser (quoted fields, escaped quotes, CRLF). */
export function parseCsvTable(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (inQuotes) {
      if (c === '"') {
        if (raw[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && raw[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "full_name", "fullname", "recipient", "contact", "customer"],
  first_name: ["first_name", "firstname", "first"],
  last_name: ["last_name", "lastname", "last", "surname"],
  address_line1: [
    "address_line1",
    "address1",
    "address",
    "street",
    "street_address",
    "addr1",
    "line1",
  ],
  address_line2: [
    "address_line2",
    "address2",
    "apt",
    "suite",
    "unit",
    "addr2",
    "line2",
  ],
  city: ["city", "town"],
  state: ["state", "st", "province", "region"],
  zip_code: [
    "zip_code",
    "zip",
    "zipcode",
    "postal_code",
    "postalcode",
    "postcode",
  ],
};

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function findColumn(headers: string[], key: string): number {
  const aliases = HEADER_ALIASES[key] ?? [key];
  for (const alias of aliases) {
    const idx = headers.indexOf(alias);
    if (idx >= 0) return idx;
  }
  return -1;
}

/** Parses a recipient CSV into address inputs with header auto-detection. */
export function parseAddressCsv(raw: string): CsvParseResult {
  const table = parseCsvTable(raw);
  if (table.length < 2) {
    return {
      rows: [],
      errors: ["The file needs a header row and at least one recipient."],
      headers: [],
    };
  }
  const headers = table[0].map(normalizeHeader);
  const col = {
    name: findColumn(headers, "name"),
    first: findColumn(headers, "first_name"),
    last: findColumn(headers, "last_name"),
    line1: findColumn(headers, "address_line1"),
    line2: findColumn(headers, "address_line2"),
    city: findColumn(headers, "city"),
    state: findColumn(headers, "state"),
    zip: findColumn(headers, "zip_code"),
  };
  const errors: string[] = [];
  if (col.name < 0 && col.first < 0)
    errors.push("Missing a name (or first_name/last_name) column.");
  if (col.line1 < 0) errors.push("Missing an address_line1 column.");
  if (col.city < 0) errors.push("Missing a city column.");
  if (col.state < 0) errors.push("Missing a state column.");
  if (col.zip < 0) errors.push("Missing a zip_code column.");
  if (errors.length) return { rows: [], errors, headers };
  const rows: AddressInput[] = [];
  for (let i = 1; i < table.length; i++) {
    const cells = table[i];
    const get = (idx: number) => (idx >= 0 ? (cells[idx] ?? "").trim() : "");
    const name =
      col.name >= 0
        ? get(col.name)
        : `${get(col.first)} ${get(col.last)}`.trim();
    const line2 = get(col.line2);
    rows.push({
      name,
      address_line1: get(col.line1),
      address_line2: line2 ? line2 : undefined,
      city: get(col.city),
      state: get(col.state).toUpperCase(),
      zip_code: get(col.zip),
    });
  }
  return { rows, errors, headers };
}

function escapeCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Serializes verified addresses back to CSV. */
export function serializeCsv(addresses: VerifiedAddress[]): string {
  const header =
    "name,address_line1,address_line2,city,state,zip_code,zip_plus4";
  const lines = addresses.map((a) =>
    [
      a.name,
      a.address_line1,
      a.address_line2 ?? "",
      a.city,
      a.state,
      a.zip_code,
      a.zip_plus4 ?? "",
    ]
      .map(escapeCell)
      .join(","),
  );
  return [header, ...lines].join("\n");
}

/** Sample CSV offered as a download on the audience step. */
export const SAMPLE_CSV = `name,address_line1,address_line2,city,state,zip_code
Jane Rivera,120 Harbor View Dr,,Austin,TX,78701
Marcus Lee,88 Elm Street,Apt 4B,Denver,CO,80202
Priya Natarajan,1500 Ocean Ave,,San Diego,CA,92109`;
