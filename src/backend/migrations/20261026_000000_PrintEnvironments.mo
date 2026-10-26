/// Adds `printEnvironments`: the print environment (Production or Staging)
/// each campaign's document, address lists and jobs were created in, fixed
/// by its first dispatch. Tracking and any retried batch then use the same
/// environment even if the admin switches it later (a Staging job id looked
/// up on Production answered 404, or another campaign's job). It starts
/// empty: a campaign dispatched before this upgrade keeps using the admin's
/// current setting, as it did. Every other stable variable is carried over
/// unchanged.
import Map "mo:core/Map";

module {
  type FulfilmentEnvironment = { #Production; #Staging };

  public func migration(_ : {}) : { printEnvironments : Map.Map<Text, FulfilmentEnvironment> } {
    { printEnvironments = Map.empty<Text, FulfilmentEnvironment>() };
  };
};
