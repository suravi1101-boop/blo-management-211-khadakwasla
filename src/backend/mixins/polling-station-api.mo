import T "../types/records";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Nat "mo:core/Nat";

mixin (state : {
  var pollingStations : [T.PollingStation];
}) {
  type PollingStation = T.PollingStation;

  // ─── Internal helpers ─────────────────────────────────────────────

  func stationsForConstituency(cid : Text) : [PollingStation] {
    state.pollingStations.filter<PollingStation>(func(s) { s.constituencyId == cid });
  };

  // ─── Public API ─────────────────────────────────────────────────

  /// Return all polling stations for a constituency sorted by partNumber
  public shared func getPollingStations(cid : Text) : async [PollingStation] {
    let filtered = stationsForConstituency(cid);
    filtered.sort<PollingStation>(func(a, b) {
      let na = switch (Nat.fromText(a.partNumber)) { case (?n) n; case null 0 };
      let nb = switch (Nat.fromText(b.partNumber)) { case (?n) n; case null 0 };
      Nat.compare(na, nb)
    });
  };

  /// Add or update a single polling station — deduplicates by (constituencyId + partNumber)
  public shared func addPollingStation(station : PollingStation) : async Bool {
    // Remove any record with same id OR same (constituencyId + partNumber)
    let others = state.pollingStations.filter(func(s) {
      s.id != station.id and not (s.constituencyId == station.constituencyId and s.partNumber == station.partNumber)
    });
    state.pollingStations := others.concat([station]);
    true;
  };

  /// Update an existing polling station (GPS, BLO assignment, supervisor, etc.)
  public shared func updatePollingStation(station : PollingStation) : async Bool {
    let others = state.pollingStations.filter(func(s) { s.id != station.id });
    state.pollingStations := others.concat([station]);
    true;
  };

  /// Bulk save 500+ stations from Excel import — UPSERT by (constituencyId + partNumber).
  /// Replaces all for this constituency to prevent duplicate accumulation on reimport.
  public shared func bulkSavePollingStations(cid : Text, stations : [PollingStation]) : async Nat {
    // Keep stations from other constituencies
    let others = state.pollingStations.filter(func(s) { s.constituencyId != cid });
    // Deduplicate within incoming batch by partNumber (last wins)
    var deduped : [PollingStation] = [];
    for (st in stations.values()) {
      let withoutDup = deduped.filter(func(s) { s.partNumber != st.partNumber });
      deduped := withoutDup.concat([st]);
    };
    state.pollingStations := others.concat(deduped);
    deduped.size();
  };

  /// Delete a polling station by its ID
  public shared func deletePollingStation(stationId : Text) : async Bool {
    let before = state.pollingStations.size();
    state.pollingStations := state.pollingStations.filter<PollingStation>(func(s) { s.id != stationId });
    state.pollingStations.size() < before;
  };
};
