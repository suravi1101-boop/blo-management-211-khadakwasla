import RecordsLib "../lib/records";
import Map "mo:core/Map";
import RecordTypes "../types/records";
import SupervisorTypes "../types/supervisor";
import Time "mo:core/Time";
import SupervisorLib "../lib/supervisor";
import CommonTypes "../types/common";
import HonorariumTypes "../types/honorarium";
import Debug "mo:core/Debug";
import Array "mo:core/Array";
import List "mo:core/List";

mixin (
  javakEntries : Map.Map<Text, Map.Map<Text, RecordTypes.JavakEntry>>,
  javakCounters : Map.Map<Text, Nat>,
  officerSettings : Map.Map<Text, RecordTypes.OfficerSettings>,
  constituencyConfigs : Map.Map<Text, RecordTypes.ConstituencyConfig>,
  loginHistory : Map.Map<Text, RecordTypes.LoginHistory>,
  migrationStatuses : Map.Map<Text, RecordTypes.MigrationStatus>,
  supervisors : Map.Map<Text, Map.Map<Text, SupervisorTypes.Supervisor>>,
  nodalOfficers : Map.Map<Text, Map.Map<Text, SupervisorTypes.NodalOfficer>>,
  supervisorNotices : Map.Map<Text, Map.Map<Text, SupervisorTypes.SupervisorNotice>>,
  nodalNotices : Map.Map<Text, Map.Map<Text, SupervisorTypes.NodalNotice>>,
  bloChangeRecords : Map.Map<Text, Map.Map<Text, RecordTypes.BLOChangeRecord>>,
  constituencyPollingStations : Map.Map<Text, Map.Map<Text, CommonTypes.PollingStation>>,
  constituencyBLOs : Map.Map<Text, Map.Map<Text, CommonTypes.BLO>>,
  constituencyOrders : Map.Map<Text, Map.Map<Text, CommonTypes.AppointmentOrder>>,
  constituencyBLONotices : Map.Map<Text, Map.Map<Nat, CommonTypes.Notice>>,
  bloBankDetails : Map.Map<Text, HonorariumTypes.BankDetails>,
  supervisorBankDetailsRef : Map.Map<Text, HonorariumTypes.BankDetails>,
  honorariumConfigs : Map.Map<Text, HonorariumTypes.HonorariumConfig>,
  quarterlyPayments : Map.Map<Text, Map.Map<Text, HonorariumTypes.QuarterlyPayment>>,
  extraPayments : Map.Map<Text, Map.Map<Text, HonorariumTypes.ExtraPayment>>,
  appointmentDateChanges : Map.Map<Text, Map.Map<Text, HonorariumTypes.AppointmentDateChange>>,
  passwordHistoryLog : List.List<RecordTypes.PasswordHistoryEntry>,
  dataVersions : Map.Map<Text, Nat>,
) {
  // JavakRegister
  public shared func addJavakEntry(constituencyId : Text, entry : RecordTypes.JavakEntry) : async () {
    RecordsLib.addJavakEntry(javakEntries, javakCounters, constituencyId, entry);
  };

  public shared func getJavakEntries(constituencyId : Text) : async [RecordTypes.JavakEntry] {
    RecordsLib.getJavakEntries(javakEntries, constituencyId);
  };

  public shared func getJavakCounter(constituencyId : Text) : async Nat {
    RecordsLib.getJavakCounter(javakCounters, constituencyId);
  };

  public shared func incrementJavakCounter(constituencyId : Text) : async Nat {
    RecordsLib.incrementJavakCounter(javakCounters, constituencyId);
  };

  // OfficerSettings
  public shared func setOfficerSettings(constituencyId : Text, settings : RecordTypes.OfficerSettings) : async () {
    RecordsLib.setOfficerSettings(officerSettings, constituencyId, settings);
  };

  public shared func getOfficerSettings(constituencyId : Text) : async ?RecordTypes.OfficerSettings {
    RecordsLib.getOfficerSettings(officerSettings, constituencyId);
  };

  // Fresh update-call variant — bypasses IC HTTP query cache for cross-device sync
  public shared func getOfficerSettingsFresh(constituencyId : Text) : async ?RecordTypes.OfficerSettings {
    RecordsLib.getOfficerSettings(officerSettings, constituencyId);
  };

  // ConstituencyConfig
  public shared func setConstituencyConfig(config : RecordTypes.ConstituencyConfig) : async () {
    RecordsLib.setConstituencyConfig(constituencyConfigs, config);
  };

  public shared func getConstituencyConfig(constituencyId : Text) : async ?RecordTypes.ConstituencyConfig {
    RecordsLib.getConstituencyConfig(constituencyConfigs, constituencyId);
  };

  public shared func getAllConstituencyConfigs() : async [RecordTypes.ConstituencyConfig] {
    // Ensure all 21 constituencies are always returned, even if seeding hasn't run yet.
    let ALL_IDS : [Text] = [
      "211", "212", "213", "214", "215", "216", "217", "218", "219", "220",
      "221", "222", "223", "224", "225", "226", "227", "228", "229", "230", "231",
    ];
    ALL_IDS.map<Text, RecordTypes.ConstituencyConfig>(func(cid) {
      switch (constituencyConfigs.get(cid)) {
        case (?cfg) { cfg };
        case null {
          { id = cid; name = cid; enabled = true; password = ""; passwordHistory = [] };
        };
      };
    });
  };

  // Update call (not query) — bypasses IC HTTP cache for cross-device sync
  public shared func getAllConstituencyConfigsFresh() : async [RecordTypes.ConstituencyConfig] {
    // Ensure all 21 constituencies are always returned, even if seeding hasn't run yet.
    let ALL_IDS : [Text] = [
      "211", "212", "213", "214", "215", "216", "217", "218", "219", "220",
      "221", "222", "223", "224", "225", "226", "227", "228", "229", "230", "231",
    ];
    ALL_IDS.map<Text, RecordTypes.ConstituencyConfig>(func(cid) {
      switch (constituencyConfigs.get(cid)) {
        case (?cfg) { cfg };
        case null {
          { id = cid; name = cid; enabled = true; password = ""; passwordHistory = [] };
        };
      };
    });
  };

  // Single-constituency fresh fetch — update call bypasses IC boundary node HTTP cache
  public shared func getConstituencyConfigFresh(constituencyId : Text) : async ?RecordTypes.ConstituencyConfig {
    RecordsLib.getConstituencyConfig(constituencyConfigs, constituencyId);
  };

  public shared func setConstituencyEnabled(constituencyId : Text, enabled : Bool) : async () {
    RecordsLib.setConstituencyEnabled(constituencyConfigs, constituencyId, enabled);
  };

  public shared func setAllConstituenciesEnabled(enabled : Bool) : async () {
    RecordsLib.setAllConstituenciesEnabled(constituencyConfigs, enabled);
  };

  public shared func getAllPasswordHistory() : async [RecordTypes.PasswordHistoryEntry] {
    RecordsLib.getAllPasswordHistory(passwordHistoryLog);
  };

  public shared func setConstituencyPassword(constituencyId : Text, newPassword : Text) : async () {
    RecordsLib.setConstituencyPassword(constituencyConfigs, constituencyId, newPassword);
  };

  public shared func getConstituencyPasswordHistory(constituencyId : Text) : async [Text] {
    RecordsLib.getConstituencyPasswordHistory(constituencyConfigs, constituencyId);
  };

  // LoginHistory
  public shared func addLoginHistory(entry : RecordTypes.LoginHistory) : async () {
    RecordsLib.addLoginHistory(loginHistory, entry);
  };

  public shared func getLoginHistory() : async [RecordTypes.LoginHistory] {
    RecordsLib.getLoginHistory(loginHistory);
  };

  // MigrationStatus
  public shared func setMigrationStatus(status : RecordTypes.MigrationStatus) : async () {
    RecordsLib.setMigrationStatus(migrationStatuses, status);
  };

  public shared func getMigrationStatus(constituencyId : Text) : async ?RecordTypes.MigrationStatus {
    RecordsLib.getMigrationStatus(migrationStatuses, constituencyId);
  };

  public shared func getAllMigrationStatuses() : async [RecordTypes.MigrationStatus] {
    RecordsLib.getAllMigrationStatuses(migrationStatuses);
  };

  public shared func bulkMigrateConstituencyData(constituencyId : Text, rawJson : Text) : async RecordTypes.MigrationStatus {
    let status : RecordTypes.MigrationStatus = {
      constituencyId = constituencyId;
      migratedAt = rawJson;  // store raw payload as migratedAt (frontend handles actual data)
      recordCount = 0;
      conflicts = 0;
      status = "migrated";
    };
    RecordsLib.setMigrationStatus(migrationStatuses, status);
    status;
  };

  // Bulk migrate — javak entries (JSON)
  public shared func bulkMigrateJavakEntries(constituencyId : Text, javakJson : Text) : async RecordTypes.MigrationStatus {
    ignore javakJson;
    { constituencyId; migratedAt = javakJson; recordCount = 0; conflicts = 0; status = "json_passthrough" };
  };

  // Bulk migrate — javak entries (typed array)
  public shared func bulkMigrateJavakEntriesTyped(constituencyId : Text, items : [RecordTypes.JavakEntry]) : async RecordTypes.MigrationStatus {
    let count = RecordsLib.bulkMigrateJavakEntries(javakEntries, javakCounters, constituencyId, items);
    { constituencyId; migratedAt = ""; recordCount = count; conflicts = 0; status = "migrated" };
  };

  // getSyncData — returns all per-constituency data in one call for efficient polling
  public shared func getSyncData(constituencyId : Text) : async RecordTypes.SyncData {
    // Helper: extract array values from a nested Map<Text, Map<Text, V>>
    func getNestedTextArray<V>(outerMap : Map.Map<Text, Map.Map<Text, V>>) : [V] {
      switch (outerMap.get(constituencyId)) {
        case null { [] };
        case (?inner) { inner.values().toArray() };
      };
    };

    // supervisors
    let supervisorsArr : [SupervisorTypes.Supervisor] = getNestedTextArray(supervisors);
    // nodalOfficers
    let nodalOfficersArr : [SupervisorTypes.NodalOfficer] = getNestedTextArray(nodalOfficers);
    // supervisorNotices
    let supervisorNoticesArr : [SupervisorTypes.SupervisorNotice] = getNestedTextArray(supervisorNotices);
    // nodalNotices
    let nodalNoticesArr : [SupervisorTypes.NodalNotice] = getNestedTextArray(nodalNotices);
    // bloChangeRecords
    let bloChangeRecordsArr : [RecordTypes.BLOChangeRecord] = getNestedTextArray(bloChangeRecords);
    // javakEntries
    let javakEntriesArr : [RecordTypes.JavakEntry] = getNestedTextArray(javakEntries);
    // pollingStations
    let pollingStationsArr : [CommonTypes.PollingStation] = getNestedTextArray(constituencyPollingStations);
    // blos
    let blosArr : [CommonTypes.BLO] = getNestedTextArray(constituencyBLOs);
    // appointmentOrders
    let ordersArr : [CommonTypes.AppointmentOrder] = getNestedTextArray(constituencyOrders);
    // bloNotices — Map<Text, Map<Nat, Notice>>
    let bloNoticesArr : [CommonTypes.Notice] = switch (constituencyBLONotices.get(constituencyId)) {
      case null { [] };
      case (?inner) { inner.values().toArray() };
    };
    // honorariumConfig
    let honorariumConfigOpt : ?HonorariumTypes.HonorariumConfig = honorariumConfigs.get(constituencyId);
    // quarterlyPayments
    let quarterlyArr : [HonorariumTypes.QuarterlyPayment] = getNestedTextArray(quarterlyPayments);
    // extraPayments
    let extraArr : [HonorariumTypes.ExtraPayment] = getNestedTextArray(extraPayments);
    // appointmentDateChanges
    let dateChangesArr : [HonorariumTypes.AppointmentDateChange] = getNestedTextArray(appointmentDateChanges);
    // bankDetails
    let bankDetailsOpt : ?HonorariumTypes.BankDetails = bloBankDetails.get(constituencyId);
    // supervisorBankDetails
    let supervisorBankDetailsOpt : ?HonorariumTypes.BankDetails = supervisorBankDetailsRef.get(constituencyId);
    // constituencyEnabled — default true (all configs are pre-seeded in main.mo)
    let enabled : Bool = switch (constituencyConfigs.get(constituencyId)) {
      case null { true };
      case (?cfg) { cfg.enabled };
    };

    let dataVersion : Nat = switch (dataVersions.get(constituencyId)) {
      case null { 0 };
      case (?v) { v };
    };

    {
      supervisors = supervisorsArr;
      nodalOfficers = nodalOfficersArr;
      supervisorNotices = supervisorNoticesArr;
      nodalNotices = nodalNoticesArr;
      bloChangeRecords = bloChangeRecordsArr;
      javakEntries = javakEntriesArr;
      constituencyEnabled = enabled;
      timestamp = Time.now();
      dataVersion = dataVersion;
      pollingStations = pollingStationsArr;
      blos = blosArr;
      appointmentOrders = ordersArr;
      bloNotices = bloNoticesArr;
      honorariumConfig = honorariumConfigOpt;
      quarterlyPayments = quarterlyArr;
      extraPayments = extraArr;
      appointmentDateChanges = dateChangesArr;
      bankDetails = bankDetailsOpt;
      supervisorBankDetails = supervisorBankDetailsOpt;
    };
  };

  // Bulk migrate — polling stations
  // getSyncDataFresh — update call variant, bypasses IC HTTP query cache for cross-device sync
  public shared func getSyncDataFresh(constituencyId : Text) : async RecordTypes.SyncData {
    // Helper: extract array values from a nested Map<Text, Map<Text, V>>
    func getNestedTextArray<V>(outerMap : Map.Map<Text, Map.Map<Text, V>>) : [V] {
      switch (outerMap.get(constituencyId)) {
        case null { [] };
        case (?inner) { inner.values().toArray() };
      };
    };

    // supervisors
    let supervisorsArr : [SupervisorTypes.Supervisor] = getNestedTextArray(supervisors);
    // nodalOfficers
    let nodalOfficersArr : [SupervisorTypes.NodalOfficer] = getNestedTextArray(nodalOfficers);
    // supervisorNotices
    let supervisorNoticesArr : [SupervisorTypes.SupervisorNotice] = getNestedTextArray(supervisorNotices);
    // nodalNotices
    let nodalNoticesArr : [SupervisorTypes.NodalNotice] = getNestedTextArray(nodalNotices);
    // bloChangeRecords
    let bloChangeRecordsArr : [RecordTypes.BLOChangeRecord] = getNestedTextArray(bloChangeRecords);
    // javakEntries
    let javakEntriesArr : [RecordTypes.JavakEntry] = getNestedTextArray(javakEntries);
    // pollingStations
    let pollingStationsArr : [CommonTypes.PollingStation] = getNestedTextArray(constituencyPollingStations);
    // blos
    let blosArr : [CommonTypes.BLO] = getNestedTextArray(constituencyBLOs);
    // appointmentOrders
    let ordersArr : [CommonTypes.AppointmentOrder] = getNestedTextArray(constituencyOrders);
    // bloNotices — Map<Text, Map<Nat, Notice>>
    let bloNoticesArr : [CommonTypes.Notice] = switch (constituencyBLONotices.get(constituencyId)) {
      case null { [] };
      case (?inner) { inner.values().toArray() };
    };
    // honorariumConfig
    let honorariumConfigOpt : ?HonorariumTypes.HonorariumConfig = honorariumConfigs.get(constituencyId);
    // quarterlyPayments
    let quarterlyArr : [HonorariumTypes.QuarterlyPayment] = getNestedTextArray(quarterlyPayments);
    // extraPayments
    let extraArr : [HonorariumTypes.ExtraPayment] = getNestedTextArray(extraPayments);
    // appointmentDateChanges
    let dateChangesArr : [HonorariumTypes.AppointmentDateChange] = getNestedTextArray(appointmentDateChanges);
    // bankDetails
    let bankDetailsOpt : ?HonorariumTypes.BankDetails = bloBankDetails.get(constituencyId);
    // supervisorBankDetails
    let supervisorBankDetailsOpt : ?HonorariumTypes.BankDetails = supervisorBankDetailsRef.get(constituencyId);
    // constituencyEnabled — default true (all configs are pre-seeded in main.mo)
    let enabled : Bool = switch (constituencyConfigs.get(constituencyId)) {
      case null { true };
      case (?cfg) { cfg.enabled };
    };

    let dataVersionFresh : Nat = switch (dataVersions.get(constituencyId)) {
      case null { 0 };
      case (?v) { v };
    };

    {
      supervisors = supervisorsArr;
      nodalOfficers = nodalOfficersArr;
      supervisorNotices = supervisorNoticesArr;
      nodalNotices = nodalNoticesArr;
      bloChangeRecords = bloChangeRecordsArr;
      javakEntries = javakEntriesArr;
      constituencyEnabled = enabled;
      timestamp = Time.now();
      dataVersion = dataVersionFresh;
      pollingStations = pollingStationsArr;
      blos = blosArr;
      appointmentOrders = ordersArr;
      bloNotices = bloNoticesArr;
      honorariumConfig = honorariumConfigOpt;
      quarterlyPayments = quarterlyArr;
      extraPayments = extraArr;
      appointmentDateChanges = dateChangesArr;
      bankDetails = bankDetailsOpt;
      supervisorBankDetails = supervisorBankDetailsOpt;
    };
  };

  // Bulk migrate — polling stations (typed array)
  public shared func bulkMigratePollingStationsTyped(constituencyId : Text, stations : [CommonTypes.PollingStation]) : async () {
    let inner : Map.Map<Text, CommonTypes.PollingStation> = switch (constituencyPollingStations.get(constituencyId)) {
      case null {
        let m = Map.empty<Text, CommonTypes.PollingStation>();
        constituencyPollingStations.add(constituencyId, m);
        m;
      };
      case (?m) { m };
    };
    for (station in stations.values()) {
      inner.add(station.stationNumber, station);
    };
  };

  // Bulk migrate — BLOs (typed array)
  public shared func bulkMigrateBLOsTyped(constituencyId : Text, blos : [CommonTypes.BLO]) : async () {
    let inner : Map.Map<Text, CommonTypes.BLO> = switch (constituencyBLOs.get(constituencyId)) {
      case null {
        let m = Map.empty<Text, CommonTypes.BLO>();
        constituencyBLOs.add(constituencyId, m);
        m;
      };
      case (?m) { m };
    };
    for (blo in blos.values()) {
      inner.add(blo.id.toText(), blo);
    };
  };

  // Bulk migrate — appointment orders (typed array)
  public shared func bulkMigrateAppointmentOrdersTyped(constituencyId : Text, orders : [CommonTypes.AppointmentOrder]) : async () {
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
  };

  // Bulk migrate — BLO notices (typed array)
  public shared func bulkMigrateBLONoticesTyped(constituencyId : Text, notices : [CommonTypes.Notice]) : async () {
    let inner : Map.Map<Nat, CommonTypes.Notice> = switch (constituencyBLONotices.get(constituencyId)) {
      case null {
        let m = Map.empty<Nat, CommonTypes.Notice>();
        constituencyBLONotices.add(constituencyId, m);
        m;
      };
      case (?m) { m };
    };
    for (notice in notices.values()) {
      // Idempotent: only store if not already present
      if (not inner.containsKey(notice.id)) {
        inner.add(notice.id, notice);
      };
    };
  };

  // Bulk migrate — honorarium data (typed)
  public shared func bulkMigrateHonorariumTyped(
    constituencyId : Text,
    config : ?HonorariumTypes.HonorariumConfig,
    quarterly : [HonorariumTypes.QuarterlyPayment],
    extra : [HonorariumTypes.ExtraPayment],
    dateChanges : [HonorariumTypes.AppointmentDateChange],
    bankDetailsArg : ?HonorariumTypes.BankDetails,
    supervisorBankDetailsArg : ?HonorariumTypes.BankDetails,
  ) : async () {
    // Store honorarium config
    switch (config) {
      case null {};
      case (?cfg) { honorariumConfigs.add(constituencyId, cfg) };
    };
    // Store quarterly payments
    let qInner : Map.Map<Text, HonorariumTypes.QuarterlyPayment> = switch (quarterlyPayments.get(constituencyId)) {
      case null {
        let m = Map.empty<Text, HonorariumTypes.QuarterlyPayment>();
        quarterlyPayments.add(constituencyId, m);
        m;
      };
      case (?m) { m };
    };
    for (qp in quarterly.values()) {
      qInner.add(qp.id, qp);
    };
    // Store extra payments
    let eInner : Map.Map<Text, HonorariumTypes.ExtraPayment> = switch (extraPayments.get(constituencyId)) {
      case null {
        let m = Map.empty<Text, HonorariumTypes.ExtraPayment>();
        extraPayments.add(constituencyId, m);
        m;
      };
      case (?m) { m };
    };
    for (ep in extra.values()) {
      eInner.add(ep.id, ep);
    };
    // Store appointment date changes
    let dcInner : Map.Map<Text, HonorariumTypes.AppointmentDateChange> = switch (appointmentDateChanges.get(constituencyId)) {
      case null {
        let m = Map.empty<Text, HonorariumTypes.AppointmentDateChange>();
        appointmentDateChanges.add(constituencyId, m);
        m;
      };
      case (?m) { m };
    };
    for (dc in dateChanges.values()) {
      dcInner.add(dc.id, dc);
    };
    // Store bank details
    switch (bankDetailsArg) {
      case null {};
      case (?bd) { bloBankDetails.add(constituencyId, bd) };
    };
    switch (supervisorBankDetailsArg) {
      case null {};
      case (?sbd) { supervisorBankDetailsRef.add(constituencyId, sbd) };
    };
  };
};
