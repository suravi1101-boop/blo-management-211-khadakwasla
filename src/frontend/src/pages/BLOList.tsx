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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  Download,
  Eye,
  Mail,
  Pencil,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  useActiveBLOs,
  useAllPollingStations,
  useBLONotices,
  useRemoveBLO,
} from "../hooks/useQueries";
import type { BLO } from "../types/domain";
import { BLOStatus, NoticeType } from "../types/domain";
import { updateBLOInBackend } from "../utils/backendService";
import { getCurrentConstituency, storage } from "../utils/storage";
import type { BankDetails } from "../utils/storage";

const PAGE_SIZE = 20;

// ─── Duplicate Detection ───────────────────────────────────────────────────────
function findDuplicates(blos: BLO[]): Map<string, string> {
  const whatsappCount = new Map<string, number>();
  const epicCount = new Map<string, number>();
  const nameCount = new Map<string, number>();

  for (const blo of blos) {
    if (blo.whatsappNumber?.trim()) {
      whatsappCount.set(
        blo.whatsappNumber.trim(),
        (whatsappCount.get(blo.whatsappNumber.trim()) || 0) + 1,
      );
    }
    if (blo.epicNumber?.trim()) {
      epicCount.set(
        blo.epicNumber.trim(),
        (epicCount.get(blo.epicNumber.trim()) || 0) + 1,
      );
    }
    if (blo.name?.trim()) {
      nameCount.set(blo.name.trim(), (nameCount.get(blo.name.trim()) || 0) + 1);
    }
  }

  const result = new Map<string, string>();
  for (const blo of blos) {
    const reasons: string[] = [];
    if (
      blo.whatsappNumber?.trim() &&
      (whatsappCount.get(blo.whatsappNumber.trim()) || 0) > 1
    ) {
      reasons.push("WhatsApp डुप्लिकेट");
    }
    if (
      blo.epicNumber?.trim() &&
      (epicCount.get(blo.epicNumber.trim()) || 0) > 1
    ) {
      reasons.push("EPIC डुप्लिकेट");
    }
    if (blo.name?.trim() && (nameCount.get(blo.name.trim()) || 0) > 1) {
      reasons.push("नाव डुप्लिकेट");
    }
    if (reasons.length > 0) {
      result.set(blo.id.toString(), reasons.join(", "));
    }
  }
  return result;
}

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
    if (blo.whatsappNumber && blo.whatsappNumber === mobile) {
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
    if (sup.whatsappNumber && sup.whatsappNumber === mobile) {
      return {
        found: true,
        message: `हा मोबाईल नंबर आधीच नोंदणीकृत आहे — पर्यवेक्षक: ${sup.name} (${sup.designation}) यांचा WhatsApp नंबर म्हणून`,
      };
    }
  }
  return { found: false, message: "" };
}

const noticeTypeLabel = (t: NoticeType) => {
  if (t === NoticeType.notice1) return "नोटीस १";
  if (t === NoticeType.notice2) return "नोटीस २";
  if (t === NoticeType.notice3) return "नोटीस ३";
  if (t === NoticeType.disciplinary) return "शिस्तभंग";
  if (t === NoticeType.police) return "पोलीस";
  return t;
};

function escapeCsv(val: string | null | undefined): string {
  const s = (val ?? "").toString();
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function exportToExcel(
  blos: BLO[],
  duplicateMap?: Map<string, string>,
  stationMap?: Map<number, { stationName: string; stationNumber: string }>,
) {
  const headers = [
    "अ.क्र.",
    "यादिभाग क्रमांक",
    "मतदान केंद्राचे नाव",
    "BLO नाव",
    "पद",
    "कार्यालय",
    "फोन",
    "EPIC क्रमांक",
    "WhatsApp क्रमांक",
    "नियुक्ती दिनांक",
    "स्थिती",
    "बँकेचे नाव",
    "शाखा",
    "खाते क्रमांक",
    "IFSC कोड",
    "खातेदाराचे नाव",
    "खाते प्रकार",
    "डुप्लिकेट",
  ];

  const rows = blos.map((blo, idx) => {
    const bank: BankDetails | null = storage.getBankDetail(blo.id.toString());
    const status =
      blo.status === BLOStatus.active
        ? "सक्रिय"
        : blo.status === BLOStatus.inactive
          ? "निष्क्रिय"
          : "काढले";
    const dupReason = duplicateMap?.get(blo.id.toString()) || "";
    const stationInfo = stationMap?.get(Number(blo.pollingStationId));
    const stationName = stationInfo?.stationName || "";
    const stationNumber =
      stationInfo?.stationNumber || String(Number(blo.pollingStationId));
    return [
      idx + 1,
      stationNumber,
      stationName,
      blo.name,
      blo.designation,
      blo.office,
      blo.phone || "",
      blo.epicNumber || "",
      blo.whatsappNumber || "",
      blo.appointmentDate,
      status,
      bank?.bankName || "",
      bank?.branch || "",
      bank?.accountNumber || "",
      bank?.ifsc || "",
      bank?.accountHolder || "",
      bank?.accountType === "savings"
        ? "बचत खाते"
        : bank?.accountType === "current"
          ? "चालू खाते"
          : "",
      dupReason,
    ]
      .map((v) => escapeCsv(String(v)))
      .join(",");
  });

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
  a.download = `BLO_यादी_211_खडकवासला_${dd}${mm}${yyyy}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`${blos.length} BLO यादी Excel मध्ये export केली`);
}

function BLONoticesDialog({
  blo,
  open,
  onClose,
}: { blo: BLO; open: boolean; onClose: () => void }) {
  const { data: notices = [], isLoading } = useBLONotices(open ? blo.id : null);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-ocid="blo.notices.dialog">
        <DialogHeader>
          <DialogTitle>{blo.name} - नोटीस इतिहास</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">
            {["a", "b", "c"].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : notices.length === 0 ? (
          <p
            className="text-sm text-muted-foreground text-center py-6"
            data-ocid="blo.notices.empty_state"
          >
            कोणतीही नोटीस नाही
          </p>
        ) : (
          <div className="space-y-2">
            {notices.map((n, i) => (
              <div
                key={n.id.toString()}
                className="flex items-start gap-3 p-3 border rounded-lg"
                data-ocid={`blo.notices.item.${i + 1}`}
              >
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {noticeTypeLabel(n.noticeType)}
                </Badge>
                <div className="min-w-0">
                  <p className="text-sm">{n.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {n.issuedDate}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BLOEditDialog({
  blo,
  open,
  onClose,
}: { blo: BLO; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(blo.name);
  const [designation, setDesignation] = useState(blo.designation);
  const [office, setOffice] = useState(blo.office);
  const [phone, setPhone] = useState(blo.phone || "");
  const [phoneError, setPhoneError] = useState("");
  const [epicNumber, setEpicNumber] = useState(blo.epicNumber || "");
  const [whatsappNumber, setWhatsappNumber] = useState(
    blo.whatsappNumber || "",
  );
  const [whatsappError, setWhatsappError] = useState("");
  const [officeEmail, setOfficeEmail] = useState(
    (blo as any).officeEmail || "",
  );
  const [appointmentDate, setAppointmentDate] = useState(
    blo.appointmentDate || "",
  );

  // Bank details
  const existingBank = storage.getBankDetail(blo.id.toString());
  const [bankName, setBankName] = useState(existingBank?.bankName || "");
  const [branch, setBranch] = useState(existingBank?.branch || "");
  const [accountNumber, setAccountNumber] = useState(
    existingBank?.accountNumber || "",
  );
  const [ifsc, setIfsc] = useState(existingBank?.ifsc || "");
  const [accountHolder, setAccountHolder] = useState(
    existingBank?.accountHolder || "",
  );
  const [accountType, setAccountType] = useState<"savings" | "current">(
    existingBank?.accountType || "savings",
  );

  async function handleSave() {
    if (phoneError) {
      toast.error(phoneError);
      return;
    }
    if (whatsappError) {
      toast.error(whatsappError);
      return;
    }
    const blos = storage.getBLOs();
    const updatedBLO = {
      ...blo,
      name,
      designation,
      office,
      phone,
      epicNumber,
      whatsappNumber,
      officeEmail,
      appointmentDate,
    };
    const updated = blos.map((b) => (b.id === blo.id ? updatedBLO : b));
    storage.setBLOs(updated);
    if (accountNumber.trim()) {
      storage.saveBankDetail(blo.id.toString(), {
        bankName,
        branch,
        accountNumber,
        ifsc,
        accountHolder,
        accountType,
      });
    }
    qc.invalidateQueries({ queryKey: ["activeBLOs"] });
    toast.success("BLO माहिती अद्यावत केली");
    onClose();
    // Also persist the edit to backend so other devices see the change
    const constituencyId = getCurrentConstituency();
    try {
      await updateBLOInBackend(
        constituencyId,
        updatedBLO as unknown as import("../backend").BLO,
      );
    } catch (err) {
      console.error("updateBLOInBackend failed:", err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        data-ocid="blo.edit.dialog"
      >
        <DialogHeader>
          <DialogTitle>BLO माहिती संपादित करा</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <Label className="text-xs">नाव *</Label>
            <Input
              className="mt-1 h-8 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">पद</Label>
              <Input
                className="mt-1 h-8 text-sm"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">फोन</Label>
              <Input
                className="mt-1 h-8 text-sm"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  const check = checkDuplicateMobile(
                    e.target.value,
                    blo.id,
                    undefined,
                  );
                  setPhoneError(check.found ? check.message : "");
                }}
              />
              {phoneError && (
                <p className="text-xs text-red-600 mt-0.5">{phoneError}</p>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs">कार्यालय</Label>
            <Input
              className="mt-1 h-8 text-sm"
              value={office}
              onChange={(e) => setOffice(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">EPIC क्रमांक</Label>
              <Input
                className="mt-1 h-8 text-sm font-mono"
                value={epicNumber}
                onChange={(e) => setEpicNumber(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">WhatsApp क्रमांक</Label>
              <Input
                className="mt-1 h-8 text-sm font-mono"
                value={whatsappNumber}
                onChange={(e) => {
                  setWhatsappNumber(e.target.value);
                  const check = checkDuplicateMobile(
                    e.target.value,
                    blo.id,
                    undefined,
                  );
                  setWhatsappError(check.found ? check.message : "");
                }}
              />
              {whatsappError && (
                <p className="text-xs text-red-600 mt-0.5">{whatsappError}</p>
              )}
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
          <div>
            <Label className="text-xs">नियुक्ती दिनांक (DD/MM/YYYY)</Label>
            <Input
              className="mt-1 h-8 text-sm"
              placeholder="01/01/2024"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              data-ocid="blo.edit.appointment_date.input"
            />
          </div>
          <div className="border-t pt-3">
            <p className="text-xs font-semibold mb-2 text-muted-foreground">
              बँक खाते तपशील
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">बँकेचे नाव</Label>
                <Input
                  className="mt-1 h-8 text-sm"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">शाखा</Label>
                <Input
                  className="mt-1 h-8 text-sm"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">खाते क्रमांक</Label>
                <Input
                  className="mt-1 h-8 text-sm font-mono"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">IFSC कोड</Label>
                <Input
                  className="mt-1 h-8 text-sm font-mono"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <Label className="text-xs">खातेदाराचे नाव</Label>
                <Input
                  className="mt-1 h-8 text-sm"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">खाते प्रकार</Label>
                <Select
                  value={accountType}
                  onValueChange={(v) =>
                    setAccountType(v as "savings" | "current")
                  }
                >
                  <SelectTrigger className="mt-1 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">बचत खाते</SelectItem>
                    <SelectItem value="current">चालू खाते</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            रद्द करा
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
            जतन करा
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkEmailDialog({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: blos = [] } = useActiveBLOs();

  // Tab 1: CSV import state
  const [csvPreview, setCsvPreview] = useState<
    {
      stationId: number;
      bloName: string;
      currentEmail: string;
      newEmail: string;
      found: boolean;
    }[]
  >([]);
  const [csvFileName, setCsvFileName] = useState("");

  // Tab 2: Bulk edit state
  const [editEmails, setEditEmails] = useState<Record<string, string>>({});
  const [bulkSearch, setBulkSearch] = useState("");
  const [tab, setTab] = useState("csv");

  // Initialize editEmails when dialog opens
  function initEdit() {
    const map: Record<string, string> = {};
    const storedBlos = storage.getBLOs();
    for (const b of storedBlos) {
      map[b.id.toString()] = (b as any).officeEmail || "";
    }
    setEditEmails(map);
  }

  function handleOpenChange(val: boolean) {
    if (val) initEdit();
    if (!val) {
      setCsvPreview([]);
      setCsvFileName("");
      setBulkSearch("");
      onClose();
    }
  }

  function parseCsv(text: string) {
    const lines = text
      .trim()
      .split("\n")
      .map((l) => l.replace(/\r$/, ""));
    if (lines.length < 2) return;
    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, ""));
    const partIdx = headers.findIndex((h) =>
      ["भागक्रमांक", "partNumber", "भाग क्रमांक", "part_number", "partno"].includes(
        h,
      ),
    );
    const emailIdx = headers.findIndex((h) =>
      ["email", "Email", "ईमेल", "EMAIL"].includes(h),
    );
    if (partIdx === -1 || emailIdx === -1) {
      toast.error("CSV मध्ये 'भागक्रमांक' आणि 'email' columns असणे आवश्यक आहे");
      return;
    }
    const storedBlos = storage.getBLOs();
    const previews = lines
      .slice(1)
      .filter((l) => l.trim())
      .map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const stationId = Number.parseInt(cols[partIdx]);
        const newEmail = cols[emailIdx] || "";
        const match = storedBlos.find(
          (b) => Number(b.pollingStationId) === stationId,
        );
        return {
          stationId,
          bloName: match?.name || "",
          currentEmail: match ? (match as any).officeEmail || "" : "",
          newEmail,
          found: !!match,
        };
      });
    setCsvPreview(previews);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      parseCsv((ev.target?.result as string) || "");
    };
    reader.readAsText(file, "UTF-8");
  }

  function handleCsvImport() {
    const valid = csvPreview.filter((p) => p.found && p.newEmail);
    if (valid.length === 0) {
      toast.error("आयात करण्यासाठी वैध नोंदी नाहीत");
      return;
    }
    const storedBlos = storage.getBLOs();
    const updated = storedBlos.map((b) => {
      const match = valid.find(
        (v) => v.stationId === Number(b.pollingStationId),
      );
      return match ? { ...b, officeEmail: match.newEmail } : b;
    });
    storage.setBLOs(updated);
    qc.invalidateQueries();
    toast.success(`${valid.length} BLO यांचे email अद्ययावत केले`);
    onClose();
  }

  function handleBulkSave() {
    const storedBlos = storage.getBLOs();
    const updated = storedBlos.map((b) => ({
      ...b,
      officeEmail: editEmails[b.id.toString()] ?? (b as any).officeEmail ?? "",
    }));
    storage.setBLOs(updated);
    qc.invalidateQueries();
    toast.success("सर्व BLO यांचे email जतन केले");
    onClose();
  }

  const filteredBlos = blos.filter((b) => {
    if (!bulkSearch.trim()) return true;
    const q = bulkSearch.toLowerCase();
    return (
      (b.name || "").toLowerCase().includes(q) ||
      b.pollingStationId.toString().includes(q)
    );
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] flex flex-col"
        data-ocid="bulk_email.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail size={18} />
            BLO Office Email बल्क अपडेट
          </DialogTitle>
        </DialogHeader>
        <Tabs
          value={tab}
          onValueChange={setTab}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="w-full">
            <TabsTrigger
              value="csv"
              className="flex-1"
              data-ocid="bulk_email.csv.tab"
            >
              CSV आयात
            </TabsTrigger>
            <TabsTrigger
              value="edit"
              className="flex-1"
              data-ocid="bulk_email.edit.tab"
            >
              एकत्र संपादन
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="csv"
            className="flex-1 overflow-auto space-y-3 mt-3"
          >
            <div className="bg-muted/50 rounded p-3 text-sm text-muted-foreground">
              CSV फाईल upload करा. त्यामध्ये दोन columns असाव्यात:{" "}
              <code className="bg-background px-1 rounded">भागक्रमांक</code> (किंवा{" "}
              <code className="bg-background px-1 rounded">partNumber</code>)
              आणि <code className="bg-background px-1 rounded">email</code>
            </div>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                  data-ocid="bulk_email.upload_button"
                />
                <div className="flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted transition-colors">
                  <Upload size={14} />
                  CSV निवडा
                </div>
              </label>
              {csvFileName && (
                <span className="text-sm text-muted-foreground">
                  {csvFileName}
                </span>
              )}
            </div>

            {csvPreview.length > 0 && (
              <div className="border rounded overflow-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">भाग क्र.</TableHead>
                      <TableHead className="text-xs">BLO नाव</TableHead>
                      <TableHead className="text-xs">सध्याचा Email</TableHead>
                      <TableHead className="text-xs">नवीन Email</TableHead>
                      <TableHead className="text-xs">स्थिती</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvPreview.map((row) => (
                      <TableRow key={row.stationId}>
                        <TableCell className="text-xs">
                          {row.stationId}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.bloName || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.currentEmail || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.newEmail || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.found ? (
                            <span className="text-green-600">✓ सापडले</span>
                          ) : (
                            <span className="text-amber-600">⚠ नाही</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                data-ocid="bulk_email.csv.cancel_button"
              >
                रद्द करा
              </Button>
              <Button
                size="sm"
                onClick={handleCsvImport}
                disabled={
                  csvPreview.filter((p) => p.found && p.newEmail).length === 0
                }
                data-ocid="bulk_email.csv.submit_button"
              >
                आयात करा (
                {csvPreview.filter((p) => p.found && p.newEmail).length})
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent
            value="edit"
            className="flex-1 flex flex-col min-h-0 mt-3 space-y-3"
          >
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="BLO शोधा..."
                className="pl-8 h-8 text-sm"
                value={bulkSearch}
                onChange={(e) => setBulkSearch(e.target.value)}
                data-ocid="bulk_email.search_input"
              />
            </div>
            <div className="flex-1 overflow-auto border rounded max-h-72">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs w-16">भाग क्र.</TableHead>
                    <TableHead className="text-xs">BLO नाव</TableHead>
                    <TableHead className="text-xs">कार्यालयीन Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBlos.map((blo) => (
                    <TableRow key={blo.id.toString()}>
                      <TableCell className="text-xs">
                        {blo.pollingStationId}
                      </TableCell>
                      <TableCell className="text-xs">
                        {blo.name || "रिक्त"}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="email"
                          value={editEmails[blo.id.toString()] ?? ""}
                          onChange={(e) =>
                            setEditEmails((prev) => ({
                              ...prev,
                              [blo.id.toString()]: e.target.value,
                            }))
                          }
                          className="h-7 text-xs"
                          placeholder="email@office.gov.in"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                data-ocid="bulk_email.edit.cancel_button"
              >
                रद्द करा
              </Button>
              <Button
                size="sm"
                onClick={handleBulkSave}
                data-ocid="bulk_email.edit.save_button"
              >
                सर्व जतन करा
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function BLOList({
  isAdminLoggedIn,
}: { isAdminLoggedIn?: boolean } = {}) {
  const { data: rawBlos = [], isLoading, refetch } = useActiveBLOs();
  // Always sort by partNumber ascending
  const blos = [...rawBlos].sort(
    (a, b) => Number(a.pollingStationId) - Number(b.pollingStationId),
  );
  const removeBLO = useRemoveBLO();

  // Build station map for displaying station names, numbers and locations
  const { data: allPollingStations = [] } = useAllPollingStations();
  const stationMap = new Map<
    number,
    { stationName: string; stationNumber: string; location?: string }
  >(
    allPollingStations.map((s) => [
      Number(s.id),
      {
        stationName: s.stationName,
        stationNumber: s.stationNumber,
        location:
          (s as any).location || (s as any).address || (s as any).place || "",
      },
    ]),
  );

  // Refresh when supervisor page adds/updates BLOs
  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener("storage", handler);
    window.addEventListener("blo-data-updated", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("blo-data-updated", handler);
    };
  }, [refetch]);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [removeTarget, setRemoveTarget] = useState<BLO | null>(null);
  const [viewNoticesBLO, setViewNoticesBLO] = useState<BLO | null>(null);
  const [editBLO, setEditBLO] = useState<BLO | null>(null);
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  // Compute duplicate map from all BLOs
  const duplicateMap = findDuplicates(blos);

  const filtered = blos.filter((b) => {
    const matchesSearch = (() => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (b.name || "").toLowerCase().includes(q) ||
        (b.designation || "").toLowerCase().includes(q) ||
        (b.office || "").toLowerCase().includes(q) ||
        (b.pollingStationId?.toString() || "").includes(q) ||
        (stationMap?.get(Number(b.pollingStationId))?.stationName || "")
          .toLowerCase()
          .includes(q)
      );
    })();
    const matchesDupFilter = showDuplicatesOnly
      ? duplicateMap.has(b.id.toString())
      : true;
    return matchesSearch && matchesDupFilter;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleRemove() {
    if (!removeTarget) return;
    removeBLO.mutate(removeTarget.id, {
      onSuccess: () => {
        toast.success(`${removeTarget.name} यांना यादीतून काढले`);
        setRemoveTarget(null);
      },
      onError: () => toast.error("BLO काढताना त्रुटी"),
    });
  }

  // Total columns: क्र. + मतदान केंद्र क्रमांक + BLO नाव + पदनाम + WhatsApp + मतदान केंद्राचे नाव + मतदान केंद्राचे ठिकाण + कार्यालय + फोन + EPIC + नियुक्ती दिनांक + स्थिती [+ क्रिया]
  const totalCols = isAdminLoggedIn ? 12 : 11;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">BLO मुख्य यादी</h2>
          <p className="text-sm text-muted-foreground">
            एकूण {blos.length} सक्रिय BLO
          </p>
        </div>
        <div className="flex gap-2">
          {isAdminLoggedIn && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => setBulkEmailOpen(true)}
              data-ocid="blo.bulk_email.open_modal_button"
            >
              <Mail size={14} />
              Email बल्क अपडेट
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => exportToExcel(filtered, duplicateMap, stationMap)}
            disabled={filtered.length === 0}
            data-ocid="blo.export_excel_button"
          >
            <Download size={14} />
            Excel Export ({filtered.length})
          </Button>
        </div>
      </div>

      {/* Duplicate warning banner */}
      {isAdminLoggedIn && duplicateMap.size > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-800"
          data-ocid="blo.duplicate.error_state"
        >
          <AlertTriangle size={16} className="flex-shrink-0 text-amber-500" />
          <p className="text-sm flex-1">
            ⚠ <strong>{duplicateMap.size}</strong> डुप्लिकेट नोंदी आढळल्या — खाली
            हायलाइट केलेल्या आहेत. संपादित करा किंवा हटवा.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            data-ocid="blo.search_input"
            placeholder="यादिभाग क्रमांक, मतदान केंद्र नाव, BLO नाव, पद, कार्यालय..."
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {isAdminLoggedIn && duplicateMap.size > 0 && (
          <Button
            size="sm"
            variant={showDuplicatesOnly ? "default" : "outline"}
            className={
              showDuplicatesOnly
                ? "gap-2 bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
                : "gap-2 border-amber-400 text-amber-700 hover:bg-amber-50"
            }
            onClick={() => {
              setShowDuplicatesOnly((prev) => !prev);
              setPage(1);
            }}
            data-ocid="blo.duplicate.toggle"
          >
            <AlertTriangle size={13} />
            डुप्लिकेट दाखवा ({duplicateMap.size})
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold">क्र.</TableHead>
              <TableHead className="text-xs font-semibold">
                मतदान केंद्र क्रमांक
              </TableHead>
              <TableHead className="text-xs font-semibold">BLO नाव</TableHead>
              <TableHead className="text-xs font-semibold">पदनाम</TableHead>
              <TableHead className="text-xs font-semibold">
                WhatsApp क्रमांक
              </TableHead>
              <TableHead className="text-xs font-semibold">
                मतदान केंद्राचे नाव
              </TableHead>
              <TableHead className="text-xs font-semibold">
                मतदान केंद्राचे ठिकाण
              </TableHead>
              <TableHead className="text-xs font-semibold">कार्यालय</TableHead>
              <TableHead className="text-xs font-semibold">फोन</TableHead>
              <TableHead className="text-xs font-semibold">EPIC क्र.</TableHead>
              <TableHead className="text-xs font-semibold">
                नियुक्ती दिनांक
              </TableHead>
              <TableHead className="text-xs font-semibold">स्थिती</TableHead>
              {isAdminLoggedIn && (
                <TableHead className="text-xs font-semibold">क्रिया</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              ["a", "b", "c", "d", "e"].map((i) => (
                <TableRow key={i}>
                  {[
                    "kr",
                    "kramank",
                    "blo",
                    "pad",
                    "wa",
                    "kendra",
                    "sthan",
                    "karyalay",
                    "phone",
                    "epic",
                    "date",
                    "sthiti",
                    "kriya",
                  ]
                    .slice(0, totalCols)
                    .map((col) => (
                      <TableCell key={col}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                </TableRow>
              ))
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={totalCols}
                  className="text-center py-10 text-muted-foreground"
                  data-ocid="blo.empty_state"
                >
                  <AlertCircle size={24} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">कोणताही BLO सापडला नाही</p>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((blo, idx) => {
                const dupReason = duplicateMap.get(blo.id.toString());
                const isDup = !!dupReason;
                return (
                  <TableRow
                    key={blo.id.toString()}
                    data-ocid={`blo.item.${(page - 1) * PAGE_SIZE + idx + 1}`}
                    className={
                      isDup ? "bg-amber-50 border-l-4 border-l-amber-400" : ""
                    }
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </TableCell>
                    <TableCell className="text-sm text-center">
                      {blo.pollingStationId.toString()}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {blo.name ? (
                        blo.name
                      ) : (
                        <span className="text-muted-foreground italic">
                          रिक्त
                        </span>
                      )}
                      {isDup && (
                        <Badge className="bg-amber-100 text-amber-800 text-xs ml-1 border-amber-300">
                          {dupReason}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {blo.designation || "-"}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {blo.whatsappNumber ? (
                        <a
                          href={`https://wa.me/91${blo.whatsappNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:underline"
                        >
                          {blo.whatsappNumber}
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {stationMap.get(Number(blo.pollingStationId))
                        ?.stationName || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {stationMap.get(Number(blo.pollingStationId))?.location ||
                        "-"}
                    </TableCell>
                    <TableCell className="text-sm">{blo.office}</TableCell>
                    <TableCell className="text-sm">
                      {blo.phone || "-"}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {blo.epicNumber || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {blo.appointmentDate}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          blo.status === BLOStatus.active
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {blo.status === BLOStatus.active
                          ? "सक्रिय"
                          : blo.status === BLOStatus.inactive
                            ? "निष्क्रिय"
                            : "काढले"}
                      </Badge>
                    </TableCell>
                    {isAdminLoggedIn && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setViewNoticesBLO(blo)}
                            title="नोटीस पाहा"
                            data-ocid={`blo.view_notices.button.${(page - 1) * PAGE_SIZE + idx + 1}`}
                          >
                            <Eye size={13} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-blue-600 hover:text-blue-700"
                            onClick={() => setEditBLO(blo)}
                            title="संपादित करा"
                            data-ocid={`blo.edit_button.${(page - 1) * PAGE_SIZE + idx + 1}`}
                          >
                            <Pencil size={13} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setRemoveTarget(blo)}
                            title="काढून टाका"
                            data-ocid={`blo.delete_button.${(page - 1) * PAGE_SIZE + idx + 1}`}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{filtered.length} BLO</p>
          <div className="flex gap-2">
            <Button
              data-ocid="blo.pagination_prev"
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              मागे
            </Button>
            <span className="px-3 py-1 text-xs border rounded-md">
              {page} / {totalPages}
            </span>
            <Button
              data-ocid="blo.pagination_next"
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

      {/* Remove confirmation */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent data-ocid="blo.remove.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>BLO काढायचे का?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.name} यांना मुख्य BLO यादीतून काढले जाईल. हे परत आणता
              येणार नाही.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="blo.remove.cancel_button">
              रद्द करा
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="blo.remove.confirm_button"
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              काढा
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notices dialog */}
      {viewNoticesBLO && (
        <BLONoticesDialog
          blo={viewNoticesBLO}
          open={true}
          onClose={() => setViewNoticesBLO(null)}
        />
      )}

      {/* Edit BLO dialog */}
      {editBLO && (
        <BLOEditDialog
          blo={editBLO}
          open={true}
          onClose={() => setEditBLO(null)}
        />
      )}

      {/* Bulk email dialog */}
      <BulkEmailDialog
        open={bulkEmailOpen}
        onClose={() => setBulkEmailOpen(false)}
      />
    </div>
  );
}
