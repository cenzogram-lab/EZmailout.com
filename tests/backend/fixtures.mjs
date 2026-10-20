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
  const submitted = new Set();
  const fail = (step) => plan[step] && plan[step]-- > 0;
  return [
    [(r) => isPrint(r) && r.method === "POST" && r.url.endsWith("/documents"), () => fail("documents") ? { status: 500, body: { description: "doc storage down" } } : { body: { id: `doc${++ids}`, status: 0 } }],
    [(r) => isPrint(r) && r.method === "POST" && r.url.endsWith("/addressLists"), () => fail("addressLists") ? { reject: "connection reset" } : { body: { id: `list${++ids}`, status: 0 } }],
    [(r) => isPrint(r) && r.method === "GET" && /\/addressLists\/[^/]+$/.test(r.url), (r) => fail("addressListDetail") ? { status: 503, body: { description: "busy" } } : { body: (plan.detail ?? []) }],
    [(r) => isPrint(r) && r.method === "POST" && r.url.endsWith("/jobs"), () => fail("jobs") ? { status: 400, body: { description: "bad job" } } : { body: { id: `job${++ids}`, status: 0 } }],
    [(r) => isPrint(r) && r.method === "POST" && r.url.endsWith("/submit"), (r) => {
      const id = r.url.split("/jobs/")[1].split("/")[0];
      if (fail("submit")) return { reject: "timeout" };
      if (submitted.has(id)) return { status: 400, body: { description: "Job already submitted" } };
      submitted.add(id); return { body: { status: 0, description: "Success" } };
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
  [(r) => r.url.includes("/images/generations"), () => opts.imageFail ? { status: 500, body: { error: { message: "image model overloaded" } } } : { body: { data: [{ url: "https://oaidalle.example/img.png", revised_prompt: "a bakery" }] } }],
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
