// Mail-type template library audit (see mail.tsx).
//   node tests/templates/mail.mjs compare <id> [front|back] [out.png]
//   node tests/templates/mail.mjs stats
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const HERE = new URL(".", import.meta.url).pathname;
const FE = new URL("../../src/frontend/", import.meta.url).pathname;
const require = createRequire(`${FE}package.json`);
const vite = await import(pathToFileURL(require.resolve("vite")).href);
const { build, preview } = vite.default?.build ? vite.default : vite;
const react = (await import(pathToFileURL(require.resolve("@vitejs/plugin-react")).href)).default;

const config = {
  root: HERE,
  configFile: false,
  logLevel: "warn",
  publicDir: `${FE}public`,
  plugins: [react()],
  css: { postcss: `${FE}postcss.config.js` },
  build: { outDir: `${HERE}dist-mail`, emptyOutDir: true, minify: false, rollupOptions: { input: `${HERE}mail.html` } },
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${FE}src/` },
      { find: "declarations", replacement: `${FE}../declarations` },
      // mail.tsx sits outside the frontend package: resolve React from it.
      { find: /^react-dom\/client$/, replacement: require.resolve("react-dom/client") },
      { find: /^react$/, replacement: require.resolve("react") },
      { find: /^react-dom$/, replacement: require.resolve("react-dom") },
      { find: /^react\/jsx-runtime$/, replacement: require.resolve("react/jsx-runtime") },
      { find: /^react\/jsx-dev-runtime$/, replacement: require.resolve("react/jsx-dev-runtime") },
    ],
  },
};
if (!process.env.NO_BUILD) await build(config);
const server = await preview({ ...config, preview: { port: 4198, strictPort: false } });
const url = server.resolvedUrls.local[0];
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "/opt/node22/lib/node_modules/playwright/index.mjs");
const chromium = pw.chromium ?? pw.default.chromium;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1800, height: 1200 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.route((u) => !u.href.startsWith(url), (r) => r.abort());
await page.goto(`${url}mail.html`, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.harnessReady);
const [cmd, ...args] = process.argv.slice(2);
if (cmd === "compare") {
  const ids = args[0].split(",");
  const side = args[1] ?? "front";
  for (const id of ids) {
    await page.evaluate(([i, s]) => window.compare(i, s), [id, side]);
    await page.waitForTimeout(300);
    const out = args[2] && ids.length === 1 ? args[2] : `${process.env.OUT ?? "/tmp"}/${id}-${side}.png`;
    await page.locator("#stage").screenshot({ path: out });
    console.log("wrote", out);
  }
} else if (cmd === "audit") {
  // Layout audit of every converted template; with FIDELITY=1 also the
  // pixel difference between the original render and the print raster.
  const ids = await page.evaluate(() => window.templateIds());
  const pick = args[0] ? ids.filter((i) => args[0].split(",").some((p) => i.startsWith(p))) : ids;
  const problems = [];
  const fidelity = [];
  let n = 0;
  for (const id of pick) {
    const p = await page.evaluate((i) => window.auditTemplate(i), id);
    problems.push(...p);
    if (process.env.FIDELITY) {
      for (const side of ["front", "back"]) {
        const ok = await page.evaluate(([i, s]) => window.compare(i, s, 420), [id, side]).catch(() => false);
        if (!ok) continue;
        await page.waitForTimeout(150);
        const box = await page.locator("#orig").boundingBox();
        const rbox = await page.locator("#rast").boundingBox();
        if (!box || !rbox) continue;
        const a = (await page.screenshot({ clip: { x: box.x, y: box.y, width: Math.min(box.width, rbox.width), height: Math.min(box.height, rbox.height) } })).toString("base64");
        const b = (await page.screenshot({ clip: { x: rbox.x, y: rbox.y, width: Math.min(box.width, rbox.width), height: Math.min(box.height, rbox.height) } })).toString("base64");
        const d = await page.evaluate(([x, y]) => window.diffImages(`data:image/png;base64,${x}`, `data:image/png;base64,${y}`), [a, b]);
        if (d) fidelity.push({ id, side, ...d });
      }
    }
    if (++n % 50 === 0) console.error(`${n}/${pick.length}`);
  }
  const byKind = {};
  for (const p of problems) { const k = p.replace(/^\S+ \S+: /, "").replace(/"[^"]*"/g, "…").replace(/[\d.]+/g, "#"); byKind[k] = (byKind[k] ?? 0) + 1; }
  console.log(`${pick.length} templates, ${problems.length} problems`);
  console.log(JSON.stringify(Object.entries(byKind).sort((a, b) => b[1] - a[1]).slice(0, 30), null, 1));
  const fs = await import("node:fs");
  fs.writeFileSync(process.env.REPORT ?? "/tmp/mail-audit.json", JSON.stringify({ problems, fidelity }, null, 1));
  if (fidelity.length) {
    fidelity.sort((a, b) => b.mad - a.mad);
    console.log("worst fidelity:", fidelity.slice(0, 15).map((f) => `${f.id} ${f.side} mad=${f.mad.toFixed(1)} strong=${(f.strong * 100).toFixed(1)}%`).join("\n"));
  }
} else if (cmd === "debug") {
  console.log(JSON.stringify(await page.evaluate(([i, s, n]) => window.debugText(i, s, n), [args[0], args[1], args[2]]), null, 1));
} else if (cmd === "layouts") {
  console.log((await page.evaluate((i) => window.layouts(i), args[0].split(","))).join("\n"));
} else if (cmd === "stats") {
  const ids = await page.evaluate(() => window.templateIds());
  const pick = args[0] ? ids.filter((i) => i.startsWith(args[0])) : ids;
  for (const id of pick) console.log(JSON.stringify(await page.evaluate((i) => window.convert(i), id)));
}
console.log("errors:", errors.slice(0, 10));
await browser.close();
await new Promise((r) => server.httpServer.close(r));
