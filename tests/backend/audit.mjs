// Functional audit of keys, HTTPS outcalls and queues against the compiled
// canister in PocketIC (run with scripts/test-backend.sh). Every outcall is answered by a fake upstream that
// records the exact request the canister sent.
import { PocketIcServer } from "@dfinity/pic";
import { start, upstream, drive, call, check, failures, ident, anon, EOP, WASM } from "./harness.mjs";
import { keys, SECRETS, RAW_SECRETS, campaignInput, rawAddr, fakePrintPartner, fakeStripe, fakeOpenAi, fakeResend, returnAddress } from "./fixtures.mjs";
import { existsSync, readFileSync } from "node:fs";

const only = process.argv.slice(2);
const server = await PocketIcServer.start();
process.env.PIC_URL = server.getUrl();
const HOUR = 3_600_000;
const b64 = (s) => Buffer.from(s).toString("base64");
const PRINT_AUTH = "Basic " + b64(`${SECRETS.fulfilmentUsername}:${SECRETS.fulfilmentPassword}`);
const ser = (v) => JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x));

async function setup(extraKeys = {}) {
  const env = await start();
  const admin = env.as(env.controller);
  const r = await admin.saveAdminKeys(keys({ ...SECRETS, ...extraKeys }));
  if (!r.ok) throw new Error("saveAdminKeys failed: " + r.error);
  return { ...env, admin };
}

/** A campaign owned by `user`, paid (sandbox or Stripe), with its print file staged. */
async function paidCampaign(env, user, up, { n = 3, stripe = false } = {}) {
  const u = env.as(user);
  const created = await u.createCampaign(campaignInput(n));
  if (!created.ok) throw new Error("createCampaign: " + created.error);
  const cid = created.campaignId[0];
  const intent = await call(env.pic, up, env.deferred(user).createPaymentIntent({ CampaignOrder: null }, [cid], []));
  if (!intent.ok) throw new Error("createPaymentIntent: " + intent.error);
  const conf = await call(env.pic, up, env.deferred(user).confirmPayment(intent.paymentIntentId[0]));
  if (!conf.ok) throw new Error("confirmPayment: " + conf.error);
  const up1 = await u.uploadDocumentChunk(cid, 0n, 1n, "application/pdf", "art.pdf", new Uint8Array(4096).fill(37));
  if (!up1.ok) throw new Error("upload: " + up1.error);
  return cid;
}

const sections = {
  // ─── 1. Admin keys: access control, masking, validation, persistence ──────
  async keys() {
    const env = await start();
    const { pic, as, controller } = env;
    const admin = as(controller);
    const stranger = as(ident(9));
    const nobody = as(anon);
    const assignedAdmin = ident(3);

    check(!(await stranger.saveAdminKeys(keys({ openAiKey: "x" }))).ok, "a signed-in stranger cannot save keys");
    check(!(await nobody.saveAdminKeys(keys({ openAiKey: "x" }))).ok, "the anonymous principal cannot save keys");
    check(!(await stranger.assignAdmin(ident(9).getPrincipal())).ok, "a stranger cannot assign themselves admin");
    check((await admin.assignAdmin(assignedAdmin.getPrincipal())).ok, "a controller assigns the admin");
    check(!(await admin.assignAdmin(anon.getPrincipal())).ok, "the anonymous principal cannot be made admin");
    const save = await as(assignedAdmin).saveAdminKeys(keys(SECRETS));
    check(save.ok, "the assigned admin saves every key", save);

    const view = await as(assignedAdmin).getAdminKeys();
    const viewText = ser(view);
    check(RAW_SECRETS.every((s) => !viewText.includes(s)), "the admin's key view never contains a full secret", view);
    check(view.stripeSecretKeyMasked[0] === "***3XYZ", "secrets are masked to their last 4 characters", view.stripeSecretKeyMasked);
    check(view.fulfilmentPasswordMasked[0] === "***7d6c", "the print-partner password is masked", view.fulfilmentPasswordMasked);
    check(view.supportEmailAddress[0] === SECRETS.supportEmailAddress, "support email stored lower-cased and visible to the admin");

    const strangerView = ser(await stranger.getAdminKeys());
    const anonView = ser(await nobody.getAdminKeys());
    const pub = ser(await nobody.getPublicConfig());
    check([strangerView, anonView, pub].every((t) => RAW_SECRETS.every((s) => !t.includes(s)) && !t.includes("***")), "non-admins see no secret, not even masked");
    check(!strangerView.includes(SECRETS.fulfilmentUsername) && !strangerView.includes(SECRETS.supportEmailAddress), "non-admins do not see the print-partner username or support email");
    const cfg = await nobody.getPublicConfig();
    check(cfg.fulfilmentConfigured && cfg.stripeConfigured && cfg.openAiConfigured && cfg.resendConfigured, "public config reports every integration configured");

    // Partial updates and clearing.
    await admin.saveAdminKeys(keys({ openAiKey: "  sk-new-key-0000  " }));
    let v = await admin.getAdminKeys();
    check(v.openAiKeyMasked[0] === "***0000" && v.stripeSecretKeyMasked[0] === "***3XYZ", "null leaves other keys unchanged; values are trimmed");
    await admin.saveAdminKeys(keys({ openAiKey: "" }));
    v = await admin.getAdminKeys();
    check(v.openAiKeyMasked.length === 0 && !(await nobody.getPublicConfig()).openAiConfigured, "\"\" clears a key");
    check(!(await admin.saveAdminKeys(keys({ stripeSecretKey: "k".repeat(513) }))).ok, "over-long keys are refused");
    check(!(await admin.saveAdminKeys(keys({ outcallProxyUrl: "http://proxy.example" }))).ok, "a plain-http outcall proxy is refused");
    check(!(await admin.saveAdminKeys(keys({ supportEmailAddress: "not-an-email" }))).ok, "an invalid support email is refused");
    const bad = await admin.saveAdminKeys(keys({ openAiKey: "should-not-save", outcallProxyUrl: "ftp://x" }));
    check(!bad.ok && (await admin.getAdminKeys()).openAiKeyMasked.length === 0, "a refused save writes nothing");

    // Persistence across an upgrade.
    await admin.saveAdminKeys(keys(SECRETS));
    const before = ser(await admin.getAdminKeys());
    await pic.upgradeCanister({ canisterId: env.canisterId, wasm: readFileSync(WASM), sender: controller.getPrincipal(), ...EOP });
    const after = ser(await admin.getAdminKeys());
    check(before === after, "every key, the admin and the environment survive an upgrade", { before, after });
    check((await as(assignedAdmin).getAdminKeys()).callerIsAdmin, "the assigned admin is still admin after the upgrade");
    // The keys still work after the upgrade: the next outcall carries them.
    const up = upstream(fakeOpenAi());
    const r = await call(pic, up, env.deferred(ident(11)).askStampy([{ role: { User: null }, content: "hello" }]));
    check(r.ok && up.log[0]?.headers.authorization === "Bearer " + SECRETS.openAiKey, "the OpenAI key is sent after the upgrade", up.log[0]?.headers);
  },

  // ─── 2. Every key reaches its own outcall, and only that one ─────────────
  async outcallAuth() {
    const env = await setup({ sandboxCheckout: false });
    const user = ident(21);
    const up = upstream([...fakePrintPartner({ detail: [] }), ...fakeStripe({}), ...fakeOpenAi(), ...fakeResend()]);
    const cid = await paidCampaign(env, user, up, { stripe: true });
    await call(env.pic, up, env.deferred(user).verifyAddresses([rawAddr(1), rawAddr(2)]));
    await call(env.pic, up, env.deferred(user).dispatchPrintJob(cid));
    await env.as(user).submitSupportTicket({ name: "Maria", email: "maria@example.com", subject: "Help", message: "Hi", pagePath: [] });
    await drive(env.pic, up, []);
    await call(env.pic, up, env.deferred(user).askStampy([{ role: { User: null }, content: "price?" }]));

    const byHost = (h) => up.log.filter((l) => l.url.includes(h));
    const print = byHost("/molpro/"), stripe = byHost("api.stripe.com"), oai = byHost("api.openai.com"), resend = byHost("api.resend.com");
    check(print.length >= 5 && print.every((l) => l.headers.authorization === PRINT_AUTH), "every print-partner call sends Basic auth from the stored username and password", print.map((l) => l.headers.authorization));
    check(stripe.length >= 2 && stripe.every((l) => l.headers.authorization === "Bearer " + SECRETS.stripeSecretKey), "every Stripe call sends the secret key");
    check(stripe.filter((l) => l.method.includes("POST") || l.method === "1").every((l) => l.headers["idempotency-key"]), "Stripe intent creation carries an Idempotency-Key", stripe.map((l) => [l.method, l.headers["idempotency-key"]]));
    check(oai.length === 1 && oai[0].headers.authorization === "Bearer " + SECRETS.openAiKey, "Stampy sends the OpenAI key");
    check(resend.length === 1 && resend[0].headers.authorization === "Bearer " + SECRETS.resendKey && resend[0].headers["idempotency-key"], "the ticket email sends the Resend key with an Idempotency-Key", resend[0]?.headers);
    const leaks = up.log.filter((l) => {
      const own = l.url.includes("/molpro/") ? [SECRETS.fulfilmentPassword] : l.url.includes("stripe") ? [SECRETS.stripeSecretKey] : l.url.includes("openai") ? [SECRETS.openAiKey] : [SECRETS.resendKey];
      const text = ser(l.headers) + l.body + l.url;
      return RAW_SECRETS.some((s) => !own.includes(s) && text.includes(s)) || text.includes(SECRETS.webhookSecret);
    });
    check(leaks.length === 0, "no outcall carries another service's key or the webhook secret", leaks.map((l) => l.url));
    check(print.every((l) => l.url.startsWith("https://rest.click2mail.com/molpro")), "a live (Stripe-paid) campaign goes to print-partner Production", print.map((l) => l.url));
    check(up.log.every((l) => l.url.startsWith("https://")), "every outcall is https");

    // Proxy: every outcall goes to the proxy with the real target in x-target-url.
    await env.admin.saveAdminKeys(keys({ outcallProxyUrl: "https://proxy.example/relay" }));
    const up2 = upstream([[(r) => r.url === "https://proxy.example/relay", (r) => (r.headers["x-target-url"].includes("openai") ? fakeOpenAi()[1][1](r) : { status: 404 })]]);
    const viaProxy = await call(env.pic, up2, env.deferred(ident(22)).askStampy([{ role: { User: null }, content: "hi" }]));
    check(viaProxy.ok && up2.log[0].headers["x-target-url"] === "https://api.openai.com/v1/chat/completions", "with a proxy set, outcalls go to the proxy with x-target-url", up2.log[0]);
  },

  // ─── 3. Address verification ─────────────────────────────────────────────
  async verification() {
    const env = await setup();
    const user = ident(31);
    const ok = upstream(fakePrintPartner({ detail: [{ Address1: "101 Main St", Postalcode: "97201-1234" }, { Address1: "102 Main St", Postalcode: "97201", status: "Invalid address" }] }));
    const r = await call(env.pic, ok, env.deferred(user).verifyAddresses([rawAddr(1), rawAddr(2)]));
    check(r.ok && r.validCount === 1n && r.invalidCount === 1n, "CASS results are applied per address", r);
    check(r.results[0].verified[0]?.zip_plus4[0] === "1234", "ZIP+4 is appended from the verification result", r.results[0]);
    check(ok.log[0].body.includes("<Address1>101 Main St</Address1>") && ok.log[0].maxResponseBytes <= 1_500_000, "the address list XML and response budget are sent", ok.log[0].maxResponseBytes);

    const down = upstream(fakePrintPartner({ addressLists: 1 }));
    await env.pic.advanceTime(20_000); await env.pic.tick();
    const r2 = await call(env.pic, down, env.deferred(user).verifyAddresses([rawAddr(1)]));
    check(!r2.ok && r2.validCount === 0n, "a failed address-list upload marks nothing valid (fail-closed)", r2);

    const detailDown = upstream(fakePrintPartner({ addressListDetail: 1 }));
    await env.pic.advanceTime(20_000); await env.pic.tick();
    const r3 = await call(env.pic, detailDown, env.deferred(user).verifyAddresses([rawAddr(1), rawAddr(2)]));
    check(!r3.ok && r3.validCount === 0n, "a failed verification-result lookup marks nothing valid (fail-closed)", { ok: r3.ok, valid: r3.validCount, error: r3.error });

    const r4 = await call(env.pic, ok, env.deferred(user).verifyAddresses([rawAddr(1)]));
    check(!r4.ok && (r4.error[0] ?? "").includes("Wait"), "one identity must wait 15 s between verifications", r4.error);
    const r5 = await call(env.pic, ok, env.deferred(anon).verifyAddresses([rawAddr(1)]));
    check(!r5.ok && ok.log.length === 2, "signed-out callers cannot spend verification outcalls");
  },

  // ─── 4. Dispatch: four steps, retries, interruption, concurrency ─────────
  async dispatch() {
    const env = await setup({ sandboxCheckout: true });
    const user = ident(41);
    const up = upstream(fakePrintPartner({ addressLists: 1 }));
    const cid = await paidCampaign(env, user, up);
    let r = await call(env.pic, up, env.deferred(user).dispatchPrintJob(cid));
    check(!r.ok && r.productionStatus[0]?.Failed !== undefined && r.documentId.length === 1, "a dropped connection at step 2 fails the run and keeps the uploaded document", r);
    check(up.log.every((l) => l.url.startsWith("https://stage-rest.click2mail.com")), "a test-mode campaign only ever talks to print-partner Staging", up.log.map((l) => l.url));
    const docUploads = () => up.log.filter((l) => l.url.endsWith("/documents")).length;
    r = await call(env.pic, up, env.deferred(user).dispatchPrintJob(cid));
    check(!r.ok && (r.error[0] ?? "").includes("Wait"), "an owner's retry waits 5 minutes", r.error);
    await env.pic.advanceTime(5 * 60_000 + 1000); await env.pic.tick();
    r = await call(env.pic, up, env.deferred(user).dispatchPrintJob(cid));
    check(r.ok && r.productionStatus[0]?.Submitted !== undefined && docUploads() === 1, "the retry resumes at step 2 and submits without re-uploading the file", { r, docUploads: docUploads() });
    const job = up.log.find((l) => l.url.endsWith("/jobs") && l.method !== "0");
    const form = new URLSearchParams(job.body);
    check(form.get("documentClass") && form.get("rtnName") === returnAddress.name && form.get("addressId")?.startsWith("list"), "the job form carries the print spec, return address and list id", Object.fromEntries(form));
    const camp = await env.as(user).getCampaign(cid);
    check(camp[0]?.status?.InProduction !== undefined, "a submitted job moves the timeline to In production", camp[0]?.status);

    // Two dispatches at once for one campaign: only one reaches the print partner.
    const cid2 = await paidCampaign(env, user, up);
    const before = up.log.length;
    const a = await env.deferred(user).dispatchPrintJob(cid2);
    const b = await env.deferred(env.controller).dispatchPrintJob(cid2);
    const [ra, rb] = await drive(env.pic, up, [a, b]);
    const posted = up.log.slice(before).filter((l) => l.url.endsWith("/documents")).length;
    check(posted === 1 && [ra, rb].filter((x) => x.ok).length === 1, "concurrent dispatches of one campaign make one run", { posted, ra: ra.error, rb: rb.error });

    // Interrupted submit (no answer): the run fails; the retry probes the job and does not submit twice.
    const flaky = upstream(fakePrintPartner({ submit: 1 }));
    const cid3 = await paidCampaign(env, user, flaky);
    r = await call(env.pic, flaky, env.deferred(user).dispatchPrintJob(cid3));
    check(!r.ok && r.jobId.length === 1, "a submit that never answers fails the run and keeps the job id", r);
    r = await call(env.pic, flaky, env.deferred(env.controller).dispatchPrintJob(cid3));
    const submits = flaky.log.filter((l) => l.url.endsWith("/submit")).length;
    check(r.ok && submits === 2, "the admin retry re-submits the unconfirmed job once and succeeds", { r, submits });

    // Many campaigns dispatched together (high traffic): every one completes.
    const many = [];
    for (let i = 0; i < 6; i++) many.push(await paidCampaign(env, ident(60 + i), up, { n: 20 }));
    const execs = await Promise.all(many.map((c, i) => env.deferred(ident(60 + i)).dispatchPrintJob(c)));
    const results = await drive(env.pic, up, execs);
    check(results.every((x) => x.ok), "6 campaigns dispatched concurrently all reach Submitted", results.map((x) => x.error));
  },

  // ─── 5. Tracking: owner sync cooldown and the 6-hourly poll ──────────────
  async tracking() {
    const env = await setup({ sandboxCheckout: true });
    const plan = { scans: ["Delivered", "Delivered", "Out for delivery"] };
    const up = upstream(fakePrintPartner(plan));
    const ids = [];
    for (let i = 0; i < 13; i++) {
      const u = ident(80 + i);
      const cid = await paidCampaign(env, u, up);
      const r = await call(env.pic, up, env.deferred(u).dispatchPrintJob(cid));
      if (!r.ok) throw new Error("dispatch " + r.error);
      ids.push([u, cid, r.jobId[0]]);
    }
    const [u0, c0] = ids[0];
    let s = await call(env.pic, up, env.deferred(u0).syncPrintTracking(c0));
    check(s.ok && !s.cached && s.status[0]?.Delivered !== undefined, "an owner sync reads IMb scans and moves the timeline", s);
    const n = up.log.length;
    s = await call(env.pic, up, env.deferred(u0).syncPrintTracking(c0));
    check(s.cached && up.log.length === n, "a finished campaign is answered from stored state (no outcall)");

    // The poll must reach every in-flight campaign, not just the first ten,
    // while their mail is still moving (scans that do not finish tracking).
    plan.scans = ["Accepted at USPS Origin Facility"];
    const polled = new Set();
    for (let round = 0; round < 2; round++) {
      const start = up.log.length;
      await env.pic.advanceTime(6 * HOUR + 1000);
      await drive(env.pic, up, []);
      for (const l of up.log.slice(start)) if (l.url.includes("/tracking")) polled.add(l.url.split("/jobs/")[1].split("/")[0]);
    }
    const inFlight = ids.slice(1).map(([, , j]) => j);
    const missed = inFlight.filter((j) => !polled.has(j));
    check(missed.length === 0, "two 6-hourly polls reach all 12 in-flight campaigns (no starvation)", { missed });
  },

  // ─── 6. Stripe: intents, replicated confirmation, abuse limits ───────────
  async stripe() {
    const env = await setup({ sandboxCheckout: false });
    const user = ident(101);
    const state = { intents: new Map() };
    const up = upstream(fakeStripe(state));
    const u = env.as(user);
    const intent = await call(env.pic, up, env.deferred(user).createPaymentIntent({ CreditPack: null }, [], [{ Starter: null }]));
    check(intent.ok && intent.clientSecret[0]?.endsWith("_secret"), "a credit-pack intent is created with Stripe", intent);
    const body = new URLSearchParams(up.log[0].body);
    check(body.get("currency") === "usd" && body.get("metadata[userId]") === user.getPrincipal().toText(), "the intent body carries amount, currency and the payer", Object.fromEntries(body));
    state.paid = false;
    let c = await call(env.pic, up, env.deferred(user).confirmPayment(intent.paymentIntentId[0]));
    check(!c.ok && (c.error[0] ?? "").includes("processing"), "an unfinished payment grants nothing", c);
    state.paid = true; state.paidAmount = 1;
    await env.pic.advanceTime(6_000); await env.pic.tick();
    c = await call(env.pic, up, env.deferred(user).confirmPayment(intent.paymentIntentId[0]));
    check(!c.ok && (c.error[0] ?? "").includes("mismatch"), "a payment for the wrong amount grants nothing", c);
    delete state.paidAmount;
    await env.pic.advanceTime(6_000); await env.pic.tick();
    // Two confirmations racing: credits are granted once.
    const e1 = await env.deferred(user).confirmPayment(intent.paymentIntentId[0]);
    const e2 = await env.deferred(user).confirmPayment(intent.paymentIntentId[0]);
    const [c1, c2] = await drive(env.pic, up, [e1, e2]);
    const ledger = await u.getCreditLedger();
    const grants = ledger.filter((e) => e.delta > 0n && e.reason.includes("pack"));
    const settled = [c1, c2].filter((x) => x.ok).length;
    const waited = [c1, c2].filter((x) => !x.ok && (x.error[0] ?? "").includes("wait")).length;
    check(settled >= 1 && settled + waited === 2 && grants.length === 1, "racing confirmations grant the credit pack once (the extra one is told to wait)", { grants: grants.length, c1: c1.error, c2: c2.error });
    await env.pic.advanceTime(6_000); await env.pic.tick();
    const again = await call(env.pic, up, env.deferred(user).confirmPayment(intent.paymentIntentId[0]));
    check(again.ok && (await u.getCreditLedger()).filter((e) => e.delta > 0n && e.reason.includes("pack")).length === 1, "confirming a settled payment again is answered without granting twice");
    check(up.log.filter((l) => l.method.includes("GET") || l.url.includes("/pi_")).length >= 1, "confirmation reads the intent from Stripe");
    const someoneElse = await call(env.pic, up, env.deferred(ident(102)).confirmPayment(intent.paymentIntentId[0]));
    check(!someoneElse.ok, "another account cannot confirm someone's payment");

    // Abuse: one identity hammering checkout / confirmation.
    const spammer = ident(103);
    const before = up.log.length;
    const execs = [];
    for (let i = 0; i < 25; i++) execs.push(await env.deferred(spammer).createPaymentIntent({ CreditPack: null }, [], [{ Starter: null }]));
    await drive(env.pic, up, execs);
    const created = up.log.slice(before).length;
    check(created <= 10, "one identity cannot create unlimited Stripe intents (≤ 10/hour)", { created });
    const pending = await call(env.pic, up, env.deferred(ident(104)).createPaymentIntent({ CreditPack: null }, [], [{ Starter: null }]));
    state.paid = false;
    const b2 = up.log.length;
    const confs = [];
    for (let i = 0; i < 20; i++) confs.push(await env.deferred(ident(104)).confirmPayment(pending.paymentIntentId[0]));
    await drive(env.pic, up, confs);
    const lookups = up.log.length - b2;
    check(lookups <= 3, "polling confirmPayment cannot drain cycles with replicated Stripe lookups", { lookups });
  },

  // ─── 7. OpenAI: credits charged before, refunded on failure ──────────────
  async openai() {
    const env = await setup({ sandboxCheckout: false });
    const user = ident(111);
    const up = upstream([...fakeStripe({ paid: true }), ...fakeOpenAi()]);
    const intent = await call(env.pic, up, env.deferred(user).createPaymentIntent({ CreditPack: null }, [], [{ Starter: null }]));
    await call(env.pic, up, env.deferred(user).confirmPayment(intent.paymentIntentId[0]));
    const bal = async () => (await env.as(user).getMyAccount())[0].creditBalance;
    const start = await bal();
    const img = await call(env.pic, up, env.deferred(user).generateAiImage("bakery storefront", { Square1024: null }));
    check(img.ok && img.imageUrl[0] && (await bal()) === start - img.creditsCharged, "an image is generated and charged", img);
    const failing = upstream(fakeOpenAi({ imageFail: true, chatFail: true }));
    const b0 = await bal();
    const bad = await call(env.pic, failing, env.deferred(user).generateAiImage("x", { Square1024: null }));
    check(!bad.ok && (await bal()) === b0, "a failed image generation is refunded in full", { bad: bad.error, after: await bal(), b0 });
    const badCopy = await call(env.pic, failing, env.deferred(user).generateAiCopy({ businessName: "Bakery", industry: "Food", offer: "10% off", callToAction: "Visit", tone: [] }));
    check(!badCopy.ok && (await bal()) === b0, "a timed-out copy request is refunded in full");
    // Concurrent generations cannot overspend: 30 at once with a small balance.
    const execs = [];
    for (let i = 0; i < 30; i++) execs.push(await env.deferred(user).generateAiCopy({ businessName: "Bakery", industry: "Food", offer: "x", callToAction: "y", tone: [] }));
    const res = await drive(env.pic, up, execs);
    const charged = res.filter((r) => r.ok).length;
    check((await bal()) >= 0n && BigInt(charged) <= b0, "concurrent AI calls never overdraw the balance", { charged, b0, end: await bal() });
  },

  // ─── 8. Support email queue under load ───────────────────────────────────
  async supportQueue() {
    const env = await setup();
    const up = upstream(fakeResend({ failFirst: 3 }));
    // 75 tickets from 75 identities inside one hour (the email cap is 60/hour).
    for (let i = 0; i < 75; i++) {
      const r = await env.as(ident(150 + i)).submitSupportTicket({ name: `User ${i}`, email: `u${i}@example.com`, subject: `Ticket ${i}`, message: "Where is my mail?", pagePath: ["/dashboard"] });
      if (!r.ok) throw new Error("ticket " + r.error);
    }
    await drive(env.pic, up, []);
    let list = await env.admin.listSupportTickets();
    const status = () => list.map((t) => t.emailStatus[0] ?? "");
    check(list.length === 75, "all 75 tickets are stored", list.length);
    // Over the next hours the queue must deliver every ticket exactly once.
    // Time moves in 2-minute steps so the minute timer fires as it would live.
    for (let m = 0; m < 100; m++) { await env.pic.advanceTime(120_000); await drive(env.pic, up, [], { quiet: 4 }); }
    list = await env.admin.listSupportTickets();
    const sent = status().filter((s) => s.startsWith("Emailed")).length;
    const keysSent = new Set(up.log.filter((l) => l.headers["idempotency-key"]).map((l) => l.headers["idempotency-key"]));
    check(sent === 75, "every ticket is eventually emailed: transient failures are retried, over-cap sends deferred", { sent, statuses: [...new Set(status())] });
    check(keysSent.size === 75, "each ticket uses one idempotency key across retries", keysSent.size);
    const perHour = up.log.length; // includes retries
    check(perHour <= 75 + 3 + 10, "retries are bounded", perHour);

    // A ticket filed just before an upgrade is still emailed afterwards.
    const late = upstream(fakeResend());
    await env.as(ident(240)).submitSupportTicket({ name: "Late", email: "late@example.com", subject: "Before upgrade", message: "hi", pagePath: [] });
    await env.pic.upgradeCanister({ canisterId: env.canisterId, wasm: readFileSync(WASM), sender: env.controller.getPrincipal(), ...EOP });
    await env.pic.advanceTime(10 * 60_000); await drive(env.pic, late, []);
    check(late.log.some((l) => l.body.includes("Before upgrade")), "a ticket queued across an upgrade is still emailed", late.log.length);
  },

  // ─── 9. Delivery webhook ─────────────────────────────────────────────────
  async webhook() {
    const env = await setup({ sandboxCheckout: true });
    const user = ident(121);
    const up = upstream(fakePrintPartner());
    const cid = await paidCampaign(env, user, up);
    const d = await call(env.pic, up, env.deferred(user).dispatchPrintJob(cid));
    const hook = (secret, payload, viaQuery = false, path = "/webhooks/fulfilment") => env.as(anon).http_request_update({
      method: "POST", url: path + (viaQuery ? `?secret=${secret}` : ""),
      headers: viaQuery ? [] : [["X-EZmailout-Secret", secret]], body: new TextEncoder().encode(JSON.stringify(payload)),
    });
    let r = await hook("wrong", { jobId: d.jobId[0], event: "Delivered" });
    check(r.status_code === 401, "a wrong webhook secret is refused with 401", r.status_code);
    r = await hook(SECRETS.webhookSecret, { jobId: d.jobId[0], event: "Out for delivery", eventId: "evt-1" });
    check(r.status_code === 200, "a signed webhook is accepted", Buffer.from(r.body).toString());
    for (let i = 0; i < 5; i++) await hook(SECRETS.webhookSecret, { jobId: d.jobId[0], event: "Out for delivery", eventId: "evt-1" });
    const events = await env.as(user).getTrackingEvents(cid);
    const dup = events.filter((e) => e.providerEventId === "evt-1").length;
    check(dup === 1, "a redelivered webhook (same event id) is recorded once", dup);
    r = await hook(SECRETS.webhookSecret, { jobId: "nope", event: "Delivered" });
    check(r.status_code === 400, "an unknown job is refused");
    r = await hook(SECRETS.webhookSecret, { jobId: d.jobId[0], event: "Delivered", eventId: "evt-2" }, false, "/webhooks/click2mail");
    check(r.status_code === 200, "the legacy webhook path configured at the print partner still works", Buffer.from(r.body).toString());
    check((await env.admin.getAdminKeys()).webhookPath === "/webhooks/fulfilment", "the admin is shown the new webhook path");
  },

  // ─── 10. High traffic: concurrent copilot and verification ───────────────
  async load() {
    const env = await setup();
    const up = upstream([...fakeOpenAi(), ...fakePrintPartner({ detail: [] })]);
    // 310 Stampy messages from 31 identities (10 each) arriving together.
    const execs = [];
    for (let i = 0; i < 31; i++) for (let k = 0; k < 10; k++) execs.push(await env.deferred(ident(170 + i)).askStampy([{ role: { User: null }, content: `q${k}` }]));
    const t0 = Date.now();
    const res = await drive(env.pic, up, execs, { rounds: 400 });
    const ok = res.filter((r) => r.ok).length;
    const outcalls = up.log.filter((l) => l.url.includes("openai")).length;
    check(ok === 300 && outcalls === 300, "310 concurrent copilot messages: exactly the 300/hour canister budget is spent", { ok, outcalls, ms: Date.now() - t0 });
    check(res.filter((r) => !r.ok).every((r) => (r.error[0] ?? "").includes("lot of questions")), "callers past the canister budget get a clear busy message");
    // Verification: 40 identities at once.
    const v = [];
    for (let i = 0; i < 40; i++) v.push(await env.deferred(ident(210 + i)).verifyAddresses([rawAddr(i)]));
    const vr = await drive(env.pic, up, v, { rounds: 400 });
    check(vr.every((r) => r.ok), "40 concurrent verifications all complete", vr.filter((r) => !r.ok).map((r) => r.error));
  },
};

// ─── 12. Scale: largest allowed campaign, print file and verification batch ───
sections.scale = async function scale() {
  const env = await setup({ sandboxCheckout: true });
  const user = ident(141);
  const up = upstream(fakePrintPartner({ detail: [] }));
  const u = env.as(user);
  const t0 = Date.now();
  const created = await u.createCampaign(campaignInput(5000));
  check(created.ok, "a 5,000-recipient campaign is created", created.error);
  const cid = created.campaignId[0];
  const intent = await call(env.pic, up, env.deferred(user).createPaymentIntent({ CampaignOrder: null }, [cid], []));
  await call(env.pic, up, env.deferred(user).confirmPayment(intent.paymentIntentId[0]));
  const big = new Uint8Array(1_890_000).fill(65);
  const upl = await u.uploadDocumentChunk(cid, 0n, 1n, "application/pdf", "big.pdf", big);
  check(upl.ok, "a 1.89 MB print file is staged in one chunk", upl.error);
  const d = await call(env.pic, up, env.deferred(user).dispatchPrintJob(cid));
  const docReq = up.log.find((l) => l.url.endsWith("/documents"));
  const listReq = up.log.find((l) => l.url.endsWith("/addressLists"));
  check(d.ok, "the 5,000-piece job with a 1.89 MB file is dispatched", d.error);
  check(docReq && docReq.body.length < 2_000_000, "the document outcall stays under the 2 MB request cap", docReq?.body.length);
  check(listReq && (listReq.body.match(/<address>/g) ?? []).length === 5000, "all 5,000 addresses are sent in the address list", (listReq?.body.match(/<address>/g) ?? []).length);
  const many = Array.from({ length: 5000 }, (_, i) => rawAddr(i));
  const v = await call(env.pic, up, env.deferred(ident(142)).verifyAddresses(many));
  check(v.ok && v.validCount === 5000n, "a 5,000-address verification batch completes", { ok: v.ok, valid: v.validCount, error: v.error });
  console.log(`  (scale section took ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
};

// ─── 11. Upgrade from the deployed version: keys and campaigns carry over ───
sections.upgrade = async function upgrade() {
  const OLD_WASM = process.env.OLD_WASM ?? new URL("./.gen/old-backend.wasm", import.meta.url).pathname;
  if (!existsSync(OLD_WASM)) { console.log("  skip (no previous wasm; scripts/test-backend.sh extracts it from git)"); return; }
  const { idlFactory: oldIdl } = await import("./.gen/old-backend.did.js");
  const env = await start({ wasm: OLD_WASM, idl: oldIdl });
  const old = env.as(env.controller);
  const oldKeys = { click2mailUsername: [SECRETS.fulfilmentUsername], click2mailPassword: [SECRETS.fulfilmentPassword], click2mailEnvironment: [{ Staging: null }],
    stripeSecretKey: [SECRETS.stripeSecretKey], stripePublishableKey: [SECRETS.stripePublishableKey], resendKey: [SECRETS.resendKey], openAiKey: [SECRETS.openAiKey],
    webhookSecret: [SECRETS.webhookSecret], outcallProxyUrl: [], sandboxCheckout: [true], supportEmailAddress: [SECRETS.supportEmailAddress] };
  check((await old.saveAdminKeys(oldKeys)).ok, "keys saved on the deployed version");
  const adminId = ident(5);
  await old.assignAdmin(adminId.getPrincipal());
  const user = ident(131);
  const up = upstream([...fakePrintPartner(), ...fakeResend()]);
  const u = env.as(user);
  const created = await u.createCampaign(campaignInput(4));
  const cid = created.campaignId[0];
  const intent = await call(env.pic, up, env.deferred(user).createPaymentIntent({ CampaignOrder: null }, [cid], []));
  await call(env.pic, up, env.deferred(user).confirmPayment(intent.paymentIntentId[0]));
  await u.uploadDocumentChunk(cid, 0n, 1n, "application/pdf", "art.pdf", new Uint8Array(2048).fill(1));
  const d = await call(env.pic, up, env.deferred(user).dispatchClick2MailJob(cid));
  check(d.ok, "a campaign is dispatched on the deployed version", d.error);
  const draft = await u.createCampaign(campaignInput(2));
  await u.submitSupportTicket({ name: "Old", email: "old@example.com", subject: "Before", message: "hi", pagePath: [] });
  await drive(env.pic, up, []);
  const oldView = await old.getAdminKeys();
  const oldCampaign = (await u.getCampaign(cid))[0];

  await env.pic.upgradeCanister({ canisterId: env.canisterId, wasm: readFileSync(WASM), sender: env.controller.getPrincipal(), ...EOP });
  const { as, deferred } = env.actors((await import("./.gen/backend.did.js")).idlFactory);
  const admin = as(env.controller);
  const v = await admin.getAdminKeys();
  check(v.fulfilmentUsername[0] === SECRETS.fulfilmentUsername && v.fulfilmentPasswordMasked[0] === oldView.click2mailPasswordMasked[0] && v.fulfilmentEnvironment.Staging === null,
    "the print-fulfilment login and environment carry over under their new names", v);
  check(["stripeSecretKeyMasked", "resendKeyMasked", "openAiKeyMasked", "webhookSecretMasked", "stripePublishableKey", "supportEmailAddress", "sandboxCheckout", "adminPrincipal"].every((k) => ser(v[k]) === ser(oldView[k])),
    "every other key, the admin and test mode carry over unchanged");
  check((await as(adminId).getAdminKeys()).callerIsAdmin, "the assigned admin is still admin");
  const c = (await as(user).getCampaign(cid))[0];
  check(c.printJobId[0] === oldCampaign.c2mJobId[0] && c.printDocumentId[0] === oldCampaign.c2mDocumentId[0] && c.printAddressListId[0] === oldCampaign.c2mAddressListId[0],
    "each campaign's document, address list and job ids carry over", { new: [c.printDocumentId, c.printAddressListId, c.printJobId], old: [oldCampaign.c2mDocumentId, oldCampaign.c2mAddressListId, oldCampaign.c2mJobId] });
  check(ser(c.status) === ser(oldCampaign.status) && ser(c.paymentStatus) === ser(oldCampaign.paymentStatus) && c.recipientCount === oldCampaign.recipientCount, "status, payment and recipients carry over");
  check((await as(user).getCampaign(draft.campaignId[0]))[0]?.name === "Audit campaign", "unpaid drafts carry over");
  const up2 = upstream([...fakePrintPartner(), ...fakeResend()]);
  const s = await call(env.pic, up2, deferred(adminId).syncPrintTracking(cid));
  check(s.ok && up2.log.length > 0 && up2.log.every((l) => l.headers.authorization === PRINT_AUTH && l.url.includes(oldCampaign.c2mJobId[0])),
    "after the upgrade, tracking uses the carried-over job id and print login", up2.log.map((l) => l.url));
  const t = (await admin.listSupportTickets());
  check(t.length === 1 && t[0].emailStatus.length === 0, "old tickets are kept; their email status (never recorded) shows as unknown");
  await as(user).submitSupportTicket({ name: "New", email: "new@example.com", subject: "After", message: "hi", pagePath: [] });
  await drive(env.pic, up2, []);
  check(up2.log.some((l) => l.url.includes("resend") && l.body.includes("After")), "a ticket filed after the upgrade is emailed");
};

for (const [name, fn] of Object.entries(sections)) {
  if (only.length && !only.includes(name)) continue;
  console.log(`\n▶ ${name}`);
  try { await fn(); } catch (e) { failures.push(`${name}: ${e.message}`); console.log("  ERROR " + (e.stack ?? e).toString().split("\n").slice(0, 4).join("\n")); }
}
await server.stop();
console.log(`\n${failures.length} failing check(s)`);
for (const f of failures) console.log(" - " + f);
process.exit(failures.length ? 1 : 0);
