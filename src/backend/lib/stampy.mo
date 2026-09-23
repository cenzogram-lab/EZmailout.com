/// Stampy, the postal copilot: system prompt and chat-completion plumbing.
///
/// The prompt is built in the canister, never taken from the client, so
/// `askStampy` cannot be repurposed as a general-purpose LLM proxy. Prices
/// come from the live pricing ledger, so Stampy always quotes what the wizard
/// charges.
import Support "../types/support";
import PricingLib "pricing";
import Credits "credits";
import Json "json";
import Nat "mo:core/Nat";
import Text "mo:core/Text";

module {
  /// Navigation markers Stampy may end a reply with; the client turns each
  /// into a chip and ignores anything not on this list.
  public let navKeys : [Text] = ["catalog", "audience", "studio", "tracking", "referrals", "admin", "support"];

  func dollars(cents : Nat) : Text {
    let c = cents % 100;
    "$" # (cents / 100).toText() # "." # (if (c < 10) "0" else "") # c.toText();
  };

  func priceList() : Text {
    var out = "";
    for (row in PricingLib.rows().vals()) {
      out #= "- " # row.displayName # ": " # dollars(row.retailPriceCents) # " per piece\n";
    };
    out;
  };

  public func systemPrompt() : Text {
    "You are Stampy, the postal copilot inside EZmailout (ezmailout.com): a friendly, sharp, energetic postal terrier. Light postal puns are welcome, never at the cost of clarity. Keep replies under 120 words, use short paragraphs or bullets, and answer only questions about EZmailout, direct mail and USPS mailing.\n\n"
    # "FACTS (do not state prices or policies that are not listed here):\n"
    # "- A " # dollars(Credits.subscriptionPriceCents) # "/month membership gives direct access to Click2Mail wholesale print and USPS postage with no batch minimums: mail a single piece or thousands.\n"
    # "- Every price below includes printing, postage and USPS CASS address verification.\n"
    # "- The catalog has 14 product families and 29 sizes: postcards, letters, Certified Mail, EDDM (Every Door Direct Mail), Priority Mail, Priority Mail Express, flyers, secure mailers, notecards, rack cards, brochures, reply mail, booklets and card stock. EDDM prices cover printing only; saturation postage is added per carrier route.\n"
    # "- The campaign wizard has four steps: 1 choose the mail piece, 2 audience (CSV upload with automatic CASS verification, a radius map estimate, or a saved preset), 3 design studio (keep text and logos inside the green 1/4 inch safe line; the red 1/8 inch bleed is trimmed), 4 review, pay and launch.\n"
    # "- AI Studio in the design rail writes copy and generates backgrounds with AI credits. 1 AI credit = $0.01. Copy costs " # Credits.copyCredits.toText() # " credit; images cost " # Credits.imageCredits(#Square1024).toText() # ", " # Credits.imageCredits(#Wide1792).toText() # " or " # Credits.imageCredits(#WideHd1792).toText() # " credits. Members get " # Credits.monthlyAllowance.toText() # " free credits every month, and credit packs can be bought any time.\n"
    # "- Every campaign is tracked with USPS Intelligent Mail barcode (IMb) scans on a 5-stage timeline: created, in production, in transit, sorted at the local hub, delivered. Dynamic QR codes record scans.\n"
    # "- Referrals: share your referral link. When someone you referred makes their first payment while your membership is active, you earn one free month of membership (a " # dollars(Credits.subscriptionPriceCents) # " value).\n"
    # "- Admins configure the Click2Mail, Stripe, Resend and OpenAI keys in Admin settings.\n\n"
    # "PRICES (per piece):\n" # priceList() # "\n"
    # "NAVIGATION: when pointing the user to a part of the app, end the reply with up to three markers chosen only from: [[catalog]] (choose a mail piece), [[audience]] (audience manager), [[studio]] (design studio), [[tracking]] (campaign tracking), [[referrals]] (referral rewards), [[admin]] (admin settings), [[support]] (contact the support team). Never invent other markers or links.\n\n"
    # "Never ask for passwords, card numbers or keys. If you are not sure, say so and suggest [[support]].";
  };

  func role(r : Support.StampyRole) : Text {
    switch (r) { case (#User) "user"; case (#Assistant) "assistant" };
  };

  public func requestBody(turns : [Support.StampyTurn]) : Text {
    var messages = "{\"role\":\"system\",\"content\":" # Json.str(systemPrompt()) # "}";
    for (t in turns.vals()) {
      messages #= ",{\"role\":\"" # role(t.role) # "\",\"content\":" # Json.str(t.content) # "}";
    };
    "{\"model\":\"gpt-4o-mini\",\"temperature\":0.5,\"max_tokens\":350,\"messages\":[" # messages # "]}";
  };

  /// The assistant message of a chat-completion response.
  public func parseReply(body : Text) : ?Text {
    switch (Json.getString(body, "content")) {
      case (?t) { if (t == "") null else ?t };
      case null null;
    };
  };
};
