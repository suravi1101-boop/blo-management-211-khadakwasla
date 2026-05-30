import { createActor } from "@/backend";
import { toast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useNotices } from "@/hooks/useQueries";
import {
  getCurrentSupervisor,
  isAdminLoggedIn,
  isSuperAdminLoggedIn,
} from "@/lib/auth";
import {
  deleteBLOsByConstituency,
  getBLOs,
  getPollingStations,
  recordDeletion,
  saveBLO,
  updateBLO,
} from "@/lib/backendService";
import type { BLO, PollingStation } from "@/lib/backendService";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { type BLOForPrint, printBLOOrder } from "../lib/bloOrderPrint";

const CONST_ID = "211";

const HISTORY_KEY = "blo_edit_history";

interface EditHistoryEntry {
  timestamp: number;
  supervisorId: string;
  supervisorName: string;
  summary: string;
}

type BLOEditHistory = Record<string, EditHistoryEntry[]>;

function loadEditHistory(): BLOEditHistory {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as BLOEditHistory) : {};
  } catch {
    return {};
  }
}

function saveEditHistory(history: BLOEditHistory): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}

function buildChangeSummary(oldBlo: BLO, newBlo: BLO): string {
  const changes: string[] = [];
  if (oldBlo.name !== newBlo.name)
    changes.push(`नाव: ${oldBlo.name} → ${newBlo.name}`);
  if (oldBlo.phone !== newBlo.phone)
    changes.push(`WhatsApp: ${oldBlo.phone} → ${newBlo.phone}`);
  if (oldBlo.designation !== newBlo.designation)
    changes.push(`पद: ${oldBlo.designation} → ${newBlo.designation}`);
  if (oldBlo.status !== newBlo.status)
    changes.push(`स्थिती: ${oldBlo.status} → ${newBlo.status}`);
  if (oldBlo.isExcellent !== newBlo.isExcellent)
    changes.push(`उत्कृष्ट: ${newBlo.isExcellent ? "हो" : "नाही"}`);
  return changes.length > 0 ? changes.join("; ") : "माहिती अद्यतनित केली";
}

const emptyBLO = (): Partial<BLO> & {
  location?: string;
  gpsLat?: number;
  gpsLon?: number;
  manualLat?: string;
  manualLon?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
} => ({
  id: "",
  partNumber: "0",
  partName: "",
  location: "",
  name: "",
  phone: "",
  email: undefined,
  designation: "",
  officeAddress: "",
  aadhaar: undefined,
  voterId: undefined,
  bankAccount: undefined,
  bankName: undefined,
  accountNumber: undefined,
  ifscCode: undefined,
  branchName: undefined,
  constituencyId: CONST_ID,
  isExcellent: false,
  appointmentOrderId: undefined,
  status: "active",
});

export function BLOManagementPage() {
  const { actor, isFetching } = useActor(createActor);
  const printBLOAppointmentOrder = (blo: BLOForPrint) => {
    void printBLOOrder(actor, CONST_ID, blo);
  };
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingBLO, setEditingBLO] = useState<
    Partial<BLO> & {
      location?: string;
      gpsLat?: number;
      gpsLon?: number;
      manualLat?: string;
      manualLon?: string;
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
      branchName?: string;
    }
  >(emptyBLO());
  const [gpsError, setGpsError] = useState<
    "permission" | "timeout" | "unavailable" | null
  >(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSuccess, setGpsSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, _setDeleteId] = useState<string | null>(null);
  const [editHistory, setEditHistory] =
    useState<BLOEditHistory>(loadEditHistory);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(
    new Set(),
  );

  // --- BLO Excel Import state ---
  const [showBloImport, setShowBloImport] = useState(false);
  const [bloImportRows, setBloImportRows] = useState<
    Record<string, string | number | undefined>[]
  >([]);
  const [bloImportHeaders, setBloImportHeaders] = useState<string[]>([]);
  const [bloColMap, setBloColMap] = useState({
    nameCol: "",
    phoneCol: "",
    partNumberCol: "",
    designationCol: "",
    locationCol: "",
    voterIdCol: "",
  });
  const [bloImporting, setBloImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [bloImportError, setBloImportError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [bloImportResult, setBloImportResult] = useState<{
    success: number;
    errors: string[];
  } | null>(null);
  const bloFileRef = useRef<HTMLInputElement>(null);

  const isAdmin = isSuperAdminLoggedIn() || isAdminLoggedIn();
  const supervisor = getCurrentSupervisor();
  const canAccess = isAdmin || !!supervisor;
  const { data: allNotices = [] } = useNotices();
  const getNoticeCount = (personId: string) =>
    allNotices.filter(
      (n) =>
        n.recipientId === personId ||
        ((n as any).noticeRecipients ?? []).some(
          (r: { recipientId: string }) => r.recipientId === personId,
        ),
    ).length;

  const { data: blos = [], isLoading } = useQuery<BLO[]>({
    queryKey: ["blos"],
    queryFn: async () => {
      if (!actor) return [];
      return getBLOs(actor);
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });

  const { data: pollingStations = [] } = useQuery<PollingStation[]>({
    queryKey: ["pollingStations", CONST_ID],
    queryFn: async () => {
      if (!actor) return [];
      return getPollingStations(actor, CONST_ID);
    },
    enabled: !!actor && !isFetching,
  });

  // Supervisor sees only their assigned stations
  // Station IDs are like 'ps-211-42'; join with pollingStations to get partNumber
  const supervisorPartNumbers = supervisor?.assignedStationIds
    ? new Set(
        supervisor.assignedStationIds.map((stationId: string) => {
          const station = (pollingStations ?? []).find(
            (ps) => ps.id === stationId,
          );
          return station ? String(station.partNumber) : stationId;
        }),
      )
    : null;

  // Deduplicate by partNumber — keep most recently updated
  const dedupedBLOs = useMemo(() => {
    const map = new Map<string, BLO>();
    for (const blo of blos ?? []) {
      const existing = map.get(String(blo.partNumber));
      if (
        !existing ||
        (blo.updatedAt ?? BigInt(0)) > (existing.updatedAt ?? BigInt(0))
      ) {
        map.set(String(blo.partNumber), blo);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => Number(a.partNumber) - Number(b.partNumber),
    );
  }, [blos]);

  const filtered = dedupedBLOs.filter((b) => {
    if (
      supervisorPartNumbers &&
      !supervisorPartNumbers.has(String(b.partNumber))
    )
      return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      b.partNumber.toString().includes(s) ||
      b.name.toLowerCase().includes(s) ||
      b.partName.toLowerCase().includes(s)
    );
  });

  const openNew = () => {
    setEditingBLO(emptyBLO());
    setIsEditing(false);
    setShowForm(true);
  };
  const openEdit = (b: BLO) => {
    setEditingBLO({ ...b });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) {
      toast("बॅकेंड उपलब्ध नाही", "error");
      return;
    }
    setSaving(true);
    try {
      const now = BigInt(Date.now()) * BigInt(1_000_000);
      const blo: BLO = {
        id:
          isEditing && editingBLO.id
            ? editingBLO.id
            : `blo-${CONST_ID}-${String(editingBLO.partNumber)}`,
        partNumber: String(editingBLO.partNumber ?? "0").trim(),
        partName: editingBLO.partName ?? "",
        name: editingBLO.name ?? "",
        phone: editingBLO.phone ?? "",
        email: editingBLO.email?.length ? editingBLO.email : undefined,
        designation: editingBLO.designation ?? "",
        officeAddress: editingBLO?.officeAddress?.length
          ? editingBLO.officeAddress
          : undefined,
        aadhaar: editingBLO.aadhaar?.length ? editingBLO.aadhaar : undefined,
        voterId: editingBLO.voterId?.length ? editingBLO.voterId : undefined,
        bankAccount: editingBLO.bankAccount?.length
          ? editingBLO.bankAccount
          : undefined,
        constituencyId: CONST_ID,
        isExcellent: editingBLO.isExcellent ?? false,
        appointmentOrderId: editingBLO.appointmentOrderId?.length
          ? editingBLO.appointmentOrderId
          : undefined,
        status: editingBLO.status ?? "active",
        createdAt: isEditing ? (editingBLO.createdAt ?? now) : now,
        updatedAt: now,
      };
      let ok: boolean;
      if (isEditing) {
        ok = await updateBLO(actor, blo);
      } else {
        ok = await saveBLO(actor, blo);
      }
      if (ok) {
        if (isEditing) {
          const sup = getCurrentSupervisor();
          const oldBlo = blos.find((x) => x.id === blo.id);
          if (sup && oldBlo) {
            const summary = buildChangeSummary(oldBlo, blo);
            const newHistory: BLOEditHistory = {
              ...editHistory,
              [blo.id]: [
                ...(editHistory[blo.id] ?? []),
                {
                  timestamp: Date.now(),
                  supervisorId: sup.id,
                  supervisorName: sup.name,
                  summary,
                },
              ],
            };
            setEditHistory(newHistory);
            saveEditHistory(newHistory);
          }
        }
        qc.invalidateQueries({ queryKey: ["blos"] });
        toast(isEditing ? "BLO अद्यतनित झाले" : "नवीन BLO जतन झाले", "success");
        setShowForm(false);
      } else {
        toast("जतन अयशस्वी. पुन्हा प्रयत्न करा.", "error");
      }
    } catch {
      toast("जतन करताना त्रुटी आली.", "error");
    } finally {
      setSaving(false);
    }
  };

  const setField = (field: keyof BLO, value: unknown) =>
    setEditingBLO((prev) => ({ ...prev, [field]: value }));

  const captureGPS = () => {
    if (!navigator.geolocation) {
      setGpsError("unavailable");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    setGpsSuccess(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        setGpsSuccess(true);
        setGpsError(null);
        setEditingBLO((prev) => ({
          ...prev,
          gpsLat: pos.coords.latitude,
          gpsLon: pos.coords.longitude,
          manualLat: pos.coords.latitude.toFixed(6),
          manualLon: pos.coords.longitude.toFixed(6),
        }));
      },
      (err) => {
        setGpsLoading(false);
        setGpsSuccess(false);
        if (err.code === 1) {
          setGpsError("permission");
        } else if (err.code === 3) {
          setGpsError("timeout");
        } else {
          setGpsError("timeout");
        }
        setEditingBLO((prev) => ({
          ...prev,
          manualLat: prev.manualLat ?? "",
          manualLon: prev.manualLon ?? "",
        }));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const applyManualGPS = () => {
    const lat = Number.parseFloat(editingBLO.manualLat ?? "");
    const lon = Number.parseFloat(editingBLO.manualLon ?? "");
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      toast("कृपया योग्य अक्षांश आणि रेखांश टाका", "error");
      return;
    }
    setEditingBLO((prev) => ({ ...prev, gpsLat: lat, gpsLon: lon }));
    setGpsError(null);
    toast("GPS स्थान जतन केले", "success");
  };

  const stationForPart = (pn: string) =>
    pollingStations.find((s) => String(s.partNumber) === String(pn));

  const handleBloFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBloImportError("");
    setBloImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<
          Record<string, string | number | undefined>
        >(ws, { defval: "" });
        if (rows.length === 0) {
          setBloImportError("Excel मध्ये कोणताही डेटा नाही.");
          return;
        }
        const headers = Object.keys(rows[0]).filter((h) => h.trim() !== "");
        setBloImportHeaders(headers);
        setBloImportRows(rows);
        const detect = (keywords: string[]) =>
          headers.find((h) =>
            keywords.some((k) => h.toLowerCase().includes(k)),
          ) ?? "";
        setBloColMap({
          nameCol: detect(["नाव", "name"]),
          phoneCol: detect([
            "whatsapp",
            "फोन",
            "phone",
            "mobile",
            "मोबाईल",
            "क्रमांक",
          ]),
          partNumberCol: detect(["भाग", "part", "केंद्र", "क्र", "no", "num"]),
          designationCol: detect(["पदनाम", "पद", "designation"]),
          locationCol: detect(["ठिकाण", "location", "स्थान", "पत्ता", "address"]),
          voterIdCol: detect(["मतदान ओळखपत्र", "voter", "voterid", "ओळखपत्र"]),
        });
      } catch {
        setBloImportError("Excel वाचण्यात त्रुटी आली.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBloImport = async () => {
    if (!actor) {
      setBloImportError("बॅकेंड उपलब्ध नाही.");
      return;
    }
    if (
      !bloColMap.nameCol ||
      !bloColMap.phoneCol ||
      !bloColMap.partNumberCol ||
      !bloColMap.designationCol ||
      !bloColMap.locationCol
    ) {
      setBloImportError(
        "BLO नाव, WhatsApp क्रमांक, मतदान केंद्र क्रमांक, पदनाम आणि मतदान केंद्राचे ठिकाण — हे सर्व 5 columns निवडा.",
      );
      return;
    }
    setBloImporting(true);
    setBloImportError("");
    setBloImportResult(null);
    let successCount = 0;
    const errors: string[] = [];
    const now = BigInt(Date.now()) * BigInt(1_000_000);

    // Build records first (validation pass)
    const bloRecords: Array<{
      id: string;
      partNumber: string;
      partName: string;
      name: string;
      phone: string;
      email: string | undefined;
      designation: string;
      voterId: string | undefined;
      partLocation: string | undefined;
      constituencyId: string;
      isExcellent: boolean;
      appointmentOrderId: string | undefined;
      status: "active";
      createdAt: bigint;
      updatedAt: bigint;
    }> = [];
    for (let i = 0; i < bloImportRows.length; i++) {
      const row = bloImportRows[i];
      const name = String(row[bloColMap.nameCol] ?? "").trim();
      const phone = String(row[bloColMap.phoneCol] ?? "").trim();
      if (!name || !phone) {
        errors.push(`ओळ ${i + 2}: नाव किंवा WhatsApp क्रमांक रिकामा आहे`);
        continue;
      }
      const existingWithPhone = blos.find(
        (b) => b.phone.replace(/\D/g, "") === phone.replace(/\D/g, ""),
      );
      if (existingWithPhone) {
        errors.push(
          `ओळ ${i + 2}: ${phone} — हा नंबर आधीच ${existingWithPhone.name} यांच्याशी जोडलेला आहे`,
        );
        continue;
      }
      const partNumberRaw = bloColMap.partNumberCol
        ? String(row[bloColMap.partNumberCol] ?? "").trim()
        : "";
      const station = partNumberRaw
        ? pollingStations.find((s) => String(s.partNumber) === partNumberRaw)
        : undefined;
      const designationRaw = String(row[bloColMap.designationCol] ?? "").trim();
      const locationRaw = String(row[bloColMap.locationCol] ?? "").trim();
      bloRecords.push({
        id: `blo-${CONST_ID}-${partNumberRaw || String(i + 1)}-${Date.now()}`,
        partNumber: partNumberRaw || "0",
        partName: station?.partName ?? "",
        name,
        phone,
        email: undefined,
        designation: designationRaw,
        voterId: bloColMap.voterIdCol
          ? String(row[bloColMap.voterIdCol] ?? "").trim() || undefined
          : undefined,
        partLocation: (station?.location ?? locationRaw) || undefined,
        constituencyId: CONST_ID,
        isExcellent: false,
        appointmentOrderId: undefined,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    }

    // Batched parallel import
    const BATCH_SIZE = 10;
    setImportProgress({ current: 0, total: bloRecords.length });
    for (let i = 0; i < bloRecords.length; i += BATCH_SIZE) {
      const batch = bloRecords.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (bloRecord, _bIdx) => {
          try {
            const ok = await saveBLO(actor, bloRecord);
            if (ok) return { success: true };
            return { success: false, msg: `${bloRecord.name}: जतन अयशस्वी` };
          } catch (err) {
            return {
              success: false,
              msg: `${bloRecord.name}: ${err instanceof Error ? err.message : "त्रुटी"}`,
            };
          }
        }),
      );
      for (const r of results) {
        if (r.success) successCount++;
        else errors.push(r.msg!);
      }
      setImportProgress({
        current: Math.min(i + BATCH_SIZE, bloRecords.length),
        total: bloRecords.length,
      });
    }
    setImportProgress(null);

    qc.invalidateQueries({ queryKey: ["blos"] });
    setBloImportResult({ success: successCount, errors });
    setBloImporting(false);
    if (successCount > 0) {
      const uniqueCount = new Set(
        bloRecords
          .slice(0, successCount + errors.length)
          .filter((_, i) => i < successCount)
          .map((r) => r.partNumber),
      ).size;
      const displayCount = uniqueCount > 0 ? uniqueCount : successCount;
      toast(
        `${displayCount} अद्वितीय केंद्रांसाठी BLO यशस्वीरित्या आयात झाले`,
        "success",
      );
    }
    if (bloFileRef.current) bloFileRef.current.value = "";
  };

  if (!canAccess) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 gap-3"
        data-ocid="blo-management.page"
      >
        <span className="text-4xl">🔒</span>
        <p className="text-muted-foreground font-medium">
          हे पान पाहण्यासाठी लॉगिन आवश्यक आहे.
        </p>
      </div>
    );
  }

  const statusLabel = (s: string) =>
    s === "active" ? "सक्रिय" : s === "pending" ? "प्रलंबित" : "निष्क्रिय";
  const statusClass = (s: string) =>
    s === "active"
      ? "bg-green-100 text-green-800"
      : s === "pending"
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";

  return (
    <div className="flex flex-col gap-4" data-ocid="blo-management.page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-primary">BLO व्यवस्थापन</h2>
        {(isAdmin || !!supervisor) && (
          <div className="flex gap-2 flex-wrap">
            {isAdmin && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowBloImport(true);
                  setBloImportRows([]);
                  setBloImportHeaders([]);
                  setBloImportResult(null);
                  setBloImportError("");
                }}
                data-ocid="blo-management.import_button"
              >
                📂 BLO यादी आयात करा
              </Button>
            )}
            {isAdmin && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={async () => {
                  const confirmed = window.confirm(
                    "तुम्हाला सर्व BLO रेकॉर्ड्स कायमचे हटवायचे आहेत का? हे पूर्ववत करता येणार नाही.",
                  );
                  if (!confirmed) return;
                  try {
                    await deleteBLOsByConstituency(actor!, CONST_ID);
                    await recordDeletion(
                      "BLO यादी",
                      "सर्व BLOs",
                      "admin",
                      "Admin द्वारे bulk delete",
                    );
                    qc.invalidateQueries({ queryKey: ["blos"] });
                    toast("BLO यादी यशस्वीरित्या साफ केली", "success");
                  } catch {
                    toast("BLO यादी साफ करताना त्रुटी आली", "error");
                  }
                }}
                data-ocid="blo-management.clear_list_button"
              >
                🗑️ BLO यादी साफ करा
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={openNew}
              data-ocid="blo-management.add_button"
            >
              + नवीन BLO आदेश
            </Button>
          </div>
        )}
      </div>

      <Input
        placeholder="मतदान केंद्र क्र., नाव किंवा केंद्राचे नाव शोधा..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
        data-ocid="blo-management.search_input"
      />

      {isLoading || isFetching ? (
        <div
          className="flex items-center justify-center py-12"
          data-ocid="blo-management.loading_state"
        >
          <span className="text-muted-foreground animate-pulse">
            लोड होत आहे...
          </span>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12 gap-2"
          data-ocid="blo-management.empty_state"
        >
          <span className="text-4xl">📋</span>
          <p className="text-muted-foreground">
            {search
              ? "कोणताही निकाल सापडला नाही"
              : "अद्याप कोणीही BLO नाही. वरील बटण दाबून BLO जोडा."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-3 py-2 text-center font-semibold">
                  मतदान केंद्र क्रमांक
                </th>
                <th className="px-3 py-2 text-left font-semibold">
                  मतदान केंद्राचे नाव
                </th>
                <th className="px-3 py-2 text-left font-semibold min-w-[200px]">
                  मतदान केंद्राचे ठिकाण
                </th>
                <th className="px-3 py-2 text-left font-semibold">BLO नाव</th>
                <th className="px-3 py-2 text-left font-semibold">पदनाम</th>
                <th className="px-3 py-2 text-left font-semibold">
                  WhatsApp क्रमांक
                </th>
                <th className="px-3 py-2 text-left font-semibold">स्थिती</th>
                <th className="px-3 py-2 text-left font-semibold">BLO आदेश</th>
                <th className="px-3 py-2 text-center font-semibold">नोटीस</th>
                <th className="px-3 py-2 text-left font-semibold">कृती</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => {
                return (
                  <>
                    <tr
                      key={b.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                      data-ocid={`blo-management.item.${i + 1}`}
                    >
                      <td className="px-3 py-2 font-mono text-center tabular-nums">
                        {Number(b.partNumber)}
                      </td>
                      <td className="px-3 py-2">{b.partName}</td>
                      <td className="px-3 py-2 min-w-[200px]">
                        {stationForPart(b.partNumber)?.location ?? ""}
                      </td>
                      <td className="px-3 py-2 font-medium">{b.name}</td>
                      <td className="px-3 py-2 text-sm">
                        {b.designation ?? ""}
                      </td>
                      <td className="px-3 py-2 font-mono">{b.phone}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(b.status)}`}
                        >
                          {statusLabel(b.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                          onClick={() =>
                            printBLOAppointmentOrder({
                              ...b,
                              pollingStationName: b.partName || "",
                            })
                          }
                          data-ocid={`blo-management.print_button.${i + 1}`}
                        >
                          🖨️ प्रिंट
                        </button>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {(() => {
                          const cnt = getNoticeCount(b.id);
                          return cnt > 0 ? (
                            <span className="bg-red-100 text-red-700 rounded-full px-2 py-0.5 text-xs font-bold">
                              {cnt}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 flex-wrap">
                          {(isAdmin ||
                            (!!supervisor &&
                              supervisorPartNumbers?.has(
                                String(b.partNumber),
                              ))) && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(b)}
                              data-ocid={`blo-management.edit_button.${i + 1}`}
                            >
                              संपादित करा
                            </Button>
                          )}
                          <button
                            type="button"
                            className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/70"
                            onClick={() =>
                              setExpandedHistory((prev) => {
                                const next = new Set(prev);
                                if (next.has(b.id)) next.delete(b.id);
                                else next.add(b.id);
                                return next;
                              })
                            }
                            data-ocid={`blo-management.history_toggle.${i + 1}`}
                          >
                            {expandedHistory.has(b.id)
                              ? "▲ इतिहास"
                              : "▼ बदल इतिहास"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedHistory.has(b.id) && (
                      <tr
                        key={`hist-${b.id}`}
                        className="bg-muted/20"
                        data-ocid={`blo-management.history_row.${i + 1}`}
                      >
                        <td colSpan={12} className="px-4 py-2">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            📋 बदल इतिहास — {b.name}
                          </p>
                          {(editHistory[b.id] ?? []).length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">
                              कोणताही बदल इतिहास नाही
                            </p>
                          ) : (
                            <ul className="flex flex-col gap-1">
                              {(editHistory[b.id] ?? []).map((entry, ei) => (
                                <li
                                  key={`${b.id}-${ei}`}
                                  className="text-xs flex gap-2 items-start border-b border-border/40 pb-1"
                                >
                                  <span className="text-muted-foreground whitespace-nowrap">
                                    {new Date(entry.timestamp).toLocaleString(
                                      "mr-IN",
                                    )}
                                  </span>
                                  <span className="text-foreground font-medium">
                                    {entry.supervisorName}:
                                  </span>
                                  <span className="text-foreground">
                                    {entry.summary}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit BLO Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => !v && setShowForm(false)}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="blo-management.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-primary">
              {isEditing ? "BLO संपादित करा" : "नवीन BLO जोडा"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="blo-partno">मतदान केंद्र क्रमांक *</Label>
                <Input
                  id="blo-partno"
                  type="number"
                  value={String(editingBLO.partNumber ?? "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    const pn = val.trim();
                    setField("partNumber", BigInt(pn || 0));
                    if (pn) {
                      const st = pollingStations.find(
                        (s) => String(s.partNumber) === pn,
                      );
                      if (st) {
                        setEditingBLO((prev) => ({
                          ...prev,
                          partName: st.partName,
                          location: st.location,
                        }));
                      } else {
                        setEditingBLO((prev) => ({
                          ...prev,
                          partName: "",
                          location: "",
                        }));
                      }
                    }
                  }}
                  required
                  data-ocid="blo-management.partno.input"
                />
              </div>
              <div>
                <Label htmlFor="blo-partname">मतदान केंद्राचे नाव *</Label>
                <Input
                  id="blo-partname"
                  value={editingBLO.partName ?? ""}
                  onChange={(e) => setField("partName", e.target.value)}
                  required
                  readOnly={!!editingBLO.partName && !!editingBLO.location}
                  className={
                    !!editingBLO.partName && !!editingBLO.location
                      ? "bg-muted"
                      : ""
                  }
                  data-ocid="blo-management.partname.input"
                />
                {!!editingBLO.partName && !!editingBLO.location && (
                  <p className="text-xs text-muted-foreground mt-1">
                    मतदान केंद्रातून
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label htmlFor="blo-location">मतदान केंद्राचे ठिकाण</Label>
                <Input
                  id="blo-location"
                  value={editingBLO.location ?? ""}
                  onChange={(e) =>
                    setEditingBLO((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  readOnly={!!editingBLO.partName && !!editingBLO.location}
                  className={
                    !!editingBLO.partName && !!editingBLO.location
                      ? "bg-muted"
                      : ""
                  }
                  data-ocid="blo-management.location.input"
                />
                {!!editingBLO.partName && !!editingBLO.location && (
                  <p className="text-xs text-muted-foreground mt-1">
                    मतदान केंद्रातून
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={captureGPS}
                disabled={gpsLoading}
                data-ocid="blo-management.gps_button"
              >
                {gpsLoading ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-spin">⏳</span> GPS शोधत आहे...
                  </span>
                ) : (
                  "📍 GPS स्थान"
                )}
              </Button>
            </div>
            {gpsSuccess &&
              editingBLO.gpsLat !== undefined &&
              editingBLO.gpsLon !== undefined && (
                <p
                  className="text-xs text-green-700 bg-green-50 rounded px-2 py-1"
                  data-ocid="blo-management.gps.success_state"
                >
                  ✅ GPS मिळाले — {editingBLO.gpsLat.toFixed(6)},{" "}
                  {editingBLO.gpsLon.toFixed(6)}
                </p>
              )}
            {!gpsSuccess &&
              editingBLO.gpsLat !== undefined &&
              editingBLO.gpsLon !== undefined && (
                <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                  📍 GPS: {editingBLO.gpsLat.toFixed(6)},{" "}
                  {editingBLO.gpsLon.toFixed(6)}
                </p>
              )}
            {gpsError !== null && (
              <div
                className="rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-xs text-orange-800"
                data-ocid="blo-management.gps.error_state"
              >
                <p className="font-semibold mb-1">
                  {gpsError === "permission"
                    ? "⚠️ GPS परवानगी नाकारली. ब्राउझरच्या सेटिंग मध्ये GPS परवानगी द्या किंवा खाली मॅन्युअली भरा."
                    : gpsError === "unavailable"
                      ? "⚠️ या उपकरणावर GPS उपलब्ध नाही. खाली मॅन्युअली भरा."
                      : "⚠️ GPS मिळाले नाही. पुन्हा प्रयत्न करा किंवा खाली मॅन्युअली भरा."}
                </p>
                <div className="flex gap-2 items-end flex-wrap">
                  <div className="flex flex-col gap-0.5">
                    <span>अक्षांश (Latitude)</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="उदा. 18.520430"
                      value={editingBLO.manualLat ?? ""}
                      onChange={(e) =>
                        setEditingBLO((prev) => ({
                          ...prev,
                          manualLat: e.target.value,
                        }))
                      }
                      className="h-7 w-36 text-xs"
                      data-ocid="blo-management.manual_lat.input"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span>रेखांश (Longitude)</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="उदा. 73.856743"
                      value={editingBLO.manualLon ?? ""}
                      onChange={(e) =>
                        setEditingBLO((prev) => ({
                          ...prev,
                          manualLon: e.target.value,
                        }))
                      }
                      className="h-7 w-36 text-xs"
                      data-ocid="blo-management.manual_lon.input"
                    />
                  </div>
                  {gpsError !== "permission" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={captureGPS}
                      disabled={gpsLoading}
                      data-ocid="blo-management.gps_retry_button"
                    >
                      {gpsLoading ? "शोधत आहे..." : "🔄 पुन्हा प्रयत्न करा"}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={applyManualGPS}
                    data-ocid="blo-management.manual_gps_save_button"
                  >
                    जतन करा
                  </Button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="blo-name">BLO नाव *</Label>
                <Input
                  id="blo-name"
                  value={editingBLO.name ?? ""}
                  onChange={(e) => setField("name", e.target.value)}
                  required
                  data-ocid="blo-management.name.input"
                />
              </div>
              <div>
                <Label htmlFor="blo-phone">WhatsApp क्रमांक *</Label>
                <Input
                  id="blo-phone"
                  type="tel"
                  value={editingBLO.phone ?? ""}
                  onChange={(e) => {
                    const digits = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10);
                    setField("phone", digits);
                    setPhoneError("");
                  }}
                  onBlur={() => {
                    const val = (editingBLO.phone ?? "").replace(/\D/g, "");
                    if (val.length > 0 && val.length !== 10) {
                      setPhoneError("मोबाईल नंबर 10 अंकी असणे आवश्यक आहे");
                    } else {
                      setPhoneError("");
                    }
                  }}
                  maxLength={10}
                  required
                  placeholder="10 अंकी WhatsApp क्रमांक"
                  data-ocid="blo-management.phone.input"
                />
                {phoneError && (
                  <p className="text-xs text-red-600 mt-1" role="alert">
                    {phoneError}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="blo-designation">पद *</Label>
              <Input
                id="blo-designation"
                value={editingBLO.designation ?? ""}
                onChange={(e) => setField("designation", e.target.value)}
                required
                data-ocid="blo-management.designation.input"
              />
            </div>
            <div>
              <Label htmlFor="blo-officeAddress">कार्यालयाचे नाव व पत्ता</Label>
              <Input
                id="blo-officeAddress"
                value={editingBLO.officeAddress ?? ""}
                onChange={(e) => setField("officeAddress", e.target.value)}
                placeholder="कर्मचारी कार्यरत असलेल्या कार्यालयाचे नाव व पत्ता"
                data-ocid="blo-management.officeAddress.input"
              />
            </div>
            <div>
              <Label htmlFor="blo-email">ईमेल (optional)</Label>
              <Input
                id="blo-email"
                type="email"
                value={editingBLO.email ?? ""}
                onChange={(e) => setField("email", e.target.value || undefined)}
                data-ocid="blo-management.email.input"
              />
            </div>
            <div>
              <Label htmlFor="blo-voterid">मतदान ओळखपत्र क्रमांक (optional)</Label>
              <Input
                id="blo-voterid"
                value={editingBLO.voterId ?? ""}
                onChange={(e) =>
                  setField("voterId", e.target.value || undefined)
                }
                placeholder="मतदान ओळखपत्र क्रमांक लिहा"
                data-ocid="blo-management.voterid.input"
              />
            </div>
            <p className="text-xs font-semibold text-muted-foreground -mb-1">
              बँक खाते माहिती (optional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="blo-bank-name">बँकेचे नाव</Label>
                <Input
                  id="blo-bank-name"
                  value={editingBLO.bankName ?? ""}
                  onChange={(e) =>
                    setEditingBLO((prev) => ({
                      ...prev,
                      bankName: e.target.value || undefined,
                    }))
                  }
                  placeholder="उदा. स्टेट बँक ऑफ इंडिया"
                  data-ocid="blo-management.bank_name.input"
                />
              </div>
              <div>
                <Label htmlFor="blo-account-no">खाते क्रमांक</Label>
                <Input
                  id="blo-account-no"
                  value={editingBLO.accountNumber ?? ""}
                  onChange={(e) =>
                    setEditingBLO((prev) => ({
                      ...prev,
                      accountNumber: e.target.value || undefined,
                    }))
                  }
                  placeholder="खाते क्रमांक"
                  data-ocid="blo-management.account_number.input"
                />
              </div>
              <div>
                <Label htmlFor="blo-ifsc">IFSC कोड</Label>
                <Input
                  id="blo-ifsc"
                  value={editingBLO.ifscCode ?? ""}
                  onChange={(e) =>
                    setEditingBLO((prev) => ({
                      ...prev,
                      ifscCode:
                        e.target.value || undefined
                          ? e.target.value.toUpperCase()
                          : undefined,
                    }))
                  }
                  placeholder="उदा. SBIN0001234"
                  data-ocid="blo-management.ifsc.input"
                />
              </div>
              <div>
                <Label htmlFor="blo-branch">बँकेची शाखा</Label>
                <Input
                  id="blo-branch"
                  value={editingBLO.branchName ?? ""}
                  onChange={(e) =>
                    setEditingBLO((prev) => ({
                      ...prev,
                      branchName: e.target.value || undefined,
                    }))
                  }
                  placeholder="शाखेचे नाव"
                  data-ocid="blo-management.branch_name.input"
                />
              </div>
            </div>
            <div>
              <Label>स्थिती</Label>
              <Select
                value={editingBLO.status ?? "active"}
                onValueChange={(v) => setField("status", v)}
              >
                <SelectTrigger data-ocid="blo-management.status.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">सक्रिय</SelectItem>
                  <SelectItem value="pending">प्रलंबित</SelectItem>
                  <SelectItem value="inactive">निष्क्रिय</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="blo-excellent"
                checked={editingBLO.isExcellent ?? false}
                onCheckedChange={(c) => setField("isExcellent", !!c)}
                data-ocid="blo-management.excellent.checkbox"
              />
              <Label htmlFor="blo-excellent">उत्कृष्ट BLO</Label>
            </div>
            {deleteId !== null && (
              <p className="text-sm text-destructive">हटवण्यासाठी दुजोरा आवश्यक</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                data-ocid="blo-management.cancel_button"
              >
                रद्द करा
              </Button>
              <Button
                type="submit"
                disabled={saving}
                data-ocid="blo-management.save_button"
              >
                {saving ? "जतन होत आहे..." : "जतन करा"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* BLO Excel Import Dialog */}
      <Dialog
        open={showBloImport}
        onOpenChange={(v) => !v && setShowBloImport(false)}
      >
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          data-ocid="blo-management.import.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-primary">
              BLO यादी Excel आयात
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="blo-excel-file">Excel फाइल (.xlsx) निवडा</Label>
              <input
                ref={bloFileRef}
                id="blo-excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleBloFileChange}
                className="mt-1 block w-full text-sm text-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer hover:file:bg-primary/90"
                data-ocid="blo-management.import.upload_button"
              />
            </div>

            {bloImportHeaders.length > 0 && (
              <>
                <div className="overflow-x-auto rounded border bg-muted/30 max-h-36">
                  <table className="text-xs w-full">
                    <thead>
                      <tr>
                        {bloImportHeaders.map((h) => (
                          <th
                            key={h}
                            className="px-2 py-1 border-b font-semibold text-left whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bloImportRows.slice(0, 4).map((row, ri) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: preview-only static list
                        <tr key={ri}>
                          {bloImportHeaders.map((h) => (
                            <td
                              key={h}
                              className="px-2 py-1 border-b whitespace-nowrap"
                            >
                              {String(row[h] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-sm font-semibold text-foreground">
                  Column Mapping
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["nameCol", "BLO नाव *"],
                      ["phoneCol", "WhatsApp क्रमांक *"],
                      ["partNumberCol", "मतदान केंद्र क्रमांक *"],
                      ["designationCol", "पदनाम *"],
                      ["locationCol", "मतदान केंद्राचे ठिकाण *"],
                      ["voterIdCol", "मतदान ओळखपत्र क्रमांक *"],
                    ] as [keyof typeof bloColMap, string][]
                  ).map(([field, label]) => (
                    <div key={field}>
                      <Label>{label}</Label>
                      <Select
                        value={bloColMap[field] || ""}
                        onValueChange={(v) =>
                          setBloColMap((prev) => ({ ...prev, [field]: v }))
                        }
                      >
                        <SelectTrigger
                          data-ocid={`blo-management.import.col.${field}`}
                        >
                          <SelectValue placeholder="-- निवडा --" />
                        </SelectTrigger>
                        <SelectContent>
                          {bloImportHeaders.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
                  💡 मतदान केंद्र क्रमांक दिल्यास केंद्राचे नाव व ठिकाण आपोआप भरले जाईल.
                </div>
              </>
            )}

            {importProgress && (
              <p className="mt-2 text-blue-700 font-medium">
                आयात सुरू आहे... ({importProgress.current} / {importProgress.total}
                )
              </p>
            )}
            {bloImportError && (
              <p
                className="text-sm text-destructive"
                role="alert"
                data-ocid="blo-management.import.error_state"
              >
                {bloImportError}
              </p>
            )}

            {bloImportResult && (
              <div
                className="rounded-md border bg-muted/30 p-3"
                data-ocid="blo-management.import.success_state"
              >
                <p className="text-sm font-semibold text-green-700">
                  ✅ यशस्वी: {bloImportResult.success} BLO आयात झाले
                </p>
                {bloImportResult.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-destructive cursor-pointer">
                      ⚠️ {bloImportResult.errors.length} त्रुटी — तपशील पाहण्यासाठी
                      येथे दाबा
                    </summary>
                    <ul className="mt-1 flex flex-col gap-0.5 max-h-28 overflow-y-auto">
                      {bloImportResult.errors.map((e, ei) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: error list
                        <li key={ei} className="text-xs text-destructive">
                          {e}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBloImport(false)}
                data-ocid="blo-management.import.cancel_button"
              >
                बंद करा
              </Button>
              {!bloImportResult && (
                <Button
                  type="button"
                  onClick={handleBloImport}
                  disabled={
                    bloImporting ||
                    bloImportRows.length === 0 ||
                    importProgress !== null
                  }
                  data-ocid="blo-management.import.submit_button"
                >
                  {bloImporting
                    ? "आयात होत आहे..."
                    : `आयात करा (${bloImportRows.length} ओळी)`}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
