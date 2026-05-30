import T "../types/records";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Int "mo:core/Int";

mixin (state : {
  var constituencyConfigs  : [T.ConstituencyConfig];
  var superAdminPwd        : Text;
  var passwordHistoryList  : [T.PasswordHistoryEntry];
}) {
  type ConstituencyConfig   = T.ConstituencyConfig;
  type PasswordHistoryEntry = T.PasswordHistoryEntry;

  // ─── Internal helpers ────────────────────────────────────────────────
  func findConfig(cid : Text) : ?ConstituencyConfig {
    state.constituencyConfigs.find<ConstituencyConfig>(func(c) { c.id == cid });
  };

  func upsertConfig(cfg : ConstituencyConfig) {
    let filtered = state.constituencyConfigs.filter(func(c) { c.id != cfg.id });
    state.constituencyConfigs := filtered.concat([cfg]);
  };

  // ─── Constituency read/write ─────────────────────────────────────────

  /// Get all 21 constituency configs (Super Admin view)
  public shared func getAllConstituencyConfigs() : async [ConstituencyConfig] {
    state.constituencyConfigs;
  };

  /// Get a single constituency config by ID
  public shared func getConstituencyById(cid : Text) : async ?ConstituencyConfig {
    findConfig(cid);
  };

  /// Get config for constituency "211" (single-constituency shortcut)
  public shared func getConstituencyConfig() : async ?ConstituencyConfig {
    findConfig("211");
  };

  /// Enable or disable a specific constituency (Super Admin)
  public shared func setConstituencyEnabled(cid : Text, enabled : Bool) : async Bool {
    let now = Time.now();
    switch (findConfig(cid)) {
      case (?cfg) {
        upsertConfig({ cfg with isEnabled = enabled; updatedAt = now });
        true;
      };
      case null {
        // Create a minimal config if not found
        upsertConfig({
          id                = cid;
          name              = cid;
          isEnabled         = enabled;
          adminPassword     = "admin123";
          passwordChangedAt = 0;
          loginAttempts     = 0;
          lockedUntil       = null;
          updatedAt         = now;
        });
        true;
      };
    };
  };

  /// Enable all constituencies
  public shared func enableAllConstituencies() : async Bool {
    let now = Time.now();
    state.constituencyConfigs := state.constituencyConfigs.map<ConstituencyConfig, ConstituencyConfig>(
      func(c) { { c with isEnabled = true; updatedAt = now } },
    );
    true;
  };

  /// Disable all constituencies
  public shared func disableAllConstituencies() : async Bool {
    let now = Time.now();
    state.constituencyConfigs := state.constituencyConfigs.map<ConstituencyConfig, ConstituencyConfig>(
      func(c) { { c with isEnabled = false; updatedAt = now } },
    );
    true;
  };

  /// Add a new constituency
  public shared func addConstituency(cid : Text, cname : Text, adminPassword : Text) : async Bool {
    if (findConfig(cid) != null) return false;
    let now = Time.now();
    state.constituencyConfigs := state.constituencyConfigs.concat([{
      id                = cid;
      name              = cname;
      isEnabled         = false;
      adminPassword     = adminPassword;
      passwordChangedAt = now;
      loginAttempts     = 0;
      lockedUntil       = null;
      updatedAt         = now;
    }]);
    true;
  };

  /// Set (or reset) admin password for any constituency (Super Admin)
  public shared func setConstituencyAdminPassword(cid : Text, newPassword : Text, changedBy : Text) : async Bool {
    switch (findConfig(cid)) {
      case null false;
      case (?cfg) {
        let now = Time.now();
        upsertConfig({ cfg with adminPassword = newPassword; passwordChangedAt = now; updatedAt = now });
        appendPasswordHistory(cid, "admin", "", changedBy, "changed", "changed by " # changedBy);
        true;
      };
    };
  };

  // ─── Authentication ──────────────────────────────────────────────────

  /// Super Admin login
  public shared func superAdminLogin(password : Text) : async Bool {
    state.superAdminPwd == password;
  };

  /// Change Super Admin password
  public shared func changeSuperAdminPassword(currentPassword : Text, newPassword : Text) : async Bool {
    if (state.superAdminPwd != currentPassword) return false;
    state.superAdminPwd := newPassword;
    appendPasswordHistory("", "superadmin", "superadmin", "superadmin", "changed", "Super Admin password changed");
    true;
  };

  /// Admin login for constituency
  public shared func adminLogin(cid : Text, password : Text) : async Bool {
    switch (findConfig(cid)) {
      case (?cfg) cfg.adminPassword == password;
      case null false;
    };
  };

  /// Change admin password for constituency
  public shared func changeAdminPassword(cid : Text, currentPassword : Text, newPassword : Text, changedBy : Text) : async Bool {
    switch (findConfig(cid)) {
      case null false;
      case (?cfg) {
        if (cfg.adminPassword != currentPassword) return false;
        let now = Time.now();
        upsertConfig({ cfg with adminPassword = newPassword; passwordChangedAt = now; updatedAt = now });
        appendPasswordHistory(cid, "admin", "admin", changedBy, "changed", "Admin password changed");
        true;
      };
    };
  };

  // ─── Password history ──────────────────────────────────────────────

  func appendPasswordHistory(cid : Text, role : Text, identifier : Text, changedBy : Text, action : Text, note : Text) {
    let entry : PasswordHistoryEntry = {
      timestamp      = Time.now();
      changedBy      = changedBy;
      role           = role;
      constituencyId = cid;
      identifier     = identifier;
      note           = note;
      action         = action;
      maskedPassword = "";
    };
    state.passwordHistoryList := state.passwordHistoryList.concat([entry]);
  };

  public shared func recordPasswordChange(cid : Text, role : Text, identifier : Text, changedBy : Text, note : Text) : async Bool {
    appendPasswordHistory(cid, role, identifier, changedBy, "changed", note);
    true;
  };

  /// Get password history for a constituency (or all if cid = "")
  public shared func getPasswordHistory(cid : Text) : async [PasswordHistoryEntry] {
    if (cid == "") {
      // Super Admin: return all
      let sorted = state.passwordHistoryList.sort(
        func(a, b) { Int.compare(b.timestamp, a.timestamp) },
      );
      sorted;
    } else {
      let filtered = state.passwordHistoryList.filter(
        func(e) { e.constituencyId == cid },
      );
      filtered.sort<PasswordHistoryEntry>(func(a, b) { Int.compare(b.timestamp, a.timestamp) });
    };
  };
};
