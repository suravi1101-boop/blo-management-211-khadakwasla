import Map "mo:core/Map";
import CommonTypes "../types/common";

module {
  public func getAppointmentOrders(
    constituencyOrders : Map.Map<Text, Map.Map<Text, CommonTypes.AppointmentOrder>>,
    constituencyId : Text,
  ) : [CommonTypes.AppointmentOrder] {
    switch (constituencyOrders.get(constituencyId)) {
      case null { [] };
      case (?inner) { inner.values().toArray() };
    };
  };

  public func saveAppointmentOrder(
    constituencyOrders : Map.Map<Text, Map.Map<Text, CommonTypes.AppointmentOrder>>,
    constituencyId : Text,
    order : CommonTypes.AppointmentOrder,
  ) : Bool {
    let inner : Map.Map<Text, CommonTypes.AppointmentOrder> = switch (constituencyOrders.get(constituencyId)) {
      case null {
        let m = Map.empty<Text, CommonTypes.AppointmentOrder>();
        constituencyOrders.add(constituencyId, m);
        m;
      };
      case (?m) { m };
    };
    inner.add(order.id.toText(), order);
    true;
  };

  public func deleteAppointmentOrder(
    constituencyOrders : Map.Map<Text, Map.Map<Text, CommonTypes.AppointmentOrder>>,
    constituencyId : Text,
    orderId : Text,
  ) : Bool {
    switch (constituencyOrders.get(constituencyId)) {
      case null { false };
      case (?inner) {
        inner.remove(orderId);
        true;
      };
    };
  };

  public func bulkSaveAppointmentOrders(
    constituencyOrders : Map.Map<Text, Map.Map<Text, CommonTypes.AppointmentOrder>>,
    constituencyId : Text,
    orders : [CommonTypes.AppointmentOrder],
  ) : Bool {
    let inner : Map.Map<Text, CommonTypes.AppointmentOrder> = switch (constituencyOrders.get(constituencyId)) {
      case null {
        let m = Map.empty<Text, CommonTypes.AppointmentOrder>();
        constituencyOrders.add(constituencyId, m);
        m;
      };
      case (?m) { m };
    };
    for (order in orders.values()) {
      inner.add(order.id.toText(), order);
    };
    true;
  };
};
