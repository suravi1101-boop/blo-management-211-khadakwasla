import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type ConstituencyConfig,
  useAddConstituency,
  useConstituencyConfigs,
  usePasswordHistory,
  useSetConstituencyAdminPassword,
  useSetConstituencyEnabled,
} from "../hooks/useQueries";
import type { PasswordHistoryEntry } from "../hooks/useQueries";
import { superAdminLogin, useBackendActor } from "../lib/backendService";
import GPSTrackingPanel from "./GPSTrackingPanel";

// Official Pune district constituency list (211–231)
const PUNE_CONSTITUENCY_LIST = [{ id: "211", name: "211 खडकवासला" }];

const SuperAdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [loggedIn, setLoggedIn] = useState(
    () => sessionStorage.getItem("super_admin_session") === "true",
  );
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "enable" | "passwords" | "history" | "gps" | "constituency"
  >("enable");

  // Tab A — enable/disable (backend-authoritative)
  // Initialize with empty map — backend is the ONLY source of truth.
  // Never seed from localStorage; it belongs to the device that wrote it.
  const { data: backendEnabled, isLoading: configsLoading } =
    useConstituencyConfigs();
  const [enabledStatus, setEnabledStatus] = useState<Record<string, boolean>>(
    {},
  );

  // Sync from backend when data arrives — convert ConstituencyConfig[] to Record<string, boolean>
  useEffect(() => {
    if (backendEnabled && backendEnabled.length > 0) {
      const map: Record<string, boolean> = {};
      for (const cfg of backendEnabled) {
        map[cfg.id] = cfg.isEnabled;
      }
      setEnabledStatus(map);
    }
  }, [backendEnabled]);

  // Tab B — constituency passwords
  const [_constPasswords, _setConstPasswords] = useState<
    Record<string, string>
  >({});
  // Tab B — backend password history
  const { data: passwordHistoryData, isLoading: historyLoading } =
    usePasswordHistory();
  const backendHistory: PasswordHistoryEntry[] = passwordHistoryData
    ? [...passwordHistoryData].sort((a, b) => Number(b.timestamp - a.timestamp))
    : [];
  // Tab C — history filter
  const [historyFilter, setHistoryFilter] = useState("");
  // Per-row saving state: maps constituencyId -> 'saving' | 'saved' | 'error'
  const [rowStatus, setRowStatus] = useState<
    Record<string, "saving" | "saved" | "error">
  >({});

  // Constituency management state
  const [newConstituencyId, setNewConstituencyId] = useState("");
  const [newConstituencyName, setNewConstituencyName] = useState("");
  const [newConstituencyPassword, setNewConstituencyPassword] = useState("");
  const [addConstituencyError, setAddConstituencyError] = useState("");
  const [addConstituencySuccess, setAddConstituencySuccess] = useState("");
  const [passwordChanges, setPasswordChanges] = useState<
    Record<string, string>
  >({});
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<
    Record<string, boolean>
  >({});

  const { data: allConfigs, isLoading: allConfigsLoading } =
    useConstituencyConfigs();
  const addConstituencyMutation = useAddConstituency();
  const setPasswordMutation = useSetConstituencyAdminPassword();
  const setConstituencyEnabledMutation = useSetConstituencyEnabled();
  const actor = useBackendActor();

  const handleLogin = async () => {
    if (!actor) {
      setPwError("बॅकेंड उपलब्ध नाही. कृपया पुन्हा प्रयत्न करा.");
      return;
    }
    try {
      const ok = await superAdminLogin(actor, password);
      if (ok) {
        sessionStorage.setItem("super_admin_session", "true");
        setLoggedIn(true);
        setPwError("");
      } else {
        setPwError("चुकीचा Super Admin password.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setPwError(`लॉगिन त्रुटी: ${msg}`);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("super_admin_session");
    setLoggedIn(false);
    onClose();
  };

  // Password history loaded via usePasswordHistory hook
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional no-op
  useEffect(() => {}, [loggedIn, activeTab]);

  // Toggle a constituency and immediately save to backend
  const handleToggle = (id: string, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled;
    // Optimistic UI update
    setEnabledStatus((prev) => ({ ...prev, [id]: newEnabled }));
    setRowStatus((prev) => ({ ...prev, [id]: "saving" }));
    setConstituencyEnabledMutation.mutate(
      { constituencyId: id, enabled: newEnabled },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["constituencyConfigs"] });
          setRowStatus((prev) => ({ ...prev, [id]: "saved" }));
          setTimeout(
            () =>
              setRowStatus((prev) => {
                const n = { ...prev };
                delete n[id];
                return n;
              }),
            2000,
          );
        },
        onError: (err: unknown) => {
          // Revert optimistic update on failure
          setEnabledStatus((prev) => ({ ...prev, [id]: currentEnabled }));
          setRowStatus((prev) => ({ ...prev, [id]: "error" }));
          setTimeout(
            () =>
              setRowStatus((prev) => {
                const n = { ...prev };
                delete n[id];
                return n;
              }),
            3000,
          );
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`[SuperAdmin] toggle(${id}) failed:`, err);
          toast.error(`बदल अयशस्वी: ${errMsg}`);
        },
      },
    );
  };

  // Tab C: Load all history
  const getAllHistory = () => {
    return backendHistory;
  };

  const _formatDate = (ts: string) => {
    try {
      return new Date(ts).toLocaleString("mr-IN");
    } catch {
      return ts;
    }
  };

  // Format bigint nanosecond timestamp from backend into DD/MM/YYYY HH:MM
  const formatBackendTimestamp = (ns: bigint): string => {
    try {
      const ms = Number(ns / BigInt(1_000_000));
      const d = new Date(ms);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    } catch {
      return String(ns);
    }
  };

  if (!loggedIn) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 w-80 shadow-2xl">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm font-semibold text-gray-700">Super Admin</p>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
              aria-label="बंद करा"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm pr-10"
                placeholder="Super Admin Password"
                // biome-ignore lint/a11y/noAutofocus: needed for quick access
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-2 top-2 text-gray-500"
                aria-label={showPw ? "Password लपवा" : "Password पहा"}
              >
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>
            {pwError && <p className="text-red-600 text-xs">{pwError}</p>}
            <button
              type="button"
              onClick={handleLogin}
              className="w-full bg-gray-800 text-white py-2 rounded text-sm hover:bg-gray-900"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const history = getAllHistory();
  const _filteredHistory = history.filter(
    (h) => !historyFilter || h.constituencyId === historyFilter,
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gray-800 text-white px-4 py-3 flex justify-between items-center">
          <span className="text-sm font-semibold">🛡️ Super Admin Panel</span>
          <button
            type="button"
            onClick={handleLogout}
            className="text-gray-300 hover:text-white text-sm"
          >
            बाहेर पडा ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50 overflow-x-auto">
          {(["enable", "history", "gps", "constituency"] as const).map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                  activeTab === tab
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {tab === "enable"
                  ? "🗺️ मतदारसंघ सक्रिय/निष्क्रिय"
                  : tab === "history"
                    ? "📋 Password इतिहास"
                    : tab === "gps"
                      ? "📍 GPS व्यवस्थापन"
                      : "🏛️ मतदारसंघ व्यवस्थापन"}
              </button>
            ),
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Tab A: Enable/Disable */}
          {activeTab === "enable" && (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                सर्व मतदारसंघांचा access enable किंवा disable करा:
              </p>
              {configsLoading && (
                <p className="text-xs text-blue-600 mb-3">
                  ⟳ Backend मधून माहिती येत आहे...
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                {PUNE_CONSTITUENCY_LIST.map((c) => {
                  const isEnabled = enabledStatus[c.id] !== false;
                  const status = rowStatus[c.id];
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 border border-gray-100"
                    >
                      <span className="text-sm flex-1 mr-2">{c.name}</span>
                      {status === "saving" && (
                        <span className="text-xs text-blue-500 mr-2">⟳</span>
                      )}
                      {status === "saved" && (
                        <span className="text-xs text-green-600 mr-2">✓</span>
                      )}
                      {status === "error" && (
                        <span className="text-xs text-red-500 mr-2">✗</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggle(c.id, isEnabled)}
                        disabled={status === "saving"}
                        aria-label={isEnabled ? "निष्क्रिय करा" : "सक्रिय करा"}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer disabled:opacity-60 ${
                          isEnabled ? "bg-green-500" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isEnabled ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab B: Backend Password History */}
          {activeTab === "history" && (
            <div>
              <div className="flex gap-2 mb-4 items-center">
                <select
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                  data-ocid="super_admin.history_filter_select"
                >
                  <option value="">सर्व मतदारसंघ</option>
                  {PUNE_CONSTITUENCY_LIST.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-500 ml-auto">
                  एकूण: {backendHistory.length} नोंदी
                </span>
              </div>
              {historyLoading ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  लोड होत आहे...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-3 py-2 text-left">वेळ</th>
                        <th className="border px-3 py-2 text-left">बदल केले</th>
                        <th className="border px-3 py-2 text-left">भूमिका</th>
                        <th className="border px-3 py-2 text-left">मतदारसंघ</th>
                        <th className="border px-3 py-2 text-left">क्रिया</th>
                        <th className="border px-3 py-2 text-left">Password</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backendHistory.map((h, i) => (
                        <tr
                          key={`backend-${String(h.timestamp)}-${i}`}
                          className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          <td className="border px-3 py-1 whitespace-nowrap">
                            {formatBackendTimestamp(h.timestamp)}
                          </td>
                          <td className="border px-3 py-1">{h.changedBy}</td>
                          <td className="border px-3 py-1">{h.role}</td>
                          <td className="border px-3 py-1">—</td>
                          <td className="border px-3 py-1">बदल केले</td>
                          <td className="border px-3 py-1 font-mono text-xs">
                            —
                          </td>
                        </tr>
                      ))}
                      {backendHistory.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="border px-3 py-6 text-center text-gray-500"
                          >
                            कोणताही इतिहास नाही
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab D: GPS Management */}
          {activeTab === "gps" && <GPSTrackingPanel />}

          {/* Tab E: Constituency Management */}
          {activeTab === "constituency" && (
            <div>
              {allConfigsLoading && (
                <p className="text-xs text-blue-600 mb-3">
                  ⟳ Backend मधून माहिती येत आहे...
                </p>
              )}

              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-3 py-2 text-left">मतदारसंघ ID</th>
                      <th className="border px-3 py-2 text-left">नाव</th>
                      <th className="border px-3 py-2 text-left">स्थिती</th>
                      <th className="border px-3 py-2 text-left">
                        Password बदला
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allConfigs &&
                    Array.isArray(allConfigs) &&
                    allConfigs.length > 0 ? (
                      allConfigs.map(
                        (config: ConstituencyConfig, idx: number) => (
                          <tr
                            key={config.id || idx}
                            className={
                              idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }
                          >
                            <td className="border px-3 py-2">{config.id}</td>
                            <td className="border px-3 py-2">{config.name}</td>
                            <td className="border px-3 py-2">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                  config.isEnabled
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {config.isEnabled ? "सक्रिय" : "निष्क्रिय"}
                              </span>
                            </td>
                            <td className="border px-3 py-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="password"
                                  placeholder="नवीन पासवर्ड"
                                  value={passwordChanges[config.id] || ""}
                                  onChange={(e) =>
                                    setPasswordChanges((prev) => ({
                                      ...prev,
                                      [config.id]: e.target.value,
                                    }))
                                  }
                                  className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
                                  data-ocid={`super_admin.password_input.${config.id}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newPassword =
                                      passwordChanges[config.id];
                                    if (!newPassword) return;
                                    setPasswordMutation.mutate(
                                      {
                                        constituencyId: config.id,
                                        newPassword,
                                        changedBy: "super_admin",
                                      },
                                      {
                                        onSuccess: () => {
                                          setPasswordChangeSuccess((prev) => ({
                                            ...prev,
                                            [config.id]: true,
                                          }));
                                          setPasswordChanges((prev) => {
                                            const n = { ...prev };
                                            delete n[config.id];
                                            return n;
                                          });
                                          setTimeout(() => {
                                            setPasswordChangeSuccess((prev) => {
                                              const n = { ...prev };
                                              delete n[config.id];
                                              return n;
                                            });
                                          }, 3000);
                                        },
                                        onError: (err: unknown) => {
                                          const errMsg =
                                            err instanceof Error
                                              ? err.message
                                              : String(err);
                                          toast.error(
                                            `Password बदल अयशस्वी: ${errMsg}`,
                                          );
                                        },
                                      },
                                    );
                                  }}
                                  disabled={
                                    !passwordChanges[config.id] ||
                                    setPasswordMutation.isPending
                                  }
                                  className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                                  data-ocid={`super_admin.password_change_button.${config.id}`}
                                >
                                  {setPasswordMutation.isPending ? "⟳" : "बदला"}
                                </button>
                                {passwordChangeSuccess[config.id] && (
                                  <span className="text-xs text-green-600">
                                    ✓ जतन झाले
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ),
                      )
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="border px-3 py-6 text-center text-gray-500"
                        >
                          कोणतेही मतदारसंघ सापडले नाहीत
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add new constituency */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  ➕ नवीन मतदारसंघ जोडा
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <input
                    placeholder="मतदारसंघ ID (उदा. 212)"
                    value={newConstituencyId}
                    onChange={(e) => setNewConstituencyId(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                    data-ocid="super_admin.new_constituency_id_input"
                  />
                  <input
                    placeholder="मतदारसंघ नाव"
                    value={newConstituencyName}
                    onChange={(e) => setNewConstituencyName(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                    data-ocid="super_admin.new_constituency_name_input"
                  />
                  <input
                    type="password"
                    placeholder="अ‍ॅडमिन पासवर्ड"
                    value={newConstituencyPassword}
                    onChange={(e) => setNewConstituencyPassword(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                    data-ocid="super_admin.new_constituency_password_input"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAddConstituencyError("");
                    setAddConstituencySuccess("");
                    if (
                      !newConstituencyId ||
                      !newConstituencyName ||
                      !newConstituencyPassword
                    ) {
                      setAddConstituencyError("सर्व fields भरा");
                      return;
                    }
                    addConstituencyMutation.mutate(
                      {
                        id: newConstituencyId,
                        name: newConstituencyName,
                        adminPassword: newConstituencyPassword,
                      },
                      {
                        onSuccess: () => {
                          setAddConstituencySuccess(
                            `मतदारसंघ ${newConstituencyId} यशस्वीरित्या जोडला`,
                          );
                          setNewConstituencyId("");
                          setNewConstituencyName("");
                          setNewConstituencyPassword("");
                        },
                        onError: (err: unknown) => {
                          const errMsg =
                            err instanceof Error ? err.message : String(err);
                          setAddConstituencyError(
                            `मतदारसंघ जोडताना त्रुटी: ${errMsg}`,
                          );
                        },
                      },
                    );
                  }}
                  disabled={addConstituencyMutation.isPending}
                  className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                  data-ocid="super_admin.add_constituency_button"
                >
                  {addConstituencyMutation.isPending ? "⟳ जोडत आहे..." : "जोडा"}
                </button>
                {addConstituencySuccess && (
                  <p className="text-green-600 text-xs mt-2">
                    {addConstituencySuccess}
                  </p>
                )}
                {addConstituencyError && (
                  <p className="text-red-600 text-xs mt-2">
                    {addConstituencyError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tiny active indicator */}
      <div className="fixed bottom-2 right-2 w-2 h-2 bg-green-500 rounded-full opacity-40 z-[9998]" />
    </div>
  );
};

export default SuperAdminPanel;
