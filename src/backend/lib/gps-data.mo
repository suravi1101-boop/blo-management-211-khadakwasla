import Map "mo:core/Map";
import GPSTypes "../types/gps";
import CommonTypes "../types/common";
import BloTypes "../types/blo";
import SupervisorTypes "../types/supervisor";

module {
  // ─── Read helpers ─────────────────────────────────────────────────────────

  public func getGPSLocations(
    gpsLocations : Map.Map<Text, Map.Map<Text, GPSTypes.GPSLocation>>,
    constituencyId : Text,
  ) : [GPSTypes.GPSLocation] {
    switch (gpsLocations.get(constituencyId)) {
      case null { [] };
      case (?inner) { inner.values().toArray() };
    };
  };

  /// Returns all GPS records across every constituency (Super Admin view)
  public func getAllGPSLocations(
    gpsLocations : Map.Map<Text, Map.Map<Text, GPSTypes.GPSLocation>>,
  ) : [GPSTypes.GPSLocation] {
    var result : [GPSTypes.GPSLocation] = [];
    for ((_cid, inner) in gpsLocations.entries()) {
      result := result.concat(inner.values().toArray());
    };
    result;
  };

  // ─── Write helpers ────────────────────────────────────────────────────────

  public func saveGPSLocation(
    gpsLocations : Map.Map<Text, Map.Map<Text, GPSTypes.GPSLocation>>,
    constituencyId : Text,
    location : GPSTypes.GPSLocation,
  ) : Bool {
    let inner : Map.Map<Text, GPSTypes.GPSLocation> = switch (gpsLocations.get(constituencyId)) {
      case null {
        let m = Map.empty<Text, GPSTypes.GPSLocation>();
        gpsLocations.add(constituencyId, m);
        m;
      };
      case (?m) { m };
    };
    inner.add(location.pollingStationId, location);
    true;
  };

  public func bulkSaveGPSLocations(
    gpsLocations : Map.Map<Text, Map.Map<Text, GPSTypes.GPSLocation>>,
    constituencyId : Text,
    locations : [GPSTypes.GPSLocation],
  ) : Bool {
    let inner : Map.Map<Text, GPSTypes.GPSLocation> = switch (gpsLocations.get(constituencyId)) {
      case null {
        let m = Map.empty<Text, GPSTypes.GPSLocation>();
        gpsLocations.add(constituencyId, m);
        m;
      };
      case (?m) { m };
    };
    for (loc in locations.values()) {
      inner.add(loc.pollingStationId, loc);
    };
    true;
  };

  // ─── Joined tracking view ─────────────────────────────────────────────────

  /// Build GPSTrackingRecord list for all stations in a constituency.
  /// Joins: polling stations + GPS data + BLO + supervisor + nodal officer.
  public func getGPSTrackingInfo(
    gpsLocations    : Map.Map<Text, Map.Map<Text, GPSTypes.GPSLocation>>,
    pollingStations : Map.Map<Text, [CommonTypes.PollingStation]>,
    bloMap          : Map.Map<Text, [BloTypes.BLO]>,
    supervisorMap   : Map.Map<Text, [SupervisorTypes.Supervisor]>,
    nodalMap        : Map.Map<Text, [SupervisorTypes.NodalOfficer]>,
    constituencyId  : Text,
  ) : [GPSTypes.GPSTrackingRecord] {
    let stations : [CommonTypes.PollingStation] = switch (pollingStations.get(constituencyId)) {
      case (?list) list;
      case null return [];
    };
    let gpsInner : ?Map.Map<Text, GPSTypes.GPSLocation> = gpsLocations.get(constituencyId);
    let blos     : [BloTypes.BLO]                       = switch (bloMap.get(constituencyId)) { case (?l) l; case null [] };
    let sups     : [SupervisorTypes.Supervisor]          = switch (supervisorMap.get(constituencyId)) { case (?l) l; case null [] };
    let nodals   : [SupervisorTypes.NodalOfficer]        = switch (nodalMap.get(constituencyId)) { case (?l) l; case null [] };

    stations.map<CommonTypes.PollingStation, GPSTypes.GPSTrackingRecord>(func(station) {
      // GPS data for this station
      let gpsOpt : ?GPSTypes.GPSLocation = switch (gpsInner) {
        case null null;
        case (?inner) inner.get(station.id);
      };
      // BLO assigned to this station
      let bloOpt : ?BloTypes.BLO = switch (station.bloId) {
        case null null;
        case (?bid) blos.find<BloTypes.BLO>(func(b : BloTypes.BLO) { b.id == bid });
      };
      // Supervisor assigned to this station
      let supOpt : ?SupervisorTypes.Supervisor = switch (station.assignedSupervisorId) {
        case null null;
        case (?sid) sups.find<SupervisorTypes.Supervisor>(func(s : SupervisorTypes.Supervisor) { s.id == sid });
      };
      // Nodal officer managing this supervisor
      let nodalOpt : ?SupervisorTypes.NodalOfficer = switch (supOpt) {
        case null null;
        case (?sup) {
          nodals.find<SupervisorTypes.NodalOfficer>(func(n : SupervisorTypes.NodalOfficer) {
            n.assignedSupervisorIds.contains(sup.id)
          });
        };
      };

      {
        pollingStationId     = station.id;
        partNumber           = station.partNumber;
        partName             = station.partName;
        location             = station.location;
        constituencyId       = station.constituencyId;
        gpsLat               = switch (gpsOpt) { case (?g) ?g.lat; case null null };
        gpsLon               = switch (gpsOpt) { case (?g) ?g.lon; case null null };
        gpsUpdatedAt         = switch (gpsOpt) { case (?g) ?g.updatedAt; case null null };
        gpsUpdatedBy         = switch (gpsOpt) { case (?g) ?g.updatedBy; case null null };
        gpsUpdatedByRole     = switch (gpsOpt) { case (?g) ?g.updatedByRole; case null null };
        gpsUpdatedByName     = switch (gpsOpt) { case (?g) ?g.updatedByName; case null null };
        assignedBLOId        = switch (bloOpt) { case (?b) ?b.id; case null null };
        assignedBLOName      = switch (bloOpt) { case (?b) ?b.name; case null null };
        assignedBLOPhone     = switch (bloOpt) { case (?b) ?b.phone; case null null };
        assignedSupervisorId = switch (supOpt) { case (?s) ?s.id; case null null };
        assignedSupervisorName = switch (supOpt) { case (?s) ?s.name; case null null };
        assignedNodalOfficerId = switch (nodalOpt) { case (?n) ?n.id; case null null };
        assignedNodalOfficerName = switch (nodalOpt) { case (?n) ?n.name; case null null };
      };
    });
  };
};
