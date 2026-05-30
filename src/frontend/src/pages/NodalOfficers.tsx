// @ts-nocheck
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  AlertTriangle,
  BarChart2,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  EyeOff,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { BLO } from "../types/domain";
import { BLOStatus } from "../types/domain";
import {
  deleteNodalOfficerFromBackend,
  saveNodalOfficerToBackend,
} from "../utils/backendService";
import type { NodalLoginEntry, NodalOfficer } from "../utils/nodalStorage";
import { nodalStorage } from "../utils/nodalStorage";
import type { Supervisor } from "../utils/storage";
import { storage } from "../utils/storage";

interface Props {
  isAdminLoggedIn: boolean;
  /** When true, restrict view to only the nodal officer with currentNodalId */
  nodalMode?: boolean;
  currentNodalId?: string | null;
  constituencyPrefix?: string;
}

const emptyForm = (): Omit<NodalOfficer, "id" | "createdAt"> => ({
  name: "",
  designation: "",
  office: "",
  whatsappNumber: "",
  mobileNumber: "",
  password: "",
  appointmentOrderNumber: "",
  appointmentDate: "",
  appointmentAuthority: "",
  notes: "",
  assignedSupervisorIds: [],
});

type DashCardType = "supervisors" | "blos" | "notices" | null;

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("mr-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function NodalOfficers({
  isAdminLoggedIn,
  nodalMode = false,
  currentNodalId = null,
  constituencyPrefix,
}: Props) {
  const [nodalList, setNodalList] = useState<NodalOfficer[]>(() =>
    nodalStorage.getNodalOfficers(constituencyPrefix),
  );
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<NodalOfficer | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<NodalOfficer | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignSelected, setAssignSelected] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<NodalOfficer | null>(null);
  const [showNOPassword, setShowNOPassword] = useState(false);

  // Per-card dashboard click dialogs
  const [dashCardOpen, setDashCardOpen] = useState<DashCardType>(null);
  const [dashCardNodal, setDashCardNodal] = useState<NodalOfficer | null>(null);
  const [dashCardSearch, setDashCardSearch] = useState("");

  // Supervisor detail dialog (full-screen with BLO management)
  const [supDetailOpen, setSupDetailOpen] = useState(false);
  const [supDetailSup, setSupDetailSup] = useState<Supervisor | null>(null);
  const [supBloSearch, setSupBloSearch] = useState("");

  // Login history dialog
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loginHistory, setLoginHistory] = useState<NodalLoginEntry[]>([]);

  const supervisors = storage
    .getSupervisors()
    .filter((s) => s.status === "active");
  const supervisorNotices = storage.getSupervisorNotices();
  const allNotices = storage.getNotices();
  const allBLOs = storage.getBLOs();
  const workReports = storage.getSupervisorWorkReports();

  function reload() {
    setNodalList(nodalStorage.getNodalOfficers(constituencyPrefix));
  }

  function openAdd() {
    setEditTarget(null);
    setForm(emptyForm());
    setShowNOPassword(false);
    setEditOpen(true);
  }

  function openEdit(n: NodalOfficer) {
    setEditTarget(n);
    setShowNOPassword(false);
    setForm({
      name: n.name,
      designation: n.designation,
      office: n.office,
      whatsappNumber: n.whatsappNumber,
      mobileNumber: n.mobileNumber || "",
      password: n.password || "",
      appointmentOrderNumber: n.appointmentOrderNumber,
      appointmentDate: n.appointmentDate,
      appointmentAuthority: n.appointmentAuthority,
      notes: n.notes,
      assignedSupervisorIds: n.assignedSupervisorIds,
    });
    setEditOpen(true);
  }

  function handleSave() {
    if (!form.name.trim() || !form.designation.trim()) {
      toast.error("नाव आणि पदनाम आवश्यक आहे");
      return;
    }
    // Duplicate mobile number check
    if (form.whatsappNumber.trim().length >= 6) {
      const mobile = form.whatsappNumber.trim();
      const allNodals = nodalStorage.getNodalOfficers(constituencyPrefix);
      for (const n of allNodals) {
        if (editTarget && n.id === editTarget.id) continue;
        if (n.whatsappNumber && n.whatsappNumber === mobile) {
          toast.error(
            `हा मोबाईल क्रमांक आधीच नोडल अधिकारी: ${n.name} (${n.designation}) यांच्यासाठी नोंदणीकृत आहे`,
          );
          return;
        }
      }
      const allSupervisors = storage.getSupervisors();
      for (const s of allSupervisors) {
        if (s.whatsappNumber && s.whatsappNumber === mobile) {
          toast.error(
            `हा मोबाईल क्रमांक आधीच पर्यवेक्षक: ${s.name} (${s.designation}) यांच्यासाठी नोंदणीकृत आहे`,
          );
          return;
        }
        if (s.phone && s.phone === mobile) {
          toast.error(
            `हा मोबाईल क्रमांक आधीच पर्यवेक्षक: ${s.name} (${s.designation}) यांच्या फोन नंबर म्हणून नोंदणीकृत आहे`,
          );
          return;
        }
      }
      const allBLOs = storage.getBLOs();
      for (const b of allBLOs) {
        if (b.whatsappNumber && b.whatsappNumber === mobile) {
          toast.error(
            `हा मोबाईल क्रमांक आधीच BLO: ${b.name || "रिक्त"} (भाग क्र. ${Number(b.pollingStationId)}) यांच्यासाठी नोंदणीकृत आहे`,
          );
          return;
        }
      }
    }
    const all = nodalStorage.getNodalOfficers(constituencyPrefix);
    if (editTarget) {
      nodalStorage.saveNodalOfficers(
        all.map((n) => (n.id === editTarget.id ? { ...n, ...form } : n)),
        constituencyPrefix,
      );
      saveNodalOfficerToBackend(
        constituencyPrefix || "",
        nodalList.find((n) => n.id === editTarget.id) as any,
      ).catch(() => {});
      toast.success("नोडल अधिकारी अद्यावत झाला");
    } else {
      const newItem: NodalOfficer = {
        ...form,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      nodalStorage.saveNodalOfficers([...all, newItem], constituencyPrefix);
      saveNodalOfficerToBackend(constituencyPrefix || "", newItem as any).catch(
        () => {},
      );
      toast.success("नोडल अधिकारी जोडला");
    }
    setEditOpen(false);
    reload();
  }

  function handleDelete(n: NodalOfficer) {
    const deletedNodalId = n.id;
    nodalStorage.saveNodalOfficers(
      nodalStorage
        .getNodalOfficers(constituencyPrefix)
        .filter((x) => x.id !== n.id),
      constituencyPrefix,
    );
    deleteNodalOfficerFromBackend(
      constituencyPrefix || "",
      deletedNodalId,
    ).catch(() => {});
    setDeleteTarget(null);
    reload();
    toast.success("नोडल अधिकारी काढला");
  }

  function openAssign(n: NodalOfficer) {
    setAssignTarget(n);
    setAssignSelected([...n.assignedSupervisorIds]);
    setAssignSearch("");
    setAssignOpen(true);
  }

  function saveAssignment() {
    if (!assignTarget) return;
    nodalStorage.saveNodalOfficers(
      nodalStorage
        .getNodalOfficers(constituencyPrefix)
        .map((n) =>
          n.id === assignTarget.id
            ? { ...n, assignedSupervisorIds: assignSelected }
            : n,
        ),
      constituencyPrefix,
    );
    setAssignOpen(false);
    reload();
    toast.success("पर्यवेक्षक नेमणूक जतन झाली");
  }

  // Open a dashboard summary card detail dialog
  function openDashCard(
    nodal: NodalOfficer,
    cardType: Exclude<DashCardType, null>,
  ) {
    setDashCardNodal(nodal);
    setDashCardOpen(cardType);
    setDashCardSearch("");
  }

  // Open supervisor full detail (BLO management) dialog
  function openSupDetail(sup: Supervisor) {
    setSupDetailSup(sup);
    setSupBloSearch("");
    setSupDetailOpen(true);
  }

  // Toggle BLO active/inactive from within supervisor detail view
  function toggleBLOStatus(blo: BLO) {
    const updated = allBLOs.map((b) =>
      b.id === blo.id
        ? {
            ...b,
            status:
              b.status === BLOStatus.active
                ? BLOStatus.inactive
                : BLOStatus.active,
          }
        : b,
    );
    storage.setBLOs(updated);
    toast.success(
      blo.status === BLOStatus.active ? "BLO निष्क्रिय केला" : "BLO सक्रिय केला",
    );
  }

  function handlePrintNodalList() {
    const printWin = window.open("", "_blank", "width=900,height=700");
    if (!printWin) return;
    const tableRows = nodalList
      .map((n, i) => {
        const sc = n.assignedSupervisorIds.length;
        return `<tr><td style="padding:4px 8px;border:1px solid #000">${i + 1}</td><td style="padding:4px 8px;border:1px solid #000">${n.name}</td><td style="padding:4px 8px;border:1px solid #000">${n.designation}</td><td style="padding:4px 8px;border:1px solid #000">${n.office || ""}</td><td style="padding:4px 8px;border:1px solid #000">${n.whatsappNumber || ""}</td><td style="padding:4px 8px;border:1px solid #000">${n.appointmentDate || ""}</td><td style="padding:4px 8px;border:1px solid #000">${sc}</td></tr>`;
      })
      .join("");
    const th = (t: string) =>
      `<th style="padding:4px 8px;border:1px solid #000;background:#ddd">${t}</th>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>\u0928\u094b\u0921\u0932 \u092f\u093e\u0926\u0940</title><style>body{font-family:sans-serif;margin:20px}table{width:100%;border-collapse:collapse}h2{text-align:center}@media print{.noprint{display:none}}</style></head><body><h2>\u0928\u094b\u0921\u0932 \u0905\u0927\u093f\u0915\u093e\u0930\u0940 \u092f\u093e\u0926\u0940</h2><button class="noprint" onclick="window.print()" style="margin-bottom:10px;padding:6px 16px;">\u092a\u094d\u0930\u093f\u0902\u091f \u0915\u0930\u093e</button><table><thead><tr>${th("\u0915\u094d\u0930.")}${th("\u0928\u093e\u0935")}${th("\u092a\u0926\u0928\u093e\u092e")}${th("\u0915\u093e\u0930\u094d\u092f\u093e\u0932\u092f")}${th("WhatsApp")}${th("\u0928\u093f\u092f\u0941\u0915\u094d\u0924\u0940 \u0926\u093f\u0928\u093e\u0902\u0915")}${th("\u092a\u0930\u094d\u092f\u0935\u0947\u0915\u094d\u0937\u0915 \u0938\u0902\u0916\u094d\u092f\u093e")}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    printWin.document.write(html);
    printWin.document.close();
  }

  function openLoginHistory() {
    setLoginHistory(nodalStorage.getNodalLoginHistory(constituencyPrefix));
    setHistoryOpen(true);
  }

  // Filtered nodal list — in nodalMode show only the logged-in nodal officer
  const filtered = useMemo(() => {
    const base =
      nodalMode && currentNodalId
        ? nodalList.filter((n) => n.id === currentNodalId)
        : nodalList.filter(
            (n) =>
              n.name.toLowerCase().includes(search.toLowerCase()) ||
              n.designation.toLowerCase().includes(search.toLowerCase()) ||
              n.office.toLowerCase().includes(search.toLowerCase()),
          );
    return base;
  }, [nodalList, nodalMode, currentNodalId, search]);

  const assignedSups = supervisors.filter(
    (s) =>
      s.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
      s.designation.toLowerCase().includes(assignSearch.toLowerCase()),
  );

  // Derive data for currently open dashboard card
  const dashCardData = useMemo(() => {
    if (!dashCardNodal)
      return { supervisorList: [], bloList: [], noticeList: [] };
    const supList = supervisors.filter((s) =>
      dashCardNodal.assignedSupervisorIds.includes(s.id),
    );
    const bloList: Array<BLO & { supervisorName: string }> = [];
    for (const sup of supList) {
      for (const pn of sup.assignedPartNumbers) {
        const blo = allBLOs.find((b) => Number(b.pollingStationId) === pn);
        if (blo) bloList.push({ ...blo, supervisorName: sup.name });
      }
    }
    const bloIdsWithNotices = new Set(
      allNotices.map((n) => n.bloId.toString()),
    );
    const noticeList = bloList.filter((b) =>
      bloIdsWithNotices.has(b.id.toString()),
    );
    return { supervisorList: supList, bloList, noticeList };
  }, [dashCardNodal, supervisors, allBLOs, allNotices]);

  // BLOs for the currently selected supervisor in detail dialog
  const supDetailBLOs = useMemo(() => {
    if (!supDetailSup) return [];
    return allBLOs.filter((b) =>
      supDetailSup.assignedPartNumbers.includes(Number(b.pollingStationId)),
    );
  }, [supDetailSup, allBLOs]);

  const supDetailFilteredBLOs = useMemo(() => {
    const q = supBloSearch.toLowerCase();
    return supDetailBLOs.filter(
      (b) =>
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.pollingStationId.toString().includes(q) ||
        b.designation.toLowerCase().includes(q),
    );
  }, [supDetailBLOs, supBloSearch]);

  const canEdit = isAdminLoggedIn || nodalMode;

  return (
    <div className="p-4 space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">
            {nodalMode ? "नोडल अधिकारी डॅशबोर्ड" : "༻༻༻ नोडल अधिकारी यादी"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {nodalMode
              ? "तुमच्याकडील पर्यवेक्षक व BLO यांची माहिती"
              : "पर्यवेक्षकांवर देखरेख करणारे नोडल अधिकारी — वरिष्ठ कार्यालयाच्या आदेशाने नेमलेले"}
          </p>
        </div>
        <div className="flex gap-2">
          {!nodalMode && (
            <div className="relative">
              <Search
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={14}
              />
              <Input
                className="pl-7 h-8 text-xs w-44"
                placeholder="नाव/पद शोधा..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-ocid="nodal.search_input"
              />
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={handlePrintNodalList}
            data-ocid="nodal.print_list.button"
          >
            🖨️ यादी छापा
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={openLoginHistory}
            data-ocid="nodal.login_history_button"
          >
            <Clock size={13} className="mr-1" />🕐 नोडल लॉगिन इतिहास
          </Button>
          {isAdminLoggedIn && !nodalMode && (
            <Button size="sm" onClick={openAdd} data-ocid="nodal.add_button">
              <Plus size={14} className="mr-1" />
              नवीन नोडल अधिकारी जोडा
            </Button>
          )}
        </div>
      </div>

      {/* Stats bar — only in admin mode */}
      {!nodalMode && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 flex items-center gap-2">
            <Users size={16} className="text-blue-600" />
            <div>
              <p className="text-xs text-blue-600 font-medium">
                एकूण नोडल अधिकारी
              </p>
              <p className="text-lg font-bold text-blue-800">
                {nodalList.length}
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 flex items-center gap-2">
            <UserCheck size={16} className="text-green-600" />
            <div>
              <p className="text-xs text-green-600 font-medium">
                एकूण नेमलेले पर्यवेक्षक
              </p>
              <p className="text-lg font-bold text-green-800">
                {
                  [
                    ...new Set(
                      nodalList.flatMap((n) => n.assignedSupervisorIds),
                    ),
                  ].length
                }
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-purple-50 border border-purple-200 px-4 py-2 flex items-center gap-2">
            <Bell size={16} className="text-purple-600" />
            <div>
              <p className="text-xs text-purple-600 font-medium">
                पर्यवेक्षकांना नोटीसा
              </p>
              <p className="text-lg font-bold text-purple-800">
                {supervisorNotices.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nodal Officer Cards */}
      {filtered.length === 0 ? (
        <div
          className="text-center py-12 text-muted-foreground"
          data-ocid="nodal.empty_state"
        >
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            कोणताही नोडल अधिकारी सापडला नाही
          </p>
          {isAdminLoggedIn && !nodalMode && (
            <p className="text-xs mt-1">
              "नवीन नोडल अधिकारी जोडा" वर click करा
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 xl:grid-cols-2">
          {filtered.map((nodal, idx) => {
            const assignedSupList = supervisors.filter((s) =>
              nodal.assignedSupervisorIds.includes(s.id),
            );
            const totalBLOs = assignedSupList.reduce(
              (sum, s) => sum + s.assignedPartNumbers.length,
              0,
            );
            const bloIdsWithNotices = new Set(
              allNotices.map((n) => n.bloId.toString()),
            );
            const totalNoticeBLOs = assignedSupList.reduce((sum, sup) => {
              const supBLOs = allBLOs.filter((b) =>
                sup.assignedPartNumbers.includes(Number(b.pollingStationId)),
              );
              return (
                sum +
                supBLOs.filter((b) => bloIdsWithNotices.has(b.id.toString()))
                  .length
              );
            }, 0);

            return (
              <Card
                key={nodal.id}
                className="border-l-4 border-l-blue-500"
                data-ocid={`nodal.item.${idx + 1}`}
              >
                <CardHeader className="pb-1 pt-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight">
                        {nodal.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {nodal.designation}
                      </p>
                    </div>
                    {isAdminLoggedIn && !nodalMode && (
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => openEdit(nodal)}
                          data-ocid={`nodal.edit_button.${idx + 1}`}
                        >
                          <Pencil size={12} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(nodal)}
                          data-ocid={`nodal.delete_button.${idx + 1}`}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
                  {nodal.office && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 size={12} />
                      <span className="truncate">{nodal.office}</span>
                    </div>
                  )}
                  {nodal.appointmentOrderNumber && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">आदेश क्र.: </span>
                      <span className="font-medium">
                        {nodal.appointmentOrderNumber}
                      </span>
                      {nodal.appointmentDate && (
                        <span className="ml-2 text-muted-foreground">
                          ({nodal.appointmentDate})
                        </span>
                      )}
                    </div>
                  )}
                  {nodal.appointmentAuthority && (
                    <div className="text-xs text-muted-foreground">
                      नेमणूक: {nodal.appointmentAuthority}
                    </div>
                  )}

                  {/* Clickable summary dashboard cards */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      className="rounded-lg bg-blue-50 border border-blue-200 px-2 py-2 text-left hover:bg-blue-100 transition-colors cursor-pointer"
                      onClick={() => openDashCard(nodal, "supervisors")}
                      data-ocid={`nodal.dash_supervisors.${idx + 1}`}
                    >
                      <p className="text-[10px] text-blue-600 font-medium">
                        पर्यवेक्षक
                      </p>
                      <p className="text-lg font-bold text-blue-800">
                        {assignedSupList.length}
                      </p>
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-green-50 border border-green-200 px-2 py-2 text-left hover:bg-green-100 transition-colors cursor-pointer"
                      onClick={() => openDashCard(nodal, "blos")}
                      data-ocid={`nodal.dash_blos.${idx + 1}`}
                    >
                      <p className="text-[10px] text-green-600 font-medium">
                        एकूण BLO
                      </p>
                      <p className="text-lg font-bold text-green-800">
                        {totalBLOs}
                      </p>
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-orange-50 border border-orange-200 px-2 py-2 text-left hover:bg-orange-100 transition-colors cursor-pointer"
                      onClick={() => openDashCard(nodal, "notices")}
                      data-ocid={`nodal.dash_notices.${idx + 1}`}
                    >
                      <p className="text-[10px] text-orange-600 font-medium">
                        नोटीस प्रलंबित
                      </p>
                      <p className="text-lg font-bold text-orange-800">
                        {totalNoticeBLOs}
                      </p>
                    </button>
                  </div>

                  {/* Assigned supervisors clickable list */}
                  {assignedSupList.length > 0 && (
                    <div className="text-xs">
                      <p className="text-muted-foreground font-medium mb-1">
                        नेमलेले पर्यवेक्षक — click करा:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {assignedSupList.map((s) => (
                          <button
                            type="button"
                            key={s.id}
                            className="bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 text-[10px] hover:bg-blue-200 transition-colors cursor-pointer border border-blue-300"
                            onClick={() => openSupDetail(s)}
                            data-ocid={`nodal.sup_tag.${s.id}`}
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {isAdminLoggedIn && !nodalMode && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2"
                        onClick={() => openAssign(nodal)}
                        data-ocid={`nodal.assign_button.${idx + 1}`}
                      >
                        <ClipboardList size={12} className="mr-1" />
                        पर्यवेक्षक नेमणूक
                      </Button>
                    )}
                    {nodal.whatsappNumber && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2 text-green-700 border-green-300"
                        onClick={() =>
                          window.open(
                            `https://wa.me/91${nodal.whatsappNumber}`,
                            "_blank",
                          )
                        }
                        data-ocid={`nodal.whatsapp_button.${idx + 1}`}
                      >
                        <MessageCircle size={12} className="mr-1" />
                        WhatsApp
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg" data-ocid="nodal.edit.dialog">
          <DialogHeader>
            <DialogTitle>
              {editTarget
                ? "नोडल अधिकारी संपादित करा"
                : "नवीन नोडल अधिकारी जोडा"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">नाव *</Label>
                <Input
                  className="mt-1 h-9"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="पूर्ण नाव"
                  data-ocid="nodal.name.input"
                />
              </div>
              <div>
                <Label className="text-xs">पदनाम *</Label>
                <Input
                  className="mt-1 h-9"
                  value={form.designation}
                  onChange={(e) =>
                    setForm({ ...form, designation: e.target.value })
                  }
                  placeholder="पदनाम"
                  data-ocid="nodal.designation.input"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">कार्यालय</Label>
              <Input
                className="mt-1 h-9"
                value={form.office}
                onChange={(e) => setForm({ ...form, office: e.target.value })}
                placeholder="कार्यालयाचे नाव"
                data-ocid="nodal.office.input"
              />
            </div>
            <div>
              <Label className="text-xs">WhatsApp क्रमांक</Label>
              <Input
                className="mt-1 h-9"
                value={form.whatsappNumber}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setForm({ ...form, whatsappNumber: digits });
                  setNodalWhatsappError("");
                }}
                onBlur={() => {
                  const val = form.whatsappNumber.replace(/\D/g, "");
                  if (val.length > 0 && val.length !== 10) {
                    setNodalWhatsappError("मोबाईल नंबर 10 अंकी असणे आवश्यक आहे");
                  } else {
                    setNodalWhatsappError("");
                  }
                }}
                placeholder="WhatsApp नंबर"
                maxLength={10}
                inputMode="numeric"
                data-ocid="nodal.whatsapp.input"
              />
              {nodalWhatsappError && (
                <p className="text-xs text-red-600 mt-1" role="alert">
                  {nodalWhatsappError}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">मोबाईल क्रमांक *</Label>
              <Input
                className="mt-1 h-9"
                type="tel"
                value={form.mobileNumber || ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setForm({ ...form, mobileNumber: digits });
                  setNodalMobileError("");
                }}
                onBlur={() => {
                  const val = (form.mobileNumber || "").replace(/\D/g, "");
                  if (val.length > 0 && val.length !== 10) {
                    setNodalMobileError("मोबाईल नंबर 10 अंकी असणे आवश्यक आहे");
                  } else {
                    setNodalMobileError("");
                  }
                }}
                placeholder="१०-अंकी मोबाईल क्रमांक"
                maxLength={10}
                inputMode="numeric"
                pattern="[0-9]{10}"
                data-ocid="nodal.mobile_number.input"
              />
              {nodalMobileError && (
                <p className="text-xs text-red-600 mt-1" role="alert">
                  {nodalMobileError}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">पासवर्ड</Label>
              <div className="relative flex items-center gap-1 mt-1">
                <Input
                  className="flex-1 h-9"
                  type={showNOPassword ? "text" : "password"}
                  value={form.password || ""}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="लॉगिनसाठी पासवर्ड"
                  data-ocid="nodal.password.input"
                />
                <button
                  type="button"
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowNOPassword(!showNOPassword)}
                  aria-label={showNOPassword ? "पासवर्ड लपवा" : "पासवर्ड दाखवा"}
                  data-ocid="nodal.password_toggle.button"
                >
                  {showNOPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="border rounded-md p-3 bg-blue-50/40 space-y-3">
              <p className="text-xs font-semibold text-blue-800">
                ༻༻༻ नियुक्ती तपशील
              </p>
              <div>
                <Label className="text-xs">
                  नियुक्ती आदेश क्रमांक (वरिष्ठ कार्यालय)
                </Label>
                <Input
                  className="mt-1 h-9"
                  value={form.appointmentOrderNumber}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      appointmentOrderNumber: e.target.value,
                    })
                  }
                  placeholder="आदेश क्रमांक"
                  data-ocid="nodal.order_number.input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">नियुक्ती दिनांक</Label>
                  <Input
                    className="mt-1 h-9"
                    type="date"
                    value={form.appointmentDate}
                    onChange={(e) =>
                      setForm({ ...form, appointmentDate: e.target.value })
                    }
                    data-ocid="nodal.appointment_date.input"
                  />
                </div>
                <div>
                  <Label className="text-xs">नियुक्त करणारे वरिष्ठ कार्यालय</Label>
                  <Input
                    className="mt-1 h-9"
                    value={form.appointmentAuthority}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        appointmentAuthority: e.target.value,
                      })
                    }
                    placeholder="कार्यालयाचे नाव"
                    data-ocid="nodal.authority.input"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs">नोंदी</Label>
              <textarea
                className="mt-1 w-full h-16 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="अतिरिक्त नोंदी..."
                data-ocid="nodal.notes.textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(false)}
              data-ocid="nodal.edit.cancel_button"
            >
              रद्द करा
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!form.name.trim() || !form.designation.trim()}
              data-ocid="nodal.edit.save_button"
            >
              जतन करा
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Supervisors Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md" data-ocid="nodal.assign.dialog">
          <DialogHeader>
            <DialogTitle>पर्यवेक्षक नेमणूक — {assignTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={14}
              />
              <Input
                className="pl-7 h-8 text-xs"
                placeholder="पर्यवेक्षक शोधा..."
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                data-ocid="nodal.assign.search_input"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {assignSelected.length} पर्यवेक्षक निवडले
            </p>
            <div className="max-h-72 overflow-y-auto space-y-1 border rounded-md p-2">
              {assignedSups.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-4">
                  कोणताही पर्यवेक्षक सापडला नाही
                </p>
              ) : (
                assignedSups.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={assignSelected.includes(s.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAssignSelected([...assignSelected, s.id]);
                        } else {
                          setAssignSelected(
                            assignSelected.filter((id) => id !== s.id),
                          );
                        }
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium leading-tight">
                        {s.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.designation} — {s.assignedPartNumbers.length} BLO
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignOpen(false)}
              data-ocid="nodal.assign.cancel_button"
            >
              रद्द करा
            </Button>
            <Button
              size="sm"
              onClick={saveAssignment}
              data-ocid="nodal.assign.save_button"
            >
              जतन करा
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dashboard Card Detail Dialog */}
      <Dialog open={!!dashCardOpen} onOpenChange={() => setDashCardOpen(null)}>
        <DialogContent
          className="max-w-2xl w-full max-h-[85vh] flex flex-col"
          data-ocid="nodal.dashcard.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {dashCardOpen === "supervisors" && (
                <span>पर्यवेक्षक यादी — {dashCardNodal?.name}</span>
              )}
              {dashCardOpen === "blos" && (
                <span>एकूण BLO यादी — {dashCardNodal?.name}</span>
              )}
              {dashCardOpen === "notices" && (
                <span>नोटीस प्रलंबित BLO — {dashCardNodal?.name}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="relative mb-2">
            <Search
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={13}
            />
            <Input
              className="pl-7 h-8 text-xs"
              placeholder="शोधा..."
              value={dashCardSearch}
              onChange={(e) => setDashCardSearch(e.target.value)}
              data-ocid="nodal.dashcard.search_input"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {/* Supervisor list */}
            {dashCardOpen === "supervisors" &&
              (dashCardData.supervisorList.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  कोणताही पर्यवेक्षक नेमलेला नाही
                </p>
              ) : (
                dashCardData.supervisorList
                  .filter(
                    (s) =>
                      !dashCardSearch ||
                      s.name
                        .toLowerCase()
                        .includes(dashCardSearch.toLowerCase()),
                  )
                  .map((sup, i) => {
                    const supNotices = supervisorNotices.filter(
                      (sn) => sn.supervisorId === sup.id,
                    ).length;
                    const latestReport = workReports
                      .filter((r) => r.supervisorId === sup.id)
                      .sort((a, b) =>
                        b.submittedAt.localeCompare(a.submittedAt),
                      )[0];
                    return (
                      <div
                        key={sup.id}
                        className="border rounded-md px-3 py-2 bg-card hover:bg-muted/30 transition-colors"
                        data-ocid={`nodal.dashcard.sup.${i + 1}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{sup.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {sup.designation} |{" "}
                              <span className="font-medium text-foreground">
                                {sup.assignedPartNumbers.length} BLO
                              </span>
                            </p>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
                            {supNotices > 0 && (
                              <Badge
                                variant="destructive"
                                className="text-[10px]"
                              >
                                {supNotices} नोटीस
                              </Badge>
                            )}
                            <Badge
                              variant={latestReport ? "secondary" : "outline"}
                              className={`text-[10px] ${
                                latestReport
                                  ? "bg-green-100 text-green-700"
                                  : "border-red-300 text-red-600"
                              }`}
                            >
                              {latestReport ? "अहवाल दिला" : "अहवाल प्रलंबित"}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] px-2"
                              onClick={() => {
                                setDashCardOpen(null);
                                openSupDetail(sup);
                              }}
                              data-ocid={`nodal.dashcard.open_sup.${i + 1}`}
                            >
                              उघडा
                            </Button>
                          </div>
                        </div>
                        {sup.assignedPartNumbers.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {sup.assignedPartNumbers.slice(0, 8).map((p) => (
                              <span
                                key={p}
                                className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]"
                              >
                                भाग {p}
                              </span>
                            ))}
                            {sup.assignedPartNumbers.length > 8 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{sup.assignedPartNumbers.length - 8} अधिक
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
              ))}

            {/* BLO list */}
            {dashCardOpen === "blos" &&
              (dashCardData.bloList.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  कोणताही BLO सापडला नाही
                </p>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-2 py-1.5 font-medium">
                          भाग
                        </th>
                        <th className="text-left px-2 py-1.5 font-medium">
                          BLO नाव
                        </th>
                        <th className="text-left px-2 py-1.5 font-medium">
                          पर्यवेक्षक
                        </th>
                        <th className="text-left px-2 py-1.5 font-medium">
                          स्थिती
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashCardData.bloList
                        .filter(
                          (b) =>
                            !dashCardSearch ||
                            b.name
                              .toLowerCase()
                              .includes(dashCardSearch.toLowerCase()) ||
                            b.pollingStationId
                              .toString()
                              .includes(dashCardSearch),
                        )
                        .map((b, i) => (
                          <tr
                            key={b.id.toString()}
                            className="border-t hover:bg-muted/30"
                            data-ocid={`nodal.dashcard.blo.${i + 1}`}
                          >
                            <td className="px-2 py-1.5 text-muted-foreground">
                              {b.pollingStationId.toString()}
                            </td>
                            <td className="px-2 py-1.5 font-medium">
                              {b.name || "रिक्त"}
                            </td>
                            <td className="px-2 py-1.5 text-muted-foreground">
                              {b.supervisorName}
                            </td>
                            <td className="px-2 py-1.5">
                              <Badge
                                variant={
                                  b.status === BLOStatus.active
                                    ? "secondary"
                                    : "outline"
                                }
                                className={`text-[10px] ${
                                  b.status === BLOStatus.active
                                    ? "bg-green-100 text-green-700"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {b.status === BLOStatus.active
                                  ? "सक्रिय"
                                  : "निष्क्रिय"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ))}

            {/* Notices list */}
            {dashCardOpen === "notices" &&
              (dashCardData.noticeList.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  कोणत्याही BLO ला नोटीस नाही
                </p>
              ) : (
                dashCardData.noticeList
                  .filter(
                    (b) =>
                      !dashCardSearch ||
                      b.name
                        .toLowerCase()
                        .includes(dashCardSearch.toLowerCase()),
                  )
                  .map((b, i) => {
                    const bloNotices = allNotices.filter(
                      (n) => n.bloId === b.id,
                    );
                    const latestNotice = bloNotices[bloNotices.length - 1];
                    return (
                      <div
                        key={b.id.toString()}
                        className="border border-orange-200 bg-orange-50 rounded-md px-3 py-2"
                        data-ocid={`nodal.dashcard.notice.${i + 1}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{b.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              भाग {b.pollingStationId.toString()} |{" "}
                              {b.supervisorName}
                            </p>
                          </div>
                          <div className="flex gap-1 flex-wrap">
                            <Badge
                              variant="destructive"
                              className="text-[10px]"
                            >
                              {bloNotices.length} नोटीस
                            </Badge>
                            {latestNotice && (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-orange-300 text-orange-700"
                              >
                                शेवट: {latestNotice.noticeType}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDashCardOpen(null)}
              data-ocid="nodal.dashcard.close_button"
            >
              बंद करा
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supervisor Full Detail Dialog — Nodal can manage BLOs */}
      <Dialog open={supDetailOpen} onOpenChange={setSupDetailOpen}>
        <DialogContent
          className="!max-w-[100vw] !w-screen !h-screen !max-h-screen flex flex-col p-0 m-0 rounded-none"
          data-ocid="nodal.sup_detail.dialog"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-card border-b">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{supDetailSup?.name}</p>
              <p className="text-xs text-muted-foreground">
                {supDetailSup?.designation} — {supDetailSup?.office}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="secondary" className="text-xs">
                {supDetailBLOs.length} BLO
              </Badge>
              {supDetailSup?.whatsappNumber && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-green-700 border-green-300"
                  onClick={() =>
                    window.open(
                      `https://wa.me/91${supDetailSup.whatsappNumber}`,
                      "_blank",
                    )
                  }
                >
                  <MessageCircle size={12} className="mr-1" />
                  WhatsApp
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setSupDetailOpen(false)}
                data-ocid="nodal.sup_detail.close_button"
              >
                <X size={14} />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-2 border-b">
            <div className="relative">
              <Search
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={13}
              />
              <Input
                className="pl-7 h-8 text-xs max-w-sm"
                placeholder="BLO शोधा (नाव / भाग क्र.)..."
                value={supBloSearch}
                onChange={(e) => setSupBloSearch(e.target.value)}
                data-ocid="nodal.sup_detail.search_input"
              />
            </div>
          </div>

          {/* BLO list */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {supDetailFilteredBLOs.length === 0 ? (
              <div
                className="text-center py-16 text-muted-foreground"
                data-ocid="nodal.sup_detail.empty_state"
              >
                <Users size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">कोणताही BLO सापडला नाही</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {supDetailFilteredBLOs.map((blo, i) => {
                  const bloNotices = allNotices.filter(
                    (n) => n.bloId === blo.id,
                  );
                  const isActive = blo.status === BLOStatus.active;
                  const isGood = blo.isGoodPerformer;
                  return (
                    <div
                      key={blo.id.toString()}
                      className={`border rounded-lg px-3 py-2 ${
                        isActive ? "bg-card" : "bg-muted/30 opacity-75"
                      }`}
                      data-ocid={`nodal.sup_detail.blo.${i + 1}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-semibold truncate">
                              {blo.name || (
                                <span className="text-muted-foreground italic">
                                  रिक्त
                                </span>
                              )}
                            </p>
                            {isGood && (
                              <CheckCircle2
                                size={11}
                                className="text-green-600 flex-shrink-0"
                              />
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            भाग {blo.pollingStationId.toString()}
                            {blo.designation && ` | ${blo.designation}`}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Badge
                            variant={isActive ? "secondary" : "outline"}
                            className={`text-[10px] ${
                              isActive
                                ? "bg-green-100 text-green-700"
                                : "text-muted-foreground"
                            }`}
                          >
                            {isActive ? "सक्रिय" : "निष्क्रिय"}
                          </Badge>
                        </div>
                      </div>

                      {blo.whatsappNumber && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          📱 {blo.whatsappNumber}
                        </p>
                      )}

                      {bloNotices.length > 0 && (
                        <div className="mt-1">
                          <Badge variant="destructive" className="text-[10px]">
                            <AlertTriangle size={9} className="mr-0.5" />
                            {bloNotices.length} नोटीस
                          </Badge>
                        </div>
                      )}

                      {/* Actions — nodal officer can activate/deactivate */}
                      {canEdit && (
                        <div className="mt-2 flex gap-1">
                          <Button
                            size="sm"
                            variant={isActive ? "outline" : "secondary"}
                            className="h-6 text-[10px] px-2 flex-1"
                            onClick={() => toggleBLOStatus(blo)}
                            data-ocid={`nodal.sup_detail.toggle_blo.${i + 1}`}
                          >
                            {isActive ? "निष्क्रिय करा" : "सक्रिय करा"}
                          </Button>
                          {blo.whatsappNumber && (
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-6 w-6 text-green-700 border-green-300"
                              onClick={() =>
                                window.open(
                                  `https://wa.me/91${blo.whatsappNumber}`,
                                  "_blank",
                                )
                              }
                              data-ocid={`nodal.sup_detail.blo_wa.${i + 1}`}
                            >
                              <MessageCircle size={10} />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      {deleteTarget && (
        <Dialog
          open={!!deleteTarget}
          onOpenChange={() => setDeleteTarget(null)}
        >
          <DialogContent className="max-w-sm" data-ocid="nodal.delete.dialog">
            <DialogHeader>
              <DialogTitle>नोडल अधिकारी काढायचे का?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {deleteTarget.name} ({deleteTarget.designation}) यांना यादीतून
              काढायचे आहे का?
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                data-ocid="nodal.delete.cancel_button"
              >
                रद्द करा
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(deleteTarget)}
                data-ocid="nodal.delete.confirm_button"
              >
                काढा
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Login History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent
          className="max-w-lg"
          data-ocid="nodal.login_history.dialog"
        >
          <DialogHeader>
            <DialogTitle>🕐 नोडल अधिकारी लॉगिन इतिहास</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-1">
            {loginHistory.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-8">
                कोणताही लॉगिन इतिहास नाही
              </p>
            ) : (
              loginHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{entry.nodalName}</p>
                    <p className="text-muted-foreground">
                      लॉगिन: {formatDateTime(entry.loginTime)}
                    </p>
                    {entry.logoutTime && (
                      <p className="text-muted-foreground">
                        लॉगआउट: {formatDateTime(entry.logoutTime)}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={entry.logoutTime ? "outline" : "secondary"}
                    className={`text-[10px] flex-shrink-0 ${
                      entry.logoutTime ? "" : "bg-green-100 text-green-700"
                    }`}
                  >
                    {entry.logoutTime ? "समाप्त" : "सक्रिय"}
                  </Badge>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(false)}
              data-ocid="nodal.login_history.close_button"
            >
              बंद करा
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
