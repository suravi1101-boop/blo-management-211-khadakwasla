import HonorariumDataLib "../lib/honorarium-data";
import Map "mo:core/Map";
import HonorariumTypes "../types/honorarium";

mixin (
  honorariumConfigs : Map.Map<Text, HonorariumTypes.HonorariumConfig>,
  quarterlyPayments : Map.Map<Text, Map.Map<Text, HonorariumTypes.QuarterlyPayment>>,
  honorariumDataVersions : Map.Map<Text, Nat>,
) {
  // Internal helper — bump the data version for a constituency
  func bumpHonorariumVersion(constituencyId : Text) {
    let current = switch (honorariumDataVersions.get(constituencyId)) {
      case null { 0 };
      case (?v) { v };
    };
    honorariumDataVersions.add(constituencyId, current + 1);
  };

  public shared func getConstituencyHonorariumConfig(constituencyId : Text) : async ?HonorariumTypes.HonorariumConfig {
    HonorariumDataLib.getHonorariumConfig(honorariumConfigs, constituencyId);
  };

  public shared func saveConstituencyHonorariumConfig(constituencyId : Text, config : HonorariumTypes.HonorariumConfig) : async Bool {
    let result = HonorariumDataLib.saveHonorariumConfig(honorariumConfigs, constituencyId, config);
    bumpHonorariumVersion(constituencyId);
    result;
  };

  public shared func getAllQuarterlyPayments(constituencyId : Text) : async [HonorariumTypes.QuarterlyPayment] {
    HonorariumDataLib.getQuarterlyPayments(quarterlyPayments, constituencyId);
  };

  public shared func saveQuarterlyPaymentRecord(constituencyId : Text, payment : HonorariumTypes.QuarterlyPayment) : async Bool {
    let result = HonorariumDataLib.saveQuarterlyPayment(quarterlyPayments, constituencyId, payment);
    bumpHonorariumVersion(constituencyId);
    result;
  };

  public shared func bulkSaveQuarterlyPaymentRecords(constituencyId : Text, payments : [HonorariumTypes.QuarterlyPayment]) : async Bool {
    let result = HonorariumDataLib.bulkSaveQuarterlyPayments(quarterlyPayments, constituencyId, payments);
    bumpHonorariumVersion(constituencyId);
    result;
  };

  // Fresh update-call variants — bypass IC HTTP query cache for cross-device sync
  public shared func getConstituencyHonorariumConfigFresh(constituencyId : Text) : async ?HonorariumTypes.HonorariumConfig {
    HonorariumDataLib.getHonorariumConfig(honorariumConfigs, constituencyId);
  };

  public shared func getAllQuarterlyPaymentsFresh(constituencyId : Text) : async [HonorariumTypes.QuarterlyPayment] {
    HonorariumDataLib.getQuarterlyPayments(quarterlyPayments, constituencyId);
  };
};
