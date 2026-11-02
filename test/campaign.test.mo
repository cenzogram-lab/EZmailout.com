/// Campaign state machines (src/backend/lib/campaign.mo), run in the interpreter:
///   moc -r --implicit-package=core --package core <motoko-core>/src test/campaign.test.mo
import CampaignLib "../src/backend/lib/campaign";
import Inputs "../src/backend/lib/inputs";
import Types "../src/backend/types/campaign";
import Runtime "mo:core/Runtime";
import Debug "mo:core/Debug";

func expect(what : Text, ok : Bool) { if (not ok) Runtime.trap("FAILED: " # what) };

let spec : Types.PrintSpec = {
  documentClass = "Postcard 4.25 x 6"; layout = "Double Sided Postcard"; mailClass = #FirstClass;
  paperType = "White Matte with Gloss UV Finish"; productionTime = "Next Day"; color = "Full Color";
  printOption = "Printing both sides"; envelope = null;
};
let input : Types.CreateCampaignInput = {
  name = "  Elm Street bakery  "; product = { productType = #Postcard; layoutVariant = "4.25x6"; colorOption = null };
  mailClass = null; audienceType = #GeoRadius; recipients = []; recipientCount = 1000; designTemplateId = null;
  canvasState = null; qrDestinationUrl = null; returnAddress = null; sourcePresetId = null;
};
let r = CampaignLib.create("cmp_1", "owner", input, spec, 71, 40, 1000);
expect("the name is trimmed", r.name == "Elm Street bakery");
expect("the total is unit × count", r.totalAmountChargedCents == 71_000);
expect("a new campaign awaits payment", r.productionStatus == #AwaitingPayment and r.paymentStatus == #Unpaid and r.status == #Created);

// Production: payment opens dispatch; a run walks the four steps to Submitted.
expect("no run before payment", not CampaignLib.moveProduction(r, #Processing));
expect("payment", CampaignLib.moveProduction(r, #ReadyToDispatch));
expect("no delivery move before submission", not CampaignLib.advanceStatus(r, #InProduction));
for (s in [#Processing, #DocumentUploaded, #AddressListReady, #JobCreated, #Submitted].vals()) {
  expect("run step", CampaignLib.moveProduction(r, s));
};
expect("Submitted is final", not CampaignLib.moveProduction(r, #Failed) and not CampaignLib.moveProduction(r, #Processing));
expect("never back to unpaid", not CampaignLib.productionMoveAllowed(#Failed, #AwaitingPayment));
expect("a failed run may run again", CampaignLib.productionMoveAllowed(#Failed, #Processing));
expect("any step may fail", CampaignLib.productionMoveAllowed(#AddressListReady, #Failed) and CampaignLib.productionMoveAllowed(#JobCreated, #Failed));
expect("steps are not skipped back", not CampaignLib.productionMoveAllowed(#JobCreated, #DocumentUploaded));

// Delivery: forward only, an outcome never goes back to the mail stream.
expect("in production", CampaignLib.advanceStatus(r, #InProduction));
expect("in transit", CampaignLib.advanceStatus(r, #InTransit));
expect("not backwards", not CampaignLib.advanceStatus(r, #InProduction));
expect("delivered", CampaignLib.advanceStatus(r, #Delivered));
expect("a return overrides a delivery", CampaignLib.advanceStatus(r, #Returned));
expect("an outcome never goes back", not CampaignLib.advanceStatus(r, #Delivered));
expect("finished", CampaignLib.trackingFinished(r));

// Scan text: the exceptions win over "deliver", which "undeliverable" contains.
expect("undeliverable", CampaignLib.statusFromText("Undeliverable as addressed") == ?#Undeliverable);
expect("returned", CampaignLib.statusFromText("Return to sender") == ?#Returned);
expect("forwarded", CampaignLib.statusFromText("Forwarded to new address") == ?#Undeliverable);
expect("delivered", CampaignLib.statusFromText("Delivered") == ?#Delivered);
expect("local hub", CampaignLib.statusFromText("Arrived at USPS Regional Facility") == ?#SortedAtLocalHub);
expect("in transit", CampaignLib.statusFromText("Accepted at USPS Origin Facility") == ?#InTransit);
expect("unknown", CampaignLib.statusFromText("lorem ipsum") == null);
for (i in [0, 1, 2, 3, 4, 5, 6].vals()) { expect("stage round trip", CampaignLib.stageIndex(CampaignLib.stageFromIndex(i)) == i) };

// Ids are sequential.
let st = { var nextCampaignId = 7 };
expect("next id", CampaignLib.nextId(st) == "cmp_7" and CampaignLib.nextId(st) == "cmp_8");

// A stored layer's turn: none, or a finite angle within a full turn.
expect("no turn", Inputs.rotationValid(null));
expect("a turn", Inputs.rotationValid(?90.0) and Inputs.rotationValid(?-180.0) and Inputs.rotationValid(?360.0));
expect("past a full turn", not Inputs.rotationValid(?400.0) and not Inputs.rotationValid(?-361.0));
expect("not a number", not Inputs.rotationValid(?(0.0 / 0.0)));
expect("infinite", not Inputs.rotationValid(?(1.0 / 0.0)));

Debug.print("campaign: all checks passed");
