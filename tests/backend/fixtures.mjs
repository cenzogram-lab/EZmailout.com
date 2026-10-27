// Shared fixtures: admin key inputs, campaign inputs and fake upstream services.
export const none = [];
export const some = (v) => [v];

/** saveAdminKeys input with every field "leave unchanged" except `set`. */
export function keys(set = {}) {
  const fields = ["fulfilmentUsername", "fulfilmentPassword", "fulfilmentEnvironment", "stripeSecretKey", "stripePublishableKey", "resendKey", "openAiKey", "webhookSecret", "outcallProxyUrl", "sandboxCheckout", "supportEmailAddress"];
  return Object.fromEntries(fields.map((f) => [f, f in set ? [set[f]] : []]));
}

export const SECRETS = {
  fulfilmentUsername: "ezm-print-user",
  fulfilmentPassword: "PRINT-PASSWORD-9f8e7d6c",
  stripeSecretKey: "sk_live_STRIPE_SECRET_ABC123XYZ",
  stripePublishableKey: "pk_live_publishable_123",
  resendKey: "re_RESEND_SECRET_456",
  openAiKey: "sk-proj-OPENAI_SECRET_789",
  webhookSecret: "whsec_WEBHOOK_SECRET_321",
  supportEmailAddress: "support@ezmailout.com",
};
export const RAW_SECRETS = ["PRINT-PASSWORD-9f8e7d6c", "sk_live_STRIPE_SECRET_ABC123XYZ", "re_RESEND_SECRET_456", "sk-proj-OPENAI_SECRET_789", "whsec_WEBHOOK_SECRET_321"];

export const addr = (i) => ({ name: `Resident ${i}`, address_line1: `${100 + i} Main St`, address_line2: [], city: "Portland", state: "OR", zip_code: "97201", zip_plus4: [] });
export const rawAddr = (i) => ({ name: `Resident ${i}`, address_line1: `${100 + i} Main St`, address_line2: [], city: "Portland", state: "OR", zip_code: "97201" });
export const returnAddress = { name: "Harbor Bakery", organization: ["Harbor Bakery LLC"], address_line1: "1 Harbor Way", address_line2: [], city: "Portland", state: "OR", zip_code: "97201" };

/**
 * A print PDF laid out like the studio's `buildPdfFromJpegs` (catalog, page
 * tree, then image, content and page objects per page), each page's image
 * `imageBytes` bytes of `fill`: what the canister's page check accepts.
 */
export function printPdf(fill = 1, pages = 2, imageBytes = 1024) {
  const enc = new TextEncoder();
  const parts = [];
  const kids = Array.from({ length: pages }, (_, p) => `${5 + 3 * p} 0 R`).join(" ");
  parts.push(enc.encode(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages} >>\nendobj\n`));
  for (let p = 0; p < pages; p++) {
    const image = 3 + 3 * p;
    parts.push(enc.encode(`${image} 0 obj\n<< /Type /XObject /Subtype /Image /Width 10 /Height 10 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes} >>\nstream\n`));
    parts.push(new Uint8Array(imageBytes).fill(fill));
    parts.push(enc.encode(`\nendstream\nendobj\n${image + 1} 0 obj\n<< /Length 30 >>\nstream\nq 432 0 0 288 0 0 cm /Im${image} Do Q\nendstream\nendobj\n${image + 2} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 432 288] /Resources << /XObject << /Im${image} ${image} 0 R >> >> /Contents ${image + 1} 0 R >>\nendobj\n`));
  }
  parts.push(enc.encode("trailer\n<< /Root 1 0 R >>\n%%EOF\n"));
  const out = new Uint8Array(parts.reduce((n, x) => n + x.length, 0));
  let at = 0;
  for (const x of parts) { out.set(x, at); at += x.length; }
  return out;
}

export function campaignInput(n = 3, extra = {}) {
  return {
    audienceType: { CsvUpload: null }, canvasState: [], designTemplateId: [], mailClass: [], name: "Audit campaign",
    product: { colorOption: [], layoutVariant: "6x9", productType: { Postcard: null } },
    qrDestinationUrl: [], recipientCount: BigInt(n), recipients: Array.from({ length: n }, (_, i) => addr(i)),
    returnAddress: [returnAddress], sourcePresetId: [], ...extra,
  };
}

/** The print partner's REST API is the one under `/molpro`. */
const isPrint = (r) => r.url.includes("/molpro/");

/** Fake print-partner REST API (the real host names, answered locally) with a configurable failure plan. */
export function fakePrintPartner(plan = {}) {
  let ids = 0;
  let lists = 0;
  const submitted = new Set();
  const fail = (step) => plan[step] && plan[step]-- > 0;
  return [
    [(r) => isPrint(r) && r.method === "POST" && r.url.endsWith("/documents"), () => fail("documents") ? { status: 500, body: { description: "doc storage down" } } : { body: { id: `doc${++ids}`, status: 0 } }],
    [(r) => isPrint(r) && r.method === "POST" && r.url.endsWith("/addressLists"), () => (++lists === plan.addressListFailsOnCall) ? { status: 500, body: { description: "list store busy" } } : fail("addressLists") ? { reject: "connection reset" } : fail("addressListsRefused") ? { status: 402, body: { status: 9, description: "Click2Mail account balance too low" } } : { body: { id: `list${++ids}`, status: 0 } }],
    [(r) => isPrint(r) && r.method === "GET" && /\/addressLists\/[^/]+$/.test(r.url), (r) => fail("addressListDetail") ? { status: 503, body: { description: "busy" } } : { body: (plan.detail ?? []) }],
    [(r) => isPrint(r) && r.method === "POST" && r.url.endsWith("/jobs"), () => fail("jobs") ? { status: 400, body: { description: "bad job" } } : { body: { id: `job${++ids}`, status: 0 } }],
    [(r) => isPrint(r) && r.method === "POST" && r.url.endsWith("/submit"), (r) => {
      const id = r.url.split("/jobs/")[1].split("/")[0];
      if (fail("submit")) return { reject: "timeout" };
      if (submitted.has(id)) return { status: 400, body: { description: "Job already submitted" } };
      submitted.add(id); return { body: { status: 0, description: "Success" } };
    }],
    [(r) => isPrint(r) && r.method === "GET" && r.url.includes("/tracking") && plan.trackingDownFor && r.url.includes(`/jobs/${plan.trackingDownFor}/`), () => ({ status: 503, body: { description: "busy" } })],
    // Paged tracking: `trackingPages` holds each page's scans and the reply
    // names `totalPages`; `ignorePaging` serves page 1 for every page, and
    // `trackingPageDown` makes that page unavailable.
    [(r) => isPrint(r) && r.method === "GET" && r.url.includes("/tracking") && plan.trackingPages, (r) => {
      const page = plan.ignorePaging ? 1 : Number(new URL(r.url).searchParams.get("page") ?? 1);
      if (page === plan.trackingPageDown) return { status: 503, body: { description: "busy" } };
      return { body: { totalPages: plan.trackingPages.length, tracking: (plan.trackingPages[page - 1] ?? []).map((s) => ({ scanDescription: s })) } };
    }],
    [(r) => isPrint(r) && r.method === "GET" && r.url.includes("/tracking"), () => ({ body: { tracking: (plan.scans ?? ["Accepted at USPS Origin Facility"]).map((s) => ({ scanDescription: s })) } })],
    [(r) => isPrint(r) && r.method === "GET" && /\/jobs\/[^/]+$/.test(r.url), (r) => {
      const id = r.url.split("/jobs/")[1];
      return { body: { id, status: 0, statusDescription: submitted.has(id) ? "Submitted" : "Editing" } };
    }],
  ];
}

export function fakeStripe(state = {}) {
  let n = 0;
  const intents = state.intents ?? new Map();
  return [
    [(r) => r.url === "https://api.stripe.com/v1/payment_intents" && r.method === "POST" && state.failCreate, () => ({ status: 401, body: { error: { message: "Invalid API Key provided: sk_live_****3XYZ" } } })],
    [(r) => r.url === "https://api.stripe.com/v1/payment_intents" && r.method === "POST", (r) => {
      const amount = Number(new URLSearchParams(r.body).get("amount"));
      const id = `pi_${++n}`;
      intents.set(id, { id, amount, currency: "usd", status: state.status ?? "requires_payment_method", client_secret: `${id}_secret` });
      return { body: { object: "payment_intent", ...intents.get(id) } };
    }],
    [(r) => r.url.startsWith("https://api.stripe.com/v1/payment_intents/") && r.method === "GET", (r) => {
      const id = r.url.split("/").pop();
      const it = intents.get(id);
      if (!it) return { status: 404, body: { error: { message: "No such payment_intent" } } };
      return { body: { id: it.id, object: "payment_intent", amount: state.paidAmount ?? it.amount, currency: "usd", status: state.paid === false ? "processing" : "succeeded", charges: { data: [{ status: "failed", amount: 1 }] } } };
    }],
  ];
}

export const fakeOpenAi = (opts = {}) => [
  [(r) => r.url.includes("/images/generations"), () => opts.imageFail ? { status: 401, body: { error: { message: "Incorrect API key provided: sk-proj-****_789. You can find your API key at https://platform.openai.com/account/api-keys." } } } : { body: { data: [{ url: "https://oaidalle.example/img.png", revised_prompt: "a bakery" }] } }],
  [(r) => r.url.includes("/chat/completions"), (r) => opts.chatFail ? { reject: "timeout" } : { body: { choices: [{ message: { content: r.body.includes("json_object") ? JSON.stringify({ headlines: ["Fresh bread"], bullets: ["Baked daily"], ctas: ["Visit today"] }) : "Stampy says hi" } }] } }],
];

export const fakeResend = (opts = {}) => {
  let calls = 0;
  return [[(r) => r.url === "https://api.resend.com/emails", () => {
    calls++;
    if (opts.failFirst && calls <= opts.failFirst) return { status: 503, body: { message: "Resend is busy" } };
    if (opts.domainError) return { status: 403, body: { message: "The ezmailout.com domain is not verified" } };
    return { body: { id: `email-${calls}-${Math.random()}` } };
  }]];
};
