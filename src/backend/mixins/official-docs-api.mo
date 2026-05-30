import T "../types/records";
import Array "mo:core/Array";

// ─── शासकीय दस्तऐवज Metadata Mixin ──────────────────────────────────────
// Stores metadata for official documents (PDFs).
// The actual file is stored in object-storage; only the metadata lives here.

mixin (state : {
  var officialDocsMeta : [T.OfficialDocumentMeta];
}) {

  /// Add official document metadata after a file has been uploaded to object-storage.
  public shared func addOfficialDocMeta(meta : T.OfficialDocumentMeta) : async { #ok; #err : Text } {
    // Reject duplicate ids
    let exists = switch (state.officialDocsMeta.find(func(m) { m.id == meta.id })) {
      case (?_) true;
      case null false;
    };
    if (exists) return #err "Document with this id already exists";
    state.officialDocsMeta := state.officialDocsMeta.concat([meta]);
    #ok;
  };

  /// Get all official document metadata for a constituency
  public shared func getOfficialDocMetas(constituency : Text) : async [T.OfficialDocumentMeta] {
    state.officialDocsMeta.filter(func(m) { m.constituency == constituency });
  };

  /// Delete official document metadata by id
  public shared func deleteOfficialDocMeta(id : Text) : async { #ok; #err : Text } {
    let before = state.officialDocsMeta.size();
    state.officialDocsMeta := state.officialDocsMeta.filter(func(m) { m.id != id });
    if (state.officialDocsMeta.size() < before) #ok
    else #err "Document not found";
  };
};
