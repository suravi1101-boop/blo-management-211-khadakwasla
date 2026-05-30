import T "types/records";

import Time "mo:core/Time";
import Array "mo:core/Array";
import AavakJavakMixin "mixins/aavak-javak-api";
import OfficialDocsMixin "mixins/official-docs-api";
import ConstituencyMixin "mixins/constituency-api";
import PollingStationMixin "mixins/polling-station-api";
import BloMixin "mixins/blo-api";
import SupervisorMixin "mixins/supervisor-api";
import GPSDataMixin "mixins/gps-data-api";
import NoticeMixin "mixins/notice-data-api";
import HonorariumMixin "mixins/honorarium-api";
import Map "mo:core/Map";
import HonorariumTypes "types/honorarium";










// ─── EOP state ───────────────────────────────────────────────────────────────
// Enhanced Orthogonal Persistence: no `stable` keyword needed.
// `let state` is a single record of var fields passed by reference to all mixins.
// Mutations inside mixins persist automatically across upgrades.









actor {
  // ─── Constituency seed ───────────────────────────────────────────────────
  let CONSTITUENCIES : [(Text, Text)] = [
    ("211", "खडकवासळा"),
    ("212", "सिंहगड रोड"),
    ("213", "पर्वती"),
    ("214", "हडपसर"),
    ("215", "पुणे छावणी"),
    ("216", "वडगाव शेरी"),
    ("217", "शिवाजीनगर"),
    ("218", "कोथरूड"),
    ("219", "खडकी"),
    ("220", "पाषाण"),
    ("221", "शिरूर"),
    ("222", "दौंड"),
    ("223", "इंदापूर"),
    ("224", "बारामती"),
    ("225", "पुरंदर"),
    ("226", "भोर"),
    ("227", "मावळ"),
    ("228", "चिंचवड"),
    ("229", "पिंपरी"),
    ("230", "भोसरी"),
    ("231", "उरुळी कांचन"),
  ];

  // ─── EOP state ──────────────────────────────────────────────────────────────
  // Enhanced Orthogonal Persistence: ALL actor-level bindings (let/var) are
  // automatically persisted across canister upgrades — no `stable` keyword needed.
  // Mutable fields in this record are passed by reference to mixins so their
  // writes are reflected back here and persisted.
  let state = {
    var constituencyConfigs  : [T.ConstituencyConfig]   = [];
    var superAdminPwd        : Text                     = "superadmin123";
    var pollingStations      : [T.PollingStation]       = [];
    var blos                 : [T.BLO]                  = [];
    var appointmentOrders    : [T.AppointmentOrder]     = [];
    var orderCounters        : [(Text, Nat)]            = [];
    var supervisors          : [T.Supervisor]           = [];
    var nodalOfficers        : [T.NodalOfficer]         = [];
    var gpsLocationsList     : [T.GPSLocation]          = [];
    var passwordHistoryList  : [T.PasswordHistoryEntry] = [];
    var aavakJavakEntries    : [T.AavakJavakEntry]      = [];
    var aavakInwardCounters  : [(Text, Nat)]            = [];
    var aavakOutwardCounters : [(Text, Nat)]            = [];
    var officialDocsMeta     : [T.OfficialDocumentMeta] = [];
    var notices              : [T.Notice]               = [];
    var noticeCounters       : [(Text, Nat)]            = [];
    var honorariumRecords              : [HonorariumTypes.HonorariumRecord]       = [];
    var honorariumEligibilityOverrides : [HonorariumTypes.HonorariumEligibility] = [];
    // Maps are persistent via EOP — they are NOT re-initialized on upgrade,
    // only on a fresh canister install.
    var bloBankDetails              : Map.Map<Text, HonorariumTypes.BankDetails>      = Map.empty();
    var supervisorBankDetails       : Map.Map<Text, HonorariumTypes.BankDetails>      = Map.empty();
    var honorariumConfigs           : Map.Map<Text, HonorariumTypes.HonorariumConfig> = Map.empty();
    var supervisorHonorariumConfigs : Map.Map<Text, HonorariumTypes.HonorariumConfig> = Map.empty();
    var quarterlyPayments           : Map.Map<Text, Map.Map<Text, HonorariumTypes.QuarterlyPayment>>         = Map.empty();
    var supervisorQuarterlyPayments : Map.Map<Text, Map.Map<Text, HonorariumTypes.QuarterlyPayment>>         = Map.empty();
    var extraPayments               : Map.Map<Text, Map.Map<Text, HonorariumTypes.ExtraPayment>>             = Map.empty();
    var appointmentDateChanges      : Map.Map<Text, Map.Map<Text, HonorariumTypes.AppointmentDateChange>>    = Map.empty();
    var supervisorHonorariumRequests : [HonorariumTypes.SupervisorHonorariumRequest]                         = [];
    var honorariumDistributions      : [HonorariumTypes.HonorariumDistribution]                              = [];
  };

  // Deletion history — top-level actor binding so it's compatible with old state
  var deleteHistory : [(Text, Text, Text, Text, Int)] = [];

  // Notice settings — kept outside state record for EOP stable compatibility
  var noticeSettings : [T.NoticeSettings] = [];

  // Order settings — kept outside state record for EOP stable compatibility
  var orderSettings : [T.OrderSettings] = [];

  // Seed all 21 constituencies once — only 211 enabled by default.
  do {
    let now = Time.now();
    for ((cid, cname) in CONSTITUENCIES.vals()) {
      var found = false;
      for (c in state.constituencyConfigs.vals()) {
        if (c.id == cid) { found := true };
      };
      if (not found) {
        state.constituencyConfigs := state.constituencyConfigs.concat([{
          id                = cid;
          name              = cname;
          isEnabled         = cid == "211";
          adminPassword     = "admin123";
          passwordChangedAt = 0;
          loginAttempts     = 0;
          lockedUntil       = null;
          updatedAt         = now;
        }]);
      };
    };
  };

  // Seed 211 default notice settings once if not already present
  do {
    var found211 = false;
    for (ns in noticeSettings.vals()) {
      if (ns.constituencyId == "211") { found211 := true };
    };
    if (not found211) {
      noticeSettings := noticeSettings.concat([{
        constituencyId            = "211";
        noticeHeaderLine1         = "२११ खडकवासला विधानसभा मतदार संघ तथा तहसिलदार हवेली (पुणे)";
        noticeHeaderLine2         = "यांचे कार्यालय शुक्रवार पेठ, खडकमाळ आळी  ता. हवेली, जि. पुणे";
        noticeHeaderPhone         = "020-24472348";
        noticeHeaderEmail         = "211 khadakwaslaac@gmail.com";
        noticeOfficerName         = "(डॉ. अर्चना निकम)";
        noticeOfficerDesignation  = "सहा.मतदार नोंदणी अधिकारी";
        noticeOfficerConstituency = "२११ खडकवासला विधानसभा मतदार संघ";
        noticeOfficerTehsil       = "तथा तहसिलदार हवेली (पुणे)";
        updatedAt                 = 0;
      }]);
    };
  };

  // Seed 211 default order settings once if not already present
  do {
    var found211Order = false;
    for (os in orderSettings.vals()) {
      if (os.constituencyId == "211") { found211Order := true };
    };
    if (not found211Order) {
      orderSettings := orderSettings.concat([{
        constituencyId           = "211";
        orderHeaderLine1         = "२११ खडकवासला विधानसभा मतदार संघ तथा तहसिलदार कार्यालय हवेली (पुणे)";
        orderHeaderLine2         = "शुक्रवार पेठ खडकमाळ आळी., ता. हवेली, जि. पुणे";
        orderHeaderPhone         = "77009737312";
        orderHeaderEmail         = "khadakwaslaac@gmail.com";
        orderOfficerName         = "डॉ. अर्चना निकम";
        orderOfficerDesignation  = "सहा.मतदार नोंदणी अधिकारी";
        orderOfficerConstituency = "२११ खडकवासला विधानसभा मतदार संघ";
        orderOfficerTehsil       = "तथा तहसिलदार हवेली, (पुणे)";
        updatedAt                = 0;
      }]);
    };
  };

  // ─── Mixin includes ──────────────────────────────────────────────────────
  /// Record a deletion event (type, name, deletedBy, reason) with current timestamp
  public shared func recordDeletion(recordType : Text, recordName : Text, deletedBy : Text, reason : Text) : async () {
    let entry : (Text, Text, Text, Text, Int) = (recordType, recordName, deletedBy, reason, Time.now());
    deleteHistory := deleteHistory.concat([entry]);
  };

  /// Return the full deletion history log
  public query func getDeleteHistory() : async [(Text, Text, Text, Text, Int)] {
    deleteHistory;
  };

  include ConstituencyMixin(state);
  include PollingStationMixin(state);
  include BloMixin(state);
  include SupervisorMixin(state);
  include GPSDataMixin(state);
  include NoticeMixin(state);
  // NoticeSettings — inlined directly (stable var, not part of state record)
  // Notice settings functions — inlined here since noticeSettings is a stable var
  // (cannot be wrapped in a record for mixin injection without breaking EOP compatibility)
  public query func getNoticeSettings(constituencyId : Text) : async ?T.NoticeSettings {
    var result : ?T.NoticeSettings = null;
    for (ns in noticeSettings.vals()) {
      if (ns.constituencyId == constituencyId) { result := ?ns };
    };
    result;
  };

  public shared func saveNoticeSettings(settings : T.NoticeSettings) : async Bool {
    let s : T.NoticeSettings = { settings with updatedAt = Time.now() };
    var found = false;
    noticeSettings := noticeSettings.map(func(ns) {
      if (ns.constituencyId == s.constituencyId) { found := true; s } else { ns }
    });
    if (not found) { noticeSettings := noticeSettings.concat([s]) };
    true;
  };

  // OrderSettings — inlined directly (stable var, not part of state record)
  // Wrapping stable var in a mixin wrapper object doesn't work — changes
  // to the wrapper field don't propagate back to the stable var.
  // So we inline directly like noticeSettings above.
  public query func getOrderSettings(constituencyId : Text) : async ?T.OrderSettings {
    var result : ?T.OrderSettings = null;
    for (os in orderSettings.vals()) {
      if (os.constituencyId == constituencyId) { result := ?os };
    };
    result;
  };

  public shared func saveOrderSettings(settings : T.OrderSettings) : async Bool {
    let s : T.OrderSettings = { settings with updatedAt = Time.now() };
    var found = false;
    orderSettings := orderSettings.map(func(os) {
      if (os.constituencyId == s.constituencyId) { found := true; s } else { os }
    });
    if (not found) { orderSettings := orderSettings.concat([s]) };
    true;
  };

  // Outward counter helpers — reuse aavakOutwardCounters in state.
  // Key format: "{constituencyId}-{year}"
  func _currentYear() : Text {
    let secs : Int = Time.now() / 1_000_000_000;
    let yearsSince2024 : Int = (secs - 1_704_067_200) / 31_536_000;
    let year : Int = 2024 + yearsSince2024;
    if (year < 2024) "2024" else if (year > 2099) "2099" else {
      let y : Nat = if (year >= 0) year.toNat() else (-year).toNat();
      y.toText();
    };
  };

  func _lookupOutwardCounter(cid : Text) : Nat {
    let key = cid # "-" # _currentYear();
    for ((k, v) in state.aavakOutwardCounters.vals()) {
      if (k == key) return v;
    };
    0;
  };

  func _upsertOutwardCounter(cid : Text, value : Nat) {
    let key = cid # "-" # _currentYear();
    var found = false;
    state.aavakOutwardCounters := state.aavakOutwardCounters.map(func((k, v)) {
      if (k == key) { found := true; (k, value) } else { (k, v) };
    });
    if (not found) {
      state.aavakOutwardCounters := state.aavakOutwardCounters.concat([(key, value)]);
    };
  };

  /// Returns the NEXT outward counter number for a constituency WITHOUT incrementing.
  /// Use this to preview the reference number before saving the order.
  public query func getNextOutwardCounter(constituencyId : Text) : async Nat {
    _lookupOutwardCounter(constituencyId) + 1;
  };

  /// Increments the outward counter for a constituency and returns the new value.
  /// Call this when the order is actually saved/issued.
  public shared func incrementOutwardCounter(constituencyId : Text) : async Nat {
    let next = _lookupOutwardCounter(constituencyId) + 1;
    _upsertOutwardCounter(constituencyId, next);
    next;
  };

  include HonorariumMixin(state);
  include AavakJavakMixin(state);
  include OfficialDocsMixin(state);

  /// Simple health check — confirms canister is live
  public query func healthCheck() : async Text { "OK" };
};
