import BloDataLib "../lib/blo-data";
import Map "mo:core/Map";
import CommonTypes "../types/common";

mixin (
  constituencyBLOs : Map.Map<Text, Map.Map<Text, CommonTypes.BLO>>,
  bloDataVersions : Map.Map<Text, Nat>,
) {
  // Internal helper — bump the data version for a constituency
  func bumpBloVersion(constituencyId : Text) {
    let current = switch (bloDataVersions.get(constituencyId)) {
      case null { 0 };
      case (?v) { v };
    };
    bloDataVersions.add(constituencyId, current + 1);
  };

  public shared func getBLOs(constituencyId : Text) : async [CommonTypes.BLO] {
    BloDataLib.getBLOs(constituencyBLOs, constituencyId);
  };

  public shared func saveBLO(constituencyId : Text, blo : CommonTypes.BLO) : async Bool {
    let result = BloDataLib.saveBLO(constituencyBLOs, constituencyId, blo);
    bumpBloVersion(constituencyId);
    result;
  };

  public shared func updateBLO(constituencyId : Text, blo : CommonTypes.BLO) : async Bool {
    let result = BloDataLib.updateBLO(constituencyBLOs, constituencyId, blo);
    bumpBloVersion(constituencyId);
    result;
  };

  public shared func deleteBLO(constituencyId : Text, bloId : Text) : async Bool {
    let result = BloDataLib.deleteBLO(constituencyBLOs, constituencyId, bloId);
    bumpBloVersion(constituencyId);
    result;
  };

  public shared func bulkSaveBLOs(constituencyId : Text, blos : [CommonTypes.BLO]) : async Bool {
    let result = BloDataLib.bulkSaveBLOs(constituencyBLOs, constituencyId, blos);
    bumpBloVersion(constituencyId);
    result;
  };

  // Fresh update-call variant — bypasses IC HTTP query cache for cross-device sync
  public shared func getBLOsFresh(constituencyId : Text) : async [CommonTypes.BLO] {
    BloDataLib.getBLOs(constituencyBLOs, constituencyId);
  };
};
