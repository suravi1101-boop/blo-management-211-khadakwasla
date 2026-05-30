import { createActor } from "@/backend";
import { toast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDeleteNodalOfficer, useDeleteSupervisor } from "@/hooks/useQueries";
import {
  getCurrentSupervisor,
  isAdminLoggedIn,
  isSuperAdminLoggedIn,
} from "@/lib/auth";
import {
  getDeleteHistory,
  getNodalOfficers,
  getPollingStations,
  getSupervisors,
  recordDeletion,
  saveSupervisor,
  updateSupervisor,
} from "@/lib/backendService";
import type {
  DeleteRecord,
  PollingStation,
  Supervisor,
} from "@/lib/backendService";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const CONST_ID = "211";

// ─── Centre Search + Selection sub-component ────────────────────────────────
interface CentrePickerProps {
  stations: PollingStation[];
  selectedIds: string[];
  onToggle: (id: string, checked: boolean) => void;
  labelPrefix?: string;
}

function CentrePicker({
  stations,
  selectedIds,
  onToggle,
  labelPrefix = "supervisors.form",
}: CentrePickerProps) {
  const [search, setSearch] = useState("");

  const sorted = useMemo(
    () =>
      [...stations].sort((a, b) => Number(a.partNumber) - Number(b.partNumber)),
    [stations],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (s) =>
        String(s.partNumber).includes(q) ||
        s.partName.toLowerCase().includes(q),
    );
  }, [sorted, search]);

  // Show checked ones first within the filtered list
  const displayed = useMemo(() => {
    const checked = filtered.filter((s) => selectedIds.includes(s.id));
    const unchecked = filtered.filter((s) => !selectedIds.includes(s.id));
    return [...checked, ...unchecked];
  }, [filtered, selectedIds]);

  return (
    <div className="flex flex-col gap-2">
      {/* Search input */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="केंद्र क्रमांक टाका"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm h-8"
          data-ocid={`${labelPrefix}.centre_search.input`}
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {filtered.length} / {stations.length} केंद्रे
        </span>
      </div>

      {/* Selected count badge */}
      {selectedIds.length > 0 && (
        <p className="text-xs font-medium text-primary">
          {selectedIds.length} केंद्रे नियुक्त
        </p>
      )}

      {/* Centre list */}
      <div className="max-h-52 overflow-y-auto border border-border rounded-md">
        {stations.length === 0 ? (
          <p className="text-muted-foreground text-sm p-3">
            कोणतेही मतदान केंद्र उपलब्ध नाही. आधी मतदान केंद्रे आयात करा.
          </p>
        ) : displayed.length === 0 ? (
          <p className="text-muted-foreground text-sm p-3">
            कोणते केंद्र आढळले नाही.
          </p>
        ) : (
          displayed.map((st) => {
            const isChecked = selectedIds.includes(st.id);
            return (
              <label
                key={st.id}
                className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 hover:bg-muted/30 ${
                  isChecked ? "bg-primary/5" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => onToggle(st.id, e.target.checked)}
                  className="accent-primary"
                />
                <span className="text-sm">
                  <span className="font-mono font-semibold text-primary">
                    {Number(st.partNumber)}
                  </span>{" "}
                  — {st.partName}
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Centre Search + Selection sub-component (for form) ─────────────────────
interface CentreSearchPickerProps {
  stations: PollingStation[];
  supervisors: Supervisor[];
  editingSupervisorId?: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

function CentreSearchPicker({
  stations,
  supervisors,
  editingSupervisorId,
  selectedIds,
  onChange,
}: CentreSearchPickerProps) {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [directNum, setDirectNum] = useState("");
  const [directError, setDirectError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const assignedToOthers = useMemo(() => {
    const map = new Map<string, string>();
    for (const sup of supervisors) {
      if (sup.id === editingSupervisorId) continue;
      for (const sid of sup.assignedStationIds) {
        if (!map.has(sid)) map.set(sid, sup.name);
      }
    }
    return map;
  }, [supervisors, editingSupervisorId]);

  const selectedStations = useMemo(
    () =>
      stations
        .filter((s) => selectedIds.includes(s.id))
        .sort((a, b) => Number(a.partNumber) - Number(b.partNumber)),
    [stations, selectedIds],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return stations
      .filter(
        (s) =>
          !selectedIds.includes(s.id) &&
          (String(s.partNumber).includes(q) ||
            s.partName.toLowerCase().includes(q)),
      )
      .slice(0, 10);
  }, [stations, selectedIds, search]);

  const addStation = (station: PollingStation) => {
    if (assignedToOthers.has(station.id)) {
      toast(
        `सावधान: हे केंद्र आधीच ${assignedToOthers.get(station.id)} यांना नियुक्त आहे.`,
        "info",
      );
    }
    onChange([...selectedIds, station.id]);
    setSearch("");
    setShowDropdown(false);
  };

  const handleDirectAdd = () => {
    const num = directNum.trim();
    if (!num) return;
    const match = stations.find(
      (s) => String(Number(s.partNumber)) === String(Number(num)),
    );
    if (!match) {
      setDirectError("हे केंद्र सापडले नाही");
      return;
    }
    if (selectedIds.includes(match.id)) {
      setDirectError("हे केंद्र आधीच निवडले आहे");
      return;
    }
    if (assignedToOthers.has(match.id)) {
      toast(
        `सावधान: केंद्र ${num} आधीच ${assignedToOthers.get(match.id)} यांना नियुक्त आहे.`,
        "info",
      );
    }
    onChange([...selectedIds, match.id]);
    setDirectNum("");
    setDirectError("");
  };

  const removeStation = (id: string) => {
    onChange(selectedIds.filter((sid) => sid !== id));
  };

  return (
    <div className="flex flex-col gap-2" ref={containerRef}>
      {/* Direct number entry */}
      <div className="flex flex-col gap-1">
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            placeholder="केंद्र क्रमांक लिहा"
            value={directNum}
            onChange={(e) => {
              setDirectNum(e.target.value);
              setDirectError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleDirectAdd();
              }
            }}
            className="text-sm h-8 w-32"
            data-ocid="supervisors.form.direct_num.input"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleDirectAdd}
            className="h-8 text-xs"
            data-ocid="supervisors.form.direct_add.button"
          >
            जोडा
          </Button>
          {directError && (
            <span className="text-xs text-destructive">{directError}</span>
          )}
        </div>
      </div>
      {selectedStations.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-primary">निवडलेली केंद्रे:</p>
          <div className="flex flex-wrap gap-1.5">
            {selectedStations.map((st) => (
              <div
                key={st.id}
                className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded text-xs border border-primary/20"
              >
                <span className="font-mono font-semibold">
                  {Number(st.partNumber)}
                </span>
                <span className="truncate max-w-[140px]">{st.partName}</span>
                <button
                  type="button"
                  onClick={() => removeStation(st.id)}
                  className="ml-0.5 hover:text-red-500 font-bold"
                  aria-label="काढून टाका"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <Input
          placeholder="केंद्र क्रमांक किंवा नाव टाका"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          className="text-sm"
        />
        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-10 w-full bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
            {filtered.map((st) => (
              <button
                key={st.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted/30 text-sm flex items-center justify-between gap-2"
                onClick={() => addStation(st)}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-semibold text-primary shrink-0">
                    {Number(st.partNumber)}
                  </span>
                  <span className="truncate">— {st.partName}</span>
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {st.location}
                </span>
              </button>
            ))}
          </div>
        )}
        {showDropdown && search.trim() && filtered.length === 0 && (
          <div className="absolute z-10 w-full bg-card border border-border rounded-md shadow-lg p-3 mt-1">
            <p className="text-sm text-muted-foreground">
              कोणतेही केंद्र आढळले नाही.
            </p>
          </div>
        )}
      </div>

      {stations.length === 0 && (
        <p className="text-xs text-muted-foreground">
          कोणतेही मतदान केंद्र उपलब्ध नाही. आधी मतदान केंद्रे आयात करा.
        </p>
      )}
    </div>
  );
}

const emptySupervisor = (): Partial<Supervisor> => ({
  id: "",
  name: "",
  phone: "",
  designation: "",
  password: "",
  constituencyId: CONST_ID,
  assignedStationIds: [],
  isActive: true,
});

export function SupervisorsPage() {
  const { actor, isFetching } = useActor(createActor);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Partial<Supervisor>>(
    emptySupervisor(),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [showAssign, setShowAssign] = useState<Supervisor | null>(null);
  const [assignIds, setAssignIds] = useState<string[]>([]);
  const [showResetPwd, setShowResetPwd] = useState<Supervisor | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPwd, setShowPwd] = useState(true);
  const deleteSupervisorMutation = useDeleteSupervisor();
  const _deleteNodalOfficerMutation = useDeleteNodalOfficer();
  const [deleteHistory, setDeleteHistory] = useState<DeleteRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showUnassigned, setShowUnassigned] = useState(false);

  const isAdmin = isSuperAdminLoggedIn() || isAdminLoggedIn();
  const currentSupervisor = getCurrentSupervisor();
  const isSupervisorRole = !isAdmin && !!currentSupervisor;
  const _canView = isAdmin || isSupervisorRole;

  useEffect(() => {
    setDeleteHistory(getDeleteHistory());
  }, []);

  const { data: supervisors = [], isLoading } = useQuery<Supervisor[]>({
    queryKey: ["supervisors"],
    queryFn: async () => {
      if (!actor) return [];
      return getSupervisors(actor);
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });

  const { data: stations = [] } = useQuery<PollingStation[]>({
    queryKey: ["pollingStations"],
    queryFn: async () => {
      if (!actor) return [];
      return getPollingStations(actor);
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });

  const openNew = () => {
    setEditing(emptySupervisor());
    setIsEditing(false);
    setShowForm(true);
  };
  const openEdit = (s: Supervisor) => {
    setEditing({ ...s });
    setIsEditing(true);
    setShowForm(true);
  };

  const setField = (field: keyof Supervisor, value: unknown) =>
    setEditing((prev) => ({ ...prev, [field]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) {
      toast("सर्व्हरशी कनेक्शन नाही. पुन्हा प्रयत्न करा.", "error");
      return;
    }
    const phoneDigits = (editing.phone ?? "").replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      setPhoneError("मोबाईल नंबर 10 अंकी असणे आवश्यक आहे");
      return;
    }
    setSaving(true);
    try {
      const now = BigInt(Date.now()) * BigInt(1_000_000);
      const sup: Supervisor = {
        id:
          isEditing && editing.id
            ? editing.id
            : `sup-${CONST_ID}-${editing.phone}`,
        name: editing.name ?? "",
        phone: editing.phone ?? "",
        designation: editing.designation ?? "",
        password: editing.password ?? "",
        constituencyId: CONST_ID,
        assignedStationIds: Array.isArray(editing.assignedStationIds)
          ? editing.assignedStationIds
          : [],
        isActive: editing.isActive ?? true,
        createdAt: isEditing ? (editing.createdAt ?? now) : now,
        updatedAt: now,
        loginAttempts: isEditing
          ? (editing.loginAttempts ?? BigInt(0))
          : BigInt(0),
        isLocked: isEditing ? (editing.isLocked ?? false) : false,
      };
      const ok = isEditing
        ? await updateSupervisor(actor, sup)
        : await saveSupervisor(actor, sup);
      if (ok) {
        qc.invalidateQueries({ queryKey: ["supervisors"] });
        toast(
          isEditing ? "पर्यवेक्षक अद्यतनित झाला" : "नवीन पर्यवेक्षक जोडला",
          "success",
        );
        setShowForm(false);
      } else {
        toast("जतन अयशस्वी झाले. पुन्हा प्रयत्न करा.", "error");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast(`जतन करताना त्रुटी: ${msg}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // Toggle handler for the separate Assign dialog
  const handleToggleAssign = (stationId: string, checked: boolean) => {
    setAssignIds((prev) =>
      checked ? [...prev, stationId] : prev.filter((id) => id !== stationId),
    );
  };

  const handleAssignSave = async () => {
    if (!showAssign || !actor) return;
    try {
      const now = BigInt(Date.now()) * BigInt(1_000_000);
      const ok = await updateSupervisor(actor, {
        ...showAssign,
        assignedStationIds: assignIds,
        updatedAt: now,
      });
      if (ok) {
        qc.invalidateQueries({ queryKey: ["supervisors"] });
        toast("नियुक्ती अद्यतनित झाली", "success");
        setShowAssign(null);
      } else {
        toast("नियुक्ती जतन अयशस्वी", "error");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast(`नियुक्ती जतन त्रुटी: ${msg}`, "error");
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResetPwd || !actor || !newPassword) return;
    try {
      const now = BigInt(Date.now()) * BigInt(1_000_000);
      const ok = await updateSupervisor(actor, {
        ...showResetPwd,
        password: newPassword,
        updatedAt: now,
      });
      if (ok) {
        qc.invalidateQueries({ queryKey: ["supervisors"] });
        toast("पासवर्ड बदलला", "success");
        setShowResetPwd(null);
        setNewPassword("");
      } else {
        toast("पासवर्ड बदल अयशस्वी", "error");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast(`पासवर्ड बदल त्रुटी: ${msg}`, "error");
    }
  };

  return (
    <div className="flex flex-col gap-4" data-ocid="supervisors.page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-primary">पर्यवेक्षक यादी</h2>
          {isSupervisorRole && (
            <p className="text-xs text-muted-foreground mt-0.5">
              फक्त पाहण्यासाठी — संपादन उपलब्ध नाही
            </p>
          )}
        </div>
        {isAdmin && (
          <Button
            type="button"
            size="sm"
            onClick={openNew}
            data-ocid="supervisors.add_button"
          >
            + नवीन पर्यवेक्षक जोडा
          </Button>
        )}
      </div>

      {/* Unassigned Polling Stations Section — Admin only */}
      {isAdmin && !isLoading && (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          {(() => {
            const assignedSet = new Set<string>();
            for (const sup of supervisors) {
              for (const sid of sup.assignedStationIds) {
                assignedSet.add(sid);
              }
            }
            const unassigned = stations
              .filter((st) => !assignedSet.has(st.id))
              .sort((a, b) => Number(a.partNumber) - Number(b.partNumber));
            return (
              <>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-primary hover:bg-muted/30 transition-colors"
                  onClick={() => setShowUnassigned((v) => !v)}
                  data-ocid="supervisors.unassigned.toggle"
                >
                  <span className="flex items-center gap-2">
                    📋 न दिलेली मतदान केंद्रे
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${unassigned.length === 0 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}
                    >
                      {unassigned.length}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {showUnassigned ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </span>
                </button>
                {showUnassigned && (
                  <div className="border-t border-border">
                    {unassigned.length === 0 ? (
                      <div className="flex items-center gap-2 px-4 py-4 text-sm text-green-700 bg-green-50/50">
                        <span className="text-lg">✅</span>
                        <span>सर्व केंद्रे नियुक्त केली आहेत</span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="px-3 py-2 text-left font-semibold w-16">
                                अनु.क्र.
                              </th>
                              <th className="px-3 py-2 text-left font-semibold">
                                मतदान केंद्र क्रमांक
                              </th>
                              <th className="px-3 py-2 text-left font-semibold">
                                मतदान केंद्राचे नाव
                              </th>
                              <th className="px-3 py-2 text-left font-semibold">
                                मतदान केंद्राचे ठिकाण
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {unassigned.map((st, idx) => (
                              <tr
                                key={st.id}
                                className="border-b last:border-0 hover:bg-muted/20"
                                data-ocid={`supervisors.unassigned.item.${idx + 1}`}
                              >
                                <td className="px-3 py-2 text-muted-foreground">
                                  {idx + 1}
                                </td>
                                <td className="px-3 py-2 font-mono font-semibold text-primary">
                                  {Number(st.partNumber)}
                                </td>
                                <td className="px-3 py-2">{st.partName}</td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {st.location || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {isLoading ? (
        <div
          className="flex items-center justify-center py-12"
          data-ocid="supervisors.loading_state"
        >
          <span className="text-muted-foreground animate-pulse">
            लोड होत आहे...
          </span>
        </div>
      ) : supervisors.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12 gap-2"
          data-ocid="supervisors.empty_state"
        >
          <span className="text-4xl">👤</span>
          <p className="text-muted-foreground">अद्याप कोणीही पर्यवेक्षक नाही.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-3 py-2 text-left font-semibold">नाव</th>
                <th className="px-3 py-2 text-left font-semibold">फोन</th>
                <th className="px-3 py-2 text-left font-semibold">पद</th>
                <th className="px-3 py-2 text-right font-semibold">
                  नियुक्त केंद्रे (क्र. व संख्या)
                </th>
                <th className="px-3 py-2 text-left font-semibold">स्थिती</th>
                {isAdmin && (
                  <th className="px-3 py-2 text-left font-semibold">कृती</th>
                )}
              </tr>
            </thead>
            <tbody>
              {supervisors.map((s, i) => (
                <tr
                  key={s.id}
                  className={`border-b last:border-0 hover:bg-muted/30 ${isSupervisorRole && currentSupervisor?.id === s.id ? "bg-blue-50/60" : ""}`}
                  data-ocid={`supervisors.item.${i + 1}`}
                >
                  <td className="px-3 py-2 font-medium">{s.name}</td>
                  <td className="px-3 py-2 font-mono">{s.phone}</td>
                  <td className="px-3 py-2">{s.designation}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    <div>
                      <span className="font-semibold">
                        {s.assignedStationIds.length}
                      </span>
                      {s.assignedStationIds.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-0.5 max-w-[120px] break-words">
                          {s.assignedStationIds
                            .map((sid) => {
                              const st = stations.find((st) => st.id === sid);
                              return st ? Number(st.partNumber) : "?";
                            })
                            .join(", ")}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                    >
                      {s.isActive ? "सक्रिय" : "निष्क्रिय"}
                    </span>
                    {isSupervisorRole && currentSupervisor?.id === s.id && (
                      <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700 font-semibold">
                        मी
                      </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(s)}
                          data-ocid={`supervisors.edit_button.${i + 1}`}
                        >
                          संपादित
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowAssign(s);
                            setAssignIds([...s.assignedStationIds]);
                          }}
                          data-ocid={`supervisors.assign_button.${i + 1}`}
                        >
                          नियुक्ती
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowResetPwd(s);
                            setNewPassword("");
                            setShowPwd(true);
                          }}
                          data-ocid={`supervisors.reset_pwd_button.${i + 1}`}
                        >
                          पासवर्ड
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            const confirmed = window.confirm(
                              `"${s.name}" हा पर्यवेक्षक कायमचा हटवायचा आहे का? हे पूर्ववत होणार नाही.`,
                            );
                            if (!confirmed) return;
                            try {
                              await deleteSupervisorMutation.mutateAsync({
                                id: s.id,
                                constituencyId: CONST_ID,
                              });
                              qc.invalidateQueries({
                                queryKey: ["supervisors", CONST_ID],
                              });
                              recordDeletion(
                                "पर्यवेक्षक",
                                s.name,
                                "admin",
                                "Admin द्वारे हटवले",
                              );
                              setDeleteHistory(getDeleteHistory());
                              toast("पर्यवेक्षक हटवला", "success");
                            } catch (err) {
                              toast(
                                `हटवताना त्रुटी: ${
                                  err instanceof Error
                                    ? err.message
                                    : String(err)
                                }`,
                                "error",
                              );
                            }
                          }}
                          data-ocid={`supervisors.delete_button.${i + 1}`}
                        >
                          हटवा
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete History Section */}
      {isAdmin && (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-primary hover:bg-muted/30 transition-colors"
            onClick={() => setShowHistory((v) => !v)}
            data-ocid="supervisors.history.toggle"
          >
            <span>🗑️ हटवण्याचा इतिहास</span>
            <span className="text-muted-foreground text-xs">
              {showHistory ? "▲ लपवा" : `▼ पाहा (${deleteHistory.length})`}
            </span>
          </button>
          {showHistory && (
            <div className="border-t border-border">
              {deleteHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground px-4 py-3">
                  अद्याप कोणताही रेकॉर्ड हटवला नाही.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="px-3 py-2 text-left font-semibold">
                          प्रकार
                        </th>
                        <th className="px-3 py-2 text-left font-semibold">
                          नाव
                        </th>
                        <th className="px-3 py-2 text-left font-semibold">
                          दिनांक
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {deleteHistory.map((rec, idx) => (
                        <tr
                          key={`${rec[0]}-${rec[4]}`}
                          className="border-b last:border-0 hover:bg-muted/20"
                          data-ocid={`supervisors.history.item.${idx + 1}`}
                        >
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              {rec.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-medium">{rec.name}</td>
                          <td className="px-3 py-2 text-muted-foreground text-xs">
                            {new Date(rec.date).toLocaleString("mr-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Supervisor Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => !v && setShowForm(false)}>
        <DialogContent
          className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="supervisors.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-primary">
              {isEditing ? "पर्यवेक्षक संपादित" : "नवीन पर्यवेक्षक जोडा"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-4 mt-2">
            {/* Basic fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sup-name">नाव *</Label>
                <Input
                  id="sup-name"
                  value={editing.name ?? ""}
                  onChange={(e) => setField("name", e.target.value)}
                  required
                  data-ocid="supervisors.name.input"
                />
              </div>
              <div>
                <Label htmlFor="sup-phone">फोन *</Label>
                <Input
                  id="sup-phone"
                  type="tel"
                  value={editing.phone ?? ""}
                  onChange={(e) => {
                    const digits = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10);
                    setField("phone", digits);
                    setPhoneError("");
                  }}
                  onBlur={() => {
                    const val = (editing.phone ?? "").replace(/\D/g, "");
                    if (val.length > 0 && val.length !== 10) {
                      setPhoneError("मोबाईल नंबर 10 अंकी असणे आवश्यक आहे");
                    } else {
                      setPhoneError("");
                    }
                  }}
                  maxLength={10}
                  required
                  placeholder="10 अंकी मोबाईल नंबर"
                  data-ocid="supervisors.phone.input"
                />
                {phoneError && (
                  <p className="text-xs text-red-600 mt-1" role="alert">
                    {phoneError}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="sup-des">पद *</Label>
              <Input
                id="sup-des"
                value={editing.designation ?? ""}
                onChange={(e) => setField("designation", e.target.value)}
                required
                data-ocid="supervisors.designation.input"
              />
            </div>
            {!isEditing && (
              <div>
                <Label htmlFor="sup-pwd">पासवर्ड *</Label>
                <Input
                  id="sup-pwd"
                  type="password"
                  value={editing.password ?? ""}
                  onChange={(e) => setField("password", e.target.value)}
                  required
                  data-ocid="supervisors.password.input"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={editing.isActive ?? true}
                onCheckedChange={(c) => setField("isActive", c)}
                data-ocid="supervisors.active.switch"
              />
              <Label>सक्रिय</Label>
            </div>

            {/* Centre assignment section inside the form */}
            <div className="border border-border rounded-md p-3 bg-muted/20">
              <p className="text-sm font-semibold text-primary mb-2">
                नियुक्त केंद्रे{" "}
                {(editing.assignedStationIds ?? []).length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    ({(editing.assignedStationIds ?? []).length} निवडले)
                  </span>
                )}
              </p>
              <CentreSearchPicker
                stations={stations}
                supervisors={supervisors}
                editingSupervisorId={editing.id}
                selectedIds={editing.assignedStationIds ?? []}
                onChange={(ids) => setField("assignedStationIds", ids)}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                data-ocid="supervisors.cancel_button"
              >
                रद्द करा
              </Button>
              <Button
                type="submit"
                disabled={saving}
                data-ocid="supervisors.save_button"
              >
                {saving ? "जतन होत आहे..." : "जतन करा"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Stations Dialog (post-save editing) */}
      <Dialog
        open={!!showAssign}
        onOpenChange={(v) => !v && setShowAssign(null)}
      >
        <DialogContent
          className="sm:max-w-md max-h-[85vh] overflow-y-auto"
          data-ocid="supervisors.assign.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-primary">
              मतदान केंद्र नियुक्ती — {showAssign?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <CentrePicker
              stations={stations}
              selectedIds={assignIds}
              onToggle={handleToggleAssign}
              labelPrefix="supervisors.assign"
            />
            <div className="flex gap-2 justify-end mt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAssign(null)}
                data-ocid="supervisors.assign.cancel_button"
              >
                रद्द करा
              </Button>
              <Button
                type="button"
                onClick={handleAssignSave}
                data-ocid="supervisors.assign.confirm_button"
              >
                जतन करा
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog
        open={!!showResetPwd}
        onOpenChange={(v) => !v && setShowResetPwd(null)}
      >
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="supervisors.resetpwd.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-primary">
              पासवर्ड बदला — {showResetPwd?.name}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handlePasswordReset}
            className="flex flex-col gap-3 mt-2"
          >
            <div>
              <Label htmlFor="new-pwd">नवीन पासवर्ड</Label>
              <div className="relative flex items-center">
                <Input
                  id="new-pwd"
                  type={showPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="pr-10"
                  data-ocid="supervisors.resetpwd.input"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-lg leading-none"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? "पासवर्ड लपवा" : "पासवर्ड दाखवा"}
                  data-ocid="supervisors.resetpwd.toggle"
                >
                  {showPwd ? "🙈" : "👁"}
                </button>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowResetPwd(null)}
                data-ocid="supervisors.resetpwd.cancel_button"
              >
                रद्द करा
              </Button>
              <Button
                type="submit"
                data-ocid="supervisors.resetpwd.confirm_button"
              >
                पासवर्ड बदला
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
