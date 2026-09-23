/// Resend (resend.com) email relay for support-ticket notifications.
import Support "../types/support";
import Json "json";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Text "mo:core/Text";

module {
  public let emailsUrl : Text = "https://api.resend.com/emails";

  /// Sender. Resend only accepts it once `ezmailout.com` is verified in the
  /// Resend account; until then every send fails with a domain error, which
  /// the admin inbox shows per ticket.
  public let fromAddress : Text = "EZmailout Support <notifications@ezmailout.com>";

  /// `Idempotency-Key` makes a retried or duplicated send deliver one email.
  public func headers(apiKey : Text, idempotencyKey : Text) : [{ name : Text; value : Text }] {
    [
      { name = "Authorization"; value = "Bearer " # apiKey },
      { name = "Content-Type"; value = "application/json" },
      { name = "Idempotency-Key"; value = idempotencyKey },
    ];
  };

  func pad2(n : Int) : Text { if (n < 10) "0" # n.toText() else n.toText() };

  /// `YYYY-MM-DD HH:MM:SS UTC` for a `Time.now()` value (ns since the epoch).
  /// Civil-from-days (H. Hinnant); valid for any time after 1970.
  public func isoTimestamp(ns : Int) : Text {
    let secs = ns / 1_000_000_000;
    let days = secs / 86_400;
    let sod = secs % 86_400;
    let z = days + 719_468;
    let era = z / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if (mp < 10) mp + 3 else mp - 9;
    let y = yoe + era * 400 + (if (m <= 2) 1 else 0);
    y.toText() # "-" # pad2(m) # "-" # pad2(d) # " " # pad2(sod / 3_600) # ":" # pad2((sod % 3_600) / 60) # ":" # pad2(sod % 60) # " UTC";
  };

  func oneLine(t : Text) : Text {
    t.map(func(c : Char) : Char = if (c == '\n' or c == '\r') ' ' else c);
  };

  public func ticketSubject(t : Support.SupportTicket) : Text {
    "[New Support Ticket] " # oneLine(t.subject) # " (EZ-" # t.id # ")";
  };

  public func ticketText(t : Support.SupportTicket) : Text {
    let account = switch (t.userId) { case (?u) "signed in (" # u # ")"; case null "signed out" };
    "New support ticket EZ-" # t.id # "\n\n"
    # "Name: " # t.name # "\n"
    # "Email: " # t.email # "\n"
    # "Subject: " # t.subject # "\n"
    # "Submitted: " # isoTimestamp(t.createdAt) # "\n"
    # "Page: " # (if (t.pagePath == "") "-" else t.pagePath) # "\n"
    # "Account: " # account # "\n\n"
    # "Message:\n" # t.message # "\n\n"
    # "Reply to this email to answer " # t.name # " directly.";
  };

  /// JSON body for `POST /emails`. `reply_to` is the submitter, so a support
  /// reply goes straight back to them.
  public func ticketEmailBody(t : Support.SupportTicket, to : Text) : Text {
    "{\"from\":" # Json.str(fromAddress)
    # ",\"to\":[" # Json.str(to) # "]"
    # ",\"reply_to\":" # Json.str(t.email)
    # ",\"subject\":" # Json.str(ticketSubject(t))
    # ",\"text\":" # Json.str(ticketText(t)) # "}";
  };

  /// Readable reason from a failed call: the outcall error (status 0) or
  /// Resend's `message` field.
  public func errorMessage(status : Nat, body : Text) : Text {
    if (status == 0) { return body };
    switch (Json.getString(body, "message")) {
      case (?m) { if (m.size() > 200) "HTTP " # status.toText() else m };
      case null { "HTTP " # status.toText() };
    };
  };
};
