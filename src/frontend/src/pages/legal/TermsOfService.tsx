import { DRAFT_TTL_DAYS } from "@/components/campaigns/DraftExpiry";
import {
  ARBITRATION_SEAT,
  GOVERNING_STATE,
  PRIVACY_EMAIL,
  SUPPORT_EMAIL,
} from "@/lib/legal";
import { Link } from "@tanstack/react-router";
import {
  LegalPage,
  type LegalSection,
  List,
  Mail,
  P,
  Strong,
  Sub,
} from "./LegalPage";

const SECTIONS: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement to these Terms",
    body: (
      <>
        <P>
          These Terms of Service (the "Terms") are a binding agreement between
          you and EZmailout ("EZmailout", "we", "us" or "our") and govern your
          use of the EZmailout website, web application, design studio, AI
          features and print and mail services (together, the "Service"). By
          signing in, placing an order or otherwise using the Service you accept
          these Terms, our{" "}
          <Link
            to="/privacy"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>{" "}
          and our{" "}
          <Link
            to="/cookies"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Cookie Policy
          </Link>
          . If you do not agree, do not use the Service.
        </P>
        <P>
          You must be at least 18 years old and able to form a binding contract
          to use the Service. If you use the Service for a business or other
          organisation, you accept these Terms on its behalf and confirm that
          you are authorised to do so; "you" then includes that organisation.
        </P>
        <P>
          <Strong>
            Section 16 contains a binding individual arbitration agreement and a
            class action waiver. Please read it carefully.
          </Strong>
        </P>
      </>
    ),
  },
  {
    id: "platform",
    title: "Nature of the platform",
    body: (
      <>
        <P>
          EZmailout is a software platform for direct mail. It lets you design
          postcards, letters, brochures and other mail pieces in a web based
          studio, build and clean recipient lists, verify addresses, and send
          finished orders by automated connection to accredited third party
          commercial printing and mailing facilities, which print, address, sort
          and hand the mail to the United States Postal Service (USPS).
        </P>
        <P>
          <Strong>
            EZmailout is an independent technology provider. It is not the USPS,
            and it is not an employee, agent, contractor, licensee or division
            of the USPS or of any government body.
          </Strong>{" "}
          USPS, Every Door Direct Mail, EDDM, First Class Mail and Marketing
          Mail are trademarks of the United States Postal Service and are used
          only to describe postal products. Mail is delivered by the USPS under
          its own rules, including the Domestic Mail Manual (DMM).
        </P>
        <P>
          The Service mails to addresses in the United States and its
          territories served by the USPS. Prices shown in the Service include
          printing and postage for the product, quantity and mail class
          described, unless the Service says otherwise.
        </P>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and Internet Identity",
    body: (
      <>
        <P>
          You sign in with Internet Identity, a passkey based sign in service of
          the Internet Computer network. Your account is identified by an
          Internet Identity principal, a pseudonymous identifier tied to the
          address you sign in from. We never see or hold your passkeys, device
          keys or recovery phrases.
        </P>
        <P>
          You are solely responsible for keeping your devices, passkeys,
          security keys and recovery phrases safe, and for everything done under
          your identity. Because we cannot access your keys,{" "}
          <Strong>
            we cannot restore access to an identity you have lost, and we cannot
            reverse actions taken with it.
          </Strong>{" "}
          Tell us promptly at <Mail to={SUPPORT_EMAIL} /> if you believe your
          identity has been compromised.
        </P>
        <P>
          The Service runs as a canister (a hosted application) on the Internet
          Computer, a public network of independently operated data centers.
          Your account data, designs and recipient lists are held in the
          canister's memory, which the network replicates across several
          machines. See the{" "}
          <Link
            to="/privacy"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>{" "}
          for how this affects your data.
        </P>
      </>
    ),
  },
  {
    id: "orders",
    title: "Orders, prices and payment",
    body: (
      <>
        <P>
          An order is formed when you launch a campaign and your payment is
          confirmed. The price of each order (per piece price, number of pieces
          and total) is shown on the review step before you pay and is fixed
          when the campaign is created. Volume pricing depends on the number of
          recipients in the order. Orders have a minimum total of $0.50.
        </P>
        <P>
          Payments are processed by our third party payment processor, which is
          certified to PCI DSS Level 1. We never receive or store your full card
          number or security code. You authorise us and our payment processor to
          charge the payment method you provide for each order, credit pack and
          membership you buy, together with any applicable taxes.
        </P>
        <Sub>Memberships and credits</Sub>
        <List
          items={[
            <>
              A membership is a 30 day pass. It does not renew automatically:
              when it ends you may buy another pass if you wish.
            </>,
            <>
              AI credits are used by AI Studio features such as the AI
              copywriter and AI backgrounds. Credits come with each 30 day
              membership or in credit packs, have no cash value, cannot be
              transferred and are not redeemable for money except where the law
              requires.
            </>,
            <>
              Referral rewards (a free month for the person who referred you)
              are earned only as described in the Service, are limited to one
              per referred customer and require a first payment of $9.00 or
              more.
            </>,
          ]}
        />
        <P>
          Unpaid drafts are removed automatically {DRAFT_TTL_DAYS} days after
          their last activity. We may correct obvious pricing errors before an
          order is sent to print; if we do, we will ask you to confirm the
          corrected price or refund you.
        </P>
      </>
    ),
  },
  {
    id: "finality",
    title: "Order finality, cancellations and refunds",
    body: (
      <>
        <P>
          Each mail piece is a custom manufactured physical good, and postage is
          committed to the carrier when an order is dispatched. For these
          reasons:
        </P>
        <List
          items={[
            <>
              <Strong>
                Once an order has been submitted to print, production has
                started or the mail has been handed to the USPS, the order is
                final and cannot be cancelled, changed or refunded,
              </Strong>{" "}
              except where we made an error in producing it or where the law
              requires otherwise.
            </>,
            <>
              Before an order is submitted to print you may ask us to cancel it
              by contacting support with your invoice number. If the order has
              not reached the printer, we will cancel it and refund the payment
              to the original card.
            </>,
            <>
              If we print an order differently from the approved proof because
              of our error or our printer's error, we will reprint it or refund
              it, at our choice. Differences that come from your own artwork,
              data or settings (for example spelling, image resolution, colours
              on screen versus on paper, or addresses you supplied) are not
              errors.
            </>,
            <>
              Requests about credit packs and memberships are considered case by
              case; credits or membership days already used are not refundable.
            </>,
          ]}
        />
        <P>
          A refund reverses what the payment granted where it still can, for
          example by removing credits bought with it or by marking an unprinted
          order as refunded so it is not printed.
        </P>
      </>
    ),
  },
  {
    id: "production",
    title: "Production times and delivery",
    body: (
      <>
        <P>
          Production and turnaround times shown in the Service (for example next
          day print dispatch) are targets, not guarantees. Printing facilities
          can be delayed by volume, equipment, supply or other events outside
          our control.
        </P>
        <P>
          Once mail is handed to the USPS, delivery times and outcomes are
          controlled by the USPS and are not guaranteed by EZmailout. Mail may
          be delayed, delivered late, returned or lost. Tracking shown in the
          Service comes from USPS scan data, which can be incomplete or delayed,
          and some products (such as Every Door Direct Mail) are not scanned
          piece by piece. We are not responsible for USPS service performance.
        </P>
      </>
    ),
  },
  {
    id: "content",
    title: "Your content and intellectual property",
    body: (
      <>
        <P>
          "Your Content" means the artwork, logos, photos, text, QR code
          destinations, recipient lists and other material you upload, type or
          generate in the Service. You keep ownership of Your Content. You grant
          EZmailout and its service providers a worldwide, non exclusive,
          royalty free licence to host, store, copy, reformat, render, transmit,
          print and mail Your Content, only as needed to provide the Service to
          you.
        </P>
        <P>
          You represent and warrant that you own or have all rights, licences,
          consents and releases needed for Your Content, including every
          trademark, logo, image, photograph, font, likeness and piece of copy
          on your mail, and that Your Content and its printing and mailing do
          not infringe or violate anyone's rights or any law.
        </P>
        <P>
          Templates, illustrations and fonts provided in the Service remain ours
          or our licensors'. You may use them only in mail pieces you produce
          through the Service. The Service, its software and its brand are
          protected by intellectual property laws; no rights are granted except
          as stated here.
        </P>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use and content restrictions",
    body: (
      <>
        <P>
          You must not use the Service to design, print, mail or link to
          (including through a QR code) any material that:
        </P>
        <List
          items={[
            "is unlawful, fraudulent, deceptive or misleading, or promotes illegal activity;",
            "is defamatory, obscene, pornographic, harassing, threatening, stalking or abusive;",
            "promotes violence, terrorism, or hatred against people based on race, ethnicity, national origin, religion, sex, gender identity, sexual orientation, age, disability or another protected characteristic;",
            "sexualises or exploits minors in any way;",
            "infringes or misappropriates any copyright, trademark, patent, trade secret, right of publicity or privacy;",
            "is counterfeit, imitates currency, checks, stamps, postal indicia or government documents, or falsely suggests it comes from or is approved by a government agency, including the USPS (39 U.S.C. 3001);",
            "is a deceptive sweepstakes, contest, lottery or prize promotion, or fails the disclosure rules of the Deceptive Mail Prevention and Enforcement Act or state law;",
            'is political or issue advertising that lacks a disclaimer (such as a "paid for by" statement) required by federal election law or state law;',
            "is a predatory, deceptive or unlawful lending or credit solicitation, or a prescreened offer of credit or insurance that does not meet the Fair Credit Reporting Act and other applicable law;",
            "is nonmailable or restricted matter under the USPS Domestic Mail Manual or federal law, including hazardous, perishable or dangerous matter;",
            "links to malware, phishing or other harmful destinations; or",
            "otherwise violates federal, state or local law, USPS rules, or the rights of others.",
          ]}
        />
        <P>
          You must also not misuse the Service itself: no attempt to break,
          overload or reverse engineer it, to get around its limits or security,
          to access other users' data, or to use automated means to create
          accounts or orders in bulk except as the Service allows.
        </P>
        <P>
          We may review, refuse, hold or stop any design or order that we
          reasonably believe breaks these Terms or the law, and we may report
          unlawful material to the authorities. Where we stop an order for this
          reason before it is printed, we may refund it at our discretion, and
          we may suspend or close the account.
        </P>
      </>
    ),
  },
  {
    id: "recipient-data",
    title: "Mailing lists, recipient data and marketing law",
    body: (
      <>
        <P>
          You are responsible for the recipient lists you upload as CSV files,
          type in, save as audiences or build for an area. You represent and
          warrant that:
        </P>
        <List
          items={[
            "every list was collected, bought or licensed lawfully, and you have the legal right to use it to send the mail you send;",
            "your mailings comply with all laws that apply to them, including the Federal Trade Commission Act, the Telemarketing Sales Rule where relevant, state consumer protection, privacy and solicitation laws, and USPS rules;",
            "you honour opt out, do not mail and suppression requests from the people on your lists, and keep your lists accurate;",
            "if your mail or QR codes lead to email, text or phone marketing, you comply with the CAN SPAM Act, the Telephone Consumer Protection Act and similar laws for those channels; and",
            "you will not upload sensitive information (such as health, financial account or government identification numbers) about recipients unless the mailing lawfully requires it.",
          ]}
        />
        <P>
          For recipient data, you are the business (or controller) that decides
          why and how it is used, and EZmailout acts as your service provider
          (or processor). We process recipient data only to provide the Service
          on your instructions: to verify and standardise addresses, print and
          mail your orders, track them and keep the records you can see in your
          account. We do not sell recipient data or use it for our own
          marketing. Address verification standardises addresses against USPS
          data through CASS certified processing and may correct or reject
          addresses; we do not guarantee that a list is deliverable.
        </P>
      </>
    ),
  },
  {
    id: "ai",
    title: "AI Studio and the Stampy assistant",
    body: (
      <>
        <P>
          AI Studio features (such as the AI copywriter and AI backgrounds) and
          the Stampy chat assistant send the prompts and context you give them
          to our third party AI provider to produce a response. Under that
          provider's terms for business use, the content we send is not used to
          train its models.
        </P>
        <P>
          AI output can be wrong, incomplete, similar to other people's content
          or unsuitable for your purpose. You are responsible for reviewing it,
          for having the rights to use it, and for everything you print and
          mail. Do not enter recipients' personal information or other sensitive
          data into AI prompts or chat. AI features may be limited in use,
          charged in AI credits, or changed at any time.
        </P>
      </>
    ),
  },
  {
    id: "third-parties",
    title: "Third party services",
    body: (
      <>
        <P>
          The Service relies on third parties, including our payment processor,
          our print and mail fulfilment partner and its printing facilities, the
          USPS, our AI provider, our email delivery provider, the Internet
          Computer network and Internet Identity, and OpenStreetMap map data.
          Their services are subject to their own terms and policies, and we are
          not responsible for their acts or omissions except as stated in these
          Terms.
        </P>
      </>
    ),
  },
  {
    id: "availability",
    title: "Changes to the Service and availability",
    body: (
      <>
        <P>
          We may change, add or remove features, products, prices for future
          orders and limits at any time. The Service depends on the Internet
          Computer network and on third party providers and may be interrupted,
          slowed or unavailable at times. We do not promise that it will be
          available without interruption or error. Prices already fixed on a
          created campaign are honoured as described in Section 4.
        </P>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnification",
    body: (
      <>
        <P>
          You will defend, indemnify and hold harmless EZmailout, its owners,
          officers, employees, agents and service providers from and against all
          claims, demands, regulatory actions, investigations, fines, statutory
          penalties, damages, losses, costs and expenses (including reasonable
          legal fees) arising out of or related to: (a) Your Content or any mail
          you send through the Service; (b) your recipient lists, how you
          obtained them, and any unsolicited or unlawful mailing; (c) your
          breach of these Terms or of any law, including postal, consumer
          protection, privacy, marketing and election laws; or (d) your
          infringement of anyone's rights.
        </P>
      </>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    body: (
      <>
        <P>
          <Strong>
            To the fullest extent permitted by law, the Service is provided "as
            is" and "as available", without warranties of any kind, express or
            implied, including warranties of merchantability, fitness for a
            particular purpose, title, non infringement, accuracy and
            availability.
          </Strong>{" "}
          We do not warrant that address verification, price estimates, audience
          estimates (which are simulated), tracking information or AI output are
          accurate or complete, or that any mailing will produce a particular
          response or result.
        </P>
      </>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <>
        <P>
          <Strong>
            To the fullest extent permitted by law, EZmailout will not be liable
            for any indirect, incidental, special, consequential, exemplary or
            punitive damages, or for any loss of profits, revenue, business,
            goodwill or data, arising out of or related to the Service or these
            Terms, however caused and on any theory of liability, even if we
            were told such damages were possible.
          </Strong>
        </P>
        <P>
          <Strong>
            Our total liability for all claims arising out of or related to the
            Service or these Terms is limited to the lesser of (a) US $100, or
            (b) the total service fees you paid to EZmailout in the three months
            before the event giving rise to the claim.
          </Strong>
        </P>
        <P>
          Some jurisdictions do not allow certain exclusions or limits, so some
          of them may not apply to you. Nothing in these Terms limits liability
          that cannot be limited by law, such as liability for fraud.
        </P>
      </>
    ),
  },
  {
    id: "disputes",
    title: "Binding arbitration and class action waiver",
    body: (
      <>
        <P>
          <Strong>Informal resolution first.</Strong> Before starting any claim,
          you and we agree to try to resolve the dispute informally for at least
          30 days by written notice sent to <Mail to={SUPPORT_EMAIL} /> (or,
          from us, to the email address on your account), describing the dispute
          and the relief sought.
        </P>
        <P>
          <Strong>Arbitration.</Strong> Any dispute, claim or controversy
          arising out of or relating to the Service or these Terms, including
          their formation, scope or enforceability, will be resolved by final
          and binding individual arbitration administered by the American
          Arbitration Association (AAA) under its Commercial Arbitration Rules,
          or its Consumer Arbitration Rules where they apply, before a single
          arbitrator. The arbitration will be seated in {ARBITRATION_SEAT}, and
          hearings may be held by video. Judgment on the award may be entered in
          any court with jurisdiction. The Federal Arbitration Act governs this
          agreement to arbitrate.
        </P>
        <P>
          <Strong>Class action waiver.</Strong> You and EZmailout may bring
          claims only in an individual capacity, not as a plaintiff or class
          member in any class, collective, consolidated or representative
          proceeding. The arbitrator may not consolidate claims or award relief
          to anyone other than the individual party. If this waiver is found
          unenforceable for a claim, that claim must be heard in court and not
          in arbitration.{" "}
          <Strong>You and we waive any right to a jury trial.</Strong>
        </P>
        <P>
          <Strong>Exceptions.</Strong> Either party may bring an individual
          claim in small claims court, and either party may seek an injunction
          in court to stop infringement or misuse of intellectual property.
        </P>
        <P>
          <Strong>Opting out.</Strong> You may opt out of this arbitration
          agreement by emailing <Mail to={SUPPORT_EMAIL} /> within 30 days of
          first accepting these Terms, with your name, account ID and a clear
          statement that you opt out.
        </P>
        <P>
          <Strong>Governing law.</Strong> These Terms are governed by the laws
          of the State of {GOVERNING_STATE} and applicable federal law, without
          regard to conflict of law rules. Subject to the arbitration agreement,
          the state and federal courts located in Essex County,{" "}
          {GOVERNING_STATE} have exclusive jurisdiction, and you and we consent
          to their personal jurisdiction.
        </P>
      </>
    ),
  },
  {
    id: "termination",
    title: "Suspension and termination",
    body: (
      <>
        <P>
          You may stop using the Service at any time. We may suspend or end your
          access if you break these Terms, if required by law, or to protect the
          Service, other users or third parties. Orders already submitted to
          print are completed or handled as described in Section 5. Sections
          that by their nature should survive (including ownership, warranties,
          indemnification, disclaimers, limitation of liability and dispute
          resolution) survive termination.
        </P>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    body: (
      <>
        <P>
          We may update these Terms from time to time. We will post the new
          version here with a new "last updated" date, and for material changes
          we will give reasonable notice in the Service. Changes apply from the
          date shown and do not affect orders already paid. Continuing to use
          the Service after a change means you accept the updated Terms.
        </P>
      </>
    ),
  },
  {
    id: "general",
    title: "General",
    body: (
      <>
        <P>
          These Terms, together with the Privacy Policy and Cookie Policy, are
          the entire agreement between you and EZmailout about the Service. If
          any part is found unenforceable, the rest remains in effect. Our
          failure to enforce a provision is not a waiver. You may not assign
          these Terms without our consent; we may assign them in connection with
          a merger, acquisition or sale of assets. Neither party is liable for
          delays caused by events beyond its reasonable control, including
          postal disruptions, natural disasters, network outages and acts of
          government.
        </P>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <>
        <P>
          Questions about these Terms: <Mail to={SUPPORT_EMAIL} />, or the
          Contact support form in the Stampy assistant. Privacy questions:{" "}
          <Mail to={PRIVACY_EMAIL} />.
        </P>
      </>
    ),
  },
];

export function TermsOfService() {
  return (
    <LegalPage
      slug="terms"
      title="Terms of Service"
      summary={
        <p>
          The rules for using EZmailout to design, print and mail. In short: you
          own your designs and lists and are responsible for them and for
          following postal and marketing law; orders are final once they go to
          print; delivery is in the hands of the USPS; and disputes go to
          individual arbitration under {GOVERNING_STATE} law.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
