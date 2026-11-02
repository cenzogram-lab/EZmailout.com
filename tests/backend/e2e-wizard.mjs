// Wizard flow end to end: the real frontend in Chromium, the real canister
// in PocketIC (live, through its HTTP gateway), and a print partner that
// answers locally. A customer picks a 4×6 postcard, drags the radius map's
// pin and radius handle, uploads the recipient list for that area (verified
// by the canister), adds a text layer in the studio, checks the Step 4 quote
// against the volume tiers, pays in test mode, and the browser's hand-off
// runs the four print steps against the partner's staging API.
//
// The canister's HTTPS outcalls are real in live mode. They reach the local
// partner through the admin's outcall proxy setting (every outcall goes to
// the proxy with the real address in `x-target-url`), served over TLS with a
// throwaway CA that the PocketIC server is told to trust (SSL_CERT_FILE).
//
//   node tests/backend/e2e-wizard.mjs   (after scripts/test-e2e.sh built the dist)
import { createServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { execFileSync } from "node:child_process";

const OUT = process.env.E2E_OUT ?? new URL("./.e2e/wizard/", import.meta.url).pathname;
const DIST = process.env.E2E_DIST ?? new URL("./.e2e/dist/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// ─── TLS for the local print partner ────────────────────────────────────────
const TLS = join(OUT, "tls");
mkdirSync(TLS, { recursive: true });
const ssl = (...a) => execFileSync("openssl", a, { cwd: TLS, stdio: "ignore" });
ssl("req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", "ca.key", "-out", "ca.pem", "-days", "2", "-subj", "/CN=EZmailout e2e CA");
ssl("req", "-newkey", "rsa:2048", "-nodes", "-keyout", "key.pem", "-out", "leaf.csr", "-subj", "/CN=127.0.0.1");
writeFileSync(join(TLS, "ext.cnf"), "subjectAltName=IP:127.0.0.1,DNS:localhost\nbasicConstraints=CA:FALSE\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n");
ssl("x509", "-req", "-in", "leaf.csr", "-CA", "ca.pem", "-CAkey", "ca.key", "-CAcreateserial", "-out", "cert.pem", "-days", "2", "-extfile", "ext.cnf");
const systemCa = ["/etc/ssl/certs/ca-certificates.crt", "/etc/pki/tls/certs/ca-bundle.crt"].find(existsSync);
writeFileSync(join(TLS, "bundle.pem"), (systemCa ? readFileSync(systemCa, "utf8") : "") + readFileSync(join(TLS, "ca.pem"), "utf8"));
process.env.SSL_CERT_FILE = join(TLS, "bundle.pem");

const { PocketIcServer } = await import("@dfinity/pic");
const { HttpAgent, Actor } = await import("@icp-sdk/core/agent");
const { start, check, failures, ident } = await import("./harness.mjs");
const { keys, fakePrintPartner } = await import("./fixtures.mjs");
const { idlFactory } = await import("./.gen/backend.did.js");
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "/opt/node22/lib/node_modules/playwright/index.mjs");
const chromium = pw.chromium ?? pw.default.chromium;
const ser = (v) => JSON.stringify(v, (_, x) => (typeof x === "bigint" ? `${x}n` : x));
const step = (s) => console.log(`\n▶ ${s}`);

// The frontend's own pricing module, so the quote is checked against the
// same tiers the customer sees.
const root = new URL("../../", import.meta.url);
const front = createRequire(new URL("src/frontend/package.json", root));
const esbuild = createRequire(front.resolve("vite"))("esbuild");
const pricingOut = new URL(".gen/pricing-wizard.mjs", import.meta.url).pathname;
await esbuild.build({
  entryPoints: [new URL("src/frontend/src/lib/pricing.ts", root).pathname],
  bundle: true, format: "esm", platform: "node", outfile: pricingOut, logLevel: "error",
  alias: { "@": new URL("src/frontend/src", root).pathname },
});
const pricing = await import(pricingOut);

// ─── Local print partner (HTTPS, behind the outcall proxy setting) ──────────
const routes = fakePrintPartner();
const partnerLog = [];
const partner = createHttpsServer({ key: readFileSync(join(TLS, "key.pem")), cert: readFileSync(join(TLS, "cert.pem")) }, (req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const bodyBytes = Buffer.concat(chunks);
    const entry = { method: req.method, url: String(req.headers["x-target-url"] ?? req.url), headers: req.headers, body: bodyBytes.toString("utf8"), bodyBytes };
    partnerLog.push(entry);
    for (const [match, respond] of routes) {
      if (match(entry)) {
        const r = respond(entry);
        if (r.reject) { req.socket.destroy(); return; }
        res.writeHead(r.status ?? 200, { "content-type": "application/json" });
        res.end(typeof r.body === "string" ? r.body : JSON.stringify(r.body ?? {}));
        return;
      }
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end('{"message":"no fake route"}');
  });
}).listen(0, "127.0.0.1");
await new Promise((r) => partner.once("listening", r));
const proxyUrl = `https://127.0.0.1:${partner.address().port}/`;

// ─── Canister ────────────────────────────────────────────────────────────────
const server = await PocketIcServer.start();
process.env.PIC_URL = server.getUrl();
const env = await start();
const printLogin = { fulfilmentUsername: "ezm-wizard-user", fulfilmentPassword: "WIZARD-PRINT-PASSWORD" };
const saved = await env.as(env.controller).saveAdminKeys(keys({ ...printLogin, fulfilmentEnvironment: { Staging: null }, sandboxCheckout: true, outcallProxyUrl: proxyUrl }));
check(saved.ok, "print login saved (staging, test checkout on, outcalls through the local partner)", saved.error);
const customer = ident(8);
await env.as(customer).ensureAccount([], []);

const gatewayPort = await env.pic.makeLive();
const liveActor = async (id) => Actor.createActor(idlFactory, { agent: await HttpAgent.create({ host: `http://127.0.0.1:${gatewayPort}`, identity: id, shouldFetchRootKey: true }), canisterId: env.canisterId });
const cust = await liveActor(customer);
const ctrl = await liveActor(env.controller);

// ─── Frontend ───────────────────────────────────────────────────────────────
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon", ".txt": "text/plain" };
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
await ctx.addInitScript((cfg) => localStorage.setItem("ezlive", JSON.stringify(cfg)), { host: `http://127.0.0.1:${gatewayPort}`, canisterId: env.canisterId.toText(), seed: 8 });
// Nothing leaves the machine: map tiles and every other host are refused.
await ctx.route((u) => !u.href.startsWith(site) && !u.href.startsWith(`http://127.0.0.1:${gatewayPort}`), (r) => r.abort());
const page = await ctx.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
const q = (id) => `[data-ocid="${id}"]`;
const shot = (n) => page.screenshot({ path: `${OUT}${n}.png`, fullPage: true });
const calls = () => page.evaluate(() => window.__calls);
const drag = async (locator, dx, dy) => {
  const box = await locator.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(x + (dx * i) / 12, y + (dy * i) / 12);
  await page.mouse.up();
};
const pinText = async () => /Pin:\s*(-?[\d.]+),\s*(-?[\d.]+)/.exec((await page.textContent(q("audience.map.canvas") + " + p")) ?? "");
const households = async () => Number(((await page.textContent(q("audience.map.estimate.card"))) ?? "").replace(/,/g, "").match(/Households\s*(\d+)/i)?.[1] ?? Number.NaN);

const N = 1000;
const TOTAL = N + 1; // the CSV rows and one typed address
const VARIANT = "4.25x6";
const csvRows = Array.from({ length: N }, (_, i) => `Neighbour ${i + 1},${100 + i} Elm Street,${i % 7 === 0 ? `Apt ${i}` : ""},Portland,OR,9720${i % 10}`);
const csvFile = join(OUT, "area-list.csv");
writeFileSync(csvFile, `name,address_line1,address_line2,city,state,zip_code\n${csvRows.join("\n")}\n`);

let launched = false;
let launchLog = null;
try {
  step("Step 1: a 4×6 postcard");
  await page.goto(`${site}/wizard`, { waitUntil: "networkidle" });
  await page.click(q("catalog.category.postcards.button"));
  await page.click(q(`catalog.format.${VARIANT}.button`));
  await page.fill(q("catalog.campaign_name.input"), "Elm Street bakery opening");
  const tiers = (await page.textContent(q(`catalog.size.${VARIANT}.tiers`)).catch(() => "")) ?? "";
  check(tiers.length > 0, "Step 1 lists the 4×6 postcard's volume tiers", tiers);
  await shot("01-product");
  await page.click(q("catalog.continue.button"));

  step("Step 2: drag the pin and the radius on the map");
  await page.waitForSelector(q("audience.map.canvas"), { timeout: 20000 });
  await page.waitForSelector('img.leaflet-marker-icon[alt="Centre pin"]', { timeout: 20000 });
  await page.waitForTimeout(1500); // the opening flight
  const pin0 = await pinText();
  const homes0 = await households();
  await drag(page.locator('img.leaflet-marker-icon[alt="Centre pin"]'), 120, 60);
  await page.waitForTimeout(1500);
  const pin1 = await pinText();
  check(pin0 && pin1 && (pin0[1] !== pin1[1] || pin0[2] !== pin1[2]), "dragging the pin moves the centre", { before: pin0?.slice(1), after: pin1?.slice(1) });
  const radiusBadge = async () => Number(/([\d.]+)\s*mi/.exec((await page.locator("label[for=audience-radius]").locator("xpath=..").textContent()) ?? "")?.[1]);
  const r0 = await radiusBadge();
  const homesAtPin = await households();
  await drag(page.locator('.leaflet-marker-icon[title="Drag to change the radius"]'), 90, 0);
  await page.waitForTimeout(1500);
  const r1 = await radiusBadge();
  const homesWider = await households();
  check(Number.isFinite(r0) && r1 > r0, "dragging the radius handle outward widens the radius", { before: r0, after: r1 });
  check(homesWider > homesAtPin, "the household estimate grows with the radius", { before: homesAtPin, after: homesWider, atStart: homes0 });
  // The slider still works, and the estimate follows it.
  await page.focus(`${q("audience.map.radius.slider")} [role=slider]`);
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(400);
  const r2 = await radiusBadge();
  const homesSlid = await households();
  check(r2 < r1 && homesSlid < homesWider, "the radius slider narrows it again and the estimate follows", { radius: [r1, r2], households: [homesWider, homesSlid] });
  await shot("02-radius");
  await page.click(q("audience.map.use.button"));
  await page.waitForSelector(q("audience.csv.area_note"), { timeout: 10000 });
  const note = (await page.textContent(q("audience.csv.area_note"))) ?? "";
  check(note.includes(`${r2} mi`) && /households/.test(note), "the CSV tab names the radius the list is for", note);

  step("Step 2: the recipient list for the area, verified by the canister");
  await page.setInputFiles(q("audience.csv.file.input"), csvFile);
  await page.waitForSelector(q("audience.csv.verify.button"), { timeout: 15000 });

  step("Step 2: one more address typed by hand");
  await page.click(`${q("audience.csv.manual.panel")} summary`);
  await page.fill(q("audience.csv.manual.name.input"), "Corner Café");
  await page.fill(q("audience.csv.manual.line1.input"), "1 Elm Street");
  await page.fill(q("audience.csv.manual.line2.input"), "Suite 2");
  await page.fill(q("audience.csv.manual.city.input"), "Portland");
  await page.fill(q("audience.csv.manual.state.input"), "or");
  await page.fill(q("audience.csv.manual.zip.input"), "9720");
  await page.click(q("audience.csv.manual.add.button"));
  const zipError = (await page.textContent(q("audience.csv.manual.error")).catch(() => "")) ?? "";
  const zipInvalid = await page.getAttribute(q("audience.csv.manual.zip.input"), "aria-invalid");
  check(zipError.includes("ZIP must be 5 digits") && zipInvalid === "true", "a 4-digit ZIP is refused with a message on the ZIP field", { zipError, zipInvalid });
  await page.fill(q("audience.csv.manual.zip.input"), "97201-1234");
  await page.click(q("audience.csv.manual.add.button"));
  await page.waitForTimeout(300);
  const parsed = (await page.locator(q("audience.csv.verify.button")).locator("xpath=../..").textContent()) ?? "";
  check(parsed.replace(/,/g, "").includes(`${TOTAL} recipients`), "the typed address (ZIP+4, state upper-cased) joins the list", parsed.slice(0, 120));
  await page.click(q("audience.csv.verify.button"));
  await page.waitForSelector(`${q("audience.csv.summary.card")}, ${q("audience.csv.verify.error")}`, { timeout: 120000 });
  const verifyError = (await page.isVisible(q("audience.csv.verify.error"))) ? await page.textContent(q("audience.csv.verify.error")) : null;
  check(!verifyError, "the canister verifies the list through the print partner's address lists", verifyError);
  const verifyLists = partnerLog.filter((r) => r.method === "POST" && r.url.endsWith("/addressLists"));
  check(verifyLists.length >= 1 && verifyLists.every((r) => r.url.startsWith("https://stage-rest.click2mail.com/molpro/")), "verification uploads the list to the staging API", verifyLists.map((r) => r.url));
  await shot("03-verified");
  await page.click(q("audience.csv.use.button"));

  step("Step 3: add a text layer in the studio");
  await page.waitForSelector(q("canvas.rail.text"), { timeout: 20000 });
  await page.click(q("canvas.rail.text"));
  await page.click(q("canvas.text.add_heading"));
  await page.waitForSelector(q("canvas.inspector.text_value"), { timeout: 10000 });
  await page.fill(q("canvas.inspector.text_value"), "Fresh bagels on Elm Street");
  await page.waitForTimeout(600);
  const onCanvas = await page.evaluate(() => [...document.querySelectorAll('[data-ocid^="canvas.editor.surface"] div')].some((d) => d.childElementCount === 0 && d.textContent === "Fresh bagels on Elm Street"));
  check(onCanvas, "the new text layer shows on the canvas with the typed text", onCanvas);
  const inProof = await page.evaluate(() => [...document.querySelectorAll('[data-ocid="canvas.preview.face.front"] div')].some((d) => d.textContent === "Fresh bagels on Elm Street"));
  check(inProof, "the 3D proof shows the same text on its front face", inProof);
  await shot("04-studio");

  step("Step 3: rotate a shape with its handle, a QR code from the toolbar and keys");
  const transformOf = (id) => page.evaluate((i) => document.querySelector(`[data-ocid="canvas.editor.element.${i}"]`)?.style.transform ?? "", id);
  const selectedId = () => page.evaluate(() => document.querySelector('[data-ocid^="canvas.editor.rotate_handle."]')?.getAttribute("data-ocid")?.split(".").pop() ?? null);
  await page.click(q("canvas.rail.elements"));
  await page.click(q("canvas.elements.fill.custom"));
  await page.fill(q("canvas.elements.fill.search"), "#e11d48");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  await page.click(q("canvas.elements.add_rect"));
  await page.fill(q("canvas.inspector.shape_w"), "300");
  await page.keyboard.press("Enter");
  await page.fill(q("canvas.inspector.shape_h"), "40");
  await page.keyboard.press("Enter");
  await page.click(q("canvas.align.center"));
  await page.click(q("canvas.align.middle"));
  const barId = await selectedId();
  const bar = page.locator(`[data-ocid="canvas.editor.element.${barId}"]`);
  const bb = await bar.boundingBox();
  const hb = await page.locator(q(`canvas.editor.rotate_handle.${barId}`)).boundingBox();
  const cx = bb.x + bb.width / 2;
  const cy = bb.y + bb.height / 2;
  // From above the centre round to its right: a quarter turn clockwise.
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 16; i++) {
    const a = -Math.PI / 2 + (Math.PI / 2) * (i / 16);
    await page.mouse.move(cx + 160 * Math.cos(a), cy + 160 * Math.sin(a) + (i === 16 ? 3 : 0));
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
  const barTurn = await page.inputValue(q("canvas.inspector.shape_rotation"));
  check(barTurn === "90" && (await transformOf(barId)).includes("rotate(90deg)"), "dragging the rotate handle a quarter turn turns the shape 90° (snapped to the right angle)", { barTurn, transform: await transformOf(barId) });
  const proofTurned = await page.evaluate(() => [...document.querySelectorAll('[data-ocid="canvas.preview.face.front"] img')].some((i) => i.style.transform.includes("rotate(90deg)")));
  check(proofTurned, "the 3D proof shows the shape turned", proofTurned);

  await page.click(q("canvas.rail.qr"));
  await page.fill(q("canvas.qr.destination_input"), "www.elmstreetbakery.example/open");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  await page.click(q("canvas.qr.add_front"));
  await page.waitForTimeout(300);
  const qrId = await selectedId();
  await page.click(q("canvas.rotate_90"));
  await page.waitForTimeout(200);
  check((await transformOf(qrId)).includes("rotate(90deg)") && (await page.inputValue(q("canvas.inspector.qr_rotation"))) === "90", "the toolbar's Rotate 90° turns the QR code", await transformOf(qrId));
  await page.locator(`[data-ocid="canvas.editor.element.${qrId}"]`).click();
  await page.keyboard.press("]");
  await page.waitForTimeout(150);
  const afterKey = await page.inputValue(q("canvas.inspector.qr_rotation"));
  await page.keyboard.press("[");
  await page.waitForTimeout(150);
  check(afterKey === "105" && (await page.inputValue(q("canvas.inspector.qr_rotation"))) === "90", "] and [ turn the selection 15° either way", { afterKey });
  await page.click(q("canvas.inspector.qr_rotation.left"));
  await page.waitForTimeout(150);
  check((await page.inputValue(q("canvas.inspector.qr_rotation"))) === "0", "the inspector's turn-left button turns it back a quarter", await page.inputValue(q("canvas.inspector.qr_rotation")));
  await page.click(q("canvas.inspector.qr_rotation.right"));
  await page.waitForTimeout(150);
  await shot("04b-rotated");

  step("Step 4: the quote at the volume rates, then launch");
  if (!(await page.isVisible(q("review.launch.card")))) {
    await page.click(q("canvas.continue_button")).catch(() => {});
    await page.waitForTimeout(500);
  }
  await page.waitForSelector(q("review.launch.card"), { timeout: 15000 });
  if (await page.isVisible(q("review.return_address.name.input"))) {
    await page.fill(q("review.return_address.name.input"), "Elm Street Bakery");
    await page.fill(q("review.return_address.line1.input"), "12 Elm Street");
    await page.fill(q("review.return_address.city.input"), "Portland");
    await page.fill(q("review.return_address.state.input"), "OR");
    await page.fill(q("review.return_address.zip.input"), "97201");
    await page.click(q("review.return_address.save.button"));
  }
  await page.waitForTimeout(800);
  const unit = pricing.getUnitPriceCents(VARIANT, TOTAL, false);
  const under1000 = pricing.getUnitPriceCents(VARIANT, 1, false) > unit ? pricing.getUnitPriceCents(VARIANT, 999, false) : null;
  const money = (c) => `$${(c / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  const lineTotal = ((await page.textContent(q("review.invoice.line_total"))) ?? "").trim();
  const invoice = (await page.textContent(q("review.invoice.card"))) ?? "";
  check(lineTotal === money(unit * TOTAL), `Step 4 quotes ${TOTAL} × ${money(unit)} = ${money(unit * TOTAL)} (the from-1,000 tier)`, { lineTotal, invoice: invoice.slice(0, 300) });
  check(under1000 !== null && unit < under1000 && (await page.isVisible(q("review.invoice.volume_discount"))), "the volume rate is below the under-1,000 price and Step 4 shows the saving", { unit, under1000 });
  check(await page.isEnabled(q("review.launch.button")), "every preflight item passes; launch is enabled");
  await shot("05-review");
  await page.click(q("review.launch.button"));
  await page.waitForSelector(`${q("review.success.card")}, ${q("review.launch.error")}`, { timeout: 300000 });
  const launchError = (await page.isVisible(q("review.launch.error"))) ? await page.textContent(q("review.launch.error")) : null;
  check(!launchError, "create → render PDF → upload → test-mode payment → print hand-off succeed in the UI", launchError);
  await page.waitForTimeout(1500);
  await shot("06-launched");
  const warning = (await page.isVisible(q("review.dispatch.warning"))) ? await page.textContent(q("review.dispatch.warning")) : null;
  check(!warning, "the browser's hand-off to print went through (no dispatch warning)", warning);
  launched = true;
  launchLog = await calls();
} catch (e) {
  await shot("99-failure");
  console.log("FLOW ERROR", e.message);
  failures.push(e.message);
}
const log = launchLog ?? (await calls().catch(() => []));
writeFileSync(`${OUT}calls.json`, ser(log));
console.log("page errors:", pageErrors.slice(0, 5));
check(pageErrors.length === 0, "no uncaught errors in the page", pageErrors);

if (launched) {
  step("The canister's record");
  const created = log.find((c) => c.name === "createCampaign");
  const rawId = created?.result?.campaignId;
  const campaignId = Array.isArray(rawId) ? rawId[0] : rawId;
  const unit = pricing.getUnitPriceCents(VARIANT, TOTAL, false);
  check(created?.result?.ok === true && Number(String(created.result.unitPriceCents).replace(/n$/, "")) === unit && Number(String(created.result.totalCents).replace(/n$/, "")) === unit * TOTAL, "createCampaign priced the order exactly as Step 4 quoted it", created?.result);
  check(created?.args?.[0]?.audienceType === "GeoRadius" || created?.args?.[0]?.audienceType?.GeoRadius !== undefined, "the campaign records a radius audience (the area kept with its list)", created?.args?.[0]?.audienceType);
  const rec = (await cust.getCampaign(campaignId))[0];
  check(ser(rec?.productionStatus).includes("Submitted") && rec?.printJobId?.[0], "the campaign is Submitted with its print job id stored", { production: rec?.productionStatus, job: rec?.printJobId, error: rec?.lastError });
  check(rec?.testMode === true, "the campaign is paid in test mode", rec?.paymentStatus);
  const storedFront = rec?.canvasState?.[0]?.front;
  const storedBar = storedFront?.logos.find((l) => l.width === 300 && l.height === 40);
  check(ser(storedBar?.rotation) === "[90]", "the campaign stores the bar's 90° turn", storedBar?.rotation);
  await page.goto(`${site}/campaigns/${campaignId}`, { waitUntil: "networkidle" });
  await page.waitForSelector(q("campaign_detail.design.thumbnail"), { timeout: 20000 });
  const pageTurns = await page.evaluate(() => [...document.querySelectorAll('[data-ocid="campaign_detail.design.thumbnail"] > *')].map((e) => e.style.transform).filter(Boolean));
  check(pageTurns.includes("rotate(90deg)"), "the campaign page draws the bar turned 90°", pageTurns);
  await page.screenshot({ path: `${OUT}07-campaign-page.png`, fullPage: true });

  step("The four print steps, as the partner received them");
  const print = partnerLog.filter((r) => r.url.includes("/molpro/"));
  for (const r of print) console.log(`  ${r.method} ${r.url.replace(/^https:\/\/[^/]+/, "")}  (${r.bodyBytes.length} bytes)`);
  const auth = "Basic " + Buffer.from(`${printLogin.fulfilmentUsername}:${printLogin.fulfilmentPassword}`).toString("base64");
  check(print.length > 0 && print.every((r) => r.url.startsWith("https://stage-rest.click2mail.com/molpro/")), "a test-mode campaign talks only to the staging API");
  check(print.every((r) => r.headers.authorization === auth), "every request carries the print login as Basic auth");
  const docs = print.filter((r) => r.method === "POST" && r.url.endsWith("/documents"));
  const doc = docs[0];
  const boundary = doc?.headers["content-type"]?.split("boundary=")[1];
  const text = doc?.bodyBytes.toString("latin1") ?? "";
  const field = (name) => (new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`).exec(text) ?? [])[1];
  const row = pricing.PRICING_LEDGER.find((p) => p.id === VARIANT);
  check(docs.length === 1 && boundary, "step 1: one document upload, multipart/form-data", doc?.headers["content-type"]);
  check(field("documentClass") === row?.documentClass && field("documentFormat") === "PDF", `step 1: documentClass "${row?.documentClass}", documentFormat PDF`, { documentClass: field("documentClass"), documentFormat: field("documentFormat") });
  const pdfStart = text.indexOf("%PDF-");
  const pdf = doc ? doc.bodyBytes.subarray(pdfStart, text.lastIndexOf("%%EOF") + 5) : Buffer.alloc(0);
  writeFileSync(`${OUT}print.pdf`, pdf);
  check(pdf.length > 0 && pdf.length <= 1_900_000, "step 1: the print PDF fits the 1.9 MB cap", pdf.length);
  const info = pdf.length ? execFileSync("pdfinfo", [`${OUT}print.pdf`]).toString() : "";
  const size = /Page size:\s+([\d.]+) x ([\d.]+) pts/.exec(info);
  check(/Pages:\s+2\b/.test(info) && size && Math.round(+size[1]) === Math.round((row?.widthInches ?? 0) * 72) && Math.round(+size[2]) === Math.round((row?.heightInches ?? 0) * 72), "step 1: 2 pages on the product's native sheet", { info: info.split("\n").filter((l) => /Pages|Page size/.test(l)) });
  if (pdf.length) {
    execFileSync("pdftoppm", ["-r", "60", "-f", "1", "-l", "1", "-png", `${OUT}print.pdf`, `${OUT}print-front`]);
    const front = readdirSync(OUT).find((f) => f.startsWith("print-front") && f.endsWith(".png"));
    const px = execFileSync("convert", [join(OUT, front), "-depth", "8", "txt:-"], { maxBuffer: 256 * 1024 * 1024 }).toString();
    let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
    for (const line of px.split("\n")) {
      const m = /^(\d+),(\d+):\s*\((\d+),(\d+),(\d+)/.exec(line);
      if (!m) continue;
      const [x, y, r, g, b] = m.slice(1).map(Number);
      if (Math.abs(r - 0xe1) < 40 && Math.abs(g - 0x1d) < 40 && Math.abs(b - 0x48) < 40) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    check(maxX >= 0 && h > 5 * w, "the print file draws the shape turned: the 300 × 40 bar prints upright", { w, h });
  }
  const lists = print.filter((r) => r.method === "POST" && r.url.endsWith("/addressLists"));
  const dispatchList = lists[lists.length - 1];
  const addresses = (dispatchList?.body.match(/<address>/g) ?? []).length;
  check(addresses === TOTAL && dispatchList.headers["content-type"] === "application/xml" && dispatchList.body.includes("<Address1>100 Elm Street</Address1>") && dispatchList.body.includes("<Address2>Suite 2</Address2>"), `step 2: the address list carries all ${TOTAL} recipients (the typed one included) as XML`, { addresses });
  const jobs = print.filter((r) => r.method === "POST" && r.url.endsWith("/jobs"));
  const form = new URLSearchParams(jobs[0]?.body ?? "");
  const spec = Object.fromEntries(["documentClass", "layout", "productionTime", "color", "paperType", "printOption", "mailClass"].map((k) => [k, form.get(k)]));
  check(jobs.length === 1 && ["layout", "productionTime", "color", "paperType", "printOption"].every((k) => (form.get(k) ?? "").length > 0) && form.get("documentClass") === row?.documentClass, "step 3: the job carries the full print spec", spec);
  check(/^doc\d+$/.test(form.get("documentId") ?? "") && /^list\d+$/.test(form.get("addressId") ?? "") && form.get("rtnName") === "Elm Street Bakery", "step 3: the job links the document, the address list and the return address", Object.fromEntries(form));
  const submits = print.filter((r) => r.method === "POST" && r.url.endsWith("/submit"));
  check(submits.length === 1 && submits[0].body === "billingType=User+Credit" && submits[0].url.includes(`/jobs/${rec?.printJobId?.[0]}/submit`), "step 4: the stored job is submitted once", submits.map((s) => s.url));

  step("The tracking poll picks the campaign up");
  const before = partnerLog.length;
  const polled = await ctrl.pollActiveTracking();
  const tracking = partnerLog.slice(before).filter((r) => r.url.includes(`/jobs/${rec?.printJobId?.[0]}/tracking`));
  check(tracking.length >= 1, "the tracking poll reads the job's IMb tracking", { polled, urls: partnerLog.slice(before).map((r) => r.url) });
}

await browser.close().catch(() => {});
web.close();
partner.close();
await env.pic.tearDown();
await server.stop();
console.log(`\n${failures.length} failing check(s)`);
process.exit(failures.length ? 1 : 0);
