import Map "mo:core/Map";
import SupervisorTypes "../types/supervisor";
import Time "mo:core/Time";
import RecordTypes "../types/records";
import Text "mo:core/Text";
import List "mo:core/List";

module {
  public type Supervisor = SupervisorTypes.Supervisor;
  public type NodalOfficer = SupervisorTypes.NodalOfficer;

  // Admin password
  public func validateAdminPassword(
    store : Map.Map<Text, Text>,
    constituencyId : Text,
    password : Text,
  ) : Bool {
    let key = constituencyId # ":admin";
    switch (store.get(key)) {
      case (?stored) { stored == password };
      case null { password == "admin123" };
    };
  };

  public func setAdminPassword(
    store : Map.Map<Text, Text>,
    passwordHistoryLog : List.List<RecordTypes.PasswordHistoryEntry>,
    constituencyId : Text,
    newPassword : Text,
    changedBy : Text,
  ) : () {
    let key = constituencyId # ":admin";
    let action = switch (store.get(key)) {
      case null { "created" };
      case (?_) { "changed" };
    };
    store.add(key, newPassword);
    let maskedPwd = if (newPassword.size() >= 2) {
      let last2 = newPassword.chars().toArray();
      let len = last2.size();
      "***" # Text.fromChar(last2[len - 2]) # Text.fromChar(last2[len - 1]);
    } else { "***" };
    let entry : RecordTypes.PasswordHistoryEntry = {
      timestamp      = Time.now();
      changedBy      = changedBy;
      role           = "admin";
      constituencyId = constituencyId;
      action         = action;
      maskedPassword = maskedPwd;
    };
    passwordHistoryLog.add(entry);
  };

  // Super admin password
  public func validateSuperAdminPassword(
    store : Map.Map<Text, Text>,
    password : Text,
  ) : Bool {
    switch (store.get("superadmin")) {
      case (?stored) { stored == password };
      case null { password == "SuperAdmin@2025" };
    };
  };

  public func setSuperAdminPassword(
    store : Map.Map<Text, Text>,
    passwordHistoryLog : List.List<RecordTypes.PasswordHistoryEntry>,
    newPassword : Text,
    changedBy : Text,
  ) : () {
    let action = switch (store.get("superadmin")) {
      case null { "created" };
      case (?_) { "changed" };
    };
    store.add("superadmin", newPassword);
    let maskedPwd = if (newPassword.size() >= 2) {
      let last2 = newPassword.chars().toArray();
      let len = last2.size();
      "***" # Text.fromChar(last2[len - 2]) # Text.fromChar(last2[len - 1]);
    } else { "***" };
    let entry : RecordTypes.PasswordHistoryEntry = {
      timestamp      = Time.now();
      changedBy      = changedBy;
      role           = "superadmin";
      constituencyId = "";
      action         = action;
      maskedPassword = maskedPwd;
    };
    passwordHistoryLog.add(entry);
  };

  // Supervisor password
  public func validateSupervisorPassword(
    supervisorStore : Map.Map<Text, [Supervisor]>,
    constituencyId : Text,
    supervisorId : Text,
    password : Text,
  ) : Bool {
    switch (supervisorStore.get(constituencyId)) {
      case null { false };
      case (?list) {
        switch (list.find<Supervisor>(func(s : Supervisor) { s.id == supervisorId })) {
          case null { false };
          case (?sup) {
            switch (sup.password) {
              case null { false };
              case (?pwd) { pwd == password };
            };
          };
        };
      };
    };
  };

  public func setSupervisorPassword(
    supervisorStore : Map.Map<Text, [Supervisor]>,
    passwordHistoryLog : List.List<RecordTypes.PasswordHistoryEntry>,
    constituencyId : Text,
    supervisorId : Text,
    newPassword : Text,
    changedBy : Text,
  ) : () {
    switch (supervisorStore.get(constituencyId)) {
      case null {};
      case (?list) {
        switch (list.find<Supervisor>(func(s : Supervisor) { s.id == supervisorId })) {
          case null {};
          case (?sup) {
            let action = switch (sup.password) {
              case null { "created" };
              case (?_) { "changed" };
            };
            let updated = { sup with password = ?newPassword; loginAttempts = 0; isLocked = false };
            let filtered = list.filter<Supervisor>(func(s : Supervisor) { s.id != supervisorId });
            supervisorStore.add(constituencyId, filtered.concat([updated]));
            let maskedPwd = if (newPassword.size() >= 2) {
              let last2 = newPassword.chars().toArray();
              let len = last2.size();
              "***" # Text.fromChar(last2[len - 2]) # Text.fromChar(last2[len - 1]);
            } else { "***" };
            let entry : RecordTypes.PasswordHistoryEntry = {
              timestamp      = Time.now();
              changedBy      = changedBy;
              role           = "supervisor";
              constituencyId = constituencyId;
              action         = action;
              maskedPassword = maskedPwd;
            };
            passwordHistoryLog.add(entry);
          };
        };
      };
    };
  };

  // Nodal password
  public func validateNodalPassword(
    nodalStore : Map.Map<Text, [NodalOfficer]>,
    constituencyId : Text,
    nodalId : Text,
    password : Text,
  ) : Bool {
    switch (nodalStore.get(constituencyId)) {
      case null { false };
      case (?list) {
        switch (list.find<NodalOfficer>(func(o : NodalOfficer) { o.id == nodalId })) {
          case null { false };
          case (?nodal) {
            switch (nodal.password) {
              case null { false };
              case (?pwd) { pwd == password };
            };
          };
        };
      };
    };
  };

  public func setNodalPassword(
    nodalStore : Map.Map<Text, [NodalOfficer]>,
    passwordHistoryLog : List.List<RecordTypes.PasswordHistoryEntry>,
    constituencyId : Text,
    nodalId : Text,
    newPassword : Text,
    changedBy : Text,
  ) : () {
    switch (nodalStore.get(constituencyId)) {
      case null {};
      case (?list) {
        switch (list.find<NodalOfficer>(func(o : NodalOfficer) { o.id == nodalId })) {
          case null {};
          case (?nodal) {
            let action = switch (nodal.password) {
              case null { "created" };
              case (?_) { "changed" };
            };
            let updated = { nodal with password = ?newPassword; loginAttempts = 0; isLocked = false };
            let filtered = list.filter<NodalOfficer>(func(o : NodalOfficer) { o.id != nodalId });
            nodalStore.add(constituencyId, filtered.concat([updated]));
            let maskedPwd = if (newPassword.size() >= 2) {
              let last2 = newPassword.chars().toArray();
              let len = last2.size();
              "***" # Text.fromChar(last2[len - 2]) # Text.fromChar(last2[len - 1]);
            } else { "***" };
            let entry : RecordTypes.PasswordHistoryEntry = {
              timestamp      = Time.now();
              changedBy      = changedBy;
              role           = "nodal";
              constituencyId = constituencyId;
              action         = action;
              maskedPassword = maskedPwd;
            };
            passwordHistoryLog.add(entry);
          };
        };
      };
    };
  };

  // Lock / unlock
  public func lockUser(
    supervisorStore : Map.Map<Text, [Supervisor]>,
    nodalStore : Map.Map<Text, [NodalOfficer]>,
    constituencyId : Text,
    userId : Text,
    role : Text,
  ) : () {
    if (role == "supervisor") {
      switch (supervisorStore.get(constituencyId)) {
        case null {};
        case (?list) {
          let updated = list.map<Supervisor, Supervisor>(func(s : Supervisor) {
            if (s.id == userId) { { s with isLocked = true } } else { s }
          });
          supervisorStore.add(constituencyId, updated);
        };
      };
    } else {
      switch (nodalStore.get(constituencyId)) {
        case null {};
        case (?list) {
          let updated = list.map<NodalOfficer, NodalOfficer>(func(o : NodalOfficer) {
            if (o.id == userId) { { o with isLocked = true } } else { o }
          });
          nodalStore.add(constituencyId, updated);
        };
      };
    };
  };

  public func unlockUser(
    supervisorStore : Map.Map<Text, [Supervisor]>,
    nodalStore : Map.Map<Text, [NodalOfficer]>,
    constituencyId : Text,
    userId : Text,
    role : Text,
  ) : () {
    if (role == "supervisor") {
      switch (supervisorStore.get(constituencyId)) {
        case null {};
        case (?list) {
          let updated = list.map<Supervisor, Supervisor>(func(s : Supervisor) {
            if (s.id == userId) { { s with isLocked = false; loginAttempts = 0 } } else { s }
          });
          supervisorStore.add(constituencyId, updated);
        };
      };
    } else {
      switch (nodalStore.get(constituencyId)) {
        case null {};
        case (?list) {
          let updated = list.map<NodalOfficer, NodalOfficer>(func(o : NodalOfficer) {
            if (o.id == userId) { { o with isLocked = false; loginAttempts = 0 } } else { o }
          });
          nodalStore.add(constituencyId, updated);
        };
      };
    };
  };

  public func incrementLoginAttempts(
    supervisorStore : Map.Map<Text, [Supervisor]>,
    nodalStore : Map.Map<Text, [NodalOfficer]>,
    constituencyId : Text,
    userId : Text,
    role : Text,
  ) : Nat {
    if (role == "supervisor") {
      switch (supervisorStore.get(constituencyId)) {
        case null { 0 };
        case (?list) {
          var attempts : Nat = 0;
          let updated = list.map<Supervisor, Supervisor>(func(s : Supervisor) {
            if (s.id == userId) {
              let newAttempts = s.loginAttempts + 1;
              attempts := newAttempts;
              { s with loginAttempts = newAttempts; isLocked = newAttempts >= 5 }
            } else { s }
          });
          supervisorStore.add(constituencyId, updated);
          attempts;
        };
      };
    } else {
      switch (nodalStore.get(constituencyId)) {
        case null { 0 };
        case (?list) {
          var attempts : Nat = 0;
          let updated = list.map<NodalOfficer, NodalOfficer>(func(o : NodalOfficer) {
            if (o.id == userId) {
              let newAttempts = o.loginAttempts + 1;
              attempts := newAttempts;
              { o with loginAttempts = newAttempts; isLocked = newAttempts >= 5 }
            } else { o }
          });
          nodalStore.add(constituencyId, updated);
          attempts;
        };
      };
    };
  };

  public func resetLoginAttempts(
    supervisorStore : Map.Map<Text, [Supervisor]>,
    nodalStore : Map.Map<Text, [NodalOfficer]>,
    constituencyId : Text,
    userId : Text,
    role : Text,
  ) : () {
    if (role == "supervisor") {
      switch (supervisorStore.get(constituencyId)) {
        case null {};
        case (?list) {
          let updated = list.map<Supervisor, Supervisor>(func(s : Supervisor) {
            if (s.id == userId) { { s with loginAttempts = 0; isLocked = false } } else { s }
          });
          supervisorStore.add(constituencyId, updated);
        };
      };
    } else {
      switch (nodalStore.get(constituencyId)) {
        case null {};
        case (?list) {
          let updated = list.map<NodalOfficer, NodalOfficer>(func(o : NodalOfficer) {
            if (o.id == userId) { { o with loginAttempts = 0; isLocked = false } } else { o }
          });
          nodalStore.add(constituencyId, updated);
        };
      };
    };
  };

  public func checkPasswordChangeRequired(
    supervisorStore : Map.Map<Text, [Supervisor]>,
    nodalStore : Map.Map<Text, [NodalOfficer]>,
    constituencyId : Text,
    userId : Text,
    role : Text,
  ) : Bool {
    if (role == "supervisor") {
      switch (supervisorStore.get(constituencyId)) {
        case null { true };
        case (?list) {
          switch (list.find<Supervisor>(func(s : Supervisor) { s.id == userId })) {
            case null { true };
            case (?sup) { sup.password == null };
          };
        };
      };
    } else if (role == "nodal") {
      switch (nodalStore.get(constituencyId)) {
        case null { true };
        case (?list) {
          switch (list.find<NodalOfficer>(func(o : NodalOfficer) { o.id == userId })) {
            case null { true };
            case (?nodal) { nodal.password == null };
          };
        };
      };
    } else {
      false;
    };
  };
};
