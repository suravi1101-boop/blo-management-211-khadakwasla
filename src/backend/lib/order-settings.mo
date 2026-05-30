import Types "../types/records";

module {
  public type OrderSettings = Types.OrderSettings;

  /// Get order settings for a specific constituency
  public func getSettings(
    all : [OrderSettings],
    cid : Text,
  ) : ?OrderSettings {
    var result : ?OrderSettings = null;
    for (os in all.vals()) {
      if (os.constituencyId == cid) { result := ?os };
    };
    result;
  };

  /// Upsert (save or replace) order settings for a constituency
  public func saveSettings(
    all      : [OrderSettings],
    settings : OrderSettings,
  ) : [OrderSettings] {
    var found = false;
    let updated = all.map(func(os) {
      if (os.constituencyId == settings.constituencyId) {
        found := true;
        settings
      } else {
        os
      }
    });
    if (found) { updated } else { updated.concat([settings]) };
  };
};
