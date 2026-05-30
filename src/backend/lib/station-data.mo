import Map "mo:core/Map";
import CommonTypes "../types/common";

module {
  public func getPollingStations(
    constituencyPollingStations : Map.Map<Text, Map.Map<Text, CommonTypes.PollingStation>>,
    constituencyId : Text,
  ) : [CommonTypes.PollingStation] {
    switch (constituencyPollingStations.get(constituencyId)) {
      case null { [] };
      case (?inner) { inner.values().toArray() };
    };
  };

  public func savePollingStation(
    constituencyPollingStations : Map.Map<Text, Map.Map<Text, CommonTypes.PollingStation>>,
    constituencyId : Text,
    station : CommonTypes.PollingStation,
  ) : Bool {
    let inner : Map.Map<Text, CommonTypes.PollingStation> = switch (constituencyPollingStations.get(constituencyId)) {
      case null {
        let m = Map.empty<Text, CommonTypes.PollingStation>();
        constituencyPollingStations.add(constituencyId, m);
        m;
      };
      case (?m) { m };
    };
    inner.add(station.stationNumber, station);
    true;
  };

  public func updatePollingStation(
    constituencyPollingStations : Map.Map<Text, Map.Map<Text, CommonTypes.PollingStation>>,
    constituencyId : Text,
    station : CommonTypes.PollingStation,
  ) : Bool {
    switch (constituencyPollingStations.get(constituencyId)) {
      case null { false };
      case (?inner) {
        inner.add(station.stationNumber, station);
        true;
      };
    };
  };

  public func deletePollingStation(
    constituencyPollingStations : Map.Map<Text, Map.Map<Text, CommonTypes.PollingStation>>,
    constituencyId : Text,
    stationId : Text,
  ) : Bool {
    switch (constituencyPollingStations.get(constituencyId)) {
      case null { false };
      case (?inner) {
        inner.remove(stationId);
        true;
      };
    };
  };

  public func bulkSavePollingStations(
    constituencyPollingStations : Map.Map<Text, Map.Map<Text, CommonTypes.PollingStation>>,
    constituencyId : Text,
    stations : [CommonTypes.PollingStation],
  ) : Bool {
    let inner : Map.Map<Text, CommonTypes.PollingStation> = switch (constituencyPollingStations.get(constituencyId)) {
      case null {
        let m = Map.empty<Text, CommonTypes.PollingStation>();
        constituencyPollingStations.add(constituencyId, m);
        m;
      };
      case (?m) { m };
    };
    for (station in stations.values()) {
      inner.add(station.stationNumber, station);
    };
    true;
  };
};
