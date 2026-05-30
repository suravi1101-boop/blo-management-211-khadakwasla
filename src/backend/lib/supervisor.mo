import Types "../types/supervisor";
import Map "mo:core/Map";
import Array "mo:core/Array";

module {
  public type Supervisor   = Types.Supervisor;
  public type NodalOfficer = Types.NodalOfficer;

  /// Get all supervisors for a constituency
  public func getSupervisors(
    supervisorMap : Map.Map<Text, [Supervisor]>,
    constituencyId : Text,
  ) : [Supervisor] {
    switch (supervisorMap.get(constituencyId)) {
      case (?list) list;
      case null [];
    };
  };

  /// Create or update a supervisor
  public func saveSupervisor(
    supervisorMap : Map.Map<Text, [Supervisor]>,
    supervisor : Supervisor,
  ) {
    let existing = switch (supervisorMap.get(supervisor.constituencyId)) {
      case (?list) list;
      case null [];
    };
    let filtered = existing.filter<Supervisor>(func(s : Supervisor) { s.id != supervisor.id });
    supervisorMap.add(supervisor.constituencyId, filtered.concat([supervisor]));
  };

  /// Update supervisor fields
  public func updateSupervisor(
    supervisorMap : Map.Map<Text, [Supervisor]>,
    supervisor : Supervisor,
  ) {
    saveSupervisor(supervisorMap, supervisor);
  };

  /// Login: validate phone + password, return ?Supervisor
  /// Login: validate phone + password, return ?Supervisor
  /// Plain text comparison — no hashing. Password stored as ?Text; null = not set.
  public func supervisorLogin(
    supervisorMap : Map.Map<Text, [Supervisor]>,
    constituencyId : Text,
    phone : Text,
    password : Text,
  ) : ?Supervisor {
    let list = switch (supervisorMap.get(constituencyId)) {
      case (?l) l;
      case null return null;
    };
    list.find<Supervisor>(func(s : Supervisor) {
      s.phone == phone and
      s.isActive and
      not s.isLocked and
      (switch (s.password) { case (?p) p == password; case null false })
    });
  };

  /// Get all nodal officers for a constituency
  public func getNodalOfficers(
    nodalMap : Map.Map<Text, [NodalOfficer]>,
    constituencyId : Text,
  ) : [NodalOfficer] {
    switch (nodalMap.get(constituencyId)) {
      case (?list) list;
      case null [];
    };
  };

  /// Create or update a nodal officer
  public func saveNodalOfficer(
    nodalMap : Map.Map<Text, [NodalOfficer]>,
    officer : NodalOfficer,
  ) {
    let existing = switch (nodalMap.get(officer.constituencyId)) {
      case (?list) list;
      case null [];
    };
    let filtered = existing.filter<NodalOfficer>(func(o : NodalOfficer) { o.id != officer.id });
    nodalMap.add(officer.constituencyId, filtered.concat([officer]));
  };

  /// Login: validate designation + password, return ?NodalOfficer
  /// Login: validate designation + password, return ?NodalOfficer
  /// Plain text comparison — no hashing. Password stored as ?Text; null = not set.
  public func nodalOfficerLogin(
    nodalMap : Map.Map<Text, [NodalOfficer]>,
    constituencyId : Text,
    designation : Text,
    password : Text,
  ) : ?NodalOfficer {
    let list = switch (nodalMap.get(constituencyId)) {
      case (?l) l;
      case null return null;
    };
    list.find<NodalOfficer>(func(o : NodalOfficer) {
      o.designation == designation and
      o.isActive and
      not o.isLocked and
      (switch (o.password) { case (?p) p == password; case null false })
    });
  };
};
