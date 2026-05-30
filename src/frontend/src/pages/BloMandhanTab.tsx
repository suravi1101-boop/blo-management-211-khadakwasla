import { createActor } from "@/backend";
import type { BLO, BankDetails } from "@/backend";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Download, IndianRupee, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  useEligibleBLOsForHonorarium,
  useExtraPaymentsByConstituency,
  useHonorariumDistributions,
  useSetHonorariumDistribution,
  useSupervisorHonorariumRequests,
} from "../hooks/useQueries";
import { useBackendActorCtx } from "../lib/actorContext";

const CONST_ID = "211";
const QUARTERS = [
  { value: "Q1", label: "जानेवारी ते मार्च" },
  { value: "Q2", label: "एप्रिल ते जून" },
  { value: "Q3", label: "जुलै ते सप्टेंबर" },
  { value: "Q4", label: "ऑक्टोबर ते डिसेंबर" },
];

const YEARS = Array.from(
  { length: Math.max(5, new Date().getFullYear() + 2 - 2026 + 1) },
  (_, i) => 2026 + i,
);

export function BloMandhanTab() {
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear()),
  );
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");
  const [search, setSearch] = useState("");
  const [baseAmount, setBaseAmount] = useState("3500");
  const [isExporting, setIsExporting] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);

  const actor = useBackendActorCtx();

  const { data: eligibleBLOs = [], isLoading: eligibleLoading } =
    useEligibleBLOsForHonorarium(CONST_ID);
  const { data: distributions = [], isLoading: distLoading } =
    useHonorariumDistributions(CONST_ID);
  const { data: extraPayments = [], isLoading: extraLoading } =
    useExtraPaymentsByConstituency(CONST_ID);
  const { data: supervisorRequests = [], isLoading: reqLoading } =
    useSupervisorHonorariumRequests(CONST_ID);

  const setDistribution = useSetHonorariumDistribution();

  const quarterLabel =
    QUARTERS.find((q) => q.value === selectedQuarter)?.label ?? selectedQuarter;

  const filteredBLOs = useMemo(() => {
    if (!search.trim()) return eligibleBLOs;
    const q = search.toLowerCase();
    return eligibleBLOs.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        String(b.partNumber).includes(q) ||
        (b.bankAccount ?? "").toLowerCase().includes(q),
    );
  }, [eligibleBLOs, search]);

  const currentDistribution = useMemo(() => {
    return distributions.find(
      (d) => d.year === selectedYear && d.quarter === selectedQuarter,
    );
  }, [distributions, selectedYear, selectedQuarter]);

  const _extraForPeriod = useMemo(() => {
    return extraPayments.filter(
      (p) => p.year === selectedYear && p.quarter === selectedQuarter,
    );
  }, [extraPayments, selectedYear, selectedQuarter]);

  const extraByBloId = useMemo(() => {
    const map: Record<string, number> = {};
    // Use all extra payments (not filtered by period) so they always show
    for (const p of extraPayments) {
      const pYear = (p as any).year ?? "";
      const pQuarter = (p as any).quarter ?? "";
      // Match if period matches selection, or if no year/quarter on payment (legacy)
      if (
        !pYear ||
        !pQuarter ||
        (pYear === selectedYear && pQuarter === selectedQuarter)
      ) {
        map[p.bloId] = (map[p.bloId] ?? 0) + Number(p.amount);
      }
    }
    return map;
  }, [extraPayments, selectedYear, selectedQuarter]);

  const totalBase = filteredBLOs.length * Number(baseAmount || 0);
  const totalExtra = Object.values(extraByBloId).reduce((s, v) => s + v, 0);
  const grandTotal = totalBase + totalExtra;

  const handleDistribute = async () => {
    if (!baseAmount || Number(baseAmount) <= 0) {
      toast.error("वैध मानधन रक्कम टाका");
      return;
    }
    try {
      await setDistribution.mutateAsync({
        id: currentDistribution?.id ?? `dist-${Date.now()}`,
        constituencyId: CONST_ID,
        year: selectedYear,
        quarter: selectedQuarter,
        baseAmount: Number(baseAmount),
        createdBy: "admin",
        createdAt: Date.now(),
        note: `BLO मानधन — ${quarterLabel} ${selectedYear}`,
      } as any);
      toast.success(`मानधन वितरण जतन झाले — ${quarterLabel} ${selectedYear}`);
    } catch {
      toast.error("मानधन वितरण जतन करताना त्रुटी आली");
    }
  };

  const exportExcel = async () => {
    if (!actor) {
      toast.error("बॅकेंड उपलब्ध नाही");
      return;
    }
    if (filteredBLOs.length === 0) {
      toast.error("निर्यात करण्यासाठी BLO उपलब्ध नाहीत");
      return;
    }
    setIsExporting(true);
    try {
      const bankMap: Record<string, BankDetails | null> = {};
      await Promise.all(
        filteredBLOs.map(async (b) => {
          try {
            bankMap[b.id] = await actor.getBLOBankDetails(CONST_ID, b.id);
          } catch {
            bankMap[b.id] = null;
          }
        }),
      );

      const rows = filteredBLOs.map((b, idx) => {
        const bank = bankMap[b.id];
        const extra = extraByBloId[b.id] ?? 0;
        const total = Number(baseAmount || 0) + extra;
        return {
          "अनु. क्र.": idx + 1,
          "BLO यांचे नाव": b.name,
          "यादी भाग क्र.": b.partNumber,
          "खाते क्रमांक": bank?.accountNumber ?? b.bankAccount ?? "",
          "बँक चे नाव": bank?.bankName ?? "",
          "IFSC कोड": bank?.ifscCode ?? "",
          "बँक शाखा": bank?.branchName ?? "",
          "तिमाही(वर्ष)": `${quarterLabel} (${selectedYear})`,
          मानधन: Number(baseAmount || 0),
          "अतिरिक्त भत्ता/मानधन": extra,
          "एकूण देय मानधन": total,
        };
      });

      const wb = XLSX.utils.book_new();

      // Combined sheet
      const wsCombined = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, wsCombined, "BLO मानधन यादी");

      // Per-bank sheets
      const bankGroups: Record<string, typeof rows> = {};
      for (const r of rows) {
        const bankName = (r["बँक चे नाव"] as string) || "इतर";
        if (!bankGroups[bankName]) bankGroups[bankName] = [];
        bankGroups[bankName].push(r);
      }
      for (const [bankName, bankRows] of Object.entries(bankGroups)) {
        const safeName = bankName.slice(0, 31);
        const ws = XLSX.utils.json_to_sheet(bankRows);
        XLSX.utils.book_append_sheet(wb, ws, safeName);
      }

      XLSX.writeFile(wb, `BLO_मानधन_${selectedYear}_${selectedQuarter}.xlsx`);
      toast.success(`${filteredBLOs.length} BLO ची Excel निर्यात झाली`);
    } catch {
      toast.error("Excel निर्यात करताना त्रुटी आली");
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading =
    eligibleLoading || distLoading || extraLoading || reqLoading;

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-16"
        data-ocid="blomandhan.loading_state"
      >
        <span className="text-muted-foreground animate-pulse">
          मानधन माहिती लोड होत आहे...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-ocid="blomandhan.page">
      <div className="flex items-center gap-2">
        <IndianRupee size={20} className="text-primary" />
        <h2 className="text-lg font-bold text-primary">BLO मानधन व्यवस्थापन</h2>
      </div>

      {/* Supervisor Role Info Panel */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3">
        <span className="text-blue-600 mt-0.5 shrink-0 text-lg">ℹ️</span>
        <div>
          <p className="text-sm font-semibold text-blue-800 mb-1">
            पर्यवेक्षक यांची भूमिका
          </p>
          <p className="text-xs text-blue-700 leading-relaxed">
            नोटीस दिलेले किंवा निष्क्रिय BLO मानधनातून आपोआप वगळले जातात. पर्यवेक्षकाने
            मंजुरी दिल्यानंतरच admin त्या BLO ला पुन्हा मानधन यादीत घेउ शकतो. पर्यवेक्षक
            login मध्ये वगळलेले BLO दिसतात व ते मंजुरी/नकार देउ शकतात.
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end flex-wrap">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">वर्ष</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger
                  className="w-32"
                  data-ocid="blomandhan.year.select"
                >
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
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">तिमाही</Label>
              <Select
                value={selectedQuarter}
                onValueChange={setSelectedQuarter}
              >
                <SelectTrigger
                  className="w-44"
                  data-ocid="blomandhan.quarter.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUARTERS.map((q) => (
                    <SelectItem key={q.value} value={q.value}>
                      {q.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">
                मानधन रक्कम (₹)
              </Label>
              <Input
                type="number"
                className="w-32"
                value={baseAmount}
                onChange={(e) => setBaseAmount(e.target.value)}
                data-ocid="blomandhan.amount.input"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">BLO शोधा</Label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  className="pl-8"
                  placeholder="नाव, केंद्र क्रमांक, खाते क्रमांक..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-ocid="blomandhan.search_input"
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void exportExcel()}
              disabled={isExporting || filteredBLOs.length === 0}
              data-ocid="blomandhan.export_button"
            >
              <Download size={14} className="mr-1" />
              {isExporting ? "निर्यात होत आहे..." : "Excel निर्यात"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleDistribute()}
              disabled={setDistribution.isPending}
              data-ocid="blomandhan.distribute_button"
            >
              {setDistribution.isPending
                ? "जतन होत आहे..."
                : "मानधन वितरण जतन करा"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card data-ocid="blomandhan.summary.total_blo">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground">
              एकूण पात्र BLO
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold text-primary">
              {filteredBLOs.length}
            </p>
          </CardContent>
        </Card>
        <Card data-ocid="blomandhan.summary.base_total">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground">
              एकूण मानधन
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold text-blue-600">
              ₹{totalBase.toLocaleString("hi-IN")}
            </p>
          </CardContent>
        </Card>
        <Card data-ocid="blomandhan.summary.extra_total">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground">
              अतिरिक्त भत्ता
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold text-orange-600">
              ₹{totalExtra.toLocaleString("hi-IN")}
            </p>
          </CardContent>
        </Card>
        <Card data-ocid="blomandhan.summary.grand_total">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground">
              एकूण देय रक्कम
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold text-green-600">
              ₹{grandTotal.toLocaleString("hi-IN")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {filteredBLOs.length === 0 ? (
        <div
          className="flex flex-col items-center py-12 gap-2"
          data-ocid="blomandhan.empty_state"
        >
          <span className="text-4xl">💰</span>
          <p className="text-muted-foreground">
            {search
              ? "शोधाशी जुळणारे BLO सापडले नाहीत."
              : "कोणतेही पात्र BLO उपलब्ध नाहीत."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-center">अनु. क्र.</TableHead>
                <TableHead>BLO यांचे नाव</TableHead>
                <TableHead className="text-center">यादी भाग क्र.</TableHead>
                <TableHead>खाते क्रमांक</TableHead>
                <TableHead>बँक चे नाव</TableHead>
                <TableHead>IFSC कोड</TableHead>
                <TableHead>बँक शाखा</TableHead>
                <TableHead className="text-center">तिमाही(वर्ष)</TableHead>
                <TableHead className="text-right">मानधन</TableHead>
                <TableHead className="text-right">अतिरिक्त भत्ता/मानधन</TableHead>
                <TableHead className="text-right">एकूण देय मानधन</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBLOs.map((b, idx) => {
                const extra = extraByBloId[b.id] ?? 0;
                const total = Number(baseAmount || 0) + extra;
                return (
                  <TableRow key={b.id} data-ocid={`blomandhan.item.${idx + 1}`}>
                    <TableCell className="text-center font-mono">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="text-center font-mono">
                      {b.partNumber}
                    </TableCell>
                    <TableCell>
                      {(b as any).bankAccount ??
                        (b as any).accountNumber ??
                        b.bankAccount ??
                        "—"}
                    </TableCell>
                    <TableCell>
                      {(b as any).bankName ?? (b as any).bank ?? "—"}
                    </TableCell>
                    <TableCell>
                      {(b as any).ifscCode ?? (b as any).ifsc ?? "—"}
                    </TableCell>
                    <TableCell>
                      {(b as any).branchName ?? (b as any).branch ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {quarterLabel} ({selectedYear})
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{Number(baseAmount || 0).toLocaleString("hi-IN")}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {extra > 0 ? `₹${extra.toLocaleString("hi-IN")}` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      ₹{total.toLocaleString("hi-IN")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Excluded BLOs */}
      <div className="mt-6">
        <button
          type="button"
          className="text-sm font-medium text-red-700 border border-red-300 rounded px-3 py-1"
          onClick={() => setShowExcluded(!showExcluded)}
        >
          {showExcluded ? "वगळलेले BLO लपवा" : "वगळलेले BLO दाखवा"} (
          {eligibleBLOs.length - filteredBLOs.length})
        </button>
        {showExcluded && (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead className="bg-red-100">
                <tr>
                  <th className="border px-2 py-1">अनु.क्र.</th>
                  <th className="border px-2 py-1">BLO नाव</th>
                  <th className="border px-2 py-1">यादी भाग क्र.</th>
                  <th className="border px-2 py-1">वगळण्याचे कारण</th>
                </tr>
              </thead>
              <tbody>
                {eligibleBLOs
                  .filter((b) => !filteredBLOs.some((f) => f.id === b.id))
                  .map((e: any, i: number) => (
                    <tr key={e.id} className="bg-red-50">
                      <td className="border px-2 py-1 text-center">{i + 1}</td>
                      <td className="border px-2 py-1">{e.name ?? "-"}</td>
                      <td className="border px-2 py-1 text-center">
                        {e.partNumber ?? "-"}
                      </td>
                      <td className="border px-2 py-1">
                        {e.exclusionReason ?? "अज्ञात"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supervisor requests */}
      {supervisorRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">पर्यवेक्षक मानधन विनंत्या</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>पर्यवेक्षक</TableHead>
                    <TableHead>तिमाही</TableHead>
                    <TableHead className="text-center">BLO संख्या</TableHead>
                    <TableHead>स्थिती</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supervisorRequests.map((req, i) => (
                    <TableRow
                      key={req.id}
                      data-ocid={`blomandhan.request.item.${i + 1}`}
                    >
                      <TableCell className="font-medium">
                        {req.supervisorName}
                      </TableCell>
                      <TableCell>
                        {req.quarter} ({req.year})
                      </TableCell>
                      <TableCell className="text-center">
                        {req.bloIds.length}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            req.status === "approved"
                              ? "bg-green-100 text-green-700"
                              : req.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {req.status === "approved"
                            ? "मंजूर"
                            : req.status === "rejected"
                              ? "नाकारले"
                              : "प्रलंबित"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
