import type { BankDetails } from "@/backend";
import { createActor } from "@/backend";
import type { HonorariumEligibilityResult } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getCurrentSupervisor,
  isAdminLoggedIn,
  isSuperAdminLoggedIn,
} from "@/lib/auth";
import {
  AlertCircle,
  CheckSquare,
  Download,
  IndianRupee,
  Info,
  PlusCircle,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useApproveHonorarium,
  useBLOs,
  useClearNoticeForHonorarium,
  useCreateHonorariumRecord,
  useEligibleBLOsForHonorarium,
  useExtraPaymentsByConstituency,
  useHonorariumByConstituency,
  useHonorariumBySupervisor,
  useHonorariumEligibility,
  useMarkHonorariumPaid,
  useNotices,
  useRestoreHonorariumEligibility,
  useSetHonorariumExcludeOverride,
  useSupervisors,
} from "../hooks/useQueries";
import type {
  BLO,
  HonorariumRecord,
  Notice,
  Supervisor,
} from "../hooks/useQueries";
import { useBackendActorCtx } from "../lib/actorContext";
import { BloMandhanTab } from "./BloMandhanTab";

const CONST_ID = "211";
const QUARTERLY_AMOUNT = 3500;
const QUARTERS = [
  "जानेवारी ते मार्च",
  "एप्रिल ते जून",
  "जुलै ते सप्टेंबर",
  "ऑक्टोबर ते डिसेंबर",
];
const QUARTER_KEYS = ["Q1", "Q2", "Q3", "Q4"];
const QUARTER_LABELS: Record<string, string> = {
  Q1: "जानेवारी ते मार्च",
  Q2: "एप्रिल ते जून",
  Q3: "जुलै ते सप्टेंबर",
  Q4: "ऑक्टोबर ते डिसेंबर",
};
const currentYear = new Date().getFullYear();
const YEARS = Array.from(
  { length: Math.max(5, currentYear + 2 - 2026 + 1) },
  (_, i) => 2026 + i,
);
/** Returns true when a notice is active/pending (not withdrawn/closed) */
function isNoticeActive(notice: Notice): boolean {
  return (
    notice.status !== "withdrawn" &&
    notice.status !== "closed" &&
    notice.status !== "cancelled"
  );
}

/** Build a set of BLO IDs that have at least one active notice */
function buildNoticedBLOSet(notices: Notice[]): Set<string> {
  const noticed = new Set<string>();
  for (const n of notices) {
    if (!isNoticeActive(n)) continue;
    if (n.recipientType === "blo" && n.recipientId) {
      noticed.add(n.recipientId);
    }
    for (const r of n.noticeRecipients ?? []) {
      if (r.recipientType === "blo" && r.recipientId) {
        noticed.add(r.recipientId);
      }
    }
  }
  return noticed;
}

function statusLabel(status: string): string {
  if (status === "pending") return "प्रलंबित";
  if (status === "approved") return "मंजूर";
  if (status === "paid") return "दिले";
  return status;
}

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "paid") return "default";
  if (status === "approved") return "secondary";
  return "outline";
}

function exportToExcel(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const bom = "\uFEFF";
  const escapeCell = (v: string | number | null | undefined) => {
    const s = (v ?? "").toString();
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csv =
    bom +
    [
      headers.map(escapeCell).join(","),
      ...rows.map((r) => r.map(escapeCell).join(",")),
    ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Eligibility Tab ─────────────────────────────────────────────────────

function EligibilityTab({ isAdmin }: { isAdmin: boolean }) {
  const { data: eligibility = [], isLoading } =
    useHonorariumEligibility(CONST_ID);
  const { data: allBLOs = [] } = useBLOs();
  const { data: allNotices = [] } = useNotices();
  const actor = useBackendActorCtx();
  const [search, setSearch] = useState("");
  const [subTab, setSubTab] = useState<"eligible" | "excluded">("eligible");
  const [isExporting, setIsExporting] = useState(false);
  const clearNotice = useClearNoticeForHonorarium();
  const restoreEligibility = useRestoreHonorariumEligibility();
  const excludeOverride = useSetHonorariumExcludeOverride();
  const supervisor = getCurrentSupervisor();
  // Skip-quarter state
  const [skipBloId, setSkipBloId] = useState("");
  const [skipReason, setSkipReason] = useState("");

  const bloMap = Object.fromEntries(allBLOs.map((b) => [b.id, b]));
  const noticedBLONotices = new Map<string, string>();
  for (const n of allNotices) {
    if (!isNoticeActive(n)) continue;
    if (
      n.recipientType === "blo" &&
      n.recipientId &&
      !noticedBLONotices.has(n.recipientId)
    ) {
      noticedBLONotices.set(n.recipientId, n.id);
    }
  }
  const noticedBLOIds = buildNoticedBLOSet(allNotices);

  const autoEligibleRaw = eligibility.filter((e) => {
    const blo = bloMap[e.bloId];
    const isInactive = blo && blo.status !== "active";
    const hasNotice = noticedBLOIds.has(e.bloId);
    return e.isEligible && !isInactive && !hasNotice;
  });

  const seenPartNumbers = new Map<number | string, true>();
  const autoEligible = autoEligibleRaw.filter((e) => {
    const key = e.partNumber;
    if (seenPartNumbers.has(key)) return false;
    seenPartNumbers.set(key, true);
    return true;
  });

  const autoExcluded = eligibility.filter((e) => {
    const blo = bloMap[e.bloId];
    const isInactive = blo && blo.status !== "active";
    const hasNotice = noticedBLOIds.has(e.bloId);
    return !e.isEligible || isInactive || hasNotice;
  });

  const excludedWithNotice = eligibility.filter((e) =>
    noticedBLOIds.has(e.bloId),
  ).length;
  const excludedInactive = eligibility.filter((e) => {
    const blo = bloMap[e.bloId];
    return blo && blo.status !== "active" && !noticedBLOIds.has(e.bloId);
  }).length;
  const excludedOther =
    autoExcluded.length - excludedWithNotice - excludedInactive;

  const enriched = eligibility.map((e) => {
    const blo = bloMap[e.bloId];
    const isInactive = blo && blo.status !== "active";
    const hasNotice = noticedBLOIds.has(e.bloId);
    const finalEligible = e.isEligible && !isInactive && !hasNotice;
    let reason: string | undefined;
    if (hasNotice) reason = "नोटीस दिलेला";
    else if (isInactive) reason = "निष्क्रिय";
    else if (!e.isEligible && e.exclusionReason) reason = e.exclusionReason;
    return { ...e, finalEligible, reason, hasNotice };
  });

  const filteredEligible = enriched.filter((e) => {
    if (!e.finalEligible) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.bloName.toLowerCase().includes(q) || String(e.partNumber).includes(q)
    );
  });

  const filteredExcluded = enriched.filter((e) => {
    if (e.finalEligible) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.bloName.toLowerCase().includes(q) || String(e.partNumber).includes(q)
    );
  });

  const handleSupervisorApproval = async (e: {
    bloId: string;
    bloName: string;
    hasNotice: boolean;
  }) => {
    const noticeId = noticedBLONotices.get(e.bloId);
    if (!noticeId) {
      toast.error("नोटीस माहिती सापडली नाही");
      return;
    }
    const approverName = supervisor?.name ?? "पर्यवेक्षक";
    const approverId = supervisor?.id ?? "supervisor";
    try {
      await clearNotice.mutateAsync({
        noticeId,
        clearedById: approverId,
        clearedByName: approverName,
      });
      await restoreEligibility.mutateAsync({
        constituencyId: CONST_ID,
        bloId: e.bloId,
        clearedBy: approverId,
      });
      toast.success(`${e.bloName} यांची मानधन पात्रता पुनर्स्थापित झाली`);
    } catch {
      toast.error("मान्यता देताना त्रुटी आली");
    }
  };

  const handleSkipBlo = async () => {
    if (!skipBloId || !skipReason.trim()) {
      toast.error("BLO आणि कारण दोन्ही आवश्यक आहेत");
      return;
    }
    try {
      await excludeOverride.mutateAsync({
        constituencyId: CONST_ID,
        bloId: skipBloId,
        isManuallyIncluded: false,
        reason: skipReason.trim(),
        overriddenBy: "admin",
      });
      toast.success("BLO मानधनातून वगळला");
      setSkipBloId("");
      setSkipReason("");
    } catch {
      toast.error("BLO वगळताना त्रुटी आली");
    }
  };

  const handleRestoreBlo = async (bloId: string, bloName: string) => {
    try {
      await restoreEligibility.mutateAsync({
        constituencyId: CONST_ID,
        bloId,
        clearedBy: "admin",
      });
      toast.success(`${bloName} यांना पुन्हा पात्र केले`);
    } catch {
      toast.error("पुनर्स्थापित करताना त्रुटी आली");
    }
  };

  const handleExportEligible = async () => {
    if (!actor) {
      toast.error("बॅकेंड उपलब्ध नाही");
      return;
    }
    setIsExporting(true);
    try {
      const quarter = QUARTERS[Math.floor(new Date().getMonth() / 3)];
      const bankDetailsMap: Record<string, BankDetails | null> = {};
      await Promise.all(
        autoEligible.map(async (e) => {
          try {
            bankDetailsMap[e.bloId] = await actor.getBLOBankDetails(
              CONST_ID,
              e.bloId,
            );
          } catch {
            bankDetailsMap[e.bloId] = null;
          }
        }),
      );
      exportToExcel(
        `मानधन_यादी_${quarter}_${currentYear}.csv`,
        [
          "BLO नाव",
          "मतदान केंद्र क्रमांक",
          "बँकेचे नाव",
          "खाते क्रमांक",
          "IFSC कोड",
          "बँकेची शाखा",
          "मानधन रक्कम (₹)",
          "तिमाही",
          "वर्ष",
          "स्थिती",
        ],
        autoEligible.map((e) => {
          const bank = bankDetailsMap[e.bloId];
          const blo = bloMap[e.bloId];
          return [
            e.bloName,
            e.partNumber,
            bank?.bankName ?? "",
            bank?.accountNumber ?? blo?.bankAccount ?? "",
            bank?.ifscCode ?? "",
            bank?.branchName ?? "",
            QUARTERLY_AMOUNT,
            quarter,
            currentYear,
            "पात्र",
          ];
        }),
      );
      toast.success(`${autoEligible.length} BLO ची मानधन यादी निर्यात झाली`);
    } catch {
      toast.error("निर्यात करताना त्रुटी आली");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-12"
        data-ocid="honorarium.eligibility.loading_state"
      >
        <span className="text-muted-foreground animate-pulse">
          लोड होत आहे...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {autoExcluded.length > 0 && (
        <div
          className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3"
          data-ocid="honorarium.exclusion_summary"
        >
          <AlertCircle size={18} className="mt-0.5 text-orange-500 shrink-0" />
          <div className="flex flex-col gap-0.5 text-sm">
            <span className="font-semibold text-orange-700">
              वगळलेले BLO: {autoExcluded.length}
            </span>
            <span className="text-orange-600">
              नोटीस दिलेले: {excludedWithNotice}
              {"  |  "}निष्क्रिय: {excludedInactive}
              {excludedOther > 0 && `  |  इतर: ${excludedOther}`}
            </span>
            <span className="text-xs text-orange-500">
              नोटीस दिलेले किंवा निष्क्रिय BLO मानधनासाठी आपोआप अपात्र ठरतात.
            </span>
          </div>
        </div>
      )}

      {/* Sub-tabs: पात्र BLO / वगळलेले BLO */}
      <div className="flex gap-0 border-b border-border">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            subTab === "eligible"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setSubTab("eligible")}
          data-ocid="honorarium.eligible_subtab"
        >
          पात्र BLO ({filteredEligible.length})
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            subTab === "excluded"
              ? "border-red-500 text-red-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setSubTab("excluded")}
          data-ocid="honorarium.excluded_subtab"
        >
          वगळलेले BLO ({filteredExcluded.length})
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <Input
          className="max-w-xs"
          placeholder="BLO नाव किंवा केंद्र क्रमांक शोधा..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-ocid="honorarium.eligibility.search_input"
        />
        {isAdmin && subTab === "eligible" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportEligible}
            disabled={isExporting || autoEligible.length === 0}
            data-ocid="honorarium.eligibility.export_button"
          >
            <Download size={14} className="mr-1" />
            {isExporting
              ? "निर्यात होत आहे..."
              : `Excel निर्यात (${autoEligible.length} पात्र)`}
          </Button>
        )}
      </div>

      {/* पात्र BLO Sub-tab */}
      {subTab === "eligible" && (
        <>
          {/* Skip Quarter Panel */}
          {isAdmin && filteredEligible.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex flex-col sm:flex-row gap-2 items-start sm:items-end">
              <div className="flex-1">
                <Label className="text-xs text-amber-800 font-medium mb-1 block">
                  BLO वगळा (या तिमाहीसाठी)
                </Label>
                <select
                  value={skipBloId}
                  onChange={(e) => setSkipBloId(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm w-full bg-white"
                  data-ocid="honorarium.skip.blo_select"
                >
                  <option value="">BLO निवडा...</option>
                  {filteredEligible.map((e) => (
                    <option key={e.bloId} value={e.bloId}>
                      {e.bloName} — केंद्र {e.partNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <Label className="text-xs text-amber-800 font-medium mb-1 block">
                  वगळण्याचे कारण *
                </Label>
                <Input
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  placeholder="कारण लिहा..."
                  className="text-sm"
                  data-ocid="honorarium.skip.reason_input"
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-amber-400 text-amber-800 hover:bg-amber-100"
                onClick={() => void handleSkipBlo()}
                disabled={
                  excludeOverride.isPending || !skipBloId || !skipReason.trim()
                }
                data-ocid="honorarium.skip.submit_button"
              >
                वगळा
              </Button>
            </div>
          )}
          {filteredEligible.length === 0 ? (
            <div
              className="flex flex-col items-center py-12 gap-2"
              data-ocid="honorarium.eligibility.empty_state"
            >
              <span className="text-4xl">📋</span>
              <p className="text-muted-foreground">पात्र BLO उपलब्ध नाहीत.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>BLO नाव</TableHead>
                    <TableHead className="text-center">केंद्र क्र.</TableHead>
                    <TableHead className="text-center">पात्रता</TableHead>
                    <TableHead>कृती</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEligible.map((e, i) => (
                    <TableRow
                      key={e.bloId}
                      data-ocid={`honorarium.eligible.item.${i + 1}`}
                    >
                      <TableCell className="font-medium">{e.bloName}</TableCell>
                      <TableCell className="text-center font-mono">
                        {e.partNumber}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default" className="text-xs">
                          पात्र
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isAdmin && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                            onClick={() => {
                              setSkipBloId(e.bloId);
                            }}
                            data-ocid={`honorarium.skip_button.${i + 1}`}
                          >
                            वगळा
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* वगळलेले BLO Sub-tab */}
      {subTab === "excluded" &&
        (filteredExcluded.length === 0 ? (
          <div
            className="flex flex-col items-center py-12 gap-2"
            data-ocid="honorarium.excluded.empty_state"
          >
            <span className="text-4xl">✅</span>
            <p className="text-muted-foreground">कोणतेही वगळलेले BLO नाहीत.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-red-50">
                  <TableHead>BLO नाव</TableHead>
                  <TableHead className="text-center">केंद्र क्र.</TableHead>
                  <TableHead>वगळण्याचे कारण</TableHead>
                  <TableHead>पर्यवेक्षक मंजुरी</TableHead>
                  <TableHead>कृती</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExcluded.map((e, i) => (
                  <TableRow
                    key={e.bloId}
                    className="bg-red-50/40"
                    data-ocid={`honorarium.excluded.item.${i + 1}`}
                  >
                    <TableCell className="font-medium">{e.bloName}</TableCell>
                    <TableCell className="text-center font-mono">
                      {e.partNumber}
                    </TableCell>
                    <TableCell className="text-sm text-red-700">
                      {e.reason ?? "अज्ञात"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (e as any).supervisorApproved ? "default" : "outline"
                        }
                        className="text-xs"
                      >
                        {(e as any).supervisorApproved ? "मंजूर" : "प्रलंबित"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {e.hasNotice && isAdmin && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              clearNotice.isPending ||
                              restoreEligibility.isPending
                            }
                            onClick={() => void handleSupervisorApproval(e)}
                            data-ocid={`honorarium.supervisor_approval_button.${i + 1}`}
                            className="text-xs"
                          >
                            पर्यवेक्षक मान्यता
                          </Button>
                        )}
                        {isAdmin && !e.hasNotice && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs text-green-700 border-green-300"
                            disabled={restoreEligibility.isPending}
                            onClick={() =>
                              void handleRestoreBlo(e.bloId, e.bloName)
                            }
                            data-ocid={`honorarium.restore_button.${i + 1}`}
                          >
                            पुनर्स्थापित
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
    </div>
  );
}

// ─── Add Honorarium Dialog ─────────────────────────────────────────────────────

interface AddDialogProps {
  open: boolean;
  onClose: () => void;
  blos: BLO[];
  supervisors: Supervisor[];
}

function AddHonorariumDialog({
  open,
  onClose,
  blos,
  supervisors,
}: AddDialogProps) {
  const [bloId, setBloId] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [quarter, setQuarter] = useState(QUARTERS[0]);
  const [year, setYear] = useState(String(currentYear));
  const [amount, setAmount] = useState(String(QUARTERLY_AMOUNT));
  const createMutation = useCreateHonorariumRecord();

  const handleSubmit = async () => {
    if (!bloId) {
      toast.error("BLO निवडा");
      return;
    }
    if (!supervisorId) {
      toast.error("पर्यवेक्षक निवडा");
      return;
    }
    const amtNum = Number(amount);
    if (Number.isNaN(amtNum) || amtNum <= 0) {
      toast.error("वैध रक्कम टाका");
      return;
    }
    try {
      await createMutation.mutateAsync({
        bloId,
        supervisorId,
        quarter: `${quarter} ${year}`,
        amount: amtNum,
        constituencyId: CONST_ID,
      });
      toast.success("मानधन नोंद तयार झाली");
      onClose();
    } catch {
      toast.error("मानधन नोंद तयार करताना त्रुटी आली");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" data-ocid="honorarium.add.dialog">
        <DialogHeader>
          <DialogTitle className="text-primary">नवीन मानधन नोंद</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div>
            <Label>BLO निवडा *</Label>
            <Select value={bloId} onValueChange={setBloId}>
              <SelectTrigger data-ocid="honorarium.add.blo.select">
                <SelectValue placeholder="BLO निवडा" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {blos.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} — केंद्र {b.partNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>पर्यवेक्षक निवडा *</Label>
            <Select value={supervisorId} onValueChange={setSupervisorId}>
              <SelectTrigger data-ocid="honorarium.add.supervisor.select">
                <SelectValue placeholder="पर्यवेक्षक निवडा" />
              </SelectTrigger>
              <SelectContent>
                {supervisors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>तिमाही *</Label>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger data-ocid="honorarium.add.quarter.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUARTERS.map((q) => (
                    <SelectItem key={q} value={q}>
                      {q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>वर्ष *</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger data-ocid="honorarium.add.year.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>रक्कम (₹) *</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5000"
              data-ocid="honorarium.add.amount.input"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            data-ocid="honorarium.add.cancel_button"
          >
            रद्द करा
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            data-ocid="honorarium.add.submit_button"
          >
            {createMutation.isPending ? "जतन होत आहे..." : "जतन करा"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Records Table ───────────────────────────────────────────────────────────

function RecordsTable({
  records,
  blos,
  supervisors,
  isAdmin,
}: {
  records: HonorariumRecord[];
  blos: BLO[];
  supervisors: Supervisor[];
  isAdmin: boolean;
}) {
  const approveMutation = useApproveHonorarium();
  const paidMutation = useMarkHonorariumPaid();
  const bloName = (id: string) => blos.find((b) => b.id === id)?.name ?? id;
  const supName = (id: string) =>
    supervisors.find((s) => s.id === id)?.name ?? id;

  if (records.length === 0) {
    return (
      <div
        className="flex flex-col items-center py-12 gap-2"
        data-ocid="honorarium.table.empty_state"
      >
        <span className="text-4xl">💰</span>
        <p className="text-muted-foreground">कोणतीही मानधन नोंद नाही.</p>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-lg border border-border"
      data-ocid="honorarium.records.table"
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>BLO नाव</TableHead>
            <TableHead>पर्यवेक्षक</TableHead>
            <TableHead>तिमाही</TableHead>
            <TableHead className="text-right">रक्कम</TableHead>
            <TableHead>स्थिती</TableHead>
            <TableHead>कृती</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r, i) => (
            <TableRow key={r.id} data-ocid={`honorarium.records.item.${i + 1}`}>
              <TableCell className="font-medium">{bloName(r.bloId)}</TableCell>
              <TableCell>
                {r.supervisorId ? supName(r.supervisorId) : "—"}
              </TableCell>
              <TableCell>{r.quarter}</TableCell>
              <TableCell className="text-right font-mono">
                ₹{Number(r.amount).toLocaleString("hi-IN")}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(r.status)}>
                  {statusLabel(r.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {isAdmin && r.status === "pending" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={approveMutation.isPending}
                      onClick={() =>
                        approveMutation.mutate(
                          {
                            recordId: r.id,
                            supervisorId: r.supervisorId ?? "",
                          },
                          {
                            onSuccess: () => toast.success("मंजूर झाले"),
                            onError: () => toast.error("मंजूर अयशस्वी"),
                          },
                        )
                      }
                      data-ocid={`honorarium.approve_button.${i + 1}`}
                    >
                      मंजूर
                    </Button>
                  )}
                  {isAdmin && r.status === "approved" && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={paidMutation.isPending}
                      onClick={() =>
                        paidMutation.mutate(r.id, {
                          onSuccess: () => toast.success("दिले म्हणून चिन्हांकित"),
                          onError: () => toast.error("अद्यतन अयशस्वी"),
                        })
                      }
                      data-ocid={`honorarium.paid_button.${i + 1}`}
                    >
                      दिले
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Summary Cards ───────────────────────────────────────────────────────────

function SummaryCards({ records }: { records: HonorariumRecord[] }) {
  const pending = records.filter((r) => r.status === "pending").length;
  const approved = records.filter((r) => r.status === "approved").length;
  const paid = records.filter((r) => r.status === "paid");
  const paidTotal = paid.reduce((s, r) => s + Number(r.amount), 0);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card data-ocid="honorarium.summary.pending">
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-xs text-muted-foreground">
            प्रलंबित
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <p className="text-2xl font-bold text-orange-600">{pending}</p>
        </CardContent>
      </Card>
      <Card data-ocid="honorarium.summary.approved">
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-xs text-muted-foreground">मंजूर</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <p className="text-2xl font-bold text-blue-600">{approved}</p>
        </CardContent>
      </Card>
      <Card data-ocid="honorarium.summary.paid">
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-xs text-muted-foreground">दिले</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <p className="text-2xl font-bold text-green-600">{paid.length}</p>
        </CardContent>
      </Card>
      <Card data-ocid="honorarium.summary.total">
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-xs text-muted-foreground">
            एकूण दिलेले
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <p className="text-xl font-bold text-primary">
            ₹{paidTotal.toLocaleString("hi-IN")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HonorariumManagement() {
  const isAdmin = isSuperAdminLoggedIn() || isAdminLoggedIn();
  const supervisor = getCurrentSupervisor();
  const supervisorId = supervisor?.id ?? "";

  const allRecordsQuery = useHonorariumByConstituency(CONST_ID);
  const supRecordsQuery = useHonorariumBySupervisor(supervisorId);
  const { data: allBLOs = [] } = useBLOs();
  const { data: supervisors = [] } = useSupervisors();
  const { data: eligibleBLOs = [] } = useEligibleBLOsForHonorarium(CONST_ID);
  const { data: allNotices = [] } = useNotices();

  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterQuarter, setFilterQuarter] = useState("all");

  // Multi-quarter selection state
  const [selectedQuarterPairs, setSelectedQuarterPairs] = useState<
    Array<{ year: string; quarter: string }>
  >([]);

  // Extra payment tab state
  const actor = useBackendActorCtx();
  const [extraBloSearch, setExtraBloSearch] = useState("");
  const [extraSelectedBloIds, setExtraSelectedBloIds] = useState<Set<string>>(
    new Set(),
  );
  const [extraAmount, setExtraAmount] = useState("");
  const [extraReason, setExtraReason] = useState("");
  const [extraSubmitting, setExtraSubmitting] = useState(false);
  // Use React Query hook for extra payments
  const {
    data: extraPaymentsData = [],
    isLoading: extraLoading,
    refetch: refetchExtraPayments,
  } = useExtraPaymentsByConstituency(CONST_ID);
  const extraPayments = extraPaymentsData.map((p: any) => ({
    ...p,
    amount: Number(p.amount),
    createdAt: Number(p.createdAt),
  }));

  const handleAddExtraPayment = async () => {
    const amt = Number(extraAmount);
    if (Number.isNaN(amt) || amt <= 0) {
      toast.error("वैध रक्कम टाका");
      return;
    }
    if (!extraReason.trim()) {
      toast.error("कारण टाका");
      return;
    }
    if (!actor) {
      toast.error("बॅकेंड उपलब्ध नाही");
      return;
    }
    const targetBloIds =
      extraSelectedBloIds.size > 0
        ? Array.from(extraSelectedBloIds)
        : allBLOs.map((b) => b.id);
    if (targetBloIds.length === 0) {
      toast.error("BLO निवडा");
      return;
    }
    setExtraSubmitting(true);
    try {
      await Promise.all(
        targetBloIds.map((bloId) =>
          actor.addExtraPayment(CONST_ID, {
            id: `extra-${Date.now()}-${bloId}-${Math.random().toString(36).slice(2)}`,
            bloId,
            reason: extraReason.trim(),
            amount: BigInt(amt),
            constituencyId: CONST_ID,
            status: "pending",
            createdAt: BigInt(Date.now() * 1_000_000),
          }),
        ),
      );
      toast.success(`अतिरिक्त भत्ता नोंद तयार झाली (${targetBloIds.length} BLO)`);
      setExtraSelectedBloIds(new Set());
      setExtraAmount("");
      setExtraReason("");
      setExtraBloSearch("");
      await refetchExtraPayments();
    } catch {
      toast.error("अतिरिक्त भत्ता जतन करताना त्रुटी आली");
    } finally {
      setExtraSubmitting(false);
    }
  };

  const rawRecords: HonorariumRecord[] = isAdmin
    ? (allRecordsQuery.data ?? [])
    : (supRecordsQuery.data ?? []);

  const isLoading = isAdmin
    ? allRecordsQuery.isLoading
    : supRecordsQuery.isLoading;

  // Build noticed BLO set to exclude from add dialog
  const noticedBLOIds = buildNoticedBLOSet(allNotices);

  // For Add dialog: only active BLOs without active notices
  const dialogBLOs = (eligibleBLOs.length > 0 ? eligibleBLOs : allBLOs).filter(
    (b) => b.status === "active" && !noticedBLOIds.has(b.id),
  );

  const activeSupervisors = supervisors.filter((s) => s.isActive);
  const allQuarters = [...new Set(rawRecords.map((r) => r.quarter))].sort();

  const filtered = rawRecords.filter((r) => {
    const blo = allBLOs.find((b) => b.id === r.bloId);
    const sup = supervisors.find((s) => s.id === r.supervisorId);
    const matchSearch =
      !search ||
      blo?.name.toLowerCase().includes(search.toLowerCase()) ||
      sup?.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const matchQuarter = filterQuarter === "all" || r.quarter === filterQuarter;
    return matchSearch && matchStatus && matchQuarter;
  });

  const handleExportRecords = () => {
    exportToExcel(
      `मानधन_नोंदी_${new Date().toISOString().slice(0, 10)}.csv`,
      ["BLO नाव", "पर्यवेक्षक", "तिमाही", "रक्कम (₹)", "स्थिती"],
      filtered.map((r) => [
        allBLOs.find((b) => b.id === r.bloId)?.name ?? r.bloId,
        supervisors.find((s) => s.id === r.supervisorId)?.name ??
          r.supervisorId ??
          "",
        r.quarter,
        Number(r.amount),
        statusLabel(r.status),
      ]),
    );
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-16"
        data-ocid="honorarium.loading_state"
      >
        <span className="text-muted-foreground animate-pulse">
          मानधन माहिती लोड होत आहे...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-ocid="honorarium.page">
      <div className="flex items-center gap-2">
        <IndianRupee size={20} className="text-primary" />
        <h2 className="text-lg font-bold text-primary">मानधन व्यवस्थापन</h2>
      </div>

      <Tabs defaultValue="eligibility">
        <TabsList className="mb-2 flex-wrap h-auto gap-1">
          <TabsTrigger
            value="eligibility"
            data-ocid="honorarium.eligibility.tab"
          >
            पात्रता
          </TabsTrigger>
          <TabsTrigger value="records" data-ocid="honorarium.records.tab">
            नोंदी
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="extra" data-ocid="honorarium.extra.tab">
              अतिरिक्त भत्ता
            </TabsTrigger>
          )}
          <TabsTrigger value="history" data-ocid="honorarium.history.tab">
            मानधन इतिहास
          </TabsTrigger>
          <TabsTrigger
            value="blo-mandhan"
            data-ocid="honorarium.blo_mandhan.tab"
          >
            BLO मानधन
          </TabsTrigger>
        </TabsList>
        <TabsContent value="eligibility">
          <EligibilityTab isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="records">
          <div className="flex flex-col gap-4">
            {/* Multi-quarter selection panel */}
            {isAdmin && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                  <Info size={13} /> अनेक तिमाहींसाठी एकत्र मानधन प्रक्रिया
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {YEARS.flatMap((y) =>
                    QUARTER_KEYS.map((q) => {
                      const key = `${y}-${q}`;
                      const isSelected = selectedQuarterPairs.some(
                        (p) => p.year === String(y) && p.quarter === q,
                      );
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`px-2 py-1 rounded text-xs border transition-colors ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-blue-700 border-blue-300 hover:bg-blue-100"
                          }`}
                          onClick={() => {
                            setSelectedQuarterPairs((prev) =>
                              isSelected
                                ? prev.filter(
                                    (p) =>
                                      !(
                                        p.year === String(y) && p.quarter === q
                                      ),
                                  )
                                : [...prev, { year: String(y), quarter: q }],
                            );
                          }}
                          data-ocid={`honorarium.multi_quarter.${key}`}
                        >
                          {QUARTER_LABELS[q]} {y}
                        </button>
                      );
                    }),
                  ).slice(0, 16)}
                </div>
                {selectedQuarterPairs.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-xs text-blue-700">निवडलेल्या:</span>
                    {selectedQuarterPairs.map((p) => (
                      <span
                        key={`${p.year}-${p.quarter}`}
                        className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs"
                      >
                        {QUARTER_LABELS[p.quarter]} {p.year}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedQuarterPairs((prev) =>
                              prev.filter(
                                (x) =>
                                  !(
                                    x.year === p.year && x.quarter === p.quarter
                                  ),
                              ),
                            )
                          }
                          className="ml-0.5 hover:text-red-600"
                          data-ocid="honorarium.multi_quarter.remove_chip"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      className="text-xs text-red-600 underline"
                      onClick={() => setSelectedQuarterPairs([])}
                    >
                      सर्व काढा
                    </button>
                  </div>
                )}
              </div>
            )}
            <SummaryCards records={rawRecords} />
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  className="max-w-xs"
                  placeholder="BLO किंवा पर्यवेक्षक शोधा..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-ocid="honorarium.search_input"
                />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger
                    className="w-36"
                    data-ocid="honorarium.status.select"
                  >
                    <SelectValue placeholder="स्थिती" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">सर्व स्थिती</SelectItem>
                    <SelectItem value="pending">प्रलंबित</SelectItem>
                    <SelectItem value="approved">मंजूर</SelectItem>
                    <SelectItem value="paid">दिले</SelectItem>
                  </SelectContent>
                </Select>
                {allQuarters.length > 0 && (
                  <Select
                    value={filterQuarter}
                    onValueChange={setFilterQuarter}
                  >
                    <SelectTrigger
                      className="w-48"
                      data-ocid="honorarium.quarter.select"
                    >
                      <SelectValue placeholder="तिमाही" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">सर्व तिमाही</SelectItem>
                      {allQuarters.map((q) => (
                        <SelectItem key={q} value={q}>
                          {q}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportRecords}
                  data-ocid="honorarium.export_button"
                >
                  <Download size={14} className="mr-1" /> Excel निर्यात
                </Button>
                {isAdmin && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowAdd(true)}
                    data-ocid="honorarium.add_button"
                  >
                    <PlusCircle size={14} className="mr-1" /> नवीन नोंद
                  </Button>
                )}
              </div>
            </div>
            <RecordsTable
              records={filtered}
              blos={allBLOs}
              supervisors={supervisors}
              isAdmin={isAdmin}
            />
            {isAdmin && (
              <AddHonorariumDialog
                open={showAdd}
                onClose={() => setShowAdd(false)}
                blos={dialogBLOs}
                supervisors={activeSupervisors}
              />
            )}
          </div>
        </TabsContent>
        {isAdmin && (
          <TabsContent value="extra">
            <div
              className="flex flex-col gap-4"
              data-ocid="honorarium.extra.content"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">अतिरिक्त भत्ता जोडा</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3">
                    <div>
                      <Label>BLO शोधा (नाव किंवा केंद्र क्रमांक)</Label>
                      <Input
                        placeholder="BLO नाव किंवा केंद्र क्रमांक टाका..."
                        value={extraBloSearch}
                        onChange={(e) => setExtraBloSearch(e.target.value)}
                        data-ocid="honorarium.extra.blo_search"
                      />
                      <div className="flex gap-2 mt-2 mb-2">
                        <button
                          type="button"
                          className="text-sm px-3 py-1 border border-blue-400 text-blue-600 rounded hover:bg-blue-50"
                          onClick={() =>
                            setExtraSelectedBloIds(
                              new Set(allBLOs.map((b) => b.id)),
                            )
                          }
                          data-ocid="honorarium.extra.select_all_button"
                        >
                          <CheckSquare size={13} className="inline mr-1" />
                          सर्व निवडा ({allBLOs.length})
                        </button>
                        <button
                          type="button"
                          className="text-sm px-3 py-1 border border-gray-400 text-gray-600 rounded hover:bg-gray-50"
                          onClick={() => setExtraSelectedBloIds(new Set())}
                          data-ocid="honorarium.extra.deselect_all_button"
                        >
                          सर्व रद्द करा
                        </button>
                      </div>
                      {extraBloSearch && (
                        <div className="border rounded-md mt-1 max-h-40 overflow-y-auto">
                          {allBLOs
                            .filter(
                              (b) =>
                                b.name
                                  .toLowerCase()
                                  .includes(extraBloSearch.toLowerCase()) ||
                                String(b.partNumber).includes(extraBloSearch),
                            )
                            .slice(0, 20)
                            .map((b) => (
                              <button
                                type="button"
                                key={b.id}
                                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2 ${
                                  extraSelectedBloIds.has(b.id)
                                    ? "bg-blue-50"
                                    : ""
                                }`}
                                onClick={() => {
                                  setExtraSelectedBloIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(b.id)) next.delete(b.id);
                                    else next.add(b.id);
                                    return next;
                                  });
                                  setExtraBloSearch("");
                                }}
                              >
                                <input
                                  type="checkbox"
                                  readOnly
                                  checked={extraSelectedBloIds.has(b.id)}
                                  className="accent-primary"
                                />
                                {b.name} — केंद्र {b.partNumber}
                              </button>
                            ))}
                        </div>
                      )}
                      {extraSelectedBloIds.size > 0 && (
                        <p className="text-xs text-green-700 mt-1 font-medium">
                          {extraSelectedBloIds.size} BLO निवडले आहेत
                        </p>
                      )}
                      {extraSelectedBloIds.size === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          (कोणीही निवडले नाही — 'सर्व निवडा' दाबल्यास सर्व BLO ला
                          भत्ता जोडला जाईल)
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>रक्कम (₹) *</Label>
                      <Input
                        type="number"
                        placeholder="रक्कम टाका"
                        value={extraAmount}
                        onChange={(e) => setExtraAmount(e.target.value)}
                        data-ocid="honorarium.extra.amount_input"
                      />
                    </div>
                    <div>
                      <Label>कारण *</Label>
                      <Input
                        placeholder="अतिरिक्त कामाचे कारण"
                        value={extraReason}
                        onChange={(e) => setExtraReason(e.target.value)}
                        data-ocid="honorarium.extra.reason_input"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={() => void handleAddExtraPayment()}
                      disabled={extraSubmitting}
                      data-ocid="honorarium.extra.submit_button"
                    >
                      {extraSubmitting
                        ? "जतन होत आहे..."
                        : `अतिरिक्त भत्ता जोडा${
                            extraSelectedBloIds.size > 0
                              ? ` (${extraSelectedBloIds.size} BLO)`
                              : " (सर्व BLO)"
                          }`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
        <TabsContent value="history">
          <div
            className="flex flex-col gap-4"
            data-ocid="honorarium.history.content"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">
                अतिरिक्त भत्ता इतिहास
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetchExtraPayments()}
                disabled={extraLoading}
                data-ocid="honorarium.history.load_button"
              >
                {extraLoading ? "लोड होत आहे..." : "ताजी माहिती आणा"}
              </Button>
            </div>
            {extraPayments.length === 0 ? (
              <div
                className="flex flex-col items-center py-12 gap-2"
                data-ocid="honorarium.history.empty"
              >
                <span className="text-4xl">📜</span>
                <p className="text-muted-foreground">
                  कोणताही अतिरिक्त भत्ता इतिहास नाही. वरील बटण दाबून माहिती आणा.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>BLO नाव</TableHead>
                      <TableHead>कारण</TableHead>
                      <TableHead className="text-right">रक्कम</TableHead>
                      <TableHead>स्थिती</TableHead>
                      <TableHead>दिनांक</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {extraPayments.map((p, i) => (
                      <TableRow
                        key={p.id}
                        data-ocid={`honorarium.history.item.${i + 1}`}
                      >
                        <TableCell>
                          {allBLOs.find((b) => b.id === p.bloId)?.name ??
                            p.bloId}
                        </TableCell>
                        <TableCell>{p.reason}</TableCell>
                        <TableCell className="text-right font-mono">
                          ₹{p.amount.toLocaleString("hi-IN")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              p.status === "paid" ? "default" : "outline"
                            }
                          >
                            {statusLabel(p.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(p.createdAt / 1_000_000).toLocaleDateString(
                            "mr-IN",
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="blo-mandhan">
          <BloMandhanTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
