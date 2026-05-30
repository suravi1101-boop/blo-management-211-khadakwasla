import T "../types/records";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Nat "mo:core/Nat";

mixin (state : {
  var blos              : [T.BLO];
  var pollingStations   : [T.PollingStation];
  var supervisors       : [T.Supervisor];
  var appointmentOrders : [T.AppointmentOrder];
  var orderCounters     : [(Text, Nat)];
}) {
  type BLO              = T.BLO;
  type AppointmentOrder = T.AppointmentOrder;

  // ─── Internal helpers ─────────────────────────────────────────────

  func getCounter(cid : Text) : Nat {
    switch (state.orderCounters.find<(Text, Nat)>(func(p) { p.0 == cid })) {
      case (?(_, n)) n;
      case null 0;
    };
  };

  func setCounter(cid : Text, n : Nat) {
    let others = state.orderCounters.filter(func(p) { p.0 != cid });
    state.orderCounters := others.concat([(cid, n)]);
  };

  func padNat(n : Nat, width : Nat) : Text {
    var s = n.toText();
    while (s.size() < width) { s := "0" # s };
    s;
  };

  // ─── Public API ─────────────────────────────────────────────────

  /// Return all BLOs for a constituency — sorted by partNumber numerically
  public shared func getBLOs(cid : Text) : async [BLO] {
    let filtered = state.blos.filter(func(b) { b.constituencyId == cid });
    filtered.sort<BLO>(func(a, b) {
      let na = switch (Nat.fromText(a.partNumber)) { case (?n) n; case null 0 };
      let nb = switch (Nat.fromText(b.partNumber)) { case (?n) n; case null 0 };
      Nat.compare(na, nb)
    });
  };

  /// Get BLOs assigned to a specific supervisor (by their assigned station IDs)
  public shared func getBLOsBySupervisor(cid : Text, supervisorId : Text) : async [BLO] {
    let stationIds : [Text] = switch (
      state.supervisors.find<T.Supervisor>(func(s) { s.id == supervisorId and s.constituencyId == cid })
    ) {
      case (?sup) { sup.assignedStationIds };
      case null { [] };
    };
    state.blos.filter<BLO>(func(b) {
      b.constituencyId == cid and
      stationIds.find(func(sid) {
        sid == b.id or
        (switch (state.pollingStations.find<T.PollingStation>(func(ps) { ps.id == sid })) {
          case (?ps) ps.partNumber == b.partNumber;
          case null false;
        })
      }) != null
    });
  };

  /// Create or update a BLO record — deduplicates by (constituencyId + partNumber)
  public shared func saveBLO(blo : BLO) : async Bool {
    let others = state.blos.filter(func(b) {
      b.id != blo.id and not (b.constituencyId == blo.constituencyId and b.partNumber == blo.partNumber)
    });
    state.blos := others.concat([blo]);
    true;
  };

  /// Update an existing BLO — deduplicates by (constituencyId + partNumber)
  public shared func updateBLO(blo : BLO) : async Bool {
    let others = state.blos.filter(func(b) {
      b.id != blo.id and not (b.constituencyId == blo.constituencyId and b.partNumber == blo.partNumber)
    });
    state.blos := others.concat([blo]);
    true;
  };

  /// Bulk save BLOs (batch import) — deduplicates by (constituencyId + partNumber).
  /// Replaces all BLOs for that constituency to prevent double-import accumulation.
  public shared func bulkSaveBLOs(cid : Text, blos : [BLO]) : async Nat {
    let others = state.blos.filter(func(b) { b.constituencyId != cid });
    var deduped : [BLO] = [];
    for (blo in blos.values()) {
      let withoutDup = deduped.filter(func(b) { b.partNumber != blo.partNumber });
      deduped := withoutDup.concat([blo]);
    };
    state.blos := others.concat(deduped);
    deduped.size();
  };

  /// Delete ALL BLOs for a given constituency — used when admin uploaded wrong data
  public shared func deleteBLOsByConstituency(constituencyId : Text) : async Bool {
    state.blos := state.blos.filter<BLO>(func(b) { b.constituencyId != constituencyId });
    true;
  };

  /// Return all appointment orders for a constituency
  public shared func getAppointmentOrders(cid : Text) : async [AppointmentOrder] {
    state.appointmentOrders.filter<AppointmentOrder>(func(o) { o.constituencyId == cid });
  };

  /// Create appointment order with auto-generated sequential number
  public shared func createAppointmentOrder(cid : Text, bloId : Text, content : Text) : async AppointmentOrder {
    let counter = getCounter(cid) + 1;
    setCounter(cid, counter);
    let now = Time.now();
    let order : AppointmentOrder = {
      id           = cid # "-" # counter.toText();
      orderNumber  = "BLO/" # cid # "/2025/" # padNat(counter, 3);
      bloId        = bloId;
      constituencyId = cid;
      issuedDate   = now;
      content      = content;
      status       = "issued";
      createdAt    = now;
    };
    state.appointmentOrders := state.appointmentOrders.concat([order]);
    order;
  };

  /// Update an existing appointment order
  public shared func updateAppointmentOrder(order : AppointmentOrder) : async Bool {
    let others = state.appointmentOrders.filter(func(o) { o.id != order.id });
    state.appointmentOrders := others.concat([order]);
    true;
  };

  /// Delete a BLO record
  public shared func deleteBLO(bloId : Text) : async Bool {
    let before = state.blos.size();
    state.blos := state.blos.filter<BLO>(func(b) { b.id != bloId });
    state.blos.size() < before;
  };
};
