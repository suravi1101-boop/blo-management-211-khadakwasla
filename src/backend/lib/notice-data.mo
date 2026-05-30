import T "../types/records";
import Time "mo:core/Time";

module {
  public type Notice      = T.Notice;
  public type PrintRecord = T.PrintRecord;

  // ─── Helpers ─────────────────────────────────────────────────────────────

  func forCid(notices : [Notice], cid : Text) : [Notice] {
    notices.filter<Notice>(func(n) { n.constituencyId == cid });
  };

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  public func getNotices(
    notices       : [Notice],
    constituencyId : Text,
  ) : [Notice] {
    forCid(notices, constituencyId);
  };

  public func saveNotice(
    notices        : [Notice],
    notice         : Notice,
  ) : [Notice] {
    let others = notices.filter(func(n) { n.id != notice.id });
    others.concat([notice]);
  };

  public func updateNotice(
    notices : [Notice],
    notice  : Notice,
  ) : [Notice] {
    saveNotice(notices, notice);
  };

  public func deleteNotice(
    notices   : [Notice],
    noticeId  : Text,
  ) : [Notice] {
    notices.filter<Notice>(func(n) { n.id != noticeId });
  };

  public func bulkSaveNotices(
    notices    : [Notice],
    newNotices : [Notice],
  ) : [Notice] {
    var result = notices;
    for (notice in newNotices.values()) {
      result := saveNotice(result, notice);
    };
    result;
  };

  // ─── addNoticePrintRecord ────────────────────────────────────────────────
  // Returns updated notices array + the updated Notice (or null if not found)
  public func addNoticePrintRecord(
    notices       : [Notice],
    noticeId      : Text,
    printedBy     : Text,
    printedByName : Text,
  ) : ([Notice], ?Notice) {
    var updated : ?Notice = null;
    let result = notices.map(func(n) {
      if (n.id == noticeId) {
        let newRecord : PrintRecord = {
          printedBy;
          printedAt     = Time.now();
          printedByName;
        };
        let updatedNotice : Notice = { n with printHistory = n.printHistory.concat([newRecord]) };
        updated := ?updatedNotice;
        updatedNotice;
      } else { n };
    });
    (result, updated);
  };

  // ─── Query helpers ────────────────────────────────────────────────────────

  /// Returns notices visible to a specific recipient (by recipientId or recipientType = "all")
  public func getNoticesByRecipient(
    notices        : [Notice],
    constituencyId : Text,
    recipientId    : Text,
    _recipientType : Text,
  ) : [Notice] {
    forCid(notices, constituencyId).filter<Notice>(func(n) {
      n.recipientId == recipientId or n.recipientType == "all"
    });
  };

  /// Returns notices created by a specific person/role
  public func getNoticesByCreator(
    notices        : [Notice],
    constituencyId : Text,
    creatorId      : Text,
    creatorRole    : Text,
  ) : [Notice] {
    forCid(notices, constituencyId).filter<Notice>(func(n) {
      n.createdById == creatorId and n.createdByRole == creatorRole
    });
  };

  /// Role-aware notice view for dashboard
  public func getNoticesForDashboard(
    notices        : [Notice],
    constituencyId : Text,
    viewerRole     : Text,
    viewerId       : Text,
  ) : [Notice] {
    let cid = forCid(notices, constituencyId);
    switch (viewerRole) {
      case "admin" { cid };
      case "supervisor" {
        cid.filter<Notice>(func(n) {
          n.recipientId == viewerId or n.recipientType == "all"
        });
      };
      case "nodal_officer" {
        cid.filter<Notice>(func(n) {
          (n.createdById == viewerId and n.createdByRole == "nodal_officer") or
          (n.recipientId == viewerId and n.recipientType == "nodal_officer")
        });
      };
      case "blo" {
        cid.filter<Notice>(func(n) {
          n.recipientId == viewerId or n.recipientType == "all"
        });
      };
      case _ { [] };
    };
  };

  /// Returns notices for a supervisor:
  /// notices where recipientId is one of the BLO IDs assigned to that supervisor,
  /// OR notices directly targeting the supervisor, OR notices created by that supervisor.
  public func getNoticesForSupervisor(
    notices           : [Notice],
    constituencyId    : Text,
    supervisorId      : Text,
    assignedBloIds    : [Text],
  ) : [Notice] {
    forCid(notices, constituencyId).filter<Notice>(func(n) {
      // Notices created by this supervisor
      (n.createdById == supervisorId and n.createdByRole == "supervisor") or
      // Notices directly addressed to this supervisor
      (n.recipientId == supervisorId and n.recipientType == "supervisor") or
      // Notices addressed to BLOs under this supervisor
      (n.recipientType == "blo" and
        assignedBloIds.find(func(bid) { bid == n.recipientId }) != null)
    });
  };

  /// Returns notices for a nodal officer:
  /// notices created by the nodal officer, notices addressed to them,
  /// notices addressed to their supervisors, or BLOs under those supervisors.
  public func getNoticesForNodalOfficer(
    notices             : [Notice],
    constituencyId      : Text,
    nodalOfficerId      : Text,
    assignedSupervisorIds : [Text],
    supervisorBloIds    : [Text],  // flat list of all BLO IDs under assigned supervisors
  ) : [Notice] {
    forCid(notices, constituencyId).filter<Notice>(func(n) {
      // Notices created by this nodal officer
      (n.createdById == nodalOfficerId and n.createdByRole == "nodal_officer") or
      // Notices addressed directly to this nodal officer
      (n.recipientId == nodalOfficerId and n.recipientType == "nodal_officer") or
      // Notices addressed to their supervisors
      (n.recipientType == "supervisor" and
        assignedSupervisorIds.find(func(sid) { sid == n.recipientId }) != null) or
      // Notices addressed to BLOs under their supervisors
      (n.recipientType == "blo" and
        supervisorBloIds.find(func(bid) { bid == n.recipientId }) != null)
    });
  };
  // ─── Notice delivery status ───────────────────────────────────────────────

  /// Updates delivery/read status for a specific recipient on a notice.
  /// Also updates the top-level notice status to "delivered" when appropriate.
  public func updateNoticeDeliveryStatus(
    notices       : [Notice],
    noticeId      : Text,
    recipientId   : Text,
    recipientType : Text,
    newStatus     : Text,
  ) : [Notice] {
    let now = Time.now();
    notices.map(func(n) {
      if (n.id == noticeId) {
        var found = false;
        let updatedRecipients = n.noticeRecipients.map(func(r) {
          if (r.recipientId == recipientId) {
            found := true;
            if (newStatus == "read") {
              { r with deliveryStatus = newStatus; readAt = ?now }
            } else if (newStatus == "delivered") {
              { r with deliveryStatus = newStatus; deliveredAt = ?now }
            } else { r };
          } else { r };
        });
        let finalRecipients : [T.NoticeRecipientStatus] = if (found) {
          updatedRecipients
        } else {
          let newRec : T.NoticeRecipientStatus = {
            recipientId;
            recipientType;
            deliveryStatus = newStatus;
            deliveredAt    = if (newStatus == "delivered" or newStatus == "read") ?now else null;
            readAt         = if (newStatus == "read") ?now else null;
          };
          updatedRecipients.concat([newRec])
        };
        // Also update top-level status: issued -> pending -> delivered -> read
        let topStatus = if (newStatus == "read") {
          "read"
        } else if (newStatus == "delivered") {
          "delivered"
        } else if (newStatus == "pending") {
          "pending"
        } else { n.status };
        { n with noticeRecipients = finalRecipients; status = topStatus; updatedAt = now }
      } else { n }
    });
  };

  /// Supervisor clears a notice so the BLO becomes eligible for honorarium again.
  public func clearNoticeForHonorarium(
    notices     : [Notice],
    noticeId    : Text,
    clearedById : Text,
    clearedByName : Text,
  ) : [Notice] {
    let now = Time.now();
    notices.map(func(n) {
      if (n.id == noticeId) {
        { n with
          clearedForHonorarium = true;
          clearedAt   = ?now;
          clearedById = ?clearedById;
          clearedByName = ?clearedByName;
          updatedAt   = now;
        }
      } else { n }
    });
  };

  /// Returns all recipients with their delivery status for a specific notice.
  public func getNoticeDeliveryReport(
    notices  : [Notice],
    noticeId : Text,
  ) : [T.NoticeRecipientStatus] {
    switch (notices.find(func(n) { n.id == noticeId })) {
      case (?n) { n.noticeRecipients };
      case null { [] };
    };
  };
};
