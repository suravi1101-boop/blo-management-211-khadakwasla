import Types "../types/records";

module {
  public type NoticeSettings = Types.NoticeSettings;

  /// Get notice settings for a specific constituency
  public func getSettings(
    all    : [NoticeSettings],
    cid    : Text,
  ) : ?NoticeSettings {
    var result : ?NoticeSettings = null;
    for (ns in all.vals()) {
      if (ns.constituencyId == cid) { result := ?ns };
    };
    result;
  };

  /// Upsert (save or replace) notice settings for a constituency
  public func saveSettings(
    all      : [NoticeSettings],
    settings : NoticeSettings,
  ) : [NoticeSettings] {
    var found = false;
    let updated = all.map(func(ns) {
      if (ns.constituencyId == settings.constituencyId) {
        found := true;
        settings
      } else {
        ns
      }
    });
    if (found) { updated } else { updated.concat([settings]) };
  };
};
