// @ts-nocheck
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Download,
  IndianRupee,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Printer,
  Search,
  Star,
  Trash2,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
// STATION_MAP import removed — use storage.getStations() for current constituency

import type { AppointmentOrder, BLO, Notice } from "../types/domain";
import { saveSupervisor, updateSupervisor } from "../utils/backendService";
import type {
  BLOChangeRecord,
  Supervisor,
  SupervisorBankDetails,
  SupervisorWorkReport,
  SupervisorWorkReportEntry,
} from "../utils/storage";
import { getCurrentConstituency, storage } from "../utils/storage";

// TOTAL_PARTS removed — now computed from current constituency's stations

// ─── Unique Mobile Number Validator ───────────────────────────────────────────
function checkDuplicateMobile(
  mobile: string,
  excludeBloId?: bigint,
  excludeSupervisorId?: string,
): { found: boolean; message: string } {
  if (!mobile || mobile.length < 6) return { found: false, message: "" };
  const blos = storage.getBLOs();
  const supervisors = storage.getSupervisors();
  for (const blo of blos) {
    if (excludeBloId !== undefined && blo.id === excludeBloId) continue;
    if (blo.phone && blo.phone === mobile) {
      return {
        found: true,
        message: `हा मोबाईल नंबर आधीच नोंदणीकृत आहे — BLO: ${blo.name || "रिक्त"} (भाग क्र. ${Number(blo.pollingStationId)}) यांच्या फोन नंबर म्हणून`,
      };
    }
    if (blo.whatsapp && blo.whatsapp === mobile) {
      return {
        found: true,
        message: `हा मोबाईल नंबर आधीच नोंदणीकृत आहे — BLO: ${blo.name || "रिक्त"} (भाग क्र. ${Number(blo.pollingStationId)}) यांच्या WhatsApp नंबर म्हणून`,
      };
    }
  }
  for (const sup of supervisors) {
    if (excludeSupervisorId && sup.id === excludeSupervisorId) continue;
    if (sup.phone && sup.phone === mobile) {
      return {
        found: true,
        message: `हा मोबाईल नंबर आधीच नोंदणीकृत आहे — पर्यवेक्षक: ${sup.name} (${sup.designation}) यांच्याकडे`,
      };
    }
    if (sup.whatsapp && sup.whatsapp === mobile) {
      return {
        found: true,
        message: `हा मोबाईल नंबर आधीच नोंदणीकृत आहे — पर्यवेक्षक: ${sup.name} (${sup.designation}) यांचा WhatsApp नंबर म्हणून`,
      };
    }
  }
  return { found: false, message: "" };
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeCsv(val: string | null | undefined): string {
  const s = (val ?? "").toString();
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function printSupervisorList(supervisors: Supervisor[]) {
  const printWin = window.open("", "_blank", "width=960,height=720");
  if (!printWin) return;
  const tableRows = supervisors
    .map(
      (s, i) =>
        `<tr><td>${i + 1}</td><td>${s.name}</td><td>${s.designation}</td><td>${s.office || ""}</td><td>${s.whatsapp || ""}</td><td>${s.appointmentDate || ""}</td><td>${s.assignedPartNumbers.length}</td></tr>`,
    )
    .join("");
  const th = (t: string) =>
    `<th style="padding:4px 8px;border:1px solid #000;background:#ddd">${t}</th>`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>\u092a\u0930\u094d\u092f\u0935\u0947\u0915\u094d\u0937\u0915 \u092f\u093e\u0926\u0940</title><style>body{font-family:sans-serif;margin:20px}table{width:100%;border-collapse:collapse}td{padding:4px 8px;border:1px solid #000;font-size:10pt}h2{text-align:center}@media print{.noprint{display:none}}</style></head><body><h2>\u092a\u0930\u094d\u092f\u0935\u0947\u0915\u094d\u0937\u0915 \u092f\u093e\u0926\u0940</h2><button class="noprint" onclick="window.print()" style="margin-bottom:10px;padding:6px 16px;">\u092a\u094d\u0930\u093f\u0902\u091f \u0915\u0930\u093e</button><table><thead><tr>${th("\u0915\u094d\u0930.")}${th("\u0928\u093e\u0935")}${th("\u092a\u0926\u0928\u093e\u092e")}${th("\u0915\u093e\u0930\u094d\u092f\u093e\u0932\u092f")}${th("WhatsApp")}${th("\u0928\u093f\u092f\u0941\u0915\u094d\u0924\u0940 \u0926\u093f\u0928\u093e\u0902\u0915")}${th("BLO \u0938\u0902\u0916\u094d\u092f\u093e")}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
  printWin.document.write(html);
  printWin.document.close();
}

function exportSupervisors(supervisors: Supervisor[]) {
  const headers = [
    "अ.क्र.",
    "पर्यवेक्षक नाव",
    "पद",
    "कार्यालय",
    "फोन",
    "WhatsApp",
    "कार्यालयीन Email",
    "नियुक्ती दिनांक",
    "नियुक्त BLO भाग क्र.",
    "BLO संख्या",
    "स्थिती",
  ];
  const rows = supervisors.map((s, idx) =>
    [
      idx + 1,
      s.name,
      s.designation,
      s.office,
      s.phone,
      s.whatsapp,
      s.officeEmail,
      s.appointmentDate,
      s.assignedPartNumbers.join("; "),
      s.assignedPartNumbers.length,
      s.status === "active" ? "सक्रिय" : "निष्क्रिय",
    ]
      .map((v) => escapeCsv(String(v)))
      .join(","),
  );
  const bom = "\uFEFF";
  const csvContent =
    bom + [headers.map(escapeCsv).join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  a.href = url;
  a.download = `पर्यवेक्षक_यादी_211_खडकवासला_${dd}${mm}${yyyy}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`${supervisors.length} पर्यवेक्षक यादी Excel मध्ये export केली`);
}

// ─── BLO Work Report Dialog ────────────────────────────────────────────────────

const NAMED_QUARTERS = [
  { label: "जानेवारी-मार्च", value: "Q1" },
  { label: "एप्रिल-जून", value: "Q2" },
  { label: "जुलै-सप्टेंबर", value: "Q3" },
  { label: "ऑक्टोबर-डिसेंबर", value: "Q4" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const y = CURRENT_YEAR - 2 + i;
  return `${y}-${String(y + 1).slice(2)}`;
});

interface BLOWorkReportDialogProps {
  supervisor: Supervisor;
  open: boolean;
  onClose: () => void;
}

function BLOWorkReportDialog({
  supervisor,
  open,
  onClose,
}: BLOWorkReportDialogProps) {
  const [quarter, setQuarter] = useState(NAMED_QUARTERS[0].value);
  const [year, setYear] = useState(
    YEAR_OPTIONS[2] || `${CURRENT_YEAR}-${String(CURRENT_YEAR + 1).slice(2)}`,
  );
  const [tick, setTick] = useState(0);

  // Build blo entries from assigned parts
  const allBlos = storage.getBLOs();
  const bloEntries: SupervisorWorkReportEntry[] = supervisor.assignedPartNumbers
    .sort((a, b) => a - b)
    .map((partNum) => {
      const blo = allBlos.find((b) => Number(b.pollingStationId) === partNum);
      return {
        bloId: blo?.id?.toString() ?? `part_${partNum}`,
        partNum,
        name: blo?.name || "रिक्त",
        worked: false,
        remark: "",
      };
    });

  // Load existing report if any
  const existingReport = storage.getWorkReportForSupervisor(
    supervisor.id,
    quarter,
    year,
  );

  const [entries, setEntries] = useState<SupervisorWorkReportEntry[]>(() => {
    if (existingReport) {
      return bloEntries.map((e) => {
        const saved = existingReport.blos.find(
          (b) => b.partNum === e.partNum || b.bloId === e.bloId,
        );
        return saved ? { ...e, ...saved } : e;
      });
    }
    return bloEntries;
  });

  // When quarter/year changes, reload entries
  function loadForQuarterYear(q: string, y: string) {
    const rep = storage.getWorkReportForSupervisor(supervisor.id, q, y);
    setEntries(
      bloEntries.map((e) => {
        const saved = rep?.blos.find(
          (b) => b.partNum === e.partNum || b.bloId === e.bloId,
        );
        return saved ? { ...e, ...saved } : e;
      }),
    );
  }

  function handleQuarterChange(q: string) {
    setQuarter(q);
    loadForQuarterYear(q, year);
  }

  function handleYearChange(y: string) {
    setYear(y);
    loadForQuarterYear(quarter, y);
  }

  function toggleWorked(idx: number) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, worked: !e.worked } : e)),
    );
  }

  function setRemark(idx: number, remark: string) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, remark } : e)),
    );
  }

  function handleSave() {
    const report: SupervisorWorkReport = {
      id: `${supervisor.id}_${quarter}_${year}_${Date.now()}`,
      supervisorId: supervisor.id,
      quarter,
      year,
      submittedAt: new Date().toISOString(),
      blos: entries,
    };
    storage.saveOrUpdateWorkReport(report);
    toast.success("बीएलओ कामाचा अहवाल जतन केला");
    setTick((t) => t + 1);
  }

  const workedCount = entries.filter((e) => e.worked).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        data-ocid="supervisor.work_report.dialog"
      >
        <DialogHeader>
          <DialogTitle>BLO कामाचा अहवाल — {supervisor.name}</DialogTitle>
        </DialogHeader>
        <div key={tick} className="space-y-4">
          {/* Quarter and Year selectors */}
          <div className="flex gap-3 flex-wrap">
            <div>
              <p className="text-xs font-medium block mb-1">तिमाही निवडा</p>
              <div className="flex gap-2 flex-wrap">
                {NAMED_QUARTERS.map((q) => (
                  <button
                    key={q.value}
                    type="button"
                    className={`px-3 py-1 text-xs rounded border transition-colors ${
                      quarter === q.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                    onClick={() => handleQuarterChange(q.value)}
                    data-ocid={`supervisor.work_report.quarter.${q.value}`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium block mb-1">वर्ष</p>
              <div className="flex gap-2 flex-wrap">
                {YEAR_OPTIONS.map((y) => (
                  <button
                    key={y}
                    type="button"
                    className={`px-3 py-1 text-xs rounded border transition-colors ${
                      year === y
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                    onClick={() => handleYearChange(y)}
                    data-ocid={`supervisor.work_report.year.${y}`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <strong>तिमाही:</strong>{" "}
            {NAMED_QUARTERS.find((q) => q.value === quarter)?.label} |{" "}
            <strong>वर्ष:</strong> {year} |{" "}
            <span className="text-green-700 font-medium">
              काम केले: {workedCount}
            </span>{" "}
            / एकूण {entries.length}
          </div>

          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              कोणत्याही BLO नाही
            </p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">भाग क्र.</th>
                    <th className="text-left px-3 py-2 font-medium">BLO नाव</th>
                    <th className="text-center px-3 py-2 font-medium">
                      काम केले?
                    </th>
                    <th className="text-left px-3 py-2 font-medium">शेरा</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entries.map((entry, idx) => (
                    <tr
                      key={`${entry.partNum}_${idx}`}
                      className={entry.worked ? "bg-green-50" : ""}
                      data-ocid={`supervisor.work_report.item.${idx + 1}`}
                    >
                      <td className="px-3 py-2 font-mono font-semibold">
                        {entry.partNum}
                      </td>
                      <td className="px-3 py-2">{entry.name}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                              entry.worked
                                ? "bg-green-100 text-green-800 border-green-400"
                                : "bg-muted text-muted-foreground border-border hover:bg-green-50"
                            }`}
                            onClick={() => toggleWorked(idx)}
                            data-ocid={`supervisor.work_report.worked.${idx + 1}`}
                          >
                            {entry.worked ? "✓ काम केले" : "✗ काम नाही"}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="w-full text-[10px] border rounded px-1.5 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                          placeholder="शेरा (ऐच्छिक)"
                          value={entry.remark}
                          onChange={(e) => setRemark(idx, e.target.value)}
                          data-ocid={`supervisor.work_report.remark.${idx + 1}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            data-ocid="supervisor.work_report.close_button"
          >
            बंद करा
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={entries.length === 0}
            data-ocid="supervisor.work_report.save_button"
          >
            जतन करा
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── BLO Appointment + Notice Dialog ──────────────────────────────────────────

interface BLOAssignDialogProps {
  supervisor: Supervisor;
  open: boolean;
  onClose: () => void;
}

// Use shared global order number generator that reads ALL orders for sequential numbering
function generateSupervisorOrderNumber(
  partNumber: string | number,
  date?: string,
): string {
  const orderDate = date ?? new Date().toISOString().split("T")[0];
  // Use javak entry system for globally sequential numbers
  return storage.addJavakEntry({
    date: orderDate,
    documentType: "blo_order",
    subject: `BLO नियुक्ती आदेश - यादिभाग ${partNumber}`,
    recipientName: "",
    pollingPartNumber: String(partNumber),
    createdBy: "supervisor",
    createdByRole: "supervisor",
    isManual: false,
  }).javakNumber;
}

function BLOAssignDialog({ supervisor, open, onClose }: BLOAssignDialogProps) {
  const [blos, setBlos] = useState<BLO[]>(() => storage.getBLOs());
  const [notices, setNotices] = useState<Notice[]>(() => storage.getNotices());
  // Form state for new BLO
  const [formPartNum, setFormPartNum] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesignation, setFormDesignation] = useState("");
  const [formOffice, setFormOffice] = useState("");
  const [formMobile, setFormMobile] = useState("");
  const [formWhatsApp, setFormWhatsApp] = useState("");
  const [formEpic, setFormEpic] = useState("");
  const [formDate, setFormDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [mobileError, setMobileError] = useState("");
  const [whatsappError, setWhatsappError] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [showChangeLog, setShowChangeLog] = useState(false);
  // Print order state
  const [printOrderData, setPrintOrderData] = useState<AppointmentOrder | null>(
    null,
  );
  const [printNoticeData, setPrintNoticeData] = useState<{
    notice: Notice;
    blo: BLO;
  } | null>(null);
  // Track recently appointed parts for print button
  const [recentlyAppointed, setRecentlyAppointed] = useState<
    Record<number, AppointmentOrder>
  >({});

  // Edit BLO state
  const [editBloPartNum, setEditBloPartNum] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editOffice, setEditOffice] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editWhatsApp, setEditWhatsApp] = useState("");
  const [editEpic, setEditEpic] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editMobileError, setEditMobileError] = useState("");
  const [editWAError, setEditWAError] = useState("");

  // Notice compose form state
  const [noticeForm, setNoticeForm] = useState<{
    bloId: bigint;
    partNum: number;
    type: string;
  } | null>(null);
  const [noticeText, setNoticeText] = useState("");
  const [expandedNoticeHistory, setExpandedNoticeHistory] = useState<
    Set<bigint>
  >(new Set());

  // Feature: Good Performer notice warning
  const [goodPerformerNoticeWarning, setGoodPerformerNoticeWarning] = useState<{
    blo: BLO;
    type: string;
    partNum: number;
  } | null>(null);

  // Feature: BLO Activation WhatsApp
  const [activationBLO, setActivationBLO] = useState<BLO | null>(null);
  // Track last issued notice for inline WhatsApp after sending
  const [lastIssuedNotice, setLastIssuedNotice] = useState<{
    notice: Notice;
    blo: BLO;
  } | null>(null);

  function reload() {
    setBlos(storage.getBLOs());
    setNotices(storage.getNotices());
  }

  function getBLOForPart(partNum: number): BLO | undefined {
    return blos.find(
      (b) => Number(b.pollingStationId) === partNum && b.name?.trim(),
    );
  }

  function getLastNotice(blo: BLO): Notice | undefined {
    const bloNotices = notices
      .filter((n) => n.bloId === blo.id)
      .sort((a, b) => (a.id > b.id ? -1 : 1));
    return bloNotices[0];
  }

  function getAllNoticesForBLO(blo: BLO): Notice[] {
    return notices
      .filter((n) => n.bloId === blo.id)
      .sort((a, b) => (a.id > b.id ? -1 : 1));
  }

  function syncHasBLOFlags() {
    const allBlos = storage.getBLOs();
    const activeBLOStationIds = new Set(
      allBlos
        .filter((b) => b.status === "active")
        .map((b) => b.pollingStationId.toString()),
    );
    const stations = storage.getStations();
    const updated = stations.map((s) => ({
      ...s,
      hasBLO: activeBLOStationIds.has(s.id.toString()),
    }));
    storage.setStations(updated);
  }

  function handleSaveBLO() {
    if (!formPartNum) return;
    if (!formName.trim()) {
      toast.error("नाव आवश्यक आहे");
      return;
    }
    if (mobileError) {
      toast.error(mobileError);
      return;
    }
    if (whatsappError) {
      toast.error(whatsappError);
      return;
    }
    // Duplicate center check
    const allSupervisorsForCheck = storage.getSupervisors();
    const totalStationsForCheck = storage.getStations().length;
    const conflictSup = allSupervisorsForCheck.find(
      (s: any) =>
        s.id !== supervisor.id &&
        s.assignedPartNumbers &&
        s.assignedPartNumbers.includes(Number(formPartNum)),
    );
    if (conflictSup && formPartNum) {
      alert(
        `केंद्र क्र. ${formPartNum} आधीच ${conflictSup.name} यांना दिले आहे. एकाच केंद्राला दोन पर्यवेक्षक असू शकत नाहीत.`,
      );
      return;
    }
    // Over-allocation check
    if (totalStationsForCheck > 0 && formPartNum) {
      const allUniqueAfter = new Set([
        ...allSupervisorsForCheck.flatMap((s: any) =>
          (s.assignedPartNumbers || []).map(Number),
        ),
        Number(formPartNum),
      ]);
      const newTotal = allUniqueAfter.size;
      if (newTotal > totalStationsForCheck) {
        const proceed = confirm(
          `एकूण वाटप (${newTotal} केंद्रे) मतदारसंघातील एकूण केंद्रांपेक्षा (${totalStationsForCheck}) जास्त होईल. तरीही जतन करायचे का?`,
        );
        if (!proceed) return;
      }
    }
    const newBLO: BLO = {
      id: BigInt(Date.now()),
      status: "active",
      appointmentOrderId: BigInt(0),
      pollingStationId: BigInt(formPartNum),
      name: formName,
      designation: formDesignation,
      orderAccepted: false,
      office: formOffice,
      appointmentDate: formDate,
      whatsapp: formWhatsApp,
      epicNumber: formEpic,
      address: "",
      phone: formMobile,
      activationMessageSent: false,
    };
    // Deduplicate by pollingStationId (keep only one active BLO per part) then sort ascending
    const allExisting = storage
      .getBLOs()
      .filter((b) => Number(b.pollingStationId) !== formPartNum);
    const updated = [...allExisting, newBLO].sort(
      (a, b) => Number(a.pollingStationId) - Number(b.pollingStationId),
    );
    storage.setBLOs(updated);
    setBlos(updated);
    syncHasBLOFlags();

    // Also create an appointment order for this BLO
    // Look up station name from current constituency's localStorage data
    const allCurrentStations = storage.getStations();
    const stationForPart = allCurrentStations.find(
      (s) =>
        Number(s.partNumber) === formPartNum || Number(s.id) === formPartNum,
    );
    const existingOrders = storage.getOrders();
    const orderDate = formDate || new Date().toISOString().split("T")[0];
    const orderNumber = generateSupervisorOrderNumber(formPartNum, orderDate);
    const newOrder: AppointmentOrder = {
      id: BigInt(Date.now() + 1),
      status: "accepted",
      signatoryName: "",
      pollingStationId: BigInt(formPartNum),
      bloName: formName,
      designation: formDesignation,
      office: formOffice,
      orderDate: formDate || new Date().toISOString().split("T")[0],
      pollingStationName:
        stationForPart?.partName ?? `मतदान केंद्र ${formPartNum}`,
      orderNumber,
    };
    storage.setOrders([...existingOrders, newOrder]);
    setRecentlyAppointed((prev) => ({ ...prev, [formPartNum]: newOrder }));

    toast.success("BLO नियुक्त केला — आदेश तयार आहे");
    setActivationBLO(newBLO);
    setFormPartNum(null);
    setFormName("");
    setFormDesignation("");
    setFormOffice("");
    setFormMobile("");
    setFormWhatsApp("");
    setFormEpic("");
    setFormDate(new Date().toISOString().split("T")[0]);
  }

  function handlePrintOrder(order: AppointmentOrder) {
    setPrintOrderData(order);
    setTimeout(() => {
      window.print();
      setPrintOrderData(null);
    }, 300);
  }

  function handlePrintNotice(notice: Notice, blo: BLO) {
    setPrintNoticeData({ notice, blo });
    setTimeout(() => {
      window.print();
      setPrintNoticeData(null);
    }, 300);
  }

  function openFormForPart(partNum: number) {
    // Pre-fill from existing BLO record if one exists for this part
    const existingBlo = storage
      .getBLOs()
      .find((b) => Number(b.pollingStationId) === partNum);
    setFormPartNum(partNum);
    setFormName(existingBlo?.name ?? "");
    setFormDesignation(existingBlo?.designation ?? "");
    setFormOffice(existingBlo?.office ?? "");
    setFormMobile(existingBlo?.phone ?? "");
    setFormWhatsApp("");
    setFormEpic("");
    setFormDate(new Date().toISOString().split("T")[0]);
  }

  function issueNotice(blo: BLO, type: string, text?: string): Notice {
    const newNotice: Notice = {
      id: BigInt(Date.now()),
      noticeType: type,
      pollingStationId: blo.pollingStationId,
      bloId: blo.id,
      bloName: blo.name,
      issueDate: new Date().toISOString().split("T")[0],
      description:
        text?.trim() || `पर्यवेक्षक ${supervisor.name} यांनी नोटीस जारी केली`,
    };
    const updated = [...notices, newNotice];
    storage.setNotices(updated);
    setNotices(updated);
    const label =
      type === "नोटीस १"
        ? "नोटीस १"
        : type === "नोटीस २"
          ? "नोटीस २"
          : "नोटीस ३";
    toast.success(`${blo.name} यांना ${label} दिली`);
    return newNotice;
  }

  function handleNoticeFormSubmit(blo: BLO) {
    if (!noticeForm) return;
    const notice = issueNotice(blo, noticeForm.type, noticeText);
    setNoticeForm(null);
    setNoticeText("");
    setLastIssuedNotice({ notice, blo });
    setTimeout(() => handlePrintNotice(notice, blo), 100);
  }

  function openNoticeWhatsApp(notice: Notice, blo: BLO) {
    const wa = blo.whatsapp?.trim();
    if (!wa) return;
    const label = noticeLabel(notice.noticeType);
    const msg = `नोटीस प्रकार: ${label}\nBLO: ${blo.name}\nभाग क्र.: ${Number(blo.pollingStationId)}\nदिनांक: ${notice.issueDate}${notice.description ? `\nकारण: ${notice.description}` : ""}`;
    window.open(
      `https://wa.me/${wa.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  }

  function handleToggleGoodPerformer(blo: BLO) {
    const updated = blos.map((b) =>
      b.id === blo.id ? { ...b, honorariumEligible: !b.honorariumEligible } : b,
    );
    storage.setBLOs(updated);
    setBlos(updated);
    toast.success(
      blo.honorariumEligible
        ? `${blo.name} यांना 'चांगले काम' यादीतून वगळले`
        : `${blo.name} यांना 'चांगले काम करणारे BLO' म्हणून चिन्हांकित केले`,
    );
  }

  // Feature: BLO Activation WhatsApp
  function sendActivationWhatsApp(blo: BLO) {
    if (!blo.whatsapp?.trim()) {
      toast.error("WhatsApp क्रमांक नाही");
      return;
    }
    const stationEntry = storage
      .getStations()
      .find(
        (s) =>
          s.id.toString() === blo.pollingStationId.toString() ||
          Number(s.partNumber) === Number(blo.pollingStationId),
      );
    const partName = stationEntry?.partName ?? "";
    const msg = `नमस्कार ${blo.name}, आपली बूथ स्तरीय अधिकारी (BLO) म्हणून खडकवासला मतदार संघातील यादिभाग क्र. ${Number(blo.pollingStationId)} - ${partName} साठी नियुक्ती करण्यात आली आहे. आपले स्वागत आहे. - निवडणूक शाखा`;
    window.open(
      `https://wa.me/91${blo.whatsapp.trim()}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
    // Mark message as sent
    const updated = blos.map((b) =>
      b.id === blo.id ? { ...b, activationMessageSent: true } : b,
    );
    storage.setBLOs(updated);
    setBlos(updated);
    setActivationBLO(null);
  }

  function noticeLabel(type: string): string {
    if (type === "नोटीस १") return "नोटीस १";
    if (type === "नोटीस २") return "नोटीस २";
    if (type === "नोटीस ३") return "नोटीस ३";
    if (type === "शिस्त भंग") return "शिस्त कारवाई";
    if (type === "पोलीस") return "पोलीस कारवाई";
    return type;
  }

  function handleImportBLOs() {
    const lines = importText.trim().split("\n");
    const imported: BLO[] = [];
    const allExisting = storage.getBLOs();
    const existingPartNums = new Set(
      allExisting.map((b) => Number(b.pollingStationId)),
    );
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(",").map((s) => s.trim());
      const partNum = Number.parseInt(parts[0]);
      if (Number.isNaN(partNum)) continue;
      if (!supervisor.assignedPartNumbers.includes(partNum)) continue;
      // Skip if a BLO for this part already exists and has a name
      const existing = allExisting.find(
        (b) => Number(b.pollingStationId) === partNum,
      );
      if (existing?.name?.trim()) continue;
      // Skip duplicates within the imported batch itself
      if (existingPartNums.has(partNum)) continue;
      const mobile = parts[4] || "";
      const wa = parts[5] || "";
      if (mobile) {
        const check = checkDuplicateMobile(mobile);
        if (check.found) {
          toast.error(`भाग ${partNum}: ${check.message}`);
          continue;
        }
      }
      if (wa) {
        const check = checkDuplicateMobile(wa);
        if (check.found) {
          toast.error(`भाग ${partNum}: ${check.message}`);
          continue;
        }
      }
      const newBLO: BLO = {
        id: BigInt(Date.now() + imported.length),
        status: "active",
        appointmentOrderId: BigInt(0),
        pollingStationId: BigInt(partNum),
        name: parts[1] || "",
        designation: parts[2] || "",
        orderAccepted: false,
        office: parts[3] || "",
        appointmentDate: parts[7] || new Date().toISOString().split("T")[0],
        phone: mobile,
        whatsapp: wa,
        epicNumber: parts[6] || "",
        address: "",
      };
      imported.push(newBLO);
      existingPartNums.add(partNum);
    }
    if (imported.length === 0) {
      toast.error("आयात करण्यासाठी कोणतेही वैध रेकॉर्ड सापडले नाहीत");
      return;
    }
    // Merge: remove any existing blank records for imported parts, add new, sort ascending
    const importedPartSet = new Set(
      imported.map((b) => Number(b.pollingStationId)),
    );
    const base = allExisting.filter(
      (b) => !importedPartSet.has(Number(b.pollingStationId)),
    );
    const updated = [...base, ...imported].sort(
      (a, b) => Number(a.pollingStationId) - Number(b.pollingStationId),
    );
    storage.setBLOs(updated);
    setBlos(updated);
    syncHasBLOFlags();
    toast.success(`${imported.length} BLO यशस्वीरित्या आयात केले`);
    setShowImport(false);
    setImportText("");
  }

  function openEditForm(blo: BLO, partNum: number) {
    setEditBloPartNum(partNum);
    setEditName(blo.name ?? "");
    setEditDesignation(blo.designation ?? "");
    setEditOffice(blo.office ?? "");
    setEditMobile(blo.phone ?? "");
    setEditWhatsApp(blo.whatsapp ?? "");
    setEditEpic(blo.epicNumber ?? "");
    setEditDate(blo.appointmentDate ?? new Date().toISOString().split("T")[0]);
    setEditMobileError("");
    setEditWAError("");
  }

  function handleUpdateBLO(blo: BLO) {
    if (!editName.trim()) {
      toast.error("नाव आवश्यक आहे");
      return;
    }
    if (editMobileError) {
      toast.error(editMobileError);
      return;
    }
    if (editWAError) {
      toast.error(editWAError);
      return;
    }
    const oldData = {
      name: blo.name ?? "",
      designation: blo.designation ?? "",
      office: blo.office ?? "",
      phone: blo.phone ?? "",
      epicNumber: blo.epicNumber ?? "",
      appointmentDate: blo.appointmentDate ?? "",
    };
    const newData = {
      name: editName,
      designation: editDesignation,
      office: editOffice,
      phone: editMobile,
      epicNumber: editEpic,
      appointmentDate: editDate,
    };
    const updated = blos.map((b) =>
      b.id === blo.id
        ? {
            ...b,
            name: editName,
            designation: editDesignation,
            office: editOffice,
            phone: editMobile,
            whatsapp: editWhatsApp,
            epicNumber: editEpic,
            appointmentDate: editDate,
          }
        : b,
    );
    storage.setBLOs(updated);
    setBlos(updated);
    storage.addBLOChangeRecord({
      id: Date.now().toString(),
      type: "edit",
      partNumber: editBloPartNum!,
      supervisorId: supervisor.id,
      supervisorName: supervisor.name,
      changedAt: new Date().toISOString(),
      oldData,
      newData,
    });
    toast.success("BLO माहिती अद्यावत झाली");
    setEditBloPartNum(null);
  }

  function handleReplaceBLO(blo: BLO, partNum: number) {
    if (
      !window.confirm(
        `भाग ${partNum} मधील BLO "${blo.name}" यांना हटवून नवीन BLO नियुक्त करायचे आहे का?`,
      )
    )
      return;
    // Remove the existing BLO record for this part
    const updated = blos.filter((b) => b.id !== blo.id);
    storage.setBLOs(updated);
    setBlos(updated);
    syncHasBLOFlags();
    storage.addBLOChangeRecord({
      id: Date.now().toString(),
      type: "replace",
      partNumber: partNum,
      supervisorId: supervisor.id,
      supervisorName: supervisor.name,
      changedAt: new Date().toISOString(),
      oldBLOName: blo.name ?? "अज्ञात",
    });
    toast.success(`भाग ${partNum} रिक्त केला. आता नवीन BLO नियुक्त करा.`);
    openFormForPart(partNum);
  }

  const sortedParts = [...supervisor.assignedPartNumbers].sort((a, b) => a - b);

  return (
    <>
      {/* Print template - only visible during print */}
      {printOrderData && (
        <div className="print-only fixed inset-0 bg-white z-[9999]">
          <SupervisorOrderPrintTemplate order={printOrderData} />
        </div>
      )}
      {printNoticeData && (
        <div className="print-only fixed inset-0 bg-white z-[9999]">
          <NoticePrintTemplate
            notice={printNoticeData.notice}
            blo={printNoticeData.blo}
          />
        </div>
      )}

      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent
          className="w-screen h-screen max-w-none max-h-none rounded-none overflow-y-auto"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100vh",
            maxWidth: "100vw",
            maxHeight: "100vh",
            margin: 0,
            transform: "none",
            borderRadius: 0,
          }}
          data-ocid="supervisor.blo_assign.dialog"
        >
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-base">
                BLO बाबत — {supervisor.name}
              </DialogTitle>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 flex items-center gap-1"
                onClick={() => setShowChangeLog((v) => !v)}
              >
                📋 बदल नोंदी
              </button>
            </div>
          </DialogHeader>

          {/* Change Log Panel */}
          {showChangeLog &&
            (() => {
              const allRecords = storage.getBLOChangeLog();
              const records = allRecords.filter(
                (r) => r.supervisorId === supervisor.id,
              );
              return (
                <div className="border border-amber-200 rounded-lg bg-amber-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-800">
                    📋 BLO बदल नोंदी — {supervisor.name}
                  </p>
                  {records.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      अद्याप कोणतेही बदल नाहीत
                    </p>
                  ) : (
                    <div className="overflow-x-auto max-h-56 overflow-y-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-amber-100">
                            <th className="border border-amber-200 px-2 py-1 text-left">
                              दिनांक
                            </th>
                            <th className="border border-amber-200 px-2 py-1 text-left">
                              भाग क्र.
                            </th>
                            <th className="border border-amber-200 px-2 py-1 text-left">
                              प्रकार
                            </th>
                            <th className="border border-amber-200 px-2 py-1 text-left">
                              तपशील
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {records.map((r) => {
                            const dt = new Date(r.changedAt);
                            const dateStr = `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
                            let detail = "";
                            if (r.type === "replace") {
                              detail = `जुने BLO: ${r.oldBLOName ?? "—"} → नवीन नियुक्ती`;
                            } else if (
                              r.type === "edit" &&
                              r.oldData &&
                              r.newData
                            ) {
                              const changes: string[] = [];
                              if (r.oldData.name !== r.newData.name)
                                changes.push(
                                  `नाव: ${r.oldData.name} → ${r.newData.name}`,
                                );
                              if (
                                r.oldData.designation !== r.newData.designation
                              )
                                changes.push(
                                  `पद: ${r.oldData.designation} → ${r.newData.designation}`,
                                );
                              if (r.oldData.office !== r.newData.office)
                                changes.push(
                                  `कार्यालय: ${r.oldData.office} → ${r.newData.office}`,
                                );
                              if (r.oldData.phone !== r.newData.phone)
                                changes.push(
                                  `मोबाईल: ${r.oldData.phone} → ${r.newData.phone}`,
                                );
                              if (r.oldData.epicNumber !== r.newData.epicNumber)
                                changes.push(
                                  `EPIC: ${r.oldData.epicNumber} → ${r.newData.epicNumber}`,
                                );
                              if (
                                r.oldData.appointmentDate !==
                                r.newData.appointmentDate
                              )
                                changes.push(
                                  `दिनांक: ${r.oldData.appointmentDate} → ${r.newData.appointmentDate}`,
                                );
                              detail =
                                changes.length > 0
                                  ? changes.join("; ")
                                  : "बदल नाही";
                            }
                            return (
                              <tr key={r.id} className="hover:bg-amber-50">
                                <td className="border border-amber-200 px-2 py-1 whitespace-nowrap">
                                  {dateStr}
                                </td>
                                <td className="border border-amber-200 px-2 py-1">
                                  {r.partNumber}
                                </td>
                                <td className="border border-amber-200 px-2 py-1">
                                  <span
                                    className={
                                      r.type === "replace"
                                        ? "text-red-700 font-medium"
                                        : "text-blue-700 font-medium"
                                    }
                                  >
                                    {r.type === "replace"
                                      ? "BLO बदल"
                                      : "माहिती बदल"}
                                  </span>
                                </td>
                                <td className="border border-amber-200 px-2 py-1 text-gray-700">
                                  {detail}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}

          {/* Excel Import Panel */}
          {showImport && (
            <div className="border border-blue-200 rounded-lg bg-blue-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-800">
                CSV format: भागक्रमांक, नाव, पद, कार्यालय, मोबाईल, whatsapp, epic,
                दिनांक(YYYY-MM-DD)
              </p>
              <input
                type="file"
                accept=".csv"
                className="text-xs"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) =>
                    setImportText((ev.target?.result as string) ?? "");
                  reader.readAsText(file, "utf-8");
                }}
              />
              <textarea
                className="w-full h-24 text-xs border rounded p-2 font-mono"
                placeholder="किंवा येथे CSV data paste करा..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleImportBLOs}
                  data-ocid="supervisor.blo_import.button"
                >
                  आयात करा
                </button>
                <button
                  type="button"
                  className="text-xs px-3 py-1.5 rounded border hover:bg-gray-50"
                  onClick={() => {
                    setShowImport(false);
                    setImportText("");
                  }}
                >
                  रद्द करा
                </button>
              </div>
            </div>
          )}

          {/* Escalation Steps Card */}
          <div className="rounded-md border bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700 mb-2">
              कारवाईचे टप्पे
            </p>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="px-2 py-0.5 rounded border text-[10px] font-medium bg-yellow-100 text-yellow-800 border-yellow-300">
                नोटीस १<br />
                <span className="font-normal">प्रथम इशारा</span>
              </span>
              <AlertTriangle size={10} className="text-slate-400 shrink-0" />
              <span className="px-2 py-0.5 rounded border text-[10px] font-medium bg-orange-100 text-orange-800 border-orange-300">
                नोटीस २<br />
                <span className="font-normal">द्वितीय इशारा</span>
              </span>
              <AlertTriangle size={10} className="text-slate-400 shrink-0" />
              <span className="px-2 py-0.5 rounded border text-[10px] font-medium bg-red-100 text-red-800 border-red-300">
                नोटीस ३<br />
                <span className="font-normal">तृतीय इशारा</span>
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              एकूण {sortedParts.length} यादीभाग
            </p>

            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium">
                      भाग क्र.
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-medium">
                      BLO नाव
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-medium">
                      नोटीस स्थिती
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-medium">
                      क्रिया
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedParts.map((partNum) => {
                    const blo = getBLOForPart(partNum);
                    const lastNotice = blo ? getLastNotice(blo) : undefined;
                    const isFormOpen = formPartNum === partNum;
                    const recentOrder = recentlyAppointed[partNum];

                    return (
                      <>
                        <tr key={partNum} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-mono text-xs font-semibold">
                            {partNum}
                          </td>
                          <td className="px-3 py-2">
                            {blo ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs">{blo.name}</span>
                                <Badge className="text-[10px] h-4 bg-green-100 text-green-800 border-green-200">
                                  नियुक्त
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                रिक्त
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {lastNotice && blo ? (
                              <div className="flex flex-col gap-0.5">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] h-4 w-fit ${
                                    lastNotice.noticeType === "नोटीस १"
                                      ? "border-yellow-400 text-yellow-700 bg-yellow-50"
                                      : lastNotice.noticeType === "नोटीस २"
                                        ? "border-orange-400 text-orange-700 bg-orange-50"
                                        : lastNotice.noticeType === "नोटीस ३"
                                          ? "border-red-400 text-red-700 bg-red-50"
                                          : lastNotice.noticeType === "शिस्त भंग"
                                            ? "border-purple-400 text-purple-700 bg-purple-50"
                                            : "border-gray-400 text-gray-700 bg-gray-50"
                                  }`}
                                >
                                  {noticeLabel(lastNotice.noticeType)} ·{" "}
                                  {lastNotice.issueDate}
                                </Badge>
                                <button
                                  type="button"
                                  className="text-[9px] text-blue-600 hover:text-blue-800 text-left underline"
                                  onClick={() => {
                                    setExpandedNoticeHistory((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(blo.id)) next.delete(blo.id);
                                      else next.add(blo.id);
                                      return next;
                                    });
                                  }}
                                  data-ocid="supervisor.notice_history.toggle"
                                >
                                  इतिहास ({getAllNoticesForBLO(blo).length}){" "}
                                  {expandedNoticeHistory.has(blo.id)
                                    ? "▲"
                                    : "▼"}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-1">
                              {!blo && !recentOrder && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px] px-2 text-blue-700 border-blue-300 hover:bg-blue-50"
                                  onClick={() =>
                                    isFormOpen
                                      ? setFormPartNum(null)
                                      : openFormForPart(partNum)
                                  }
                                  data-ocid="supervisor.blo_appoint.button"
                                >
                                  <UserCheck size={10} className="mr-0.5" />
                                  नियुक्त करा
                                </Button>
                              )}
                              {(blo || recentOrder) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px] px-2 text-purple-700 border-purple-300 hover:bg-purple-50"
                                  onClick={() => {
                                    // Find order for this part
                                    const order =
                                      recentOrder ??
                                      storage
                                        .getOrders()
                                        .find(
                                          (o) =>
                                            Number(o.pollingStationId) ===
                                            partNum,
                                        );
                                    if (order) handlePrintOrder(order);
                                    else toast.error("आदेश सापडला नाही");
                                  }}
                                  data-ocid="supervisor.order_print.button"
                                >
                                  <Printer size={10} className="mr-0.5" />
                                  आदेश प्रिंट
                                </Button>
                              )}
                              {blo && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px] px-2 text-blue-700 border-blue-300 hover:bg-blue-50"
                                  onClick={() => openEditForm(blo, partNum)}
                                  data-ocid="supervisor.blo_edit.button"
                                >
                                  ✏️ संपादित
                                </Button>
                              )}
                              {blo && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px] px-2 text-rose-700 border-rose-300 hover:bg-rose-50"
                                  onClick={() => handleReplaceBLO(blo, partNum)}
                                  data-ocid="supervisor.blo_replace.button"
                                >
                                  🔄 BLO बदला
                                </Button>
                              )}
                              {blo &&
                                ((blo as any).isActive !== false ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (
                                        !window.confirm(
                                          "हा BLO निष्क्रिय करायचा आहे का? निष्क्रिय तारखेपासून मानधन मिळणार नाही.",
                                        )
                                      )
                                        return;
                                      const today = new Date()
                                        .toISOString()
                                        .split("T")[0];
                                      const allBLOs = storage.getBLOs();
                                      const idx = allBLOs.findIndex(
                                        (b: any) => b.id === blo.id,
                                      );
                                      if (idx >= 0) {
                                        (allBLOs[idx] as any).isActive = false;
                                        (allBLOs[idx] as any).deactivationDate =
                                          today;
                                        allBLOs[idx].status = "inactive";
                                        (allBLOs[idx] as any).statusHistory = [
                                          ...((allBLOs[idx] as any)
                                            .statusHistory || []),
                                          {
                                            action: "deactivated",
                                            date: today,
                                            by: supervisor.name,
                                          },
                                        ];
                                        storage.setBLOs(allBLOs);
                                        reload();
                                      }
                                    }}
                                    style={{
                                      padding: "2px 8px",
                                      fontSize: "11px",
                                      backgroundColor: "#fee2e2",
                                      color: "#dc2626",
                                      border: "1px solid #fca5a5",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                      marginLeft: "4px",
                                    }}
                                    data-ocid="supervisor.blo_deactivate.button"
                                  >
                                    निष्क्रिय करा
                                  </button>
                                ) : (
                                  <>
                                    <span
                                      style={{
                                        padding: "2px 6px",
                                        fontSize: "11px",
                                        backgroundColor: "#dc2626",
                                        color: "white",
                                        borderRadius: "4px",
                                        marginLeft: "4px",
                                      }}
                                    >
                                      निष्क्रिय
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (
                                          !window.confirm(
                                            "हा BLO पुन्हा सक्रिय करायचा आहे का?",
                                          )
                                        )
                                          return;
                                        const today = new Date()
                                          .toISOString()
                                          .split("T")[0];
                                        const allBLOs = storage.getBLOs();
                                        const idx = allBLOs.findIndex(
                                          (b: any) => b.id === blo.id,
                                        );
                                        if (idx >= 0) {
                                          (allBLOs[idx] as any).isActive = true;
                                          (
                                            allBLOs[idx] as any
                                          ).reactivationDate = today;
                                          allBLOs[idx].status = "active";
                                          (allBLOs[idx] as any).statusHistory =
                                            [
                                              ...((allBLOs[idx] as any)
                                                .statusHistory || []),
                                              {
                                                action: "activated",
                                                date: today,
                                                by: supervisor.name,
                                              },
                                            ];
                                          storage.setBLOs(allBLOs);
                                          reload();
                                        }
                                      }}
                                      style={{
                                        padding: "2px 8px",
                                        fontSize: "11px",
                                        backgroundColor: "#dcfce7",
                                        color: "#16a34a",
                                        border: "1px solid #86efac",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        marginLeft: "4px",
                                      }}
                                      data-ocid="supervisor.blo_activate.button"
                                    >
                                      सक्रिय करा
                                    </button>
                                  </>
                                ))}
                              {blo && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={`h-6 text-[10px] px-2 border ${blo.honorariumEligible ? "bg-yellow-100 text-yellow-700 border-yellow-400" : "text-muted-foreground border-muted-foreground/30 hover:bg-yellow-50"}`}
                                  onClick={() => handleToggleGoodPerformer(blo)}
                                  data-ocid="supervisor.good_performer.toggle"
                                >
                                  <Star
                                    size={10}
                                    className={`mr-0.5 ${blo.honorariumEligible ? "fill-yellow-500" : ""}`}
                                  />
                                  {blo.honorariumEligible ? "उत्कृष्ट" : "चांगले"}
                                </Button>
                              )}
                              {blo && (
                                <div className="flex flex-wrap items-center gap-1 justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[10px] px-2 text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                                    onClick={() => {
                                      if (blo.honorariumEligible) {
                                        setGoodPerformerNoticeWarning({
                                          blo,
                                          type: "नोटीस १",
                                          partNum,
                                        });
                                      } else {
                                        setNoticeForm({
                                          bloId: blo.id,
                                          partNum,
                                          type: "नोटीस १",
                                        });
                                        setNoticeText("");
                                      }
                                    }}
                                  >
                                    नोटीस १
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[10px] px-2 text-orange-700 border-orange-300 hover:bg-orange-50 disabled:opacity-40"
                                    disabled={
                                      lastNotice?.noticeType !== "नोटीस १"
                                    }
                                    onClick={() => {
                                      if (blo.honorariumEligible) {
                                        setGoodPerformerNoticeWarning({
                                          blo,
                                          type: "नोटीस २",
                                          partNum,
                                        });
                                      } else {
                                        setNoticeForm({
                                          bloId: blo.id,
                                          partNum,
                                          type: "नोटीस २",
                                        });
                                        setNoticeText("");
                                      }
                                    }}
                                    data-ocid="supervisor.notice2.button"
                                  >
                                    नोटीस २
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[10px] px-2 text-red-700 border-red-300 hover:bg-red-50 disabled:opacity-40"
                                    disabled={
                                      lastNotice?.noticeType !== "नोटीस २"
                                    }
                                    onClick={() => {
                                      if (blo.honorariumEligible) {
                                        setGoodPerformerNoticeWarning({
                                          blo,
                                          type: "नोटीस ३",
                                          partNum,
                                        });
                                      } else {
                                        setNoticeForm({
                                          bloId: blo.id,
                                          partNum,
                                          type: "नोटीस ३",
                                        });
                                        setNoticeText("");
                                      }
                                    }}
                                    data-ocid="supervisor.notice3.button"
                                  >
                                    नोटीस ३
                                  </Button>

                                  {lastNotice && (
                                    <>
                                      <Button
                                        size="sm"
                                        className={
                                          blo.whatsapp?.trim()
                                            ? "h-6 text-[10px] px-2 bg-green-500 hover:bg-green-600 text-white"
                                            : "h-6 text-[10px] px-2 bg-muted text-muted-foreground cursor-not-allowed"
                                        }
                                        disabled={!blo.whatsapp?.trim()}
                                        title={
                                          blo.whatsapp?.trim()
                                            ? "WhatsApp वर पाठवा"
                                            : "WhatsApp क्रमांक उपलब्ध नाही"
                                        }
                                        onClick={() =>
                                          openNoticeWhatsApp(lastNotice, blo)
                                        }
                                        data-ocid="supervisor.notice_whatsapp.button"
                                      >
                                        📱 WhatsApp
                                      </Button>
                                      {(blo as any).officeEmail && (
                                        <a
                                          href={`mailto:${(blo as any).officeEmail}?subject=${encodeURIComponent(`211 खडकवासला - ${noticeLabel(lastNotice.noticeType)} - भाग ${partNum}`)}&body=${encodeURIComponent(`${noticeLabel(lastNotice.noticeType)}\nBLO: ${blo.name}\nभाग क्र: ${partNum}\nदिनांक: ${lastNotice.issueDate}`)}`}
                                        >
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-6 text-[10px] px-2 text-blue-700 border-blue-300 hover:bg-blue-50"
                                            data-ocid="supervisor.notice_email.button"
                                          >
                                            <Mail
                                              size={10}
                                              className="mr-0.5"
                                            />
                                            Email
                                          </Button>
                                        </a>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 text-[10px] px-2 text-slate-700 border-slate-300 hover:bg-slate-50"
                                        onClick={() =>
                                          handlePrintNotice(lastNotice, blo)
                                        }
                                        data-ocid="supervisor.notice_print.button"
                                      >
                                        <Printer size={10} className="mr-0.5" />
                                        प्रिंट
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        {/* Inline Notice compose row */}
                        {noticeForm?.partNum === partNum && blo && (
                          <tr key={`notice-form-${partNum}`}>
                            <td
                              colSpan={4}
                              className="px-3 py-3 bg-yellow-50/60"
                            >
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-yellow-800">
                                  भाग {partNum} — {noticeLabel(noticeForm.type)}{" "}
                                  मजकूर
                                </p>
                                <div>
                                  <span className="text-[10px] font-medium text-slate-600">
                                    नोटीस मजकूर
                                  </span>
                                  <textarea
                                    className="mt-0.5 text-xs w-full rounded border border-input bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring min-h-[80px] resize-none"
                                    placeholder="येथे notice चा मजकूर टाइप करा..."
                                    value={noticeText}
                                    onChange={(e) =>
                                      setNoticeText(e.target.value)
                                    }
                                    data-ocid="supervisor.notice_text.textarea"
                                  />
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    className="h-7 text-[11px] px-3 bg-yellow-600 hover:bg-yellow-700 text-white"
                                    onClick={() => handleNoticeFormSubmit(blo)}
                                    data-ocid="supervisor.notice_send.button"
                                  >
                                    <Printer size={11} className="mr-1" />
                                    पाठवा आणि प्रिंट करा
                                  </Button>
                                  {lastIssuedNotice?.blo.id === blo.id && (
                                    <Button
                                      size="sm"
                                      className={
                                        blo.whatsapp?.trim()
                                          ? "h-7 text-[11px] px-3 bg-green-500 hover:bg-green-600 text-white"
                                          : "h-7 text-[11px] px-3 bg-muted text-muted-foreground cursor-not-allowed"
                                      }
                                      disabled={!blo.whatsapp?.trim()}
                                      title={
                                        blo.whatsapp?.trim()
                                          ? "WhatsApp वर पाठवा"
                                          : "WhatsApp क्रमांक उपलब्ध नाही"
                                      }
                                      onClick={() =>
                                        openNoticeWhatsApp(
                                          lastIssuedNotice.notice,
                                          blo,
                                        )
                                      }
                                      data-ocid="supervisor.notice_sent_whatsapp.button"
                                    >
                                      📱 WhatsApp
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[11px] px-3"
                                    onClick={() => {
                                      setNoticeForm(null);
                                      setNoticeText("");
                                    }}
                                    data-ocid="supervisor.notice_cancel.button"
                                  >
                                    रद्द करा
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        {/* Notice history expansion row */}
                        {blo && expandedNoticeHistory.has(blo.id) && (
                          <tr key={`history-${partNum}`}>
                            <td
                              colSpan={4}
                              className="px-3 py-2 bg-slate-50/80"
                            >
                              <div className="space-y-1">
                                <p className="text-[10px] font-semibold text-slate-600 mb-1">
                                  नोटीस इतिहास — भाग {partNum}
                                </p>
                                <table className="w-full text-[10px]">
                                  <thead>
                                    <tr className="text-slate-500 border-b">
                                      <th className="text-left pb-1 pr-2 font-medium">
                                        नोटीस प्रकार
                                      </th>
                                      <th className="text-left pb-1 pr-2 font-medium">
                                        दिनांक
                                      </th>
                                      <th className="text-left pb-1 pr-2 font-medium">
                                        मजकूर
                                      </th>
                                      <th className="text-right pb-1 font-medium">
                                        कृती
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {getAllNoticesForBLO(blo).map((n, idx) => (
                                      <tr
                                        key={String(n.id)}
                                        className="hover:bg-slate-100/60"
                                        data-ocid={`supervisor.notice_history.item.${idx + 1}`}
                                      >
                                        <td className="py-1 pr-2">
                                          <Badge
                                            variant="outline"
                                            className={`text-[9px] h-4 ${
                                              n.noticeType === "नोटीस १"
                                                ? "border-yellow-400 text-yellow-700 bg-yellow-50"
                                                : n.noticeType === "नोटीस २"
                                                  ? "border-orange-400 text-orange-700 bg-orange-50"
                                                  : n.noticeType === "नोटीस ३"
                                                    ? "border-red-400 text-red-700 bg-red-50"
                                                    : "border-gray-400 text-gray-700 bg-gray-50"
                                            }`}
                                          >
                                            {noticeLabel(n.noticeType)}
                                          </Badge>
                                        </td>
                                        <td className="py-1 pr-2 text-slate-600">
                                          {n.issueDate}
                                        </td>
                                        <td className="py-1 pr-2 text-slate-600 max-w-[200px] truncate">
                                          {(n.description || "—").slice(0, 40)}
                                          {(n.description || "").length > 40
                                            ? "…"
                                            : ""}
                                        </td>
                                        <td className="py-1 text-right">
                                          <div className="flex items-center justify-end gap-1">
                                            {blo.whatsapp?.trim() ? (
                                              <Button
                                                size="sm"
                                                className="h-5 text-[9px] px-1.5 bg-green-500 hover:bg-green-600 text-white"
                                                title="WhatsApp वर पाठवा"
                                                onClick={() =>
                                                  openNoticeWhatsApp(n, blo)
                                                }
                                                data-ocid={`supervisor.notice_history_whatsapp.button.${idx + 1}`}
                                              >
                                                📱
                                              </Button>
                                            ) : (
                                              <span
                                                className="inline-flex items-center h-5 text-[9px] px-1.5 opacity-30 cursor-not-allowed"
                                                title="WhatsApp क्रमांक उपलब्ध नाही"
                                              >
                                                📱
                                              </span>
                                            )}
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-5 text-[9px] px-1.5 text-slate-700 border-slate-300 hover:bg-slate-100"
                                              onClick={() =>
                                                handlePrintNotice(n, blo)
                                              }
                                              data-ocid={`supervisor.notice_history_print.button.${idx + 1}`}
                                            >
                                              <Printer
                                                size={8}
                                                className="mr-0.5"
                                              />
                                              प्रिंट
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                        {/* Inline Edit BLO form row */}
                        {editBloPartNum === partNum && blo && (
                          <tr key={`edit-form-${partNum}`}>
                            <td
                              colSpan={4}
                              className="px-3 py-3 bg-green-50/60"
                            >
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-green-800">
                                  भाग {partNum} — BLO माहिती संपादित करा
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-[10px] font-medium">
                                      नाव *
                                    </span>
                                    <input
                                      className="mt-0.5 h-7 text-xs w-full rounded border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                                      value={editName}
                                      onChange={(e) =>
                                        setEditName(e.target.value)
                                      }
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-medium">
                                      पद
                                    </span>
                                    <input
                                      className="mt-0.5 h-7 text-xs w-full rounded border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                                      value={editDesignation}
                                      onChange={(e) =>
                                        setEditDesignation(e.target.value)
                                      }
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-medium">
                                      कार्यालय
                                    </span>
                                    <input
                                      className="mt-0.5 h-7 text-xs w-full rounded border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                                      value={editOffice}
                                      onChange={(e) =>
                                        setEditOffice(e.target.value)
                                      }
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-medium">
                                      मोबाईल
                                    </span>
                                    <input
                                      className="mt-0.5 h-7 text-xs w-full rounded border border-input bg-background px-2 font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                                      value={editMobile}
                                      onChange={(e) => {
                                        setEditMobile(e.target.value);
                                        const c = checkDuplicateMobile(
                                          e.target.value,
                                          blo.id,
                                        );
                                        setEditMobileError(
                                          c.found ? c.message : "",
                                        );
                                      }}
                                    />
                                    {editMobileError && (
                                      <p className="text-[9px] text-red-600 mt-0.5">
                                        {editMobileError}
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-medium">
                                      WhatsApp
                                    </span>
                                    <input
                                      className="mt-0.5 h-7 text-xs w-full rounded border border-input bg-background px-2 font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                                      value={editWhatsApp}
                                      onChange={(e) => {
                                        setEditWhatsApp(e.target.value);
                                        const c = checkDuplicateMobile(
                                          e.target.value,
                                          blo.id,
                                        );
                                        setEditWAError(
                                          c.found ? c.message : "",
                                        );
                                      }}
                                    />
                                    {editWAError && (
                                      <p className="text-[9px] text-red-600 mt-0.5">
                                        {editWAError}
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-medium">
                                      EPIC क्रमांक
                                    </span>
                                    <input
                                      className="mt-0.5 h-7 text-xs w-full rounded border border-input bg-background px-2 font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                                      value={editEpic}
                                      onChange={(e) =>
                                        setEditEpic(e.target.value)
                                      }
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-medium">
                                      नियुक्ती दिनांक
                                    </span>
                                    <input
                                      type="date"
                                      className="mt-0.5 h-7 text-xs w-full rounded border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                                      value={editDate}
                                      onChange={(e) =>
                                        setEditDate(e.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2 mt-1">
                                  <Button
                                    size="sm"
                                    className="h-7 text-[11px] px-3 bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleUpdateBLO(blo)}
                                    data-ocid="supervisor.blo_edit_save.button"
                                  >
                                    जतन करा
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[11px] px-3"
                                    onClick={() => setEditBloPartNum(null)}
                                  >
                                    रद्द करा
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        {/* Inline BLO form row */}
                        {isFormOpen && (
                          <tr key={`form-${partNum}`}>
                            <td colSpan={4} className="px-3 py-3 bg-blue-50/60">
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-blue-800">
                                  भाग {partNum} साठी BLO नोंदणी व नियुक्ती आदेश
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-[10px] font-medium">
                                      नाव *
                                    </span>
                                    <input
                                      className="mt-0.5 h-7 text-xs w-full rounded border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                                      placeholder="BLO चे नाव"
                                      value={formName}
                                      onChange={(e) =>
                                        setFormName(e.target.value)
                                      }
                                      data-ocid="supervisor.blo_form.name_input"
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-medium">
                                      पद
                                    </span>
                                    <input
                                      className="mt-0.5 h-7 text-xs w-full rounded border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                                      placeholder="उदा. ग्राम महसूल अधिकारी"
                                      value={formDesignation}
                                      onChange={(e) =>
                                        setFormDesignation(e.target.value)
                                      }
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-medium">
                                      कार्यालय
                                    </span>
                                    <input
                                      className="mt-0.5 h-7 text-xs w-full rounded border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                                      placeholder="कार्यालयाचे नाव"
                                      value={formOffice}
                                      onChange={(e) =>
                                        setFormOffice(e.target.value)
                                      }
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-medium">
                                      भ्रमणध्वनी
                                    </span>
                                    <input
                                      className="mt-0.5 h-7 text-xs w-full rounded border border-input bg-background px-2 font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                                      placeholder="10 अंकी"
                                      value={formMobile}
                                      onChange={(e) => {
                                        setFormMobile(e.target.value);
                                        const check = checkDuplicateMobile(
                                          e.target.value,
                                          undefined,
                                          undefined,
                                        );
                                        setMobileError(
                                          check.found ? check.message : "",
                                        );
                                      }}
                                    />
                                    {mobileError && (
                                      <p className="text-[9px] text-red-600 mt-0.5">
                                        {mobileError}
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-medium">
                                      WhatsApp
                                    </span>
                                    <input
                                      className="mt-0.5 h-7 text-xs w-full rounded border border-input bg-background px-2 font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                                      placeholder="10 अंकी"
                                      value={formWhatsApp}
                                      onChange={(e) => {
                                        setFormWhatsApp(e.target.value);
                                        const check = checkDuplicateMobile(
                                          e.target.value,
                                          undefined,
                                          undefined,
                                        );
                                        setWhatsappError(
                                          check.found ? check.message : "",
                                        );
                                      }}
                                    />
                                    {whatsappError && (
                                      <p className="text-[9px] text-red-600 mt-0.5">
                                        {whatsappError}
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-medium">
                                      EPIC क्रमांक
                                    </span>
                                    <input
                                      className="mt-0.5 h-7 text-xs w-full rounded border border-input bg-background px-2 font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                                      placeholder="EPIC"
                                      value={formEpic}
                                      onChange={(e) =>
                                        setFormEpic(e.target.value)
                                      }
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-medium">
                                      नियुक्ती दिनांक
                                    </span>
                                    <input
                                      type="date"
                                      className="mt-0.5 h-7 text-xs w-full rounded border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                                      value={formDate}
                                      onChange={(e) =>
                                        setFormDate(e.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={handleSaveBLO}
                                    disabled={!formName.trim()}
                                    data-ocid="supervisor.blo_form.save_button"
                                  >
                                    जतन करा व आदेश तयार करा
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => setFormPartNum(null)}
                                  >
                                    रद्द करा
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                reload();
                onClose();
              }}
              data-ocid="supervisor.blo_assign.close_button"
            >
              बंद करा
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {goodPerformerNoticeWarning && (
        <AlertDialog
          open={true}
          onOpenChange={() => setGoodPerformerNoticeWarning(null)}
        >
          <AlertDialogContent data-ocid="supervisor.good_performer_notice_warning.dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>⚠️ सूचना</AlertDialogTitle>
              <AlertDialogDescription>
                {goodPerformerNoticeWarning.blo.name} यांना पर्यवेक्षक यांनी
                &apos;चांगले काम करणारे BLO&apos; म्हणून नोंद केली आहे. तरीही नोटीस
                काढायची आहे का?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setGoodPerformerNoticeWarning(null)}
                data-ocid="supervisor.good_performer_notice_warning.cancel_button"
              >
                नाही, रद्द करा
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setNoticeForm({
                    bloId: goodPerformerNoticeWarning.blo.id,
                    partNum: goodPerformerNoticeWarning.partNum,
                    type: goodPerformerNoticeWarning.type,
                  });
                  setNoticeText("");
                  setGoodPerformerNoticeWarning(null);
                }}
                data-ocid="supervisor.good_performer_notice_warning.confirm_button"
              >
                होय, नोटीस काढा
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {activationBLO?.whatsapp && (
        <AlertDialog open={true} onOpenChange={() => setActivationBLO(null)}>
          <AlertDialogContent data-ocid="supervisor.activation_whatsapp.dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>WhatsApp संदेश पाठवा</AlertDialogTitle>
              <AlertDialogDescription>
                {activationBLO.name} सक्रिय झाले आहे. त्यांना WhatsApp वर नियुक्ती संदेश
                पाठवायचा आहे का?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setActivationBLO(null)}>
                नंतर पाठवा
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => sendActivationWhatsApp(activationBLO)}
                data-ocid="supervisor.activation_whatsapp.send_button"
              >
                WhatsApp संदेश पाठवा
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

// ─── Unassigned Parts Dialog ───────────────────────────────────────────────────

interface UnassignedPartsDialogProps {
  open: boolean;
  onClose: () => void;
  unassignedParts: number[];
}

function UnassignedPartsDialog({
  open,
  onClose,
  unassignedParts,
}: UnassignedPartsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-lg max-h-[80vh] overflow-y-auto"
        data-ocid="supervisor.unassigned_parts.dialog"
      >
        <DialogHeader>
          <DialogTitle>पर्यवेक्षक नसलेले यादिभाग</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          एकूण <strong>{unassignedParts.length}</strong> यादिभागांना पर्यवेक्षक नाही.
        </p>
        {unassignedParts.length === 0 ? (
          <p className="text-sm text-center py-6 text-muted-foreground">
            सर्व यादिभागांना पर्यवेक्षक नेमलेले आहेत ✓
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5 py-2">
            {unassignedParts.map((p) => (
              <Badge
                key={p}
                variant="outline"
                className="font-mono text-xs px-2 py-0.5 border-amber-400 text-amber-800 bg-amber-50"
              >
                भाग {p}
              </Badge>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            data-ocid="supervisor.unassigned_parts.close_button"
          >
            बंद करा
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Supervisor Form Dialog ────────────────────────────────────────────────────

interface SupervisorFormDialogProps {
  supervisor?: Supervisor | null;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

function SupervisorFormDialog({
  supervisor,
  open,
  onClose,
  onSave,
}: SupervisorFormDialogProps) {
  const isEdit = !!supervisor;
  const [name, setName] = useState(supervisor?.name ?? "");
  const [designation, setDesignation] = useState(supervisor?.designation ?? "");
  const [office, setOffice] = useState(supervisor?.office ?? "");
  const [phone, _setPhone] = useState(supervisor?.phone ?? "");
  const [_phoneError, _setPhoneError] = useState("");
  const [whatsapp, setWhatsappNumber] = useState(supervisor?.whatsapp ?? "");
  const [officeEmail, setOfficeEmail] = useState(supervisor?.officeEmail ?? "");
  const [appointmentDate, setAppointmentDate] = useState(
    supervisor?.appointmentDate ?? "",
  );
  // Bank details states - load from storage if editing
  const existingBank = supervisor
    ? storage.getSupervisorBankDetail(supervisor.id)
    : null;
  const [bankName, setBankName] = useState(existingBank?.bankName ?? "");
  const [bankBranch, setBankBranch] = useState(existingBank?.branch ?? "");
  const [accountNumber, setAccountNumber] = useState(
    existingBank?.accountNumber ?? "",
  );
  const [ifsc, setIfsc] = useState(existingBank?.ifsc ?? "");
  const [partNumbersInput, setPartNumbersInput] = useState(
    supervisor?.assignedPartNumbers.join(", ") ?? "",
  );

  function parsePartNumbers(input: string): number[] {
    return input
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map(Number)
      .filter((n) => !Number.isNaN(n) && n > 0);
  }

  function handleSave() {
    const partNumbers = parsePartNumbers(partNumbersInput);
    if (!name.trim()) {
      toast.error("नाव आवश्यक आहे");
      return;
    }
    if (_phoneError) {
      toast.error(_phoneError);
      return;
    }
    if (partNumbers.length < 1) {
      toast.error("किमान एक BLO भाग क्रमांक द्या");
      return;
    }
    // Duplicate center check for batch assignment
    if (partNumbers.length > 0) {
      const allSups = storage.getSupervisors();
      const totalSts = storage.getStations().length;
      const currentId = supervisor?.id;
      const duplicates: string[] = [];
      for (const pn of partNumbers) {
        const conflict = allSups.find(
          (s: any) =>
            s.id !== currentId &&
            s.assignedPartNumbers &&
            s.assignedPartNumbers.includes(Number(pn)),
        );
        if (conflict) duplicates.push(`केंद्र क्र. ${pn} → ${conflict.name}`);
      }
      if (duplicates.length > 0) {
        alert(
          `खालील केंद्रे आधीच दुसऱ्या पर्यवेक्षकाला दिलेली आहेत:\n${duplicates.join("\n")}\n\nकृपया दुप्लिकेट केंद्रे काढा.`,
        );
        return;
      }
      // Over-allocation warning
      if (totalSts > 0) {
        const otherSups = allSups.filter((s: any) => s.id !== currentId);
        const allUniqueAfter = new Set([
          ...otherSups.flatMap((s: any) =>
            (s.assignedPartNumbers || []).map(Number),
          ),
          ...partNumbers.map(Number),
        ]);
        const newTotal = allUniqueAfter.size;
        if (newTotal > totalSts) {
          const proceed = confirm(
            `एकूण वाटप (${newTotal} केंद्रे) मतदारसंघातील एकूण केंद्रांपेक्षा (${totalSts}) जास्त होईल. तरीही जतन करायचे का?`,
          );
          if (!proceed) return;
        }
      }
    }
    const supervisors = storage.getSupervisors();
    if (isEdit && supervisor) {
      const updated = supervisors.map((s) =>
        s.id === supervisor.id
          ? {
              ...s,
              name,
              designation,
              office,
              phone,
              whatsapp,
              officeEmail,
              appointmentDate,
              assignedPartNumbers: partNumbers,
            }
          : s,
      );
      storage.setSupervisors(updated);
      updateSupervisor(
        getCurrentConstituency() || "",
        (supervisors.find((s) => s.id === (supervisor as any).id) || {}) as any,
      ).catch(() => {});
      // Auto-save bank details to honorarium section
      const bankDetails: SupervisorBankDetails = {
        bankName,
        branch: bankBranch,
        accountNumber,
        ifsc,
      };
      storage.saveSupervisorBankDetail(supervisor.id, bankDetails);
      toast.success("पर्यवेक्षक माहिती अद्ययावत केली");
    } else {
      const newSupervisor: Supervisor = {
        id: generateId(),
        name,
        designation,
        office,
        phone,
        whatsapp,
        officeEmail,
        appointmentDate,
        assignedPartNumbers: partNumbers,
        status: "active",
      };
      storage.setSupervisors([...supervisors, newSupervisor]);
      updateSupervisor(
        getCurrentConstituency() || "",
        newSupervisor as any,
      ).catch(() => {});
      // Auto-save bank details to honorarium section
      const bankDetails: SupervisorBankDetails = {
        bankName,
        branch: bankBranch,
        accountNumber,
        ifsc,
      };
      storage.saveSupervisorBankDetail(newSupervisor.id, bankDetails);
      toast.success("नवीन पर्यवेक्षक जोडला");
    }
    onSave();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        data-ocid="supervisor.form.dialog"
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "पर्यवेक्षक माहिती संपादित करा" : "नवीन पर्यवेक्षक जोडा"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <Label className="text-xs">नाव *</Label>
            <Input
              className="mt-1 h-8 text-sm"
              placeholder="पर्यवेक्षकाचे नाव"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-ocid="supervisor.form.name_input"
            />
          </div>
          <div>
            <Label className="text-xs">पद</Label>
            <Input
              className="mt-1 h-8 text-sm"
              placeholder="उदा. ग्राम महसूल अधिकारी"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">कार्यालय</Label>
            <Input
              className="mt-1 h-8 text-sm"
              placeholder="कार्यालयाचे नाव"
              value={office}
              onChange={(e) => setOffice(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">WhatsApp क्रमांक</Label>
              <Input
                className="mt-1 h-8 text-sm font-mono"
                placeholder="10 अंकी"
                value={whatsapp}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">नियुक्ती दिनांक</Label>
              <Input
                className="mt-1 h-8 text-sm"
                placeholder="DD/MM/YYYY"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">कार्यालयीन Email</Label>
            <Input
              className="mt-1 h-8 text-sm"
              type="email"
              placeholder="office@example.gov.in"
              value={officeEmail}
              onChange={(e) => setOfficeEmail(e.target.value)}
            />
          </div>

          {/* Bank Details Section */}
          <div className="border rounded-md p-3 bg-blue-50/50 space-y-2">
            <p className="text-xs font-semibold text-blue-700">
              🏦 बँक तपशील (मानधनासाठी)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">बँकेचे नाव</Label>
                <Input
                  className="mt-1 h-8 text-sm"
                  placeholder="उदा. स्टेट बँक"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  data-ocid="supervisor.form.bank_name"
                />
              </div>
              <div>
                <Label className="text-xs">शाखा</Label>
                <Input
                  className="mt-1 h-8 text-sm"
                  placeholder="शाखेचे नाव"
                  value={bankBranch}
                  onChange={(e) => setBankBranch(e.target.value)}
                  data-ocid="supervisor.form.bank_branch"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">खाते क्रमांक</Label>
                <Input
                  className="mt-1 h-8 text-sm font-mono"
                  placeholder="खाते क्रमांक"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  data-ocid="supervisor.form.account_number"
                />
              </div>
              <div>
                <Label className="text-xs">IFSC कोड</Label>
                <Input
                  className="mt-1 h-8 text-sm font-mono uppercase"
                  placeholder="IFSC Code"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  data-ocid="supervisor.form.ifsc"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs">
              नियुक्त BLO यादीभाग क्रमांक *{" "}
              <span className="text-muted-foreground font-normal">
                (कॉमा किंवा space ने विभक्त)
              </span>
            </Label>
            <textarea
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="उदा: 1, 2, 3, 15, 20, 45"
              value={partNumbersInput}
              onChange={(e) => setPartNumbersInput(e.target.value)}
              data-ocid="supervisor.form.part_numbers_input"
            />
            <p className="text-xs text-muted-foreground mt-1">
              एकूण: <strong>{parsePartNumbers(partNumbersInput).length}</strong>{" "}
              BLO
              {parsePartNumbers(partNumbersInput).length > 0 &&
                parsePartNumbers(partNumbersInput).length < 15 && (
                  <span className="text-amber-600 ml-2">
                    ⚠ सामान्यतः 15-25 BLO असतात
                  </span>
                )}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            रद्द करा
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!name.trim()}
            data-ocid="supervisor.form.save_button"
          >
            जतन करा
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── GPS Update Dialog ────────────────────────────────────────────────────────

interface GPSUpdateDialogProps {
  supervisor: Supervisor;
  open: boolean;
  onClose: () => void;
}

function GPSUpdateDialog({ supervisor, open, onClose }: GPSUpdateDialogProps) {
  const [stations, setStations] = useState(() => storage.getStations());
  const [gpsManualPartNum, setGpsManualPartNum] = useState<number | null>(null);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [locatingPart, setLocatingPart] = useState<number | null>(null);
  const [gpsErrorPart, setGpsErrorPart] = useState<number | null>(null);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string>("");
  const [gpsSuccessPart, setGpsSuccessPart] = useState<number | null>(null);

  // Load assigned stations
  const assignedStations = stations
    .filter((s) =>
      supervisor.assignedPartNumbers.includes(Number(s.partNumber)),
    )
    .sort((a, b) => Number(a.partNumber) - Number(b.partNumber));

  function refreshStations() {
    setStations(storage.getStations());
  }

  function updateStationGPS(
    partNumber: string,
    gps: { lat: number; lng: number },
  ) {
    const all = storage.getStations();
    const updated = all.map((s) =>
      s.partNumber === partNumber ? { ...s, gps } : s,
    );
    storage.setStations(updated);
    setStations(updated);
    toast.success(
      `भाग ${partNumber} चे GPS स्थान जतन झाले! (${gps.lat.toFixed(5)}, ${gps.lon.toFixed(5)})`,
    );
  }

  function handleGetCurrentLocation(partNumber: string, partNum: number) {
    if (!("geolocation" in navigator)) {
      setGpsErrorPart(partNum);
      setGpsErrorMsg("या उपकरणावर GPS उपलब्ध नाही. स्वतः टाका.");
      setGpsManualPartNum(partNum);
      return;
    }
    setLocatingPart(partNum);
    setGpsErrorPart(null);
    setGpsErrorMsg("");
    setGpsSuccessPart(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateStationGPS(partNumber, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocatingPart(null);
        setGpsSuccessPart(partNum);
        setGpsErrorPart(null);
        refreshStations();
      },
      (err) => {
        setLocatingPart(null);
        setGpsErrorPart(partNum);
        setGpsManualPartNum(partNum);
        if (err.code === 1) {
          setGpsErrorMsg(
            "GPS परवानगी नाकारली. ब्राउझरच्या सेटिंग मध्ये GPS परवानगी द्या किंवा खाली मॅन्युअली भरा.",
          );
        } else if (err.code === 3) {
          setGpsErrorMsg(
            "GPS मिळाले नाही (timeout). पुन्हा प्रयत्न करा किंवा खाली मॅन्युअली भरा.",
          );
        } else {
          setGpsErrorMsg(
            "GPS मिळाले नाही. पुन्हा प्रयत्न करा किंवा खाली मॅन्युअली भरा.",
          );
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  function handleSaveManual(partNumber: string) {
    const lat = Number.parseFloat(manualLat);
    const lng = Number.parseFloat(manualLng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error("अक्षांश आणि रेखांश योग्य प्रकारे टाका");
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error("अक्षांश (-90 ते 90) आणि रेखांश (-180 ते 180) च्या श्रेणीत असावे");
      return;
    }
    updateStationGPS(partNumber, { lat, lng });
    setGpsManualPartNum(null);
    setManualLat("");
    setManualLng("");
    refreshStations();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        data-ocid="supervisor.gps_update.dialog"
      >
        <DialogHeader>
          <DialogTitle>
            <MapPin size={16} className="inline mr-1 text-blue-600" />
            GPS स्थान अद्यावत करा — {supervisor.name}
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-md border border-blue-100 bg-blue-50/40 px-3 py-2 text-xs text-blue-700 mb-2">
          <strong>सूचना:</strong> प्रत्येक मतदान केंद्रावर प्रत्यक्ष उपस्थित राहून "सध्याचे
          स्थान घ्या" बटण दाबा, किंवा स्वतः अक्षांश-रेखांश टाका.
        </div>

        {assignedStations.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <MapPin size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">आपल्याकडे कोणतेही मतदान केंद्र नियुक्त नाहीत</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assignedStations.map((s) => {
              const partNum = Number(s.partNumber);
              const isManual = gpsManualPartNum === partNum;
              const isLocating = locatingPart === partNum;
              return (
                <div
                  key={s.id.toString()}
                  className={`rounded-lg border p-3 space-y-2 ${
                    s.gps
                      ? "border-green-200 bg-green-50/40"
                      : "border-border bg-background"
                  }`}
                  data-ocid={`supervisor.gps_update.station.${partNum}`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold">
                        भाग {s.partNumber} — {s.partName}
                      </p>
                      {s.gps ? (
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5"
                          onClick={() =>
                            window.open(
                              `https://www.google.com/maps?q=${s.gps!.lat},${s.gps!.lng}`,
                              "_blank",
                            )
                          }
                          data-ocid={`supervisor.gps_update.map_link.${partNum}`}
                        >
                          <MapPin size={11} className="text-blue-500" />
                          <span className="font-mono">
                            {s.gps.lat.toFixed(5)}, {s.gps.lon.toFixed(5)}
                          </span>
                          <span className="ml-1 not-italic">↗ Google Maps</span>
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          GPS स्थान नाही
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50"
                        disabled={isLocating}
                        onClick={() =>
                          handleGetCurrentLocation(s.partNumber, partNum)
                        }
                        data-ocid={`supervisor.gps_update.locate_button.${partNum}`}
                      >
                        <MapPin size={11} />
                        {isLocating ? (
                          <span className="flex items-center gap-1">
                            <span className="animate-spin">⏳</span> GPS शोधत
                            आहे...
                          </span>
                        ) : (
                          "📍 सध्याचे स्थान घ्या"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 text-blue-700 border-blue-300 hover:bg-blue-50"
                        onClick={() => {
                          setGpsManualPartNum(isManual ? null : partNum);
                          setManualLat(s.gps ? s.gps.lat.toString() : "");
                          setManualLng(s.gps ? s.gps.lon.toString() : "");
                        }}
                        data-ocid={`supervisor.gps_update.manual_button.${partNum}`}
                      >
                        ✏️ स्वतः टाका
                      </Button>
                    </div>
                  </div>
                  {gpsSuccessPart === partNum && (
                    <p
                      className="text-xs text-green-700 bg-green-50 rounded px-2 py-1 mt-1"
                      data-ocid={`supervisor.gps_update.success_state.${partNum}`}
                    >
                      ✅ GPS मिळाले
                    </p>
                  )}
                  {gpsErrorPart === partNum && (
                    <div
                      className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1 space-y-1"
                      data-ocid={`supervisor.gps_update.error_state.${partNum}`}
                    >
                      <p>⚠️ {gpsErrorMsg}</p>
                      {!gpsErrorMsg.includes("उपलब्ध नाही") &&
                        !gpsErrorMsg.includes("परवानगी नाकारली") && (
                          <button
                            type="button"
                            onClick={() =>
                              handleGetCurrentLocation(s.partNumber, partNum)
                            }
                            disabled={isLocating}
                            className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
                            data-ocid={`supervisor.gps_update.retry_button.${partNum}`}
                          >
                            🔄 पुन्हा प्रयत्न करा
                          </button>
                        )}
                    </div>
                  )}
                  {isManual && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <Label className="text-xs">अक्षांश (Latitude) *</Label>
                        <Input
                          className="mt-1 h-7 text-xs font-mono"
                          placeholder="उदा. 18.5204"
                          value={manualLat}
                          onChange={(e) => setManualLat(e.target.value)}
                          data-ocid={`supervisor.gps_update.lat_input.${partNum}`}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">रेखांश (Longitude) *</Label>
                        <Input
                          className="mt-1 h-7 text-xs font-mono"
                          placeholder="उदा. 73.8567"
                          value={manualLng}
                          onChange={(e) => setManualLng(e.target.value)}
                          data-ocid={`supervisor.gps_update.lng_input.${partNum}`}
                        />
                      </div>
                      <div className="col-span-2 flex gap-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleSaveManual(s.partNumber)}
                          data-ocid={`supervisor.gps_update.save_button.${partNum}`}
                        >
                          जतन करा
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setGpsManualPartNum(null)}
                        >
                          रद्द करा
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            data-ocid="supervisor.gps_update.close_button"
          >
            बंद करा
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Supervisor Card ───────────────────────────────────────────────────────────

interface SupervisorCardProps {
  supervisor: Supervisor;
  bloNames: Record<number, string>;
  onEdit: () => void;
  onDelete: () => void;
  isSupervisorMode?: boolean;
  currentSupervisor?: string | null;
}

function SupervisorCard({
  supervisor,
  bloNames,
  onEdit,
  onDelete,
  isSupervisorMode,
  currentSupervisor: _currentSupervisor,
}: SupervisorCardProps) {
  const [showAllBLOs, setShowAllBLOs] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [workReportOpen, setWorkReportOpen] = useState(false);
  const [gpsOpen, setGpsOpen] = useState(false);
  const visibleBLOs = showAllBLOs
    ? supervisor.assignedPartNumbers
    : supervisor.assignedPartNumbers.slice(0, 10);

  const assignedCount = supervisor.assignedPartNumbers.length;
  const partsList = supervisor.assignedPartNumbers
    .slice()
    .sort((a, b) => a - b)
    .join(", ");
  const whatsappMsg = (() => {
    const officer = storage.getOfficerSettings();
    const constituencyName = "२११ खडकवासला विधानसभा मतदार संघ";
    return `नमस्कार ${supervisor.name} जी,\n\nआपली ${constituencyName} मधील पर्यवेक्षक म्हणून नियुक्ती केलेली आहे.\n\nआपल्या अंतर्गत एकूण ${assignedCount} BLO नियुक्त केले आहेत.\n\nनियुक्त BLO यांचे भाग क्रमांक: ${partsList}.\n\n${officer.designation}\n${constituencyName}`;
  })();

  return (
    <>
      <Card
        className="border border-border shadow-xs hover:shadow-md transition-shadow"
        data-ocid={`supervisor.card.${supervisor.id}`}
      >
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User size={20} className="text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <p className="font-semibold text-sm leading-tight truncate">
                    {supervisor.name || (
                      <span className="text-muted-foreground italic">रिक्त</span>
                    )}
                  </p>
                  {(() => {
                    const incompleteParts = (
                      supervisor.assignedPartNumbers || []
                    ).filter(
                      (partId: number) =>
                        !bloNames[partId] ||
                        bloNames[partId] === "रिक्त" ||
                        bloNames[partId].trim() === "",
                    ).length;
                    return incompleteParts > 0 ? (
                      <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">
                        BLO माहिती अपूर्ण ({incompleteParts})
                      </span>
                    ) : null;
                  })()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {supervisor.designation}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Badge
                variant={
                  supervisor.status === "active" ? "default" : "secondary"
                }
                className="text-xs"
              >
                {supervisor.status === "active" ? "सक्रिय" : "निष्क्रिय"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {/* Contact info */}
          <div className="space-y-1.5">
            {supervisor.office && (
              <p className="text-xs text-muted-foreground flex gap-1.5">
                <span className="font-medium text-foreground">कार्यालय:</span>
                {supervisor.office}
              </p>
            )}
            {supervisor.appointmentDate && (
              <p className="text-xs text-muted-foreground flex gap-1.5">
                <span className="font-medium text-foreground">नियुक्ती:</span>
                {supervisor.appointmentDate}
              </p>
            )}
          </div>

          {/* Contact buttons */}
          <div className="flex gap-2 flex-wrap">
            {supervisor.phone && (
              <a href={`tel:${supervisor.phone}`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 px-2"
                >
                  <Phone size={11} />
                  {supervisor.phone}
                </Button>
              </a>
            )}
            {supervisor.whatsapp && (
              <a
                href={`https://wa.me/91${supervisor.whatsapp}?text=${encodeURIComponent(whatsappMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 px-2 text-green-700 border-green-300 hover:bg-green-50"
                >
                  <MessageCircle size={11} />
                  WhatsApp
                </Button>
              </a>
            )}
            {supervisor.officeEmail && (
              <a
                href={`mailto:${supervisor.officeEmail}?subject=${encodeURIComponent("211 खडकवासला - पर्यवेक्षक संदेश")}`}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 px-2 text-blue-700 border-blue-300 hover:bg-blue-50"
                >
                  <Mail size={11} />
                  Email
                </Button>
              </a>
            )}
          </div>

          {/* Assigned BLOs */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <Users size={12} className="text-primary" />
                नियुक्त BLO ({supervisor.assignedPartNumbers.length})
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {visibleBLOs.map((part) => (
                <Badge
                  key={part}
                  variant="outline"
                  className="text-xs font-mono px-1.5 py-0.5"
                >
                  भाग {part}
                  {bloNames[part] ? (
                    <span className="ml-1 text-muted-foreground font-normal">
                      · {bloNames[part].slice(0, 8)}
                      {bloNames[part].length > 8 ? "…" : ""}
                    </span>
                  ) : (
                    <span className="ml-1 text-muted-foreground font-normal italic">
                      · रिक्त
                    </span>
                  )}
                </Badge>
              ))}
              {supervisor.assignedPartNumbers.length > 10 && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setShowAllBLOs((v) => !v)}
                >
                  {showAllBLOs
                    ? "कमी दाखवा"
                    : `+${supervisor.assignedPartNumbers.length - 10} अधिक`}
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t pt-3 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 text-indigo-700 border-indigo-300 hover:bg-indigo-50"
              onClick={() => setAssignOpen(true)}
              data-ocid="supervisor.blo_assign_open.button"
            >
              <UserCheck size={12} />
              BLO बाबत
            </Button>
            {/* Work report button — visible in supervisor mode AND admin mode */}
            {(isSupervisorMode || !isSupervisorMode) && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 text-teal-700 border-teal-300 hover:bg-teal-50"
                onClick={() => setWorkReportOpen(true)}
                data-ocid="supervisor.work_report_open.button"
              >
                📋 कामाचा अहवाल
              </Button>
            )}
            {/* GPS update — visible in supervisor mode only */}
            {isSupervisorMode && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 text-blue-700 border-blue-300 hover:bg-blue-50"
                onClick={() => setGpsOpen(true)}
                data-ocid="supervisor.gps_open.button"
              >
                <MapPin size={12} />
                GPS स्थान अद्यावत करा
              </Button>
            )}
            {!isSupervisorMode && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 text-blue-600 hover:text-blue-700"
                  onClick={onEdit}
                  data-ocid={`supervisor.edit_button.${supervisor.id}`}
                >
                  <Pencil size={12} />
                  संपादित करा
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                  onClick={onDelete}
                  data-ocid={`supervisor.delete_button.${supervisor.id}`}
                >
                  <Trash2 size={12} />
                  काढा
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* BLO Assign Dialog */}
      {assignOpen && (
        <BLOAssignDialog
          supervisor={supervisor}
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
        />
      )}

      {/* Work Report Dialog */}
      {workReportOpen && (
        <BLOWorkReportDialog
          supervisor={supervisor}
          open={workReportOpen}
          onClose={() => setWorkReportOpen(false)}
        />
      )}

      {/* GPS Update Dialog */}
      {gpsOpen && (
        <GPSUpdateDialog
          supervisor={supervisor}
          open={gpsOpen}
          onClose={() => setGpsOpen(false)}
        />
      )}
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function SupervisorList({
  currentSupervisor,
  setCurrentSupervisor: _setCurrentSupervisor,
  isAdminLoggedIn,
}: {
  currentSupervisor?: string | null;
  setCurrentSupervisor?: (id: string | null) => void;
  isAdminLoggedIn?: boolean;
} = {}) {
  const [supervisors, setSupervisors] = useState<Supervisor[]>(() =>
    storage.getSupervisors(),
  );
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Supervisor | null>(null);
  const [globalChangeLogOpen, setGlobalChangeLogOpen] = useState(false);
  const [loginHistoryOpen, setLoginHistoryOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Supervisor | null>(null);
  const [unassignedOpen, setUnassignedOpen] = useState(false);
  const [allAssignedBLOsOpen, setAllAssignedBLOsOpen] = useState(false);
  const [showActiveListOpen, setShowActiveListOpen] = useState(false);
  const [partSearch, setPartSearch] = useState("");
  const [partSearchResult, setPartSearchResult] = useState<{
    partNumber: number;
    partName: string | null;
    bloName: string | null;
    bloDesignation: string | null;
    supervisor: Supervisor | null;
  } | null>(null);
  const [viewingOtherSupervisorBLOs, setViewingOtherSupervisorBLOs] = useState<{
    name: string;
    blos: any[];
  } | null>(null);

  useEffect(() => {}, []);

  function handlePartSearch(val: string) {
    setPartSearch(val);
    const num = Number.parseInt(val.trim());
    if (!num || num < 1) {
      setPartSearchResult(null);
      return;
    }
    const blos = storage.getBLOs();
    const blo = blos.find((b) => Number(b.pollingStationId) === num);
    const supervisor =
      supervisors.find((s) => s.assignedPartNumbers.includes(num)) ?? null;
    setPartSearchResult({
      partNumber: num,
      partName:
        storage
          .getStations()
          .find((s) => s.partNumber === num.toString() || Number(s.id) === num)
          ?.partName ?? null,
      bloName: blo?.name ?? null,
      bloDesignation: blo?.designation ?? null,
      supervisor,
    });
  }

  function reload() {
    setSupervisors(storage.getSupervisors());
  }

  // Build a map of partNumber -> BLO name for quick lookup
  const bloNames: Record<number, string> = {};
  for (const blo of storage.getBLOs()) {
    if (blo.name?.trim()) {
      bloNames[Number(blo.pollingStationId)] = blo.name;
    }
  }

  // Compute unassigned parts — based on current constituency's imported stations
  const currentStations = storage.getStations();
  const currentStationNumbers = currentStations.map((s) =>
    Number(s.partNumber),
  );
  const assignedPartsSet = new Set<number>();
  for (const sv of supervisors) {
    for (const p of sv.assignedPartNumbers) {
      assignedPartsSet.add(p);
    }
  }
  const unassignedParts = currentStationNumbers.filter(
    (p) => !assignedPartsSet.has(p),
  );

  const isSupervisorMode = !!currentSupervisor && !isAdminLoggedIn;
  // In supervisor mode, show ALL supervisors read-only — supervisors can see each other's BLOs
  const filtered = supervisors;

  function handleDelete() {
    if (!deleteTarget) return;
    const updated = supervisors.filter((s) => s.id !== deleteTarget.id);
    storage.setSupervisors(updated);

    setSupervisors(updated);
    toast.success(`${deleteTarget.name} यांना यादीतून काढले`);
    setDeleteTarget(null);
  }

  const totalBLOs = supervisors.reduce(
    (acc, s) => acc + s.assignedPartNumbers.length,
    0,
  );

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold">पर्यवेक्षक यादी</h2>
          <p className="text-sm text-muted-foreground">
            एकूण {supervisors.length} पर्यवेक्षक · {totalBLOs} BLO अंतर्गत
          </p>
        </div>
        {!isSupervisorMode && (
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="gap-2 border-amber-300 text-amber-800 hover:bg-amber-50"
              onClick={() => setGlobalChangeLogOpen(true)}
              data-ocid="supervisor.change_log.button"
            >
              📋 बदल नोंदी
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 border-blue-300 text-blue-800 hover:bg-blue-50"
              onClick={() => setLoginHistoryOpen(true)}
              data-ocid="supervisor.login_history.button"
            >
              🕐 लॉगिन इतिहास
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => printSupervisorList(filtered)}
              disabled={filtered.length === 0}
              data-ocid="supervisor.print_list.button"
            >
              <Printer size={14} />
              यादी छापा
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => exportSupervisors(filtered)}
              disabled={filtered.length === 0}
              data-ocid="supervisor.export_button"
            >
              <Download size={14} />
              Excel Export ({filtered.length})
            </Button>
            {isAdminLoggedIn && (
              <Button
                size="sm"
                className="gap-2"
                onClick={() => setAddOpen(true)}
                data-ocid="supervisor.add_button"
              >
                <Plus size={14} />
                नवीन पर्यवेक्षक
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Supervisor list panel */}
      <div className="border border-blue-200 rounded-lg bg-blue-50 p-3">
        <p className="text-xs font-semibold text-blue-800 mb-2">
          पर्यवेक्षक यादी — क्लिक करून कार्ड उघडा
        </p>
        <div className="flex flex-wrap gap-2">
          {supervisors.map((sv, idx) => (
            <button
              key={sv.id}
              type="button"
              className="text-left px-3 py-1.5 rounded-md border border-blue-300 bg-white hover:bg-blue-100 transition-colors text-xs"
              onClick={() => {
                if (
                  isSupervisorMode &&
                  currentSupervisor &&
                  sv.id !== currentSupervisor
                ) {
                  // In supervisor mode: clicking another supervisor shows their BLO list read-only
                  const allBLOs = storage.getBLOs();
                  const theirBLOs = allBLOs.filter((b: any) =>
                    sv.assignedPartNumbers.includes(Number(b.pollingStationId)),
                  );
                  setViewingOtherSupervisorBLOs({
                    name: sv.name,
                    blos: theirBLOs,
                  });
                  return;
                }
                const el = document.querySelector(
                  `[data-ocid="supervisor.card.${sv.id}"]`,
                );
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  (el as HTMLElement).style.outline = "3px solid #3b82f6";
                  (el as HTMLElement).style.outlineOffset = "2px";
                  setTimeout(() => {
                    (el as HTMLElement).style.outline = "";
                    (el as HTMLElement).style.outlineOffset = "";
                  }, 2000);
                }
              }}
              data-ocid={`supervisor.list.item.${idx + 1}`}
            >
              <span className="font-medium text-blue-900">
                {idx + 1}. {sv.name || "रिक्त"}
              </span>
              <span className="text-blue-600 ml-1">
                {sv.assignedPartNumbers.length > 0 ? (
                  <>
                    {sv.assignedPartNumbers
                      .slice()
                      .sort((a: number, b: number) => a - b)
                      .slice(0, 6)
                      .join(", ")}
                    {sv.assignedPartNumbers.length > 6 ? "..." : ""} (एकूण:{" "}
                    {sv.assignedPartNumbers.length} केंद्रे)
                  </>
                ) : (
                  "(केंद्र नाही)"
                )}
              </span>
            </button>
          ))}
          {supervisors.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              अद्याप पर्यवेक्षक जोडले नाहीत
            </p>
          )}
        </div>
      </div>

      {/* Search area */}
      <div className="flex flex-wrap gap-3">
        {/* Part number search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="यादिभाग क्र. टाका..."
              className="pl-8 h-8 text-sm w-44"
              type="number"
              min={1}
              value={partSearch}
              onChange={(e) => handlePartSearch(e.target.value)}
              data-ocid="supervisor.part_search_input"
            />
          </div>
          {partSearch && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              onClick={() => {
                setPartSearch("");
                setPartSearchResult(null);
              }}
            >
              ✕
            </Button>
          )}
        </div>
      </div>

      {/* Part search result */}
      {partSearchResult && (
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-semibold text-blue-900">
            भाग क्र. {partSearchResult.partNumber} — शोध निकाल
          </p>
          {partSearchResult.partName && (
            <p className="text-xs text-blue-700">{partSearchResult.partName}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-md border border-blue-100 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                BLO
              </p>
              {partSearchResult.bloName ? (
                <>
                  <p className="text-sm font-semibold">
                    {partSearchResult.bloName}
                  </p>
                  {partSearchResult.bloDesignation && (
                    <p className="text-xs text-muted-foreground">
                      {partSearchResult.bloDesignation}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  BLO नियुक्त नाही (रिक्त)
                </p>
              )}
            </div>
            <div className="bg-white rounded-md border border-blue-100 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                पर्यवेक्षक
              </p>
              {partSearchResult.supervisor ? (
                <>
                  <p className="text-sm font-semibold">
                    {partSearchResult.supervisor.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {partSearchResult.supervisor.designation}
                  </p>
                  <button
                    type="button"
                    className="text-xs text-blue-600 underline mt-1"
                    onClick={() => {
                      const el = document.querySelector(
                        `[data-ocid="supervisor.card.${partSearchResult.supervisor!.id}"]`,
                      );
                      if (el) {
                        el.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                        (el as HTMLElement).style.outline = "3px solid #3b82f6";
                        (el as HTMLElement).style.outlineOffset = "2px";
                        setTimeout(() => {
                          (el as HTMLElement).style.outline = "";
                          (el as HTMLElement).style.outlineOffset = "";
                        }, 2000);
                      }
                    }}
                  >
                    पर्यवेक्षक कार्ड उघडा →
                  </button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  पर्यवेक्षक नियुक्त नाही
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card
          className="border bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => setShowActiveListOpen(true)}
          data-ocid="supervisor.active_count.card"
        >
          <CardContent className="p-3">
            <p className="text-2xl font-bold text-blue-700">
              {supervisors.filter((s) => s.status === "active").length}
            </p>
            <p className="text-xs text-blue-700 font-medium">सक्रिय पर्यवेक्षक</p>
            <p className="text-[10px] text-blue-600 mt-0.5">(क्लिक करा)</p>
          </CardContent>
        </Card>
        <Card
          className="border bg-green-50 border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
          onClick={() => setAllAssignedBLOsOpen(true)}
        >
          <CardContent className="p-3">
            <p className="text-2xl font-bold text-green-700">{totalBLOs}</p>
            <p className="text-xs text-green-700 font-medium">एकूण नियुक्त BLO</p>
            <p className="text-[10px] text-green-600 mt-0.5">(क्लिक करा)</p>
          </CardContent>
        </Card>
        <Card className="border bg-purple-50 border-purple-200">
          <CardContent className="p-3">
            <p className="text-2xl font-bold text-purple-700">
              {supervisors.length > 0
                ? Math.round(totalBLOs / supervisors.length)
                : 0}
            </p>
            <p className="text-xs text-purple-700 font-medium">
              सरासरी BLO / पर्यवेक्षक
            </p>
          </CardContent>
        </Card>
        {/* Clickable amber card — unassigned parts */}
        <Card
          className="border bg-amber-50 border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
          onClick={() => setUnassignedOpen(true)}
          data-ocid="supervisor.unassigned_parts.card"
        >
          <CardContent className="p-3">
            <p className="text-2xl font-bold text-amber-700">
              {unassignedParts.length}
            </p>
            <p className="text-xs text-amber-700 font-medium">
              पर्यवेक्षक नसलेले भाग
            </p>
            <p className="text-[10px] text-amber-600 mt-0.5">
              ({currentStationNumbers.length} पैकी · क्लिक करा)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Honorarium approval section — only visible in supervisor mode */}
      {isSupervisorMode &&
        currentSupervisor &&
        (() => {
          const sup = supervisors.find((s) => s.id === currentSupervisor);
          return sup ? (
            <SupervisorHonorariumApproval
              supervisorId={currentSupervisor}
              supervisorName={sup.name}
            />
          ) : null;
        })()}

      {/* Supervisor cards grid */}
      {filtered.length === 0 ? (
        <div
          className="text-center py-16 text-muted-foreground"
          data-ocid="supervisor.empty_state"
        >
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">"अद्याप कोणताही पर्यवेक्षक जोडला नाही"</p>
          <Button
            size="sm"
            className="mt-4 gap-2"
            onClick={() => setAddOpen(true)}
          >
            <Plus size={14} />
            पहिला पर्यवेक्षक जोडा
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((sv) => (
            <SupervisorCard
              key={sv.id}
              supervisor={sv}
              bloNames={bloNames}
              onEdit={() => setEditTarget(sv)}
              onDelete={() => setDeleteTarget(sv)}
              isSupervisorMode={isSupervisorMode}
              currentSupervisor={currentSupervisor}
            />
          ))}
        </div>
      )}

      {/* Good Performer section moved to dedicated page via sidebar nav */}

      {/* Add dialog */}
      <SupervisorFormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={reload}
      />

      {/* Edit dialog */}
      {editTarget && (
        <SupervisorFormDialog
          supervisor={editTarget}
          open={true}
          onClose={() => setEditTarget(null)}
          onSave={reload}
        />
      )}

      {/* Active supervisors list dialog */}
      <Dialog open={showActiveListOpen} onOpenChange={setShowActiveListOpen}>
        <DialogContent
          className="max-w-lg max-h-[80vh] overflow-y-auto"
          data-ocid="supervisor.active_list.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              सक्रिय पर्यवेक्षक यादी (
              {supervisors.filter((s) => s.status === "active").length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {supervisors
              .filter((s) => s.status === "active")
              .map((sv, idx) => (
                <button
                  type="button"
                  key={sv.id}
                  className="w-full text-left p-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-between gap-2"
                  onClick={() => {
                    setShowActiveListOpen(false);
                    setTimeout(() => {
                      const el = document.querySelector(
                        `[data-ocid="supervisor.card.${sv.id}"]`,
                      );
                      if (el) {
                        el.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                        (el as HTMLElement).style.outline = "3px solid #3b82f6";
                        (el as HTMLElement).style.outlineOffset = "2px";
                        setTimeout(() => {
                          (el as HTMLElement).style.outline = "";
                          (el as HTMLElement).style.outlineOffset = "";
                        }, 2000);
                      }
                    }, 200);
                  }}
                  data-ocid={`supervisor.active_list.item.${idx + 1}`}
                >
                  <div>
                    <p className="font-semibold text-sm text-blue-900">
                      {idx + 1}. {sv.name || "रिक्त"}
                    </p>
                    <p className="text-xs text-blue-700">
                      {sv.designation} · {sv.office}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      भाग:{" "}
                      {sv.assignedPartNumbers
                        .slice()
                        .sort((a: number, b: number) => a - b)
                        .slice(0, 6)
                        .join(", ")}
                      {sv.assignedPartNumbers.length > 6 ? "..." : ""} (एकूण:{" "}
                      {sv.assignedPartNumbers.length} केंद्रे)
                    </p>
                  </div>
                  <span className="text-blue-500 text-xs font-medium shrink-0">
                    कार्ड उघडा →
                  </span>
                </button>
              ))}
            {supervisors.filter((s) => s.status === "active").length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                सध्या कोणताही सक्रिय पर्यवेक्षक नाही
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* All Assigned BLOs dialog */}
      <Dialog open={allAssignedBLOsOpen} onOpenChange={setAllAssignedBLOsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>एकूण नियुक्त BLO यादी ({totalBLOs})</DialogTitle>
            <DialogDescription>
              सर्व पर्यवेक्षकांच्या अंतर्गत नियुक्त BLO यादी
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {supervisors.map((sup) => {
              if (sup.assignedPartNumbers.length === 0) return null;
              return (
                <div key={sup.id} className="border rounded-lg p-3 bg-blue-50">
                  <p className="text-sm font-semibold text-blue-900 mb-2">
                    पर्यवेक्षक: {sup.name} — {sup.designation} — भाग:{" "}
                    {sup.assignedPartNumbers
                      .slice()
                      .sort((a: number, b: number) => a - b)
                      .slice(0, 8)
                      .join(", ")}
                    {sup.assignedPartNumbers.length > 8 ? "..." : ""} (एकूण:{" "}
                    {sup.assignedPartNumbers.length} केंद्रे)
                  </p>
                  <div className="space-y-1">
                    {sup.assignedPartNumbers.map((partNum) => {
                      const blo = storage
                        .getBLOs()
                        .find((b) => Number(b.pollingStationId) === partNum);
                      const station = storage
                        .getStations()
                        .find(
                          (s) =>
                            Number(s.partNumber) === partNum ||
                            Number(s.id) === partNum,
                        );
                      return (
                        <div
                          key={partNum}
                          className="flex items-center gap-2 text-xs bg-white rounded px-2 py-1 border border-blue-100"
                        >
                          <span className="font-semibold text-blue-800 w-8 shrink-0">
                            भाग {partNum}
                          </span>
                          <span className="text-muted-foreground shrink-0">
                            {station?.partName ?? ""}
                          </span>
                          <span className="ml-auto font-medium">
                            {blo?.name?.trim() ? blo.name : "रिक्त"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Unassigned parts dialog */}
      <UnassignedPartsDialog
        open={unassignedOpen}
        onClose={() => setUnassignedOpen(false)}
        unassignedParts={unassignedParts}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent data-ocid="supervisor.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>पर्यवेक्षक काढायचे का?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} यांना पर्यवेक्षक यादीतून काढले जाईल. हे परत आणता
              येणार नाही.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>रद्द करा</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              काढा
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Global BLO Change Log Dialog */}
      <Dialog open={globalChangeLogOpen} onOpenChange={setGlobalChangeLogOpen}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          data-ocid="supervisor.change_log.dialog"
        >
          <DialogHeader>
            <DialogTitle>📋 BLO बदल नोंदी — सर्व पर्यवेक्षक</DialogTitle>
          </DialogHeader>
          {(() => {
            const records = storage.getBLOChangeLog();
            if (records.length === 0) {
              return (
                <p
                  className="text-sm text-muted-foreground italic py-4 text-center"
                  data-ocid="supervisor.change_log.empty_state"
                >
                  अद्याप कोणतेही बदल नोंदवले नाहीत
                </p>
              );
            }
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-amber-100">
                      <th className="border border-amber-200 px-2 py-1.5 text-left">
                        दिनांक
                      </th>
                      <th className="border border-amber-200 px-2 py-1.5 text-left">
                        भाग क्र.
                      </th>
                      <th className="border border-amber-200 px-2 py-1.5 text-left">
                        पर्यवेक्षक
                      </th>
                      <th className="border border-amber-200 px-2 py-1.5 text-left">
                        प्रकार
                      </th>
                      <th className="border border-amber-200 px-2 py-1.5 text-left">
                        तपशील
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r: BLOChangeRecord) => {
                      const dt = new Date(r.changedAt);
                      const dateStr = `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
                      let detail = "";
                      if (r.type === "replace") {
                        detail = `जुने BLO: ${r.oldBLOName ?? "—"} → नवीन नियुक्ती`;
                      } else if (r.type === "edit" && r.oldData && r.newData) {
                        const changes: string[] = [];
                        if (r.oldData.name !== r.newData.name)
                          changes.push(
                            `नाव: ${r.oldData.name} → ${r.newData.name}`,
                          );
                        if (r.oldData.designation !== r.newData.designation)
                          changes.push(
                            `पद: ${r.oldData.designation} → ${r.newData.designation}`,
                          );
                        if (r.oldData.office !== r.newData.office)
                          changes.push(
                            `कार्यालय: ${r.oldData.office} → ${r.newData.office}`,
                          );
                        if (r.oldData.phone !== r.newData.phone)
                          changes.push(
                            `मोबाईल: ${r.oldData.phone} → ${r.newData.phone}`,
                          );
                        if (r.oldData.epicNumber !== r.newData.epicNumber)
                          changes.push(
                            `EPIC: ${r.oldData.epicNumber} → ${r.newData.epicNumber}`,
                          );
                        if (
                          r.oldData.appointmentDate !==
                          r.newData.appointmentDate
                        )
                          changes.push(
                            `दिनांक: ${r.oldData.appointmentDate} → ${r.newData.appointmentDate}`,
                          );
                        detail =
                          changes.length > 0 ? changes.join("; ") : "बदल नाही";
                      }
                      return (
                        <tr key={r.id} className="hover:bg-amber-50">
                          <td className="border border-amber-200 px-2 py-1 whitespace-nowrap">
                            {dateStr}
                          </td>
                          <td className="border border-amber-200 px-2 py-1">
                            {r.partNumber}
                          </td>
                          <td className="border border-amber-200 px-2 py-1">
                            {r.supervisorName}
                          </td>
                          <td className="border border-amber-200 px-2 py-1">
                            <span
                              className={
                                r.type === "replace"
                                  ? "text-red-700 font-medium"
                                  : "text-blue-700 font-medium"
                              }
                            >
                              {r.type === "replace" ? "BLO बदल" : "माहिती बदल"}
                            </span>
                          </td>
                          <td className="border border-amber-200 px-2 py-1 text-gray-700">
                            {detail}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
      {/* Supervisor Login History Dialog */}
      <Dialog open={loginHistoryOpen} onOpenChange={setLoginHistoryOpen}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          data-ocid="supervisor.login_history.dialog"
        >
          <DialogHeader>
            <DialogTitle>🕐 पर्यवेक्षक लॉगिन इतिहास</DialogTitle>
          </DialogHeader>
          {(() => {
            const history = storage.getSupervisorLoginHistory();
            if (history.length === 0) {
              return (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  अद्याप कोणताही लॉगिन नाही
                </p>
              );
            }
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-blue-50">
                      <th className="border border-blue-200 px-2 py-1.5 text-left">
                        क्र.
                      </th>
                      <th className="border border-blue-200 px-2 py-1.5 text-left">
                        पर्यवेक्षक नाव
                      </th>
                      <th className="border border-blue-200 px-2 py-1.5 text-left">
                        लॉगिन वेळ
                      </th>
                      <th className="border border-blue-200 px-2 py-1.5 text-left">
                        लॉगआउट वेळ
                      </th>
                      <th className="border border-blue-200 px-2 py-1.5 text-left">
                        स्थिती
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry, idx) => (
                      <tr
                        key={entry.id}
                        className={idx % 2 === 0 ? "bg-white" : "bg-blue-50/30"}
                      >
                        <td className="border border-blue-100 px-2 py-1">
                          {idx + 1}
                        </td>
                        <td className="border border-blue-100 px-2 py-1 font-medium">
                          {entry.supervisorName}
                        </td>
                        <td className="border border-blue-100 px-2 py-1">
                          {new Date(entry.loginTime).toLocaleString("mr-IN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="border border-blue-100 px-2 py-1">
                          {entry.logoutTime
                            ? new Date(entry.logoutTime).toLocaleString(
                                "mr-IN",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : "-"}
                        </td>
                        <td className="border border-blue-100 px-2 py-1">
                          {entry.logoutTime ? (
                            <span className="text-gray-500">लॉगआउट</span>
                          ) : (
                            <span className="text-green-600 font-medium">
                              ● सक्रिय
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Other Supervisor BLO list modal (supervisor mode only) */}
      {viewingOtherSupervisorBLOs && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setViewingOtherSupervisorBLOs(null)}
          onKeyDown={(e) =>
            e.key === "Escape" && setViewingOtherSupervisorBLOs(null)
          }
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "700px",
              width: "95%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  fontWeight: "bold",
                  fontSize: "16px",
                  color: "#1e40af",
                }}
              >
                📋 {viewingOtherSupervisorBLOs.name} यांची BLO यादी
              </h3>
              <button
                type="button"
                onClick={() => setViewingOtherSupervisorBLOs(null)}
                style={{
                  padding: "4px 12px",
                  backgroundColor: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
                data-ocid="supervisor.other_blo_list.close_button"
              >
                बंद करा
              </button>
            </div>
            {viewingOtherSupervisorBLOs.blos.length === 0 ? (
              <p
                style={{
                  color: "#6b7280",
                  fontSize: "13px",
                  textAlign: "center",
                  padding: "24px 0",
                }}
              >
                या पर्यवेक्षकाकडे सध्या कोणतेही BLO नाहीत.
              </p>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#dbeafe" }}>
                    <th
                      style={{
                        border: "1px solid #bfdbfe",
                        padding: "6px 8px",
                        textAlign: "left",
                      }}
                    >
                      भाग क्र.
                    </th>
                    <th
                      style={{
                        border: "1px solid #bfdbfe",
                        padding: "6px 8px",
                        textAlign: "left",
                      }}
                    >
                      BLO नाव
                    </th>
                    <th
                      style={{
                        border: "1px solid #bfdbfe",
                        padding: "6px 8px",
                        textAlign: "left",
                      }}
                    >
                      पद
                    </th>
                    <th
                      style={{
                        border: "1px solid #bfdbfe",
                        padding: "6px 8px",
                        textAlign: "left",
                      }}
                    >
                      कार्यालय
                    </th>
                    <th
                      style={{
                        border: "1px solid #bfdbfe",
                        padding: "6px 8px",
                        textAlign: "left",
                      }}
                    >
                      स्थिती
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {viewingOtherSupervisorBLOs.blos
                    .slice()
                    .sort(
                      (a: any, b: any) =>
                        Number(a.pollingStationId) - Number(b.pollingStationId),
                    )
                    .map((blo: any, i: number) => (
                      <tr
                        key={blo.id || i}
                        style={{
                          backgroundColor: i % 2 === 0 ? "white" : "#f8fafc",
                        }}
                      >
                        <td
                          style={{
                            border: "1px solid #e2e8f0",
                            padding: "5px 8px",
                          }}
                        >
                          {blo.pollingStationId}
                        </td>
                        <td
                          style={{
                            border: "1px solid #e2e8f0",
                            padding: "5px 8px",
                          }}
                        >
                          {blo.name || "—"}
                        </td>
                        <td
                          style={{
                            border: "1px solid #e2e8f0",
                            padding: "5px 8px",
                          }}
                        >
                          {blo.designation || "—"}
                        </td>
                        <td
                          style={{
                            border: "1px solid #e2e8f0",
                            padding: "5px 8px",
                          }}
                        >
                          {blo.office || "—"}
                        </td>
                        <td
                          style={{
                            border: "1px solid #e2e8f0",
                            padding: "5px 8px",
                          }}
                        >
                          {(blo as any).isActive === false ? (
                            <span
                              style={{ color: "#dc2626", fontWeight: "bold" }}
                            >
                              निष्क्रिय
                            </span>
                          ) : (
                            <span style={{ color: "#16a34a" }}>सक्रिय</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Supervisor Order Print Template ──────────────────────────────────────────

function SupervisorOrderPrintTemplate({ order }: { order: AppointmentOrder }) {
  const marathiDate = new Date().toLocaleDateString("mr-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const officerSettings = storage.getOfficerSettings();

  const tableCellStyle: React.CSSProperties = {
    border: "1px solid #000",
    padding: "6px 8px",
    textAlign: "left",
    verticalAlign: "top",
  };

  // Split designation at "तथा" for multi-line signature
  const desig = officerSettings.designation || "मतदार नोंदणी अधिकारी";
  const tathaIdx = desig.indexOf("तथा");
  const desigLine1 =
    tathaIdx > 0 ? `${desig.slice(0, tathaIdx).trim()},` : `${desig},`;
  const desigLine2 = tathaIdx > 0 ? `${desig.slice(tathaIdx).trim()},` : "";

  // Station name lookup — use order.pollingStationName (constituency-agnostic)
  const partNum = order.pollingStationId.toString();
  const partName = order.pollingStationName ?? "";

  function OrderPageContent({ copyLabel }: { copyLabel: string }) {
    return (
      <div
        style={{
          fontFamily: "'Noto Sans Devanagari', Arial, sans-serif",
          padding: "30px 40px",
          color: "#000",
          maxWidth: "780px",
          margin: "0 auto",
          fontSize: "12pt",
          lineHeight: "1.6",
        }}
      >
        <div style={{ textAlign: "right", marginBottom: "4px" }}>
          <span
            style={{
              fontSize: "10pt",
              border: "1px solid #555",
              padding: "2px 8px",
              borderRadius: "4px",
            }}
          >
            {copyLabel}
          </span>
        </div>

        {/* === HEADER from PDF page 1 === */}
        <div style={{ textAlign: "center", marginBottom: "2px" }}>
          <p style={{ fontWeight: "bold", fontSize: "13pt", margin: "0" }}>
            मतदार नोंदणी अधिकारी, २११ खडकवासला विधानसभा मतदार संघ तथा उपविभागीय
            अधिकारी हवेली (पुणे)
          </p>
          <p style={{ fontSize: "11pt", margin: "4px 0" }}>
            यांचे कार्यालय शुक्रवार पेठ खडकमाळ आळी., ता. हवेली, जि. पुणे
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "10pt",
              margin: "4px 0",
            }}
          >
            <span>संपर्क क्रमांक ०२०२४४७२३४८</span>
            <span>ई- मेल- २११ khadakwaslaac@gmail.com</span>
          </div>
        </div>
        <hr style={{ borderTop: "2px solid #000", margin: "6px 0 10px" }} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
            gap: "60px",
          }}
        >
          <span
            style={{
              fontWeight: "bold",
              fontSize: "11pt",
              paddingRight: "40px",
            }}
          >
            आदेश क्र. {order.orderNumber}
          </span>
          <span style={{ fontSize: "11pt", paddingLeft: "40px" }}>
            दिनांक: <strong>{order.orderDate || marathiDate}</strong>
          </span>
        </div>

        {/* === संदर्भ section per PDF pages 2-3 === */}
        <div style={{ marginBottom: "14px" }}>
          <p style={{ fontWeight: "bold", marginBottom: "6px" }}>संदर्भ:</p>
          <p style={{ margin: "0 0 4px 0" }}>
            १) लोकप्रतिनिधित्व अधिनियम- १९५० चे कलम १३ब
          </p>
          <p style={{ margin: "0 0 4px 0" }}>
            २) भारत निवडणूक आयोगाचे पत्र क्र.२३/बीएलओ/२०२२-ईआरएस दि. ०४ ऑक्टोबर, २०२२
          </p>
          <p style={{ margin: "0 0 4px 0" }}>
            ३) भारत निवडणूक आयोगाचे पत्र क्र.२३/बीएलओ/२०२५-ईआरएस दि. ०५ जून, २०२५.
          </p>
          <p style={{ margin: "0 0 4px 0" }}>
            ४) मा मुख्य निवडणूक अधिकारी, महाराष्ट्र राज्य यांचे पत्र क्र.
            ईएलआर-२०२५/प्र.क्र.४०/(नि-६), दि. ०६ जून, २०२५.
          </p>
        </div>

        <p
          style={{ fontWeight: "bold", fontSize: "13pt", marginBottom: "10px" }}
        >
          आदेश
        </p>
        <p style={{ textAlign: "justify", marginBottom: "12px" }}>
          ज्या अर्थी लोकप्रतिनिधित्व अधिनियम, १९५० च्या कलम १३ ब(१) नुसार विधानसभा
          मतदारसंघाच्या मतदार नोंदणी अधिकारी यांच्याकडे मतदारयाद्या तयार करणे तसेच त्यांचे
          पुनरिक्षण करणे याबाबतची जबाबदारी सोपविण्यात आलेली आहे तसेच त्याच अधिनियमातील
          कलम १३ ब(२) नुसार उपरोक्त कर्तव्य पार पाडण्याकरिता मतदार नोंदणी अधिकारी,
          निश्चित केलेल्या निर्बंधाच्या अधिन राहून त्यांना योग्य वाटेल इतक्या व्यक्तींची नियुक्ती
          करु शकतो;
        </p>
        <p style={{ textAlign: "justify", marginBottom: "12px" }}>
          ज्या अर्थी भारत निवडणूक आयोगाच्या संदर्भीय पत्रान्वये मतदान केंद्रस्तरीय अधिकारी
          (Booth Level Officer) ची नियुक्ती करण्याबाबत निर्देश देण्यात आलेले आहेत;
        </p>
        <p style={{ textAlign: "justify", marginBottom: "16px" }}>
          त्या अर्थी मी मतदार नोंदणी अधिकारी, खडकवासला विधानसभा मतदार संघ, मला प्राप्त
          अधिकारात, लोकप्रतिनिधित्व अधिनियम-१९५० चे कलम १३ब (२) अन्वये, खाली नमूद
          कर्मचाऱ्यास खालील अटींच्या अधिन राहून, त्यांच्या नावासमोर दर्शविलेल्या मतदान
          केंद्राकरिता मतदान केंद्रस्तरीय अधिकारी म्हणून नियुक्त करत आहे.
        </p>

        {/* === TABLE: 4 columns including part number and station name === */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "20px",
            fontSize: "11pt",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0" }}>
              <th style={tableCellStyle}>कर्मचाऱ्यांचे नाव आणि पदनाम</th>
              <th style={tableCellStyle}>
                कर्मचारी कार्यरत असलेल्या कार्यालयाचे नाव व पत्ता
              </th>
              <th style={tableCellStyle}>नियुक्त केलेला यादिभाग क्रमांक</th>
              <th style={tableCellStyle}>नियुक्त केलेल्या यादिभागाचे नाव</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tableCellStyle}>
                {order.bloName}
                {order.designation ? `, ${order.designation}` : ""}
              </td>
              <td style={tableCellStyle}>{order.office}</td>
              <td style={tableCellStyle}>{partNum}</td>
              <td style={tableCellStyle}>{partName}</td>
            </tr>
          </tbody>
        </table>

        {/* === अटी section per PDF pages 2-3 === */}
        <div style={{ marginBottom: "12px" }}>
          <p style={{ fontWeight: "bold", marginBottom: "6px" }}>अटी–</p>
          <p style={{ textAlign: "justify", marginBottom: "8px" }}>
            १. या आदेशान्वये नियुक्ती करण्यात आलेल्या कर्मचाऱ्यांने तातडीने मतदान केंद्रस्तरीय
            अधिकारी पदाची अतिरिक्त जबाबदारी स्विकारणे बंधनकारक आहे.
          </p>
          <p style={{ textAlign: "justify", marginBottom: "8px" }}>
            २. संबंधित कर्मचाऱ्याने आपल्या नियमीत पदाचे कर्तव्य सांभाळून मतदान केंद्रस्तरीय
            अधिकारी या पदाची कर्तव्ये पार पाडावयाची आहेत.
          </p>
          <p style={{ textAlign: "justify", marginBottom: "8px" }}>
            ३. संबंधित कर्मचारी शिक्षक संवर्गातील असल्यास, मा. सर्वोच्च न्यायालयाने अपिल
            (सिव्हिल) ५६५९/२००७ (भारत निवडणूक आयोग वि. सेंट मेरी स्कुल व ईतर) या
            प्रकरणात दिलेल्या न्यायनिर्णयाच्या अधिन सदर नियुक्ती असेल. त्यानुसार, शिक्षकांना
            रजेच्या दिवशी अशैक्षणिक दिवशी मतदार यादींच्या पुनिरिक्षणाचे तसेच निवडणूकीचे काम
            देण्यात यावे तसेच शिक्षकांना सामान्यतः शैक्षणिक दिवशी व शैक्षणिक तासांमध्ये उपरोक्त
            काम देऊ नये, असे मा. सर्वोच्च न्यायालयाचे निर्देश आहेत.
          </p>
          <p style={{ textAlign: "justify", marginBottom: "8px" }}>
            ४. बालकांचा मोफत व सक्तीच्या शिक्षणावरील अधिकार अधिनियम, २००९ मधील कलम
            २७ नुसार शिक्षकांना निवडणूकविषयक कामकाजाठी नियुक्त करण्यास कोणताही प्रतिबंध
            नाही. मतदारयाद्या तयार करणे व त्याचे पुनिरिक्षण करणे हा निवडणूक विषयक
            कामकाजाचा अविभाज्य भाग आहे. याअनुषंगाने मा. अलाहाबाद उच्च न्यायालयाने Writ A
            No.४५०५/२०२४ (Dhruvika Pandey vs Additional Chief Secretary &amp;
            others) व मा.राजस्थान उच्च न्यायालयाच्या जोधपूर खंडपीठाने सिव्हील रिट याचिका
            क्र.१७९४५/२०२१ (श्री. महेश स्वामी विरुध्द राजस्थान) मध्ये स्पष्ट अभिप्राय
            नोंदविलेले आहेत.
          </p>
          <p style={{ textAlign: "justify", marginBottom: "8px" }}>
            ५. सबब, सर्व मतदान केंद्रस्तरीय अधिकारी यांनी त्यांना नेमून दिलेले काम विहित
            कालावधीत पूर्ण करावयाचे आहे.
          </p>
        </div>

        <p style={{ textAlign: "justify", marginBottom: "20px" }}>
          सदर आदेशाची अंमलबजावणी न झाल्यास किंवा संबंधितांनी हलगर्जीपणा अगर टाळाटाळ
          केल्याचे आढळून आल्यास लोकप्रतिनिधित्व अधिनियम १९५० च्या कलम ३२ नुसार संबंधित
          कर्मचारी हे कार्यवाहीस पात्र राहतील, याची कृपया याची नोंद घ्यावी.
        </p>

        {/* SIGNATURE RIGHT - compact, right-aligned, directly below body */}
        <div
          style={{
            marginTop: "20px",
            pageBreakInside: "avoid",
          }}
        >
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: "0 0 1px 0", fontSize: "11pt" }}>
              स्वाक्षरी / Signature
            </p>
            <p style={{ margin: "0", lineHeight: "1.3" }}>{desigLine1}</p>
            {desigLine2 && (
              <p style={{ margin: "0", lineHeight: "1.3" }}>{desigLine2}</p>
            )}
            <p style={{ margin: "0", lineHeight: "1.3" }}>
              खडकवासला विधानसभा मतदार संघ
            </p>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid #000",
            paddingTop: "10px",
            marginTop: "10px",
          }}
        >
          <p style={{ fontWeight: "bold", marginBottom: "8px" }}>प्रत:</p>
          <p style={{ textAlign: "justify", marginBottom: "10px" }}>
            १) संबंधित अधिकारी/कर्मचारी व संबंधित कार्यालय प्रमुख यांचेकडे माहितीकरिता तसेच
            आवश्यक कार्यवाहीसाठी.
          </p>
          <p style={{ textAlign: "justify", marginBottom: "12px" }}>
            २) सदर आदेश संबंधित अधिकारी/ कर्मचारी यांना बजावून तात्काळ आपल्या नियमित
            कर्तव्यासोबत मतदार नोंदणी अधिकारी पदाचे कर्तव्य स्विकारण्याच्या सुचना देण्यात
            याव्यात. जर सदर आदेशात नमूद अधिकारी/कर्मचारी यांनी तात्काळ उपरोक्त जबाबदारी
            न स्विकारल्यास संबंधित कर्मचाऱ्यांविरुध्ध लोकप्रतिनिधित्व अधिनियम १९५० चे कलम ३२
            नुसार कार्यवाही करण्यात येईल याची नोंद घेण्यात यावी. तसेच कलम २९ नुसार प्रत्येक
            स्थानिक प्राधिकरणाने मतदार नोंदणी अधिका-र्याच्या आवश्यकतेनुसार मतदार यादी
            तयार करणे व पुनिरिक्षण करण्याच्या कार्यवाहीकरिता कर्मचारी उपलब्ध करुन देणे
            आवश्यक आहे, याची नोंद घेण्यात यावी.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page 1 - कार्यालय प्रत */}
      <OrderPageContent copyLabel="कार्यालय प्रत" />

      {/* Page 2 - पोहोच */}
      <div
        style={{
          fontFamily: "'Noto Sans Devanagari', Arial, sans-serif",
          padding: "8px 25px",
          color: "#000",
          maxWidth: "780px",
          margin: "0 auto",
          fontSize: "9pt",
          lineHeight: "1.3",
          pageBreakBefore: "always",
          pageBreakInside: "avoid",
        }}
      >
        {/* Header page 2 */}
        <div style={{ textAlign: "center", marginBottom: "2px" }}>
          <p style={{ fontWeight: "bold", fontSize: "13pt", margin: "0" }}>
            मतदार नोंदणी अधिकारी, २११ खडकवासला विधानसभा मतदार संघ तथा उपविभागीय
            अधिकारी हवेली (पुणे)
          </p>
          <p style={{ fontSize: "11pt", margin: "4px 0" }}>
            यांचे कार्यालय शुक्रवार पेठ खडकमाळ आळी., ता. हवेली, जि. पुणे
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "9pt",
              margin: "4px 0",
            }}
          >
            <span>संपर्क क्रमांक ०२०२४४७२३४८</span>
            <span>ई- मेल- २११ khadakwaslaac@gmail.com</span>
          </div>
        </div>
        <hr style={{ borderTop: "2px solid #000", margin: "4px 0 6px" }} />

        <div
          style={{
            borderBottom: "1px solid #000",
            padding: "4px 0",
            marginBottom: "16px",
            textAlign: "center",
          }}
        >
          <strong style={{ fontSize: "14pt" }}>पोहोच</strong>
          <span style={{ marginLeft: "20px", fontSize: "11pt" }}>
            (मानधन व BLO माहितीसाठी)
          </span>
          <span
            style={{
              marginLeft: "16px",
              fontSize: "10pt",
              border: "1px solid #555",
              padding: "2px 8px",
              borderRadius: "4px",
            }}
          >
            कार्यालय प्रत
          </span>
        </div>

        <p style={{ marginBottom: "6px" }}>
          <strong>आदेश क्रमांक :</strong> {order.orderNumber} &nbsp;&nbsp;&nbsp;
          <strong>दिनांक :</strong> {order.orderDate || marathiDate}
        </p>
        <p style={{ marginBottom: "6px" }}>
          <strong>मतदार यादी भाग क्रमांक :</strong> {partNum}
        </p>
        <p style={{ marginBottom: "6px" }}>
          <strong>BLO नाव :</strong> {order.bloName}
          {order.designation ? ` — ${order.designation}` : ""}{" "}
          &nbsp;&nbsp;&nbsp;
          <strong>कार्यालय :</strong> {order.office}
        </p>
        <p style={{ marginBottom: "6px" }}>
          <strong>मतदान केंद्र :</strong> {partName}
        </p>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "8px",
            fontSize: "10pt",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0" }}>
              <th
                colSpan={2}
                style={{
                  border: "1px solid #000",
                  padding: "6px 8px",
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              >
                अनुभाग १ : BLO ओळख माहिती
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                style={{
                  border: "1px solid #000",
                  padding: "6px 8px",
                  width: "40%",
                  fontWeight: "bold",
                }}
              >
                EPIC कार्ड क्रमांक
              </td>
              <td
                style={{
                  border: "1px solid #000",
                  padding: "6px 8px",
                  minWidth: "200px",
                }}
              >
                &nbsp;
              </td>
            </tr>
            <tr>
              <td
                style={{
                  border: "1px solid #000",
                  padding: "6px 8px",
                  fontWeight: "bold",
                }}
              >
                WhatsApp मोबाईल क्रमांक
              </td>
              <td style={{ border: "1px solid #000", padding: "6px 8px" }}>
                &nbsp;
              </td>
            </tr>
          </tbody>
        </table>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "8px",
            fontSize: "10pt",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0" }}>
              <th
                colSpan={2}
                style={{
                  border: "1px solid #000",
                  padding: "6px 8px",
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              >
                अनुभाग २ : बँक खाते तपशील (मानधन अदायगीसाठी)
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              ["बँकेचे नाव", ""],
              ["शाखेचे नाव", ""],
              ["खाते क्रमांक", ""],
              ["IFSC कोड", ""],
              ["खातेदाराचे नाव", ""],
              ["खाते प्रकार", "बचत खाते ☐   चालू खाते ☐"],
            ].map(([label, val]) => (
              <tr key={label}>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "6px 8px",
                    width: "40%",
                    fontWeight: "bold",
                  }}
                >
                  {label}
                </td>
                <td style={{ border: "1px solid #000", padding: "6px 8px" }}>
                  {val || <>&nbsp;</>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p
          style={{
            fontSize: "10pt",
            color: "#333",
            marginBottom: "20px",
            border: "1px dashed #aaa",
            padding: "8px",
            borderRadius: "4px",
          }}
        >
          <strong>सूचना :</strong> वरील माहिती अचूक भरावी. मानधन थेट आपल्या बँक
          खात्यात जमा केले जाईल.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "15px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                borderTop: "1px solid #000",
                width: "200px",
                marginTop: "30px",
                paddingTop: "4px",
              }}
            >
              BLO यांची स्वाक्षरी व दिनांक
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Supervisor Honorarium Approval Component ────────────────────────────────

function SupervisorHonorariumApproval({
  supervisorId,
  supervisorName: _supervisorName,
}: {
  supervisorId: string;
  supervisorName: string;
}) {
  const [tick, setTick] = useState(0);
  const [remarkMap, setRemarkMap] = useState<Record<string, string>>({});

  const supervisor = storage
    .getSupervisors()
    .find((s) => s.id === supervisorId);
  if (!supervisor) return null;

  const allBLOs = storage.getBLOs();
  const notices = storage.getNotices();
  const _quarterly = storage.getQuarterlyPayments();
  const approvals = storage.getSupervisorHonorariumApprovals();

  // BLOs assigned to this supervisor that have at least one notice
  const blosPendingApproval = supervisor.assignedPartNumbers
    .map((pn) => allBLOs.find((b) => Number(b.pollingStationId) === pn))
    .filter((b): b is NonNullable<typeof b> => !!b)
    .filter((b) => notices.some((n) => n.bloId === b.id));

  const pendingQuarters = [
    { label: "जानेवारी-मार्च", value: "Q1" },
    { label: "एप्रिल-जून", value: "Q2" },
    { label: "जुलै-सप्टेंबर", value: "Q3" },
    { label: "ऑक्टोबर-डिसेंबर", value: "Q4" },
  ];
  const currentYear = new Date().getFullYear();
  const yearStr = `${currentYear}-${String(currentYear + 1).slice(2)}`;

  function handleApprove(blo: (typeof allBLOs)[0], quarter: string) {
    const bloId = blo.id.toString();
    const remark = remarkMap[`${bloId}_${quarter}`] || "";
    storage.saveSupervisorHonorariumApproval({
      id: `${supervisorId}_${bloId}_${quarter}_${Date.now()}`,
      supervisorId,
      bloId,
      quarter,
      approvedAt: new Date().toISOString(),
      status: "approved",
      remark,
    });
    setTick((t) => t + 1);
    toast.success(
      `${blo.name || `भाग ${blo.pollingStationId}`} यांचे मानधन मंजूर केले`,
    );
  }

  function getApprovalStatus(bloId: string, quarter: string) {
    return approvals.find(
      (a) =>
        a.supervisorId === supervisorId &&
        a.bloId === bloId &&
        a.quarter === quarter,
    );
  }

  if (blosPendingApproval.length === 0) {
    return (
      <div
        className="rounded-lg border border-green-200 bg-green-50/60 p-4"
        data-ocid="supervisor.honorarium_approval.section"
      >
        <div className="flex items-center gap-2 mb-1">
          <IndianRupee size={16} className="text-green-700" />
          <p className="text-sm font-semibold text-green-800">मानधन मंजूरी</p>
        </div>
        <p className="text-xs text-green-700">
          आपल्याकडे नोटीस असलेले BLO नाहीत किंवा सर्व BLO मानधन सिंङ आहे.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-orange-200 bg-orange-50/50 p-4 space-y-4"
      data-ocid="supervisor.honorarium_approval.section"
      key={tick}
    >
      <div className="flex items-center gap-2">
        <IndianRupee size={16} className="text-orange-700" />
        <p className="text-sm font-semibold text-orange-900">
          मानधन मंजूरी — नोटीस प्राप्त BLO ({blosPendingApproval.length})
        </p>
      </div>
      <p className="text-xs text-orange-700">
        खालील BLO यांना नोटीस आहे. त्यांचे मानधन देण्यापूर्वी तुमची मंजूरी आवश्यक आहे. (
        {yearStr})
      </p>
      <div className="space-y-3">
        {blosPendingApproval.map((blo, idx) => {
          const bloId = blo.id.toString();
          const bloNotices = notices.filter((n) => n.bloId === blo.id);
          const lastNotice = bloNotices[bloNotices.length - 1];
          return (
            <div
              key={bloId}
              className="rounded-md bg-background border border-orange-200 p-3 space-y-2"
              data-ocid={`supervisor.honorarium_approval.item.${idx + 1}`}
            >
              <div>
                <p className="text-sm font-semibold">
                  भाग {blo.pollingStationId.toString()} — {blo.name || "रिक्त"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {blo.designation || ""}
                  {blo.designation && blo.office ? " · " : ""}
                  {blo.office || ""}
                </p>
                {lastNotice && (
                  <span className="text-[11px] bg-red-100 text-red-700 border border-red-200 rounded px-1.5 py-0.5">
                    नोटीस: {lastNotice.noticeType} — {lastNotice.issueDate}
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-orange-800 mb-1">
                  तिमाही मंजूर करा ({yearStr}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {pendingQuarters.map((q) => {
                    const approval = getApprovalStatus(bloId, q.value);
                    const remarkKey = `${bloId}_${q.value}`;
                    return (
                      <div key={q.value} className="flex flex-col gap-1">
                        {approval?.status === "approved" ? (
                          <span
                            className="text-[11px] bg-green-100 text-green-800 border border-green-200 rounded px-2 py-1"
                            data-ocid={`supervisor.honorarium_approval.approved.${idx + 1}_${q.value}`}
                          >
                            ✅ {q.label} मंजूर
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              placeholder="शेरा (ऐच्छिक)"
                              className="h-6 text-[11px] px-2 rounded border border-orange-200 bg-background w-32 focus:outline-none focus:ring-1 focus:ring-orange-300"
                              value={remarkMap[remarkKey] || ""}
                              onChange={(e) =>
                                setRemarkMap((m) => ({
                                  ...m,
                                  [remarkKey]: e.target.value,
                                }))
                              }
                            />
                            <Button
                              size="sm"
                              className="h-7 text-[11px] bg-green-600 hover:bg-green-700 text-white px-2"
                              onClick={() => handleApprove(blo, q.value)}
                              data-ocid={`supervisor.honorarium_approval.approve_button.${idx + 1}_${q.value}`}
                            >
                              ✓ {q.label} मंजूर करा
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Notice Print Template ────────────────────────────────────────────────────

function NoticePrintTemplate({ notice, blo }: { notice: Notice; blo: BLO }) {
  const noticeSteps = [
    { type: "नोटीस १", label: "नोटीस १" },
    { type: "नोटीस २", label: "नोटीस २" },
    { type: "नोटीस ३", label: "नोटीस ३" },
    { type: "शिस्त भंग", label: "शिस्तभंग कारवाई" },
    { type: "पोलीस", label: "पोलीस कारवाई" },
  ];
  const isPolice = notice.noticeType === "पोलीस";
  const isDisciplinary = notice.noticeType === "शिस्त भंग";
  const title = isPolice
    ? "पोलीस कारवाईसाठी पत्र"
    : isDisciplinary
      ? "शिस्तभंगाची कारवाई"
      : `नोटीस (${noticeSteps.find((s) => s.type === notice.noticeType)?.label || notice.noticeType})`;

  return (
    <div
      style={{
        fontFamily: "Times New Roman, serif",
        padding: "40px",
        color: "black",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          textAlign: "center",
          borderBottom: "2px solid black",
          paddingBottom: "16px",
          marginBottom: "24px",
        }}
      >
        <p style={{ fontSize: "14pt", fontWeight: "bold" }}>महाराष्ट्र शासन</p>
        <p style={{ fontSize: "13pt", fontWeight: "bold" }}>निवडणूक शाखा</p>
        <p style={{ fontSize: "11pt" }}>२११ खडकवासला विधानसभा मतदार संघ</p>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <p>
          <strong>संदर्भ क्र.:</strong> {notice.id.toString()}
        </p>
        <p>
          <strong>दिनांक:</strong> {notice.issueDate}
        </p>
      </div>
      <h2
        style={{
          textAlign: "center",
          fontSize: "14pt",
          fontWeight: "bold",
          marginBottom: "20px",
          textDecoration: "underline",
        }}
      >
        {title}
      </h2>
      <p style={{ marginBottom: "12px" }}>
        <strong>प्रति,</strong>
        <br />
        {isPolice ? "पोलीस स्थानक प्रमुख" : `श्री/श्रीमती ${blo.name}`}
        <br />
        {isDisciplinary || isPolice ? blo.office : ""}
      </p>
      <p
        style={{ lineHeight: "2", textAlign: "justify", marginBottom: "20px" }}
      >
        {isPolice
          ? `श्री/श्रीमती ${blo.name}, ${blo.designation}, ${blo.office} यांनी BLO म्हणून आपली कर्तव्ये पार न पाडल्याने, ${notice.description || "पोलीस कारवाई करणे आवश्यक आहे"}.`
          : isDisciplinary
            ? `श्री/श्रीमती ${blo.name} यांनी BLO म्हणून आपली जबाबदारी पार न पाडल्यामुळे त्यांच्यावर शिस्तभंगाची कारवाई करण्यात यावी. ${notice.description}`
            : `आपल्याला नोटीस देण्यात येते की, आपण BLO म्हणून आपली कर्तव्ये पार पाडत नाही. ${notice.description || "कृपया तात्काळ आपली जबाबदारी पार पाडावी."}`}
      </p>
      <p style={{ marginBottom: "40px" }}>
        {isPolice
          ? "तरी योग्य ती पोलीस कारवाई करावी, ही विनंती आहे."
          : isDisciplinary
            ? "तरी योग्य ती कारवाई करावी."
            : "यावर तात्काळ कार्यवाही करावी."}
      </p>
      <div style={{ marginTop: "60px", textAlign: "right" }}>
        <p style={{ marginBottom: "50px" }}>स्वाक्षरी</p>
        <p>
          <strong>सहा. मतदार नोंदणी अधिकारी तथा तहसीलदार</strong>
        </p>
        <p style={{ fontSize: "10pt" }}>तालुका हवेली</p>
      </div>
    </div>
  );
}
