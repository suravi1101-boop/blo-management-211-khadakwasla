import HonorariumLib "../lib/honorarium";
import Map "mo:core/Map";
import HonorariumTypes "../types/honorarium";
import T "../types/records";

mixin (state : {
  var honorariumRecords                : [HonorariumTypes.HonorariumRecord];
  var honorariumEligibilityOverrides   : [HonorariumTypes.HonorariumEligibility];
  var blos                             : [T.BLO];
  var notices                          : [T.Notice];
  var bloBankDetails                   : Map.Map<Text, HonorariumTypes.BankDetails>;
  var supervisorBankDetails            : Map.Map<Text, HonorariumTypes.BankDetails>;
  var honorariumConfigs                : Map.Map<Text, HonorariumTypes.HonorariumConfig>;
  var supervisorHonorariumConfigs      : Map.Map<Text, HonorariumTypes.HonorariumConfig>;
  var quarterlyPayments                : Map.Map<Text, Map.Map<Text, HonorariumTypes.QuarterlyPayment>>;
  var supervisorQuarterlyPayments      : Map.Map<Text, Map.Map<Text, HonorariumTypes.QuarterlyPayment>>;
  var extraPayments                    : Map.Map<Text, Map.Map<Text, HonorariumTypes.ExtraPayment>>;
  var appointmentDateChanges           : Map.Map<Text, Map.Map<Text, HonorariumTypes.AppointmentDateChange>>;
  var supervisorHonorariumRequests     : [HonorariumTypes.SupervisorHonorariumRequest];
  var honorariumDistributions          : [HonorariumTypes.HonorariumDistribution];
}) {
  // ─── HonorariumRecord ──────────────────────────────────────────────────────────

  public shared func createHonorariumRecord(
    record : HonorariumTypes.HonorariumRecord,
  ) : async Bool {
    state.honorariumRecords := HonorariumLib.createHonorariumRecord(
      state.honorariumRecords, record
    );
    true;
  };

  public shared func approveHonorarium(
    recordId     : Text,
    approvedById : Text,
  ) : async Bool {
    state.honorariumRecords := HonorariumLib.approveHonorarium(
      state.honorariumRecords, recordId, approvedById
    );
    true;
  };

  public shared func markHonorariumPaid(recordId : Text) : async Bool {
    state.honorariumRecords := HonorariumLib.markHonorariumPaid(
      state.honorariumRecords, recordId
    );
    true;
  };

  public query func getHonorariumByConstituency(
    constituencyId : Text,
  ) : async [HonorariumTypes.HonorariumRecord] {
    HonorariumLib.getHonorariumByConstituency(state.honorariumRecords, constituencyId);
  };

  public query func getHonorariumBySupervisor(
    supervisorId : Text,
  ) : async [HonorariumTypes.HonorariumRecord] {
    HonorariumLib.getHonorariumBySupervisor(state.honorariumRecords, supervisorId);
  };

  public query func getHonorariumByBLO(
    bloId : Text,
  ) : async [HonorariumTypes.HonorariumRecord] {
    HonorariumLib.getHonorariumByBLO(state.honorariumRecords, bloId);
  };

  public query func getHonorariumSummary(
    constituencyId : Text,
  ) : async HonorariumTypes.HonorariumSummary {
    HonorariumLib.getHonorariumSummary(state.honorariumRecords, constituencyId);
  };

  // ─── Honorarium Eligibility ───────────────────────────────────────────────

  /// Set a manual override for a BLO's honorarium eligibility.
  public shared func setHonorariumExcludeOverride(
    constituencyId     : Text,
    bloId              : Text,
    isManuallyIncluded : Bool,
    reason             : ?Text,
    overriddenBy       : ?Text,
  ) : async Bool {
    let now = HonorariumLib.currentTime();
    let newOverride : HonorariumTypes.HonorariumEligibility = {
      bloId;
      constituencyId;
      isManuallyIncluded;
      overrideReason = reason;
      overrideBy     = overriddenBy;
      overrideAt     = ?now;
    };
    let others = state.honorariumEligibilityOverrides.filter(
      func(o) { not (o.bloId == bloId and o.constituencyId == constituencyId) }
    );
    state.honorariumEligibilityOverrides := others.concat([newOverride]);
    true;
  };

  /// Get honorarium eligibility status for all BLOs in a constituency.
  public query func getHonorariumEligibility(
    constituencyId : Text,
  ) : async [HonorariumTypes.HonorariumEligibilityResult] {
    HonorariumLib.getHonorariumEligibilityResults(
      constituencyId,
      state.blos,
      state.notices,
      state.honorariumEligibilityOverrides,
    );
  };

  /// Get only the eligible BLOs for a constituency.
  public query func getEligibleBLOsForHonorarium(
    constituencyId : Text,
  ) : async [T.BLO] {
    HonorariumLib.getHonorariumEligibleBLOs(
      constituencyId,
      state.blos,
      state.notices,
      state.honorariumEligibilityOverrides,
    );
  };

  /// Restore honorarium eligibility for a BLO after supervisor clears their notice.
  /// Call this alongside clearNoticeForHonorarium to ensure eligibility is restored.
  public shared func restoreHonorariumEligibility(
    constituencyId : Text,
    bloId          : Text,
    clearedBy      : ?Text,
  ) : async Bool {
    let now = HonorariumLib.currentTime();
    let newOverride : HonorariumTypes.HonorariumEligibility = {
      bloId;
      constituencyId;
      isManuallyIncluded = true;
      overrideReason = ?("नोटीस निरसन — मानधनासाठी पुन्हा पात्र");
      overrideBy = clearedBy;
      overrideAt = ?now;
    };
    let others = state.honorariumEligibilityOverrides.filter(
      func(o) { not (o.bloId == bloId and o.constituencyId == constituencyId) }
    );
    state.honorariumEligibilityOverrides := others.concat([newOverride]);
    true;
  };

  public shared func getHonorariumByConstituencyFresh(
    constituencyId : Text,
  ) : async [HonorariumTypes.HonorariumRecord] {
    HonorariumLib.getHonorariumByConstituency(state.honorariumRecords, constituencyId);
  };

  // ─── BankDetails ─────────────────────────────────────────────────────────

  public shared func setBLOBankDetails(
    constituencyId : Text,
    bloId          : Text,
    details        : HonorariumTypes.BankDetails,
  ) : async () {
    ignore constituencyId;
    HonorariumLib.setBLOBankDetails(state.bloBankDetails, bloId, details);
  };

  public shared func getBLOBankDetails(
    constituencyId : Text,
    bloId          : Text,
  ) : async ?HonorariumTypes.BankDetails {
    ignore constituencyId;
    HonorariumLib.getBLOBankDetails(state.bloBankDetails, bloId);
  };

  public shared func setSupervisorBankDetails(
    constituencyId : Text,
    supervisorId   : Text,
    details        : HonorariumTypes.BankDetails,
  ) : async () {
    ignore constituencyId;
    HonorariumLib.setSupervisorBankDetails(
      state.supervisorBankDetails, supervisorId, details
    );
  };

  public shared func getSupervisorBankDetails(
    constituencyId : Text,
    supervisorId   : Text,
  ) : async ?HonorariumTypes.BankDetails {
    ignore constituencyId;
    HonorariumLib.getSupervisorBankDetails(state.supervisorBankDetails, supervisorId);
  };

  // ─── HonorariumConfig ───────────────────────────────────────────────────

  public shared func setHonorariumConfig(
    constituencyId : Text,
    config         : HonorariumTypes.HonorariumConfig,
  ) : async () {
    HonorariumLib.setHonorariumConfig(state.honorariumConfigs, constituencyId, config);
  };

  public shared func getHonorariumConfig(
    constituencyId : Text,
  ) : async ?HonorariumTypes.HonorariumConfig {
    HonorariumLib.getHonorariumConfig(state.honorariumConfigs, constituencyId);
  };

  public shared func setSupervisorHonorariumConfig(
    constituencyId : Text,
    config         : HonorariumTypes.HonorariumConfig,
  ) : async () {
    HonorariumLib.setSupervisorHonorariumConfig(
      state.supervisorHonorariumConfigs, constituencyId, config
    );
  };

  public shared func getSupervisorHonorariumConfig(
    constituencyId : Text,
  ) : async ?HonorariumTypes.HonorariumConfig {
    HonorariumLib.getSupervisorHonorariumConfig(
      state.supervisorHonorariumConfigs, constituencyId
    );
  };

  // ─── QuarterlyPayments (BLO) ────────────────────────────────────────────

  public shared func addQuarterlyPayment(
    constituencyId : Text,
    payment        : HonorariumTypes.QuarterlyPayment,
  ) : async () {
    HonorariumLib.addQuarterlyPayment(state.quarterlyPayments, constituencyId, payment);
  };

  public shared func updateQuarterlyPayment(
    constituencyId : Text,
    payment        : HonorariumTypes.QuarterlyPayment,
  ) : async () {
    HonorariumLib.updateQuarterlyPayment(state.quarterlyPayments, constituencyId, payment);
  };

  public query func getQuarterlyPayments(
    constituencyId : Text,
  ) : async [HonorariumTypes.QuarterlyPayment] {
    HonorariumLib.getQuarterlyPayments(state.quarterlyPayments, constituencyId);
  };

  // ─── QuarterlyPayments (Supervisor) ──────────────────────────────────────

  public shared func addSupervisorQuarterlyPayment(
    constituencyId : Text,
    payment        : HonorariumTypes.QuarterlyPayment,
  ) : async () {
    HonorariumLib.addSupervisorQuarterlyPayment(
      state.supervisorQuarterlyPayments, constituencyId, payment
    );
  };

  public shared func updateSupervisorQuarterlyPayment(
    constituencyId : Text,
    payment        : HonorariumTypes.QuarterlyPayment,
  ) : async () {
    HonorariumLib.updateSupervisorQuarterlyPayment(
      state.supervisorQuarterlyPayments, constituencyId, payment
    );
  };

  public query func getSupervisorQuarterlyPayments(
    constituencyId : Text,
  ) : async [HonorariumTypes.QuarterlyPayment] {
    HonorariumLib.getSupervisorQuarterlyPayments(
      state.supervisorQuarterlyPayments, constituencyId
    );
  };

  // ─── ExtraPayments ────────────────────────────────────────────────────────

  public shared func addExtraPayment(
    constituencyId : Text,
    payment        : HonorariumTypes.ExtraPayment,
  ) : async () {
    HonorariumLib.addExtraPayment(state.extraPayments, constituencyId, payment);
  };

  public query func getExtraPayments(
    constituencyId : Text,
  ) : async [HonorariumTypes.ExtraPayment] {
    HonorariumLib.getExtraPayments(state.extraPayments, constituencyId);
  };

  public shared func getExtraPaymentsFresh(
    constituencyId : Text,
  ) : async [HonorariumTypes.ExtraPayment] {
    HonorariumLib.getExtraPayments(state.extraPayments, constituencyId);
  };

  // ─── ExtraPayments by constituency (query) ──────────────────────────────

  public query func getExtraPaymentsByConstituency(
    constituencyId : Text,
  ) : async [HonorariumTypes.ExtraPayment] {
    HonorariumLib.getExtraPayments(state.extraPayments, constituencyId);
  };

  // ─── SupervisorHonorariumRequests ────────────────────────────────────────

  /// Supervisor marks which BLOs should receive honorarium for a year/quarter.
  public shared func createSupervisorHonorariumRequest(
    request : HonorariumTypes.SupervisorHonorariumRequest,
  ) : async Bool {
    // Upsert: remove any existing request with same id, then append
    let others = state.supervisorHonorariumRequests.filter(
      func(r) { r.id != request.id }
    );
    state.supervisorHonorariumRequests := others.concat([request]);
    true;
  };

  /// Returns all supervisor honorarium requests for a constituency.
  public query func getSupervisorHonorariumRequests(
    constituencyId : Text,
  ) : async [HonorariumTypes.SupervisorHonorariumRequest] {
    state.supervisorHonorariumRequests.filter(
      func(r) { r.constituencyId == constituencyId }
    );
  };

  /// Returns supervisor honorarium requests for a specific supervisor.
  public query func getSupervisorHonorariumRequestsBySupervisor(
    supervisorId : Text,
  ) : async [HonorariumTypes.SupervisorHonorariumRequest] {
    state.supervisorHonorariumRequests.filter(
      func(r) { r.supervisorId == supervisorId }
    );
  };

  // ─── HonorariumDistribution — admin sets custom base amount ──────────────

  /// Admin sets (or updates) the base amount for a constituency+year+quarter.
  public shared func setHonorariumDistribution(
    dist : HonorariumTypes.HonorariumDistribution,
  ) : async Bool {
    // Upsert by constituencyId + year + quarter
    let others = state.honorariumDistributions.filter(
      func(d) {
        not (d.constituencyId == dist.constituencyId and
             d.year          == dist.year and
             d.quarter       == dist.quarter)
      }
    );
    state.honorariumDistributions := others.concat([dist]);
    true;
  };

  /// Returns all honorarium distributions for a constituency.
  public query func getHonorariumDistributions(
    constituencyId : Text,
  ) : async [HonorariumTypes.HonorariumDistribution] {
    state.honorariumDistributions.filter(
      func(d) { d.constituencyId == constituencyId }
    );
  };

  // ─── AppointmentDateChanges ─────────────────────────────────────────────

  public shared func addAppointmentDateChange(
    constituencyId : Text,
    change         : HonorariumTypes.AppointmentDateChange,
  ) : async () {
    HonorariumLib.addAppointmentDateChange(
      state.appointmentDateChanges, constituencyId, change
    );
  };

  public query func getAppointmentDateChanges(
    constituencyId : Text,
  ) : async [HonorariumTypes.AppointmentDateChange] {
    HonorariumLib.getAppointmentDateChanges(state.appointmentDateChanges, constituencyId);
  };

  public shared func getAppointmentDateChangesFresh(
    constituencyId : Text,
  ) : async [HonorariumTypes.AppointmentDateChange] {
    HonorariumLib.getAppointmentDateChanges(state.appointmentDateChanges, constituencyId);
  };
};
