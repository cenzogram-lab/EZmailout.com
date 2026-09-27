/// Rate windows, per-key log caps and staged-file sizes. Pure (time is passed
/// in, no system imports), so the interpreter's tests run exactly this code.
import Blob "mo:core/Blob";
import List "mo:core/List";
import Map "mo:core/Map";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Text "mo:core/Text";

module {
  /// One caller's (or the canister's) usage in the current window.
  public type Window = { var windowStart : Int; var count : Nat; var lastCall : Int };

  public type Check = {
    #ok;
    /// Too soon after this key's previous call: seconds left to wait.
    #wait : Nat;
    /// The window's count is used up.
    #full;
  };

  /// Whether one more call fits. Reads only: `commit` records it, so several
  /// windows can all be checked before any of them is charged.
  public func check(w : ?Window, now : Int, windowNs : Int, limit : Nat, minGapNs : Int) : Check {
    switch (w) {
      case null #ok;
      case (?u) {
        if (minGapNs > 0 and now - u.lastCall < minGapNs) {
          return #wait(Int.abs(minGapNs - (now - u.lastCall)) / 1_000_000_000 + 1);
        };
        if (now - u.windowStart <= windowNs and u.count >= limit) { return #full };
        #ok;
      };
    };
  };

  /// Records one call for `key`, starting a fresh window when the old one ended.
  public func commit(windows : Map.Map<Text, Window>, key : Text, now : Int, windowNs : Int) {
    switch (windows.get(key)) {
      case (?u) {
        if (now - u.windowStart > windowNs) { u.windowStart := now; u.count := 0 };
        u.count += 1;
        u.lastCall := now;
      };
      case null { windows.add(key, { var windowStart = now; var count = 1; var lastCall = now }) };
    };
  };

  /// Counts `log` entries per key. Used to rebuild a transient count after an
  /// upgrade, so the counts never disagree with the stable log.
  public func countByKey<T>(log : List.List<T>, keyOf : T -> Text) : Map.Map<Text, Nat> {
    let counts = Map.empty<Text, Nat>();
    for (e in log.values()) {
      let k = keyOf(e);
      counts.add(k, (switch (counts.get(k)) { case (?n) n; case null 0 }) + 1);
    };
    counts;
  };

  /// Appends `entry` and keeps at most `maxPerKey` entries for its key,
  /// dropping that key's oldest first (FIFO). The log is rewritten only once
  /// the key is `batch` entries over, so a busy key costs one rewrite per
  /// `batch` appends instead of one per append.
  public func appendCapped<T>(
    log : List.List<T>,
    counts : Map.Map<Text, Nat>,
    entry : T,
    keyOf : T -> Text,
    maxPerKey : Nat,
    batch : Nat,
  ) {
    let key = keyOf(entry);
    log.add(entry);
    let held = (switch (counts.get(key)) { case (?n) n; case null 0 }) + 1;
    if (held <= maxPerKey + batch) {
      counts.add(key, held);
      return;
    };
    let excess = Int.abs((held : Int) - (maxPerKey : Int));
    var dropped = 0;
    log.retain(func(e : T) : Bool {
      if (dropped < excess and keyOf(e) == key) { dropped += 1; false } else { true };
    });
    counts.add(key, Int.abs((held : Int) - (dropped : Int)));
  };

  /// Size of a staged file once `incoming` bytes land at `index` (a chunk
  /// already at that index is replaced, not added to).
  public func stagedBytes(chunks : [Blob], index : Nat, incoming : Nat) : Nat {
    var total = incoming;
    for (i in chunks.keys()) { if (i != index) { total += chunks[i].size() } };
    total;
  };

  /// `t` cut to at most `max` characters.
  public func clip(t : Text, max : Nat) : Text {
    if (t.size() <= max) t else Text.fromArray(t.toArray().sliceToArray(0, max));
  };
};
