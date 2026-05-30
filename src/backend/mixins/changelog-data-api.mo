import ChangelogDataLib "../lib/changelog-data";
import Map "mo:core/Map";
import RecordTypes "../types/records";

mixin (
  bloChangeRecords : Map.Map<Text, Map.Map<Text, RecordTypes.BLOChangeRecord>>,
  changelogDataVersions : Map.Map<Text, Nat>,
) {
  // Internal helper — bump the data version for a constituency
  func bumpChangelogVersion(constituencyId : Text) {
    let current = switch (changelogDataVersions.get(constituencyId)) {
      case null { 0 };
      case (?v) { v };
    };
    changelogDataVersions.add(constituencyId, current + 1);
  };

  public shared func getAllBLOChangeLogs(constituencyId : Text) : async [RecordTypes.BLOChangeRecord] {
    ChangelogDataLib.getBLOChangeLogs(bloChangeRecords, constituencyId);
  };

  public shared func saveBLOChangeData(constituencyId : Text, record : RecordTypes.BLOChangeRecord) : async Bool {
    let result = ChangelogDataLib.saveBLOChangeLog(bloChangeRecords, constituencyId, record);
    bumpChangelogVersion(constituencyId);
    result;
  };

  public shared func bulkSaveBLOChangeLogs(constituencyId : Text, records : [RecordTypes.BLOChangeRecord]) : async Bool {
    let result = ChangelogDataLib.bulkSaveBLOChangeLogs(bloChangeRecords, constituencyId, records);
    bumpChangelogVersion(constituencyId);
    result;
  };
};
