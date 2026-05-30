import Map "mo:core/Map";
import RecordTypes "../types/records";
import Array "mo:core/Array";
import Time "mo:core/Time";
import List "mo:core/List";

module {
  public type BLOChangeRecord = RecordTypes.BLOChangeRecord;
  public type JavakEntry = RecordTypes.JavakEntry;
  public type OfficerSettings = RecordTypes.OfficerSettings;
  public type ConstituencyConfig = RecordTypes.ConstituencyConfig;
  public type LoginHistory = RecordTypes.LoginHistory;
  public type MigrationStatus = RecordTypes.MigrationStatus;

  // BLO Change Log
  public func addBLOChangeRecord(
    store : Map.Map<Text, Map.Map<Text, BLOChangeRecord>>,
    constituencyId : Text,
    record : BLOChangeRecord,
  ) : () {
    let inner = switch (store.get(constituencyId)) {
      case (?m) { m };
      case null {
        let m = Map.empty<Text, BLOChangeRecord>();
        store.add(constituencyId, m);
        m;
      };
    };
    inner.add(record.id, record);
  };

  public func getBLOChangeRecords(
    store : Map.Map<Text, Map.Map<Text, BLOChangeRecord>>,
    constituencyId : Text,
  ) : [BLOChangeRecord] {
    switch (store.get(constituencyId)) {
      case null { [] };
      case (?inner) { inner.values().toArray() };
    };
  };

  // Javak Register
  public func addJavakEntry(
    store : Map.Map<Text, Map.Map<Text, JavakEntry>>,
    counters : Map.Map<Text, Nat>,
    constituencyId : Text,
    entry : JavakEntry,
  ) : () {
    let inner = switch (store.get(constituencyId)) {
      case (?m) { m };
      case null {
        let m = Map.empty<Text, JavakEntry>();
        store.add(constituencyId, m);
        m;
      };
    };
    inner.add(entry.id, entry);
    let current = switch (counters.get(constituencyId)) {
      case (?n) { n };
      case null { 0 };
    };
    counters.add(constituencyId, current + 1);
  };

  public func getJavakEntries(
    store : Map.Map<Text, Map.Map<Text, JavakEntry>>,
    constituencyId : Text,
  ) : [JavakEntry] {
    switch (store.get(constituencyId)) {
      case null { [] };
      case (?inner) { inner.values().toArray() };
    };
  };

  public func getJavakCounter(
    counters : Map.Map<Text, Nat>,
    constituencyId : Text,
  ) : Nat {
    switch (counters.get(constituencyId)) {
      case (?n) { n };
      case null { 0 };
    };
  };

  public func incrementJavakCounter(
    counters : Map.Map<Text, Nat>,
    constituencyId : Text,
  ) : Nat {
    let current = switch (counters.get(constituencyId)) {
      case (?n) { n };
      case null { 0 };
    };
    let next = current + 1;
    counters.add(constituencyId, next);
    next;
  };

  // OfficerSettings
  public func setOfficerSettings(
    store : Map.Map<Text, OfficerSettings>,
    constituencyId : Text,
    settings : OfficerSettings,
  ) : () {
    store.add(constituencyId, settings);
  };

  public func getOfficerSettings(
    store : Map.Map<Text, OfficerSettings>,
    constituencyId : Text,
  ) : ?OfficerSettings {
    store.get(constituencyId);
  };

  // ConstituencyConfig
  public func setConstituencyConfig(
    store : Map.Map<Text, ConstituencyConfig>,
    config : ConstituencyConfig,
  ) : () {
    store.add(config.id, config);
  };

  public func getConstituencyConfig(
    store : Map.Map<Text, ConstituencyConfig>,
    constituencyId : Text,
  ) : ?ConstituencyConfig {
    store.get(constituencyId);
  };

  public func getAllConstituencyConfigs(
    store : Map.Map<Text, ConstituencyConfig>
  ) : [ConstituencyConfig] {
    store.values().toArray();
  };

  public func setAllConstituenciesEnabled(
    store : Map.Map<Text, ConstituencyConfig>,
    enabled : Bool,
  ) : () {
    // Canonical numeric IDs matching frontend keys ("211"–"231")
    let ALL_CONSTITUENCY_IDS : [Text] = [
      "211", "212", "213", "214", "215", "216", "217", "218", "219", "220",
      "221", "222", "223", "224", "225", "226", "227", "228", "229", "230", "231",
    ];
    for (cid in ALL_CONSTITUENCY_IDS.values()) {
      setConstituencyEnabled(store, cid, enabled);
    };
  };

  public func getAllPasswordHistory(
    log : List.List<RecordTypes.PasswordHistoryEntry>,
  ) : [RecordTypes.PasswordHistoryEntry] {
    // Return newest-first: reverse the array
    let arr = log.toArray();
    let size = arr.size();
    if (size == 0) { return [] };
    Array.tabulate<RecordTypes.PasswordHistoryEntry>(size, func(i) { arr[size - 1 - i] });
  };

  public func setConstituencyEnabled(
    store : Map.Map<Text, ConstituencyConfig>,
    constituencyId : Text,
    enabled : Bool,
  ) : () {
    switch (store.get(constituencyId)) {
      case null {
        store.add(constituencyId, {
          id = constituencyId;
          name = constituencyId;
          enabled = enabled;
          password = "";
          passwordHistory = [];
        });
      };
      case (?cfg) {
        store.add(constituencyId, {
          id = cfg.id;
          name = cfg.name;
          enabled = enabled;
          password = cfg.password;
          passwordHistory = cfg.passwordHistory;
        });
      };
    };
  };

  public func setConstituencyPassword(
    store : Map.Map<Text, ConstituencyConfig>,
    constituencyId : Text,
    newPassword : Text,
  ) : () {
    let existing = switch (store.get(constituencyId)) {
      case (?cfg) { cfg };
      case null {
        {
          id = constituencyId;
          name = constituencyId;
          enabled = true;
          password = "";
          passwordHistory = [];
        };
      };
    };
    let history = existing.passwordHistory.concat([existing.password]);
    store.add(constituencyId, { existing with password = newPassword; passwordHistory = history });
  };

  public func getConstituencyPasswordHistory(
    store : Map.Map<Text, ConstituencyConfig>,
    constituencyId : Text,
  ) : [Text] {
    switch (store.get(constituencyId)) {
      case null { [] };
      case (?cfg) { cfg.passwordHistory };
    };
  };

  // LoginHistory
  public func addLoginHistory(
    store : Map.Map<Text, LoginHistory>,
    entry : LoginHistory,
  ) : () {
    store.add(entry.id, entry);
  };

  public func getLoginHistory(
    store : Map.Map<Text, LoginHistory>
  ) : [LoginHistory] {
    store.values().toArray();
  };

  // MigrationStatus
  public func setMigrationStatus(
    store : Map.Map<Text, MigrationStatus>,
    status : MigrationStatus,
  ) : () {
    store.add(status.constituencyId, status);
  };

  public func getMigrationStatus(
    store : Map.Map<Text, MigrationStatus>,
    constituencyId : Text,
  ) : ?MigrationStatus {
    store.get(constituencyId);
  };

  public func getAllMigrationStatuses(
    store : Map.Map<Text, MigrationStatus>
  ) : [MigrationStatus] {
    store.values().toArray();
  };

  // Bulk migrate javak entries — replace all entries for a constituency in one call
  public func bulkMigrateJavakEntries(
    store : Map.Map<Text, Map.Map<Text, JavakEntry>>,
    counters : Map.Map<Text, Nat>,
    constituencyId : Text,
    items : [JavakEntry],
  ) : Nat {
    let inner = Map.empty<Text, JavakEntry>();
    for (e in items.values()) {
      inner.add(e.id, e);
    };
    store.add(constituencyId, inner);
    counters.add(constituencyId, items.size());
    items.size();
  };

  // Bulk migrate BLO change records — replace all records for a constituency
  public func bulkMigrateBLOChangeRecords(
    store : Map.Map<Text, Map.Map<Text, BLOChangeRecord>>,
    constituencyId : Text,
    items : [BLOChangeRecord],
  ) : Nat {
    let inner = Map.empty<Text, BLOChangeRecord>();
    for (r in items.values()) {
      inner.add(r.id, r);
    };
    store.add(constituencyId, inner);
    items.size();
  };
};
