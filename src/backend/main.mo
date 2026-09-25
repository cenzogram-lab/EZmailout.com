/// EZmailout backend canister: direct mail campaigns fulfilled through the
/// Click2Mail REST API, AI credit ledger, Stripe billing and referral rewards.
import Types "types/campaign";
import Common "types/common";
import Account "types/account";
import Support "types/support";
import Http "lib/http";
import AdminApi "mixins/admin-api";
import CampaignApi "mixins/campaign-api";
import AudienceApi "mixins/audience-api";
import BillingApi "mixins/billing-api";
import AiApi "mixins/ai-api";
import ProductionApi "mixins/production-api";
import SupportApi "mixins/support-api";
import AuthApi "mixins/auth-api";
import Map "mo:core/Map";
import List "mo:core/List";
import Timer "mo:core/Timer";

actor {
  // Stable state — initialized by the migration chain (no inline initializers).
  let campaigns : Map.Map<Text, Types.CampaignRecord>;
  let campaignRecipients : Map.Map<Text, [Common.VerifiedAddress]>;
  let trackingEvents : List.List<Types.TrackingEvent>;
  let qrScans : List.List<Types.QrScanEvent>;
  let state : Common.Counters;
  let adminKeysState : Common.AdminState;
  let accounts : Map.Map<Text, Account.UserAccount>;
  let referralCodes : Map.Map<Text, Text>;
  let savedAudiencePresets : Map.Map<Text, [Common.VerifiedAddress]>;
  let presetMeta : Map.Map<Text, Types.AudiencePreset>;
  let creditLedger : List.List<Account.CreditLedgerEntry>;
  let payments : Map.Map<Text, Account.PaymentRecord>;
  let referralRewards : List.List<Account.ReferralReward>;
  let documentUploads : Map.Map<Text, Types.DocumentUpload>;
  let supportTickets : List.List<Support.SupportTicket>;

  /// Transform callback required by the IC for HTTPS outcalls (strips headers).
  public query func transform(input : Http.TransformationInput) : async Http.TransformationOutput {
    Http.transform(input);
  };

  // Mixin composition — all public endpoints are delegated to mixins.
  include AdminApi(adminKeysState);
  include CampaignApi(campaigns, campaignRecipients, trackingEvents, qrScans, state, adminKeysState);
  include AudienceApi(savedAudiencePresets, presetMeta, state, adminKeysState, transform);
  include BillingApi(accounts, referralCodes, creditLedger, payments, referralRewards, campaigns, trackingEvents, state, adminKeysState, transform);
  include AiApi(accounts, referralCodes, creditLedger, state, adminKeysState, transform);
  include ProductionApi(campaigns, campaignRecipients, trackingEvents, documentUploads, state, adminKeysState, transform);
  include SupportApi(supportTickets, adminKeysState, transform);
  include AuthApi();

  // Non-blocking tracking poll every 6 hours (Click2Mail IMb scans → timeline).
  // Calls the mixin's private poll directly, so the job has no public entry point.
  ignore Timer.recurringTimer<system>(#seconds 21_600, func() : async () { ignore await pollActiveCampaigns() });
};
