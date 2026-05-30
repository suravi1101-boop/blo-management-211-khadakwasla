import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useMemo, useState } from "react";
import { PUNE_CONSTITUENCIES } from "../data/constituencyData";
import {
  useBLOs,
  useConstituencyConfigs,
  usePollingStations,
} from "../hooks/useQueries";

interface ConstituencyHomeProps {
  onSelectConstituency: (constituencyId: string) => void;
  onSuperAdminLogin: () => void;
}

export function ConstituencyHome({
  onSelectConstituency,
  onSuperAdminLogin,
}: ConstituencyHomeProps) {
  const { data: configs, isLoading } = useConstituencyConfigs();
  const [showContent, setShowContent] = useState(false);

  // Fallback: after 3 seconds, show content regardless of loading state
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Build a map of constituencyId -> enabled status
  const enabledMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (configs) {
      for (const cfg of configs) {
        map.set(cfg.id, cfg.isEnabled);
      }
    }
    // Default: only 211 enabled if backend returns nothing
    if (map.size === 0) {
      map.set("211", true);
      for (const c of PUNE_CONSTITUENCIES) {
        if (c.id !== "211") map.set(c.id, false);
      }
    }
    return map;
  }, [configs]);

  // Hidden Super Admin shortcut: Ctrl + Shift + A
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        onSuperAdminLogin();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSuperAdminLogin]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-primary/20 py-8 px-4 shadow-[0_2px_24px_rgba(0,212,255,0.08)]">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 border-2 border-primary/50 flex items-center justify-center text-2xl shadow-[0_0_16px_rgba(0,212,255,0.4)]">
              🗳️
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-primary drop-shadow-[0_0_8px_rgba(0,212,255,0.4)]">
            BLO व्यवस्थापन प्रणाली
          </h1>
          <p className="mt-2 text-base text-muted-foreground font-body">
            मतदारसंघ निवडा
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {isLoading && !showContent ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <Skeleton
                  key={`skel-${n}`}
                  className="h-32 rounded-xl bg-card/60 animate-pulse border border-primary/10"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {PUNE_CONSTITUENCIES.map((c) => {
                const isEnabled = enabledMap.get(c.id) ?? false;
                return (
                  <ConstituencyCard
                    key={c.id}
                    id={c.id}
                    name={c.name}
                    isEnabled={isEnabled}
                    onSelect={onSelectConstituency}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ConstituencyCard({
  id,
  name,
  isEnabled,
  onSelect,
}: {
  id: string;
  name: string;
  isEnabled: boolean;
  onSelect: (id: string) => void;
}) {
  const { data: blos = [] } = useBLOs();
  const { data: pollingStations = [] } = usePollingStations();
  const [showVacantModal, setShowVacantModal] = useState(false);

  const totalBLOs = new Set(blos.map((b) => b.partNumber)).size;

  const vacantStations = useMemo(() => {
    try {
      return pollingStations.filter((ps) => {
        const matched = blos.find(
          (b) =>
            String(b.partNumber) === String(ps.partNumber) && b.name?.trim(),
        );
        return !matched;
      });
    } catch {
      return [];
    }
  }, [blos, pollingStations]);

  const vacantBLOs = vacantStations.length;

  if (isEnabled) {
    return (
      <>
        <button
          type="button"
          onClick={() => onSelect(id)}
          data-ocid="constituency.card.enabled"
          className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-primary/30 bg-card p-6 transition-all duration-300 hover:border-primary hover:bg-primary/5 hover:shadow-[0_0_24px_rgba(0,212,255,0.25)] hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="text-4xl font-display font-bold text-primary drop-shadow-[0_0_8px_rgba(59,130,246,0.3)] group-hover:text-primary group-hover:drop-shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-300">
            {id}
          </span>
          <span className="mt-2 text-base font-body font-medium text-foreground text-center group-hover:text-primary transition-colors duration-200">
            {name}
          </span>
          <span className="mt-3 inline-flex items-center rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-xs font-medium text-primary">
            सक्रिय
          </span>
          <div className="flex gap-3 mt-2">
            <span className="bg-primary/10 border border-primary/20 text-primary px-2 py-1 rounded text-sm font-medium">
              एकूण BLO: {totalBLOs}
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                setShowVacantModal(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  setShowVacantModal(true);
                }
              }}
              data-ocid="constituency.vacant_blo_button"
              className="bg-destructive/15 border border-destructive/30 text-destructive px-2 py-1 rounded text-sm font-medium cursor-pointer hover:bg-destructive/25 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
            >
              रिक्त BLO: {vacantBLOs}
            </span>
          </div>
        </button>

        {/* Vacant Stations Modal */}
        {showVacantModal && (
          // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop close on click
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setShowVacantModal(false)}
            data-ocid="vacant_stations.dialog"
          >
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation */}
            <div
              className="relative bg-card rounded-xl border border-primary/30 shadow-[0_0_40px_rgba(0,212,255,0.15)] w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-primary/10 rounded-t-xl">
                <h2 className="text-lg font-display font-bold text-primary">
                  रिक्त मतदान केंद्रे — {name}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowVacantModal(false)}
                  data-ocid="vacant_stations.close_button"
                  className="text-muted-foreground hover:text-primary transition-colors text-2xl leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  aria-label="बंद करा"
                >
                  ×
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto flex-1 px-6 py-4">
                {vacantStations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground font-body">
                    सर्व केंद्रांवर BLO नियुक्त आहेत
                  </div>
                ) : (
                  <table className="w-full text-sm font-body border-collapse">
                    <thead>
                      <tr className="bg-primary/10 text-primary">
                        <th className="text-center px-3 py-2 border border-primary/15 font-semibold">
                          मतदान केंद्र क्रमांक
                        </th>
                        <th className="text-left px-3 py-2 border border-primary/15 font-semibold">
                          मतदान केंद्राचे नाव
                        </th>
                        <th className="text-left px-3 py-2 border border-primary/15 font-semibold">
                          मतदान केंद्राचे ठिकाण
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {vacantStations.map((ps, idx) => (
                        <tr
                          key={ps.partNumber}
                          data-ocid={`vacant_stations.item.${idx + 1}`}
                          className={
                            idx % 2 === 0 ? "bg-background" : "bg-primary/5"
                          }
                        >
                          <td className="text-center px-3 py-2 border border-primary/10 font-mono text-primary font-semibold">
                            {ps.partNumber}
                          </td>
                          <td className="px-3 py-2 border border-primary/10 text-foreground">
                            {ps.partName || "—"}
                          </td>
                          <td className="px-3 py-2 border border-primary/10 text-muted-foreground">
                            {ps.location || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 border-t border-primary/15 bg-primary/5 rounded-b-xl flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-body">
                  एकूण रिक्त केंद्रे:{" "}
                  <strong className="text-secondary">
                    {vacantStations.length}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setShowVacantModal(false)}
                  data-ocid="vacant_stations.cancel_button"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 shadow-[0_0_12px_rgba(0,212,255,0.3)] hover:shadow-[0_0_18px_rgba(0,212,255,0.5)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  बंद करा
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div
      data-ocid="constituency.card.disabled"
      data-disabled="true"
      className="disabled-constituency-card relative flex flex-col items-center justify-center rounded-xl border border-border/30 bg-card/30 p-6 opacity-40 grayscale select-none"
      style={{ pointerEvents: "none", touchAction: "none" }}
    >
      {/* Transparent overlay to catch any stray touch events */}
      <div
        className="absolute inset-0 z-10"
        style={{ touchAction: "none", pointerEvents: "none" }}
        aria-hidden="true"
      />
      <span className="text-4xl font-display font-bold text-muted-foreground">
        {id}
      </span>
      <span className="mt-2 text-base font-body font-medium text-muted-foreground text-center">
        {name}
      </span>
      <span className="mt-3 inline-flex items-center rounded-full bg-destructive/10 border border-destructive/20 px-3 py-1 text-xs font-medium text-destructive">
        सक्रिय नाही
      </span>
    </div>
  );
}
