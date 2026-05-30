import NoticeDataLib "../lib/notice-data";
import T "../types/records";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Array "mo:core/Array";
import Nat "mo:core/Nat";

mixin (state : {
  var notices        : [T.Notice];
  var noticeCounters : [(Text, Nat)];
}) {
  type Notice      = T.Notice;
  type PrintRecord = T.PrintRecord;

  // ─── Counter helper — sequential notice number per constituency ──────────
  func nextNoticeNumber(constituencyId : Text) : Text {
    var counter : Nat = 1;
    let nowSecs : Int = Time.now() / 1_000_000_000;
    let year : Int = nowSecs / 31_536_000 + 1970;
    for ((cid, n) in state.noticeCounters.vals()) {
      if (cid == constituencyId) { counter := n + 1 };
    };
    // upsert counter
    var found = false;
    state.noticeCounters := state.noticeCounters.map<(Text, Nat), (Text, Nat)>(
      func((c, n)) {
        if (c == constituencyId) { found := true; (c, counter) } else { (c, n) }
      }
    );
    if (not found) {
      state.noticeCounters := state.noticeCounters.concat([(constituencyId, counter)]);
    };
    let yText = if (year >= 0) { year.toText() } else { "2025" };
    let padded = if (counter < 10) { "00" # counter.toText() }
                 else if (counter < 100) { "0" # counter.toText() }
                 else { counter.toText() };
    "NOT/" # constituencyId # "/" # yText # "/" # padded;
  };

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  public query func getNotices(constituencyId : Text) : async [Notice] {
    NoticeDataLib.getNotices(state.notices, constituencyId);
  };

  public shared func saveNotice(constituencyId : Text, notice : Notice) : async Bool {
    // Auto-assign noticeNumber if blank
    let n : Notice = if (notice.noticeNumber == "") {
      { notice with noticeNumber = nextNoticeNumber(constituencyId); constituencyId }
    } else { { notice with constituencyId } };
    state.notices := NoticeDataLib.saveNotice(state.notices, n);
    true;
  };

  // issueNotice — convenience alias: always sets status to "issued" and fills noticeNumber
  public shared func issueNotice(constituencyId : Text, notice : Notice) : async Notice {
    let noticeNum = if (notice.noticeNumber == "") { nextNoticeNumber(constituencyId) } else { notice.noticeNumber };
    let n : Notice = { notice with
      noticeNumber = noticeNum;
      constituencyId;
      status = "issued";
    };
    state.notices := NoticeDataLib.saveNotice(state.notices, n);
    n;
  };

  public shared func updateNotice(constituencyId : Text, notice : Notice) : async Bool {
    state.notices := NoticeDataLib.updateNotice(state.notices, notice);
    true;
  };

  public shared func deleteNotice(constituencyId : Text, noticeId : Text) : async Bool {
    let before = state.notices.size();
    state.notices := NoticeDataLib.deleteNotice(state.notices, noticeId);
    state.notices.size() < before;
  };

  public shared func bulkSaveNotices(constituencyId : Text, notices : [Notice]) : async Bool {
    state.notices := NoticeDataLib.bulkSaveNotices(state.notices, notices);
    true;
  };

  // ─── Print record ─────────────────────────────────────────────────────────

  public shared func addNoticePrintRecord(
    constituencyId : Text,
    noticeId       : Text,
    printedBy      : Text,
    printedByName  : Text,
  ) : async ?Notice {
    let (updated, found) = NoticeDataLib.addNoticePrintRecord(
      state.notices, noticeId, printedBy, printedByName,
    );
    state.notices := updated;
    found;
  };

  // ─── Dashboard query functions ────────────────────────────────────────────

  public query func getNoticesByRecipient(
    constituencyId : Text,
    recipientId    : Text,
    recipientType  : Text,
  ) : async [Notice] {
    NoticeDataLib.getNoticesByRecipient(state.notices, constituencyId, recipientId, recipientType);
  };

  public query func getNoticesByCreator(
    constituencyId : Text,
    creatorId      : Text,
    creatorRole    : Text,
  ) : async [Notice] {
    NoticeDataLib.getNoticesByCreator(state.notices, constituencyId, creatorId, creatorRole);
  };

  public query func getNoticesForDashboard(
    constituencyId : Text,
    viewerRole     : Text,
    viewerId       : Text,
  ) : async [Notice] {
    NoticeDataLib.getNoticesForDashboard(state.notices, constituencyId, viewerRole, viewerId);
  };

  // Fresh update-call variant — bypasses IC HTTP query cache for cross-device sync
  public shared func getNoticesFresh(constituencyId : Text) : async [Notice] {
    NoticeDataLib.getNotices(state.notices, constituencyId);
  };

  /// Returns notices relevant to a supervisor: their own notices + notices for their BLOs
  public query func getNoticesForSupervisor(
    constituencyId : Text,
    supervisorId   : Text,
    assignedBloIds : [Text],
  ) : async [Notice] {
    NoticeDataLib.getNoticesForSupervisor(
      state.notices, constituencyId, supervisorId, assignedBloIds
    );
  };

  public shared func getNoticesForSupervisorFresh(
    constituencyId : Text,
    supervisorId   : Text,
    assignedBloIds : [Text],
  ) : async [Notice] {
    NoticeDataLib.getNoticesForSupervisor(
      state.notices, constituencyId, supervisorId, assignedBloIds
    );
  };

  /// Returns notices relevant to a nodal officer: their own + their supervisors' + their BLOs'
  public query func getNoticesForNodalOfficer(
    constituencyId        : Text,
    nodalOfficerId        : Text,
    assignedSupervisorIds : [Text],
    supervisorBloIds      : [Text],
  ) : async [Notice] {
    NoticeDataLib.getNoticesForNodalOfficer(
      state.notices, constituencyId, nodalOfficerId, assignedSupervisorIds, supervisorBloIds
    );
  };

  public shared func getNoticesForNodalOfficerFresh(
    constituencyId        : Text,
    nodalOfficerId        : Text,
    assignedSupervisorIds : [Text],
    supervisorBloIds      : [Text],
  ) : async [Notice] {
    NoticeDataLib.getNoticesForNodalOfficer(
      state.notices, constituencyId, nodalOfficerId, assignedSupervisorIds, supervisorBloIds
    );
  };

  // ─── Notice delivery status ───────────────────────────────────────────────

  /// Update delivery status for a single recipient on a notice (alias for convenience)
  public shared func updateNoticeRecipientStatus(
    noticeId      : Text,
    recipientId   : Text,
    newStatus     : Text,
    recipientType : Text,
  ) : async Bool {
    state.notices := NoticeDataLib.updateNoticeDeliveryStatus(
      state.notices, noticeId, recipientId, recipientType, newStatus
    );
    true;
  };

  public shared func updateNoticeDeliveryStatus(
    constituencyId : Text,
    noticeId       : Text,
    recipientId    : Text,
    recipientType  : Text,
    newStatus      : Text,
  ) : async Bool {
    ignore constituencyId;
    state.notices := NoticeDataLib.updateNoticeDeliveryStatus(
      state.notices, noticeId, recipientId, recipientType, newStatus
    );
    true;
  };

  public query func getNoticeDeliveryReport(
    constituencyId : Text,
    noticeId       : Text,
  ) : async [T.NoticeRecipientStatus] {
    ignore constituencyId;
    NoticeDataLib.getNoticeDeliveryReport(state.notices, noticeId);
  };

  /// Supervisor clears a notice so the BLO regains honorarium eligibility
  public shared func clearNoticeForHonorarium(
    noticeId      : Text,
    clearedById   : Text,
    clearedByName : Text,
  ) : async Bool {
    state.notices := NoticeDataLib.clearNoticeForHonorarium(
      state.notices, noticeId, clearedById, clearedByName
    );
    true;
  };
};
