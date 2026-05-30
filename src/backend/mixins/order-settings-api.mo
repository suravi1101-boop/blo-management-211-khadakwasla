import OrderSettingsLib "../lib/order-settings";
import T "../types/records";
import Time "mo:core/Time";

mixin (store : { var orderSettings : [T.OrderSettings] }) {
  type OrderSettings = T.OrderSettings;

  /// Get BLO appointment order header and officer settings for a constituency
  public query func getOrderSettings(constituencyId : Text) : async ?OrderSettings {
    OrderSettingsLib.getSettings(store.orderSettings, constituencyId);
  };

  /// Save (upsert) order settings for a constituency
  public shared func saveOrderSettings(settings : OrderSettings) : async Bool {
    let s : OrderSettings = { settings with updatedAt = Time.now() };
    store.orderSettings := OrderSettingsLib.saveSettings(store.orderSettings, s);
    true;
  };
};
