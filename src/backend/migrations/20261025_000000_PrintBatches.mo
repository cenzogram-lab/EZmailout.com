/// Adds `printBatches`: the print jobs of a campaign whose address list is
/// too large for one 2 MB outcall, so campaigns are no longer capped at
/// 5,000 recipients. It starts empty: every campaign dispatched before this
/// upgrade has a single job, held in its record's `printAddressListId` /
/// `printJobId`, and dispatch plans the batches of any other campaign when it
/// first runs. Every other stable variable is carried over unchanged.
import Map "mo:core/Map";

module {
  type PrintBatch = {
    first : Nat;
    count : Nat;
    addressListId : ?Text;
    jobId : ?Text;
    submitted : Bool;
  };

  public func migration(_ : {}) : { printBatches : Map.Map<Text, [PrintBatch]> } {
    { printBatches = Map.empty<Text, [PrintBatch]>() };
  };
};
