import type { GPSTrackingRecord } from "@/backend";
import type React from "react";
import { useState } from "react";
import { useGPSTrackingInfo, useSaveGPSLocation } from "../hooks/useQueries";
import { isSuperAdminLoggedIn } from "../lib/auth";

const GPSTrackingPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"list" | "register">("list");
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [lat, setLat] = useState<string>("");
  const [lon, setLon] = useState<string>("");
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string>("");
  const [locationError, setLocationError] = useState<string>("");
  const [showManualEntry, setShowManualEntry] = useState<boolean>(false);
  const [locationSuccess, setLocationSuccess] = useState<boolean>(false);

  const { data: trackingInfo, isLoading, isError } = useGPSTrackingInfo("211");
  const saveGPSMutation = useSaveGPSLocation();

  if (!isSuperAdminLoggedIn()) return null;

  const records: GPSTrackingRecord[] =
    (trackingInfo as GPSTrackingRecord[] | undefined) ?? [];

  const selectedRecord: GPSTrackingRecord | undefined = records.find(
    (r) => r.pollingStationId === selectedStationId,
  );

  const handleGetCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationError("या उपकरणावर GPS उपलब्ध नाही. खाली मॅन्युअली भरा.");
      setShowManualEntry(true);
      return;
    }
    setLocationLoading(true);
    setLocationError("");
    setLocationSuccess(false);
    setSaveSuccess(false);
    setSaveError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLon(pos.coords.longitude.toFixed(6));
        setLocationLoading(false);
        setLocationSuccess(true);
        setLocationError("");
        setShowManualEntry(false);
      },
      (err) => {
        setLocationLoading(false);
        setLocationSuccess(false);
        setShowManualEntry(true);
        if (err.code === 1) {
          setLocationError(
            "GPS परवानगी नाकारली. ब्राउझरच्या सेटिंग मध्ये परवानगी द्या.",
          );
        } else if (err.code === 3) {
          setLocationError("GPS मिळाले नाही (timeout). पुन्हा प्रयत्न करा.");
        } else {
          setLocationError("GPS मिळाले नाही. पुन्हा प्रयत्न करा.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const handleSave = () => {
    if (!selectedStationId || !lat || !lon) return;

    setSaveSuccess(false);
    setSaveError("");

    saveGPSMutation.mutate(
      {
        constituencyId: "211",
        location: {
          pollingStationId: selectedStationId,
          constituencyId: "211",
          lat: Number.parseFloat(lat),
          lon: Number.parseFloat(lon),
          updatedBy: "सुपर ॲडमिन",
          updatedByRole: "super_admin",
          updatedByName: "सुपर ॲडमिन",
          updatedAt: BigInt(Date.now()),
        },
      },
      {
        onSuccess: () => {
          setSaveSuccess(true);
          setLat("");
          setLon("");
          setSelectedStationId("");
        },
        onError: (err: unknown) => {
          const message =
            err instanceof Error ? err.message : "जतन करताना त्रुटी आली";
          setSaveError(message);
        },
      },
    );
  };

  const formatDate = (ts?: bigint | ([] | [bigint])): string => {
    const val = Array.isArray(ts) ? (ts as [bigint] | [])[0] : ts;
    if (val === undefined || val === null) return "—";
    try {
      return new Date(Number(val) / 1_000_000).toLocaleString("mr-IN");
    } catch {
      return "—";
    }
  };

  const getUpdaterName = (record: GPSTrackingRecord): string => {
    if (record.assignedBLOName) return `${record.assignedBLOName} (BLO)`;
    if (record.assignedSupervisorName)
      return `${record.assignedSupervisorName} (पर्यवेक्षक)`;
    if (record.assignedNodalOfficerName)
      return `${record.assignedNodalOfficerName} (नोडल)`;
    if (record.gpsUpdatedByName) {
      const role = record.gpsUpdatedByRole
        ? `(${record.gpsUpdatedByRole})`
        : "";
      return `${record.gpsUpdatedByName} ${role}`.trim();
    }
    return "—";
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md border border-blue-200 p-4 mt-4"
      data-ocid="gps.panel"
    >
      <h2 className="text-xl font-bold text-blue-900 mb-4">GPS स्थान ट्रॅकिंग</h2>

      {/* Tabs */}
      <div
        className="flex border-b border-blue-200 mb-4"
        data-ocid="gps.tab.list"
      >
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === "list"
              ? "border-blue-600 text-blue-800"
              : "border-transparent text-blue-600 hover:text-blue-800"
          }`}
          data-ocid="gps.tab.list_button"
        >
          GPS यादी
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("register")}
          className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === "register"
              ? "border-blue-600 text-blue-800"
              : "border-transparent text-blue-600 hover:text-blue-800"
          }`}
          data-ocid="gps.tab.register_button"
        >
          GPS नोंदणी
        </button>
      </div>

      {/* TAB 1: GPS यादी */}
      {activeTab === "list" && (
        <div data-ocid="gps.list.section">
          {isLoading && <div className="text-center py-4">लोड होत आहे...</div>}

          {isError && (
            <div className="text-red-600 py-4">माहिती मिळवताना त्रुटी आली.</div>
          )}

          {!isLoading && !isError && records.length === 0 && (
            <div
              className="text-center py-8 text-blue-700"
              data-ocid="gps.list.empty_state"
            >
              अद्याप कोणतेही GPS स्थान नोंदवलेले नाही
            </div>
          )}

          {!isLoading && !isError && records.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-blue-200">
                <thead>
                  <tr className="bg-blue-100 text-blue-900">
                    <th className="px-3 py-2 text-left font-semibold border border-blue-200">
                      भाग क्र.
                    </th>
                    <th className="px-3 py-2 text-left font-semibold border border-blue-200">
                      केंद्राचे नाव
                    </th>
                    <th className="px-3 py-2 text-left font-semibold border border-blue-200">
                      GPS अक्षांश
                    </th>
                    <th className="px-3 py-2 text-left font-semibold border border-blue-200">
                      GPS रेखांश
                    </th>
                    <th className="px-3 py-2 text-left font-semibold border border-blue-200">
                      अपडेट केले
                    </th>
                    <th className="px-3 py-2 text-left font-semibold border border-blue-200">
                      अपडेट वेळ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => {
                    return (
                      <tr
                        key={record.pollingStationId || index}
                        className={index % 2 === 0 ? "bg-white" : "bg-blue-50"}
                        data-ocid={`gps.list.item.${index + 1}`}
                      >
                        <td className="px-3 py-2 border border-blue-200">
                          {record.partNumber !== undefined
                            ? String(Number(record.partNumber))
                            : "—"}
                        </td>
                        <td className="px-3 py-2 border border-blue-200">
                          {record.partName ?? "—"}
                        </td>
                        <td className="px-3 py-2 border border-blue-200 font-mono">
                          {record.gpsLat?.[0] !== undefined
                            ? record.gpsLat[0].toFixed(6)
                            : "नोंदणी नाही"}
                        </td>
                        <td className="px-3 py-2 border border-blue-200 font-mono">
                          {record.gpsLon?.[0] !== undefined
                            ? record.gpsLon[0].toFixed(6)
                            : "नोंदणी नाही"}
                        </td>
                        <td className="px-3 py-2 border border-blue-200">
                          {getUpdaterName(record)}
                        </td>
                        <td className="px-3 py-2 border border-blue-200">
                          {formatDate(record.gpsUpdatedAt?.[0])}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GPS नोंदणी */}
      {activeTab === "register" && (
        <div className="space-y-4" data-ocid="gps.register.section">
          {/* Station Select */}
          <div>
            <label
              htmlFor="station-select"
              className="block text-sm font-semibold text-blue-900 mb-1"
            >
              मतदान केंद्र निवडा:
            </label>
            <select
              id="station-select"
              value={selectedStationId}
              onChange={(e) => {
                setSelectedStationId(e.target.value);
                setSaveSuccess(false);
                setSaveError("");
              }}
              className="w-full border border-blue-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              data-ocid="gps.register.select"
            >
              <option value="">— केंद्र निवडा —</option>
              {records.map((record) => (
                <option
                  key={record.pollingStationId}
                  value={record.pollingStationId}
                >
                  भाग क्र.{" "}
                  {record.partNumber !== undefined
                    ? String(Number(record.partNumber))
                    : "—"}{" "}
                  - {record.partName ?? "—"}
                </option>
              ))}
            </select>
          </div>

          {/* Current GPS display */}
          {selectedRecord?.gpsLat?.[0] !== undefined &&
            selectedRecord?.gpsLon?.[0] !== undefined && (
              <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm text-blue-800">
                सध्याचे GPS: अक्षांश {selectedRecord.gpsLat[0].toFixed(6)}, रेखांश{" "}
                {selectedRecord.gpsLon[0].toFixed(6)}
              </div>
            )}

          {/* Get current location button */}
          <div>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={locationLoading}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors disabled:opacity-50"
              data-ocid="gps.register.get_location_button"
            >
              <span role="img" aria-label="location">
                📍
              </span>
              {locationLoading ? "स्थान मिळवत आहे..." : "सध्याचे स्थान घ्या"}
            </button>
          </div>

          {locationSuccess && lat && lon && (
            <div
              className="text-green-700 text-sm font-semibold"
              data-ocid="gps.register.location_success_state"
            >
              ✅ स्थान मिळाले — {lat}, {lon}
            </div>
          )}
          {locationError && (
            <div
              className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-sm space-y-2"
              data-ocid="gps.register.location_error_state"
            >
              <p>⚠️ {locationError}</p>
              {!locationError.includes("उपलब्ध नाही") && (
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={locationLoading}
                  className="text-xs font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
                  data-ocid="gps.register.retry_button"
                >
                  🔄 पुन्हा प्रयत्न करा
                </button>
              )}
            </div>
          )}

          {/* Lat / Lon inputs — shown after GPS auto-detect or when manual entry is needed */}
          {(showManualEntry || lat || lon) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="lat-input"
                  className="block text-sm font-semibold text-blue-900 mb-1"
                >
                  अक्षांश:
                </label>
                <input
                  id="lat-input"
                  type="number"
                  step="0.000001"
                  value={lat}
                  onChange={(e) => {
                    setLat(e.target.value);
                    setSaveSuccess(false);
                    setSaveError("");
                  }}
                  className="w-full border border-blue-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="उदा. 18.520430"
                  data-ocid="gps.register.lat_input"
                />
              </div>
              <div>
                <label
                  htmlFor="lon-input"
                  className="block text-sm font-semibold text-blue-900 mb-1"
                >
                  रेखांश:
                </label>
                <input
                  id="lon-input"
                  type="number"
                  step="0.000001"
                  value={lon}
                  onChange={(e) => {
                    setLon(e.target.value);
                    setSaveSuccess(false);
                    setSaveError("");
                  }}
                  className="w-full border border-blue-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="उदा. 73.856744"
                  data-ocid="gps.register.lon_input"
                />
              </div>
            </div>
          )}

          {/* Save button */}
          <div>
            <button
              type="button"
              onClick={handleSave}
              disabled={
                !selectedStationId || !lat || !lon || saveGPSMutation.isPending
              }
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-ocid="gps.register.save_button"
            >
              {saveGPSMutation.isPending ? "जतन करत आहे..." : "जतन करा"}
            </button>
          </div>

          {saveSuccess && (
            <div
              className="text-green-700 text-sm font-semibold"
              data-ocid="gps.register.success_state"
            >
              GPS यशस्वीरित्या जतन झाले!
            </div>
          )}

          {saveError && (
            <div
              className="text-red-600 text-sm"
              data-ocid="gps.register.error_state"
            >
              {saveError}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GPSTrackingPanel;
