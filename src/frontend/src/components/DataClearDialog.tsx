import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { BLO } from "../types/domain";
import { getCurrentConstituency, storage } from "../utils/storage";
import type { Supervisor } from "../utils/storage";

const getTrashKey = () => `${getCurrentConstituency()}_admin_trash_items`;
const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface TrashItem {
  id: string;
  type: "supervisor" | "blo" | "supervisor_notices" | "blo_notices";
  label: string;
  data: unknown;
  deletedAt: string; // ISO
}

function getTrash(): TrashItem[] {
  try {
    const raw = localStorage.getItem(getTrashKey());
    if (!raw) return [];
    const items: TrashItem[] = JSON.parse(raw);
    // Auto-remove items older than 30 days
    const cutoff = Date.now() - TRASH_TTL_MS;
    return items.filter((i) => new Date(i.deletedAt).getTime() > cutoff);
  } catch {
    return [];
  }
}

function saveTrash(items: TrashItem[]) {
  localStorage.setItem(getTrashKey(), JSON.stringify(items));
}

function addToTrash(items: TrashItem[]) {
  const existing = getTrash();
  saveTrash([...items, ...existing]);
}

type ClearCategory =
  | "supervisor_data"
  | "supervisor_notices"
  | "blo_notices"
  | "blo_data";

const CATEGORIES: { id: ClearCategory; label: string; color: string }[] = [
  { id: "supervisor_data", label: "पर्यवेक्षक डेटा", color: "text-red-700" },
  {
    id: "supervisor_notices",
    label: "पर्यवेक्षक नोटीसा",
    color: "text-orange-700",
  },
  { id: "blo_notices", label: "BLO नोटीसा", color: "text-amber-700" },
  { id: "blo_data", label: "BLO डेटा", color: "text-purple-700" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  initialTab?: "clear" | "restore";
}

export function DataClearDialog({ open, onClose, initialTab }: Props) {
  const [tab, setTab] = useState<"clear" | "restore">(initialTab || "clear");

  // Sync tab when dialog opens with initialTab
  // handled via key prop on DialogContent

  // Selection state
  const [selectedSups, setSelectedSups] = useState<Set<string>>(new Set());
  const [selectedBLOs, setSelectedBLOs] = useState<Set<string>>(new Set());
  const [bloSearch, setBloSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<
    Set<ClearCategory>
  >(new Set());

  // Confirm
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Restore
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [selectedTrash, setSelectedTrash] = useState<Set<string>>(new Set());
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);

  const supervisors = storage.getSupervisors();
  const blos = storage.getBLOs();

  // Refresh trash when tab changes
  useEffect(() => {
    if (tab === "restore") setTrash(getTrash());
  }, [tab]);

  function toggleSup(id: string) {
    setSelectedSups((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }
  function toggleBLO(id: string) {
    setSelectedBLOs((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }
  function toggleCategory(cat: ClearCategory) {
    setSelectedCategories((prev) => {
      const s = new Set(prev);
      s.has(cat) ? s.delete(cat) : s.add(cat);
      return s;
    });
  }
  function selectAllSups() {
    setSelectedSups(new Set(supervisors.map((s) => s.id)));
  }
  function deselectAllSups() {
    setSelectedSups(new Set());
  }
  function selectAllBLOs() {
    setSelectedBLOs(new Set(blos.map((b) => b.id.toString())));
  }
  function deselectAllBLOs() {
    setSelectedBLOs(new Set());
  }

  const filteredBLOs = bloSearch.trim()
    ? blos.filter(
        (b) =>
          b.name?.toLowerCase().includes(bloSearch.toLowerCase()) ||
          b.pollingStationId.toString().includes(bloSearch.trim()) ||
          (
            ((b as unknown as Record<string, unknown>).office as string) ||
            b.address ||
            ""
          )
            .toLowerCase()
            .includes(bloSearch.toLowerCase()),
      )
    : blos;

  const canClear =
    selectedCategories.size > 0 &&
    (selectedSups.size > 0 ||
      selectedBLOs.size > 0 ||
      selectedCategories.has("supervisor_notices") ||
      selectedCategories.has("blo_notices"));

  function handleClear() {
    const trashItems: TrashItem[] = [];
    const now = new Date().toISOString();

    if (selectedCategories.has("supervisor_data") && selectedSups.size > 0) {
      const allSups = storage.getSupervisors();
      const toRemove = allSups.filter((s) => selectedSups.has(s.id));
      for (const s of toRemove) {
        trashItems.push({
          id: `sup_${s.id}_${Date.now()}`,
          type: "supervisor",
          label: s.name,
          data: s,
          deletedAt: now,
        });
      }
      storage.setSupervisors(allSups.filter((s) => !selectedSups.has(s.id)));
    }

    if (selectedCategories.has("blo_data") && selectedBLOs.size > 0) {
      const allBLOs = storage.getBLOs();
      const toRemove = allBLOs.filter((b) => selectedBLOs.has(b.id.toString()));
      for (const b of toRemove) {
        trashItems.push({
          id: `blo_${b.id}_${Date.now()}`,
          type: "blo",
          label: b.name || `भाग ${b.pollingStationId}`,
          data: b,
          deletedAt: now,
        });
      }
      storage.setBLOs(
        allBLOs.filter((b) => !selectedBLOs.has(b.id.toString())),
      );
    }

    if (selectedCategories.has("supervisor_notices")) {
      const allNotices = storage.getSupervisorNotices();
      const toRemove =
        selectedSups.size > 0
          ? allNotices.filter((n) => selectedSups.has(n.supervisorId))
          : allNotices;
      if (toRemove.length > 0) {
        trashItems.push({
          id: `sup_notices_${Date.now()}`,
          type: "supervisor_notices",
          label: `${toRemove.length} पर्यवेक्षक नोटीसा`,
          data: toRemove,
          deletedAt: now,
        });
        storage.setSupervisorNotices(
          selectedSups.size > 0
            ? allNotices.filter((n) => !selectedSups.has(n.supervisorId))
            : [],
        );
      }
    }

    if (selectedCategories.has("blo_notices")) {
      const allNotices = storage.getNotices();
      const toRemove =
        selectedBLOs.size > 0
          ? allNotices.filter((n) => selectedBLOs.has(n.bloId.toString()))
          : allNotices;
      if (toRemove.length > 0) {
        trashItems.push({
          id: `blo_notices_${Date.now()}`,
          type: "blo_notices",
          label: `${toRemove.length} BLO नोटीसा`,
          data: toRemove,
          deletedAt: now,
        });
        storage.setNotices(
          selectedBLOs.size > 0
            ? allNotices.filter((n) => !selectedBLOs.has(n.bloId.toString()))
            : [],
        );
      }
    }

    if (trashItems.length > 0) addToTrash(trashItems);

    toast.success(
      `${trashItems.length} रेकॉर्ड साफ केले. 30 दिवसांत restore करता येईल.`,
    );
    window.dispatchEvent(new Event("blo-data-updated"));
    setConfirmOpen(false);
    setSelectedSups(new Set());
    setSelectedBLOs(new Set());
    setSelectedCategories(new Set());
  }

  // Restore
  function toggleTrashItem(id: string) {
    setSelectedTrash((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }
  function selectAllTrash() {
    setSelectedTrash(new Set(trash.map((t) => t.id)));
  }

  function handleRestore() {
    const toRestore = trash.filter((t) => selectedTrash.has(t.id));
    for (const item of toRestore) {
      if (item.type === "supervisor") {
        const sups = storage.getSupervisors();
        const sup = item.data as Supervisor;
        if (!sups.find((s) => s.id === sup.id)) {
          storage.setSupervisors([...sups, sup]);
        }
      } else if (item.type === "blo") {
        const blosArr = storage.getBLOs();
        const blo = item.data as BLO;
        if (!blosArr.find((b) => b.id === blo.id)) {
          storage.setBLOs([...blosArr, blo]);
        }
      } else if (item.type === "supervisor_notices") {
        const existing = storage.getSupervisorNotices();
        const toAdd = item.data as typeof existing;
        storage.setSupervisorNotices([...existing, ...toAdd]);
      } else if (item.type === "blo_notices") {
        const existing = storage.getNotices();
        const toAdd = item.data as typeof existing;
        storage.setNotices([...existing, ...toAdd]);
      }
    }

    // Remove restored items from trash
    const remaining = trash.filter((t) => !selectedTrash.has(t.id));
    saveTrash(remaining);
    setTrash(remaining);
    setSelectedTrash(new Set());
    setRestoreConfirmOpen(false);
    toast.success(`${toRestore.length} रेकॉर्ड restore झाले!`);
    window.dispatchEvent(new Event("blo-data-updated"));
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            onClose();
          }
        }}
      >
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          data-ocid="admin.data_clear.dialog"
          key={`${open}-${initialTab}`}
        >
          <DialogHeader>
            <DialogTitle>🗑️ डेटा व्यवस्थापन</DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex border-b border-border mb-2">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === "clear"
                  ? "border-b-2 border-red-500 text-red-700"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTab("clear")}
              data-ocid="admin.data_clear.clear_tab"
            >
              🗑️ डेटा साफ करा
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === "restore"
                  ? "border-b-2 border-green-500 text-green-700"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTab("restore")}
              data-ocid="admin.data_clear.restore_tab"
            >
              ♻️ डेटा पुनर्संचयित करा
              {getTrash().length > 0 && (
                <Badge className="ml-2 bg-green-100 text-green-800 border border-green-200 hover:bg-green-100 text-xs">
                  {getTrash().length}
                </Badge>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {tab === "clear" ? (
              <>
                {/* Categories */}
                <div className="rounded-lg border border-border p-3 bg-muted/30">
                  <p className="text-xs font-semibold text-foreground mb-2">
                    कोणता डेटा साफ करायचा आहे? (एक किंवा अनेक निवडा)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleCategory(cat.id)}
                        onKeyDown={(e) =>
                          (e.key === "Enter" || e.key === " ") &&
                          toggleCategory(cat.id)
                        }
                      >
                        <Checkbox
                          checked={selectedCategories.has(cat.id)}
                          onCheckedChange={() => toggleCategory(cat.id)}
                          data-ocid={`admin.clear_category.${cat.id}`}
                        />
                        <span className={`text-sm font-medium ${cat.color}`}>
                          {cat.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Supervisors list */}
                {(selectedCategories.has("supervisor_data") ||
                  selectedCategories.has("supervisor_notices")) && (
                  <div className="rounded-lg border border-orange-200 p-3 bg-orange-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-orange-800">
                        पर्यवेक्षक निवडा ({selectedSups.size}/{supervisors.length})
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:underline"
                          onClick={selectAllSups}
                          data-ocid="admin.clear.select_all_sups"
                        >
                          सर्व निवडा
                        </button>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:underline"
                          onClick={deselectAllSups}
                          data-ocid="admin.clear.deselect_all_sups"
                        >
                          रद्द करा
                        </button>
                      </div>
                    </div>
                    {supervisors.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        कोणतेही पर्यवेक्षक नाहीत
                      </p>
                    ) : (
                      <div className="max-h-36 overflow-y-auto space-y-1">
                        {supervisors.map((sup) => (
                          <div
                            key={sup.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-orange-100 cursor-pointer"
                            onClick={() => toggleSup(sup.id)}
                            onKeyDown={(e) =>
                              (e.key === "Enter" || e.key === " ") &&
                              toggleSup(sup.id)
                            }
                          >
                            <Checkbox
                              checked={selectedSups.has(sup.id)}
                              onCheckedChange={() => toggleSup(sup.id)}
                              data-ocid={`admin.clear.sup_${sup.id}`}
                            />
                            <span className="text-sm text-foreground">
                              {sup.name}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {sup.designation || "पर्यवेक्षक"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* BLO list */}
                {(selectedCategories.has("blo_data") ||
                  selectedCategories.has("blo_notices")) && (
                  <div className="rounded-lg border border-purple-200 p-3 bg-purple-50/50">
                    {/* BLO Search */}
                    <div className="mb-2">
                      <input
                        type="text"
                        value={bloSearch}
                        onChange={(e) => setBloSearch(e.target.value)}
                        placeholder="BLO शोधा (नाव, भाग क्र., कार्यालय)"
                        className="w-full h-8 text-sm px-3 rounded-md border border-purple-300 bg-background focus:outline-none focus:ring-1 focus:ring-purple-400"
                        data-ocid="admin.clear.blo_search_input"
                      />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-purple-800">
                        BLO निवडा ({selectedBLOs.size}/{blos.length})
                        {bloSearch.trim() && (
                          <span className="ml-1 text-purple-600">
                            · {filteredBLOs.length} परिणाम
                          </span>
                        )}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:underline"
                          onClick={selectAllBLOs}
                          data-ocid="admin.clear.select_all_blos"
                        >
                          सर्व निवडा
                        </button>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:underline"
                          onClick={deselectAllBLOs}
                          data-ocid="admin.clear.deselect_all_blos"
                        >
                          रद्द करा
                        </button>
                      </div>
                    </div>
                    {blos.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        कोणतेही BLO नाहीत
                      </p>
                    ) : (
                      <div className="max-h-36 overflow-y-auto space-y-1">
                        {filteredBLOs.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-1">
                            {bloSearch.trim()
                              ? "कोणताही BLO सापडला नाही"
                              : "कोणतेही BLO नाहीत"}
                          </p>
                        ) : (
                          filteredBLOs.map((blo) => (
                            <div
                              key={blo.id.toString()}
                              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-purple-100 cursor-pointer"
                              onClick={() => toggleBLO(blo.id.toString())}
                              onKeyDown={(e) =>
                                (e.key === "Enter" || e.key === " ") &&
                                toggleBLO(blo.id.toString())
                              }
                            >
                              <Checkbox
                                checked={selectedBLOs.has(blo.id.toString())}
                                onCheckedChange={() =>
                                  toggleBLO(blo.id.toString())
                                }
                                data-ocid={`admin.clear.blo_${blo.id}`}
                              />
                              <span className="text-sm text-foreground">
                                {blo.name || "रिक्त"}
                              </span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                भाग {blo.pollingStationId.toString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Clear button */}
                <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 flex items-center justify-between gap-3">
                  <div className="text-xs text-red-700">
                    <p className="font-medium">
                      ⚠️ साफ केलेला डेटा 30 दिवसांसाठी trash मध्ये जाईल.
                    </p>
                    <p className="text-red-600 mt-0.5">
                      {selectedSups.size > 0 && `${selectedSups.size} पर्यवेक्षक`}
                      {selectedSups.size > 0 && selectedBLOs.size > 0 && ", "}
                      {selectedBLOs.size > 0 && `${selectedBLOs.size} BLO`}
                      {selectedCategories.size > 0 && " निवडले"}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={!canClear}
                    onClick={() => setConfirmOpen(true)}
                    data-ocid="admin.data_clear.clear_button"
                    className="flex-shrink-0"
                  >
                    <Trash2 size={14} className="mr-1" />
                    डेटा साफ करा
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Restore tab */}
                {trash.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <RotateCcw size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Trash रिकामा आहे.</p>
                    <p className="text-xs mt-1">
                      साफ केलेला डेटा 30 दिवसांसाठी येथे जतन होतो.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {trash.length} रेकॉर्ड trash मध्ये आहेत
                      </p>
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:underline"
                        onClick={selectAllTrash}
                        data-ocid="admin.restore.select_all"
                      >
                        सर्व निवडा
                      </button>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {trash.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                          data-ocid={`admin.restore.item_${item.id}`}
                          onClick={() => toggleTrashItem(item.id)}
                          onKeyDown={(e) =>
                            (e.key === "Enter" || e.key === " ") &&
                            toggleTrashItem(item.id)
                          }
                        >
                          <Checkbox
                            checked={selectedTrash.has(item.id)}
                            onCheckedChange={() => toggleTrashItem(item.id)}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">
                              {item.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.type === "supervisor"
                                ? "पर्यवेक्षक"
                                : item.type === "blo"
                                  ? "BLO"
                                  : item.type === "supervisor_notices"
                                    ? "पर्यवेक्षक नोटीसा"
                                    : "BLO नोटीसा"}
                              {" · "}
                              {new Date(item.deletedAt).toLocaleDateString(
                                "mr-IN",
                              )}
                            </p>
                          </div>
                          <AlertTriangle
                            size={14}
                            className="text-amber-500 flex-shrink-0"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={selectedTrash.size === 0}
                        onClick={() => setRestoreConfirmOpen(true)}
                        data-ocid="admin.restore.restore_button"
                      >
                        <RotateCcw size={14} className="mr-1" />
                        {selectedTrash.size > 0
                          ? `${selectedTrash.size} रेकॉर्ड Restore करा`
                          : "Restore करा"}
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                setTab("clear");
              }}
            >
              बंद करा
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm clear */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          className="max-w-sm"
          data-ocid="admin.data_clear.confirm.dialog"
        >
          <DialogHeader>
            <DialogTitle>⚠️ खात्री करा</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-red-700 font-medium">खालील डेटा साफ केला जाईल:</p>
            <ul className="text-xs text-foreground space-y-1 pl-3 list-disc">
              {selectedCategories.has("supervisor_data") &&
                selectedSups.size > 0 && (
                  <li>{selectedSups.size} पर्यवेक्षकांचा डेटा</li>
                )}
              {selectedCategories.has("blo_data") && selectedBLOs.size > 0 && (
                <li>{selectedBLOs.size} BLO चा डेटा</li>
              )}
              {selectedCategories.has("supervisor_notices") && (
                <li>
                  पर्यवेक्षक नोटीसा{" "}
                  {selectedSups.size > 0
                    ? `(${selectedSups.size} पर्यवेक्षक)`
                    : "(सर्व)"}
                </li>
              )}
              {selectedCategories.has("blo_notices") && (
                <li>
                  BLO नोटीसा{" "}
                  {selectedBLOs.size > 0
                    ? `(${selectedBLOs.size} BLO)`
                    : "(सर्व)"}
                </li>
              )}
            </ul>
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-md p-2">
              ✓ साफ केलेला डेटा Trash मध्ये 30 दिवसांसाठी जतन होईल आणि restore करता
              येईल.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              data-ocid="admin.data_clear.confirm.cancel_button"
            >
              रद्द करा
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClear}
              data-ocid="admin.data_clear.confirm.confirm_button"
            >
              होय, साफ करा
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm restore */}
      <Dialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
        <DialogContent
          className="max-w-sm"
          data-ocid="admin.restore.confirm.dialog"
        >
          <DialogHeader>
            <DialogTitle>♻️ Restore खात्री</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground">
            निवडलेले <strong>{selectedTrash.size}</strong> रेकॉर्ड restore केले जातील.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRestoreConfirmOpen(false)}
              data-ocid="admin.restore.confirm.cancel_button"
            >
              रद्द करा
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleRestore}
              data-ocid="admin.restore.confirm.confirm_button"
            >
              Restore करा
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
