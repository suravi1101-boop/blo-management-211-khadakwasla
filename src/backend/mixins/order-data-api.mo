import OrderDataLib "../lib/order-data";
import Map "mo:core/Map";
import CommonTypes "../types/common";

mixin (
  constituencyOrders : Map.Map<Text, Map.Map<Text, CommonTypes.AppointmentOrder>>,
  orderDataVersions : Map.Map<Text, Nat>,
) {
  // Internal helper — bump the data version for a constituency
  func bumpOrderVersion(constituencyId : Text) {
    let current = switch (orderDataVersions.get(constituencyId)) {
      case null { 0 };
      case (?v) { v };
    };
    orderDataVersions.add(constituencyId, current + 1);
  };

  public shared func getAppointmentOrders(constituencyId : Text) : async [CommonTypes.AppointmentOrder] {
    OrderDataLib.getAppointmentOrders(constituencyOrders, constituencyId);
  };

  public shared func saveAppointmentOrder(constituencyId : Text, order : CommonTypes.AppointmentOrder) : async Bool {
    let result = OrderDataLib.saveAppointmentOrder(constituencyOrders, constituencyId, order);
    bumpOrderVersion(constituencyId);
    result;
  };

  public shared func deleteAppointmentOrder(constituencyId : Text, orderId : Text) : async Bool {
    let result = OrderDataLib.deleteAppointmentOrder(constituencyOrders, constituencyId, orderId);
    bumpOrderVersion(constituencyId);
    result;
  };

  public shared func bulkSaveAppointmentOrders(constituencyId : Text, orders : [CommonTypes.AppointmentOrder]) : async Bool {
    let result = OrderDataLib.bulkSaveAppointmentOrders(constituencyOrders, constituencyId, orders);
    bumpOrderVersion(constituencyId);
    result;
  };

  // Fresh update-call variant — bypasses IC HTTP query cache for cross-device sync
  public shared func getAppointmentOrdersFresh(constituencyId : Text) : async [CommonTypes.AppointmentOrder] {
    OrderDataLib.getAppointmentOrders(constituencyOrders, constituencyId);
  };
};
