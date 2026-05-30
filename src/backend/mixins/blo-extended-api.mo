import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import CommonTypes "../types/common";

mixin (
  blos : Map.Map<CommonTypes.BLOId, CommonTypes.BLO>,
  pollingStations : Map.Map<CommonTypes.PollingStationId, CommonTypes.PollingStation>,
  bloGoodPerformers : Map.Map<CommonTypes.BLOId, Bool>,
  bloDeactivationDates : Map.Map<CommonTypes.BLOId, Text>,
) {
  public shared func updateBLOStatus(constituencyId : Text, bloId : CommonTypes.BLOId, status : CommonTypes.BLOStatus) : async () {
    ignore constituencyId;
    let blo = switch (blos.get(bloId)) {
      case (null) { Runtime.trap("BLO not found") };
      case (?b) { b };
    };
    let updated = { blo with status };
    blos.add(bloId, updated);
    let station = switch (pollingStations.get(blo.pollingStationId)) {
      case (null) { Runtime.trap("Polling station not found") };
      case (?s) { s };
    };
    let hasBLO = switch (status) {
      case (#removed) { false };
      case (_) { true };
    };
    pollingStations.add(station.id, { station with hasBLO });
  };

  public shared func setBLOGoodPerformer(constituencyId : Text, bloId : CommonTypes.BLOId, isGood : Bool) : async () {
    ignore (constituencyId);
    if (not blos.containsKey(bloId)) { Runtime.trap("BLO not found") };
    bloGoodPerformers.add(bloId, isGood);
  };

  public shared func setBLODeactivationDate(constituencyId : Text, bloId : CommonTypes.BLOId, date : Text) : async () {
    ignore (constituencyId);
    if (not blos.containsKey(bloId)) { Runtime.trap("BLO not found") };
    bloDeactivationDates.add(bloId, date);
  };
};
