import Map "mo:core/Map";
import RecordTypes "../types/records";

module {
  public func getBLOChangeLogs(
    bloChangeRecords : Map.Map<Text, Map.Map<Text, RecordTypes.BLOChangeRecord>>,
    constituencyId : Text,
  ) : [RecordTypes.BLOChangeRecord] {
    switch (bloChangeRecords.get(constituencyId)) {
      case null { [] };
      case (?inner) { inner.values().toArray() };
    };
  };

  public func saveBLOChangeLog(
    bloChangeRecords : Map.Map<Text, Map.Map<Text, RecordTypes.BLOChangeRecord>>,
    constituencyId : Text,
    record : RecordTypes.BLOChangeRecord,
  ) : Bool {
    let inner : Map.Map<Text, RecordTypes.BLOChangeRecord> = switch (bloChangeRecords.get(constituencyId)) {
      case null {
        let m = Map.empty<Text, RecordTypes.BLOChangeRecord>();
        bloChangeRecords.add(constituencyId, m);
        m;
      };
      case (?m) { m };
    };
    inner.add(record.id, record);
    true;
  };

  public func bulkSaveBLOChangeLogs(
    bloChangeRecords : Map.Map<Text, Map.Map<Text, RecordTypes.BLOChangeRecord>>,
    constituencyId : Text,
    records : [RecordTypes.BLOChangeRecord],
  ) : Bool {
    let inner : Map.Map<Text, RecordTypes.BLOChangeRecord> = switch (bloChangeRecords.get(constituencyId)) {
      case null {
        let m = Map.empty<Text, RecordTypes.BLOChangeRecord>();
        bloChangeRecords.add(constituencyId, m);
        m;
      };
      case (?m) { m };
    };
    for (rec in records.values()) {
      inner.add(rec.id, rec);
    };
    true;
  };
};
