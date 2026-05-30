import { createActor } from "@/backend";
import type { BLO } from "@/types/domain";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

const CONST_ID = "211";
const PAGE_SIZE = 100;

function useBLOsForVoterId(constituencyId: string = CONST_ID) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<BLO[]>({
    queryKey: ["blos", constituencyId],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getBLOs(constituencyId);
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });
}

export interface BLOVoterIdPageProps {
  constituencyId?: string;
}

export function BLOVoterIdPage({
  constituencyId = CONST_ID,
}: BLOVoterIdPageProps) {
  const { data: blos = [], isLoading } = useBLOsForVoterId(constituencyId);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Deduplicate by partNumber — keep most recently updated
  const dedupedBLOs = useMemo(() => {
    const map = new Map<string, BLO>();
    for (const blo of blos) {
      const existing = map.get(String(blo.partNumber));
      if (
        !existing ||
        ((blo as any).updatedAt ?? BigInt(0)) >
          ((existing as any).updatedAt ?? BigInt(0))
      ) {
        map.set(String(blo.partNumber), blo);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => Number(a.partNumber) - Number(b.partNumber),
    );
  }, [blos]);

  // Only show BLOs that have a name (not vacant stations)
  const withName = dedupedBLOs.filter((b) => b.name && b.name.trim() !== "");

  // Real-time filter by partNumber or BLO name
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return withName;
    return withName.filter(
      (b) =>
        String(b.partNumber).includes(q) ||
        (b.name ?? "").toLowerCase().includes(q),
    );
  }, [withName, searchTerm]);

  const getVoterId = (b: BLO): string => {
    const legacy = b as unknown as { voterId?: string; aadhaar?: string };
    return b.epicNumber || legacy.voterId || legacy.aadhaar || "—";
  };

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const handleExport = () => {
    const rows = filtered.map((b, i) => ({
      अनुक्रमांक: i + 1,
      "यादिभाग क्रमांक": Number(b.partNumber),
      "BLO चे नाव": b.name ?? "",
      "BLO मतदान ओळखपत्र क्रमांक": getVoterId(b),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BLO ओळखपत्र");
    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `BLO-voter-id-${dateStr}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-4" data-ocid="blo-voter-id.page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2
          className="text-lg font-bold text-primary"
          data-ocid="blo-voter-id.title"
        >
          BLO मतदान ओळखपत्र क्रमांक यादी
        </h2>
        <span className="text-sm text-muted-foreground">
          एकूण BLO: {withName.length}
          {searchTerm.trim() && ` (फिल्टर: ${filtered.length})`}
        </span>
      </div>

      {/* Search + Export toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="यादिभाग क्रमांक किंवा BLO नाव शोधा..."
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          data-ocid="blo-voter-id.search_input"
        />
        <button
          type="button"
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors whitespace-nowrap"
          data-ocid="blo-voter-id.export_button"
        >
          📥 Excel निर्यात
        </button>
      </div>

      {isLoading ? (
        <div
          className="flex items-center justify-center py-16"
          data-ocid="blo-voter-id.loading_state"
        >
          <span className="text-muted-foreground animate-pulse">
            लोड होत आहे...
          </span>
        </div>
      ) : withName.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 gap-2"
          data-ocid="blo-voter-id.empty_state"
        >
          <span className="text-4xl">📋</span>
          <p className="text-muted-foreground">अद्याप BLO यादी उपलब्ध नाही.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 gap-2"
          data-ocid="blo-voter-id.no_results_state"
        >
          <span className="text-4xl">🔍</span>
          <p className="text-muted-foreground">
            &quot;{searchTerm}&quot; साठी कोणताही BLO सापडला नाही.
          </p>
        </div>
      ) : (
        <>
          <div
            className="overflow-x-auto rounded-lg border border-border bg-card"
            data-ocid="blo-voter-id.table"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-100 border-b">
                  <th className="px-3 py-2.5 text-center font-semibold text-blue-900 w-16">
                    अनुक्रमांक
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold text-blue-900 w-40">
                    यादिभाग क्रमांक
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-blue-900">
                    BLO चे नाव
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold text-blue-900">
                    BLO मतदान ओळखपत्र क्रमांक
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((b, i) => (
                  <tr
                    key={b.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                    data-ocid={`blo-voter-id.item.${(currentPage - 1) * PAGE_SIZE + i + 1}`}
                  >
                    <td className="px-3 py-2 text-center tabular-nums font-mono">
                      {(currentPage - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums font-mono font-medium">
                      {Number(b.partNumber)}
                    </td>
                    <td className="px-3 py-2 font-medium">{b.name}</td>
                    <td className="px-3 py-2 text-center font-mono tracking-wide">
                      {getVoterId(b)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 pt-2">
              <span className="text-sm text-muted-foreground">
                पान {currentPage} / {totalPages} (एकूण {filtered.length})
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-md border border-input bg-background text-sm hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  data-ocid="blo-voter-id.pagination_prev"
                >
                  ← मागील
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = idx + 1;
                  } else if (currentPage <= 3) {
                    pageNum = idx + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + idx;
                  } else {
                    pageNum = currentPage - 2 + idx;
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                        pageNum === currentPage
                          ? "bg-primary text-primary-foreground"
                          : "border border-input bg-background hover:bg-muted"
                      }`}
                      data-ocid={`blo-voter-id.pagination.page.${pageNum}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-md border border-input bg-background text-sm hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  data-ocid="blo-voter-id.pagination_next"
                >
                  पुढील →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
