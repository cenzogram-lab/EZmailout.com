import { DRAFT_TTL_DAYS } from "@/components/campaigns/DraftExpiry";
import { PRIVACY_EMAIL, SUPPORT_EMAIL } from "@/lib/legal";
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

const link = "font-semibold text-primary underline-offset-4 hover:underline";

const SECTIONS: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are and what this covers",
    body: (
      <>
        <P>
          This Privacy Policy explains how EZmailout ("EZmailout", "we", "us")
          collects, uses, shares and protects personal information when you use
          the EZmailout website, web application, design studio, AI features and
          print and mail services (the "Service"). It is written to meet the
          California Consumer Privacy Act as amended by the California Privacy
          Rights Act (CCPA), the California Online Privacy Protection Act
          (CalOPPA), the EU General Data Protection Regulation (GDPR) and the UK
          GDPR.
        </P>
        <P>
          For information about our own customers (account, billing, support and
          usage data), EZmailout is the business or controller. For the
          recipient lists that customers upload to send mail, the customer is
          the business or controller and EZmailout processes that data on the
          customer's behalf as a service provider or processor (see Section 4).
        </P>
        <P>
          Contact us about privacy at <Mail to={PRIVACY_EMAIL} />.
        </P>
      </>
    ),
  },
  {
    id: "collected",
    title: "Information we collect",
    body: (
      <>
        <Sub>Information you give us</Sub>
        <List
          items={[
            <>
              <Strong>Account information:</Strong> your Internet Identity
              principal (a pseudonymous account identifier), an email address if
              you add one, your referral code and who referred you, your AI
              credit balance and membership status.
            </>,
            <>
              <Strong>Campaign and design data:</Strong> campaign names, product
              choices, your designs (text, images, logos, shapes, QR codes and
              their destinations), the print file generated from them, return
              addresses, prices and order history.
            </>,
            <>
              <Strong>Recipient data:</Strong> names and postal addresses
              (street, city, state, ZIP and ZIP+4) in lists you upload, type in
              or save as audiences.
            </>,
            <>
              <Strong>Support messages:</Strong> the name, email address,
              subject and message you send through Contact support or a
              walkthrough request, and the page you sent it from.
            </>,
            <>
              <Strong>AI prompts:</Strong> the text you type into AI Studio and
              the Stampy chat, and the campaign context sent with it.
            </>,
          ]}
        />
        <Sub>Payment information</Sub>
        <P>
          Card payments are handled directly by our third party payment
          processor, which is certified to PCI DSS Level 1 and tokenises your
          card.{" "}
          <Strong>
            EZmailout never receives or stores full card numbers or security
            codes (CVV/CVC).
          </Strong>{" "}
          We keep the processor's payment reference, the amount, currency,
          purpose, status, dates and any refunds, so we can show you your
          payment history and invoices.
        </P>
        <Sub>Information collected automatically</Sub>
        <List
          items={[
            <>
              <Strong>QR code scans:</Strong> when someone scans a tracked QR
              code on a paid campaign, we record the campaign, the recipient
              code in the link, the time and the browser's user agent string
              (shortened), so the customer can see scan counts.
            </>,
            <>
              <Strong>Referral links:</Strong> the referral code in a link you
              open, kept on your device until your account is linked.
            </>,
            <>
              <Strong>Network data:</Strong> like any website, requests to the
              Service pass through the Internet Computer network's gateways, and
              the map, payment and AI image features load content from their
              providers' servers. Those services receive your IP address and
              browser information to deliver the content. EZmailout itself does
              not store IP addresses, does not run analytics, and uses no
              advertising or cross site tracking.
            </>,
            <>
              <Strong>Storage on your device:</Strong> described in our{" "}
              <Link to="/cookies" className={link}>
                Cookie Policy
              </Link>
              .
            </>,
          ]}
        />
        <Sub>Internet Computer data</Sub>
        <P>
          The Service runs as a canister (a hosted application) on the Internet
          Computer, a public network of independently operated data centers.
          Your principal identifies your account to the canister, and the
          canister's memory holds the data described in this section. Calls you
          make to the Service are authenticated with your Internet Identity
          session and processed by the network's nodes.
        </P>
      </>
    ),
  },
  {
    id: "use",
    title: "How we use information",
    body: (
      <>
        <List
          items={[
            "to provide the Service: save your designs and drafts, build print files, verify addresses, take payment, print and mail your orders, and show tracking and QR scan counts;",
            "to run accounts, AI credits, memberships and referral rewards;",
            "to answer support requests and send messages about your account or orders;",
            "to keep the Service secure, prevent fraud and abuse (for example rate limits), and enforce our Terms;",
            "to meet legal, tax and accounting obligations; and",
            "to improve the Service in aggregate, without selling or profiling individuals.",
          ]}
        />
        <P>
          <Strong>Legal bases (GDPR and UK GDPR):</Strong> performance of our
          contract with you (providing the Service you ask for), our legitimate
          interests (security, fraud prevention, improving the Service),
          compliance with legal obligations (tax and accounting records), and
          your consent where we ask for it.
        </P>
        <P>
          <Strong>Automated decisions:</Strong> we do not make decisions that
          produce legal or similarly significant effects about you solely by
          automated means. Automated address verification only checks whether an
          address is deliverable.
        </P>
      </>
    ),
  },
  {
    id: "recipients",
    title: "Recipient data we process for customers",
    body: (
      <>
        <P>
          When a customer mails people, their names and addresses come from the
          customer's list. We process them only on the customer's instructions:
          to verify and standardise addresses, to print and mail the pieces, to
          track delivery and to keep the records the customer sees. We do not
          use recipient data for our own purposes, and we do not sell, rent or
          share it.
        </P>
        <P>
          If you received mail sent through EZmailout and want to stop it, or
          want to exercise privacy rights over your address, please contact the
          sender named on the mail piece, which controls the list. You can also
          write to <Mail to={PRIVACY_EMAIL} /> and we will pass your request to
          the customer and help them respond.
        </P>
      </>
    ),
  },
  {
    id: "sharing",
    title: "How we share information",
    body: (
      <>
        <P>
          We share personal information only with service providers that process
          it for us under contract, as needed to run the Service:
        </P>
        <List
          items={[
            <>
              <Strong>Print and mail fulfilment partner:</Strong> receives the
              print ready PDF, recipient names and addresses, your return
              address and the mail class, and uses commercial printing
              facilities to print, address, sort, apply USPS Intelligent Mail
              barcodes and hand the mail to the USPS. It also returns tracking
              scans.
            </>,
            <>
              <Strong>Address verification:</Strong> addresses are checked and
              standardised against USPS address data through CASS certified
              processing run by our fulfilment partner.
            </>,
            <>
              <Strong>United States Postal Service:</Strong> carries the mail
              and produces the scan data used for tracking.
            </>,
            <>
              <Strong>Payment processor:</Strong> processes card payments and
              refunds and screens for fraud.
            </>,
            <>
              <Strong>AI provider:</Strong> processes AI Studio and Stampy
              prompts and returns the response or image. Data is sent over
              encrypted connections (TLS), and{" "}
              <Strong>
                under the provider's business terms it is not used to train its
                AI models
              </Strong>
              ; the provider may keep it for a limited period to monitor for
              abuse.
            </>,
            <>
              <Strong>Email delivery provider:</Strong> delivers support
              messages to our team.
            </>,
            <>
              <Strong>Infrastructure:</Strong> the Internet Computer network and
              its node providers host the canister; Internet Identity provides
              sign in; OpenStreetMap serves map tiles and address search for the
              radius map.
            </>,
          ]}
        />
        <P>
          We may also disclose information when required by law or valid legal
          process, to protect the rights, safety and property of EZmailout, our
          users or others, or as part of a merger, acquisition or sale of
          assets, where the recipient must honour this policy.
        </P>
        <P>
          <Strong>
            EZmailout never sells, rents or otherwise monetises customers'
            personal information or recipient lists, and never shares them with
            data brokers or for cross context behavioural advertising.
          </Strong>{" "}
          In the last 12 months we have not sold or shared personal information
          as those terms are defined in the CCPA. A list of our current service
          providers is available on request.
        </P>
      </>
    ),
  },
  {
    id: "retention",
    title: "Data retention and storage",
    body: (
      <>
        <List
          items={[
            <>
              <Strong>Unpaid drafts:</Strong> a campaign that has not been paid
              is removed automatically, with its recipients, staged print file
              and timeline, {DRAFT_TTL_DAYS} days after its last activity, and
              may be removed sooner when the Service needs room. You can delete
              an unpaid draft yourself at any time.
            </>,
            <>
              <Strong>Paid campaigns:</Strong> kept, with their recipients,
              design preview, payment, delivery tracking and QR scan records,
              for as long as your account is open and afterwards for as long as
              tax, accounting and legal obligations require. Each campaign keeps
              its newest 500 QR scan records.
            </>,
            <>
              <Strong>Print files:</Strong> the print file is held by the
              Service only until it is handed to our fulfilment partner.
            </>,
            <>
              <Strong>Saved audiences:</Strong> kept until you delete them.
            </>,
            <>
              <Strong>Payment records:</Strong> kept for tax and accounting;
              checkouts that were never paid are closed and later removed.
            </>,
            <>
              <Strong>Support messages:</Strong> the inbox keeps the most recent
              5,000 messages; older ones are removed.
            </>,
            <>
              <Strong>Inactive accounts:</Strong> an account with no email,
              payments or activity may be removed; signing in again opens it
              afresh.
            </>,
          ]}
        />
        <P>
          <Strong>How the data is stored:</Strong> the Service's data lives in
          the canister's memory on the Internet Computer, which replicates it
          across several independently operated machines so it stays available
          and tamper resistant. Only the Service and authorised administrators
          can read it, but it is not end to end encrypted, so the operators of
          those machines could in principle access it.
        </P>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your privacy rights",
    body: (
      <>
        <P>Depending on where you live, you may have the right to:</P>
        <List
          items={[
            <>
              <Strong>Access</Strong> (right to know): ask what personal
              information we hold about you and get a copy, including in a
              portable format (you can also export a campaign's mailing list as
              CSV in the app);
            </>,
            <>
              <Strong>Correction</Strong> (rectification): ask us to correct
              inaccurate information;
            </>,
            <>
              <Strong>Deletion</Strong> (the right to be forgotten): ask us to
              delete your information, subject to the records we must keep for
              tax, accounting, fraud prevention and legal reasons, and to orders
              already printed;
            </>,
            <>
              <Strong>Restriction and objection:</Strong> ask us to limit how we
              use your information or object to processing based on our
              legitimate interests;
            </>,
            <>
              <Strong>Opt out:</Strong> of the sale or sharing of personal
              information (we do neither) and of automated decision making (we
              do not make such decisions);
            </>,
            <>
              <Strong>Withdraw consent</Strong> at any time where we rely on it;
              and
            </>,
            <>
              <Strong>Non discrimination:</Strong> we will not deny you service,
              charge you a different price or give you a different quality of
              service because you exercised your rights.
            </>,
          ]}
        />
        <Sub>How to exercise your rights</Sub>
        <P>
          Email <Mail to={PRIVACY_EMAIL} /> or use Contact support in the Stampy
          assistant. Include your account ID (shown on your Dashboard) so we can
          find your data. We verify requests by confirming control of the signed
          in account or the email address on it. You may use an authorised
          agent, who must show written permission from you. We respond within
          one month (GDPR and UK GDPR) or 45 days (CCPA), and may extend this
          where the law allows, telling you why. If we cannot meet a request, we
          will explain the reason.
        </P>
        <P>
          In the EU or UK you may also complain to your local data protection
          authority. California residents may contact the California Privacy
          Protection Agency.
        </P>
      </>
    ),
  },
  {
    id: "california",
    title: "California notices (CCPA and CalOPPA)",
    body: (
      <>
        <P>
          In the last 12 months we collected these categories of personal
          information: identifiers (account ID, email address, IP address
          received by network providers), customer records (name, postal address
          and payment references, but not card numbers), commercial information
          (orders, memberships and credits), internet activity (QR scan records
          and user agents), and other information you choose to provide in
          designs and support messages. We collect them from you, from your
          device and from our service providers, for the purposes in Section 3,
          and disclose them only to the service providers in Section 5. We do
          not collect sensitive personal information for the purpose of
          inferring characteristics.
        </P>
        <P>
          <Strong>Do Not Track and Global Privacy Control:</Strong> we do not
          track you across other websites, so browser Do Not Track signals do
          not change anything we do. We treat a Global Privacy Control signal as
          a request to opt out of sale and sharing, which we do not do in any
          case.
        </P>
      </>
    ),
  },
  {
    id: "international",
    title: "International transfers",
    body: (
      <>
        <P>
          EZmailout serves mail in the United States, and our service providers
          are based mainly in the United States. The Internet Computer's
          machines are located in several countries. When personal information
          from the EU, EEA, UK or Switzerland is transferred to countries
          without an adequacy decision, we rely on safeguards such as the
          European Commission's Standard Contractual Clauses and the UK
          addendum, and on our providers' equivalent commitments.
        </P>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <>
        <P>
          We protect information with encrypted connections (TLS), sign in by
          Internet Identity passkeys instead of passwords, access controls that
          limit each account to its own data, administrator only controls,
          masking of stored service keys, rate limits and monitoring. No system
          is perfectly secure; if a breach affects your personal information, we
          will notify you and the authorities as the law requires.
        </P>
      </>
    ),
  },
  {
    id: "children",
    title: "Children's privacy",
    body: (
      <>
        <P>
          The Service is meant for adults and businesses and is not directed to
          children. We do not knowingly collect personal information from
          children under 13 (as defined by the Children's Online Privacy
          Protection Act, COPPA) or under 16 in the EU and UK. If you believe a
          child has given us personal information, contact{" "}
          <Mail to={PRIVACY_EMAIL} /> and we will delete it.
        </P>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <>
        <P>
          We may update this policy. We will post the new version here with a
          new "last updated" date, and for material changes we will give notice
          in the Service before they take effect.
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
          Privacy requests and questions: <Mail to={PRIVACY_EMAIL} />. General
          support: <Mail to={SUPPORT_EMAIL} /> or Contact support in the Stampy
          assistant.
        </P>
      </>
    ),
  },
];

export function PrivacyPolicy() {
  return (
    <LegalPage
      slug="privacy"
      title="Privacy Policy"
      summary={
        <p>
          What EZmailout collects, why, and who helps us print and mail your
          orders. In short: we collect what we need to run your campaigns, we
          never see your card number, we never sell your data or your recipient
          lists, unpaid drafts are deleted after {DRAFT_TTL_DAYS} days, and you
          can ask for your data or its deletion at any time.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
