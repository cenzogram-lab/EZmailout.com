// Renders the 3D Stampy poses (scripts/stampy3d/poses.js) in headless
// Chromium and writes them as transparent WebP files.
//
//   node scripts/stampy3d/render.mjs [--out <dir>] [pose ...]
//
// Default output: src/frontend/src/assets/stampy/ (imported by the Stampy
// components, so Vite fingerprints them). Uses the frontend's three.js and
// the repo's esbuild (via vite); Chromium from Playwright.
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const frontend = join(root, "src/frontend");
const require = createRequire(join(frontend, "package.json"));
const viteDir = dirname(require.resolve("vite/package.json"));
const esbuild = createRequire(join(viteDir, "package.json"))("esbuild");
const { chromium } = await import(
	process.env.PLAYWRIGHT_MODULE ?? "playwright"
).catch(() => import("/opt/node22/lib/node_modules/playwright/index.mjs"));

const args = process.argv.slice(2);
let out = join(frontend, "src/assets/stampy");
const wanted = [];
for (let i = 0; i < args.length; i++) {
	if (args[i] === "--out") out = resolve(args[++i]);
	else wanted.push(args[i]);
}
mkdirSync(out, { recursive: true });

const bundle = await esbuild.build({
	entryPoints: [join(here, "poses.js")],
	bundle: true,
	write: false,
	format: "iife",
	globalName: "Stampy3D",
	nodePaths: [join(frontend, "node_modules")],
	logLevel: "warning",
});
const code = bundle.outputFiles[0].text;

const executablePath =
	process.env.CHROMIUM_PATH ??
	(() => {
		try {
			const dir = "/opt/pw-browsers";
			const found = readdirSync(dir).find((d) => /^chromium-\d+$/.test(d));
			return found ? join(dir, found, "chrome-linux/chrome") : undefined;
		} catch {
			return undefined;
		}
	})();
const browser = await chromium.launch({
	executablePath,
	args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("page error:", e.message));
await page.setContent("<!doctype html><body style='margin:0'></body>");
await page.addScriptTag({ content: code });
const poses = await page.evaluate(() => Object.keys(Stampy3D.POSES));
for (const name of wanted.length ? wanted : poses) {
	if (!poses.includes(name)) {
		console.error(`unknown pose ${name}; poses: ${poses.join(", ")}`);
		process.exitCode = 1;
		continue;
	}
	const t = Date.now();
	const files = await page.evaluate((n) => Stampy3D.renderPose(n), name);
	for (const { file, dataUrl } of files) {
		const bytes = Buffer.from(dataUrl.split(",")[1], "base64");
		writeFileSync(join(out, file), bytes);
		console.log(
			`${file}  ${(bytes.length / 1024).toFixed(1)} KB  ${Date.now() - t} ms`,
		);
	}
}
await browser.close();
