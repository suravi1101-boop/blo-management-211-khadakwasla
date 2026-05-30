import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useBLOs, usePollingStations } from "../hooks/useQueries";

type StatusFilter = "सर्व" | "सक्रिय" | "प्रलंबित";

interface BLOListPageProps {
  showOnlyExcellent?: boolean;
}

export function BLOListPage({ showOnlyExcellent = false }: BLOListPageProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("सर्व");

  const { data: blos = [], isLoading } = useBLOs();
  const { data: stations = [] } = usePollingStations();

  const stationLocationMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stations) {
      if (s.location) map.set(s.partNumber, s.location);
    }
    return map;
  }, [stations]);

  const filtered = useMemo(() => {
    let list = showOnlyExcellent ? blos.filter((b) => b.isExcellent) : blos;
    if (statusFilter !== "सर्व") {
      const map: Record<string, string> = {
        सक्रिय: "active",
        प्रलंबित: "pending",
      };
      list = list.filter((b) => b.status === map[statusFilter]);
    }
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(
        (b) =>
          b.partNumber.toString().includes(s) ||
          b.partName.toLowerCase().includes(s) ||
          b.name.toLowerCase().includes(s),
      );
    }
    const sorted = [...list].sort(
      (a, b) => Number(a.partNumber) - Number(b.partNumber),
    );
    // Deduplicate by partNumber, keeping the first occurrence (most recent after sort)
    const seen = new Set<string>();
    return sorted.filter((blo) => {
      if (!blo.partNumber || seen.has(String(blo.partNumber))) return false;
      seen.add(String(blo.partNumber));
      return true;
    });
  }, [blos, showOnlyExcellent, search, statusFilter]);

  const exportExcel = () => {
    const rows = filtered.map((b) => ({
      "मतदान केंद्र क्रमांक": Number(b.partNumber),
      "मतदान केंद्राचे नाव": b.partName,
      "मतदान केंद्राचे ठिकाण": stationLocationMap.get(b.partNumber) || "-",
      "BLO नाव": b.name,
      "WhatsApp क्रमांक": b.phone,
      पदनाम: b.designation,
      स्थिती:
        b.status === "active"
          ? "सक्रिय"
          : b.status === "pending"
            ? "प्रलंबित"
            : "निष्क्रिय",
      "उत्कृष्ट BLO": b.isExcellent ? "होय" : "नाही",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BLO यादी");
    XLSX.writeFile(
      wb,
      showOnlyExcellent ? "उत्कृष्ट_BLO_यादी.xlsx" : "BLO_यादी.xlsx",
    );
  };

  const statusLabel = (s: string) =>
    s === "active" ? "सक्रिय" : s === "pending" ? "प्रलंबित" : "निष्क्रिय";
  const statusClass = (s: string) =>
    s === "active"
      ? "bg-green-100 text-green-800"
      : s === "pending"
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";

  return (
    <div className="flex flex-col gap-4" data-ocid="blo-list.page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-primary">
          {showOnlyExcellent ? "उत्कृष्ट BLO यादी" : "BLO मुख्य यादी"}
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={exportExcel}
          data-ocid="blo-list.export_button"
        >
          Excel निर्यात करा
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="मतदान केंद्र क्र. किंवा नाव शोधा..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
          data-ocid="blo-list.search_input"
        />
        <fieldset
          className="flex gap-1 border-0 p-0 m-0"
          aria-label="स्थिती फिल्टर"
        >
          {(["सर्व", "सक्रिय", "प्रलंबित"] as StatusFilter[]).map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
              data-ocid="blo-list.filter.tab"
            >
              {s}
            </Button>
          ))}
        </fieldset>
      </div>

      {isLoading ? (
        <div
          className="flex items-center justify-center py-12"
          data-ocid="blo-list.loading_state"
        >
          <span className="text-muted-foreground animate-pulse">
            लोड होत आहे...
          </span>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12 gap-2"
          data-ocid="blo-list.empty_state"
        >
          <span className="text-4xl">📋</span>
          <p className="text-muted-foreground">
            {search || statusFilter !== "सर्व"
              ? "कोणताही निकाल सापडला नाही"
              : "अद्याप कोणीही BLO नाही"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-3 py-2 text-center font-semibold text-foreground">
                  मतदान केंद्र क्रमांक
                </th>
                <th className="px-3 py-2 text-left font-semibold text-foreground min-w-48">
                  मतदान केंद्राचे नाव
                </th>
                <th className="px-3 py-2 text-left font-semibold text-foreground min-w-48">
                  मतदान केंद्राचे ठिकाण
                </th>
                <th className="px-3 py-2 text-left font-semibold text-foreground">
                  BLO नाव
                </th>
                <th className="px-3 py-2 text-left font-semibold text-foreground">
                  फोन
                </th>
                <th className="px-3 py-2 text-left font-semibold text-foreground">
                  पदनाम
                </th>
                <th className="px-3 py-2 text-left font-semibold text-foreground">
                  स्थिती
                </th>
                {showOnlyExcellent && (
                  <th className="px-3 py-2 text-left font-semibold text-foreground">
                    उत्कृष्ट
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <tr
                  key={b.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  data-ocid={`blo-list.item.${i + 1}`}
                >
                  <td className="px-3 py-2 font-mono text-center">
                    {Number(b.partNumber)}
                  </td>
                  <td className="px-3 py-2 font-medium">{b.partName}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {stationLocationMap.get(b.partNumber) || "-"}
                  </td>
                  <td className="px-3 py-2">{b.name}</td>
                  <td className="px-3 py-2 font-mono">{b.phone}</td>
                  <td className="px-3 py-2">{b.designation}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(b.status)}`}
                    >
                      {statusLabel(b.status)}
                    </span>
                  </td>
                  {showOnlyExcellent && (
                    <td className="px-3 py-2">
                      {b.isExcellent ? (
                        <span className="text-yellow-500">⭐</span>
                      ) : (
                        ""
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        एकूण: {filtered.length} BLO
      </p>
    </div>
  );
}
