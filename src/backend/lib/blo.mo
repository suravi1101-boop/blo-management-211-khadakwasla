import Types "../types/blo";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Nat "mo:core/Nat";

module {
  public type BLO = Types.BLO;
  public type AppointmentOrder = Types.AppointmentOrder;

  // Zero-pad a Nat to width digits
  func padNat(n : Nat, width : Nat) : Text {
    var s = n.toText();
    while (s.size() < width) { s := "0" # s };
    s;
  };

  /// Return all BLOs for a constituency
  public func getBLOs(
    bloMap : Map.Map<Text, [BLO]>,
    constituencyId : Text,
  ) : [BLO] {
    switch (bloMap.get(constituencyId)) {
      case (?list) list;
      case null [];
    };
  };

  /// Create or update a BLO record
  public func saveBLO(
    bloMap : Map.Map<Text, [BLO]>,
    blo : BLO,
  ) {
    let existing = switch (bloMap.get(blo.constituencyId)) {
      case (?list) list;
      case null [];
    };
    // Replace if id matches, else append
    let updated = existing.filter<BLO>(func(b : BLO) { b.id != blo.id });
    let newList = updated.concat([blo]);
    bloMap.add(blo.constituencyId, newList);
  };

  /// Update an existing BLO by id
  public func updateBLO(
    bloMap : Map.Map<Text, [BLO]>,
    blo : BLO,
  ) {
    saveBLO(bloMap, blo);
  };

  /// Save 500+ BLOs atomically (bulk import)
  public func bulkSaveBLOs(
    bloMap : Map.Map<Text, [BLO]>,
    constituencyId : Text,
    blos : [BLO],
  ) : Nat {
    bloMap.add(constituencyId, blos);
    blos.size();
  };

  /// Get all appointment orders for a constituency
  public func getAppointmentOrders(
    orderMap : Map.Map<Text, [AppointmentOrder]>,
    constituencyId : Text,
  ) : [AppointmentOrder] {
    switch (orderMap.get(constituencyId)) {
      case (?list) list;
      case null [];
    };
  };

  /// Create appointment order with auto-generated sequential number
  public func createAppointmentOrder(
    orderMap : Map.Map<Text, [AppointmentOrder]>,
    orderCounterMap : Map.Map<Text, Nat>,
    bloId : Text,
    constituencyId : Text,
    content : Text,
    now : Int,
  ) : AppointmentOrder {
    let counter = switch (orderCounterMap.get(constituencyId)) {
      case (?n) n + 1;
      case null 1;
    };
    orderCounterMap.add(constituencyId, counter);
    let orderNumber = "BLO/" # constituencyId # "/2025/" # padNat(counter, 3);
    let order : AppointmentOrder = {
      id             = constituencyId # "-" # counter.toText();
      orderNumber    = orderNumber;
      bloId          = bloId;
      constituencyId = constituencyId;
      issuedDate     = now;
      content        = content;
      status         = "issued";
      createdAt      = now;
    };
    let existing = switch (orderMap.get(constituencyId)) {
      case (?list) list;
      case null [];
    };
    orderMap.add(constituencyId, existing.concat([order]));
    order;
  };
};
