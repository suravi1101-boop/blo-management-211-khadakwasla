import Map "mo:core/Map";
import HonorariumTypes "../types/honorarium";

module {
  public func getHonorariumConfig(
    honorariumConfigs : Map.Map<Text, HonorariumTypes.HonorariumConfig>,
    constituencyId : Text,
  ) : ?HonorariumTypes.HonorariumConfig {
    honorariumConfigs.get(constituencyId);
  };

  public func saveHonorariumConfig(
    honorariumConfigs : Map.Map<Text, HonorariumTypes.HonorariumConfig>,
    constituencyId : Text,
    config : HonorariumTypes.HonorariumConfig,
  ) : Bool {
    honorariumConfigs.add(constituencyId, config);
    true;
  };

  public func getQuarterlyPayments(
    quarterlyPayments : Map.Map<Text, Map.Map<Text, HonorariumTypes.QuarterlyPayment>>,
    constituencyId : Text,
  ) : [HonorariumTypes.QuarterlyPayment] {
    switch (quarterlyPayments.get(constituencyId)) {
      case null { [] };
      case (?inner) { inner.values().toArray() };
    };
  };

  public func saveQuarterlyPayment(
    quarterlyPayments : Map.Map<Text, Map.Map<Text, HonorariumTypes.QuarterlyPayment>>,
    constituencyId : Text,
    payment : HonorariumTypes.QuarterlyPayment,
  ) : Bool {
    let inner : Map.Map<Text, HonorariumTypes.QuarterlyPayment> = switch (quarterlyPayments.get(constituencyId)) {
      case null {
        let m = Map.empty<Text, HonorariumTypes.QuarterlyPayment>();
        quarterlyPayments.add(constituencyId, m);
        m;
      };
      case (?m) { m };
    };
    inner.add(payment.id, payment);
    true;
  };

  public func bulkSaveQuarterlyPayments(
    quarterlyPayments : Map.Map<Text, Map.Map<Text, HonorariumTypes.QuarterlyPayment>>,
    constituencyId : Text,
    payments : [HonorariumTypes.QuarterlyPayment],
  ) : Bool {
    let inner : Map.Map<Text, HonorariumTypes.QuarterlyPayment> = switch (quarterlyPayments.get(constituencyId)) {
      case null {
        let m = Map.empty<Text, HonorariumTypes.QuarterlyPayment>();
        quarterlyPayments.add(constituencyId, m);
        m;
      };
      case (?m) { m };
    };
    for (payment in payments.values()) {
      inner.add(payment.id, payment);
    };
    true;
  };
};
