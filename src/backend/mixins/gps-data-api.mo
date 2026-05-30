import T "../types/records";
import Array "mo:core/Array";
import Time "mo:core/Time";

mixin (state : {
  var gpsLocationsList : [T.GPSLocation];
  var pollingStations  : [T.PollingStation];
  var blos             : [T.BLO];
  var supervisors      : [T.Supervisor];
  var nodalOfficers    : [T.NodalOfficer];
}) {
  type GPSLocation       = T.GPSLocation;
  type GPSTrackingRecord = T.GPSTrackingRecord;

  /// Get GPS locations for a constituency (update call, bypasses IC cache)
  public shared func getGPSLocationsFresh(cid : Text) : async [GPSLocation] {
    state.gpsLocationsList.filter<GPSLocation>(func(g) { g.constituencyId == cid });
  };

  /// Get all GPS locations (Super Admin cross-constituency view)
  public shared func getAllGPSLocations() : async [GPSLocation] {
    state.gpsLocationsList;
  };

  /// Save a single GPS location (Super Admin only — enforced by role check)
  public shared func saveGPSLocation(cid : Text, location : GPSLocation) : async Bool {
    if (location.updatedByRole != "super_admin") return false;
    let others = state.gpsLocationsList.filter(
      func(g) { not (g.constituencyId == cid and g.pollingStationId == location.pollingStationId) },
    );
    state.gpsLocationsList := others.concat([location]);
    true;
  };

  /// Bulk save GPS locations (Super Admin only)
  public shared func bulkSaveGPSLocations(cid : Text, locations : [GPSLocation]) : async Bool {
    for (loc in locations.vals()) {
      if (loc.updatedByRole != "super_admin") return false;
    };
    let others = state.gpsLocationsList.filter(func(g) { g.constituencyId != cid });
    state.gpsLocationsList := others.concat(locations);
    true;
  };

  /// Set GPS coordinates for a specific polling station (Super Admin only)
  public shared func setPollingStationGPS(cid : Text, stationId : Text, lat : Float, lon : Float) : async Bool {
    // Update the polling station's lat/lon directly
    var found = false;
    state.pollingStations := state.pollingStations.map<T.PollingStation, T.PollingStation>(func(s) {
      if (s.constituencyId == cid and s.id == stationId) {
        found := true;
        { s with latitude = ?lat; longitude = ?lon };
      } else { s };
    });
    if (not found) return false;
    // Also upsert in gpsLocationsList for the unified GPS view
    let now = Time.now();
    let others = state.gpsLocationsList.filter(
      func(g) { not (g.constituencyId == cid and g.pollingStationId == stationId) },
    );
    state.gpsLocationsList := others.concat([{
      pollingStationId = stationId;
      constituencyId   = cid;
      lat;
      lon;
      updatedBy        = "super_admin";
      updatedByRole    = "super_admin";
      updatedByName    = "Super Admin";
      updatedAt        = now;
    }]);
    true;
  };

  /// Get GPS coordinates for a specific polling station
  public query func getPollingStationGPS(cid : Text, stationId : Text) : async ?(Float, Float) {
    switch (state.gpsLocationsList.find(func(g) { g.constituencyId == cid and g.pollingStationId == stationId })) {
      case (?g) ?(g.lat, g.lon);
      case null null;
    };
  };

  /// Get GPS tracking info for a constituency — joined view (Super Admin only)
  public shared func getGPSTrackingInfo(cid : Text) : async [GPSTrackingRecord] {
    let stations = state.pollingStations.filter(func(s) { s.constituencyId == cid });
    let blos     = state.blos.filter(func(b) { b.constituencyId == cid });
    let sups     = state.supervisors.filter(func(s) { s.constituencyId == cid });
    let nodals   = state.nodalOfficers.filter(func(o) { o.constituencyId == cid });
    let gpsData  = state.gpsLocationsList.filter(func(g) { g.constituencyId == cid });

    stations.map<T.PollingStation, GPSTrackingRecord>(func(station) {
      let gpsOpt = gpsData.find(func(g) { g.pollingStationId == station.id });
      let bloOpt = switch (station.bloId) {
        case null null;
        case (?bid) blos.find(func(b) { b.id == bid });
      };
      let supOpt = switch (station.assignedSupervisorId) {
        case null null;
        case (?sid) sups.find(func(s) { s.id == sid });
      };
      let nodalOpt = switch (supOpt) {
        case null null;
        case (?sup) nodals.find(func(o) {
          switch (o.assignedSupervisorIds.find<Text>(func(id) { id == sup.id })) {
            case (?_) true;
            case null false;
          }
        });
      };
      {
        pollingStationId       = station.id;
        partNumber             = station.partNumber;
        partName               = station.partName;
        location               = station.location;
        constituencyId         = station.constituencyId;
        gpsLat                 = switch (gpsOpt) { case (?g) ?g.lat; case null null };
        gpsLon                 = switch (gpsOpt) { case (?g) ?g.lon; case null null };
        gpsUpdatedAt           = switch (gpsOpt) { case (?g) ?g.updatedAt; case null null };
        gpsUpdatedBy           = switch (gpsOpt) { case (?g) ?g.updatedBy; case null null };
        gpsUpdatedByRole       = switch (gpsOpt) { case (?g) ?g.updatedByRole; case null null };
        gpsUpdatedByName       = switch (gpsOpt) { case (?g) ?g.updatedByName; case null null };
        assignedBLOId          = station.bloId;
        assignedBLOName        = switch (bloOpt) { case (?b) ?b.name; case null null };
        assignedBLOPhone       = switch (bloOpt) { case (?b) ?b.phone; case null null };
        assignedSupervisorId   = station.assignedSupervisorId;
        assignedSupervisorName = switch (supOpt) { case (?s) ?s.name; case null null };
        assignedNodalOfficerId   = switch (nodalOpt) { case (?n) ?n.id; case null null };
        assignedNodalOfficerName = switch (nodalOpt) { case (?n) ?n.name; case null null };
      };
    });
  };
};
