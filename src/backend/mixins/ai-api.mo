/// OpenAI generative studio: DALL·E 3 backgrounds and GPT-4o mini copy, paid with credits.
import Common "../types/common";
import Account "../types/account";
import AccountLib "../lib/account";
import AddressLib "../lib/address";
import AdminLib "../lib/admin";
import Credits "../lib/credits";
import Http "../lib/http";
import OpenAi "../lib/openai";
import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Principal "mo:core/Principal";

mixin (
  accounts : Map.Map<Text, Account.UserAccount>,
  referralCodes : Map.Map<Text, Text>,
  creditLedger : List.List<Account.CreditLedgerEntry>,
  state : Common.Counters,
  adminKeysState : Common.AdminState,
  transformFn : Http.TransformFn,
) {
  transient let maxPromptChars : Nat = 1_000;

  private func aiAccount(caller : Principal) : Account.UserAccount {
    AccountLib.getOrCreate(accounts, referralCodes, caller.toText(), null, null);
  };

  private func clip(t : Text, max : Nat) : Text {
    let clean = AddressLib.sanitizeText(t);
    if (clean.size() <= max) clean else Text.fromArray(clean.toArray().sliceToArray(0, max));
  };

  /// Generates a background image (credits deducted first, refunded on failure).
  public shared ({ caller }) func generateAiImage(prompt : Text, size : Account.AiImageSize) : async Account.AiImageResult {
    let cost = Credits.imageCredits(size);
    let fail = func(msg : Text, balance : ?Nat) : Account.AiImageResult {
      { ok = false; error = ?msg; imageUrl = null; revisedPrompt = null; creditsCharged = 0; creditBalance = balance };
    };
    if (caller.isAnonymous()) { return fail("Sign in to use the AI Studio", null) };
    let cleanPrompt = clip(prompt, maxPromptChars);
    if (cleanPrompt == "") { return fail("Describe the image you want", null) };
    let apiKey = switch (adminKeysState.openAiKey) { case (?k) k; case null { return fail("OpenAI API key not configured (Admin → OpenAI API Key)", null) } };
    let a = aiAccount(caller);
    if (a.creditBalance < cost) { return fail("Insufficient credits: this generation costs " # debug_show(cost) # " credits", ?a.creditBalance) };
    ignore AccountLib.applyCredits(creditLedger, state, a, -cost, "ai_image", null);
    let resp = await Http.postText(OpenAi.imagesUrl, OpenAi.headers(apiKey), OpenAi.imageRequestBody(cleanPrompt, size), AdminLib.outcallOptions(adminKeysState, 64_000), transformFn);
    if (not Http.isSuccess(resp)) {
      let balance = AccountLib.applyCredits(creditLedger, state, a, cost, "ai_refund", null);
      return fail(if (resp.status == 0) resp.body else OpenAi.errorMessage(resp.body), ?balance);
    };
    switch (OpenAi.parseImage(resp.body)) {
      case null {
        let balance = AccountLib.applyCredits(creditLedger, state, a, cost, "ai_refund", null);
        fail("OpenAI returned no image", ?balance);
      };
      case (?img) {
        { ok = true; error = null; imageUrl = ?img.url; revisedPrompt = img.revisedPrompt; creditsCharged = cost; creditBalance = ?a.creditBalance };
      };
    };
  };

  /// Generates 3 headlines, benefit bullets and CTAs for a mail piece (1 credit).
  public shared ({ caller }) func generateAiCopy(input : Account.AiCopyInput) : async Account.AiCopyResult {
    let cost = Credits.copyCredits;
    let fail = func(msg : Text, balance : ?Nat) : Account.AiCopyResult {
      { ok = false; error = ?msg; headlines = []; bullets = []; ctas = []; creditsCharged = 0; creditBalance = balance };
    };
    if (caller.isAnonymous()) { return fail("Sign in to use the AI Copywriter", null) };
    let clean : Account.AiCopyInput = {
      businessName = clip(input.businessName, 120);
      industry = clip(input.industry, 120);
      offer = clip(input.offer, 240);
      callToAction = clip(input.callToAction, 160);
      tone = switch (input.tone) { case (?t) ?clip(t, 60); case null null };
    };
    if (clean.businessName == "" and clean.industry == "") { return fail("Tell us the business name or industry", null) };
    let apiKey = switch (adminKeysState.openAiKey) { case (?k) k; case null { return fail("OpenAI API key not configured (Admin → OpenAI API Key)", null) } };
    let a = aiAccount(caller);
    if (a.creditBalance < cost) { return fail("Insufficient credits", ?a.creditBalance) };
    ignore AccountLib.applyCredits(creditLedger, state, a, -cost, "ai_copy", null);
    let resp = await Http.postText(OpenAi.chatUrl, OpenAi.headers(apiKey), OpenAi.chatRequestBody(clean), AdminLib.outcallOptions(adminKeysState, 64_000), transformFn);
    if (not Http.isSuccess(resp)) {
      let balance = AccountLib.applyCredits(creditLedger, state, a, cost, "ai_refund", null);
      return fail(if (resp.status == 0) resp.body else OpenAi.errorMessage(resp.body), ?balance);
    };
    switch (OpenAi.parseCopy(resp.body)) {
      case null {
        let balance = AccountLib.applyCredits(creditLedger, state, a, cost, "ai_refund", null);
        fail("Could not parse the copy response", ?balance);
      };
      case (?copy) {
        { ok = true; error = null; headlines = copy.headlines; bullets = copy.bullets; ctas = copy.ctas; creditsCharged = cost; creditBalance = ?a.creditBalance };
      };
    };
  };
};
