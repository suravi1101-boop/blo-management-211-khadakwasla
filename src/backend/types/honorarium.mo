// HonorariumEligibility — admin manual override for BLO honorarium eligibility
module {
  public type HonorariumEligibility = {
    bloId              : Text;
    constituencyId     : Text;
    isManuallyIncluded : Bool;   // true = override to include even if normally excluded
    overrideReason     : ?Text;
    overrideBy         : ?Text;
    overrideAt         : ?Int;
  };

  // ─── EligibilityResult — returned to frontend per BLO ───────────────────
  public type HonorariumEligibilityResult = {
    bloId              : Text;
    bloName            : Text;
    partNumber         : Text;
    isEligible         : Bool;
    exclusionReason    : ?Text;  // null when eligible
    isManuallyOverridden : Bool;
  };

  // ─── HonorariumRecord — core record per BLO per quarter ─────────────────
  public type HonorariumRecord = {
    id             : Text;
    constituencyId : Text;
    bloId          : Text;
    supervisorId   : ?Text;   // supervisor who manages this BLO
    quarter        : Text;   // e.g. "Q1-2024"
    amount         : Nat;
    status         : Text;   // "pending" | "approved" | "paid"
    createdAt      : Int;
    approvedBy     : ?Text;  // supervisor ID
    approvedAt     : ?Int;
    paidAt         : ?Int;
    note           : ?Text;
  };

  // ─── HonorariumSummary — aggregate counts per constituency ───────────────
  public type HonorariumSummary = {
    constituencyId : Text;
    totalPending   : Nat;
    totalApproved  : Nat;
    totalPaid      : Nat;
    total          : Nat;
  };

  // ─── Legacy types kept for existing bank-details / config / payment APIs ─
  public type BankDetails = {
    bankName      : Text;
    accountNumber : Text;
    ifscCode      : Text;
    branchName    : Text;
  };

  public type HonorariumConfig = {
    constituencyId  : Text;
    baseAmount      : Nat;
    currency        : Text;
    effectiveFrom   : Int;
  };

  public type QuarterlyPayment = {
    id             : Text;
    constituencyId : Text;
    bloId          : Text;
    quarter        : Text;
    amount         : Nat;
    status         : Text;  // "pending" | "approved" | "paid"
    createdAt      : Int;
    paidAt         : ?Int;
  };

  public type ExtraPayment = {
    id             : Text;
    constituencyId : Text;
    bloId          : Text;
    reason         : Text;
    amount         : Nat;
    status         : Text;
    createdAt      : Int;
    bloName        : ?Text;   // optional — for display
    partNumber     : ?Text;   // optional — for display
  };

  // ─── SupervisorHonorariumRequest — supervisor marks which BLOs/quarter to pay ─
  public type SupervisorHonorariumRequest = {
    id             : Text;
    constituencyId : Text;
    supervisorId   : Text;
    supervisorName : Text;
    year           : Text;
    quarter        : Text;
    bloIds         : [Text];
    requestedAt    : Int;
    status         : Text;   // "pending" | "approved" | "rejected"
  };

  // ─── HonorariumDistribution — admin sets custom base amount per constituency/quarter ─
  public type HonorariumDistribution = {
    id             : Text;
    constituencyId : Text;
    year           : Text;
    quarter        : Text;
    baseAmount     : Nat;
    createdBy      : Text;
    createdAt      : Int;
    note           : Text;
  };

  public type AppointmentDateChange = {
    id             : Text;
    constituencyId : Text;
    bloId          : Text;
    oldDate        : Int;
    newDate        : Int;
    reason         : Text;
    createdAt      : Int;
  };
};
