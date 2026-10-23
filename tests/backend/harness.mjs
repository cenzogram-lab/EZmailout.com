// PocketIC harness for the EZmailout backend: installs the compiled wasm,
// drives calls that make HTTPS outcalls, and answers each outcall from a fake
// upstream (print partner, Stripe, OpenAI, Resend) that records what it was sent.
import { PocketIc } from "@dfinity/pic";
import { Ed25519KeyIdentity } from "@icp-sdk/core/identity";
import { AnonymousIdentity } from "@icp-sdk/core/agent";
import { idlFactory } from "./.gen/backend.did.js";

/** The compiled canister under test (`mops build` output unless WASM is set). */
export const WASM = process.env.WASM ?? new URL("../../src/backend/dist/backend.wasm", import.meta.url).pathname;
export const EOP = { upgradeModeOptions: { wasm_memory_persistence: [{ keep: null }], skip_pre_upgrade: [] } };

export const ident = (seed) => Ed25519KeyIdentity.generate(new Uint8Array(32).fill(seed));
export const anon = new AnonymousIdentity();

export async function start({ wasm = WASM, idl = idlFactory } = {}) {
  const pic = await PocketIc.create(process.env.PIC_URL);
  const controller = ident(1);
  const fixture = await pic.setupCanister({ idlFactory: idl, wasm, sender: controller.getPrincipal() });
  const canisterId = fixture.canisterId;
  const actors = (factory) => ({
    as: (id) => { const a = pic.createActor({ idlFactory: factory, canisterId }); a.setIdentity(id); return a; },
    deferred: (id) => { const a = pic.createDeferredActor({ idlFactory: factory, canisterId }); a.setIdentity(id); return a; },
  });
  return { pic, canisterId, controller, ...actors(idl), actors };
}

/** Fake upstream: `routes` maps a matcher to a responder; every request is logged. */
export function upstream(routes) {
  const log = [];
  const handle = (req) => {
    const body = Buffer.from(req.body).toString("utf8");
    const headers = Object.fromEntries(req.headers.map(([k, v]) => [k.toLowerCase(), v]));
    const entry = { method: String(req.httpMethod), url: req.url, headers, body, bodyBytes: Buffer.from(req.body), maxResponseBytes: req.maxResponseBytes };
    log.push(entry);
    for (const [match, respond] of routes) {
      if (typeof match === "string" ? req.url.includes(match) : match(entry)) {
        const r = respond(entry);
        if (r.reject) return { type: "reject", statusCode: 2, message: r.reject };
        return { type: "success", statusCode: r.status ?? 200, headers: [], body: new TextEncoder().encode(typeof r.body === "string" ? r.body : JSON.stringify(r.body ?? {})) };
      }
    }
    return { type: "success", statusCode: 404, headers: [], body: new TextEncoder().encode('{"message":"no fake route"}') };
  };
  return { log, handle };
}

/**
 * Runs deferred calls to completion, answering every HTTPS outcall they make
 * from `up`. `calls` are the functions a DeferredActor method returns.
 */
export async function drive(pic, up, calls, { rounds = 2000, quiet = 12 } = {}) {
  // Outcalls can appear several rounds after a call starts (and after each
  // answer), so keep ticking until no outcall has shown up for `quiet` rounds.
  let idle = 0;
  for (let i = 0; i < rounds && idle < quiet; i++) {
    await pic.tick();
    const pending = await pic.getPendingHttpsOutcalls();
    for (const req of pending) {
      await pic.mockPendingHttpsOutcall({ requestId: req.requestId, subnetId: req.subnetId, response: up.handle(req) });
    }
    idle = pending.length === 0 ? idle + 1 : 0;
  }
  return Promise.all(calls.map((c) => c()));
}

/** One deferred call driven to completion. */
export async function call(pic, up, deferredMethodPromise) {
  const exec = await deferredMethodPromise;
  const [r] = await drive(pic, up, [exec]);
  return r;
}

export const failures = [];
const show = (v) => JSON.stringify(v, (k, x) => typeof x === "bigint" ? x.toString() : x instanceof Uint8Array ? `<${x.length} bytes>` : x);
/** Soft assertion: records a failure and carries on, so one run reports every finding. */
export function check(cond, msg, detail) {
  if (!cond) { failures.push(msg); console.log("  FAIL " + msg + (detail !== undefined ? " — " + show(detail).slice(0, 600) : "")); return false; }
  console.log("  ok   " + msg);
  return true;
}
