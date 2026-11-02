/// Rate limits (src/backend/lib/limits.mo), run in the interpreter:
///   moc -r --implicit-package=core --package core <motoko-core>/src test/limits.test.mo
import Limits "../src/backend/lib/limits";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Debug "mo:core/Debug";

func expect(what : Text, ok : Bool) { if (not ok) Runtime.trap("FAILED: " # what) };

let s : Int = 1_000_000_000;
let hour : Int = 3_600 * s;

// A per-caller budget of 3 an hour, 5 s apart, beside a canister-wide 4.
let w = Map.empty<Text, Limits.Window>();
let mine = func(who : Text) : [Limits.Budget] = [{ key = who; limit = 3; minGapNs = 5 * s }, { key = "*"; limit = 4; minGapNs = 0 }];

expect("first call", Limits.admit(w, mine("a"), 0, hour) == #ok);
expect("too soon", Limits.admit(w, mine("a"), 2 * s, hour) == #wait(4));
expect("after the gap", Limits.admit(w, mine("a"), 6 * s, hour) == #ok);
expect("third", Limits.admit(w, mine("a"), 12 * s, hour) == #ok);
expect("fourth is over the caller's 3", Limits.admit(w, mine("a"), 18 * s, hour) == #full);
// The refused call charged nothing: the canister-wide budget still has 1.
expect("another caller gets the last shared slot", Limits.admit(w, mine("b"), 20 * s, hour) == #ok);
expect("the shared budget is now used up", Limits.admit(w, mine("c"), 21 * s, hour) == #full);
// A caller over the shared cap is not charged either.
expect("a refused caller was not charged", not w.containsKey("c"));
// A new window starts once the hour has passed.
expect("next hour", Limits.admit(w, mine("a"), hour + 30 * s, hour) == #ok);

// check() only reads.
let w2 = Map.empty<Text, Limits.Window>();
Limits.commit(w2, "x", 0, hour);
expect("check reads", Limits.check(w2.get("x"), 10 * s, hour, 1, 0) == #full);
expect("check unknown key", Limits.check(w2.get("y"), 10 * s, hour, 1, 0) == #ok);

// sweep() drops finished windows only.
Limits.commit(w2, "y", hour, hour);
Limits.sweep(w2, hour + hour / 2, hour);
expect("an old key is swept", not w2.containsKey("x"));
expect("a live key stays", w2.containsKey("y"));

// clip() caps text by characters.
expect("clip", Limits.clip("abcdef", 3) == "abc" and Limits.clip("ab", 3) == "ab");

Debug.print("limits: all checks passed");
