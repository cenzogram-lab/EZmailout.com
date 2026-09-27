/// Secret comparison. Pure (no system imports), so it runs in the
/// interpreter's tests.
import Blob "mo:core/Blob";
import Nat8 "mo:core/Nat8";
import Text "mo:core/Text";

module {
  /// Whether `given` equals `expected`, byte for byte, in time that depends
  /// only on the length of `expected`: every byte is compared and the
  /// differences are OR-ed together, with no early exit on the first
  /// mismatch, so response timing reveals nothing about how much matched.
  public func equal(given : Text, expected : Text) : Bool {
    let a = given.encodeUtf8().toArray();
    let b = expected.encodeUtf8().toArray();
    var diff : Nat8 = if (a.size() == b.size()) 0 else 1;
    var i = 0;
    while (i < b.size()) {
      let x : Nat8 = if (i < a.size()) a[i] else 0;
      diff |= x ^ b[i];
      i += 1;
    };
    diff == 0;
  };
};
