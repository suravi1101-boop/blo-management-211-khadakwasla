import AuthLib "../lib/auth";
import Map "mo:core/Map";
import SupervisorTypes "../types/supervisor";
import RecordTypes "../types/records";
import List "mo:core/List";

mixin (
  adminPasswords : Map.Map<Text, Text>,
  superAdminPasswords : Map.Map<Text, Text>,
  supervisors : Map.Map<Text, [SupervisorTypes.Supervisor]>,
  nodalOfficers : Map.Map<Text, [SupervisorTypes.NodalOfficer]>,
  passwordHistoryLog : List.List<RecordTypes.PasswordHistoryEntry>,
) {
  public shared func validateAdminPassword(constituencyId : Text, password : Text) : async Bool {
    AuthLib.validateAdminPassword(adminPasswords, constituencyId, password);
  };

  public shared func setAdminPassword(constituencyId : Text, newPassword : Text) : async () {
    AuthLib.setAdminPassword(adminPasswords, passwordHistoryLog, constituencyId, newPassword, "admin");
  };

  public shared func validateSuperAdminPassword(password : Text) : async Bool {
    AuthLib.validateSuperAdminPassword(superAdminPasswords, password);
  };

  public shared func setSuperAdminPassword(newPassword : Text) : async () {
    AuthLib.setSuperAdminPassword(superAdminPasswords, passwordHistoryLog, newPassword, "superadmin");
  };

  public shared func validateSupervisorPassword(constituencyId : Text, supervisorId : Text, password : Text) : async Bool {
    AuthLib.validateSupervisorPassword(supervisors, constituencyId, supervisorId, password);
  };

  public shared func setSupervisorPassword(constituencyId : Text, supervisorId : Text, newPassword : Text) : async () {
    AuthLib.setSupervisorPassword(supervisors, passwordHistoryLog, constituencyId, supervisorId, newPassword, "admin");
  };

  public shared func validateNodalPassword(constituencyId : Text, nodalId : Text, password : Text) : async Bool {
    AuthLib.validateNodalPassword(nodalOfficers, constituencyId, nodalId, password);
  };

  public shared func setNodalPassword(constituencyId : Text, nodalId : Text, newPassword : Text) : async () {
    AuthLib.setNodalPassword(nodalOfficers, passwordHistoryLog, constituencyId, nodalId, newPassword, "admin");
  };

  public shared func lockUser(constituencyId : Text, userId : Text, role : Text) : async () {
    AuthLib.lockUser(supervisors, nodalOfficers, constituencyId, userId, role);
  };

  public shared func unlockUser(constituencyId : Text, userId : Text, role : Text) : async () {
    AuthLib.unlockUser(supervisors, nodalOfficers, constituencyId, userId, role);
  };

  public shared func incrementLoginAttempts(constituencyId : Text, userId : Text, role : Text) : async Nat {
    AuthLib.incrementLoginAttempts(supervisors, nodalOfficers, constituencyId, userId, role);
  };

  public shared func resetLoginAttempts(constituencyId : Text, userId : Text, role : Text) : async () {
    AuthLib.resetLoginAttempts(supervisors, nodalOfficers, constituencyId, userId, role);
  };

  public shared func checkPasswordChangeRequired(constituencyId : Text, userId : Text, role : Text) : async Bool {
    AuthLib.checkPasswordChangeRequired(supervisors, nodalOfficers, constituencyId, userId, role);
  };
};
