/// Adds `pendingRefundEffects`: what a refund still pending with the payment
/// processor will take back once it succeeds (refund id → effects), so a
/// refund that later fails takes nothing back and releases its held order.
/// It starts empty: refunds recorded before this upgrade applied their
/// effects when they were made. Every other stable variable is carried over
/// unchanged.
import Map "mo:core/Map";

module {
  type PendingRefundEffects = {
    paymentIntentId : Text;
    amountCents : Nat;
    revokeEffects : Bool;
    heldCampaign : ?Text;
    createdAt : Int;
  };

  public func migration(_ : {}) : { pendingRefundEffects : Map.Map<Text, PendingRefundEffects> } {
    { pendingRefundEffects = Map.empty<Text, PendingRefundEffects>() };
  };
};
