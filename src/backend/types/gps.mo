module {
  // GPSLocation — precise location tag for a polling station.
  // updatedByRole tracks which officer type last updated: "BLO" | "पर्यवेक्षक" | "नोडल अधिकारी" | "super_admin"
  public type GPSLocation = {
    pollingStationId : Text; // e.g. "211-001"
    stationId        : Text; // same as pollingStationId, kept for lib compatibility
    constituencyId   : Text;
    lat              : Float;
    lon              : Float;
    updatedBy        : Text; // officer id or name
    updatedByRole    : Text; // "BLO" | "पर्यवेक्षक" | "नोडल अधिकारी" | "super_admin"
    updatedByName    : Text; // human-readable name for display in tracking table
    updatedAt        : Int;
  };

  // GPSTrackingRecord — joined view of station + GPS + officers (Super Admin view)
  public type GPSTrackingRecord = {
    pollingStationId     : Text;
    partNumber           : Nat;
    partName             : Text;
    location             : Text;
    constituencyId       : Text;
    gpsLat               : ?Float;
    gpsLon               : ?Float;
    gpsUpdatedAt         : ?Int;
    gpsUpdatedBy         : ?Text;
    gpsUpdatedByRole     : ?Text;
    gpsUpdatedByName     : ?Text;
    assignedBLOId        : ?Text;
    assignedBLOName      : ?Text;
    assignedBLOPhone     : ?Text;
    assignedSupervisorId : ?Text;
    assignedSupervisorName : ?Text;
    assignedNodalOfficerId : ?Text;
    assignedNodalOfficerName : ?Text;
  };
};
