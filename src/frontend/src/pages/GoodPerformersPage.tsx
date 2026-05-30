import { Star } from "lucide-react";
import { GoodPerformerSection } from "../components/GoodPerformerSection";

export function GoodPerformersPage() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Star size={20} className="fill-yellow-500 text-yellow-500" />
          <h2 className="text-xl font-semibold">उत्कृष्ट BLO यादी</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          चांगले काम करणारे बूथ स्तरीय अधिकारी (BLO) — पर्यवेक्षकांनी नोंद केलेले
        </p>
      </div>

      <div className="border border-yellow-200 rounded-lg bg-yellow-50/30 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Star size={14} className="fill-yellow-500 text-yellow-500" />
          <span className="text-xs font-semibold text-yellow-800">
            उत्कृष्ट BLO (चांगले काम करणारे) — ही यादी सर्वांना दिसते
          </span>
        </div>
        <GoodPerformerSection />
      </div>
    </div>
  );
}
