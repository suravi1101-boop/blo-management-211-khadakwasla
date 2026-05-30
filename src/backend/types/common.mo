module {
  // Polling station — supports multiple constituencies (multi-constituency ready)
  public type PollingStation = {
    id : Text; // unique e.g. "211-001"
    partNumber : Nat;
    partName : Text;
    location : Text;
    constituencyId : Text; // e.g. "211"
    latitude : ?Float;
    longitude : ?Float;
    assignedSupervisorId : ?Text;
    bloId : ?Text;
    createdAt : Int; // nanoseconds
    updatedAt : Int; // nanoseconds
  };

  // PrintRecord — immutable log entry per print action on a notice
  public type PrintRecord = {
    printedBy     : Text; // user id who printed
    printedAt     : Int;  // nanoseconds
    printedByName : Text;
  };

  // Notice — issued by admin / nodal officer to supervisors / BLOs
  public type Notice = {
    id              : Text;
    constituencyId  : Text;
    noticeNumber    : Text;  // auto-generated e.g. "NOT/211/2025/001"
    subject         : Text;
    content         : Text;
    issuedDate      : Int;
    status          : Text;  // "draft" | "issued" | "cancelled"
    // --- who created it ---
    createdByRole   : Text;  // "admin" | "nodal_officer" | "supervisor"
    createdById     : Text;  // ID of the creator
    createdByName   : Text;  // display name
    // --- recipient ---
    recipientType   : Text;  // "blo" | "supervisor" | "nodal_officer" | "all"
    recipientId     : Text;  // specific ID or "all"
    // --- print history ---
    printHistory    : [PrintRecord];
    createdAt       : Int;
    updatedAt       : Int;
  };
};
