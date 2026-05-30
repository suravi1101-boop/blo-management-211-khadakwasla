module {
  // ConstituencyConfig — tracks enable/disable and admin credentials per constituency.
  // Multi-constituency ready: keyed by id (e.g. "211", "212", …).
  public type ConstituencyConfig = {
    id : Text;                // e.g. "211"
    name : Text;              // Marathi name e.g. "खडकवासला"
    isEnabled : Bool;
    adminPassword : Text;
    passwordChangedAt : Int;
    loginAttempts : Nat;
    lockedUntil : ?Int;
    updatedAt : Int;
  };

  // PasswordHistoryEntry — immutable audit log entry per password change
  public type PasswordHistoryEntry = {
    timestamp      : Int;
    changedBy      : Text;
    role           : Text;   // "supervisor" | "nodal" | "admin" | "superadmin"
    constituencyId : Text;
    identifier     : Text;   // user mobile/id
    note           : Text;   // free-form note
    action         : Text;   // "created" | "changed" | "reset"
    maskedPassword : Text;   // last 2 chars visible, rest masked
  };

  // ─── Keyed bucket types (stable-array friendly) ──────────────────────────
  // Each domain stores data as [(constituencyId, [record])] stable arrays.
  // We rebuild lookup during functions — no HashMap needed.

  public type PollingStationBucket = {
    constituencyId : Text;
    stations : [PollingStation];
  };

  public type PollingStation = {
    id : Text;                   // unique e.g. "211-001"
    partNumber : Text;           // part number as text (e.g. "1")
    partName : Text;
    location : Text;
    constituencyId : Text;
    latitude : ?Float;
    longitude : ?Float;
    assignedSupervisorId : ?Text;
    bloId : ?Text;
    createdAt : Int;
    updatedAt : Int;
  };

  public type BLO = {
    id : Text;
    partNumber : Text;           // polling station part number
    partName : Text;
    name : Text;
    phone : Text;
    email : ?Text;
    designation : Text;
    voterId : ?Text;             // मतदान ओळखपत्र क्रमांक (EPIC number)
    aadhaar : ?Text;
    bankAccount : ?Text;
    officeAddress : ?Text;
    constituencyId : Text;
    isExcellent : Bool;
    appointmentOrderId : ?Text;
    status : Text;               // "active" | "inactive" | "pending"
    createdAt : Int;
    updatedAt : Int;
  };

  public type AppointmentOrder = {
    id : Text;
    orderNumber : Text;          // e.g. "BLO/211/2025/001"
    bloId : Text;
    constituencyId : Text;
    issuedDate : Int;
    content : Text;              // Marathi order text
    status : Text;               // "draft" | "issued" | "cancelled"
    createdAt : Int;
  };

  public type Supervisor = {
    id : Text;
    name : Text;
    phone : Text;
    designation : Text;
    password : ?Text;
    constituencyId : Text;
    assignedStationIds : [Text];
    isActive : Bool;
    loginAttempts : Nat;
    isLocked : Bool;
    createdAt : Int;
    updatedAt : Int;
  };

  public type NodalOfficer = {
    id : Text;
    name : Text;
    phone : Text;
    mobileNumber : ?Text;    // display/contact mobile (separate from login phone)
    designation : Text;
    password : ?Text;
    constituencyId : Text;
    assignedSupervisorIds : [Text];
    isActive : Bool;
    loginAttempts : Nat;
    isLocked : Bool;
    createdAt : Int;
    updatedAt : Int;
  };

  public type GPSLocation = {
    pollingStationId : Text;
    constituencyId   : Text;
    lat              : Float;
    lon              : Float;
    updatedBy        : Text;
    updatedByRole    : Text;
    updatedByName    : Text;
    updatedAt        : Int;
  };

  public type GPSTrackingRecord = {
    pollingStationId       : Text;
    partNumber             : Text;
    partName               : Text;
    location               : Text;
    constituencyId         : Text;
    gpsLat                 : ?Float;
    gpsLon                 : ?Float;
    gpsUpdatedAt           : ?Int;
    gpsUpdatedBy           : ?Text;
    gpsUpdatedByRole       : ?Text;
    gpsUpdatedByName       : ?Text;
    assignedBLOId          : ?Text;
    assignedBLOName        : ?Text;
    assignedBLOPhone       : ?Text;
    assignedSupervisorId   : ?Text;
    assignedSupervisorName : ?Text;
    assignedNodalOfficerId   : ?Text;
    assignedNodalOfficerName : ?Text;
  };

  // AavakJavakEntry — आवक-जावक register entry
  public type AavakJavakEntry = {
    id              : Text;
    referenceNumber : Text;        // auto-generated: आ-{YYYY}-{seq} or ज-{YYYY}-{seq}
    entryType       : Text;        // "inward" | "outward"
    documentType    : Text;
    fromTo          : Text;
    description     : Text;
    date            : Int;
    constituency    : Text;
    linkedDocId     : ?Text;
    createdBy       : Text;
  };

  // OfficialDocumentMeta — metadata for शासकीय दस्तऐवज (file stored in object-storage)
  public type OfficialDocumentMeta = {
    id           : Text;
    name         : Text;
    category     : Text;
    uploadDate   : Int;
    uploadedBy   : Text;
    fileKey      : Text;
    constituency : Text;
  };

  // PrintRecord — immutable log of each print action on a notice
  public type PrintRecord = {
    printedBy     : Text;
    printedAt     : Int;
    printedByName : Text;
  };

  // NoticeRecipientStatus — per-recipient delivery tracking
  public type NoticeRecipientStatus = {
    recipientId   : Text;
    recipientType : Text;  // "blo" | "supervisor" | "nodal"
    deliveryStatus : Text; // "pending" | "delivered" | "read"
    deliveredAt   : ?Int;
    readAt        : ?Int;
  };

  // Notice — issued by admin / nodal officer / supervisor
  public type Notice = {
    id               : Text;
    constituencyId   : Text;
    noticeNumber     : Text;  // auto-generated e.g. "NOT/211/2025/001"
    noticeType       : Text;  // "कारणे दाखवा नोटीस" | "नोटीस 1" | "नोटीस 2" | "नोटीस 3" | "शिस्तभंगाची कारवाई" | "पोलीस कारवाई"
    issuingAuthority : Text;  // "तहसीलदार" | "उपविभागीय अधिकारी"
    subject          : Text;
    content          : Text;
    issuedDate       : Int;
    status           : Text;  // "draft" | "issued" | "pending" | "delivered" | "cancelled"
    createdByRole    : Text;  // "admin" | "nodal_officer" | "supervisor"
    createdById      : Text;
    createdByName    : Text;
    recipientType    : Text;  // "blo" | "supervisor" | "nodal_officer" | "all"
    recipientId      : Text;  // specific ID or "all"
    printHistory     : [PrintRecord];
    noticeRecipients : [NoticeRecipientStatus]; // per-recipient delivery status
    clearedForHonorarium : Bool;  // supervisor cleared this notice so BLO can receive honorarium again
    clearedAt        : ?Int;
    clearedById      : ?Text;
    clearedByName    : ?Text;
    createdAt        : Int;
    updatedAt        : Int;
  };
  // NoticeSettings — per-constituency notice header and signing officer details
  public type NoticeSettings = {
    constituencyId              : Text;
    noticeHeaderLine1           : Text;  // e.g. "२११ खडकवासला विधानसभा मतदार संघ तथा तहसिलदार हवेली (पुणे)"
    noticeHeaderLine2           : Text;  // e.g. "यांचे कार्यालय शुक्रवार पेठ, खडकमाळ आळी"
    noticeHeaderPhone           : Text;  // e.g. "020-24472348"
    noticeHeaderEmail           : Text;  // e.g. "211 khadakwaslaac@gmail.com"
    noticeOfficerName           : Text;  // e.g. "(डॉ. अर्चना निकम)"
    noticeOfficerDesignation    : Text;  // e.g. "सहा.मतदार नोंदणी अधिकारी"
    noticeOfficerConstituency   : Text;  // e.g. "२११ खडकवासला विधानसभा मतदार संघ"
    noticeOfficerTehsil         : Text;  // e.g. "तथा तहसिलदार हवेली (पुणे)"
    updatedAt                   : Int;
  };

  // OrderSettings — per-constituency BLO appointment order header and signing officer details
  public type OrderSettings = {
    constituencyId             : Text;
    orderHeaderLine1           : Text;  // e.g. "२११ खडकवासला विधानसभा मतदार संघ तथा तहसिलदार कार्यालय हवेली (पुणे)"
    orderHeaderLine2           : Text;  // e.g. "शुक्रवार पेठ खडकमाळ आळी., ता. हवेली, जि. पुणे"
    orderHeaderPhone           : Text;  // e.g. "77009737312"
    orderHeaderEmail           : Text;  // e.g. "khadakwaslaac@gmail.com"
    orderOfficerName           : Text;  // e.g. "डॉ. अर्चना निकम"
    orderOfficerDesignation    : Text;  // e.g. "सहा.मतदार नोंदणी अधिकारी"
    orderOfficerConstituency   : Text;  // e.g. "२११ खडकवासला विधानसभा मतदार संघ"
    orderOfficerTehsil         : Text;  // e.g. "तथा तहसिलदार हवेली, (पुणे)"
    updatedAt                  : Int;
  };
};
