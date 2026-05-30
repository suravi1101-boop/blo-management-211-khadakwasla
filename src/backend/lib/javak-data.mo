import Map "mo:core/Map";
import RecordTypes "../types/records";

module {
  public func getJavakEntries(
    constituencyJavak : Map.Map<Text, Map.Map<Text, RecordTypes.JavakEntry>>,
    constituencyId : Text,
  ) : [RecordTypes.JavakEntry] {
    switch (constituencyJavak.get(constituencyId)) {
      case null { [] };
      case (?inner) { inner.values().toArray() };
    };
  };

  public func saveJavakEntry(
    constituencyJavak : Map.Map<Text, Map.Map<Text, RecordTypes.JavakEntry>>,
    constituencyId : Text,
    entry : RecordTypes.JavakEntry,
  ) : Bool {
    let inner : Map.Map<Text, RecordTypes.JavakEntry> = switch (constituencyJavak.get(constituencyId)) {
      case null {
        let m = Map.empty<Text, RecordTypes.JavakEntry>();
        constituencyJavak.add(constituencyId, m);
        m;
      };
      case (?m) { m };
    };
    inner.add(entry.id, entry);
    true;
  };

  public func deleteJavakEntry(
    constituencyJavak : Map.Map<Text, Map.Map<Text, RecordTypes.JavakEntry>>,
    constituencyId : Text,
    entryId : Text,
  ) : Bool {
    switch (constituencyJavak.get(constituencyId)) {
      case null { false };
      case (?inner) {
        inner.remove(entryId);
        true;
      };
    };
  };

  public func bulkSaveJavakEntries(
    constituencyJavak : Map.Map<Text, Map.Map<Text, RecordTypes.JavakEntry>>,
    constituencyId : Text,
    entries : [RecordTypes.JavakEntry],
  ) : Bool {
    let inner : Map.Map<Text, RecordTypes.JavakEntry> = switch (constituencyJavak.get(constituencyId)) {
      case null {
        let m = Map.empty<Text, RecordTypes.JavakEntry>();
        constituencyJavak.add(constituencyId, m);
        m;
      };
      case (?m) { m };
    };
    for (entry in entries.values()) {
      inner.add(entry.id, entry);
    };
    true;
  };
};
