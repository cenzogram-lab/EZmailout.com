// UI walk: the real frontend (built with e2e/bridge.js, as for e2e.mjs) against
// the real canister in PocketIC, signed in as a customer who is also the admin
// and owns a draft and a dispatched campaign. Every route is opened at 360,
// 390, 768 and 1440 px wide; each view is screenshotted and checked for
// horizontal overflow, text below WCAG AA contrast against a solid backdrop,
// large light panels left over from a light theme, and copy that does not
// belong in a direct-mail product (crypto / wallet words).
//
//   scripts/test-ui.sh [route-name ...]     screenshots + report in tests/backend/.ui/
//
// Each view is opened in both themes (localStorage "ezmailout_theme" = light /
// dark; UI_THEMES=dark narrows it). Leftover light panels are only a finding
// in the dark theme. UI_VIEWPORTS=390,1440 narrows the widths. Exits 1 on overflow or banned copy;
// contrast and light-panel findings are reported (UI_STRICT=1 fails on them).
import { PocketIcServer } from "@dfinity/pic";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { start, upstream, call, ident } from "./harness.mjs";
import { keys, fakePrintPartner, campaignInput, printPdf } from "./fixtures.mjs";

const OUT = process.env.UI_OUT ?? new URL("./.ui/", import.meta.url).pathname;
const DIST = process.env.E2E_DIST ?? new URL("./.e2e/dist/", import.meta.url).pathname;
const WIDTHS = (process.env.UI_VIEWPORTS ?? "360,390,768,1440").split(",").map(Number);
// The theme switch keeps the choice under this key ("light" | "dark").
const THEMES = (process.env.UI_THEMES ?? "light,dark").split(",");
const only = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "/opt/node22/lib/node_modules/playwright/index.mjs");
const chromium = pw.chromium ?? pw.default.chromium;

// ─── Canister and data ───────────────────────────────────────────────────────
const server = await PocketIcServer.start();
process.env.PIC_URL = server.getUrl();
const env = await start();
const admin = env.as(env.controller);
await admin.saveAdminKeys(keys({ fulfilmentUsername: "ezm-ui-user", fulfilmentPassword: "UI-PRINT-PASSWORD", fulfilmentEnvironment: { Staging: null }, sandboxCheckout: true }));
const customer = ident(7);
const cust = env.as(customer);
await cust.ensureAccount([], ["ada@example.com"]);
await admin.assignAdmin(customer.getPrincipal());
const audience = [
  { name: "Ada Lovelace", address_line1: "1600 Pennsylvania Ave NW", address_line2: [], city: "Washington", state: "DC", zip_code: "20500", zip_plus4: ["0005"] },
  { name: "Grace Hopper", address_line1: "350 Fifth Ave", address_line2: ["Suite 300"], city: "New York", state: "NY", zip_code: "10118", zip_plus4: [] },
  { name: "Katherine Johnson", address_line1: "1 Harbor Way", address_line2: [], city: "Portland", state: "OR", zip_code: "97201", zip_plus4: [] },
];
await cust.savePreset("Harbor neighbours", audience, []);
// A dispatched (test-mode) campaign and an unpaid draft.
const up = upstream([...fakePrintPartner()]);
const sent = (await cust.createCampaign(campaignInput(3, { name: "Spring open house" }))).campaignId[0];
await cust.uploadDocumentChunk(sent, 0n, 1n, "application/pdf", "art.pdf", printPdf(3));
const intent = await call(env.pic, up, env.deferred(customer).createPaymentIntent({ CampaignOrder: null }, [sent], []));
await call(env.pic, up, env.deferred(customer).confirmPayment(intent.paymentIntentId[0]));
await call(env.pic, up, env.deferred(customer).dispatchPrintJob(sent));
await cust.createCampaign(campaignInput(3, { name: "Summer menu launch" }));
const code = (await cust.getMyAccount())[0].referralCode;

// ─── Frontend ────────────────────────────────────────────────────────────────
const gatewayPort = await env.pic.makeLive();
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".txt": "text/plain" };
const web = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join(DIST, path);
  if (!existsSync(file) || path.endsWith("/")) file = join(DIST, "index.html");
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
}).listen(0);
const site = `http://127.0.0.1:${web.address().port}`;
const browser = await chromium.launch(process.env.PLAYWRIGHT_BROWSERS_PATH ? { executablePath: `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium` } : {});

// Each route: a path, or a function that gets the page there. `prepare`
// gives the wizard a product (through a template) before its steps open.
const useTemplate = async (page) => {
  await page.goto(`${site}/templates`, { waitUntil: "networkidle" });
  await page.click('[data-ocid="template.open.re-just-listed-gradient.button"]');
  await page.waitForSelector('[data-ocid="templates.preview.dialog"] figure img');
  await page.click('[data-ocid="templates.preview.size.6x9"]');
  await page.click('[data-ocid="template.use.re-just-listed-gradient.button"]');
  await page.waitForURL(/\/wizard/);
  await page.waitForSelector('[data-ocid="canvas.editor.sheet"]');
  // The wizard draft is written 400 ms after the last change (DRAFT_SAVE_MS)
  // to IndexedDB; a deep link to Step 2 or 4 opened before that finds no
  // product and falls back to Step 1.
  await page.waitForTimeout(2000);
};
const ROUTES = [
  { name: "home", path: "/" },
  { name: "templates", path: "/templates" },
  { name: "template-preview", go: async (page) => { await page.goto(`${site}/templates`, { waitUntil: "networkidle" }); await page.click('[data-ocid="template.open.re-just-listed-gradient.button"]'); await page.waitForSelector('[data-ocid="templates.preview.dialog"] figure img'); } },
  { name: "wizard-1", path: "/wizard?step=1" },
  { name: "wizard-3-studio", go: useTemplate },
  { name: "wizard-2", path: "/wizard?step=2", prepare: useTemplate },
  { name: "wizard-4", path: "/wizard?step=4", prepare: useTemplate },
  { name: "campaigns", path: "/campaigns" },
  { name: "campaign-sent", path: `/campaigns/${sent}` },
  { name: "dashboard", path: "/dashboard" },
  { name: "admin", path: "/admin" },
  { name: "referral", path: `/ref/${code}` },
  { name: "not-found", path: "/no-such-page" },
  { name: "stampy-open", path: "/dashboard", after: async (page) => { await page.click('[data-ocid="stampy.launcher"], [data-ocid="chat.launcher.button"], button[aria-label*="Stampy" i]').catch(() => {}); await page.waitForTimeout(600); } },
].filter((r) => !only.length || only.includes(r.name));

// Runs in the page: overflow, contrast, light panels, banned copy.
const inspect = () => {
  const vw = document.documentElement.clientWidth;
  // Any CSS colour (oklch included) to sRGB, by painting it on a 1×1 canvas.
  const paint = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const seen = new Map();
  const parse = (c) => {
    if (!c || c === "transparent" || c === "rgba(0, 0, 0, 0)") return { r: 0, g: 0, b: 0, a: 0 };
    if (seen.has(c)) return seen.get(c);
    paint.clearRect(0, 0, 1, 1);
    paint.fillStyle = "#000";
    paint.fillStyle = c;
    paint.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = paint.getImageData(0, 0, 1, 1).data;
    const out = { r, g, b, a: a / 255 };
    seen.set(c, out);
    return out;
  };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const designArea = (el) => !!el.closest('[data-ocid^="canvas.editor.surface"], [data-ocid="canvas.editor.sheet"], [data-template-preview], figure, .leaflet-container, [data-ocid^="template.card"], [data-ocid*="preview"], canvas');
  const clipped = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if (/(hidden|auto|scroll|clip)/.test(cs.overflowX)) return true; } return false; };
  // Solid backdrop: the first ancestor with an opaque background colour and
  // no background image; null when an image or gradient is in the way.
  const backdrop = (el) => {
    for (let p = el; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
      const c = parse(cs.backgroundColor);
      if (c && c.a >= 0.95) return c;
      if (c && c.a > 0.05) return null;
    }
    return parse(getComputedStyle(document.body).backgroundColor);
  };
  const overflow = [];
  const lowContrast = [];
  const lightPanels = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
    if (r.right > vw + 1 && cs.position !== "fixed" && !clipped(el)) overflow.push({ tag: el.tagName, ocid: el.closest("[data-ocid]")?.getAttribute("data-ocid") ?? null, right: Math.round(r.right), text: (el.textContent ?? "").trim().slice(0, 40) });
    // Off-screen render hosts (the mail-template converter mounts designs at
    // -30000px while it converts them) are artwork, not UI.
    if (r.right <= 0) continue;
    if (designArea(el)) continue;
    const bg = parse(cs.backgroundColor);
    if (bg && bg.a >= 0.9 && lum(bg) > 0.75 && r.width * r.height > 6000 && r.width < vw * 1.01) lightPanels.push({ tag: el.tagName, ocid: el.closest("[data-ocid]")?.getAttribute("data-ocid") ?? null, size: `${Math.round(r.width)}x${Math.round(r.height)}`, color: cs.backgroundColor });
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const fg = parse(cs.color);
    const back = backdrop(el);
    if (!fg || !back || fg.a < 0.5) continue;
    const size = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    const got = ratio(fg, back);
    if (got < need - 0.05) lowContrast.push({ text: el.textContent.trim().slice(0, 48), ratio: Math.round(got * 100) / 100, need, color: cs.color, bg: `rgb(${back.r}, ${back.g}, ${back.b})`, ocid: el.closest("[data-ocid]")?.getAttribute("data-ocid") ?? null });
  }
  const text = document.body.innerText;
  const banned = [...(text.match(/\b(crypto\w*|wallets?|bonding curve|tickers?|coins?|web3|blockchain|memecoins?|trad(e|ing) the moment)\b/gi) ?? []), ...(text.match(/\b(SOL|\$[A-Z]{3,6})\b/g) ?? [])];
  return { scrollWidth: document.documentElement.scrollWidth, vw, overflow: overflow.slice(0, 12), lowContrast: lowContrast.slice(0, 30), lowContrastCount: lowContrast.length, lightPanels: lightPanels.slice(0, 12), lightPanelCount: lightPanels.length, banned };
};

const report = [];
let failed = 0;
try {
  for (const theme of THEMES) for (const width of WIDTHS) {
    for (const route of ROUTES) {
      const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, deviceScaleFactor: 1, hasTouch: width < 1024, isMobile: width < 768 });
      await ctx.addInitScript(([cfg, t]) => { localStorage.setItem("ezlive", JSON.stringify(cfg)); localStorage.setItem("ezmailout_theme", t); }, [{ host: `http://127.0.0.1:${gatewayPort}`, canisterId: env.canisterId.toText(), seed: 7 }, theme]);
      await ctx.route((u) => !u.href.startsWith(site) && !u.href.startsWith(`http://127.0.0.1:${gatewayPort}`), (r) => r.abort());
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      try {
        if (route.prepare) await route.prepare(page);
        if (route.go) await route.go(page);
        else await page.goto(`${site}${route.path}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(900);
        if (route.after) await route.after(page);
        const found = await page.evaluate(inspect);
        found.themeApplied = await page.evaluate(() => (document.documentElement.classList.contains("dark") ? "dark" : "light"));
        if (theme === "light") { found.lightPanels = []; found.lightPanelCount = 0; }
        const file = `${route.name}-${theme}-${width}.png`;
        await page.screenshot({ path: `${OUT}${file}`, fullPage: true });
        const bad = found.scrollWidth > found.vw + 1 || found.overflow.length > 0 || found.banned.length > 0 || (process.env.UI_STRICT === "1" && (found.lowContrastCount > 0 || found.lightPanelCount > 0 || found.themeApplied !== theme));
        if (bad) failed++;
        report.push({ route: route.name, theme, width, file, errors, ...found });
        console.log(`${bad ? "FAIL" : "ok  "} ${route.name} ${theme}${found.themeApplied !== theme ? `(shows ${found.themeApplied})` : ""} @${width}: overflow ${found.scrollWidth > found.vw + 1 ? `${found.scrollWidth}px` : "none"}${found.overflow.length ? ` (${found.overflow.length} el)` : ""} · contrast ${found.lowContrastCount} · light panels ${found.lightPanelCount}${found.banned.length ? ` · banned copy: ${[...new Set(found.banned)].join(", ")}` : ""}${errors.length ? ` · page errors ${errors.length}` : ""}`);
      } catch (e) {
        failed++;
        report.push({ route: route.name, theme, width, error: String(e?.message ?? e), errors });
        console.log(`FAIL ${route.name} ${theme} @${width}: ${String(e?.message ?? e).split("\n")[0]}`);
      } finally {
        await ctx.close();
      }
    }
  }
} finally {
  writeFileSync(`${OUT}report.json`, JSON.stringify(report, null, 1));
  await browser.close();
  web.close();
  await server.stop();
}
console.log(`\n${failed} failing view(s); screenshots and report.json in ${OUT}`);
process.exit(failed ? 1 : 0);
