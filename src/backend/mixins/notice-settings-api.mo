import NoticeSettingsLib "../lib/notice-settings";
import T "../types/records";
import Time "mo:core/Time";

mixin (noticeSettings : { var noticeSettings : [T.NoticeSettings] }) {
  type NoticeSettings = T.NoticeSettings;

  /// Get notice header and officer settings for a constituency
  public query func getNoticeSettings(constituencyId : Text) : async ?NoticeSettings {
    NoticeSettingsLib.getSettings(noticeSettings.noticeSettings, constituencyId);
  };

  /// Save (upsert) notice settings for a constituency
  public shared func saveNoticeSettings(settings : NoticeSettings) : async Bool {
    let s : NoticeSettings = { settings with updatedAt = Time.now() };
    noticeSettings.noticeSettings := NoticeSettingsLib.saveSettings(noticeSettings.noticeSettings, s);
    true;
  };
};
