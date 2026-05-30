module {
  public type Supervisor = {
    id                 : Text;
    name               : Text;
    phone              : Text;
    designation        : Text;
    password           : ?Text; // null = not yet set; plain text (no hashing)
    constituencyId     : Text;
    assignedStationIds : [Text];
    isActive           : Bool;
    loginAttempts      : Nat;
    isLocked           : Bool;
    createdAt          : Int;
    updatedAt          : Int;
  };

  public type NodalOfficer = {
    id                    : Text;
    name                  : Text;
    phone                 : Text;  // login identifier
    mobileNumber          : ?Text; // display/contact mobile (separate from login phone)
    designation           : Text;
    password              : ?Text; // null = not yet set; plain text (no hashing)
    constituencyId        : Text;
    assignedSupervisorIds : [Text];
    isActive              : Bool;
    loginAttempts         : Nat;
    isLocked              : Bool;
    createdAt             : Int;
    updatedAt             : Int;
  };
};
