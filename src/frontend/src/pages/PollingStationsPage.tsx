import { createActor } from "@/backend";
import { toast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCurrentSupervisor,
  isAdminLoggedIn,
  isSuperAdminLoggedIn,
} from "@/lib/auth";
import {
  bulkSavePollingStations,
  getPollingStations,
  updatePollingStation,
} from "@/lib/backendService";
import type { PollingStation } from "@/lib/backendService";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { usePollingStations } from "../hooks/useQueries";

const CONST_ID = "211";

interface ColMap {
  partNumber: string;
  partName: string;
  location: string;
  latitude: string;
  longitude: string;
}

interface ImportRow {
  [key: string]: string | number | undefined;
}

export function PollingStationsPage() {
  const { actor, isFetching } = useActor(createActor);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [colMap, setColMap] = useState<ColMap>({
    partNumber: "",
    partName: "",
    location: "",
    latitude: "__none__",
    longitude: "__none__",
  });
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [gpsStation, setGpsStation] = useState<PollingStation | null>(null);
  const [gpsLat, setGpsLat] = useState("");
  const [gpsLon, setGpsLon] = useState("");
  const [gpsDetecting, setGpsDetecting] = useState(false);
  const [gpsDetectError, setGpsDetectError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const isAdmin = isSuperAdminLoggedIn() || isAdminLoggedIn();
  const supervisor = getCurrentSupervisor();
  const _canAccess = isAdmin || !!supervisor;

  const { data: stations = [], isLoading } = usePollingStations();

  const filtered = useMemo(() => {
    if (!search.trim())
      return [...stations].sort(
        (a, b) => Number(a.partNumber) - Number(b.partNumber),
      );
    const s = search.toLowerCase();
    return stations
      .filter(
        (st) =>
          st.partNumber.toString().includes(s) ||
          st.partName.toLowerCase().includes(s),
      )
      .sort((a, b) => Number(a.partNumber) - Number(b.partNumber));
  }, [stations, search]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<ImportRow>(ws, { defval: "" });
        if (rows.length === 0) {
          setImportError("Excel मध्ये कोणताही डेटा नाही.");
          return;
        }
        const headers = Object.keys(rows[0]).filter((h) => h.trim() !== "");
        setImportHeaders(headers);
        setImportRows(rows);
        // auto-detect columns
        const detect = (keywords: string[]) =>
          headers.find((h) =>
            keywords.some((k) => h.toLowerCase().includes(k)),
          ) ?? "";
        setColMap({
          partNumber: detect(["भाग", "part", "क्र", "no", "num"]),
          partName: detect(["नाव", "name", "केंद्र"]),
          location: detect(["ठिकाण", "location", "address", "पत्ता"]),
          latitude: detect(["अक्षांश", "lat"]) || "__none__",
          longitude: detect(["रेखांश", "lon", "lng"]) || "__none__",
        });
      } catch {
        setImportError("Excel वाचण्यात त्रुटी आली.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!actor) {
      setImportError("बॅकेंड उपलब्ध नाही.");
      return;
    }
    if (!colMap.partNumber || !colMap.partName) {
      setImportError("भाग क्र. आणि भाग नाव columns निवडा.");
      return;
    }
    setImporting(true);
    setImportError("");
    try {
      const toSave: PollingStation[] = importRows.map((row) => {
        const pn = row[colMap.partNumber];
        const latRaw =
          colMap.latitude !== "__none__" ? row[colMap.latitude] : undefined;
        const lonRaw =
          colMap.longitude !== "__none__" ? row[colMap.longitude] : undefined;
        const lat =
          latRaw !== undefined && latRaw !== "" ? Number(latRaw) : undefined;
        const lon =
          lonRaw !== undefined && lonRaw !== "" ? Number(lonRaw) : undefined;
        const now = BigInt(Date.now()) * BigInt(1_000_000);
        return {
          id: `ps-${CONST_ID}-${String(pn).trim()}`,
          partNumber: String(pn).trim(),
          partName: String(row[colMap.partName] ?? "").trim(),
          location: colMap.location
            ? String(row[colMap.location] ?? "").trim()
            : "",
          constituencyId: CONST_ID,
          latitude: lat !== undefined && !Number.isNaN(lat) ? lat : undefined,
          longitude: lon !== undefined && !Number.isNaN(lon) ? lon : undefined,
          assignedSupervisorId: undefined,
          bloId: undefined,
          createdAt: now,
          updatedAt: now,
        };
      });
      const count = await bulkSavePollingStations(actor, toSave);
      qc.invalidateQueries({ queryKey: ["pollingStations"] });
      toast(`${Number(count)} केंद्रे यशस्वीरित्या आयात झाली`, "success");
      setShowImport(false);
      setImportRows([]);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setImportError(
        `आयात अयशस्वी: ${err instanceof Error ? err.message : "पुन्हा प्रयत्न करा"}`,
      );
    } finally {
      setImporting(false);
    }
  };

  const triggerGpsDetect = () => {
    setGpsDetectError("");
    setGpsDetecting(true);
    if (!("geolocation" in navigator)) {
      setGpsDetecting(false);
      setGpsDetectError("हे उपकरण GPS ला सपोर्ट करत नाही. कृपया खाली मॅन्युअली भरा.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLat(pos.coords.latitude.toFixed(6));
        setGpsLon(pos.coords.longitude.toFixed(6));
        setGpsDetecting(false);
        setGpsDetectError("");
      },
      (err) => {
        setGpsDetecting(false);
        if (err.code === 1) {
          setGpsDetectError(
            "GPS परवानगी नाकारली. ब्राउझरच्या सेटिंग मध्ये GPS परवानगी द्या किंवा खाली मॅन्युअली भरा.",
          );
        } else if (err.code === 3) {
          setGpsDetectError(
            "GPS मिळाले नाही (timeout). पुन्हा प्रयत्न करा किंवा खाली मॅन्युअली भरा.",
          );
        } else {
          setGpsDetectError(
            "GPS शोध अयशस्वी. पुन्हा प्रयत्न करा किंवा खाली मॅन्युअली भरा.",
          );
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const hasGps = (st: PollingStation) =>
    st.latitude !== undefined &&
    st.latitude !== null &&
    st.longitude !== undefined &&
    st.longitude !== null &&
    st.latitude !== 0 &&
    st.longitude !== 0;

  const openGoogleMaps = (st: PollingStation) => {
    const url = `https://www.google.com/maps?q=${Number(st.latitude).toFixed(6)},${Number(st.longitude).toFixed(6)}`;
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const openGpsModal = (st: PollingStation) => {
    setGpsStation(st);
    setGpsLat(
      st.latitude !== undefined && st.latitude !== null
        ? String(st.latitude)
        : "",
    );
    setGpsLon(
      st.longitude !== undefined && st.longitude !== null
        ? String(st.longitude)
        : "",
    );
    setGpsDetectError("");
    setGpsDetecting(false);
    // Do NOT auto-trigger GPS — user must explicitly click "📍 GPS आपोआप घ्या"
  };

  const handleGpsSave = async () => {
    if (!gpsStation || !actor) return;
    const lat = Number.parseFloat(gpsLat);
    const lon = Number.parseFloat(gpsLon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      toast("अवैध GPS मूल्ये", "error");
      return;
    }
    try {
      const ok = await actor.setPollingStationGPS(
        CONST_ID,
        gpsStation.id,
        lat,
        lon,
      );
      if (ok) {
        qc.invalidateQueries({ queryKey: ["pollingStations"] });
        toast("GPS स्थान जतन झाले", "success");
        setGpsStation(null);
      } else {
        toast("GPS जतन अयशस्वी", "error");
      }
    } catch {
      toast("GPS जतन करताना त्रुटी", "error");
    }
  };

  return (
    <div className="flex flex-col gap-4" data-ocid="polling-stations.page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-primary">मतदान केंद्रे</h2>
        {isAdmin && (
          <Button
            type="button"
            size="sm"
            onClick={() => setShowImport(true)}
            data-ocid="polling-stations.import_button"
          >
            Excel आयात करा
          </Button>
        )}
      </div>

      <Input
        placeholder="भाग क्र. किंवा केंद्राचे नाव शोधा..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
        data-ocid="polling-stations.search_input"
      />

      {isLoading || isFetching ? (
        <div
          className="flex items-center justify-center py-12"
          data-ocid="polling-stations.loading_state"
        >
          <span className="text-muted-foreground animate-pulse">
            लोड होत आहे...
          </span>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12 gap-2"
          data-ocid="polling-stations.empty_state"
        >
          <span className="text-4xl">🏛️</span>
          <p className="text-muted-foreground">
            {search
              ? "कोणताही निकाल सापडला नाही"
              : "अद्याप कोणतेही मतदान केंद्र नाही"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-3 py-2 text-left font-semibold">भाग क्र.</th>
                <th className="px-3 py-2 text-left font-semibold">केंद्राचे नाव</th>
                <th className="px-3 py-2 text-left font-semibold">ठिकाण</th>
                <th className="px-3 py-2 text-left font-semibold">
                  GPS (क्लिक करा)
                </th>
                <th className="px-3 py-2 text-left font-semibold">BLO</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((st, i) => (
                <tr
                  key={st.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  data-ocid={`polling-stations.item.${i + 1}`}
                >
                  <td className="px-3 py-2 font-mono text-right">
                    {Number(st.partNumber)}
                  </td>
                  <td className="px-3 py-2 font-medium">{st.partName}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {st.location}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono">
                    {hasGps(st) ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openGoogleMaps(st)}
                          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors cursor-pointer"
                          title="Google Maps वर पाहा"
                          data-ocid={`polling-stations.gps_maps_link.${i + 1}`}
                        >
                          🗺️ {Number(st.latitude).toFixed(4)},{" "}
                          {Number(st.longitude).toFixed(4)}
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => openGpsModal(st)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="GPS स्थान अद्यतनित करा"
                            data-ocid={`polling-stations.gps_edit.${i + 1}`}
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    ) : isAdmin ? (
                      <button
                        type="button"
                        onClick={() => openGpsModal(st)}
                        className="text-muted-foreground hover:text-primary transition-colors cursor-pointer underline underline-offset-2"
                        title="GPS स्थान जोडा"
                        data-ocid={`polling-stations.gps_cell.${i + 1}`}
                      >
                        — GPS जोडा
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{st.bloId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        एकूण: {filtered.length} केंद्रे
      </p>

      {/* Excel Import Dialog */}
      <Dialog
        open={showImport}
        onOpenChange={(v) => !v && setShowImport(false)}
      >
        <DialogContent
          className="max-w-2xl"
          data-ocid="polling-stations.import.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-primary">
              मतदान केंद्रे Excel आयात
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="excel-file">Excel फाइल (.xlsx) निवडा</Label>
              <input
                ref={fileRef}
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer hover:file:bg-primary/90"
                data-ocid="polling-stations.import.upload_button"
              />
            </div>

            {importHeaders.length > 0 && (
              <>
                <p className="text-sm font-medium text-foreground">
                  Column Mapping (पहिले {Math.min(5, importRows.length)} rows)
                </p>
                <div className="overflow-x-auto rounded border bg-muted/30 max-h-40">
                  <table className="text-xs w-full">
                    <thead>
                      <tr>
                        {importHeaders.map((h) => (
                          <th
                            key={h}
                            className="px-2 py-1 border-b font-semibold text-left"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 5).map((row, ri) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: preview-only static list of 5 rows
                        <tr key={`${ri}-preview`}>
                          {importHeaders.map((h) => (
                            <td key={h} className="px-2 py-1 border-b">
                              {String(row[h] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["partNumber", "भाग क्र. *"],
                      ["partName", "भाग नाव *"],
                      ["location", "ठिकाण"],
                      ["latitude", "अक्षांश (optional)"],
                      ["longitude", "रेखांश (optional)"],
                    ] as [keyof ColMap, string][]
                  ).map(([field, label]) => (
                    <div key={field}>
                      <Label>{label}</Label>
                      <Select
                        value={
                          colMap[field] ||
                          (field === "latitude" || field === "longitude"
                            ? "__none__"
                            : "")
                        }
                        onValueChange={(v) =>
                          setColMap((prev) => ({ ...prev, [field]: v }))
                        }
                      >
                        <SelectTrigger
                          data-ocid={`polling-stations.import.col.${field}`}
                        >
                          <SelectValue placeholder="-- निवडा --" />
                        </SelectTrigger>
                        <SelectContent>
                          {(field === "latitude" || field === "longitude") && (
                            <SelectItem value="__none__">-- नाही --</SelectItem>
                          )}
                          {importHeaders.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </>
            )}

            {importError && (
              <p
                className="text-sm text-destructive"
                role="alert"
                data-ocid="polling-stations.import.error_state"
              >
                {importError}
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowImport(false)}
                data-ocid="polling-stations.import.cancel_button"
              >
                रद्द करा
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={importing || importRows.length === 0}
                data-ocid="polling-stations.import.submit_button"
              >
                {importing
                  ? "आयात होत आहे..."
                  : `आयात करा (${importRows.length} ओळी)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* GPS Update Dialog */}
      <Dialog
        open={!!gpsStation}
        onOpenChange={(v) => !v && setGpsStation(null)}
      >
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="polling-stations.gps.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-primary">
              GPS स्थान अद्यतनित करा
            </DialogTitle>
          </DialogHeader>
          {gpsStation && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">
                {gpsStation.partName} (भाग {gpsStation.partNumber})
              </p>
              {gpsDetecting && (
                <div
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  data-ocid="polling-stations.gps.detecting_state"
                >
                  <span className="animate-spin">⏳</span>
                  <span>GPS शोधत आहे...</span>
                </div>
              )}
              {!gpsDetecting && gpsLat && gpsLon && !gpsDetectError && (
                <p
                  className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1"
                  data-ocid="polling-stations.gps.success_state"
                >
                  ✅ GPS मिळाले — {gpsLat}, {gpsLon}
                </p>
              )}
              {gpsDetectError && (
                <div
                  className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 space-y-2"
                  role="alert"
                  data-ocid="polling-stations.gps.error_state"
                >
                  <p>⚠️ {gpsDetectError}</p>
                  {!gpsDetectError.includes("सपोर्ट करत नाही") && (
                    <button
                      type="button"
                      onClick={triggerGpsDetect}
                      disabled={gpsDetecting}
                      className="text-xs font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
                      data-ocid="polling-stations.gps.retry_button"
                    >
                      🔄 पुन्हा प्रयत्न करा
                    </button>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={triggerGpsDetect}
                disabled={gpsDetecting}
                className="text-xs text-blue-600 underline underline-offset-2 hover:text-blue-800 disabled:opacity-50"
                data-ocid="polling-stations.gps.autodetect_button"
              >
                {gpsDetecting ? "शोधत आहे..." : "📍 GPS आपोआप घ्या"}
              </button>
              <div>
                <Label htmlFor="gps-lat">अक्षांश (Latitude)</Label>
                <Input
                  id="gps-lat"
                  type="number"
                  step="any"
                  value={gpsLat}
                  onChange={(e) => setGpsLat(e.target.value)}
                  placeholder="18.5204"
                  data-ocid="polling-stations.gps.lat_input"
                />
              </div>
              <div>
                <Label htmlFor="gps-lon">रेखांश (Longitude)</Label>
                <Input
                  id="gps-lon"
                  type="number"
                  step="any"
                  value={gpsLon}
                  onChange={(e) => setGpsLon(e.target.value)}
                  placeholder="73.8567"
                  data-ocid="polling-stations.gps.lon_input"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setGpsStation(null)}
                  data-ocid="polling-stations.gps.cancel_button"
                >
                  रद्द करा
                </Button>
                <Button
                  type="button"
                  onClick={handleGpsSave}
                  disabled={gpsDetecting || !gpsLat || !gpsLon}
                  data-ocid="polling-stations.gps.save_button"
                >
                  जतन करा
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
