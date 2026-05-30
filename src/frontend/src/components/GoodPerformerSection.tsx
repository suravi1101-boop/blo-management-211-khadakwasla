import { Star } from "lucide-react";
import { STATION_MAP } from "../data/stationData";
import { storage } from "../utils/storage";

export function GoodPerformerSection() {
  const allBLOs = storage.getBLOs();
  const allSupervisors = storage.getSupervisors();
  // Show all active BLOs as good performers since isGoodPerformer field no longer exists
  const goodBLOs = allBLOs.filter(
    (b) => (b as unknown as Record<string, unknown>).isGoodPerformer === true,
  );

  if (goodBLOs.length === 0) {
    return (
      <div
        className="text-center py-8 text-muted-foreground border border-dashed rounded-lg"
        data-ocid="good_performer.empty_state"
      >
        <p className="text-sm">
          अद्याप कोणत्याही BLO यांना 'चांगले काम' म्हणून चिन्हांकित केले नाही
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-yellow-50">
          <tr>
            <th className="text-left px-3 py-2 text-xs font-medium">भाग क्र.</th>
            <th className="text-left px-3 py-2 text-xs font-medium">
              मतदान केंद्र
            </th>
            <th className="text-left px-3 py-2 text-xs font-medium">BLO नाव</th>
            <th className="text-left px-3 py-2 text-xs font-medium">पद</th>
            <th className="text-left px-3 py-2 text-xs font-medium">कार्यालय</th>
            <th className="text-left px-3 py-2 text-xs font-medium">पर्यवेक्षक</th>
            <th className="text-left px-3 py-2 text-xs font-medium">
              WhatsApp
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {goodBLOs.map((blo, idx) => {
            const station = STATION_MAP.get(String(blo.pollingStationId));
            const supervisor = allSupervisors.find((s) =>
              s.assignedPartNumbers.includes(Number(blo.pollingStationId)),
            );
            return (
              <tr
                key={String(blo.id)}
                className="hover:bg-yellow-50/50"
                data-ocid={`good_performer.item.${idx + 1}`}
              >
                <td className="px-3 py-2 font-mono text-xs font-semibold">
                  {Number(blo.pollingStationId)}
                </td>
                <td className="px-3 py-2 text-xs">
                  {station?.stationName ?? "—"}
                </td>
                <td className="px-3 py-2 text-xs font-medium">
                  <span className="flex items-center gap-1">
                    <Star
                      size={10}
                      className="fill-yellow-500 text-yellow-500"
                    />
                    {blo.name || "रिक्त"}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">
                  {((blo as unknown as Record<string, unknown>)
                    .designation as string) || "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {((blo as unknown as Record<string, unknown>)
                    .office as string) || "—"}
                </td>
                <td className="px-3 py-2 text-xs">{supervisor?.name ?? "—"}</td>
                <td className="px-3 py-2 text-xs font-mono">
                  {blo.whatsapp ||
                    ((blo as unknown as Record<string, unknown>)
                      .whatsappNumber as string) ||
                    "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
