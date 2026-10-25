// End-to-end: the real frontend (built with tests/backend/e2e-bridge.js in
// place of the sign-in/actor package) drives the real canister in PocketIC
// through its HTTP gateway, as a fixed signed-in identity. The customer path
// runs in Chromium: template → studio edits (text, font, colours) → Step 4 →
// create campaign → render the print PDF → upload → test-mode payment. Then
// the print hand-off runs against a print partner that records every request
// (or, with E2E_LIVE=1 and the staging login in C2M_STAGE_USERNAME /
// C2M_STAGE_PASSWORD, against the print partner's real staging API).
//
//   node tests/backend/e2e.mjs        (after scripts/test-backend.sh has run once)
import { PocketIcServer } from "@dfinity/pic";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { start, upstream, call, check, failures, ident } from "./harness.mjs";
import { keys, fakePrintPartner } from "./fixtures.mjs";

const OUT = process.env.E2E_OUT ?? new URL("./.e2e/", import.meta.url).pathname;
const DIST = process.env.E2E_DIST ?? new URL("./.e2e/dist/", import.meta.url).pathname;
const LIVE = process.env.E2E_LIVE === "1";
mkdirSync(OUT, { recursive: true });
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "/opt/node22/lib/node_modules/playwright/index.mjs");
const chromium = pw.chromium ?? pw.default.chromium;
const ser = (v) => JSON.stringify(v, (_, x) => (typeof x === "bigint" ? `${x}n` : x));
const step = (s) => console.log(`\n▶ ${s}`);

// ─── Canister ────────────────────────────────────────────────────────────────
const server = await PocketIcServer.start();
process.env.PIC_URL = server.getUrl();
const env = await start();
const admin = env.as(env.controller);
const printLogin = LIVE
  ? { fulfilmentUsername: process.env.C2M_STAGE_USERNAME, fulfilmentPassword: process.env.C2M_STAGE_PASSWORD }
  : { fulfilmentUsername: "ezm-e2e-user", fulfilmentPassword: "E2E-PRINT-PASSWORD" };
if (LIVE && !(printLogin.fulfilmentUsername && printLogin.fulfilmentPassword)) throw new Error("E2E_LIVE=1 needs C2M_STAGE_USERNAME and C2M_STAGE_PASSWORD");
check((await admin.saveAdminKeys(keys({ ...printLogin, fulfilmentEnvironment: { Staging: null }, sandboxCheckout: true }))).ok, "print login saved (staging, test checkout on)");
const customer = ident(7);
const cust = env.as(customer);
await cust.ensureAccount([], []);
const audience = [
  { name: "Ada Lovelace", address_line1: "1600 Pennsylvania Ave NW", address_line2: [], city: "Washington", state: "DC", zip_code: "20500", zip_plus4: ["0005"] },
  { name: "Grace Hopper", address_line1: "350 Fifth Ave", address_line2: ["Suite 300"], city: "New York", state: "NY", zip_code: "10118", zip_plus4: [] },
  { name: "Katherine Johnson", address_line1: "1 Harbor Way", address_line2: [], city: "Portland", state: "OR", zip_code: "97201", zip_plus4: [] },
];
const preset = await cust.savePreset("E2E neighbours", audience, []);
check(preset.ok, "saved audience created for the customer", preset);

// ─── Frontend ───────────────────────────────────────────────────────────────
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
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript((cfg) => localStorage.setItem("ezlive", JSON.stringify(cfg)), { host: `http://127.0.0.1:${gatewayPort}`, canisterId: env.canisterId.toText(), seed: 7 });
await ctx.route((u) => !u.href.startsWith(site) && !u.href.startsWith(`http://127.0.0.1:${gatewayPort}`), (r) => r.abort());
const page = await ctx.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
const q = (id) => `[data-ocid="${id}"]`;
const shot = (n) => page.screenshot({ path: `${OUT}${n}.png`, fullPage: true });
const calls = () => page.evaluate(() => window.__calls);
const textOnCanvas = (startsWith) =>
  page.evaluate((s) => {
    const el = [...document.querySelectorAll('[data-ocid^="canvas.editor.surface"] div')].find((d) => d.childElementCount === 0 && d.textContent?.startsWith(s));
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { family: cs.fontFamily, color: cs.color, text: el.textContent };
  }, startsWith);

let done = false;
let launchLog = null;
try {
  step("Template gallery → Customize");
  await page.goto(`${site}/templates`, { waitUntil: "networkidle" });
  await page.click(q("template.open.re-just-listed-gradient.button"));
  await page.waitForSelector('[data-ocid="templates.preview.dialog"] figure img');
  await page.click(q("templates.preview.size.6x9"));
  await page.click(q("template.use.re-just-listed-gradient.button"));
  await page.waitForURL(/\/wizard/);
  await page.waitForSelector(q("canvas.editor.sheet"));
  await page.waitForTimeout(800);
  check((await textOnCanvas("Your next chapter")) !== null, "the template's headline is on the studio canvas");
  await shot("01-studio");

  step("Edit the headline: text, font and colour");
  const head = page.locator('[data-ocid^="canvas.editor.surface"] div', { hasText: /^Your next chapter/ }).last();
  await head.click();
  await page.fill(q("canvas.inspector.text_value"), "Your next chapter starts at 42 Bayview Court — open Sunday");
  await page.click(q("canvas.inspector.font"));
  await page.fill(q("canvas.inspector.font.search"), "montserrat");
  await page.keyboard.press("Enter");
  // The font list hands focus back to its button as it closes; a colour
  // picker opened before then loses focus to it and closes again.
  await page.waitForSelector(q("canvas.inspector.font.popover"), { state: "detached" });
  await page.click(q("canvas.inspector.swatch.custom"));
  await page.fill(q("canvas.inspector.swatch.search"), "#7c3aed");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const edited = await textOnCanvas("Your next chapter");
  check(edited?.family.includes("Montserrat"), "the headline is set in Montserrat on the canvas", edited);
  check(edited?.color === "rgb(124, 58, 237)", "the headline is #7c3aed on the canvas", edited);
  check(edited?.text.endsWith("open Sunday"), "the headline text edit shows on the canvas", edited);
  const fits = await page.evaluate(() => {
    const el = [...document.querySelectorAll('[data-ocid^="canvas.editor.surface"] div')].find((d) => d.childElementCount === 0 && d.textContent?.startsWith("Your next chapter"));
    return el ? { scroll: el.scrollHeight, client: el.clientHeight } : null;
  });
  check(fits && fits.scroll <= fits.client + 1, "the edited headline's box grows to fit its text (no overflow)", fits);

  step("QR code: tracked destination");
  await page.click(q("canvas.side.front"));
  await page.click(q("canvas.rail.qr"));
  await page.fill(q("canvas.qr.destination_input"), "www.yourwebsite.com/open-house");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);

  step("Edit the back: paper colour from the colour chart");
  await page.click(q("canvas.side.back"));
  await page.waitForTimeout(300);
  await page.click(q("canvas.rail.brand"));
  await page.click(q("canvas.brand.paper.custom"));
  await page.fill(q("canvas.brand.paper.search"), "ivory");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  const paper = await page.evaluate(() => getComputedStyle(document.querySelector('[data-ocid="canvas.editor.surface.back"]')).backgroundColor);
  check(paper === "rgb(255, 255, 240)", "the back's paper is ivory (#fffff0) from the colour search", paper);
  await shot("02-studio-edited");

  step("Reload: the draft survives");
  await page.waitForTimeout(800);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(q("canvas.editor.sheet"), { timeout: 20000 });
  await page.waitForTimeout(800);
  await page.click(q("canvas.side.front"));
  await page.waitForTimeout(300);
  const restored = await textOnCanvas("Your next chapter");
  check(restored?.family.includes("Montserrat") && restored?.color === "rgb(124, 58, 237)" && restored?.text.endsWith("open Sunday"), "after a reload the studio reopens with the edited headline (text, Montserrat, #7c3aed)", restored);
  await page.click(q("canvas.side.back"));
  await page.waitForTimeout(300);
  const paperAfter = await page.evaluate(() => getComputedStyle(document.querySelector('[data-ocid="canvas.editor.surface.back"]')).backgroundColor);
  check(paperAfter === "rgb(255, 255, 240)", "after a reload the back is still ivory", paperAfter);
  await page.click(q("canvas.side.front"));

  step("Audience: the saved audience");
  await page.click(q("wizard.step.2.indicator"));
  await page.waitForSelector(q("audience.tab.preset"));
  await page.click(q("audience.tab.preset"));
  await page.click(q("audience.presets.item.1"));
  await page.click(q("audience.preset_editor.rerun.button"));
  await page.waitForTimeout(600);
  await shot("03-audience");

  step("Review & launch");
  if (!(await page.isVisible(q("review.launch.card")))) {
    await page.click(q("canvas.continue_button")).catch(() => {});
    await page.waitForTimeout(500);
  }
  await page.waitForSelector(q("review.launch.card"), { timeout: 15000 });
  if (await page.isVisible(q("review.return_address.name.input"))) {
    await page.fill(q("review.return_address.name.input"), "Harbor Lane Realty");
    await page.fill(q("review.return_address.line1.input"), "88 Linden Avenue");
    await page.fill(q("review.return_address.city.input"), "Portland");
    await page.fill(q("review.return_address.state.input"), "OR");
    await page.fill(q("review.return_address.zip.input"), "97205");
    await page.click(q("review.return_address.save.button"));
  }
  await page.waitForTimeout(500);
  await shot("04-review");
  check(await page.isEnabled(q("review.launch.button")), "every preflight item passes; launch is enabled");
  const textItem = await page.locator(':text("Text fits and doesn\'t overlap")').first().locator("xpath=..").textContent().catch(() => null);
  check(textItem?.includes("overlaps"), "preflight warns that the longer headline now overlaps the line below", textItem);
  await page.click(q("review.launch.button"));
  await page.waitForSelector(`${q("review.success.card")}, ${q("review.launch.error")}`, { timeout: 180000 });
  await shot("05-after-checkout");
  const launchError = (await page.isVisible(q("review.launch.error"))) ? await page.textContent(q("review.launch.error")) : null;
  check(!launchError, "create → render PDF → upload → test-mode payment all succeed in the UI", launchError);
  done = true;
  launchLog = await calls();
  await page.goto(`${site}/wizard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const fresh = await page.evaluate(() => document.querySelector("main")?.textContent?.includes("Choose your mail piece"));
  check(fresh, "after payment the draft is discarded: /wizard starts fresh", fresh);
} catch (e) {
  await shot("99-failure");
  console.log("FLOW ERROR", e.message);
  failures.push(e.message);
}
const log = launchLog ?? (await calls());
writeFileSync(`${OUT}calls.json`, ser(log));
console.log("page errors:", pageErrors.slice(0, 5));
check(pageErrors.length === 0, "no uncaught errors in the page", pageErrors);

if (done) {
  const created = log.find((c) => c.name === "createCampaign");
  const campaignId = created?.result?.campaignId;
  check(created?.result?.ok === true && campaignId, "the canister accepted the template campaign (canvas validation passed)", created?.result);
  const uploads = log.filter((c) => c.name === "uploadDocumentChunk");
  check(uploads.length > 0 && uploads.every((u) => u.result?.ok), `the print PDF uploaded in ${uploads.length} chunk(s)`, uploads.map((u) => u.result));
  const firstDispatch = log.find((c) => c.name === "dispatchPrintJob");
  console.log("  first hand-off from the browser (live outcall):", firstDispatch?.result?.error ?? firstDispatch?.result);

  step("Saved design matches what the studio sent");
  const stored = await cust.getCampaign(campaignId);
  const rec = stored[0] ?? stored;
  const sent = created.args[0].canvasState;
  const norm = (c) => JSON.parse(ser(c));
  const storedCanvas = norm(rec.canvasState[0] ?? rec.canvasState);
  const strip = (side) => ({ ...side, backgroundImageUrl: side.backgroundImageUrl?.[0] ?? side.backgroundImageUrl ?? null });
  const keyed = (blocks) => blocks.map((t) => JSON.stringify(Object.fromEntries(Object.keys(t).sort().map((k) => [k, typeof t[k] === "string" && /^\d+n$/.test(t[k]) ? t[k].slice(0, -1) : t[k]]))));
  const [sa, sb] = [keyed(storedCanvas.front.textBlocks), keyed(sent.front.textBlocks)];
  const diff = sa.findIndex((x, i) => x !== sb[i]);
  check(sa.length === sb.length && diff === -1, "front text layers stored exactly as sent (text, font, colour, size, box)", diff === -1 ? { stored: sa.length, sent: sb.length } : { stored: sa[diff], sent: sb[diff] });
  check(storedCanvas.back.backgroundColor === "#fffff0", "the back's ivory paper is stored", storedCanvas.back.backgroundColor);
  const headline = storedCanvas.front.textBlocks.find((t) => t.text.startsWith("Your next chapter"));
  check(headline?.fontFamily === "Montserrat" && headline?.color === "#7c3aed", "the stored headline is Montserrat #7c3aed", headline);
  check(storedCanvas.front.logos.length > 0 && storedCanvas.front.qrCodes.length === 1, "artwork layers and the QR code are stored", { logos: storedCanvas.front.logos.length, qr: storedCanvas.front.qrCodes.length });
  check(ser(rec.paymentStatus).includes("Waived") || rec.testMode, "the campaign is paid in test mode", rec.paymentStatus);

  if (LIVE) {
    step("Print hand-off: the print partner's real staging API");
    check(firstDispatch?.result?.ok === true, "the browser's hand-off went through on staging (document, address list, job, submit)", firstDispatch?.result);
    const rec2 = (await cust.getCampaign(campaignId))[0];
    console.log("  staging ids:", ser({ document: rec2.printDocumentId, list: rec2.printAddressListId, job: rec2.printJobId, production: rec2.productionStatus }));
    check(ser(rec2.productionStatus).includes("Submitted") && rec2.printJobId?.[0], "staging accepted and submitted the job", rec2.lastError);
    const v = await env.as(customer).verifyAddresses([{ name: "Ada Lovelace", address_line1: "1600 Pennsylvania Ave NW", address_line2: [], city: "Washington", state: "DC", zip_code: "20500" }]);
    check(v.ok, "staging address verification answers", v);
    const sync = await env.as(env.controller).syncPrintTracking(campaignId);
    check(sync.ok, "staging job status and tracking answer", sync);
  } else {
    step("Print hand-off against the print partner");
    await env.pic.stopLive();
    const recorder = upstream(fakePrintPartner());
    const dispatched = await call(env.pic, recorder, env.deferred(env.controller).dispatchPrintJob(campaignId));
    check(dispatched.ok, "dispatch succeeds", dispatched);
    const print = recorder.log.filter((r) => r.url.includes("/molpro/"));
    for (const r of print) console.log(`  ${r.method} ${r.url.replace(/^https:\/\/[^/]+/, "")}  (${r.body.length} bytes)`);
    const auth = "Basic " + Buffer.from(`${printLogin.fulfilmentUsername}:${printLogin.fulfilmentPassword}`).toString("base64");
    check(print.every((r) => r.url.startsWith("https://stage-rest.click2mail.com/molpro/")), "test-mode job goes to the staging API");
    check(print.every((r) => r.headers.authorization === auth), "every request carries the print login as Basic auth");
    const doc = print.find((r) => r.method === "POST" && r.url.endsWith("/documents"));
    const raw = doc ? doc.bodyBytes : null;
    const boundary = doc?.headers["content-type"]?.split("boundary=")[1];
    check(doc && boundary, "the document goes up as multipart/form-data", doc?.headers["content-type"]);
    if (raw && boundary) {
      const text = raw.toString("latin1");
      const field = (name) => (new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`).exec(text) ?? [])[1];
      check(field("documentClass") === "Postcard 6 x 9", "documentClass is the exact print product name", field("documentClass"));
      check(field("documentFormat") === "PDF", "documentFormat is PDF", field("documentFormat"));
      const start = text.indexOf("%PDF-");
      const end = text.lastIndexOf("%%EOF") + 5;
      const pdf = raw.subarray(start, end);
      writeFileSync(`${OUT}print.pdf`, pdf);
      const info = execFileSync("pdfinfo", [`${OUT}print.pdf`]).toString();
      const pages = Number(/Pages:\s+(\d+)/.exec(info)?.[1]);
      const size = /Page size:\s+([\d.]+) x ([\d.]+) pts/.exec(info);
      check(pages === 2, "the print PDF the partner receives has 2 pages (front, back)", info);
      check(size && Math.round(+size[1]) === 432 && Math.round(+size[2]) === 648, "pages are 6 × 9 in on the native sheet (432 × 648 pt)", size?.[0]);
      execFileSync("pdftoppm", ["-r", "40", "-png", `${OUT}print.pdf`, `${OUT}print-page`]);
      const sample = (file, hex) => {
        const out = execFileSync("convert", [file, "-depth", "8", "txt:-"], { maxBuffer: 256 * 1024 * 1024 }).toString();
        const want = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
        return out.split("\n").filter((l) => { const m = /\((\d+),(\d+),(\d+)/.exec(l); return m && Math.abs(+m[1] - want[0]) < 30 && Math.abs(+m[2] - want[1]) < 30 && Math.abs(+m[3] - want[2]) < 30; }).length;
      };
      check(sample(`${OUT}print-page-1.png`, "#7c3aed") > 30, "the purple headline is printed on the front page");
      check(sample(`${OUT}print-page-2.png`, "#fffff0") > 2000, "the back page is printed on ivory");
    }
    const list = print.find((r) => r.method === "POST" && r.url.endsWith("/addressLists"));
    check(list && ["Ada", "Lovelace", "1600 Pennsylvania Ave NW", "20500-0005", "Grace", "Suite 300", "Katherine"].every((s) => list.body.includes(s)), "the address list carries all 3 saved-audience recipients (ZIP+4 kept)", list?.body.slice(0, 400));
    check(list?.headers["content-type"] === "application/xml", "the address list is XML", list?.headers["content-type"]);
    const job = print.find((r) => r.method === "POST" && r.url.endsWith("/jobs"));
    const form = new URLSearchParams(job?.body ?? "");
    check(form.get("documentClass") === "Postcard 6 x 9" && form.get("layout") === "Double Sided Postcard", "the job names the product and layout", Object.fromEntries(form));
    check(form.get("rtnName") === "Harbor Lane Realty" && form.get("rtnAddress1") === "88 Linden Avenue" && form.get("rtnZip") === "97205", "the job carries the return address typed in Step 4", Object.fromEntries(form));
    check(/^doc\d+$/.test(form.get("documentId") ?? "") && /^list\d+$/.test(form.get("addressId") ?? ""), "the job links the uploaded document and address list");
    const submit = print.find((r) => r.method === "POST" && r.url.endsWith("/submit"));
    check(submit?.body === "billingType=User+Credit", "the job is submitted with billingType=User Credit", submit?.body);

  }
  if (!LIVE) {
    step("Status after dispatch, then tracking");
    const after = (await cust.getCampaign(campaignId))[0];
    check(ser(after.productionStatus).includes("Submitted") && after.printJobId?.[0], "the campaign is Submitted with a print job id", { production: after.productionStatus, job: after.printJobId });
    const tracker = upstream(fakePrintPartner({ scans: ["Accepted at USPS Origin Facility", "Arrived at USPS Regional Facility"] }));
    const sync = await call(env.pic, tracker, env.deferred(env.controller).syncPrintTracking(campaignId));
    check(sync.ok, "tracking sync reads the job and its IMB scans", sync);
    check(tracker.log.some((r) => r.url.endsWith("/tracking?trackingType=IMB")), "tracking asks for IMB scans");

  }
  step("The customer sees it in the app");
  const port2 = await env.pic.makeLive();
  const b2 = await chromium.launch(process.env.PLAYWRIGHT_BROWSERS_PATH ? { executablePath: `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium` } : {});
  const c2 = await b2.newContext({ viewport: { width: 1440, height: 900 } });
  await c2.addInitScript((cfg) => localStorage.setItem("ezlive", JSON.stringify(cfg)), { host: `http://127.0.0.1:${port2}`, canisterId: env.canisterId.toText(), seed: 7 });
  const p2 = await c2.newPage();
  await p2.goto(`${site}/campaigns/${campaignId}`, { waitUntil: "networkidle" });
  await p2.waitForTimeout(2500);
  const detail = await p2.textContent("main");
  check(/Submitted|In Production|In Transit|Test mode/i.test(detail ?? ""), "the campaign page shows the dispatched campaign", (detail ?? "").slice(0, 200));
  await p2.screenshot({ path: `${OUT}06-campaign.png`, fullPage: true });
  await b2.close();
}
await browser.close().catch(() => {});
web.close();
await env.pic.tearDown();
await server.stop();
console.log(`\n${failures.length} failing check(s)`);
process.exit(failures.length ? 1 : 0);
