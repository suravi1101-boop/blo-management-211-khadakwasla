import StationDataLib "../lib/station-data";
import Map "mo:core/Map";
import CommonTypes "../types/common";

mixin (
  constituencyPollingStations : Map.Map<Text, Map.Map<Text, CommonTypes.PollingStation>>,
  stationDataVersions : Map.Map<Text, Nat>,
) {
  // Internal helper — bump the data version for a constituency
  func bumpStationVersion(constituencyId : Text) {
    let current = switch (stationDataVersions.get(constituencyId)) {
      case null { 0 };
      case (?v) { v };
    };
    stationDataVersions.add(constituencyId, current + 1);
  };

  public shared func getPollingStations(constituencyId : Text) : async [CommonTypes.PollingStation] {
    StationDataLib.getPollingStations(constituencyPollingStations, constituencyId);
  };

  public shared func savePollingStation(constituencyId : Text, station : CommonTypes.PollingStation) : async Bool {
    let result = StationDataLib.savePollingStation(constituencyPollingStations, constituencyId, station);
    bumpStationVersion(constituencyId);
    result;
  };

  public shared func updatePollingStation(constituencyId : Text, station : CommonTypes.PollingStation) : async Bool {
    let result = StationDataLib.updatePollingStation(constituencyPollingStations, constituencyId, station);
    bumpStationVersion(constituencyId);
    result;
  };

  public shared func deletePollingStation(constituencyId : Text, stationId : Text) : async Bool {
    let result = StationDataLib.deletePollingStation(constituencyPollingStations, constituencyId, stationId);
    bumpStationVersion(constituencyId);
    result;
  };

  public shared func bulkSavePollingStations(constituencyId : Text, stations : [CommonTypes.PollingStation]) : async Bool {
    let result = StationDataLib.bulkSavePollingStations(constituencyPollingStations, constituencyId, stations);
    bumpStationVersion(constituencyId);
    result;
  };

  // Fresh update-call variant — bypasses IC HTTP query cache for cross-device sync
  public shared func getPollingStationsFresh(constituencyId : Text) : async [CommonTypes.PollingStation] {
    StationDataLib.getPollingStations(constituencyPollingStations, constituencyId);
  };
};
