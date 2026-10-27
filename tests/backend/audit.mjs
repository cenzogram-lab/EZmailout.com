// Functional audit of keys, HTTPS outcalls and queues against the compiled
// canister in PocketIC (run with scripts/test-backend.sh). Every outcall is answered by a fake upstream that
// records the exact request the canister sent.
import { PocketIcServer } from "@dfinity/pic";
import { start, upstream, drive, call, check, failures, ident, anon, EOP, WASM } from "./harness.mjs";
import { keys, SECRETS, RAW_SECRETS, campaignInput, addr, rawAddr, fakePrintPartner, fakeStripe, fakeOpenAi, fakeResend, returnAddress, printPdf } from "./fixtures.mjs";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Ed25519KeyIdentity } from "@icp-sdk/core/identity";

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
  // The print file is staged before checkout, as Step 4 does: the canister
  // takes no payment for a campaign without one.
  const up1 = await u.uploadDocumentChunk(cid, 0n, 1n, "application/pdf", "art.pdf", printPdf(37));
  if (!up1.ok) throw new Error("upload: " + up1.error);
  const intent = await call(env.pic, up, env.deferred(user).createPaymentIntent({ CampaignOrder: null }, [cid], []));
  if (!intent.ok) throw new Error("createPaymentIntent: " + intent.error);
  const conf = await call(env.pic, up, env.deferred(user).confirmPayment(intent.paymentIntentId[0]));
  if (!conf.ok) throw new Error("confirmPayment: " + conf.error);
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
    const [sv, av] = [await stranger.getAdminKeys(), await nobody.getAdminKeys()];
    check([sv, av].every((x) => !x.callerIsAdmin && x.adminPrincipal.length === 0 && x.stripePublishableKey.length === 0 && x.webhookPath === "" && !x.sandboxCheckout), "non-admins are not told who the admin is, nor any setting", [sv, av]);
    check(view.adminPrincipal[0] === assignedAdmin.getPrincipal().toText() && view.webhookPath !== "", "the admin still sees the admin principal and webhook path", view);
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
    // Its environment is fixed by that dispatch: switching the admin's
    // setting afterwards does not send its tracking to the other one.
    await env.admin.saveAdminKeys(keys({ fulfilmentEnvironment: { Staging: null } }));
    const beforeSync = up.log.length;
    await call(env.pic, up, env.deferred(env.controller).syncPrintTracking(cid));
    const syncCalls = up.log.slice(beforeSync).filter((l) => l.url.includes("/molpro/"));
    check(syncCalls.length > 0 && syncCalls.every((l) => l.url.startsWith("https://rest.click2mail.com/molpro")), "a dispatched campaign keeps its print environment after the admin switches it", syncCalls.map((l) => l.url));
    await env.admin.saveAdminKeys(keys({ fulfilmentEnvironment: { Production: null } }));
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

    const refusedList = upstream(fakePrintPartner({ addressListsRefused: 1 }));
    await env.pic.advanceTime(20_000); await env.pic.tick();
    const rr = await call(env.pic, refusedList, env.deferred(user).verifyAddresses([rawAddr(1)]));
    check(!rr.ok && !/click2mail/i.test(ser(rr)), "the print partner's name is scrubbed from its error text", rr.error);

    const detailDown = upstream(fakePrintPartner({ addressListDetail: 1 }));
    await env.pic.advanceTime(20_000); await env.pic.tick();
    const r3 = await call(env.pic, detailDown, env.deferred(user).verifyAddresses([rawAddr(1), rawAddr(2)]));
    check(!r3.ok && r3.validCount === 0n, "a failed verification-result lookup marks nothing valid (fail-closed)", { ok: r3.ok, valid: r3.validCount, error: r3.error });

    const r4 = await call(env.pic, ok, env.deferred(user).verifyAddresses([rawAddr(1)]));
    check(!r4.ok && (r4.error[0] ?? "").includes("Wait"), "one identity must wait 5 s between verifications", r4.error);
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
    const ownerError = r.error[0] ?? "";
    check(ownerError.startsWith("Address list submission failed") && ownerError.includes("nothing has been printed") && !/connection reset|outcall|HTTP|click2mail|print-partner/i.test(ownerError), "the owner is told which step failed in plain words, never the network's or the partner's text", ownerError);
    const ownerView = (await env.as(user).getCampaign(cid))[0]?.lastError[0] ?? "";
    const adminView = (await env.as(env.controller).getCampaign(cid))[0]?.lastError[0] ?? "";
    check(ownerView === ownerError && adminView.includes("connection reset"), "the stored error reads the same way to the owner; the admin keeps the detail", { ownerView, adminView });
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

    // A job whose tracking comes in pages is judged on every page, and only
    // once every page was read.
    const pu = ident(95);
    const pcid = await paidCampaign(env, pu, up);
    const pd = await call(env.pic, up, env.deferred(pu).dispatchPrintJob(pcid));
    if (!pd.ok) throw new Error("dispatch " + pd.error);
    const pages = [["Accepted at USPS Origin Facility"], ["Returned to sender", "Returned to sender"]];
    const statusOf = async () => (await env.as(pu).getCampaign(pcid))[0].status;
    const ignored = upstream(fakePrintPartner({ trackingPages: pages, ignorePaging: true }));
    await call(env.pic, ignored, env.deferred(env.controller).syncPrintTracking(pcid));
    check((await statusOf()).Returned === undefined, "a partner that ignores the page parameter never settles the campaign on page 1 alone", await statusOf());
    const down = upstream(fakePrintPartner({ trackingPages: pages, trackingPageDown: 2 }));
    await call(env.pic, down, env.deferred(env.controller).syncPrintTracking(pcid));
    check((await statusOf()).Returned === undefined, "a page that fails leaves the job unjudged", await statusOf());
    const tooMany = upstream(fakePrintPartner({ trackingPages: Array.from({ length: 26 }, () => ["Returned to sender"]) }));
    await call(env.pic, tooMany, env.deferred(env.controller).syncPrintTracking(pcid));
    const tooManyReads = tooMany.log.filter((l) => l.url.includes("/tracking")).length;
    check((await statusOf()).Returned === undefined && tooManyReads === 1, "more pages than the cap reads one page and judges nothing", { status: await statusOf(), tooManyReads });
    const paged = upstream(fakePrintPartner({ trackingPages: pages }));
    const ps = await call(env.pic, paged, env.deferred(env.controller).syncPrintTracking(pcid));
    const urls = paged.log.filter((l) => l.url.includes("/tracking")).map((l) => l.url);
    check(ps.ok && (await statusOf()).Returned !== undefined && urls.length === 2 && urls[0].endsWith("trackingType=IMB") && urls[1].endsWith("trackingType=IMB&page=2"), "every page is read and the scans of all of them decide the stage", { status: await statusOf(), urls });
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
    check(body.getAll("payment_method_types[]").join() === "card" && !body.has("automatic_payment_methods[enabled]"), "checkout takes cards only, which settle while the customer is on the page", Object.fromEntries(body));
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

    state.failCreate = true;
    const refused = await call(env.pic, up, env.deferred(ident(105)).createPaymentIntent({ CreditPack: null }, [], [{ Starter: null }]));
    check(!refused.ok && !/stripe|sk_|api key/i.test(refused.error[0] ?? ""), "a customer's checkout error names no provider and quotes no key", refused.error);
    const adminRefused = await call(env.pic, up, env.deferred(env.controller).createPaymentIntent({ CreditPack: null }, [], [{ Starter: null }]));
    check((adminRefused.error[0] ?? "").includes("Invalid API Key"), "the admin sees Stripe's own error", adminRefused.error);
    state.failCreate = false;

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
    state.paid = true;

    // A test key's payment moved no money: it grants nothing.
    const tester = ident(106);
    const ti = await call(env.pic, up, env.deferred(tester).createPaymentIntent({ CreditPack: null }, [], [{ Growth: null }]));
    state.livemode = false;
    const tc = await call(env.pic, up, env.deferred(tester).confirmPayment(ti.paymentIntentId[0]));
    const testGrants = (await env.as(tester).getCreditLedger()).filter((e) => e.delta > 0n && e.reason.includes("pack")).length;
    check(!tc.ok && testGrants === 0 && !/stripe|livemode/i.test(tc.error[0] ?? ""), "a test-key payment grants nothing while live checkout is on", tc.error);
    delete state.livemode;
    // There is no payment webhook: a charge whose confirmation was lost is
    // found again by the next checkout for the same order, never charged twice.
    await env.pic.advanceTime(3_000); await env.pic.tick();
    const posts = up.log.filter((l) => l.method === "POST" && l.url.endsWith("/payment_intents")).length;
    const back = await call(env.pic, up, env.deferred(tester).createPaymentIntent({ CreditPack: null }, [], [{ Growth: null }]));
    const postsAfter = up.log.filter((l) => l.method === "POST" && l.url.endsWith("/payment_intents")).length;
    check(back.ok && back.paymentIntentId[0] === ti.paymentIntentId[0] && back.clientSecret.length === 0 && postsAfter === posts, "a paid but unconfirmed checkout is handed back for confirmation instead of a new charge", back);
    await env.pic.advanceTime(6_000); await env.pic.tick();
    const recovered = await call(env.pic, up, env.deferred(tester).confirmPayment(back.paymentIntentId[0]));
    check(recovered.ok && recovered.creditBalance[0] >= 1600n, "confirming it grants the pack", recovered);
    // An open checkout still waiting for a card is reused, not duplicated;
    // a cancelled one is closed and a new one opened.
    const waiter = ident(107);
    const w1 = await call(env.pic, up, env.deferred(waiter).createPaymentIntent({ CreditPack: null }, [], [{ Agency: null }]));
    state.lookup = () => "requires_payment_method";
    await env.pic.advanceTime(3_000); await env.pic.tick();
    const w2 = await call(env.pic, up, env.deferred(waiter).createPaymentIntent({ CreditPack: null }, [], [{ Agency: null }]));
    check(w2.ok && w2.paymentIntentId[0] === w1.paymentIntentId[0] && w2.clientSecret[0] === w1.clientSecret[0], "an open checkout for the same order is reused", { w1: w1.paymentIntentId, w2: w2.paymentIntentId });
    state.lookup = () => "canceled";
    await env.pic.advanceTime(3_000); await env.pic.tick();
    const w3 = await call(env.pic, up, env.deferred(waiter).createPaymentIntent({ CreditPack: null }, [], [{ Agency: null }]));
    check(w3.ok && w3.paymentIntentId[0] !== w1.paymentIntentId[0] && w3.clientSecret.length === 1, "a cancelled checkout is replaced by a new one", w3);
    delete state.lookup;

    // Payment history and refunds: the customer quotes the invoice number
    // (payment id) from their history; the admin finds it and refunds it.
    const history = await env.as(tester).getMyPayments();
    const invoice = history.find((p) => p.paymentIntentId === ti.paymentIntentId[0]);
    check(invoice && invoice.amountCents === 1500n && invoice.refundedCents === 0n && invoice.state.Succeeded !== undefined, "the customer's payment history lists the paid pack under its invoice number", history.map((p) => p.paymentIntentId));
    check((await env.as(ident(102)).adminFindPayments(tester.getPrincipal().toText())).length === 0, "anyone but the admin finds no payments");
    const byAccount = await env.as(env.controller).adminFindPayments(tester.getPrincipal().toText());
    const byInvoice = await env.as(env.controller).adminFindPayments(ti.paymentIntentId[0]);
    check(byAccount.some((p) => p.paymentIntentId === ti.paymentIntentId[0]) && byInvoice.length === 1, "the admin finds the payment by account id and by invoice number", { byAccount: byAccount.length, byInvoice: byInvoice.length });
    const notAdmin = await call(env.pic, up, env.deferred(tester).adminRefundPayment({ paymentIntentId: ti.paymentIntentId[0], amountCents: 100n, reason: "x", revokeEffects: false }));
    check(!notAdmin.ok && (state.refunds ?? []).length === 0, "a customer cannot refund their own payment", notAdmin.error);
    const balanceBefore = (await env.as(tester).getMyAccount())[0].creditBalance;
    const part = await call(env.pic, up, env.deferred(env.controller).adminRefundPayment({ paymentIntentId: ti.paymentIntentId[0], amountCents: 500n, reason: "Requested by customer", revokeEffects: true }));
    const afterPart = (await env.as(tester).getMyAccount())[0].creditBalance;
    check(part.ok && part.refundedCents === 500n && state.refunds?.[0]?.amount === 500 && state.refunds[0].payment_intent === ti.paymentIntentId[0] && balanceBefore - afterPart === 533n, "a partial refund goes back to the card and takes back its share of the pack's credits", { error: part.error, balanceBefore, afterPart });
    const tooMuch = await call(env.pic, up, env.deferred(env.controller).adminRefundPayment({ paymentIntentId: ti.paymentIntentId[0], amountCents: 1001n, reason: "x", revokeEffects: false }));
    check(!tooMuch.ok && /\$10\.00/.test(tooMuch.error[0] ?? ""), "a refund can never exceed what is left of the payment", tooMuch.error);
    state.refundFails = true;
    const refundRefused = await call(env.pic, up, env.deferred(env.controller).adminRefundPayment({ paymentIntentId: ti.paymentIntentId[0], amountCents: 100n, reason: "x", revokeEffects: false }));
    state.refundFails = false;
    check(!refundRefused.ok && /already been refunded/.test(refundRefused.error[0] ?? "") && (await env.as(env.controller).adminFindPayments(ti.paymentIntentId[0]))[0].refundedCents === 500n, "a refund the processor refuses records nothing", refundRefused.error);
    const rest = await call(env.pic, up, env.deferred(env.controller).adminRefundPayment({ paymentIntentId: ti.paymentIntentId[0], amountCents: 1000n, reason: "Requested by customer", revokeEffects: false }));
    const done = await call(env.pic, up, env.deferred(env.controller).adminRefundPayment({ paymentIntentId: ti.paymentIntentId[0], amountCents: 1n, reason: "x", revokeEffects: false }));
    const view = (await env.as(tester).getMyPayments()).find((p) => p.paymentIntentId === ti.paymentIntentId[0]);
    check(rest.ok && rest.refundedCents === 1500n && !done.ok && /in full/.test(done.error[0] ?? "") && view.refunds.length === 2, "the rest is refunded once, and the history shows both refunds", { rest: rest.error, done: done.error });
    check(view.refunds.every((r) => r.reason === "") && (await env.as(env.controller).adminFindPayments(ti.paymentIntentId[0]))[0].refunds.every((r) => r.reason !== ""), "the admin's refund notes are not shown to the customer", view.refunds);
    check(up.log.some((l) => l.method === "GET" && /\/v1\/refunds\/re_/.test(l.url)), "each refund is read back from the processor before it is recorded");
    // Goodwill credits, with a note on the customer's ledger.
    const adj = await env.as(env.controller).adminAdjustCredits(tester.getPrincipal().toText(), 250n, "Sorry for the trouble");
    const ledger2 = await env.as(tester).getCreditLedger();
    check(adj.ok && adj.creditBalance[0] === afterPart + 250n && ledger2.some((e) => e.delta === 250n && e.reason.includes("Sorry for the trouble")), "the admin can credit an account, noted on its ledger", adj);
    check(!(await env.as(tester).adminAdjustCredits(tester.getPrincipal().toText(), 1000n, "free")).ok, "a customer cannot credit themselves");
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
    const shown = bad.error[0] ?? "";
    check(!/openai|sk-|api key/i.test(shown), "a customer's AI error names no provider and quotes no key", shown);
    // Stampy costs no credits, so it shows both audiences the same failure.
    const keyError = upstream([[(r) => r.url.includes("/chat/completions"), () => ({ status: 401, body: { error: { message: "Incorrect API key provided: sk-proj-****_789." } } })]]);
    const customerChat = await call(env.pic, keyError, env.deferred(user).askStampy([{ role: { User: null }, content: "hi" }]));
    const adminChat = await call(env.pic, keyError, env.deferred(env.controller).askStampy([{ role: { User: null }, content: "hi" }]));
    check(!/openai|sk-|api key/i.test(customerChat.error[0] ?? "") && (adminChat.error[0] ?? "").includes("Incorrect API key"),
      "Stampy errors: the customer gets a neutral message, the admin the provider's own", { customer: customerChat.error, admin: adminChat.error });
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
    r = await hook(SECRETS.webhookSecret, { jobId: d.jobId[0], event: "Delivered", eventId: "evt-url" }, true);
    check(r.status_code === 401, "the right secret in the URL (?secret=) is refused: header only", r.status_code);
    check(!(await env.as(user).getTrackingEvents(cid)).some((e) => e.providerEventId === "evt-url"), "a refused webhook records nothing");
    for (let i = 0; i < 5; i++) await hook(SECRETS.webhookSecret, { jobId: d.jobId[0], event: "Out for delivery", eventId: "evt-1" });
    const events = await env.as(user).getTrackingEvents(cid);
    const dup = events.filter((e) => e.providerEventId === "evt-1").length;
    check(dup === 1, "a redelivered webhook (same event id) is recorded once", dup);
    await hook(SECRETS.webhookSecret, { jobId: d.jobId[0], event: "Out for delivery (Click2Mail scan)", eventId: "evt-vendor" });
    const vendorEvent = (await env.as(user).getTrackingEvents(cid)).find((e) => e.providerEventId === "evt-vendor");
    check(vendorEvent && !/click2mail/i.test(vendorEvent.detail[0] ?? ""), "webhook scan text naming the print partner is scrubbed on the timeline", vendorEvent?.detail);
    r = await hook(SECRETS.webhookSecret, { jobId: "nope", event: "Delivered" });
    check(r.status_code === 400, "an unknown job is refused");
    r = await hook(SECRETS.webhookSecret, { jobId: d.jobId[0], event: "Delivered", eventId: "evt-2" }, false, "/webhooks/click2mail");
    check(r.status_code === 200, "the legacy webhook path configured at the print partner still works", Buffer.from(r.body).toString());
    check((await env.admin.getAdminKeys()).webhookPath === "/webhooks/fulfilment", "the admin is shown the new webhook path");
    // One piece's outcome does not settle a campaign of several pieces: the
    // event is recorded and tracking (every piece's scans) decides.
    const after = (await env.as(user).getCampaign(cid))[0];
    check(after.status.Delivered === undefined && (await env.as(user).getTrackingEvents(cid)).some((e) => e.providerEventId === "evt-2"), "a Delivered webhook for a several-piece campaign is recorded without settling it", after.status);
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
// ─── Orders, referrals and abuse budgets (functional audit fixes) ───────────
sections.orders = async function orders() {
  const env = await setup({ sandboxCheckout: false });
  const pay = { intents: new Map() };
  const up = upstream([...fakeStripe(pay), ...fakePrintPartner()]);
  const pdf = (fill) => printPdf(fill);

  // A campaign is paid for only once its print file is staged, and that file
  // is the one that prints.
  const owner = ident(151);
  const o = env.as(owner);
  const cid = (await o.createCampaign(campaignInput(3))).campaignId[0];
  const early = await call(env.pic, up, env.deferred(owner).createPaymentIntent({ CampaignOrder: null }, [cid], []));
  check(!early.ok && /print file/.test(early.error[0] ?? ""), "checkout refuses a campaign whose print file was never uploaded", early.error);
  // The price covers one front-and-back piece and the print partner bills by
  // page, so a longer file, or one whose bytes are not what its label says,
  // is refused and never staged.
  const tooLong = await o.uploadDocumentChunk(cid, 0n, 1n, "application/pdf", "art.pdf", printPdf(1, 3));
  check(!tooLong.ok && /3 pages/.test(tooLong.error[0] ?? ""), "a 3-page print file is refused", tooLong.error);
  const disguised = await o.uploadDocumentChunk(cid, 0n, 1n, "image/png", "art.png", printPdf(1, 3));
  check(!disguised.ok && /match its type/.test(disguised.error[0] ?? ""), "a PDF labelled as an image is refused", disguised.error);
  const stillEarly = await call(env.pic, up, env.deferred(owner).createPaymentIntent({ CampaignOrder: null }, [cid], []));
  check(!stillEarly.ok && /print file/.test(stillEarly.error[0] ?? ""), "a refused file leaves nothing staged to pay for", stillEarly.error);
  // A re-upload starts a new file: its first chunk never completes the old
  // file's second, so half a new file is never paid for or printed.
  const first = printPdf(2, 2, 3000), second = printPdf(3, 2, 3000);
  const half = Math.floor(first.length / 2);
  await o.uploadDocumentChunk(cid, 0n, 2n, "application/pdf", "a.pdf", first.slice(0, half));
  await o.uploadDocumentChunk(cid, 1n, 2n, "application/pdf", "a.pdf", first.slice(half));
  await o.uploadDocumentChunk(cid, 0n, 2n, "application/pdf", "b.pdf", second.slice(0, half));
  // ...and is staged beside the complete file, which stays payable until the
  // new one is complete and checked: a re-upload that stops part-way can no
  // longer take away the file an open checkout was created for.
  const staging = (await o.getDocumentUploadStatus(cid))[0];
  const mixed = await call(env.pic, up, env.deferred(owner).createPaymentIntent({ CampaignOrder: null }, [cid], []));
  check(staging?.complete && staging.fileName === "a.pdf" && mixed.ok, "a re-upload's first chunk never mixes with the staged file, which stays complete and payable", { staging, error: mixed.error });
  await o.uploadDocumentChunk(cid, 1n, 2n, "application/pdf", "b.pdf", second.slice(half));
  check((await o.getDocumentUploadStatus(cid))[0]?.fileName === "b.pdf", "the new file replaces the staged one once complete");
  const badSwap = await o.uploadDocumentChunk(cid, 0n, 1n, "application/pdf", "c.pdf", printPdf(1, 3));
  check(!badSwap.ok && (await o.getDocumentUploadStatus(cid))[0]?.fileName === "b.pdf", "a replacement that fails the check leaves the staged file in place", badSwap.error);
  await env.pic.advanceTime(3_000); await env.pic.tick(); // the per-identity checkout gap
  // A print job needs a return address, and a paid order's cannot change.
  const noReturn = await o.createCampaign(campaignInput(1, { returnAddress: [] }));
  check(!noReturn.ok && /return address/i.test(noReturn.error[0] ?? ""), "a campaign without a return address is refused", noReturn.error);
  const badZip = await o.createCampaign(campaignInput(1, { returnAddress: [{ ...returnAddress, zip_code: "12" }] }));
  check(!badZip.ok && /ZIP/.test(badZip.error[0] ?? ""), "a return address with a bad ZIP is refused", badZip.error);
  check((await o.uploadDocumentChunk(cid, 0n, 1n, "application/pdf", "art.pdf", pdf(1))).ok, "the print file is staged");
  const intent = await call(env.pic, up, env.deferred(owner).createPaymentIntent({ CampaignOrder: null }, [cid], []));
  const paid = await call(env.pic, up, env.deferred(owner).confirmPayment(intent.paymentIntentId[0]));
  check(intent.ok && paid.ok, "with its file staged the campaign is paid", { intent: intent.error, paid: paid.error });
  const swap = await o.uploadDocumentChunk(cid, 0n, 1n, "application/pdf", "other.pdf", pdf(9));
  check(!swap.ok && /paid/.test(swap.error[0] ?? ""), "a paid campaign's print file can no longer be replaced", swap.error);

  // A full refund of a campaign that has not gone to print: it can no
  // longer be sent to print or paid again.
  const campaignRefund = await call(env.pic, up, env.deferred(env.controller).adminRefundPayment({ paymentIntentId: intent.paymentIntentId[0], amountCents: BigInt(pay.intents.get(intent.paymentIntentId[0]).amount), reason: "Order cancelled before printing", revokeEffects: true }));
  const refundedCampaign = (await o.getCampaign(cid))[0];
  const noDispatch = await call(env.pic, up, env.deferred(owner).dispatchPrintJob(cid));
  const noRepay = await call(env.pic, up, env.deferred(owner).createPaymentIntent({ CampaignOrder: null }, [cid], []));
  check(campaignRefund.ok && refundedCampaign.paymentStatus.Refunded !== undefined && !noDispatch.ok && !noRepay.ok && /refunded/.test(noRepay.error[0] ?? ""), "a refunded campaign can no longer be sent to print or paid again", { refund: campaignRefund.error, dispatch: noDispatch.error, repay: noRepay.error });

  // Deleting a draft closes its open checkout first; one that cannot be
  // closed (it may be paid) keeps the draft.
  const deleter = ident(158);
  const d = env.as(deleter);
  const dc = (await d.createCampaign(campaignInput(3))).campaignId[0];
  await d.uploadDocumentChunk(dc, 0n, 1n, "application/pdf", "art.pdf", pdf(2));
  const dIntent = await call(env.pic, up, env.deferred(deleter).createPaymentIntent({ CampaignOrder: null }, [dc], []));
  const dGone = await call(env.pic, up, env.deferred(deleter).deleteCampaignDraft(dc));
  check(dIntent.ok && dGone.ok && up.log.some((l) => l.url.endsWith(`/${dIntent.paymentIntentId[0]}/cancel`)), "deleting a draft cancels its open checkout, then removes it", dGone.error);
  const kc = (await d.createCampaign(campaignInput(3))).campaignId[0];
  await d.uploadDocumentChunk(kc, 0n, 1n, "application/pdf", "art.pdf", pdf(3));
  await env.pic.advanceTime(3_000); await env.pic.tick();
  await call(env.pic, up, env.deferred(deleter).createPaymentIntent({ CampaignOrder: null }, [kc], []));
  pay.cancelFails = true;
  const kept = await call(env.pic, up, env.deferred(deleter).deleteCampaignDraft(kc));
  pay.cancelFails = false;
  check(!kept.ok && (await d.getCampaign(kc)).length === 1, "a draft whose checkout cannot be cancelled is kept", kept.error);

  // A referred customer earns their referrer one free month, whichever
  // payment is confirmed first (newest-first confirmation earned one each).
  const referrer = ident(152);
  const r = env.as(referrer);
  const code = (await r.ensureAccount([], [])).account[0].referralCode;
  await env.pic.advanceTime(3_000); await env.pic.tick();
  const sub = await call(env.pic, up, env.deferred(referrer).createPaymentIntent({ Subscription: null }, [], []));
  const subPaid = await call(env.pic, up, env.deferred(referrer).confirmPayment(sub.paymentIntentId[0]));
  check(subPaid.ok && subPaid.subscriptionActive[0] === true, "the referrer's membership is live", subPaid.error);
  // Volume tiers: a campaign is priced by its pieces, a member at the
  // 10,000-piece rate, and checkout charges exactly the stored total.
  const few = await o.createCampaign(campaignInput(3));
  check(few.ok && few.unitPriceCents[0] === 98n && few.totalCents[0] === 294n, "a non-member's 3 × 6×9 postcards cost 98¢ each", { unit: few.unitPriceCents, total: few.totalCents });
  const many = await o.createCampaign(campaignInput(1000));
  check(many.ok && many.unitPriceCents[0] === 72n && many.totalCents[0] === 72_000n, "1,000 × 6×9 postcards cost 72¢ each", { unit: many.unitPriceCents, total: many.totalCents });
  const mem = await r.createCampaign(campaignInput(5));
  check(mem.ok && mem.unitPriceCents[0] === 68n, "a member's 5 × 6×9 postcards cost the 10,000-piece 68¢", mem.unitPriceCents);
  await r.uploadDocumentChunk(mem.campaignId[0], 0n, 1n, "application/pdf", "art.pdf", pdf(3));
  await env.pic.advanceTime(3_000); await env.pic.tick(); // the per-identity checkout gap
  const memIntent = await call(env.pic, up, env.deferred(referrer).createPaymentIntent({ CampaignOrder: null }, [mem.campaignId[0]], []));
  const charged = pay.intents.get(memIntent.paymentIntentId?.[0])?.amount;
  check(memIntent.ok && memIntent.amountCents[0] === 340n && charged === 340, "checkout charges the stored tier total (5 × 68¢)", { amount: memIntent.amountCents, charged, error: memIntent.error });

  const referee = ident(153);
  await env.as(referee).ensureAccount([code], []);
  // A payment under the month it would earn earns nothing: fresh identities
  // are free, so a $5 pack must not buy a $9 month.
  const smallPack = await call(env.pic, up, env.deferred(referee).createPaymentIntent({ CreditPack: null }, [], [{ Starter: null }]));
  const smallPaid = await call(env.pic, up, env.deferred(referee).confirmPayment(smallPack.paymentIntentId[0]));
  check(smallPaid.ok && !smallPaid.referralRewardApplied && (await r.getReferralStats())[0].referralCreditsEarned === 0n, "a referred customer's $5 payment earns the referrer nothing", smallPaid.error);
  await env.pic.advanceTime(3_000); await env.pic.tick();
  const p1 = await call(env.pic, up, env.deferred(referee).createPaymentIntent({ CreditPack: null }, [], [{ Growth: null }]));
  await env.pic.advanceTime(3_000); await env.pic.tick();
  const p2 = await call(env.pic, up, env.deferred(referee).createPaymentIntent({ CreditPack: null }, [], [{ Growth: null }]));
  const c2 = await call(env.pic, up, env.deferred(referee).confirmPayment(p2.paymentIntentId[0]));
  const c1 = await call(env.pic, up, env.deferred(referee).confirmPayment(p1.paymentIntentId[0]));
  const stats = (await r.getReferralStats())[0];
  check(c1.ok && c2.ok && stats.referralCreditsEarned === 1n, "two checkouts confirmed newest first earn the referrer one free month, not two", { earned: stats.referralCreditsEarned, c1: c1.referralRewardApplied, c2: c2.referralRewardApplied });
  // The reward is decided at confirmation; a customer cannot claim one by hand
  // later (say, once the referrer has joined), and the admin's retry is idempotent.
  const again = await env.as(referee).applyReferralReward(p1.paymentIntentId[0]);
  check(!again.ok && /admin/.test(again.error[0] ?? ""), "a customer cannot apply a referral reward by hand", again.error);
  const adminAgain = await env.as(env.controller).applyReferralReward(p1.paymentIntentId[0]);
  check(!adminAgain.ok && (await r.getReferralStats())[0].referralCreditsEarned === 1n, "the admin asking for the reward again grants nothing", adminAgain.error);
  // A refund takes the month back once what is kept of the payment no
  // longer covers it; another qualifying payment can then earn it again.
  const refundAll = (id, amount) => call(env.pic, up, env.deferred(env.controller).adminRefundPayment({ paymentIntentId: id, amountCents: BigInt(amount), reason: "Requested by customer", revokeEffects: true }));
  const earnedNow = async () => (await r.getReferralStats())[0];
  // (The second checkout was the first handed back: one intent, paid once.)
  await refundAll(p2.paymentIntentId[0], 1500);
  const afterRefund = await earnedNow();
  check(afterRefund.referralCreditsEarned === 0n && afterRefund.freeMonthsAvailable === 0n && afterRefund.rewards.length === 0, "fully refunding the payment that earned a free month takes the unused month back", afterRefund);
  await env.pic.advanceTime(3_000); await env.pic.tick();
  const p3 = await call(env.pic, up, env.deferred(referee).createPaymentIntent({ CreditPack: null }, [], [{ Growth: null }]));
  const c3 = await call(env.pic, up, env.deferred(referee).confirmPayment(p3.paymentIntentId[0]));
  check(c3.ok && c3.referralRewardApplied && (await earnedNow()).referralCreditsEarned === 1n, "the referred customer's next qualifying payment can then earn it", { error: c3.error, applied: c3.referralRewardApplied });
  const renewsBefore = (await r.getMyAccount())[0].subscriptionRenewsAt;
  const redeem = await call(env.pic, up, env.deferred(referrer).createPaymentIntent({ Subscription: null }, [], []));
  const renewsRedeemed = (await r.getMyAccount())[0].subscriptionRenewsAt;
  check(redeem.ok && redeem.waived && renewsRedeemed - renewsBefore === 30n * 86_400_000_000_000n, "the referrer uses the free month (30 more days)", redeem.error);
  await refundAll(p3.paymentIntentId[0], 500);
  check((await earnedNow()).referralCreditsEarned === 1n, "a partial refund that still leaves the month's price paid keeps the month");
  await refundAll(p3.paymentIntentId[0], 1000);
  const usedBack = await earnedNow();
  const renewsAfter = (await r.getMyAccount())[0].subscriptionRenewsAt;
  check(usedBack.referralCreditsEarned === 0n && usedBack.referralCreditsRedeemed === 0n && renewsAfter === renewsBefore, "refunding below the month's price takes a used free month's days back", { usedBack, renewsBefore, renewsAfter });

  // Verification fails closed when the per-address result does not line up
  // with the batch, and a customer sees plain advice, not network detail.
  const short = upstream(fakePrintPartner({ detail: [{ Address1: "1 A St", status: "valid" }, { Address1: "2 B St", status: "invalid" }] }));
  const batch = [rawAddr(0), rawAddr(1), rawAddr(2)];
  const v = await call(env.pic, short, env.deferred(ident(154)).verifyAddresses(batch));
  check(!v.ok && v.validCount === 0n, "a result with fewer records than addresses marks nothing valid", { ok: v.ok, valid: v.validCount, error: v.error });
  const down = upstream([[(q) => q.url.includes("/addressLists"), () => ({ reject: "dns error: failed to lookup stage-rest.click2mail.com" })]]);
  const cust = await call(env.pic, down, env.deferred(ident(155)).verifyAddresses(batch));
  check(!cust.ok && !/dns|outcall|click2mail|print-partner/i.test(cust.error[0] ?? ""), "a customer's verification error carries no network or partner detail", cust.error);
  const adm = await call(env.pic, down, env.deferred(env.controller).verifyAddresses(batch));
  check(/dns/i.test(adm.error[0] ?? ""), "the admin sees the network detail", adm.error);

  // A small postcard is mailed First-Class only, whatever the request says.
  const small = await o.createCampaign(campaignInput(2, { product: { colorOption: [], layoutVariant: "3.5x5", productType: { Postcard: null } }, mailClass: [{ MarketingMail: null }] }));
  const rec = (await o.getCampaign(small.campaignId[0]))[0];
  check(small.ok && rec.printSpec.mailClass.FirstClass === null, "a 3.5×5 postcard asked for as Marketing Mail is booked First-Class", rec?.printSpec.mailClass);

  // Support tickets: every caller together is held to an hourly budget.
  let accepted = 0;
  let busy = null;
  for (let i = 0; i < 45 && !busy; i++) {
    const a = env.as(Ed25519KeyIdentity.generate());
    for (let k = 0; k < 5; k++) {
      const t = await a.submitSupportTicket({ name: "Flood", email: "flood@example.com", subject: `s${i}`, message: "m", pagePath: [] });
      if (t.ok) accepted++;
      else { busy = t.error[0]; break; }
    }
  }
  check(accepted === 200 && /busy/.test(busy ?? ""), "fresh identities together file at most 200 tickets an hour", { accepted, busy });

  // A draft keeps its member price only while the membership lasts: once the
  // 30-day pass has ended, checkout refuses it until it is launched again.
  const day = 24 * 3600 * 1000;
  await env.pic.advanceTime(25 * day); await env.pic.tick();
  const late = await r.createCampaign(campaignInput(5));
  check(late.ok && late.unitPriceCents[0] === 68n, "a member's draft on day 25 of the pass is priced at the member 68¢", { error: late.error, unit: late.unitPriceCents });
  await r.uploadDocumentChunk(late.campaignId[0], 0n, 1n, "application/pdf", "art.pdf", pdf(4));
  await env.pic.advanceTime(6 * day); await env.pic.tick();
  const lapsed = await call(env.pic, up, env.deferred(referrer).createPaymentIntent({ CampaignOrder: null }, [late.campaignId[0]], []));
  check(!lapsed.ok && /membership/i.test(lapsed.error[0] ?? ""), "once the membership has ended, checkout refuses the member-priced draft", lapsed.error);

  // Payment records stay bounded: a checkout left open for a week is closed
  // with the processor (looked up first; one already paid stays open for its
  // customer to confirm), and closed records a month old are forgotten.
  const abandoned = await call(env.pic, up, env.deferred(ident(160)).createPaymentIntent({ CreditPack: null }, [], [{ Starter: null }]));
  const lost = await call(env.pic, up, env.deferred(ident(161)).createPaymentIntent({ CreditPack: null }, [], [{ Starter: null }]));
  const [abandonedId, lostId] = [abandoned.paymentIntentId[0], lost.paymentIntentId[0]];
  pay.lookup = (id) => (id === abandonedId ? "requires_payment_method" : undefined);
  const found = async (id) => (await env.as(env.controller).adminFindPayments(id)).find((p) => p.paymentIntentId === id);
  await env.pic.advanceTime(7 * day + 2 * HOUR); await drive(env.pic, up, []);
  const [closed, keptOpen] = [await found(abandonedId), await found(lostId)];
  check(closed?.state.Failed === null && up.log.some((l) => l.url.endsWith(`/${abandonedId}/cancel`)) && keptOpen?.state.Created === null && !up.log.some((l) => l.url.endsWith(`/${lostId}/cancel`)),
    "a week-old open checkout is cancelled with the processor; one the processor reports paid is kept for recovery", { closed: closed?.state, kept: keptOpen?.state });
  await env.pic.advanceTime(24 * day); await drive(env.pic, up, []);
  check(!(await found(abandonedId)) && (await found(lostId))?.state.Created === null, "a closed checkout a month old is forgotten; the paid-but-unconfirmed one stays");
  const recovered = await call(env.pic, up, env.deferred(ident(161)).createPaymentIntent({ CreditPack: null }, [], [{ Starter: null }]));
  check(recovered.ok && recovered.paymentIntentId[0] === lostId && recovered.clientSecret.length === 0, "its customer's next checkout hands the paid one back for confirmation", recovered);
  pay.lookup = undefined;
};

// ─── Pricing parity: src/frontend/src/lib/pricing.ts vs the canister ─────────
// The frontend quotes what checkout will charge, so its mirror of
// src/backend/lib/pricing.mo must price every row, quantity and membership
// exactly as the canister does.
sections.pricing = async function pricing() {
  const root = new URL("../../", import.meta.url);
  const front = createRequire(new URL("src/frontend/package.json", root));
  const esbuild = createRequire(front.resolve("vite"))("esbuild");
  const out = new URL(".gen/pricing.mjs", import.meta.url).pathname;
  await esbuild.build({
    entryPoints: [new URL("src/frontend/src/lib/pricing.ts", root).pathname],
    bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error",
    alias: { "@": new URL("src/frontend/src", root).pathname },
  });
  const ts = await import(out);

  // The tier tables, read from the Motoko source.
  const mo = readFileSync(new URL("src/backend/lib/pricing.mo", root), "utf8");
  const nums = (t) => t.split(",").map((x) => Number(x.replace(/_/g, "").trim()));
  const moMinimums = nums(/tierMinimums : \[Nat\] = \[([^\]]+)\]/.exec(mo)[1]);
  const moMember = Number(/memberTierQuantity : Nat = ([\d_]+)/.exec(mo)[1].replace(/_/g, ""));
  const body = mo.slice(mo.indexOf("func volumeTiers"), mo.indexOf("func calculateUnitPrice"));
  const moTiers = Object.fromEntries([...body.matchAll(/case \("([^"]+)"\) \?\[([^\]]+)\]/g)].map((m) => [m[1], nums(m[2])]));
  check(ser(moMinimums) === ser([...ts.TIER_MINIMUMS]) && moMember === ts.MEMBER_TIER_QUANTITY, "tier minimums and the member quantity match", { moMinimums, moMember });
  check(ser(moTiers) === ser(ts.VOLUME_TIERS), "every tier schedule matches", { moTiers, ts: ts.VOLUME_TIERS });
  const moMin = Number(/minOrderCents : Nat = ([\d_]+)/.exec(mo)[1].replace(/_/g, ""));
  const moMax = Number(/maxOrderCents : Nat = ([\d_]+)/.exec(mo)[1].replace(/_/g, ""));
  check(moMin === ts.MIN_ORDER_CENTS && moMax === 99_999_999, "the order minimum and maximum match", { moMin, front: ts.MIN_ORDER_CENTS, moMax });

  // Every ledger row, priced by the canister's rule, at every tier edge.
  const env = await start();
  const ledger = await env.as(ident(161)).getPricingLedger();
  check(ledger.length === ts.PRICING_LEDGER.length, "both ledgers have the same rows", { canister: ledger.length, frontend: ts.PRICING_LEDGER.length });
  const moPostage = Number(/eddmPostageCents : Nat = ([\d_]+)/.exec(mo)[1]);
  check(moPostage === ts.EDDM_POSTAGE_CENTS, "EDDM postage matches", { moPostage, front: ts.EDDM_POSTAGE_CENTS });
  const moSurcharge = Number(/firstClassSurchargeCents : Nat = ([\d_]+)/.exec(mo)[1]);
  const moSurcharged = [.../case \(("[^)]+)\) true;/.exec(mo.slice(mo.indexOf("func firstClassSurcharged")))[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  check(moSurcharge === ts.FIRST_CLASS_SURCHARGE_CENTS && ser(moSurcharged) === ser(["6x9", "6x11", "11x8.5_brochure"]), "the First-Class surcharge and its formats match", { moSurcharge, moSurcharged });
  const moFeeBp = Number(/cardFeeBasisPoints : Nat = ([\d_]+)/.exec(mo)[1]);
  const moFeeFixed = Number(/cardFeeFixedCents : Nat = ([\d_]+)/.exec(mo)[1]);
  check(moFeeBp === ts.CARD_FEE_BASIS_POINTS && moFeeFixed === ts.CARD_FEE_FIXED_CENTS && moFeeBp === 440 && moFeeFixed === 30, "the card fee (4.4% + 30¢) matches", { moFeeBp, moFeeFixed });
  // The canister's rule, written out independently: the tier plus postage and
  // surcharge, never below what keeps 1¢ a piece over cost after the card fee
  // (its percentage on every piece, its fixed 30¢ on the order).
  const cardFee = (total) => Math.ceil((total * moFeeBp) / 10_000) + moFeeFixed;
  const canisterUnit = (row, qty, member, firstClass = false) => {
    const postage = row.productType.Eddm !== undefined ? moPostage : 0;
    const surcharge = firstClass && row.printSpec.mailClass.MarketingMail !== undefined && moSurcharged.includes(row.layoutVariant) ? moSurcharge : 0;
    const cost = Number(row.baseCostCents) + postage + surcharge;
    const listed = canisterPrint(row, qty, member) + postage + surcharge;
    const rate = Math.ceil(((cost + 1) * 10_000) / (10_000 - moFeeBp));
    const n = Math.max(qty, 1);
    let unit = 1;
    while (unit * n < (cost + 1) * n + cardFee(unit * n)) unit += 1;
    return Math.max(listed, rate, unit);
  };
  const canisterPrint = (row, qty, member) => {
    const tiers = moTiers[row.layoutVariant];
    if (!tiers) return Number(row.retailPriceCents);
    const effective = member && qty < moMember ? moMember : qty;
    let price = tiers[0];
    moMinimums.forEach((min, i) => { if (effective >= min) price = tiers[i]; });
    return price;
  };
  const mismatches = [];
  for (const row of ledger) {
    const f = ts.getPricingRow(row.layoutVariant);
    if (!f || f.retailPriceCents !== Number(row.retailPriceCents) || f.baseCostCents !== Number(row.baseCostCents)) {
      mismatches.push({ row: row.layoutVariant, retail: [row.retailPriceCents, f?.retailPriceCents], cost: [row.baseCostCents, f?.baseCostCents] });
      continue;
    }
    for (const qty of [1, 2, 3, 7, 39, 500, 999, 1_000, 2_000, 5_000, 9_999, 10_000, 49_999, 50_000, 55_000]) {
      for (const member of [false, true]) {
        const want = canisterUnit(row, qty, member);
        const got = ts.getUnitPriceCents(row.layoutVariant, qty, member);
        if (want !== got) mismatches.push({ row: row.layoutVariant, qty, member, want, got });
        const wantFc = canisterUnit(row, qty, member, true);
        const gotFc = ts.getUnitPriceCents(row.layoutVariant, qty, member, "FirstClass");
        if (wantFc !== gotFc) mismatches.push({ row: row.layoutVariant, qty, member, firstClass: true, want: wantFc, got: gotFc });
      }
    }
  }
  check(mismatches.length === 0, "the frontend prices every row, quantity and membership as the canister does", mismatches.slice(0, 5));
  check(ts.getUnitPriceCents("4x6", 500) === 79 && ts.getUnitPriceCents("4.25x6", 2_000) === 71 && ts.getUnitPriceCents("4.25x6", 55_000) === 59 && ts.getUnitPriceCents("4.25x6", 10, true) === 62 && ts.getUnitPriceCents("4.25x6", 1) === 90, "the frontend's 4×6 tiers: 79¢, 71¢, floored 59¢, member 62¢, a single piece 90¢");
  check(ts.startingPriceCents("4.25x6") === 59 && ts.startingPriceCents("11x8.5_brochure") === 113 && ts.startingPriceCents("certified_letter") === ts.getPricingRow("certified_letter").retailPriceCents, "a \"from\" price is the last tier for tiered formats (campaigns have no size limit) and the flat price otherwise");
  check(ts.tierSummary("4.25x6") === "$0.79 under 1,000 · $0.71 from 1,000 · $0.62 from 10,000 · $0.59 from 50,000 · members $0.62" && ts.tierSummary("11x8.5_brochure") === "$1.32 under 1,000 · $1.13 from 1,000 · members $1.13", "tier summaries list every distinct tier", [ts.tierSummary("4.25x6"), ts.tierSummary("11x8.5_brochure")]);

  // And the canister's own campaign prices agree with the frontend's quote.
  const buyer = env.as(ident(162));
  for (const [variant, n] of [["4.25x6", 1], ["4.25x6", 1_000], ["letter", 999], ["11x8.5_brochure", 1_000], ["certified_letter", 2], ["eddm_8.5x11", 3]]) {
    const r = await buyer.createCampaign(campaignInput(n, { product: { colorOption: [], layoutVariant: variant, productType: { Postcard: null } } }));
    const unit = ts.getUnitPriceCents(variant, n, false);
    check(r.ok && r.unitPriceCents[0] === BigInt(unit) && r.totalCents[0] === BigInt(unit * n), `the canister prices ${n} × ${variant} at the frontend's ${unit}¢`, { error: r.error, unit: r.unitPriceCents, total: r.totalCents });
    if (r.ok) await buyer.deleteCampaignDraft(r.campaignId[0]);
  }
  for (const [variant, productType, n] of [["6x9", "Postcard", 3], ["8.5x11_flyer", "Flyer", 1]]) {
    const r = await buyer.createCampaign(campaignInput(n, { mailClass: [{ FirstClass: null }], product: { colorOption: [], layoutVariant: variant, productType: { [productType]: null } } }));
    const unit = ts.getUnitPriceCents(variant, n, false, "FirstClass");
    check(r.ok && r.unitPriceCents[0] === BigInt(unit), `First-Class ${variant} is priced at the frontend's ${unit}¢`, { error: r.error, unit: r.unitPriceCents });
    // The list row carries the class, so a re-run keeps it (and its price).
    const summary = (await buyer.getCampaigns()).find((c) => c.id === r.campaignId[0]);
    check(summary?.mailClass?.FirstClass === null, `the campaign list shows First-Class ${variant} as First-Class`, summary?.mailClass);
    if (r.ok) await buyer.deleteCampaignDraft(r.campaignId[0]);
  }
};

sections.scale = async function scale() {
  const env = await setup({ sandboxCheckout: true });
  const user = ident(141);
  const up = upstream(fakePrintPartner({ detail: [] }));
  const u = env.as(user);
  const t0 = Date.now();
  const created = await u.createCampaign(campaignInput(5000));
  check(created.ok, "a 5,000-recipient campaign is created", created.error);
  const cid = created.campaignId[0];
  const big = printPdf(65, 2, 944_600);
  const upl = await u.uploadDocumentChunk(cid, 0n, 1n, "application/pdf", "big.pdf", big);
  check(upl.ok, "a 1.89 MB print file is staged in one chunk", upl.error);
  const intent = await call(env.pic, up, env.deferred(user).createPaymentIntent({ CampaignOrder: null }, [cid], []));
  await call(env.pic, up, env.deferred(user).confirmPayment(intent.paymentIntentId[0]));
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

// ─── Campaigns of any size: staged recipients, one print job per batch ──────
sections.bigOrder = async function bigOrder() {
  const env = await setup({ sandboxCheckout: true });
  const user = ident(171);
  const u = env.as(user);
  const up = upstream(fakePrintPartner());
  const N = 12_000;
  const all = Array.from({ length: N }, (_, i) => addr(i));

  // Priced for the declared count, the first 5,000 sent with the campaign.
  const created = await u.createCampaign(campaignInput(0, { recipients: all.slice(0, 5_000), recipientCount: BigInt(N) }));
  check(created.ok && created.unitPriceCents[0] === 68n && created.totalCents[0] === BigInt(68 * N), "a 12,000-piece 6×9 order is priced at the 10,000 tier (68¢) for every piece", { error: created.error, unit: created.unitPriceCents, total: created.totalCents });
  const cid = created.campaignId[0];
  const tooMany = await u.createCampaign(campaignInput(0, { recipients: Array.from({ length: 5_001 }, (_, i) => addr(i)), recipientCount: 6_000n }));
  check(!tooMany.ok && /5,000/.test(tooMany.error[0] ?? ""), "one message carries at most 5,000 recipients", tooMany.error);

  await u.uploadDocumentChunk(cid, 0n, 1n, "application/pdf", "art.pdf", printPdf(7));
  const early = await call(env.pic, up, env.deferred(user).createPaymentIntent({ CampaignOrder: null }, [cid], []));
  check(!early.ok && /not fully uploaded \(5000 of 12000\)/.test(early.error[0] ?? ""), "checkout waits until every priced recipient is stored", early.error);

  let st = await u.addCampaignRecipients(cid, 0n, []);
  check(st.ok && st.stored === 5_000n && st.total === BigInt(N), "an empty chunk reports progress", st);
  st = await u.addCampaignRecipients(cid, 6_000n, all.slice(6_000, 7_000));
  check(!st.ok && st.stored === 5_000n, "recipients are added in order", st.error);
  st = await u.addCampaignRecipients(cid, 5_000n, all.slice(5_000, 10_000));
  check(st.ok && st.stored === 10_000n, "a chunk is appended", st);
  st = await u.addCampaignRecipients(cid, 5_000n, all.slice(5_000, 10_000));
  check(st.ok && st.stored === 10_000n, "a retried chunk is acknowledged, not stored twice", st);
  st = await u.addCampaignRecipients(cid, 9_000n, all.slice(9_000, 12_000));
  check(st.ok && st.stored === BigInt(N), "an overlapping chunk stores only its new part", st);
  st = await u.addCampaignRecipients(cid, BigInt(N), [addr(N)]);
  check(!st.ok && /created for 12000/.test(st.error[0] ?? ""), "no more recipients than the campaign was priced for", st.error);
  const stranger = await env.as(ident(172)).addCampaignRecipients(cid, 0n, []);
  check(!stranger.ok && stranger.total === 0n, "another identity cannot read or stage a campaign's recipients", stranger);

  const intent = await call(env.pic, up, env.deferred(user).createPaymentIntent({ CampaignOrder: null }, [cid], []));
  check(intent.ok && intent.amountCents[0] === BigInt(68 * N), "with every recipient stored checkout opens for the full total", { error: intent.error, amount: intent.amountCents });
  await call(env.pic, up, env.deferred(user).confirmPayment(intent.paymentIntentId[0]));
  const late = await u.addCampaignRecipients(cid, BigInt(N), [addr(N)]);
  check(!late.ok && /paid/.test(late.error[0] ?? ""), "a paid campaign's list can no longer change", late.error);

  // Dispatch: one address list and one job per batch, each under 2 MB.
  const d = await call(env.pic, up, env.deferred(user).dispatchPrintJob(cid));
  const lists = up.log.filter((l) => l.url.endsWith("/addressLists"));
  const jobs = up.log.filter((l) => l.method === "POST" && l.url.endsWith("/jobs"));
  const submits = up.log.filter((l) => l.url.endsWith("/submit"));
  const sent = lists.map((l) => (l.body.match(/<address>/g) ?? []).length);
  check(d.ok && d.productionStatus[0]?.Submitted !== undefined, "the 12,000-piece campaign is dispatched", d.error);
  check(lists.length >= 2 && jobs.length === lists.length && submits.length === lists.length, "it is sent as several address lists, one print job each, all submitted", { lists: lists.length, jobs: jobs.length, submits: submits.length });
  check(lists.every((l) => l.body.length < 1_900_000), "every address-list outcall stays under the 2 MB request cap", lists.map((l) => l.body.length));
  check(sent.reduce((a, b) => a + b, 0) === N && lists[0].body.includes(all[0].address_line1) && lists.at(-1).body.includes(all[N - 1].address_line1), "every recipient is sent exactly once, in order", sent);
  const jobIds = new Set(jobs.map((_, i) => i));
  check(jobIds.size === jobs.length && new Set(jobs.map((j) => new URLSearchParams(j.body).get("addressId"))).size === lists.length, "each job carries its own address list", jobs.map((j) => new URLSearchParams(j.body).get("addressId")));
  const again = await call(env.pic, up, env.deferred(env.controller).dispatchPrintJob(cid));
  check(again.ok && up.log.filter((l) => l.url.endsWith("/submit")).length === submits.length, "a dispatched campaign is never submitted twice");

  // Tracking reads every job; a webhook for a later batch's job finds the campaign.
  const before = up.log.length;
  const s = await call(env.pic, up, env.deferred(env.controller).syncPrintTracking(cid));
  const tracked = up.log.slice(before).filter((l) => l.url.includes("/tracking")).length;
  check(s.ok && tracked === lists.length, "tracking looks up every print job of the campaign", { tracked, lists: lists.length, error: s.error });
  const lastJob = submits.at(-1).url.split("/jobs/")[1].split("/")[0];
  const w = await env.as(anon).handleDeliveryWebhook(SECRETS.webhookSecret, JSON.stringify({ jobId: lastJob, status: "In transit", eventId: "evt-big-1" }));
  check(w.ok && w.campaignId[0] === cid, "a webhook for a later batch's job is matched to its campaign", w);

  // The 50,000 tier is reachable without membership.
  const huge = await env.as(ident(173)).createCampaign(campaignInput(1, { recipientCount: 50_000n }));
  check(huge.ok && huge.unitPriceCents[0] === 65n && huge.totalCents[0] === 3_250_000n, "a 50,000-piece 6×9 order is priced at the 50,000 tier (65¢)", { error: huge.error, unit: huge.unitPriceCents });
};

// ─── Saved audiences of any size, and paged reads of large lists ──────────────
sections.bigAudience = async function bigAudience() {
  const env = await setup({ sandboxCheckout: true });
  const user = ident(181);
  const u = env.as(user);
  const N = 12_000;
  const all = Array.from({ length: N }, (_, i) => addr(i));
  const readAll = async (read) => {
    const out = [];
    for (;;) {
      const page = await read(BigInt(out.length), 2_000n);
      out.push(...page.addresses);
      if (page.addresses.length === 0 || out.length >= Number(page.total)) return { out, total: Number(page.total) };
    }
  };

  // Saved: the first 5,000 with savePreset, the rest appended in order.
  const tooMany = await u.savePreset("Too big at once", Array.from({ length: 5_001 }, (_, i) => addr(i)), []);
  check(!tooMany.ok && /addPresetAddresses/.test(tooMany.error[0] ?? ""), "one message saves at most 5,000 addresses", tooMany.error);
  const saved = await u.savePreset("Whole city", all.slice(0, 5_000), []);
  check(saved.ok, "a saved audience starts with its first chunk", saved.error);
  const pid = saved.presetId[0];
  let st = await u.addPresetAddresses(pid, 5_000n, all.slice(5_000, 10_000));
  check(st.ok && st.stored === 10_000n, "a chunk is appended to the saved audience", st);
  st = await u.addPresetAddresses(pid, 5_000n, all.slice(5_000, 10_000));
  check(st.ok && st.stored === 10_000n, "a retried chunk is not stored twice", st);
  st = await u.addPresetAddresses(pid, 11_000n, all.slice(11_000));
  check(!st.ok && st.stored === 10_000n, "addresses are added in order", st.error);
  st = await u.addPresetAddresses(pid, 10_000n, all.slice(10_000));
  check(st.ok && st.stored === BigInt(N), "the whole 12,000-address list is saved", st);
  const listed = (await u.listPresets()).find((p) => p.id === pid);
  check(listed && listed.recipientCount === BigInt(N), "the preset reports all 12,000 addresses", listed?.recipientCount);
  const stranger = await env.as(ident(182)).addPresetAddresses(pid, 0n, []);
  check(!stranger.ok, "another identity cannot add to the preset", stranger);

  // Read back page by page, in order; a page never exceeds 2,000.
  const big = await u.getPresetAddressesPage(pid, 0n, 99_999n);
  check(big.addresses.length === 2_000 && big.total === BigInt(N), "a page holds at most 2,000 addresses", big.addresses.length);
  const back = await readAll((o, l) => u.getPresetAddressesPage(pid, o, l));
  check(back.out.length === N && back.out[0].address_line1 === all[0].address_line1 && back.out[N - 1].address_line1 === all[N - 1].address_line1, "the saved audience reads back whole and in order", back.out.length);
  const foreign = await env.as(ident(182)).getPresetAddressesPage(pid, 0n, 10n);
  check(foreign.total === 0n && foreign.addresses.length === 0, "another identity reads nothing of the preset", foreign);

  // Replaced: updatePreset takes the first chunk, the rest is appended.
  const upd = await u.updatePreset(pid, "Whole city (trimmed)", all.slice(0, 5_000));
  st = await u.addPresetAddresses(pid, 5_000n, all.slice(5_000, 8_000));
  const after = (await u.listPresets()).find((p) => p.id === pid);
  check(upd.ok && st.ok && after.recipientCount === 8_000n && after.name === "Whole city (trimmed)", "an update replaces the list, then grows it in chunks", { upd: upd.error, count: after?.recipientCount });

  // A campaign of 12,000 reads back page by page; the CSV export pages too.
  const created = await u.createCampaign(campaignInput(0, { recipients: all.slice(0, 5_000), recipientCount: BigInt(N) }));
  const cid = created.campaignId[0];
  await u.addCampaignRecipients(cid, 5_000n, all.slice(5_000, 10_000));
  await u.addCampaignRecipients(cid, 10_000n, all.slice(10_000));
  const rec = await readAll((o, l) => u.getCampaignRecipientsPage(cid, o, l));
  check(rec.out.length === N && rec.total === N && rec.out[N - 1].address_line1 === all[N - 1].address_line1, "a 12,000-recipient campaign reads back whole, page by page", rec.out.length);
  const csv = [];
  for (let o = 0; ; o += 2_000) {
    const page = (await u.exportCampaignRecipientsPage(cid, BigInt(o), 2_000n))[0];
    if (page.csv) csv.push(page.csv);
    if (o + 2_000 >= Number(page.total)) break;
  }
  const lines = csv.join("\n").split("\n");
  check(lines.length === N + 1 && lines[0].startsWith("name,") && lines.filter((l) => l.startsWith("name,")).length === 1 && lines[N].includes(all[N - 1].address_line1), "the paged CSV export has one header and every recipient", { lines: lines.length, last: lines[N] });
  const whole = (await u.exportCampaignRecipients(cid))[0] ?? "";
  check(csv.join("\n") === whole, "pages joined equal the one-shot export", { paged: csv.join("\n").length, whole: whole.length });
  let denied = false;
  try { await env.as(ident(182)).getCampaignRecipientsPage(cid, 0n, 10n); } catch { denied = true; }
  check(denied, "another identity cannot read the campaign's recipients");
};

// ─── Regressions from the price and functionality audit ────────────────────────
sections.auditFixes = async function auditFixes() {
  const env = await setup({ sandboxCheckout: false });
  const pay = { intents: new Map() };
  const up = upstream([...fakeStripe(pay), ...fakePrintPartner({ addressListFailsOnCall: 2 })]);

  // A credit pack grants exactly the credits it advertises (its bonus once).
  const buyer = ident(191);
  const b = env.as(buyer);
  await b.ensureAccount([], []);
  const before = (await b.getMyAccount())[0].creditBalance;
  const packIntent = await call(env.pic, up, env.deferred(buyer).createPaymentIntent({ CreditPack: null }, [], [{ Growth: null }]));
  const packPaid = await call(env.pic, up, env.deferred(buyer).confirmPayment(packIntent.paymentIntentId[0]));
  const after = (await b.getMyAccount())[0].creditBalance;
  check(packPaid.ok && after - before === 1600n, "the Growth pack grants its advertised 1,600 credits, bonus included once", { before, after, error: packPaid.error });

  // EDDM is charged its USPS saturation postage on top of the print price
  // (40¢ + 26¢ = 66¢ a piece); one piece alone is lifted to 76¢ so the order
  // also covers the card fee's fixed 30¢.
  const eddm = await b.createCampaign(campaignInput(1, { product: { colorOption: [], layoutVariant: "eddm_6.5x9", productType: { Eddm: null } } }));
  check(eddm.ok && eddm.unitPriceCents[0] === 76n && eddm.totalCents[0] === 76n, "one EDDM 6.5 × 9 piece costs 76¢: the 66¢ rate lifted to cover the card fee", { error: eddm.error, unit: eddm.unitPriceCents });
  if (eddm.ok) await b.deleteCampaignDraft(eddm.campaignId[0]);
  const eddm2 = await b.createCampaign(campaignInput(2, { product: { colorOption: [], layoutVariant: "eddm_6.5x9", productType: { Eddm: null } } }));
  check(eddm2.ok && eddm2.unitPriceCents[0] === 66n, "two EDDM 6.5 × 9 pieces cost 66¢ each: 40¢ print + 26¢ USPS saturation postage", { error: eddm2.error, unit: eddm2.unitPriceCents });
  if (eddm2.ok) await b.deleteCampaignDraft(eddm2.campaignId[0]);

  // Declared recipient counts do not fill the canister-wide budget: six
  // identities each pricing a 1,000,000-piece draft leave room for others.
  let declared = 0;
  for (let i = 0; i < 6; i++) {
    const r = await env.as(ident(192 + i)).createCampaign(campaignInput(1, { recipientCount: 1_000_000n }));
    if (r.ok) declared++;
  }
  const other = await env.as(ident(198)).createCampaign(campaignInput(3));
  check(declared === 6 && other.ok, "drafts priced for millions of recipients they never stored do not block other customers", { declared, other: other.error });

  // One batch failing after another went out reads as a partial send.
  const owner = ident(199);
  const o = env.as(owner);
  const N = 12_000;
  const all = Array.from({ length: N }, (_, i) => addr(i));
  const created = await o.createCampaign(campaignInput(0, { recipients: all.slice(0, 5_000), recipientCount: BigInt(N) }));
  const cid = created.campaignId[0];
  await o.addCampaignRecipients(cid, 5_000n, all.slice(5_000, 10_000));
  await o.addCampaignRecipients(cid, 10_000n, all.slice(10_000));
  await o.uploadDocumentChunk(cid, 0n, 1n, "application/pdf", "art.pdf", printPdf(5));
  await env.pic.advanceTime(3_000); await env.pic.tick();
  const intent = await call(env.pic, up, env.deferred(owner).createPaymentIntent({ CampaignOrder: null }, [cid], []));
  const paid = await call(env.pic, up, env.deferred(owner).confirmPayment(intent.paymentIntentId[0]));
  const d = await call(env.pic, up, env.deferred(owner).dispatchPrintJob(cid));
  const ownerMsg = d.error[0] ?? "";
  const adminMsg = (await env.as(env.controller).getCampaign(cid))[0]?.lastError[0] ?? "";
  check(paid.ok && !d.ok && /^Partly sent to print \(1 of \d+ print jobs in production\)/.test(ownerMsg) && !/nothing has been printed/.test(ownerMsg), "a run stopped after its first job tells the owner part is already in production", ownerMsg);
  check(/^Partly in production \(1 of \d+ print jobs in production\): Address list submission failed \(batch 2/.test(adminMsg), "the admin sees which batch failed and why", adminMsg);
  const retry = await call(env.pic, up, env.deferred(env.controller).dispatchPrintJob(cid));
  const lists = up.log.filter((l) => l.url.endsWith("/addressLists") && l.method === "POST").length;
  const submits = up.log.filter((l) => l.url.endsWith("/submit"));
  check(retry.ok && retry.productionStatus[0]?.Submitted !== undefined && submits.length === lists - 1 && new Set(submits.map((l) => l.url)).size === submits.length, "the retry sends the remaining batches and submits each job exactly once", { error: retry.error, lists, submits: submits.length });

  // Tracking moves only on the scans of every job.
  const jobs = [...new Set(submits.map((l) => l.url.split("/jobs/")[1].split("/")[0]))];
  const partial = upstream(fakePrintPartner({ trackingDownFor: jobs[1], scans: ["Delivered"] }));
  const s1 = await call(env.pic, partial, env.deferred(env.controller).syncPrintTracking(cid));
  const mid = (await o.getCampaign(cid))[0].status;
  check(s1.ok && s1.newEvents === 0n && mid.InProduction !== undefined, "a job without tracking holds the campaign where it is", { status: mid, events: s1.newEvents });
  // Every job answering with a few deliveries does not settle 12,000 pieces:
  // tracking is judged per piece, and unscanned pieces count against it.
  const few = upstream(fakePrintPartner({ scans: ["Delivered"] }));
  await call(env.pic, few, env.deferred(env.controller).syncPrintTracking(cid));
  const early = (await o.getCampaign(cid))[0].status;
  check(early.Delivered === undefined, "a handful of delivery scans does not mark a 12,000-piece campaign delivered", early);
  const whole = upstream(fakePrintPartner({ scans: Array.from({ length: N / 2 }, () => "Delivered") }));
  const s2 = await call(env.pic, whole, env.deferred(env.controller).syncPrintTracking(cid));
  const end = (await o.getCampaign(cid))[0].status;
  check(s2.ok && s2.newEvents === 1n && end.Delivered !== undefined, "with every job answering, the campaign advances", { status: end, events: s2.newEvents });
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
  await u.uploadDocumentChunk(cid, 0n, 1n, "application/pdf", "art.pdf", printPdf(1));
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
  check((await as(user).getMyPayments()).some((p) => p.paymentIntentId === intent.paymentIntentId[0]), "payments made before the upgrade are found by customer (the payment index is rebuilt)");
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
