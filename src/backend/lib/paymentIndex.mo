/// Indexes over the stable `payments` map, so a customer's or a campaign's
/// payments are found without scanning every payment. Transient: `main.mo`
/// rebuilds it from `payments` on every install and upgrade, so it can never
/// disagree with the map across an upgrade. Every write to `payments` goes
/// through `add`/`remove`, and a payment that completes through
/// `markCompleted`.
import Account "../types/account";
import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Text "mo:core/Text";

module {
  public type Index = {
    /// Account id → its payment ids.
    byUser : Map.Map<Text, Set.Set<Text>>;
    /// Campaign id → the ids of the campaign-order payments made for it.
    byCampaign : Map.Map<Text, Set.Set<Text>>;
    /// Completed (succeeded or waived) payment ids, oldest confirmation first.
    completed : List.List<Text>;
    completedIds : Set.Set<Text>;
  };

  public func isCompleted(p : Account.PaymentRecord) : Bool {
    p.state == #Succeeded or p.state == #Waived;
  };

  func confirmedAt(p : Account.PaymentRecord) : Int {
    switch (p.confirmedAt) { case (?t) t; case null p.createdAt };
  };

  public func empty() : Index {
    { byUser = Map.empty(); byCampaign = Map.empty(); completed = List.empty(); completedIds = Set.empty() };
  };

  public func build(payments : Map.Map<Text, Account.PaymentRecord>) : Index {
    let idx = empty();
    let done = List.empty<Account.PaymentRecord>();
    for ((_, p) in payments.entries()) {
      link(idx, p);
      if (isCompleted(p)) { done.add(p) };
    };
    let ordered = done.toArray().sort(func(a : Account.PaymentRecord, b : Account.PaymentRecord) : Order.Order = Int.compare(confirmedAt(a), confirmedAt(b)));
    for (p in ordered.vals()) { markCompleted(idx, p.paymentIntentId) };
    idx;
  };

  func addTo(m : Map.Map<Text, Set.Set<Text>>, key : Text, id : Text) {
    switch (m.get(key)) {
      case (?s) { s.add(id) };
      case null { let s = Set.empty<Text>(); s.add(id); m.add(key, s) };
    };
  };

  func removeFrom(m : Map.Map<Text, Set.Set<Text>>, key : Text, id : Text) {
    switch (m.get(key)) {
      case (?s) { s.remove(id); if (s.isEmpty()) { m.remove(key) } };
      case null {};
    };
  };

  func campaignOf(p : Account.PaymentRecord) : ?Text {
    if (p.purpose == #CampaignOrder) p.reference else null;
  };

  func link(idx : Index, p : Account.PaymentRecord) {
    addTo(idx.byUser, p.userId, p.paymentIntentId);
    switch (campaignOf(p)) { case (?c) { addTo(idx.byCampaign, c, p.paymentIntentId) }; case null {} };
  };

  /// A payment just added to `payments`.
  public func add(idx : Index, p : Account.PaymentRecord) {
    link(idx, p);
    if (isCompleted(p)) { markCompleted(idx, p.paymentIntentId) };
  };

  /// A payment that has just completed (once; repeats are ignored).
  public func markCompleted(idx : Index, id : Text) {
    if (not idx.completedIds.contains(id)) {
      idx.completedIds.add(id);
      idx.completed.add(id);
    };
  };

  /// A payment just removed from `payments`.
  public func remove(idx : Index, p : Account.PaymentRecord) {
    removeFrom(idx.byUser, p.userId, p.paymentIntentId);
    switch (campaignOf(p)) { case (?c) { removeFrom(idx.byCampaign, c, p.paymentIntentId) }; case null {} };
    if (idx.completedIds.contains(p.paymentIntentId)) {
      idx.completedIds.remove(p.paymentIntentId);
      idx.completed.retain(func(x : Text) : Bool { x != p.paymentIntentId });
    };
  };

  func records(payments : Map.Map<Text, Account.PaymentRecord>, ids : ?Set.Set<Text>) : [Account.PaymentRecord] {
    let out = List.empty<Account.PaymentRecord>();
    switch (ids) {
      case (?s) { for (id in s.values()) { switch (payments.get(id)) { case (?p) { out.add(p) }; case null {} } } };
      case null {};
    };
    out.toArray();
  };

  /// Every payment of one account.
  public func forUser(idx : Index, payments : Map.Map<Text, Account.PaymentRecord>, userId : Text) : [Account.PaymentRecord] {
    records(payments, idx.byUser.get(userId));
  };

  /// Every campaign-order payment made for one campaign.
  public func forCampaign(idx : Index, payments : Map.Map<Text, Account.PaymentRecord>, campaignId : Text) : [Account.PaymentRecord] {
    records(payments, idx.byCampaign.get(campaignId));
  };

  public func hasPayments(idx : Index, userId : Text) : Bool {
    idx.byUser.containsKey(userId);
  };

  /// The most recently confirmed completed payments, newest first.
  public func newestCompleted(idx : Index, payments : Map.Map<Text, Account.PaymentRecord>, max : Nat) : [Account.PaymentRecord] {
    let out = List.empty<Account.PaymentRecord>();
    label scan for (id in idx.completed.reverseValues()) {
      if (out.size() >= max) break scan;
      switch (payments.get(id)) { case (?p) { out.add(p) }; case null {} };
    };
    out.toArray();
  };
};
