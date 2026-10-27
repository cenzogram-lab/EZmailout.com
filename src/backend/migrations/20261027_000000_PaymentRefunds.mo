/// Adds `paymentRefunds`: every refund the admin has issued, per payment
/// (payment intent id → refunds, oldest first), so a payment shows what was
/// already given back and can never be refunded past what it charged. It
/// starts empty: no refund was recorded before this upgrade. Every other
/// stable variable is carried over unchanged.
import Map "mo:core/Map";

module {
  type RefundRecord = {
    refundId : Text;
    amountCents : Nat;
    reason : Text;
    status : Text;
    createdAt : Int;
    by : Text;
  };

  public func migration(_ : {}) : { paymentRefunds : Map.Map<Text, [RefundRecord]> } {
    { paymentRefunds = Map.empty<Text, [RefundRecord]>() };
  };
};
