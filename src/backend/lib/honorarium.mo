import T "../types/records";
import Map "mo:core/Map";
import HonorariumTypes "../types/honorarium";
import Time "mo:core/Time";

module {
  public type BankDetails           = HonorariumTypes.BankDetails;
  public type HonorariumConfig      = HonorariumTypes.HonorariumConfig;
  public type QuarterlyPayment      = HonorariumTypes.QuarterlyPayment;
  public type ExtraPayment          = HonorariumTypes.ExtraPayment;
  public type AppointmentDateChange = HonorariumTypes.AppointmentDateChange;
  public type HonorariumEligibility       = HonorariumTypes.HonorariumEligibility;
  public type HonorariumEligibilityResult = HonorariumTypes.HonorariumEligibilityResult;

  public type HonorariumRecord      = HonorariumTypes.HonorariumRecord;
  public type HonorariumSummary     = HonorariumTypes.HonorariumSummary;


  // ─── Honorarium Eligibility ──────────────────────────────────────────────

  /// Returns BLOs eligible for honorarium.
  /// A BLO is eligible if: (isActive AND no active uncleared notice) OR manual override.
  public func getHonorariumEligibleBLOs(
    constituencyId : Text,
    blos           : [T.BLO],
    notices        : [T.Notice],
    overrides      : [HonorariumEligibility],
  ) : [T.BLO] {
    let cBlos = blos.filter(func(b) { b.constituencyId == constituencyId });
    let activeNoticeIds = notices.filter(func(n) {
      n.constituencyId == constituencyId and
      n.status == "issued" and
      (not n.clearedForHonorarium) and
      (n.recipientType == "blo" or n.recipientType == "all")
    });
    cBlos.filter(func(b) {
      // Check manual override first
      let override = overrides.find(func(o) {
        o.bloId == b.id and o.constituencyId == constituencyId
      });
      switch (override) {
        case (?ov) { ov.isManuallyIncluded };
        case null {
          // Default eligibility: active and no active uncleared notice targeting this BLO
          if (b.status != "active") { false }
          else {
            let hasNotice = activeNoticeIds.find(func(n) {
              n.recipientId == b.id or n.recipientType == "all"
            });
            switch (hasNotice) {
              case (?_) { false };
              case null { true };
            };
          };
        };
      };
    });
  };

  /// Returns full eligibility details for all BLOs in a constituency.
  public func getHonorariumEligibilityResults(
    constituencyId : Text,
    blos           : [T.BLO],
    notices        : [T.Notice],
    overrides      : [HonorariumEligibility],
  ) : [HonorariumEligibilityResult] {
    let cBlos = blos.filter(func(b) { b.constituencyId == constituencyId });
    let activeNotices = notices.filter(func(n) {
      n.constituencyId == constituencyId and n.status == "issued" and (not n.clearedForHonorarium)
    });
    cBlos.map(func(b) {
      let override = overrides.find(func(o) {
        o.bloId == b.id and o.constituencyId == constituencyId
      });
      let hasNotice = activeNotices.find(func(n) {
        (n.recipientType == "blo" or n.recipientType == "all") and
        (n.recipientId == b.id or n.recipientType == "all")
      });
      let baseEligible = b.status == "active" and (switch (hasNotice) { case null true; case (?_) false });
      let (isEligible, exclusionReason, isManuallyOverridden) = switch (override) {
        case (?ov) {
          if (ov.isManuallyIncluded) {
            let reason : ?Text = if (not (b.status == "active")) {
              if (b.status == "inactive") { ?("BLO निष्क्रिय आहे (manual override)") }
              else { ?("नोटीस दिली आहे (manual override)") }
            } else { null };
            (true, reason, true)
          } else {
            let reason : ?Text = if (b.status != "active") { ?("BLO निष्क्रिय आहे") }
              else { ?("manual override: वगळले") };
            let reasonText = switch (reason) { case (?r) r; case null "" };
            (false, ?reasonText, true)
          }
        };
        case null {
          if (b.status != "active") { (false, ?("BLO निष्क्रिय आहे"), false) }
          else switch (hasNotice) {
            case (?_) { (false, ?("नोटीस दिली आहे"), false) };
            case null  { (true, null, false) };
          };
        };
      };
      {
        bloId              = b.id;
        bloName            = b.name;
        partNumber         = b.partNumber;
        isEligible;
        exclusionReason;
        isManuallyOverridden;
      } : HonorariumEligibilityResult
    });
  };

  /// Expose current time for use in mixins
  public func currentTime() : Int { Time.now() };

  // ─── HonorariumRecord CRUD ───────────────────────────────────────────────

  public func createHonorariumRecord(
    records : [HonorariumRecord],
    record  : HonorariumRecord,
  ) : [HonorariumRecord] {
    let others = records.filter(func(r) { r.id != record.id });
    others.concat([record]);
  };

  public func approveHonorarium(
    records      : [HonorariumRecord],
    recordId     : Text,
    approvedById : Text,
  ) : [HonorariumRecord] {
    let now = Time.now();
    records.map(func(r) {
      if (r.id == recordId) {
        { r with status = "approved"; approvedBy = ?approvedById; approvedAt = ?now }
      } else { r }
    });
  };

  public func markHonorariumPaid(
    records  : [HonorariumRecord],
    recordId : Text,
  ) : [HonorariumRecord] {
    let now = Time.now();
    records.map(func(r) {
      if (r.id == recordId) {
        { r with status = "paid"; paidAt = ?now }
      } else { r }
    });
  };

  public func getHonorariumByConstituency(
    records        : [HonorariumRecord],
    constituencyId : Text,
  ) : [HonorariumRecord] {
    records.filter(func(r) { r.constituencyId == constituencyId });
  };

  public func getHonorariumBySupervisor(
    records      : [HonorariumRecord],
    supervisorId : Text,
  ) : [HonorariumRecord] {
    records.filter(func(r) {
      switch (r.supervisorId) {
        case (?sid) { sid == supervisorId };
        case null   { false };
      }
    });
  };

  public func getHonorariumByBLO(
    records : [HonorariumRecord],
    bloId   : Text,
  ) : [HonorariumRecord] {
    records.filter(func(r) { r.bloId == bloId });
  };

  public func getHonorariumSummary(
    records        : [HonorariumRecord],
    constituencyId : Text,
  ) : HonorariumSummary {
    let cRecords = records.filter(func(r) { r.constituencyId == constituencyId });
    var pending  : Nat = 0;
    var approved : Nat = 0;
    var paid     : Nat = 0;
    for (r in cRecords.values()) {
      if (r.status == "pending")       { pending  += 1 }
      else if (r.status == "approved") { approved += 1 }
      else if (r.status == "paid")     { paid     += 1 };
    };
    {
      constituencyId;
      totalPending  = pending;
      totalApproved = approved;
      totalPaid     = paid;
      total         = pending + approved + paid;
    };
  };

  // BankDetails
  public func setBLOBankDetails(
    store : Map.Map<Text, BankDetails>,
    bloId : Text,
    details : BankDetails,
  ) : () {
    store.add(bloId, details);
  };

  public func getBLOBankDetails(
    store : Map.Map<Text, BankDetails>,
    bloId : Text,
  ) : ?BankDetails {
    store.get(bloId);
  };

  public func setSupervisorBankDetails(
    store : Map.Map<Text, BankDetails>,
    supervisorId : Text,
    details : BankDetails,
  ) : () {
    store.add(supervisorId, details);
  };

  public func getSupervisorBankDetails(
    store : Map.Map<Text, BankDetails>,
    supervisorId : Text,
  ) : ?BankDetails {
    store.get(supervisorId);
  };

  // HonorariumConfig
  public func setHonorariumConfig(
    store : Map.Map<Text, HonorariumConfig>,
    constituencyId : Text,
    config : HonorariumConfig,
  ) : () {
    store.add(constituencyId, config);
  };

  public func getHonorariumConfig(
    store : Map.Map<Text, HonorariumConfig>,
    constituencyId : Text,
  ) : ?HonorariumConfig {
    store.get(constituencyId);
  };

  public func setSupervisorHonorariumConfig(
    store : Map.Map<Text, HonorariumConfig>,
    constituencyId : Text,
    config : HonorariumConfig,
  ) : () {
    store.add(constituencyId, config);
  };

  public func getSupervisorHonorariumConfig(
    store : Map.Map<Text, HonorariumConfig>,
    constituencyId : Text,
  ) : ?HonorariumConfig {
    store.get(constituencyId);
  };

  // QuarterlyPayment
  public func addQuarterlyPayment(
    store : Map.Map<Text, Map.Map<Text, QuarterlyPayment>>,
    constituencyId : Text,
    payment : QuarterlyPayment,
  ) : () {
    let inner = switch (store.get(constituencyId)) {
      case (?m) { m };
      case null {
        let m = Map.empty<Text, QuarterlyPayment>();
        store.add(constituencyId, m);
        m;
      };
    };
    inner.add(payment.id, payment);
  };

  public func updateQuarterlyPayment(
    store : Map.Map<Text, Map.Map<Text, QuarterlyPayment>>,
    constituencyId : Text,
    payment : QuarterlyPayment,
  ) : () {
    switch (store.get(constituencyId)) {
      case null {};
      case (?inner) { inner.add(payment.id, payment) };
    };
  };

  public func getQuarterlyPayments(
    store : Map.Map<Text, Map.Map<Text, QuarterlyPayment>>,
    constituencyId : Text,
  ) : [QuarterlyPayment] {
    switch (store.get(constituencyId)) {
      case null { [] };
      case (?inner) { inner.values().toArray() };
    };
  };

  public func addSupervisorQuarterlyPayment(
    store : Map.Map<Text, Map.Map<Text, QuarterlyPayment>>,
    constituencyId : Text,
    payment : QuarterlyPayment,
  ) : () {
    let inner = switch (store.get(constituencyId)) {
      case (?m) { m };
      case null {
        let m = Map.empty<Text, QuarterlyPayment>();
        store.add(constituencyId, m);
        m;
      };
    };
    inner.add(payment.id, payment);
  };

  public func updateSupervisorQuarterlyPayment(
    store : Map.Map<Text, Map.Map<Text, QuarterlyPayment>>,
    constituencyId : Text,
    payment : QuarterlyPayment,
  ) : () {
    switch (store.get(constituencyId)) {
      case null {};
      case (?inner) { inner.add(payment.id, payment) };
    };
  };

  public func getSupervisorQuarterlyPayments(
    store : Map.Map<Text, Map.Map<Text, QuarterlyPayment>>,
    constituencyId : Text,
  ) : [QuarterlyPayment] {
    switch (store.get(constituencyId)) {
      case null { [] };
      case (?inner) { inner.values().toArray() };
    };
  };

  // ExtraPayment
  public func addExtraPayment(
    store : Map.Map<Text, Map.Map<Text, ExtraPayment>>,
    constituencyId : Text,
    payment : ExtraPayment,
  ) : () {
    let inner = switch (store.get(constituencyId)) {
      case (?m) { m };
      case null {
        let m = Map.empty<Text, ExtraPayment>();
        store.add(constituencyId, m);
        m;
      };
    };
    inner.add(payment.id, payment);
  };

  public func getExtraPayments(
    store : Map.Map<Text, Map.Map<Text, ExtraPayment>>,
    constituencyId : Text,
  ) : [ExtraPayment] {
    switch (store.get(constituencyId)) {
      case null { [] };
      case (?inner) { inner.values().toArray() };
    };
  };

  // AppointmentDateChange
  public func addAppointmentDateChange(
    store : Map.Map<Text, Map.Map<Text, AppointmentDateChange>>,
    constituencyId : Text,
    change : AppointmentDateChange,
  ) : () {
    let inner = switch (store.get(constituencyId)) {
      case (?m) { m };
      case null {
        let m = Map.empty<Text, AppointmentDateChange>();
        store.add(constituencyId, m);
        m;
      };
    };
    inner.add(change.id, change);
  };

  public func getAppointmentDateChanges(
    store : Map.Map<Text, Map.Map<Text, AppointmentDateChange>>,
    constituencyId : Text,
  ) : [AppointmentDateChange] {
    switch (store.get(constituencyId)) {
      case null { [] };
      case (?inner) { inner.values().toArray() };
    };
  };
};
