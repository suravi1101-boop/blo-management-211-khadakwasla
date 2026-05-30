import Map "mo:core/Map";
import CommonTypes "../types/common";

module {
  public func getBLOs(
    constituencyBLOs : Map.Map<Text, Map.Map<Text, CommonTypes.BLO>>,
    constituencyId : Text,
  ) : [CommonTypes.BLO] {
    switch (constituencyBLOs.get(constituencyId)) {
      case null { [] };
      case (?inner) { inner.values().toArray() };
    };
  };

  public func saveBLO(
    constituencyBLOs : Map.Map<Text, Map.Map<Text, CommonTypes.BLO>>,
    constituencyId : Text,
    blo : CommonTypes.BLO,
  ) : Bool {
    let inner : Map.Map<Text, CommonTypes.BLO> = switch (constituencyBLOs.get(constituencyId)) {
      case null {
        let m = Map.empty<Text, CommonTypes.BLO>();
        constituencyBLOs.add(constituencyId, m);
        m;
      };
      case (?m) { m };
    };
    inner.add(blo.id.toText(), blo);
    true;
  };

  public func updateBLO(
    constituencyBLOs : Map.Map<Text, Map.Map<Text, CommonTypes.BLO>>,
    constituencyId : Text,
    blo : CommonTypes.BLO,
  ) : Bool {
    switch (constituencyBLOs.get(constituencyId)) {
      case null { false };
      case (?inner) {
        inner.add(blo.id.toText(), blo);
        true;
      };
    };
  };

  public func deleteBLO(
    constituencyBLOs : Map.Map<Text, Map.Map<Text, CommonTypes.BLO>>,
    constituencyId : Text,
    bloId : Text,
  ) : Bool {
    switch (constituencyBLOs.get(constituencyId)) {
      case null { false };
      case (?inner) {
        inner.remove(bloId);
        true;
      };
    };
  };

  public func bulkSaveBLOs(
    constituencyBLOs : Map.Map<Text, Map.Map<Text, CommonTypes.BLO>>,
    constituencyId : Text,
    blos : [CommonTypes.BLO],
  ) : Bool {
    let inner : Map.Map<Text, CommonTypes.BLO> = switch (constituencyBLOs.get(constituencyId)) {
      case null {
        let m = Map.empty<Text, CommonTypes.BLO>();
        constituencyBLOs.add(constituencyId, m);
        m;
      };
      case (?m) { m };
    };
    for (blo in blos.values()) {
      inner.add(blo.id.toText(), blo);
    };
    true;
  };
};
