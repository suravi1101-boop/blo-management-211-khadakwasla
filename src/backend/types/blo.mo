module {
  // BLO (Booth Level Officer)
  public type BLO = {
    id            : Text;
    partNumber    : Nat;
    partName      : Text;
    name          : Text;
    phone         : Text;
    email         : ?Text;
    designation   : Text;
    voterId       : ?Text; // मतदान ओळखपत्र क्रमांक (EPIC number)
    aadhaar       : ?Text;
    bankAccount   : ?Text;
    constituencyId: Text;
    isExcellent   : Bool;
    appointmentOrderId : ?Text;
    status        : Text; // "active" | "inactive" | "pending"
    createdAt     : Int;
    updatedAt     : Int;
  };

  // Appointment order
  public type AppointmentOrder = {
    id             : Text;
    orderNumber    : Text; // e.g. "BLO/211/2025/001"
    bloId          : Text;
    constituencyId : Text;
    issuedDate     : Int;
    content        : Text; // Marathi order text
    status         : Text; // "draft" | "issued" | "cancelled"
    createdAt      : Int;
  };

};
