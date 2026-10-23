// Template audit: builds every gallery template on every format, in both
// orientations, front and back, and checks text overflow, the safe area,
// the USPS zone, #10 windows, tear strips, folds, overlapping text and WCAG
// contrast sampled from the rendered background; then rasterizes each
// showcase side the way the print PDF does. Exits 1 on any problem.
//
//   node tests/templates/run.mjs            full audit (a few minutes)
//   node tests/templates/run.mjs --quick    showcase format only
//
// Needs the frontend's node_modules (pnpm install in src/frontend) and
// Playwright with Chromium (PLAYWRIGHT_MODULE overrides where it is loaded).
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const HERE = new URL(".", import.meta.url).pathname;
const FE = new URL("../../src/frontend/", import.meta.url).pathname;
const require = createRequire(`${FE}package.json`);
const vite = await import(pathToFileURL(require.resolve("vite")).href);
const { build, preview } = vite.default?.build ? vite.default : vite;

const config = {
  root: HERE,
  configFile: false,
  logLevel: "warn",
  publicDir: `${FE}public`,
  build: { outDir: `${HERE}dist`, emptyOutDir: true, minify: false },
  resolve: { alias: [{ find: /^@\//, replacement: `${FE}src/` }] },
};
await build(config);
const server = await preview({ ...config, preview: { port: 4199, strictPort: false } });
const url = server.resolvedUrls.local[0];

const pw = await import(
  process.env.PLAYWRIGHT_MODULE ??
    (() => {
      try {
        return pathToFileURL(require.resolve("playwright")).href;
      } catch {
        return "/opt/node22/lib/node_modules/playwright/index.mjs";
      }
    })()
);
const chromium = pw.chromium ?? pw.default.chromium;
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_BROWSERS_PATH ? { executablePath: `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium` } : {},
);
const page = await browser.newPage();
await page.route((u) => !u.href.startsWith(url), (r) => r.abort());
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.auditReady);
const quick = process.argv.includes("--quick");
const audit = await page.evaluate((q) => window.runAudit(q ? { showcaseOnly: true } : {}), quick);
const raster = await page.evaluate(() => window.rasterTest());
await browser.close();
await new Promise((r) => server.httpServer.close(r));

const soft = raster.filter((r) => !r.ok || r.corner === null);
console.log(
  `${audit.builds} builds (${audit.avgMs.toFixed(1)} ms each), ${audit.problems.length} layout problems; ` +
    `${raster.length} sides rasterized, ${soft.length} below 150 DPI`,
);
for (const p of audit.problems.slice(0, 40)) console.log(`  ${p}`);
for (const s of soft) console.log(`  ${s.id} ${s.key}: ${s.dpi} DPI`);
process.exit(audit.problems.length || soft.length ? 1 : 0);
