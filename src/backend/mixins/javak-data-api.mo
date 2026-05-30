import JavakDataLib "../lib/javak-data";
import Map "mo:core/Map";
import RecordTypes "../types/records";

mixin (
  constituencyJavakEntries : Map.Map<Text, Map.Map<Text, RecordTypes.JavakEntry>>,
  javakDataVersions : Map.Map<Text, Nat>,
) {
  // Internal helper — bump the data version for a constituency
  func bumpJavakVersion(constituencyId : Text) {
    let current = switch (javakDataVersions.get(constituencyId)) {
      case null { 0 };
      case (?v) { v };
    };
    javakDataVersions.add(constituencyId, current + 1);
  };

  public shared func getAllJavakEntries(constituencyId : Text) : async [RecordTypes.JavakEntry] {
    JavakDataLib.getJavakEntries(constituencyJavakEntries, constituencyId);
  };

  public shared func saveJavakData(constituencyId : Text, entry : RecordTypes.JavakEntry) : async Bool {
    let result = JavakDataLib.saveJavakEntry(constituencyJavakEntries, constituencyId, entry);
    bumpJavakVersion(constituencyId);
    result;
  };

  public shared func deleteJavakData(constituencyId : Text, entryId : Text) : async Bool {
    let result = JavakDataLib.deleteJavakEntry(constituencyJavakEntries, constituencyId, entryId);
    bumpJavakVersion(constituencyId);
    result;
  };

  public shared func bulkSaveJavakData(constituencyId : Text, entries : [RecordTypes.JavakEntry]) : async Bool {
    let result = JavakDataLib.bulkSaveJavakEntries(constituencyJavakEntries, constituencyId, entries);
    bumpJavakVersion(constituencyId);
    result;
  };

  // Fresh update-call variant — bypasses IC HTTP query cache for cross-device sync
  public shared func getAllJavakEntriesFresh(constituencyId : Text) : async [RecordTypes.JavakEntry] {
    JavakDataLib.getJavakEntries(constituencyJavakEntries, constituencyId);
  };
};
