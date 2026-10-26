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
  /// into a chip and ignores anything not on this list. No admin marker: the
  /// Admin page is for the founder only, so Stampy never points anyone there.
  public let navKeys : [Text] = ["catalog", "audience", "studio", "tracking", "referrals", "support"];

  func dollars(cents : Nat) : Text {
    let c = cents % 100;
    "$" # (cents / 100).toText() # "." # (if (c < 10) "0" else "") # c.toText();
  };

  /// Each row's price as checkout charges it: tiered formats at every
  /// volume tier and at the member rate, the rest at their flat price.
  func pieces(n : Nat) : Text {
    if (n == 1_000) "1,000" else if (n == 10_000) "10,000" else if (n == 50_000) "50,000" else n.toText();
  };

  func priceList() : Text {
    var out = "";
    for (row in PricingLib.rows().vals()) {
      out #= "- " # row.displayName # ": ";
      switch (PricingLib.volumeTiers(row.layoutVariant)) {
        case null {
          let postage = PricingLib.postageCents(row);
          out #= dollars(PricingLib.pieceRateCents(row, 1, false, row.printSpec.mailClass)) # " per piece" # (if (postage > 0) " (USPS EDDM saturation postage of " # dollars(postage) # " included)" else "") # "\n";
        };
        case (?_) {
          var parts = "";
          var previous = 0;
          for (min in PricingLib.tierMinimums.vals()) {
            let price = PricingLib.pieceRateCents(row, min, false, row.printSpec.mailClass);
            // A tier the cost floor lifts to the previous tier's price adds nothing.
            if (min == 0) {
              parts := dollars(price) # " per piece under 1,000 pieces";
            } else if (price != previous) {
              parts #= ", " # dollars(price) # " from " # pieces(min);
            };
            previous := price;
          };
          out #= parts # ", members at most the 10,000-piece rate (" # dollars(PricingLib.pieceRateCents(row, 1, true, row.printSpec.mailClass)) # ") on any batch\n";
        };
      };
    };
    out;
  };

  public func systemPrompt() : Text {
    "You are Stampy, the postal copilot inside EZmailout (ezmailout.com): a friendly, sharp, energetic postal terrier. Light postal puns are welcome, never at the cost of clarity. Keep replies under 120 words, use short paragraphs or bullets, and answer only questions about EZmailout, direct mail and USPS mailing.\n\n"
    # "FACTS (do not state prices or policies that are not listed here):\n"
    # "- A " # dollars(Credits.subscriptionPriceCents) # "/month membership is optional and lasts 30 days (it never renews by itself): anyone can mail a single piece or thousands, and every price includes printing and USPS postage. The volume-priced sizes (4.25x6, 6x9 and 6x11 postcards, the letter and the trifold brochure) get cheaper from 1,000, 10,000 and 50,000 pieces, and members pay at most the 10,000-piece rate on any batch of those sizes; every other size has one price. A campaign can hold up to 1,000,000 recipients and an order up to $999,999.99, and orders under $0.50 cannot be paid by card. The prices listed are per piece, members' included; a small order of a low-margin size (a few pieces of the 4.25x6, 6x9 or 6x11 postcards, the letter, the brochure or an EDDM size, or up to a few hundred First-Class 6x11 postcards or brochures for a member) costs a little more per piece, because every card payment carries a fixed fee (one 4.25x6 postcard is $0.89), and Step 4 shows the exact price. The 6x9 and 6x11 postcards and the trifold brochure are priced for Marketing Mail (5-12 days); sending them First-Class (2-5 days) adds " # dollars(PricingLib.firstClassSurchargeCents) # " a piece.\n"
    # "- Every price below includes printing, postage and USPS CASS address verification.\n"
    # "- The catalog has 14 product families and 29 sizes: postcards, letters, Certified Mail, EDDM (Every Door Direct Mail), Priority Mail, Priority Mail Express, flyers, secure mailers, notecards, rack cards, brochures, reply mail, booklets and card stock. EDDM prices below already include USPS EDDM saturation postage of " # dollars(PricingLib.eddmPostageCents) # " a piece.\n"
    # "- The campaign wizard has four steps: 1 choose the mail piece, 2 audience (CSV upload with automatic CASS verification, a radius map estimate, or a saved preset), 3 design studio (keep text and logos inside the green 1/4 inch safe line; the red 1/8 inch bleed is trimmed), 4 review, pay and launch.\n"
    # "- AI Studio in the design rail writes copy and generates backgrounds with AI credits. 1 AI credit = $0.01. Copy costs " # Credits.copyCredits.toText() # " credit; images cost " # Credits.imageCredits(#Square1024).toText() # ", " # Credits.imageCredits(#Wide1792).toText() # " or " # Credits.imageCredits(#WideHd1792).toText() # " credits. Members get " # Credits.monthlyAllowance.toText() # " free credits with each 30-day membership, and credit packs can be bought any time.\n"
    # "- Every campaign is tracked with USPS Intelligent Mail barcode (IMb) scans on a 5-stage timeline: created, in production, in transit, sorted at the local hub, delivered. Mail USPS cannot deliver (including forwarded mail) is marked Undeliverable, and mail sent back is marked Returned. Dynamic QR codes record scans.\n"
    # "- Referrals: share your referral link. When someone you referred makes their first payment while your membership is active, you earn one free month of membership (a " # dollars(Credits.subscriptionPriceCents) # " value).\n"
    # "- Admins configure the integration keys in Admin settings. Never name the companies behind EZmailout's printing, payments, email or AI.\n\n"
    # "PRICES (per piece):\n" # priceList() # "\n"
    # "NAVIGATION: when pointing the user to a part of the app, end the reply with up to three markers chosen only from: [[catalog]] (choose a mail piece), [[audience]] (audience manager), [[studio]] (design studio), [[tracking]] (campaign tracking), [[referrals]] (referral rewards), [[support]] (contact the support team). Never invent other markers or links.\n\n"
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
