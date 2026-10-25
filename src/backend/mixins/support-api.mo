/// Stampy support: the postal copilot relay and the support-ticket inbox.
import Common "../types/common";
import Support "../types/support";
import AddressLib "../lib/address";
import AdminLib "../lib/admin";
import Http "../lib/http";
import Limits "../lib/limits";
import OpenAi "../lib/openai";
import Resend "../lib/resend";
import Stampy "../lib/stampy";
import Map "mo:core/Map";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Timer "mo:core/Timer";
import Int "mo:core/Int";
import Order "mo:core/Order";

mixin (
  supportTickets : List.List<Support.SupportTicket>,
  supportEmailOutbox : Map.Map<Text, Support.EmailDelivery>,
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
  /// Every caller together, signed in or not.
  transient let ticketsPerHourGlobal : Nat = 200;
  transient let ticketsGlobalKey : Text = "*";
  transient let maxNameChars : Nat = 120;
  transient let maxEmailChars : Nat = 254;
  transient let maxSubjectChars : Nat = 160;
  transient let maxMessageChars : Nat = 2_000;

  // One copilot message is one HTTPS outcall plus an OpenAI completion.
  // Identities are free to mint, so the per-identity limit has a
  // canister-wide partner that bounds the total spend.
  transient let chatMessagesPerHour : Nat = 30;
  transient let chatMessagesPerHourGlobal : Nat = 300;
  transient let chatGlobalKey : Text = "*";
  transient let maxTurns : Nat = 8;
  transient let maxTurnChars : Nat = 1_000;
  transient let maxReplyChars : Nat = 2_000;

  // Every emailed ticket is an HTTPS outcall plus a Resend send. Signed-out
  // visitors can file tickets and Internet Identity principals are free, so
  // this is a global cap; tickets past it wait in the outbox for the next hour.
  transient let emailsPerHour : Nat = 60;
  /// A send that failed in a way that may pass (no answer, 429, 5xx) is tried
  /// again after these delays; the last attempt's failure is final.
  transient let emailRetryDelaysNs : [Int] = [60_000_000_000, 300_000_000_000, 1_800_000_000_000, 7_200_000_000_000, 21_600_000_000_000];
  /// Sends per drain. Sends run one after another, so a drain stays short and
  /// the next one (a minute later) carries on with the rest.
  transient let maxSendsPerDrain : Nat = 20;
  /// Set while a drain runs, so the minute timer and a new ticket's immediate
  /// drain never send the same entry twice.
  transient var drainRunning : Bool = false;

  /// Rolling one-hour usage per principal. Transient: it only rate-limits.
  transient let ticketUsage = Map.empty<Text, { var windowStart : Int; var count : Nat }>();
  transient let chatWindows = Map.empty<Text, Limits.Window>();
  transient let emailUsage = Map.empty<Text, { var windowStart : Int; var count : Nat }>();

  transient let emailQueued : Text = "Queued for email";
  transient let emailNotConfigured : Text = "Not emailed: Resend key or support email not configured";

  private func charge(usage : Map.Map<Text, { var windowStart : Int; var count : Nat }>, key : Text, limit : Nat) : Bool {
    let now = Time.now();
    // Identities are free, so drop windows that ended before the map grows large.
    if (usage.size() > Limits.sweepAbove) {
      for ((k, u) in usage.entries().toArray().vals()) { if (now - u.windowStart > hourNs) { usage.remove(k) } };
    };
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

  // ─── Support tickets ─────────────────────────────────────────────────────

  /// Files a support ticket. Signed-out visitors may file too.
  public shared ({ caller }) func submitSupportTicket(input : Support.SupportTicketInput) : async Support.SupportTicketResult {
    let fail = func(msg : Text) : Support.SupportTicketResult { { ok = false; error = ?msg; ticketId = null } };
    let name = AddressLib.sanitizeText(input.name);
    let email = AddressLib.sanitizeText(input.email).toLower();
    let subject = AddressLib.sanitizeText(input.subject);
    let message = AddressLib.sanitizeText(input.message);
    if (name == "" or name.size() > maxNameChars) { return fail("Enter your name (up to " # maxNameChars.toText() # " characters)") };
    if (not AdminLib.looksLikeEmail(email)) { return fail("Enter a valid email address so we can reply") };
    if (subject == "" or subject.size() > maxSubjectChars) { return fail("Enter a subject (up to " # maxSubjectChars.toText() # " characters)") };
    if (message == "" or message.size() > maxMessageChars) { return fail("Enter a message (up to " # maxMessageChars.toText() # " characters)") };
    let anonymous = caller.isAnonymous();
    let limit = if (anonymous) ticketsPerHourAnonymous else ticketsPerHourSignedIn;
    if (not charge(ticketUsage, caller.toText(), limit)) { return fail("Too many tickets in the last hour; please try again later") };
    // Identities are free to mint: the per-identity limit has a canister-wide
    // partner, so the inbox cannot be flooded in one burst.
    if (not charge(ticketUsage, ticketsGlobalKey, ticketsPerHourGlobal)) { return fail("The support inbox is busy right now; please try again in a few minutes") };
    // A full inbox makes room by dropping its oldest ticket (and that
    // ticket's email entry) rather than turning every new ticket away.
    let id = "tkt_" # nextTicketNumber().toText();
    if (supportTickets.size() >= maxStoredTickets) {
      switch (supportTickets.first()) {
        case (?oldest) {
          supportEmailOutbox.remove(oldest.id);
          supportTickets.retain(func(t : Support.SupportTicket) : Bool { t.id != oldest.id });
        };
        case null {};
      };
    };
    let ticket : Support.SupportTicket = {
      id;
      userId = if (anonymous) null else ?caller.toText();
      name;
      email;
      subject;
      message;
      pagePath = switch (input.pagePath) { case (?p) clipSupport(p, 200); case null "" };
      createdAt = Time.now();
    };
    supportTickets.add(ticket);
    // The email goes through the stable outbox, sent from a timer in its own
    // message: the caller gets their reply without waiting on Resend, nothing
    // that happens to the email can roll back the ticket stored here, and a
    // queued email survives an upgrade (the minute timer picks it up).
    if (AdminLib.canEmailSupport(adminKeysState)) {
      supportEmailOutbox.add(id, { ticketId = id; var state = #Queued; var attempts = 0; var nextAttemptAt = Time.now(); var lastStatus = emailQueued } : Support.EmailDelivery);
      ignore Timer.setTimer<system>(#seconds 0, func() : async () { ignore await* drainEmailOutbox() });
    } else {
      supportEmailOutbox.add(id, { ticketId = id; var state = #Failed; var attempts = 0; var nextAttemptAt = 0; var lastStatus = emailNotConfigured } : Support.EmailDelivery);
    };
    { ok = true; error = null; ticketId = ?id };
  };

  /// One more than the newest ticket's number (`tkt_N`). Ids stay unique
  /// once a full inbox starts dropping its oldest tickets.
  private func nextTicketNumber() : Nat {
    switch (supportTickets.last()) {
      case (?t) {
        switch (t.id.stripStart(#text "tkt_")) {
          case (?n) { switch (Nat.fromText(n)) { case (?i) { return i + 1 }; case null {} } };
          case null {};
        };
      };
      case null {};
    };
    supportTickets.size() + 1;
  };

  /// The stored ticket for an id (`tkt_N` is the N-th ticket until a full
  /// inbox drops its oldest), with a scan as a fallback.
  private func ticketById(id : Text) : ?Support.SupportTicket {
    switch (id.stripStart(#text "tkt_")) {
      case (?n) {
        switch (Nat.fromText(n)) {
          case (?i) { if (i >= 1 and i <= supportTickets.size()) { let t = supportTickets.at(Int.abs((i : Int) - 1)); if (t.id == id) { return ?t } } };
          case null {};
        };
      };
      case null {};
    };
    supportTickets.find(func(t : Support.SupportTicket) : Bool { t.id == id });
  };

  /// Sends the outbox's due emails, oldest first, at most `maxSendsPerDrain`
  /// per run and `emailsPerHour` per hour. A send held back by the hourly cap
  /// stays queued for the next hour; one that failed in a way that may pass is
  /// retried after `emailRetryDelaysNs`; Resend's `Idempotency-Key` (the
  /// ticket id) makes a retry of a send that did go through deliver nothing
  /// new. Returns how many were sent. Called by the minute timer in `main.mo`
  /// and right after a ticket is filed.
  private func drainEmailOutbox() : async* Nat {
    if (drainRunning) { return 0 };
    let now = Time.now();
    let due = supportEmailOutbox.values().filter(func(e : Support.EmailDelivery) : Bool { e.state == #Queued and e.nextAttemptAt <= now }).toArray();
    if (due.size() == 0) { return 0 };
    let (apiKey, to) = switch (adminKeysState.resendKey, adminKeysState.supportEmailAddress) {
      case (?k, ?e) (k, e);
      case _ {
        // The keys were removed after the ticket was queued: it waits for them.
        for (e in due.vals()) { e.lastStatus := "Waiting: Resend key or support email not configured" };
        return 0;
      };
    };
    let ordered = due.sort(func(a : Support.EmailDelivery, b : Support.EmailDelivery) : Order.Order = Int.compare(a.nextAttemptAt, b.nextAttemptAt));
    drainRunning := true;
    var sent = 0;
    var tried = 0;
    try {
      label sending for (e in ordered.vals()) {
        if (tried >= maxSendsPerDrain) { break sending };
        switch (ticketById(e.ticketId)) {
          case null { e.state := #Failed; e.lastStatus := "Email failed: ticket not found" };
          case (?t) {
            if (not charge(emailUsage, "all", emailsPerHour)) {
              // Held back, not dropped: the rest wait for the next hour's budget.
              for (w in ordered.vals()) {
                if (w.state == #Queued and w.attempts == 0) { w.lastStatus := "Waiting: hourly email limit reached; it goes out when the next hour opens" };
              };
              break sending;
            };
            tried += 1;
            e.attempts += 1;
            let opts = { AdminLib.outcallOptions(adminKeysState, 4_000) with transformContext = Http.maskSuccessBody };
            let resp = await* Http.postText(Resend.emailsUrl, Resend.headers(apiKey, "ezmailout-ticket-" # t.id), Resend.ticketEmailBody(t, to), opts, transformFn);
            if (Http.isSuccess(resp)) {
              e.state := #Sent;
              e.lastStatus := "Emailed to " # to;
              sent += 1;
            } else {
              let reason = Resend.errorMessage(resp.status, resp.body);
              let retryable = resp.status == 0 or resp.status == 429 or resp.status >= 500;
              if (retryable and e.attempts <= emailRetryDelaysNs.size()) {
                e.nextAttemptAt := Time.now() + emailRetryDelaysNs[e.attempts - 1];
                e.lastStatus := "Retrying: attempt " # e.attempts.toText() # " of " # (emailRetryDelaysNs.size() + 1).toText() # " failed (" # reason # ")";
              } else {
                e.state := #Failed;
                e.lastStatus := "Email failed: " # reason;
              };
            };
          };
        };
      };
    } finally {
      drainRunning := false;
    };
    sent;
  };

  /// Newest tickets first, at most 200, with their email status. Controllers
  /// and the admin only. Reads stored state only, so it is deterministic.
  public shared query ({ caller }) func listSupportTickets() : async [Support.SupportTicketView] {
    if (not AdminLib.isAdmin(adminKeysState, caller)) { Runtime.trap("Only a controller or the admin can read support tickets") };
    let out = List.empty<Support.SupportTicketView>();
    for (t in supportTickets.reverseValues()) {
      if (out.size() < 200) {
        out.add({
          id = t.id;
          userId = t.userId;
          name = t.name;
          email = t.email;
          subject = t.subject;
          message = t.message;
          pagePath = t.pagePath;
          createdAt = t.createdAt;
          emailStatus = switch (supportEmailOutbox.get(t.id)) { case (?e) ?e.lastStatus; case null null };
        });
      };
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
    let budgets : [Limits.Budget] = [
      { key = chatGlobalKey; limit = chatMessagesPerHourGlobal; minGapNs = 0 },
      { key = caller.toText(); limit = chatMessagesPerHour; minGapNs = 0 },
    ];
    switch (Limits.admit(chatWindows, budgets, Time.now(), hourNs)) {
      case (#ok) {};
      case _ {
        // Tell the caller which limit it was.
        return fail(switch (Limits.check(chatWindows.get(caller.toText()), Time.now(), hourNs, chatMessagesPerHour, 0)) {
          case (#ok) "Stampy is answering a lot of questions right now; try again in a few minutes";
          case _ "You've reached Stampy's hourly message limit; try again later";
        });
      };
    };
    let start : Nat = if (turns.size() > maxTurns) { turns.size() - maxTurns } else { 0 };
    let recent = turns.sliceToArray(start, turns.size()).map(
      func(t : Support.StampyTurn) : Support.StampyTurn = { role = t.role; content = clipSupport(t.content, maxTurnChars) }
    );
    let resp = await* Http.postText(OpenAi.chatUrl, OpenAi.headers(apiKey), Stampy.requestBody(recent), AdminLib.outcallOptions(adminKeysState, 32_000), transformFn);
    if (not Http.isSuccess(resp)) {
      return fail(AdminLib.providerError(adminKeysState, caller, if (resp.status == 0) resp.body else OpenAi.errorMessage(resp.body), "Stampy's AI answers are unavailable right now; please try again shortly"));
    };
    switch (Stampy.parseReply(resp.body)) {
      case (?reply) { { ok = true; error = null; reply = ?clipSupport(reply, maxReplyChars) } };
      case null { fail("Stampy could not read the AI response") };
    };
  };
};
