/// HTTPS outcall wrapper over the IC management canister plus the canister
/// HTTP-gateway request/response types.
import IC "ic:aaaaa-aa";
import Blob "mo:core/Blob";
import Text "mo:core/Text";
import Nat64 "mo:core/Nat64";
import Error "mo:core/Error";
import Array "mo:core/Array";
import Iter "mo:core/Iter";

module {
  public type Header = { name : Text; value : Text };

  public type TransformationInput = { context : Blob; response : IC.http_request_result };
  public type TransformationOutput = IC.http_request_result;
  public type TransformFn = shared query TransformationInput -> async TransformationOutput;

  /// Canister HTTP gateway types (`http_request` / `http_request_update`).
  public type HeaderField = (Text, Text);
  public type HttpRequest = {
    method : Text;
    url : Text;
    headers : [HeaderField];
    body : Blob;
  };
  public type HttpResponse = {
    status_code : Nat16;
    headers : [HeaderField];
    body : Blob;
    upgrade : ?Bool;
  };

  public type Method = { #get; #post };

  public type Response = { status : Nat; body : Text };

  public type RequestOptions = {
    maxResponseBytes : Nat64;
    isReplicated : Bool;
    proxyUrl : ?Text;
  };

  /// Strips response headers so replicas reach consensus on the body only.
  public func transform(input : TransformationInput) : TransformationOutput {
    { status = input.response.status; body = input.response.body; headers = [] };
  };

  /// Cycles required by the management canister for an outcall of the given
  /// sizes on a 13-node subnet, with a 20% safety margin.
  public func cyclesFor(requestBytes : Nat, maxResponseBytes : Nat) : Nat {
    let nodes : Nat = 13;
    let base = (3_000_000 + 60_000 * nodes) * nodes;
    let perRequest = 400 * nodes * requestBytes;
    let perResponse = 800 * nodes * maxResponseBytes;
    ((base + perRequest + perResponse) * 12) / 10;
  };

  public func defaultOptions(proxyUrl : ?Text) : RequestOptions {
    { maxResponseBytes = 256_000; isReplicated = false; proxyUrl };
  };

  /// Performs an HTTPS outcall. Never traps: failures are reported as
  /// `{ status = 0; body = "outcall failed: ..." }`.
  public func request(
    method : Method,
    url : Text,
    headers : [Header],
    body : ?Blob,
    options : RequestOptions,
    transformFn : TransformFn,
  ) : async Response {
    let (targetUrl, allHeaders) = switch (options.proxyUrl) {
      case (?proxy) {
        if (proxy == "") { (url, headers) } else {
          (proxy, headers.concat([{ name = "x-target-url"; value = url }]));
        };
      };
      case null { (url, headers) };
    };
    let icHeaders : [IC.http_header] = allHeaders.map(
      func(h) { { name = h.name; value = h.value } }
    );
    let bodySize = switch (body) { case (?b) b.size(); case null 0 };
    let requestBytes = bodySize + targetUrl.size() + 512;
    let maxResp = options.maxResponseBytes.toNat();
    let args : IC.http_request_args = {
      url = targetUrl;
      max_response_bytes = ?options.maxResponseBytes;
      method = switch (method) { case (#get) #get; case (#post) #post };
      headers = icHeaders;
      body;
      transform = ?{ function = transformFn; context = Blob.fromArray([]) };
      is_replicated = ?options.isReplicated;
    };
    let cycles = cyclesFor(requestBytes, maxResp);
    try {
      let result = await (with cycles = cycles) IC.http_request(args);
      let text = switch (result.body.decodeUtf8()) {
        case (?t) t;
        case null "";
      };
      { status = result.status; body = text };
    } catch (e) {
      { status = 0; body = "outcall failed: " # e.message() };
    };
  };

  public func get(url : Text, headers : [Header], options : RequestOptions, transformFn : TransformFn) : async Response {
    await request(#get, url, headers, null, options, transformFn);
  };

  public func postText(url : Text, headers : [Header], body : Text, options : RequestOptions, transformFn : TransformFn) : async Response {
    await request(#post, url, headers, ?body.encodeUtf8(), options, transformFn);
  };

  public func postBlob(url : Text, headers : [Header], body : Blob, options : RequestOptions, transformFn : TransformFn) : async Response {
    await request(#post, url, headers, ?body, options, transformFn);
  };

  public func isSuccess(r : Response) : Bool {
    r.status >= 200 and r.status < 300;
  };

  /// Helpers for the HTTP gateway.
  public func textResponse(status : Nat16, contentType : Text, body : Text) : HttpResponse {
    {
      status_code = status;
      headers = [("content-type", contentType), ("access-control-allow-origin", "*")];
      body = body.encodeUtf8();
      upgrade = null;
    };
  };

  public func headerValue(req : HttpRequest, name : Text) : ?Text {
    let wanted = name.toLower();
    for ((k, v) in req.headers.vals()) {
      if (k.toLower() == wanted) { return ?v };
    };
    null;
  };

  /// Extracts a query-string parameter from a request URL.
  public func queryParam(url : Text, name : Text) : ?Text {
    let parts = url.split(#char '?').toArray();
    if (parts.size() < 2) { return null };
    for (pair in parts[1].split(#char '&')) {
      let kv = pair.split(#char '=').toArray();
      if (kv.size() >= 1 and kv[0] == name) {
        return ?(if (kv.size() >= 2) kv[1] else "");
      };
    };
    null;
  };

  /// Path portion of a request URL (without query string).
  public func path(url : Text) : Text {
    let parts = url.split(#char '?').toArray();
    if (parts.size() == 0) { "" } else { parts[0] };
  };
};
