import Types "../types/common";
import Map "mo:core/Map";
import Array "mo:core/Array";

module {
  public type PollingStation = Types.PollingStation;

  /// Return all polling stations for a constituency
  public func getPollingStations(
    stationMap : Map.Map<Text, [PollingStation]>,
    constituencyId : Text,
  ) : [PollingStation] {
    switch (stationMap.get(constituencyId)) {
      case (?list) list;
      case null [];
    };
  };

  /// Add a single polling station
  public func addPollingStation(
    stationMap : Map.Map<Text, [PollingStation]>,
    station : PollingStation,
  ) {
    let existing = switch (stationMap.get(station.constituencyId)) {
      case (?list) list;
      case null [];
    };
    let filtered = existing.filter<PollingStation>(func(s : PollingStation) { s.id != station.id });
    stationMap.add(station.constituencyId, filtered.concat([station]));
  };

  /// Update an existing polling station (GPS, BLO assignment, etc.)
  public func updatePollingStation(
    stationMap : Map.Map<Text, [PollingStation]>,
    station : PollingStation,
  ) {
    addPollingStation(stationMap, station);
  };

  /// Save 500+ stations atomically (bulk Excel import)
  public func bulkSavePollingStations(
    stationMap : Map.Map<Text, [PollingStation]>,
    constituencyId : Text,
    stations : [PollingStation],
  ) : Nat {
    stationMap.add(constituencyId, stations);
    stations.size();
  };
};
