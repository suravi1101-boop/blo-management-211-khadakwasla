// @ts-nocheck
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Database,
  Download,
  MapPin,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import * as React from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  useAddPollingStation,
  useAllPollingStations,
  useBulkAddPollingStations,
} from "../hooks/useQueries";
import type { PollingStation } from "../types/domain";
import { bulkSavePollingStationsToBackend } from "../utils/backendService";
import { getCurrentConstituency, storage } from "../utils/storage";

const PAGE_SIZE = 20;

function exportGpsToCsv(
  stations: PollingStation[],
  search: string,
  constituencyId: string,
) {
  const filtered = stations
    .filter((s) => s.gps)
    .filter((s) => {
      const q = search.toLowerCase();
      return (
        !q ||
        s.stationNumber.toLowerCase().includes(q) ||
        s.stationName.toLowerCase().includes(q)
      );
    })
    .sort((a, b) =>
      a.stationNumber.localeCompare(b.stationNumber, undefined, {
        numeric: true,
      }),
    );

  if (filtered.length === 0) {
    return;
  }

  const headers = [
    "अ.क्र.",
    "यादिभाग क्रमांक",
    "मतदान केंद्राचे नाव",
    "अक्षांश",
    "रेखांश",
    "Google Maps दुवा",
    "नोंदणी दिनांक",
  ];

  function esc(v: string): string {
    if (v.includes(",") || v.includes('"') || v.includes("\n"))
      return `"${v.replace(/"/g, '""')}"`;
    return v;
  }

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  const dateStr = `${dd}/${mm}/${yyyy}`;

  const rows = filtered.map((s, idx) =>
    [
      idx + 1,
      s.stationNumber,
      s.stationName,
      s.gps!.lat.toFixed(6),
      (s.gps!.lon ?? s.gps!.lng ?? 0).toFixed(6),
      `https://www.google.com/maps?q=${s.gps!.lat},${s.gps!.lon ?? s.gps!.lng ?? 0}`,

      dateStr,
    ]
      .map((v) => esc(String(v)))
      .join(","),
  );

  const bom = "\uFEFF";
  const csvContent = bom + [headers.map(esc).join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `GPS_स्थान_${constituencyId}_${dd}${mm}${yyyy}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Error Boundary — prevents white screen on render/import errors ──────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: "" };
  }
  static getDerivedStateFromError(error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { hasError: true, errorMsg: msg };
  }
  componentDidCatch(error: unknown, info: unknown) {
    console.error("PollingStations ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 flex flex-col items-center justify-center gap-4 text-center">
          <AlertCircle size={40} className="text-destructive opacity-70" />
          <div>
            <p className="font-semibold text-destructive">
              माहिती आयात करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.
            </p>
            {this.state.errorMsg && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {this.state.errorMsg}
              </p>
            )}
          </div>
          <button
            type="button"
            className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            onClick={() => this.setState({ hasError: false, errorMsg: "" })}
          >
            पुन्हा प्रयत्न करा
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function PollingStations() {
  const { data: stations = [], isLoading } = useAllPollingStations();
  const addStation = useAddPollingStation();
  const bulkAdd = useBulkAddPollingStations();

  const qc = useQueryClient();

  const constituencyId = getCurrentConstituency();

  // (contamination check useEffect removed — it was incorrectly wiping all polling station data on mount)

  const [activeTab, setActiveTab] = useState<"list" | "gps">("list");
  const [search, setSearch] = useState("");
  const [showNoBLO, setShowNoBLO] = useState(false);
  const [page, setPage] = useState(1);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    stationNumber: "",
    stationName: "",
    ward: "",
    location: "",
  });

  // GPS tab state
  const [gpsSearch, setGpsSearch] = useState("");
  // Use hook data (backend source of truth) for GPS tab instead of localStorage
  const gpsStations = stations;

  // Import error state — shown inline (not just toast) so user sees actual error
  const [importError, setImportError] = useState<string | null>(null);

  // ── CSV Column Mapping state ────────────────────────────────────────────────
  const [csvMappingOpen, setCsvMappingOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState<string[][]>([]);
  const [csvAllRows, setCsvAllRows] = useState<string[][]>([]);
  // Whether import is in progress (processing 500+ rows)
  const [importProcessing, setImportProcessing] = useState(false);

  const [csvMapping, setCsvMapping] = useState<{
    partNumber: string;
    stationName: string;
    ward: string;
  }>({
    partNumber: "__unmapped__",
    stationName: "__unmapped__",
    ward: "__unmapped__",
  });

  // Smart auto-mapping from header name to field
  function guessMapping(headers: string[]) {
    function best(candidates: string[]): string {
      for (const c of candidates) {
        const match = headers.find((h) =>
          h.toLowerCase().includes(c.toLowerCase()),
        );
        if (match) return match;
      }
      return headers[0] || "__unmapped__";
    }
    return {
      partNumber: best([
        "partNumber",
        "भाग क्र",
        "भाग",
        "क्रमांक",
        "number",
        "part",
      ]),
      stationName: best(["stationName", "केंद्र", "नाव", "name", "station"]),
      ward: best(["ward", "पत्ता", "स्थान", "location", "address"]),
    };
  }

  // Import all 505 stations from built-in Excel data (Khadakwasla only)
  // handleImportFromExcel removed — '505 केंद्रे आयात करा' button removed per requirements

  // Parse CSV file and open the column-mapping dialog
  // Parse Excel file and open the column-mapping dialog
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        setImportError(null);
        const data = ev.target?.result;
        if (!data) {
          toast.error("फाईल वाचता आली नाही. पुन्हा प्रयत्न करा.");
          return;
        }
        const workbook = XLSX.read(data, { type: "array" });
        if (!workbook.SheetNames.length) {
          toast.error("Excel फाईलमध्ये कोणताही sheet सापडला नाही.");
          return;
        }
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
        }) as string[][];
        const nonEmptyRows = rows.filter((r) =>
          r.some((c) => String(c).trim()),
        );
        if (nonEmptyRows.length < 2) {
          toast.error(
            "Excel मध्ये कोणताही डेटा सापडला नाही. कमीतकमी एक header ओळ आणि एक data ओळ हवी.",
          );
          return;
        }
        const headers = nonEmptyRows[0]
          .map((h) => String(h).trim())
          .filter((h) => h.length > 0);
        const allDataRows = nonEmptyRows
          .slice(1)
          .map((r) => headers.map((_, ci) => String(r[ci] ?? "").trim()));
        if (headers.length === 0) {
          toast.error("Excel header सापडला नाही.");
          return;
        }
        setCsvHeaders(headers);
        setCsvPreviewRows(allDataRows.slice(0, 3));
        setCsvAllRows(allDataRows);
        setCsvMapping(guessMapping(headers));
        setCsvMappingOpen(true);
      } catch (err) {
        console.error("Excel parse error:", err);
        toast.error(
          "Excel फाईल वाचताना त्रुटी आली. योग्य .xlsx किंवा .xls फाईल निवडा.",
        );
      }
    };
    reader.onerror = () => {
      toast.error("फाईल वाचता आली नाही. पुन्हा प्रयत्न करा.");
    };
    reader.readAsArrayBuffer(file);
  }

  // Execute the import using the confirmed column mapping
  function handleConfirmCsvImport() {
    setImportError(null);
    try {
      const { partNumber: pnCol, stationName: snCol, ward: wCol } = csvMapping;
      // Validate required columns are actually selected (not still on placeholder)
      if (!pnCol || pnCol === "__unmapped__") {
        setImportError("भाग क्रमांक column निवडणे आवश्यक आहे.");
        return;
      }
      if (!snCol || snCol === "__unmapped__") {
        setImportError("मतदान केंद्र नाव column निवडणे आवश्यक आहे.");
        return;
      }
      const pnIdx = csvHeaders.indexOf(pnCol);
      const snIdx = csvHeaders.indexOf(snCol);
      const wIdx =
        wCol && wCol !== "__none__" && wCol !== "__unmapped__"
          ? csvHeaders.indexOf(wCol)
          : -1;
      if (pnIdx < 0 || snIdx < 0) {
        setImportError(
          "निवडलेले columns Excel मध्ये सापडले नाहीत. पुन्हा column निवडा.",
        );
        return;
      }
      // Build minimal station objects — only pass partNumber, partName, location.
      // useQueries.ts (useBulkAddPollingStations) handles id generation and
      // Candid optional field encoding (lat/lon/bloId as [] or [value]).
      const parsed: {
        partNumber: string;
        partName: string;
        location: string;
      }[] = [];
      for (let i = 0; i < csvAllRows.length; i++) {
        const cols = csvAllRows[i];
        const partNumber = cols[pnIdx] ? String(cols[pnIdx]).trim() : "";
        // Skip rows where partNumber is empty/null/undefined
        if (!partNumber) continue;
        const partName = cols[snIdx] ? String(cols[snIdx]).trim() : "";
        const location =
          wIdx >= 0 && cols[wIdx] ? String(cols[wIdx]).trim() : "";
        parsed.push({ partNumber, partName, location });
      }
      // Fix 4 — Validate parsed array
      if (parsed.length === 0) {
        setImportError(
          `Excel मध्ये कोणताही वैध डेटा सापडला नाही. "${pnCol}" column मध्ये किमान एक भाग क्रमांक हवा.`,
        );
        return;
      }
      // Validate each row has a non-empty partNumber (already filtered, but double-check)
      const invalidRows = parsed.filter((r) => !r.partNumber);
      if (invalidRows.length > 0) {
        setImportError(
          `${invalidRows.length} ओळींमध्ये भाग क्रमांक रिकामा आहे. Excel तपासा.`,
        );
        return;
      }
      setCsvMappingOpen(false);
      setImportProcessing(true);
      bulkAdd.mutate(
        parsed as unknown as import("../types/domain").PollingStation[],
        {
          onSuccess: (added) => {
            setImportProcessing(false);
            setImportError(null);
            // Invalidate queries so list refreshes immediately (Fix 6)
            const cid = getCurrentConstituency();
            qc.invalidateQueries({ queryKey: ["pollingStations", cid] });
            qc.invalidateQueries({ queryKey: ["dashboardStats", cid] });
            toast.success(`${added ?? parsed.length} केंद्रे यशस्वीरित्या आयात झाली`);
          },
          onError: (err) => {
            // Fix 2 — Surface the actual error, not just a generic message
            setImportProcessing(false);
            const errMsg =
              err instanceof Error
                ? err.message
                : typeof err === "string"
                  ? err
                  : JSON.stringify(err);
            console.error("bulkAdd.mutate onError (full):", err);
            const displayMsg = `आयात अयशस्वी: ${errMsg}`;
            setImportError(displayMsg);
            toast.error(displayMsg, { duration: 8000 });
          },
        },
      );
    } catch (err) {
      // Fix 3 — Catch synchronous errors, show actual message
      setImportProcessing(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("handleConfirmExcelImport unexpected sync error:", err);
      const displayMsg = `आयात करताना अनपेक्षित त्रुटी: ${errMsg}`;
      setImportError(displayMsg);
      toast.error(displayMsg, { duration: 8000 });
    }
  }

  async function handleDeleteAll() {
    storage.setStations([]);
    setDeleteAllOpen(false);
    qc.invalidateQueries({ queryKey: ["pollingStations"] });
    qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    toast.success("सर्व मतदान केंद्रे हटवली");
    // Also clear stations in backend so other devices see the change
    try {
      await bulkSavePollingStationsToBackend(constituencyId, []);
    } catch (err) {
      console.error("bulkSavePollingStationsToBackend (clear) failed:", err);
    }
  }

  const filtered = stations.filter((s) => {
    if (showNoBLO && s.hasBLO) return false;
    const q = search.toLowerCase();
    return (
      s.stationNumber.toLowerCase().includes(q) ||
      s.stationName.toLowerCase().includes(q) ||
      (s.ward ?? "").toLowerCase().includes(q) ||
      (s.location ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleAdd() {
    const station: PollingStation = {
      id: BigInt(Date.now()),
      stationNumber: form.stationNumber,
      stationName: form.stationName,
      ward: form.ward,
      location: form.location,
      hasBLO: false,
    };
    addStation.mutate(station, {
      onSuccess: () => {
        toast.success("मतदान केंद्र यशस्वीरित्या जोडले");
        setAddDialogOpen(false);
        setForm({ stationNumber: "", stationName: "", ward: "", location: "" });
      },
      onError: () => toast.error("मतदान केंद्र जोडताना त्रुटी"),
    });
  }

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-4">
        {/* Import progress overlay */}
        {(bulkAdd.isPending || importProcessing) && (
          <div className="fixed inset-0 bg-background/70 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-card border border-border rounded-xl shadow-lg px-8 py-6 flex flex-col items-center gap-3 max-w-xs text-center">
              <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="font-semibold text-foreground">आयात सुरू आहे...</p>
              <p className="text-sm text-muted-foreground">
                कृपया थांबा. मतदान केंद्रे backend मध्ये साठवली जात आहेत.
              </p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">मतदान केंद्र</h2>
            <p className="text-sm text-muted-foreground">
              एकूण {stations.length} केंद्रे
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Excel file upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              data-ocid="stations.upload_button"
            >
              <Upload size={14} className="mr-1" />
              Excel आयात करा
            </Button>
            <Button
              size="sm"
              onClick={() => setAddDialogOpen(true)}
              data-ocid="stations.add_station.button"
            >
              <Plus size={14} className="mr-1" />
              केंद्र जोडा
            </Button>
            {stations.length > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDeleteAllOpen(true)}
                data-ocid="stations.delete_all.button"
              >
                <Trash2 size={14} className="mr-1" />
                सर्व केंद्रे हटवा
              </Button>
            )}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-border">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "list"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("list")}
            data-ocid="stations.tab.list"
          >
            केंद्र यादी
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === "gps"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("gps")}
            data-ocid="stations.tab.gps"
          >
            <MapPin size={13} />
            GPS स्थान
          </button>
        </div>

        {/* ── GPS Tab ── */}
        {activeTab === "gps" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="केंद्र शोधा..."
                  className="pl-8 h-8 text-sm"
                  value={gpsSearch}
                  onChange={(e) => setGpsSearch(e.target.value)}
                  data-ocid="stations.gps.search_input"
                />
              </div>
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                <MapPin size={12} className="inline mr-0.5 text-blue-500" />
                {gpsStations.filter((s) => s.gps).length} / {gpsStations.length}{" "}
                GPS सेट
              </p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 flex-shrink-0"
                onClick={() =>
                  exportGpsToCsv(gpsStations, gpsSearch, constituencyId)
                }
                disabled={gpsStations.filter((s) => s.gps).length === 0}
                data-ocid="stations.gps.export_excel.button"
              >
                <Download size={13} />
                Excel डाउनलोड
              </Button>
            </div>

            <div className="rounded-md border border-blue-100 bg-blue-50/40 px-3 py-2 text-xs text-blue-700">
              ℹ️ GPS स्थान अद्यावत करण्यासाठी पर्यवेक्षकांनी त्यांच्या लॉगिनमध्ये{" "}
              <strong>📍 GPS स्थान अद्यावत करा</strong> बटण वापरावे.
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-semibold">
                      यादिभाग क्र.
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      केंद्राचे नाव
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      GPS स्थान
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gpsStations.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center py-10 text-muted-foreground"
                        data-ocid="stations.gps.empty_state"
                      >
                        <AlertCircle
                          size={24}
                          className="mx-auto mb-2 opacity-40"
                        />
                        <p className="text-sm">कोणतेही मतदान केंद्र नाहीत</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    gpsStations
                      .filter((s) => {
                        const q = gpsSearch.toLowerCase();
                        return (
                          !q ||
                          s.stationNumber.toLowerCase().includes(q) ||
                          s.stationName.toLowerCase().includes(q)
                        );
                      })
                      .map((s, idx) => (
                        <TableRow
                          key={s.id.toString()}
                          data-ocid={`stations.gps.item.${idx + 1}`}
                          className={s.gps ? "bg-green-50/30" : ""}
                        >
                          <TableCell className="text-sm font-medium">
                            {s.gps && (
                              <span className="mr-1 text-green-500">📍</span>
                            )}
                            {s.stationNumber}
                          </TableCell>
                          <TableCell className="text-sm">
                            {s.stationName}
                          </TableCell>
                          <TableCell className="text-sm">
                            {s.gps ? (
                              <button
                                type="button"
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                onClick={() => {
                                  const lat = s.gps!.lat ?? 0;
                                  const lon =
                                    s.gps!.lon ?? (s.gps as any).lng ?? 0;
                                  if (lat && lon) {
                                    window.open(
                                      `https://www.google.com/maps?q=${lat},${lon}`,
                                      "_blank",
                                    );
                                  }
                                }}
                                data-ocid={`stations.gps.map_link.${idx + 1}`}
                              >
                                <MapPin
                                  size={13}
                                  className="text-blue-500 flex-shrink-0"
                                />
                                <span className="font-mono text-xs">
                                  <span className="font-mono text-xs underline text-blue-600">
                                    {(s.gps.lat ?? 0).toFixed(6)},{" "}
                                    {(
                                      s.gps.lon ??
                                      (s.gps as any).lng ??
                                      0
                                    ).toFixed(6)}
                                  </span>
                                </span>
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                GPS स्थान नाही
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ── List Tab ── */}
        {activeTab === "list" && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  data-ocid="stations.search_input"
                  placeholder="केंद्र शोधा..."
                  className="pl-8 h-8 text-sm"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  data-ocid="stations.no_blo.toggle"
                  checked={showNoBLO}
                  onCheckedChange={(v) => {
                    setShowNoBLO(v);
                    setPage(1);
                  }}
                />
                <Label className="text-sm cursor-pointer">
                  BLO नियुक्ती नाही
                </Label>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-semibold">क्र.</TableHead>
                    <TableHead className="text-xs font-semibold">
                      केंद्र क्रमांक
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      केंद्र नाव
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      ठिकाण
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      BLO स्थिती
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    ["a", "b", "c", "d", "e"].map((i) => (
                      <TableRow key={i}>
                        {["1", "2", "3", "4", "5"].map((j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : paginated.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-10 text-muted-foreground"
                        data-ocid="stations.empty_state"
                      >
                        <AlertCircle
                          size={32}
                          className="mx-auto mb-3 opacity-50"
                        />
                        <p className="text-sm font-medium mb-1">
                          अद्याप कोणतेही मतदान केंद्र जोडलेले नाहीत.
                        </p>
                        <p className="text-sm mb-4">Excel फाइल आयात करा.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          data-ocid="stations.empty_state.upload_button"
                        >
                          <Upload size={14} className="mr-1" />
                          Excel आयात करा
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((s, idx) => (
                      <TableRow
                        key={s.id.toString()}
                        data-ocid={`stations.item.${(page - 1) * PAGE_SIZE + idx + 1}`}
                      >
                        <TableCell className="text-xs text-muted-foreground">
                          {(page - 1) * PAGE_SIZE + idx + 1}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {s.stationNumber}
                        </TableCell>
                        <TableCell className="text-sm">
                          {s.stationName}
                        </TableCell>
                        <TableCell className="text-sm">
                          {s.ward || s.location}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={s.hasBLO ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {s.hasBLO ? "नियुक्त" : "नियुक्ती नाही"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <p className="text-muted-foreground text-xs">
                  {filtered.length} पैकी{" "}
                  {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}-
                  {Math.min(page * PAGE_SIZE, filtered.length)}
                </p>
                <div className="flex gap-2">
                  <Button
                    data-ocid="stations.pagination_prev"
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    मागे
                  </Button>
                  <span className="px-3 py-1 text-xs border rounded-md bg-background">
                    {page} / {totalPages}
                  </span>
                  <Button
                    data-ocid="stations.pagination_next"
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    पुढे
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Add dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent data-ocid="stations.add_station.dialog">
            <DialogHeader>
              <DialogTitle>नवीन मतदान केंद्र जोडा</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">केंद्र क्रमांक *</Label>
                <Input
                  data-ocid="stations.station_number.input"
                  className="mt-1"
                  value={form.stationNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stationNumber: e.target.value }))
                  }
                  placeholder="उदा. 001"
                />
              </div>
              <div>
                <Label className="text-sm">केंद्र नाव *</Label>
                <Input
                  data-ocid="stations.station_name.input"
                  className="mt-1"
                  value={form.stationName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stationName: e.target.value }))
                  }
                  placeholder="मतदान केंद्राचे नाव"
                />
              </div>
              <div>
                <Label className="text-sm">ठिकाण</Label>
                <Input
                  data-ocid="stations.ward.input"
                  className="mt-1"
                  value={form.ward}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ward: e.target.value }))
                  }
                  placeholder="गाव/वाडी नाव"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                data-ocid="stations.add_station.cancel_button"
              >
                रद्द करा
              </Button>
              <Button
                data-ocid="stations.add_station.submit_button"
                onClick={handleAdd}
                disabled={
                  !form.stationNumber ||
                  !form.stationName ||
                  addStation.isPending
                }
              >
                {addStation.isPending ? "जोडत आहे..." : "जोडा"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete All Confirmation Dialog */}
        <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
          <DialogContent
            className="max-w-md"
            data-ocid="stations.delete_all.dialog"
          >
            <DialogHeader>
              <DialogTitle className="text-destructive">⚠️ सावधान!</DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <p className="text-sm">
                या मतदार संघातील सर्व{" "}
                <strong className="text-destructive">{stations.length}</strong>{" "}
                मतदान केंद्रे कायमची हटवली जातील. हे पूर्वत: होणार नाही.
              </p>
              <p className="text-sm font-semibold text-destructive">
                खात्री असेल तरच &apos;होय, हटवा&apos; दाबा.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteAllOpen(false)}
                data-ocid="stations.delete_all.cancel_button"
              >
                रद्द करा
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAll}
                data-ocid="stations.delete_all.confirm_button"
              >
                होय, हटवा
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── CSV Column Mapping Dialog ───────────────────────────────── */}
        <Dialog
          open={csvMappingOpen}
          onOpenChange={(open) => {
            if (!open) {
              setCsvMappingOpen(false);
              setImportError(null);
            }
          }}
        >
          <DialogContent
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            data-ocid="stations.csv_mapping.dialog"
          >
            <DialogHeader>
              <DialogTitle>📋 Excel Column Mapping — स्तंभ जुळवा</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Excel मधील {csvHeaders.length} स्तंभांपैकी योग्य ते निवडा.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-semibold">भाग क्रमांक *</Label>
                  <Select
                    value={csvMapping.partNumber}
                    onValueChange={(v) =>
                      setCsvMapping((m) => ({ ...m, partNumber: v }))
                    }
                  >
                    <SelectTrigger
                      className="mt-1 h-8 text-sm"
                      data-ocid="stations.csv_mapping.partnumber.select"
                    >
                      <SelectValue placeholder="स्तंभ निवडा" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unmapped__" disabled>
                        स्तंभ निवडा
                      </SelectItem>
                      {csvHeaders
                        .filter((h) => h && h.trim() !== "")
                        .map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">
                    मतदान केंद्राचे नाव *
                  </Label>
                  <Select
                    value={csvMapping.stationName}
                    onValueChange={(v) =>
                      setCsvMapping((m) => ({ ...m, stationName: v }))
                    }
                  >
                    <SelectTrigger
                      className="mt-1 h-8 text-sm"
                      data-ocid="stations.csv_mapping.stationname.select"
                    >
                      <SelectValue placeholder="स्तंभ निवडा" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unmapped__" disabled>
                        स्तंभ निवडा
                      </SelectItem>
                      {csvHeaders
                        .filter((h) => h && h.trim() !== "")
                        .map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">
                    पत्ता/स्थान (ऐच्छिक)
                  </Label>
                  <Select
                    value={csvMapping.ward}
                    onValueChange={(v) =>
                      setCsvMapping((m) => ({ ...m, ward: v }))
                    }
                  >
                    <SelectTrigger
                      className="mt-1 h-8 text-sm"
                      data-ocid="stations.csv_mapping.ward.select"
                    >
                      <SelectValue placeholder="स्तंभ निवडा" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unmapped__" disabled>
                        स्तंभ निवडा
                      </SelectItem>
                      <SelectItem value="__none__">— नाही —</SelectItem>
                      {csvHeaders
                        .filter((h) => h && h.trim() !== "")
                        .map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preview of first 3 rows */}
              {csvPreviewRows.length > 0 && csvHeaders.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    पहिल्या {csvPreviewRows.length} ओळींचे पूर्वावलोकन (Excel):
                  </p>
                  <div className="overflow-x-auto rounded border">
                    <table className="text-xs w-full">
                      <thead>
                        <tr className="bg-muted/50">
                          {csvHeaders.map((h, hi) => (
                            <th
                              key={`hdr-${hi}-${h}`}
                              className="px-2 py-1 text-left font-semibold border-b border-r last:border-r-0"
                            >
                              {h ?? ""}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreviewRows.map((row, ri) => (
                          <tr
                            key={`preview-row-${String(row[0] ?? ri)}-${ri}`}
                            className={ri % 2 === 0 ? "" : "bg-muted/20"}
                          >
                            {csvHeaders.map((hd, ci) => (
                              <td
                                key={`cell-${hd ?? ci}`}
                                className="px-2 py-1 border-r last:border-r-0 max-w-[160px] truncate"
                              >
                                {row?.[ci] ?? ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                एकूण {csvAllRows.length} ओळी Excel मधून आयात होतील.
              </p>
            </div>
            <DialogFooter>
              {/* Fix 1 — Inline error display so actual backend error is visible */}
              {importError && (
                <div className="flex items-start gap-2 w-full rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive mb-1">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <span className="break-words">{importError}</span>
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setCsvMappingOpen(false);
                  setImportError(null);
                }}
                data-ocid="stations.csv_mapping.cancel_button"
              >
                रद्द करा
              </Button>
              {/* Fix 5 — Loading spinner while import is in progress, disabled to prevent double-click */}
              <Button
                onClick={handleConfirmCsvImport}
                disabled={
                  !csvMapping.partNumber ||
                  csvMapping.partNumber === "__unmapped__" ||
                  !csvMapping.stationName ||
                  csvMapping.stationName === "__unmapped__" ||
                  bulkAdd.isPending ||
                  importProcessing
                }
                data-ocid="stations.csv_mapping.import_button"
              >
                {bulkAdd.isPending || importProcessing ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin mr-1.5 inline-block" />
                    आयात करत आहे... ({csvAllRows.length} ओळी)
                  </>
                ) : (
                  "Excel आयात करा"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
}
