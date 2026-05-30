import Types "../types/records";
import Map "mo:core/Map";
import List "mo:core/List";
import Int "mo:core/Int";

module {
  public type ConstituencyConfig = Types.ConstituencyConfig;
  public type PasswordHistoryEntry = Types.PasswordHistoryEntry;
  /// Seed all known constituency configs on first deploy
  public func seedConstituencies(
    configMap : Map.Map<Text, ConstituencyConfig>,
    constituencies : [(Text, Text)],
    now : Int,
  ) {
    for ((cid, name) in constituencies.vals()) {
      if (configMap.get(cid) == null) {
        configMap.add(cid, {
          id                = cid;
          name              = name;
          isEnabled         = cid == "211";
          adminPassword     = "admin123";
          passwordChangedAt = 0;
          loginAttempts     = 0;
          lockedUntil       = null;
          updatedAt         = now;
        });
      };
    };
  };

  /// Get config for a single constituency
  public func getConstituencyConfig(
    configMap : Map.Map<Text, ConstituencyConfig>,
    constituencyId : Text,
  ) : ?ConstituencyConfig {
    configMap.get(constituencyId);
  };

  /// Enable or disable a constituency
  public func setConstituencyEnabled(
    configMap : Map.Map<Text, ConstituencyConfig>,
    constituencyId : Text,
    enabled : Bool,
    now : Int,
  ) : Bool {
    switch (configMap.get(constituencyId)) {
      case (?cfg) {
        configMap.add(constituencyId, { cfg with isEnabled = enabled; updatedAt = now });
        true;
      };
      case null false;
    };
  };

  /// Validate super-admin password
  public func validateSuperAdminPassword(
    store : { var password : Text },
    password : Text,
  ) : Bool {
    store.password == password;
  };

  /// Change super-admin password
  public func changeSuperAdminPassword(
    store : { var password : Text },
    currentPassword : Text,
    newPassword : Text,
  ) : Bool {
    if (store.password != currentPassword) return false;
    store.password := newPassword;
    true;
  };

  /// Validate admin password for a constituency
  public func validateAdminPassword(
    configMap : Map.Map<Text, ConstituencyConfig>,
    constituencyId : Text,
    password : Text,
  ) : Bool {
    switch (configMap.get(constituencyId)) {
      case (?cfg) cfg.adminPassword == password;
      case null false;
    };
  };

  /// Record a password change in history
  /// Record a password change in history
  public func recordPasswordChange(
    history : List.List<PasswordHistoryEntry>,
    constituencyId : Text,
    role : Text,
    action : Text,
    changedBy : Text,
    now : Int,
  ) {
    history.add({
      timestamp      = now;
      changedBy      = changedBy;
      role           = role;
      constituencyId = constituencyId;
      action         = action;
      maskedPassword = "";
    });
  };
};
