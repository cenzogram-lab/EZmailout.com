/// Stampy support: the postal copilot relay and the support-ticket inbox.
import Common "../types/common";
import Support "../types/support";
import AddressLib "../lib/address";
import AdminLib "../lib/admin";
import Http "../lib/http";
import OpenAi "../lib/openai";
import Stampy "../lib/stampy";
import Map "mo:core/Map";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

mixin (
  supportTickets : List.List<Support.SupportTicket>,
  adminKeysState : Common.AdminState,
  transformFn : Http.TransformFn,
) {
  transient let hourNs : Int = 3_600_000_000_000;

  // Ticket intake is open to signed-out visitors, so every limit here bounds
  // what an anonymous caller can write into stable memory.
  transient let maxStoredTickets : Nat = 5_000;
  transient let ticketsPerHourSignedIn : Nat = 5;
  /// Shared by every signed-out visitor: they all arrive as one principal.
  transient let ticketsPerHourAnonymous : Nat = 20;
  transient let maxNameChars : Nat = 120;
  transient let maxEmailChars : Nat = 254;
  transient let maxSubjectChars : Nat = 160;
  transient let maxMessageChars : Nat = 4_000;

  // One copilot message is one HTTPS outcall plus an OpenAI completion.
  transient let chatMessagesPerHour : Nat = 30;
  transient let maxTurns : Nat = 8;
  transient let maxTurnChars : Nat = 1_000;
  transient let maxReplyChars : Nat = 2_000;

  /// Rolling one-hour usage per principal. Transient: it only rate-limits.
  transient let ticketUsage = Map.empty<Text, { var windowStart : Int; var count : Nat }>();
  transient let chatUsage = Map.empty<Text, { var windowStart : Int; var count : Nat }>();

  private func charge(usage : Map.Map<Text, { var windowStart : Int; var count : Nat }>, key : Text, limit : Nat) : Bool {
    let now = Time.now();
    switch (usage.get(key)) {
      case (?u) {
        if (now - u.windowStart > hourNs) { u.windowStart := now; u.count := 0 };
        if (u.count >= limit) { return false };
        u.count += 1;
        true;
      };
      case null {
        usage.add(key, { var windowStart = now; var count = 1 });
        true;
      };
    };
  };

  private func clipSupport(t : Text, max : Nat) : Text {
    let clean = AddressLib.sanitizeText(t);
    if (clean.size() <= max) clean else Text.fromArray(clean.toArray().sliceToArray(0, max));
  };

  private func looksLikeEmail(e : Text) : Bool {
    if (e.size() < 6 or e.size() > maxEmailChars or e.contains(#char ' ')) { return false };
    let parts = e.split(#char '@').toArray();
    parts.size() == 2 and parts[0].size() > 0 and parts[1].contains(#char '.') and not parts[1].startsWith(#char '.') and not parts[1].endsWith(#char '.');
  };

  // ─── Support tickets ─────────────────────────────────────────────────────

  /// Files a support ticket. Signed-out visitors may file too.
  public shared ({ caller }) func submitSupportTicket(input : Support.SupportTicketInput) : async Support.SupportTicketResult {
    let fail = func(msg : Text) : Support.SupportTicketResult { { ok = false; error = ?msg; ticketId = null } };
    let name = AddressLib.sanitizeText(input.name);
    let email = AddressLib.sanitizeText(input.email).toLower();
    let subject = AddressLib.sanitizeText(input.subject);
    let message = AddressLib.sanitizeText(input.message);
    if (name == "" or name.size() > maxNameChars) { return fail("Enter your name (up to " # maxNameChars.toText() # " characters)") };
    if (not looksLikeEmail(email)) { return fail("Enter a valid email address so we can reply") };
    if (subject == "" or subject.size() > maxSubjectChars) { return fail("Enter a subject (up to " # maxSubjectChars.toText() # " characters)") };
    if (message == "" or message.size() > maxMessageChars) { return fail("Enter a message (up to " # maxMessageChars.toText() # " characters)") };
    if (supportTickets.size() >= maxStoredTickets) { return fail("The support inbox is full right now; please try again later") };
    let anonymous = caller.isAnonymous();
    let limit = if (anonymous) ticketsPerHourAnonymous else ticketsPerHourSignedIn;
    if (not charge(ticketUsage, caller.toText(), limit)) { return fail("Too many tickets in the last hour; please try again later") };
    let id = "tkt_" # (supportTickets.size() + 1).toText();
    supportTickets.add({
      id;
      userId = if (anonymous) null else ?caller.toText();
      name;
      email;
      subject;
      message;
      pagePath = switch (input.pagePath) { case (?p) clipSupport(p, 200); case null "" };
      createdAt = Time.now();
    });
    { ok = true; error = null; ticketId = ?id };
  };

  /// Newest tickets first, at most 200. Controllers and the admin only.
  public shared query ({ caller }) func listSupportTickets() : async [Support.SupportTicket] {
    if (not AdminLib.isAdmin(adminKeysState, caller)) { Runtime.trap("Only a controller or the admin can read support tickets") };
    let out = List.empty<Support.SupportTicket>();
    for (t in supportTickets.reverseValues()) {
      if (out.size() < 200) { out.add(t) };
    };
    out.toArray();
  };

  // ─── Copilot ─────────────────────────────────────────────────────────────

  /// Answers the latest user turn through the canister's OpenAI relay.
  /// Signed-in callers only, with an hourly per-account quota charged before
  /// the outcall. The system prompt is fixed in the canister.
  public shared ({ caller }) func askStampy(turns : [Support.StampyTurn]) : async Support.StampyReply {
    let fail = func(msg : Text) : Support.StampyReply { { ok = false; error = ?msg; reply = null } };
    if (caller.isAnonymous()) { return fail("Sign in to chat with Stampy's AI") };
    let apiKey = switch (adminKeysState.openAiKey) { case (?k) k; case null { return fail("Stampy's AI answers are not configured yet") } };
    if (turns.size() == 0) { return fail("Ask Stampy a question") };
    let last = turns[turns.size() - 1];
    if (last.role != #User or AddressLib.sanitizeText(last.content) == "") { return fail("Ask Stampy a question") };
    if (not charge(chatUsage, caller.toText(), chatMessagesPerHour)) { return fail("You've reached Stampy's hourly message limit; try again later") };
    let start : Nat = if (turns.size() > maxTurns) { turns.size() - maxTurns } else { 0 };
    let recent = turns.sliceToArray(start, turns.size()).map(
      func(t : Support.StampyTurn) : Support.StampyTurn = { role = t.role; content = clipSupport(t.content, maxTurnChars) }
    );
    let resp = await Http.postText(OpenAi.chatUrl, OpenAi.headers(apiKey), Stampy.requestBody(recent), AdminLib.outcallOptions(adminKeysState, 32_000), transformFn);
    if (not Http.isSuccess(resp)) { return fail(if (resp.status == 0) resp.body else OpenAi.errorMessage(resp.body)) };
    switch (Stampy.parseReply(resp.body)) {
      case (?reply) { { ok = true; error = null; reply = ?clipSupport(reply, maxReplyChars) } };
      case null { fail("Stampy could not read the AI response") };
    };
  };
};
