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
  useAavakJavakEntries,
  useAddAavakJavakEntry,
  useDeleteAavakJavakEntry,
} from "@/hooks/useQueries";
import type { AavakJavakEntry } from "@/hooks/useQueries";
import {
  Download,
  FileText,
  Filter,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

const DOC_TYPE_LABELS: Record<string, string> = {
  blo_notice: "BLO नोटीस",
  supervisor_notice: "पर्यवेक्षक नोटीस",
  blo_order: "BLO नियुक्ती आदेश",
  supervisor_order: "पर्यवेक्षक नियुक्ती आदेश",
  nodal_order: "नोडल अधिकारी आदेश",
  letter: "पत्र",
  other: "इतर",
};

const DOC_TYPES = Object.keys(DOC_TYPE_LABELS);

interface Props {
  isAdminLoggedIn: boolean;
  constituencyName: string;
  constituency?: string;
}

const emptyForm = () => ({
  documentType: "letter",
  entryType: "outward" as "inward" | "outward",
  date: new Date().toISOString().slice(0, 10),
  description: "",
  fromTo: "",
});

function formatDateMr(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function AavakJavakRegister({
  isAdminLoggedIn,
  constituencyName,
  constituency = "211",
}: Props) {
  const { data: entries = [], isLoading } = useAavakJavakEntries(constituency);
  const addEntry = useAddAavakJavakEntry();
  const deleteEntry = useDeleteAavakJavakEntry();

  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("all");
  const [activeEntryType, setActiveEntryType] = useState("all");
  const [activeFrom, setActiveFrom] = useState("");
  const [activeTo, setActiveTo] = useState("");
  const [pendingType, setPendingType] = useState("all");
  const [pendingEntryType, setPendingEntryType] = useState("all");
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<AavakJavakEntry | null>(
    null,
  );

  const hasActiveFilter =
    activeType !== "all" ||
    activeEntryType !== "all" ||
    activeFrom !== "" ||
    activeTo !== "";
  const hasPendingChanges =
    pendingType !== activeType ||
    pendingEntryType !== activeEntryType ||
    pendingFrom !== activeFrom ||
    pendingTo !== activeTo;

  async function handleAdd() {
    if (!form.description.trim() || !form.fromTo.trim()) {
      toast.error("तपशील आणि प्राप्तकर्त्याचे नाव आवश्यक आहे");
      return;
    }
    const entry: AavakJavakEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      documentType: form.documentType,
      entryType: form.entryType,
      referenceNumber: "",
      date: BigInt(new Date(form.date).getTime() * 1_000_000),
      createdBy: "प्रशासक",
      description: form.description,
      constituency,
      fromTo: form.fromTo,
    };
    try {
      await addEntry.mutateAsync(entry);
      setAddOpen(false);
      setForm(emptyForm());
      toast.success("नोंद यशस्वीरित्या जोडली");
    } catch (err) {
      toast.error(
        `नोंद जोडताना त्रुटी: ${err instanceof Error ? err.message : "पुन्हा प्रयत्न करा"}`,
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteEntry.mutateAsync({ id: deleteTarget.id, constituency });
      setDeleteTarget(null);
      toast.success("नोंद हटवली");
    } catch (err) {
      toast.error(
        `नोंद हटवताना त्रुटी: ${err instanceof Error ? err.message : "पुन्हा प्रयत्न करा"}`,
      );
    }
  }

  function applyFilter() {
    setActiveType(pendingType);
    setActiveEntryType(pendingEntryType);
    setActiveFrom(pendingFrom);
    setActiveTo(pendingTo);
  }

  function clearFilter() {
    setPendingType("all");
    setPendingEntryType("all");
    setPendingFrom("");
    setPendingTo("");
    setActiveType("all");
    setActiveEntryType("all");
    setActiveFrom("");
    setActiveTo("");
    setSearch("");
  }

  const getEntryDateStr = useCallback((entry: AavakJavakEntry) => {
    return new Date(Number(entry.date) / 1_000_000).toISOString().slice(0, 10);
  }, []);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const dateStr = getEntryDateStr(e);
      const matchSearch =
        !search ||
        e.referenceNumber.includes(search) ||
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.fromTo.toLowerCase().includes(search.toLowerCase());
      const matchType = activeType === "all" || e.documentType === activeType;
      const matchEntry =
        activeEntryType === "all" || e.entryType === activeEntryType;
      const matchFrom = !activeFrom || dateStr >= activeFrom;
      const matchTo = !activeTo || dateStr <= activeTo;
      return matchSearch && matchType && matchEntry && matchFrom && matchTo;
    });
  }, [
    entries,
    search,
    activeType,
    activeEntryType,
    activeFrom,
    activeTo,
    getEntryDateStr,
  ]);

  function handlePrint() {
    const rows = filtered
      .map(
        (e, i) =>
          `<tr>
            <td style="text-align:center">${i + 1}</td>
            <td style="text-align:center;font-weight:bold">${e.referenceNumber || "—"}</td>
            <td style="text-align:center">${e.entryType === "inward" ? "आवक" : "जावक"}</td>
            <td style="text-align:center">${formatDateMr(getEntryDateStr(e))}</td>
            <td>${DOC_TYPE_LABELS[e.documentType] || e.documentType}</td>
            <td>${e.fromTo}</td>
            <td>${e.description}</td>
          </tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>आवक-जावक नोंदवही</title><style>
      @page{size:A4 landscape;margin:12mm 10mm;}
      body{font-family:'Noto Sans Devanagari',Arial,sans-serif;font-size:9pt;color:#000;}
      .header{text-align:center;margin-bottom:6px;}
      .header h1{font-size:14pt;font-weight:bold;margin:0 0 2px;}
      .header h2{font-size:11pt;font-weight:bold;margin:0 0 4px;}
      .divider{border:none;border-top:2px solid #000;margin:4px 0;}
      table{width:100%;border-collapse:collapse;font-size:8.5pt;}
      th,td{border:1px solid #444;padding:3px 5px;vertical-align:top;}
      th{background:#d0e8f8;font-weight:bold;text-align:center;}
      tr:nth-child(even) td{background:#f9f9f9;}
      .footer{margin-top:10px;font-size:8pt;text-align:right;color:#555;}
    </style></head><body>
      <div class="header">
        <h1>आवक-जावक नोंदवही</h1>
        <h2>${constituencyName} विधानसभा मतदारसंघ</h2>
        <hr class="divider"/>
      </div>
      <table>
        <thead><tr>
          <th style="width:32px">क्र.</th>
          <th style="width:110px">संदर्भ क्रमांक</th>
          <th style="width:60px">आवक/जावक</th>
          <th style="width:80px">दिनांक</th>
          <th style="width:130px">दस्तऐवज प्रकार</th>
          <th style="width:140px">प्राप्तकर्ता/प्रेषक</th>
          <th>तपशील</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">एकूण नोंदी: ${filtered.length} &nbsp;|&nbsp; मुद्रण दिनांक: ${new Date().toLocaleDateString("mr-IN")}</div>
      <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};<\/script>
    </body></html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  function handleExcel() {
    const header = [
      "अ.क्र.",
      "संदर्भ क्रमांक",
      "आवक/जावक",
      "दिनांक",
      "दस्तऐवज प्रकार",
      "प्राप्तकर्ता/प्रेषक",
      "तपशील",
    ];
    const rows = filtered.map((e, i) => [
      i + 1,
      e.referenceNumber || "—",
      e.entryType === "inward" ? "आवक" : "जावक",
      formatDateMr(getEntryDateStr(e)),
      DOC_TYPE_LABELS[e.documentType] || e.documentType,
      e.fromTo,
      e.description,
    ]);
    const csv = [header, ...rows]
      .map((r) =>
        r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${constituency}_aavak_javak_register.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">आवक-जावक नोंदवही</h2>
          <p className="text-xs text-muted-foreground">
            {constituencyName} — सर्व पत्र, नोटीस, आदेश यांची नोंद
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdminLoggedIn && (
            <Button
              size="sm"
              onClick={() => setAddOpen(true)}
              data-ocid="javak.add_button"
            >
              <Plus size={14} className="mr-1" />
              नवीन नोंद करा
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            data-ocid="javak.print_button"
          >
            <Printer size={14} className="mr-1" />
            {hasActiveFilter ? `प्रिंट (${filtered.length})` : "प्रिंट"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExcel}
            data-ocid="javak.export_button"
          >
            <Download size={14} className="mr-1" />
            Excel
          </Button>
        </div>
      </div>

      {/* Entry type chips */}
      <div className="flex flex-wrap gap-2">
        {(["all", "inward", "outward"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setPendingEntryType(t);
              setActiveEntryType(t);
            }}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              activeEntryType === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/40 hover:bg-muted"
            }`}
            data-ocid={`javak.entry_type.${t}`}
          >
            {t === "all"
              ? `सर्व (${entries.length})`
              : t === "inward"
                ? `आवक (${entries.filter((e) => e.entryType === "inward").length})`
                : `जावक (${entries.filter((e) => e.entryType === "outward").length})`}
          </button>
        ))}
      </div>

      {/* Doc type chips */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setPendingType("all");
            setActiveType("all");
          }}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            activeType === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted/40 hover:bg-muted"
          }`}
          data-ocid="javak.filter.all"
        >
          सर्व प्रकार
        </button>
        {DOC_TYPES.map((t) => {
          const count = entries.filter((e) => e.documentType === t).length;
          if (count === 0) return null;
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                const next = activeType === t ? "all" : t;
                setPendingType(next);
                setActiveType(next);
              }}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                activeType === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 hover:bg-muted"
              }`}
              data-ocid={`javak.filter.${t}`}
            >
              {DOC_TYPE_LABELS[t]} ({count})
            </button>
          );
        })}
      </div>

      {/* Filters Panel */}
      <div className="rounded-lg border bg-card p-3 space-y-3">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1">
          <Search size={12} />
          फिल्टर व शोध
        </p>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="javak-search"
              className="text-[10px] text-muted-foreground font-medium"
            >
              शोधा
            </label>
            <div className="relative">
              <Search
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={12}
              />
              <Input
                id="javak-search"
                className="pl-7 h-8 text-xs w-44"
                placeholder="संदर्भ क्र./तपशील/नाव..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-ocid="javak.search_input"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="javak-type"
              className="text-[10px] text-muted-foreground font-medium"
            >
              दस्तऐवज प्रकार
            </label>
            <select
              id="javak-type"
              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring w-40"
              value={pendingType}
              onChange={(e) => setPendingType(e.target.value)}
              data-ocid="javak.type.select"
            >
              <option value="all">सर्व प्रकार</option>
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOC_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="javak-from"
              className="text-[10px] text-muted-foreground font-medium"
            >
              दिनांक पासून
            </label>
            <Input
              id="javak-from"
              className="h-8 text-xs w-34"
              type="date"
              value={pendingFrom}
              onChange={(e) => setPendingFrom(e.target.value)}
              data-ocid="javak.filter_from.input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="javak-to"
              className="text-[10px] text-muted-foreground font-medium"
            >
              दिनांक पर्यंत
            </label>
            <Input
              id="javak-to"
              className="h-8 text-xs w-34"
              type="date"
              value={pendingTo}
              onChange={(e) => setPendingTo(e.target.value)}
              data-ocid="javak.filter_to.input"
            />
          </div>
          <div className="flex gap-2 items-end">
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={applyFilter}
              disabled={!hasPendingChanges}
              data-ocid="javak.apply_filter.button"
            >
              <Filter size={12} className="mr-1" />
              फिल्टर लावा
            </Button>
            {(hasActiveFilter || search) && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={clearFilter}
                data-ocid="javak.clear_filter.button"
              >
                <X size={12} className="mr-1" />
                साफ करा
              </Button>
            )}
          </div>
        </div>
        {hasActiveFilter && (
          <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-border">
            <span className="text-[10px] text-muted-foreground font-medium">
              सक्रिय फिल्टर:
            </span>
            {activeType !== "all" && (
              <span className="bg-primary/10 text-primary border border-primary/30 rounded-full px-2 py-0.5 text-[10px] font-medium flex items-center gap-1">
                {DOC_TYPE_LABELS[activeType]}
                <button
                  type="button"
                  onClick={() => {
                    setActiveType("all");
                    setPendingType("all");
                  }}
                >
                  <X size={9} />
                </button>
              </span>
            )}
            {activeEntryType !== "all" && (
              <span className="bg-primary/10 text-primary border border-primary/30 rounded-full px-2 py-0.5 text-[10px] font-medium flex items-center gap-1">
                {activeEntryType === "inward" ? "आवक" : "जावक"}
                <button
                  type="button"
                  onClick={() => {
                    setActiveEntryType("all");
                    setPendingEntryType("all");
                  }}
                >
                  <X size={9} />
                </button>
              </span>
            )}
            {(activeFrom || activeTo) && (
              <span className="bg-primary/10 text-primary border border-primary/30 rounded-full px-2 py-0.5 text-[10px] font-medium flex items-center gap-1">
                {activeFrom ? formatDateMr(activeFrom) : "सुरुवात"} ते{" "}
                {activeTo ? formatDateMr(activeTo) : "आजपर्यंत"}
                <button
                  type="button"
                  onClick={() => {
                    setActiveFrom("");
                    setActiveTo("");
                    setPendingFrom("");
                    setPendingTo("");
                  }}
                >
                  <X size={9} />
                </button>
              </span>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto">
              {filtered.length} / {entries.length} नोंदी
            </span>
          </div>
        )}
        {!hasActiveFilter && (
          <div className="flex justify-end">
            <span className="text-xs text-muted-foreground">
              {filtered.length} नोंदी
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div
          className="text-center py-12 text-muted-foreground"
          data-ocid="javak.loading_state"
        >
          <p className="text-sm">माहिती लोड होत आहे...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="text-center py-12 text-muted-foreground"
          data-ocid="javak.empty_state"
        >
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">कोणतीही नोंद सापडली नाही</p>
          {hasActiveFilter && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={clearFilter}
              data-ocid="javak.empty_clear_filter.button"
            >
              <X size={12} className="mr-1" /> फिल्टर काढा
            </Button>
          )}
          {!hasActiveFilter && isAdminLoggedIn && (
            <p className="text-xs mt-1">"नवीन नोंद करा" वर click करा</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/60 border-b">
                <th className="px-3 py-2 text-center font-semibold w-8">#</th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  संदर्भ क्र.
                </th>
                <th className="px-3 py-2 text-center font-semibold whitespace-nowrap">
                  आवक/जावक
                </th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  दिनांक
                </th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  दस्तऐवज प्रकार
                </th>
                <th className="px-3 py-2 text-left font-semibold">
                  प्राप्तकर्ता/प्रेषक
                </th>
                <th className="px-3 py-2 text-left font-semibold">तपशील</th>
                {isAdminLoggedIn && (
                  <th className="px-3 py-2 text-center font-semibold">क्रिया</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, idx) => (
                <tr
                  key={entry.id}
                  className={`border-b hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/20"}`}
                  data-ocid={`javak.item.${idx + 1}`}
                >
                  <td className="px-3 py-2 text-center text-muted-foreground">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2 font-mono font-semibold text-primary whitespace-nowrap">
                    {entry.referenceNumber || "—"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Badge
                      variant="outline"
                      className={`text-[10px] whitespace-nowrap ${
                        entry.entryType === "inward"
                          ? "bg-green-50 text-green-700 border-green-300"
                          : "bg-blue-50 text-blue-700 border-blue-300"
                      }`}
                    >
                      {entry.entryType === "inward" ? "आवक" : "जावक"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatDateMr(getEntryDateStr(entry))}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] whitespace-nowrap"
                    >
                      {DOC_TYPE_LABELS[entry.documentType] ||
                        entry.documentType}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{entry.fromTo}</p>
                  </td>
                  <td className="px-3 py-2 max-w-[200px]">
                    <p className="truncate" title={entry.description}>
                      {entry.description}
                    </p>
                  </td>
                  {isAdminLoggedIn && (
                    <td className="px-3 py-2 text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(entry)}
                        title="हटवा"
                        data-ocid={`javak.delete_button.${idx + 1}`}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Entry Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg" data-ocid="javak.add.dialog">
          <DialogHeader>
            <DialogTitle>नवीन नोंद करा</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">आवक / जावक *</Label>
                <select
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.entryType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      entryType: e.target.value as "inward" | "outward",
                    })
                  }
                  data-ocid="javak.add.entry_type.select"
                >
                  <option value="outward">जावक</option>
                  <option value="inward">आवक</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">दिनांक *</Label>
                <Input
                  className="mt-1 h-9"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  data-ocid="javak.add.date.input"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">दस्तऐवज प्रकार *</Label>
              <select
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.documentType}
                onChange={(e) =>
                  setForm({ ...form, documentType: e.target.value })
                }
                data-ocid="javak.add.type.select"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DOC_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">प्राप्तकर्ता / प्रेषक नाव *</Label>
              <Input
                className="mt-1 h-9"
                value={form.fromTo}
                onChange={(e) => setForm({ ...form, fromTo: e.target.value })}
                placeholder={
                  form.entryType === "inward"
                    ? "कुठून आले (प्रेषकाचे नाव)"
                    : "कुणाला पाठवले (प्राप्तकर्त्याचे नाव)"
                }
                data-ocid="javak.add.from_to.input"
              />
            </div>
            <div>
              <Label className="text-xs">तपशील *</Label>
              <textarea
                className="mt-1 w-full h-16 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="पत्र/आदेशाचा तपशील..."
                data-ocid="javak.add.description.textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAddOpen(false);
                setForm(emptyForm());
              }}
              data-ocid="javak.add.cancel_button"
            >
              रद्द करा
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={
                !form.description.trim() ||
                !form.fromTo.trim() ||
                addEntry.isPending
              }
              data-ocid="javak.add.submit_button"
            >
              {addEntry.isPending ? "जतन करत आहे..." : "नोंद जतन करा"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Dialog
          open={!!deleteTarget}
          onOpenChange={(v) => !v && setDeleteTarget(null)}
        >
          <DialogContent className="max-w-sm" data-ocid="javak.delete.dialog">
            <DialogHeader>
              <DialogTitle className="text-destructive">नोंद हटवा?</DialogTitle>
            </DialogHeader>
            <p className="text-sm">
              संदर्भ:{" "}
              <strong>{deleteTarget.referenceNumber || deleteTarget.id}</strong>{" "}
              — ही नोंद कायमची हटवली जाईल.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                data-ocid="javak.delete.cancel_button"
              >
                रद्द करा
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteEntry.isPending}
                data-ocid="javak.delete.confirm_button"
              >
                {deleteEntry.isPending ? "हटवत आहे..." : "हटवा"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default AavakJavakRegister;
