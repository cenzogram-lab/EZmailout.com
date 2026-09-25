/// Response rewriting for HTTPS outcall transforms. Pure (no system imports),
/// so it runs in the interpreter's tests exactly as it runs on each replica.
/// Every function here must stay a deterministic function of its inputs.
import Json "json";
import Blob "mo:core/Blob";
import Text "mo:core/Text";

module {
  /// Context for calls whose success body is only volatile ids (e.g. Resend's
  /// `{"id":"<uuid>"}`): a 2xx body is dropped; error bodies are kept.
  public let maskSuccessBody : Blob = "mask-success-body";

  let summaryPrefix : Text = "json-summary:";

  /// Context for replicated calls whose answer matters (e.g. Stripe payment
  /// verification): a 2xx body is reduced to the listed top-level members
  /// (`Json.canonicalSummary`) and an error body to its `message`, so replicas
  /// agree whatever the whitespace, member order or volatile fields (request
  /// ids, log URLs) in what they each received.
  public func jsonSummary(keys : [Text]) : Blob {
    (summaryPrefix # keys.vals().join(",")).encodeUtf8();
  };

  /// The body a replica contributes to consensus for this context.
  public func apply(context : Blob, status : Nat, body : Blob) : Blob {
    let ok = status >= 200 and status < 300;
    if (context == maskSuccessBody) { return if (ok) Blob.empty() else body };
    switch (context.decodeUtf8()) {
      case (?ctx) {
        switch (ctx.stripStart(#text summaryPrefix)) {
          case (?list) {
            let keys = list.split(#char ',').toArray();
            let raw = switch (body.decodeUtf8()) { case (?t) t; case null "" };
            let out = if (ok) { Json.canonicalSummary(raw, keys) } else {
              switch (Json.getString(raw, "message")) { case (?m) "{\"message\":" # Json.str(m) # "}"; case null "{}" };
            };
            return out.encodeUtf8();
          };
          case null {};
        };
      };
      case null {};
    };
    body;
  };
};
