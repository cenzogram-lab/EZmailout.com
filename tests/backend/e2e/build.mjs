// Builds the real frontend with e2e/bridge.js in place of the sign-in/actor
// package, into tests/backend/.e2e/dist, for tests/backend/e2e.mjs.
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const FE = new URL("../../../src/frontend/", import.meta.url).pathname;
const OUT = process.env.E2E_DIST ?? new URL("../.e2e/dist/", import.meta.url).pathname;
const BRIDGE = new URL("./bridge.js", import.meta.url).pathname;
process.chdir(FE);
const require = createRequire(`${FE}package.json`);
const vite = await import(pathToFileURL(require.resolve("vite")).href);
await (vite.build ?? vite.default.build)({
  root: FE,
  configFile: `${FE}vite.config.js`,
  logLevel: "warn",
  build: { outDir: OUT, emptyOutDir: true },
  resolve: {
    alias: [
      { find: /^@caffeineai\/core-infrastructure$/, replacement: BRIDGE },
      // The bridge sits outside the frontend, so resolve its imports there.
      { find: /^@tanstack\/react-query$/, replacement: require.resolve("@tanstack/react-query") },
      { find: /^@icp-sdk\/core\/(agent|identity)$/, replacement: "@icp-sdk/core/$1", customResolver: (src) => require.resolve(src) },
    ],
  },
});
console.log("e2e frontend →", OUT);
