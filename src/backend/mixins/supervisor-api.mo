import T "../types/records";
import Array "mo:core/Array";
import Time "mo:core/Time";

mixin (state : {
  var supervisors         : [T.Supervisor];
  var nodalOfficers       : [T.NodalOfficer];
  var passwordHistoryList : [T.PasswordHistoryEntry];
}) {
  type Supervisor   = T.Supervisor;
  type NodalOfficer = T.NodalOfficer;

  // ─── Supervisor API ─────────────────────────────────────────────

  public shared func getSupervisors(cid : Text) : async [Supervisor] {
    state.supervisors.filter<Supervisor>(func(s) { s.constituencyId == cid });
  };

  public shared func saveSupervisor(supervisor : Supervisor) : async Bool {
    // Upsert: replace existing record with same id, or append if new.
    let others = state.supervisors.filter(func(s) { s.id != supervisor.id });
    state.supervisors := others.concat([supervisor]);
    true;
  };

  public shared func updateSupervisor(supervisor : Supervisor) : async Bool {
    let others = state.supervisors.filter(func(s) { s.id != supervisor.id });
    state.supervisors := others.concat([supervisor]);
    true;
  };

  public shared func deleteSupervisor(cid : Text, supervisorId : Text) : async Bool {
    let before = state.supervisors.size();
    let filtered = state.supervisors.filter(
      func(s) { not (s.id == supervisorId and s.constituencyId == cid) },
    );
    state.supervisors := filtered;
    state.supervisors.size() < before;
  };

  /// Supervisor login: validate phone + password
  public shared func supervisorLogin(cid : Text, phone : Text, password : Text) : async ?Supervisor {
    state.supervisors.find<Supervisor>(
      func(s) {
        s.constituencyId == cid and s.phone == phone and s.isActive and not s.isLocked and
        (switch (s.password) { case (?p) p == password; case null false })
      },
    );
  };

  /// Change supervisor password
  public shared func changeSupervisorPassword(cid : Text, supervisorId : Text, currentPassword : Text, newPassword : Text) : async Bool {
    switch (state.supervisors.find<Supervisor>(func(s) { s.id == supervisorId and s.constituencyId == cid })) {
      case null false;
      case (?sup) {
        let currentPwd = switch (sup.password) { case (?p) p; case null return false };
        if (currentPwd != currentPassword) return false;
        let updated : Supervisor = { sup with password = ?newPassword; updatedAt = Time.now() };
        let others = state.supervisors.filter(func(s) { s.id != supervisorId });
        state.supervisors := others.concat([updated]);
        recordSupervisorPasswordChange(cid, supervisorId, sup.name);
        true;
      };
    };
  };

  func recordSupervisorPasswordChange(cid : Text, supervisorId : Text, name : Text) {
    let entry : T.PasswordHistoryEntry = {
      timestamp      = Time.now();
      changedBy      = supervisorId;
      role           = "पर्यवेक्षक";
      constituencyId = cid;
      identifier     = supervisorId;
      note           = name # " यांनी password बदलला";
      action         = "changed";
      maskedPassword = "";
    };
    state.passwordHistoryList := state.passwordHistoryList.concat([entry]);
  };

  // ─── Nodal Officer API ────────────────────────────────────────

  public shared func getNodalOfficers(cid : Text) : async [NodalOfficer] {
    state.nodalOfficers.filter<NodalOfficer>(func(o) { o.constituencyId == cid });
  };

  public shared func saveNodalOfficer(officer : NodalOfficer) : async Bool {
    let others = state.nodalOfficers.filter(func(o) { o.id != officer.id });
    state.nodalOfficers := others.concat([officer]);
    true;
  };

  public shared func updateNodalOfficer(officer : NodalOfficer) : async Bool {
    let others = state.nodalOfficers.filter(func(o) { o.id != officer.id });
    state.nodalOfficers := others.concat([officer]);
    true;
  };

  public shared func deleteNodalOfficer(cid : Text, officerId : Text) : async Bool {
    let before = state.nodalOfficers.size();
    let filtered = state.nodalOfficers.filter(
      func(o) { not (o.id == officerId and o.constituencyId == cid) },
    );
    state.nodalOfficers := filtered;
    state.nodalOfficers.size() < before;
  };

  /// Nodal officer login: validate phone + password
  public shared func nodalOfficerLogin(cid : Text, phone : Text, password : Text) : async ?NodalOfficer {
    state.nodalOfficers.find<NodalOfficer>(
      func(o) {
        o.constituencyId == cid and
        o.phone == phone and
        o.isActive and not o.isLocked and
        (switch (o.password) { case (?p) p == password; case null false })
      },
    );
  };

  /// Get supervisors assigned to a nodal officer
  public query func getNodalOfficerSupervisors(nodalOfficerId : Text, cid : Text) : async [Supervisor] {
    switch (state.nodalOfficers.find<NodalOfficer>(func(o) { o.id == nodalOfficerId and o.constituencyId == cid })) {
      case null { [] };
      case (?nodal) {
        state.supervisors.filter<Supervisor>(func(s) {
          s.constituencyId == cid and
          nodal.assignedSupervisorIds.find(func(sid) { sid == s.id }) != null
        });
      };
    };
  };

  /// Get all BLOs assigned to the supervisors of a nodal officer
  public query func getNodalOfficerBLOs(nodalOfficerId : Text, cid : Text) : async [Supervisor] {
    // Returns the supervisor list; the frontend fetches BLOs per supervisor.
    // This variant returns all BLOs directly from the pollingStations bloId assignments.
    switch (state.nodalOfficers.find<NodalOfficer>(func(o) { o.id == nodalOfficerId and o.constituencyId == cid })) {
      case null { [] };
      case (?nodal) {
        state.supervisors.filter<Supervisor>(func(s) {
          s.constituencyId == cid and
          nodal.assignedSupervisorIds.find(func(sid) { sid == s.id }) != null
        });
      };
    };
  };

  /// Change nodal officer password
  public shared func changeNodalOfficerPassword(cid : Text, officerId : Text, currentPassword : Text, newPassword : Text) : async Bool {
    switch (state.nodalOfficers.find<NodalOfficer>(func(o) { o.id == officerId and o.constituencyId == cid })) {
      case null false;
      case (?officer) {
        let currentPwd = switch (officer.password) { case (?p) p; case null return false };
        if (currentPwd != currentPassword) return false;
        let updated : NodalOfficer = { officer with password = ?newPassword; updatedAt = Time.now() };
        let others = state.nodalOfficers.filter(func(o) { o.id != officerId });
        state.nodalOfficers := others.concat([updated]);
        true;
      };
    };
  };
};
