/// OpenAI request builders and response parsers (DALL·E 3 + GPT-4o mini).
import Account "../types/account";
import Json "json";
import Text "mo:core/Text";
import Array "mo:core/Array";

module {
  public let imagesUrl : Text = "https://api.openai.com/v1/images/generations";
  public let chatUrl : Text = "https://api.openai.com/v1/chat/completions";

  public func headers(apiKey : Text) : [{ name : Text; value : Text }] {
    [
      { name = "Authorization"; value = "Bearer " # apiKey },
      { name = "Content-Type"; value = "application/json" },
      { name = "Accept"; value = "application/json" },
    ];
  };

  public func sizeText(size : Account.AiImageSize) : Text {
    switch (size) { case (#Square1024) "1024x1024"; case (#Wide1792) "1024x1792"; case (#WideHd1792) "1024x1792" };
  };

  public func qualityText(size : Account.AiImageSize) : Text {
    switch (size) { case (#WideHd1792) "hd"; case _ "standard" };
  };

  public func imageRequestBody(prompt : Text, size : Account.AiImageSize) : Text {
    "{\"model\":\"dall-e-3\",\"prompt\":" # Json.str(prompt) # ",\"n\":1,\"size\":\"" # sizeText(size) # "\",\"quality\":\"" # qualityText(size) # "\",\"response_format\":\"url\"}";
  };

  public type ImageInfo = { url : Text; revisedPrompt : ?Text };

  public func parseImage(body : Text) : ?ImageInfo {
    switch (Json.getString(body, "url")) {
      case null null;
      case (?url) { ?{ url; revisedPrompt = Json.getString(body, "revised_prompt") } };
    };
  };

  public func copySystemPrompt() : Text {
    "You are a direct-mail copywriter for small businesses. Write concise, high-converting copy for a printed postcard or letter. Respond ONLY with a JSON object of the shape {\"headlines\":[3 headlines, each under 10 words],\"bullets\":[3 to 5 short benefit bullets],\"ctas\":[3 urgent calls to action under 8 words]}. No markdown.";
  };

  public func copyUserPrompt(input : Account.AiCopyInput) : Text {
    let tone = switch (input.tone) { case (?t) t; case null "confident and friendly" };
    "Business name: " # input.businessName # "\nIndustry: " # input.industry # "\nOffer: " # input.offer # "\nDesired call to action: " # input.callToAction # "\nTone: " # tone;
  };

  public func chatRequestBody(input : Account.AiCopyInput) : Text {
    "{\"model\":\"gpt-4o-mini\",\"response_format\":{\"type\":\"json_object\"},\"temperature\":0.8,\"max_tokens\":500,\"messages\":[{\"role\":\"system\",\"content\":" # Json.str(copySystemPrompt()) # "},{\"role\":\"user\",\"content\":" # Json.str(copyUserPrompt(input)) # "}]}";
  };

  public type CopyInfo = { headlines : [Text]; bullets : [Text]; ctas : [Text] };

  private func clean(items : [Text]) : [Text] {
    items.filter(func(s : Text) : Bool { s != "" });
  };

  public func parseCopy(body : Text) : ?CopyInfo {
    switch (Json.getString(body, "content")) {
      case null null;
      case (?content) {
        let headlines = clean(Json.getStringArray(content, "headlines"));
        let bullets = clean(Json.getStringArray(content, "bullets"));
        let ctas = clean(Json.getStringArray(content, "ctas"));
        if (headlines.size() == 0 and bullets.size() == 0 and ctas.size() == 0) { null } else { ?{ headlines; bullets; ctas } };
      };
    };
  };

  public func errorMessage(body : Text) : Text {
    switch (Json.getString(body, "message")) {
      case (?m) { if (m.size() > 300) { "OpenAI request failed" } else { m } };
      case null "OpenAI request failed";
    };
  };
};
