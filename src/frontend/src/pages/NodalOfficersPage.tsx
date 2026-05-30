import { createActor } from "@/backend";
import { toast } from "@/components/Toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  getCurrentNodalOfficer,
  isAdminLoggedIn,
  isSuperAdminLoggedIn,
} from "@/lib/auth";
import {
  getNodalOfficers,
  getSupervisors,
  recordDeletion,
  saveNodalOfficer,
} from "@/lib/backendService";
import type { NodalOfficer, Supervisor } from "@/lib/backendService";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Printer, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useBLOs,
  useDeleteNodalOfficer,
  useIssueNotice,
  useNodalOfficerBLOs,
  useNodalOfficerSupervisors,
  useNoticesForDashboard,
  useUpdateNoticeRecipientStatus,
} from "../hooks/useQueries";
import type { Notice } from "../hooks/useQueries";

const CONST_ID = "211";

const emptyOfficer = (): Partial<NodalOfficer> => ({
  id: "",
  name: "",
  designation: "",
  password: "",
  constituencyId: CONST_ID,
  assignedSupervisorIds: [],
  isActive: true,
});

// ─── Delivery Status Badge ───────────────────────────────────────────────────

function DeliveryStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    pending: {
      label: "प्रलंबित",
      cls: "bg-yellow-100 text-yellow-800 border-yellow-300",
    },
    delivered: {
      label: "वितरित",
      cls: "bg-blue-100 text-blue-800 border-blue-300",
    },
    read: {
      label: "वाचले",
      cls: "bg-green-100 text-green-800 border-green-300",
    },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <Badge variant="outline" className={`text-xs ${c.cls}`}>
      {c.label}
    </Badge>
  );
}

// ─── Supervisor Search Picker ─────────────────────────────────────────────────

interface SupervisorSearchPickerProps {
  supervisors: Supervisor[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

function SupervisorSearchPicker({
  supervisors,
  selectedIds,
  onChange,
}: SupervisorSearchPickerProps) {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
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

  const selectedSupervisors = useMemo(
    () => supervisors.filter((s) => selectedIds.includes(s.id)),
    [supervisors, selectedIds],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return supervisors.filter((s) => !selectedIds.includes(s.id));
    return supervisors
      .filter(
        (s) => !selectedIds.includes(s.id) && s.name.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [supervisors, selectedIds, search]);

  return (
    <div className="flex flex-col gap-2" ref={containerRef}>
      {selectedSupervisors.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-primary">निवडलेले पर्यवेक्षक:</p>
          <div className="flex flex-wrap gap-1.5">
            {selectedSupervisors.map((sup) => (
              <div
                key={sup.id}
                className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded text-xs border border-primary/20"
              >
                <span>{sup.name}</span>
                <span className="text-muted-foreground">
                  ({sup.assignedStationIds.length} केंद्रे)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChange(selectedIds.filter((id) => id !== sup.id))
                  }
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
          placeholder="पर्यवेक्षकाचे नाव टाका"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          className="text-sm"
        />
        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-10 w-full bg-card border border-border rounded-md shadow-lg max-h-56 overflow-y-scroll mt-1">
            {filtered.map((sup) => (
              <button
                key={sup.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted/30 text-sm flex items-center justify-between gap-2"
                onClick={() => {
                  onChange([...selectedIds, sup.id]);
                  setSearch("");
                  setShowDropdown(false);
                }}
              >
                <span className="truncate">{sup.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {sup.assignedStationIds.length} केंद्रे नियुक्त
                </span>
              </button>
            ))}
          </div>
        )}
        {showDropdown && search.trim() && filtered.length === 0 && (
          <div className="absolute z-10 w-full bg-card border border-border rounded-md shadow-lg p-3 mt-1">
            <p className="text-sm text-muted-foreground">
              कोणतेही पर्यवेक्षक आढळले नाही.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Nodal Notice Section ─────────────────────────────────────────────────────

function NodalNoticeSection({ nodalOfficer }: { nodalOfficer: NodalOfficer }) {
  const { data: supervisors = [] } = useNodalOfficerSupervisors(
    nodalOfficer.id,
    CONST_ID,
  );
  const { data: blos = [] } = useBLOs();
  const { data: notices = [], isLoading } = useNoticesForDashboard(
    CONST_ID,
    "nodal_officer",
    nodalOfficer.id,
  );
  const issueMutation = useIssueNotice();
  const updateStatusMutation = useUpdateNoticeRecipientStatus();

  const [recipientType, setRecipientType] = useState<"supervisor" | "blo">(
    "supervisor",
  );
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const recipientOptions =
    recipientType === "supervisor"
      ? supervisors.map((s) => ({ id: s.id, label: s.name }))
      : blos
          .filter((b) => b.status === "active")
          .map((b) => ({ id: b.id, label: `${b.name} — केंद्र ${b.partNumber}` }));

  const handleIssueNotice = async () => {
    if (!recipientId) {
      toast("प्राप्तकर्ता निवडा", "error");
      return;
    }
    if (!subject.trim()) {
      toast("विषय टाका", "error");
      return;
    }
    const now = BigInt(Date.now()) * BigInt(1_000_000);
    const refNo = `NOD-${CONST_ID}-${Date.now()}`;
    const notice: Notice = {
      id: refNo,
      noticeNumber: refNo,
      subject,
      content,
      constituencyId: CONST_ID,
      createdById: nodalOfficer.id,
      createdByName: nodalOfficer.name,
      createdByRole: "nodal",
      recipientType,
      recipientId,
      status: "active",
      issuedDate: now,
      createdAt: now,
      updatedAt: now,
      noticeType: "",
      clearedForHonorarium: false,
      issuingAuthority: "",
      noticeRecipients: [
        { recipientId, recipientType, deliveryStatus: "pending" },
      ],
      printHistory: [],
    };
    try {
      await issueMutation.mutateAsync(notice);
      toast("नोटीस दिली", "success");
      setSubject("");
      setContent("");
      setRecipientId("");
    } catch {
      toast("नोटीस देताना त्रुटी आली", "error");
    }
  };

  const printNotice = (n: Notice) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>नोटीस</title><style>body{font-family:serif;margin:30px;font-size:14px}h2{text-align:center}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{border:1px solid #333;padding:8px}th{background:#f0f0f0}</style></head><body><h2>नोटीस — खडकवासळा विधानसभा क्षेत्र (211)</h2><table><tr><th>संदर्भ क्र.</th><td>${n.noticeNumber}</td></tr><tr><th>विषय</th><td>${n.subject}</td></tr><tr><th>दिनांक</th><td>${new Date(Number(n.issuedDate / BigInt(1_000_000))).toLocaleDateString("hi-IN")}</td></tr><tr><th>जारी केलेले</th><td>${n.createdByName}</td></tr><tr><th>आशय</th><td>${n.content}</td></tr></table></body></html>`,
    );
    w.document.close();
    w.print();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Issue Notice Form */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-primary mb-3">
          नवीन नोटीस द्या
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">प्राप्तकर्त्याचा प्रकार</Label>
            <Select
              value={recipientType}
              onValueChange={(v) => {
                setRecipientType(v as "supervisor" | "blo");
                setRecipientId("");
              }}
            >
              <SelectTrigger data-ocid="nodal.notice.recipient_type.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supervisor">पर्यवेक्षक</SelectItem>
                <SelectItem value="blo">BLO</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">प्राप्तकर्ता *</Label>
            <Select value={recipientId} onValueChange={setRecipientId}>
              <SelectTrigger data-ocid="nodal.notice.recipient.select">
                <SelectValue placeholder="निवडा" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {recipientOptions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">विषय *</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="नोटीसचा विषय"
              data-ocid="nodal.notice.subject.input"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">आशय</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="नोटीसचा आशय..."
              rows={3}
              data-ocid="nodal.notice.content.textarea"
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="mt-3"
          onClick={handleIssueNotice}
          disabled={issueMutation.isPending}
          data-ocid="nodal.notice.submit_button"
        >
          {issueMutation.isPending ? "देत आहे..." : "नोटीस द्या"}
        </Button>
      </div>

      {/* Notices List */}
      <div>
        <h3 className="text-sm font-semibold text-primary mb-2">
          नोटीस इतिहास
        </h3>
        {isLoading ? (
          <p className="text-muted-foreground text-sm animate-pulse">
            लोड होत आहे...
          </p>
        ) : notices.length === 0 ? (
          <div
            className="flex flex-col items-center py-8 gap-2"
            data-ocid="nodal.notices.empty_state"
          >
            <span className="text-3xl">📨</span>
            <p className="text-muted-foreground text-sm">
              अजून कोणतीही नोटीस नाही.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>संदर्भ क्र.</TableHead>
                  <TableHead>विषय</TableHead>
                  <TableHead>प्राप्तकर्ता</TableHead>
                  <TableHead>स्थिती</TableHead>
                  <TableHead>दिनांक</TableHead>
                  <TableHead>कृती</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notices.map((n, i) => {
                  const firstRecipient = n.noticeRecipients?.[0];
                  const deliveryStatus =
                    firstRecipient?.deliveryStatus ?? "pending";
                  return (
                    <TableRow
                      key={n.id}
                      data-ocid={`nodal.notices.item.${i + 1}`}
                    >
                      <TableCell className="font-mono text-xs">
                        {n.noticeNumber}
                      </TableCell>
                      <TableCell className="font-medium max-w-[160px] truncate">
                        {n.subject}
                      </TableCell>
                      <TableCell className="text-sm">
                        {n.recipientType === "supervisor" ? "पर्यवेक्षक" : "BLO"}
                      </TableCell>
                      <TableCell>
                        <DeliveryStatusBadge status={deliveryStatus} />
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(
                          Number(n.issuedDate / BigInt(1_000_000)),
                        ).toLocaleDateString("hi-IN")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {deliveryStatus === "pending" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              disabled={updateStatusMutation.isPending}
                              onClick={() =>
                                updateStatusMutation.mutate(
                                  {
                                    noticeId: n.id,
                                    recipientId: n.recipientId,
                                    newStatus: "delivered",
                                    recipientType: n.recipientType,
                                  },
                                  {
                                    onSuccess: () =>
                                      toast("वितरित चिन्हांकित", "success"),
                                  },
                                )
                              }
                              data-ocid={`nodal.notices.deliver_button.${i + 1}`}
                            >
                              वितरित
                            </Button>
                          )}
                          {deliveryStatus === "delivered" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              disabled={updateStatusMutation.isPending}
                              onClick={() =>
                                updateStatusMutation.mutate(
                                  {
                                    noticeId: n.id,
                                    recipientId: n.recipientId,
                                    newStatus: "read",
                                    recipientType: n.recipientType,
                                  },
                                  {
                                    onSuccess: () =>
                                      toast("वाचले चिन्हांकित", "success"),
                                  },
                                )
                              }
                              data-ocid={`nodal.notices.read_button.${i + 1}`}
                            >
                              वाचले
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => printNotice(n)}
                            aria-label="प्रिंट"
                            data-ocid={`nodal.notices.print_button.${i + 1}`}
                          >
                            <Printer size={12} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Nodal Officer Dashboard (for logged-in nodal officer) ────────────────────

function NodalDashboard({ officer }: { officer: NodalOfficer }) {
  const { data: supervisors = [], isLoading: supLoading } =
    useNodalOfficerSupervisors(officer.id, CONST_ID);
  const { data: allBLOs = [] } = useBLOs();
  const [expandedSup, setExpandedSup] = useState<string | null>(null);

  const getBLOsForSupervisor = (sup: Supervisor) =>
    allBLOs.filter(
      (b) =>
        sup.assignedStationIds.includes(b.partNumber) ||
        sup.assignedStationIds.includes(String(b.partNumber)),
    );

  return (
    <div className="flex flex-col gap-4" data-ocid="nodal.dashboard.page">
      <div className="flex items-center gap-2">
        <Users size={18} className="text-primary" />
        <h2 className="text-lg font-bold text-primary">
          नमस्कार, {officer.name}
        </h2>
      </div>

      <Tabs defaultValue="supervisors">
        <TabsList className="mb-2">
          <TabsTrigger value="supervisors" data-ocid="nodal.supervisors.tab">
            मुख्य यादी
          </TabsTrigger>
          <TabsTrigger value="notices" data-ocid="nodal.notices.tab">
            नोटीस व्यवस्थापन
          </TabsTrigger>
        </TabsList>

        <TabsContent value="supervisors">
          {supLoading ? (
            <div
              className="flex items-center justify-center py-12"
              data-ocid="nodal.supervisors.loading_state"
            >
              <span className="text-muted-foreground animate-pulse">
                लोड होत आहे...
              </span>
            </div>
          ) : supervisors.length === 0 ? (
            <div
              className="flex flex-col items-center py-12 gap-2"
              data-ocid="nodal.supervisors.empty_state"
            >
              <span className="text-3xl">👥</span>
              <p className="text-muted-foreground">
                कोणतेही पर्यवेक्षक नियुक्त नाही.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {supervisors.map((sup, i) => {
                const supBLOs = getBLOsForSupervisor(sup);
                const isExpanded = expandedSup === sup.id;
                return (
                  <div
                    key={sup.id}
                    className="border border-border rounded-lg overflow-hidden"
                    data-ocid={`nodal.supervisor.item.${i + 1}`}
                  >
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/30 text-left"
                      onClick={() => setExpandedSup(isExpanded ? null : sup.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm">
                          {sup.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {sup.designation}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {sup.assignedStationIds.length} केंद्रे
                        </Badge>
                        <Badge
                          variant={sup.isActive ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {sup.isActive ? "सक्रिय" : "निष्क्रिय"}
                        </Badge>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border bg-background px-4 py-3">
                        <p className="text-xs font-semibold text-primary mb-2">
                          BLO यादी ({supBLOs.length})
                        </p>
                        {supBLOs.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            कोणतेही BLO नाही.
                          </p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/40">
                                <TableHead className="text-xs">नाव</TableHead>
                                <TableHead className="text-xs text-center">
                                  केंद्र क्र.
                                </TableHead>
                                <TableHead className="text-xs">
                                  केंद्राचे नाव
                                </TableHead>
                                <TableHead className="text-xs">स्थिती</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {supBLOs.map((b, bi) => (
                                <TableRow
                                  key={b.id}
                                  data-ocid={`nodal.sup.blo.item.${bi + 1}`}
                                >
                                  <TableCell className="text-xs">
                                    {b.name}
                                  </TableCell>
                                  <TableCell className="text-xs text-center font-mono">
                                    {b.partNumber}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {b.partName}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    <Badge
                                      variant={
                                        b.status === "active"
                                          ? "default"
                                          : "outline"
                                      }
                                      className="text-xs"
                                    >
                                      {b.status === "active"
                                        ? "सक्रिय"
                                        : "निष्क्रिय"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notices">
          <NodalNoticeSection nodalOfficer={officer} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function NodalOfficersPage() {
  const { actor, isFetching } = useActor(createActor);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Partial<NodalOfficer>>(emptyOfficer());
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAssign, setShowAssign] = useState<NodalOfficer | null>(null);
  const deleteNodalOfficerMutation = useDeleteNodalOfficer();

  const isAdmin = isSuperAdminLoggedIn() || isAdminLoggedIn();
  const currentNodal = getCurrentNodalOfficer();

  const { data: officers = [], isLoading } = useQuery<NodalOfficer[]>({
    queryKey: ["nodalOfficers"],
    queryFn: async () => {
      if (!actor) return [];
      return getNodalOfficers(actor);
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });

  const { data: supervisors = [] } = useQuery<Supervisor[]>({
    queryKey: ["supervisors"],
    queryFn: async () => {
      if (!actor) return [];
      return getSupervisors(actor);
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });

  const supMap = Object.fromEntries(supervisors.map((s) => [s.id, s]));

  // If a nodal officer is logged in (not admin), show their personal dashboard
  if (currentNodal && !isAdmin) {
    return <NodalDashboard officer={currentNodal} />;
  }

  const openNew = () => {
    setEditing(emptyOfficer());
    setIsEditing(false);
    setShowForm(true);
  };
  const openEdit = (o: NodalOfficer) => {
    setEditing({ ...o });
    setIsEditing(true);
    setShowForm(true);
  };
  const setField = (field: keyof NodalOfficer, value: unknown) =>
    setEditing((prev) => ({ ...prev, [field]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) {
      toast("बॅकेंड उपलब्ध नाही", "error");
      return;
    }
    setSaving(true);
    try {
      const now = BigInt(Date.now()) * BigInt(1_000_000);
      const officer: NodalOfficer = {
        id:
          isEditing && editing.id
            ? editing.id
            : `nodal-${CONST_ID}-${editing.designation}-${Date.now()}`,
        name: editing.name ?? "",
        designation: editing.designation ?? "",
        password: editing.password ?? "",
        constituencyId: CONST_ID,
        assignedSupervisorIds: editing.assignedSupervisorIds ?? [],
        isActive: editing.isActive ?? true,
        createdAt: isEditing ? (editing.createdAt ?? now) : now,
        updatedAt: now,
        loginAttempts: isEditing
          ? (editing.loginAttempts ?? BigInt(0))
          : BigInt(0),
        isLocked: isEditing ? (editing.isLocked ?? false) : false,
        phone: editing.phone ?? "",
      };
      const ok = await saveNodalOfficer(actor, officer);
      if (ok) {
        qc.invalidateQueries({ queryKey: ["nodalOfficers"] });
        toast(
          isEditing ? "नोडल अधिकारी अद्यतनित" : "नवीन नोडल अधिकारी जोडला",
          "success",
        );
        setShowForm(false);
      } else {
        toast("जतन अयशस्वी", "error");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast(`जतन करताना त्रुटी: ${msg}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSupervisor = (supId: string, checked: boolean) => {
    const current = editing.assignedSupervisorIds ?? [];
    setField(
      "assignedSupervisorIds",
      checked ? [...current, supId] : current.filter((id) => id !== supId),
    );
  };

  const handleAssignSave = async () => {
    if (!showAssign || !actor) return;
    try {
      const now = BigInt(Date.now()) * BigInt(1_000_000);
      const ok = await saveNodalOfficer(actor, {
        ...showAssign,
        assignedSupervisorIds: editing.assignedSupervisorIds ?? [],
        updatedAt: now,
      });
      if (ok) {
        qc.invalidateQueries({ queryKey: ["nodalOfficers"] });
        toast("नियुक्ती अद्यतनित झाली", "success");
        setShowAssign(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast(`नियुक्ती जतन त्रुटी: ${msg}`, "error");
    }
  };

  return (
    <div className="flex flex-col gap-4" data-ocid="nodal-officers.page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-primary">नोडल अधिकारी</h2>
        {isAdmin && (
          <Button
            type="button"
            size="sm"
            onClick={openNew}
            data-ocid="nodal-officers.add_button"
          >
            + नवीन नोडल अधिकारी जोडा
          </Button>
        )}
      </div>

      {isLoading ? (
        <div
          className="flex items-center justify-center py-12"
          data-ocid="nodal-officers.loading_state"
        >
          <span className="text-muted-foreground animate-pulse">
            लोड होत आहे...
          </span>
        </div>
      ) : officers.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12 gap-2"
          data-ocid="nodal-officers.empty_state"
        >
          <span className="text-4xl">👤</span>
          <p className="text-muted-foreground">
            अद्याप कोणीही नोडल अधिकारी नाही.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-3 py-2 text-left font-semibold">नाव</th>
                <th className="px-3 py-2 text-left font-semibold">पद</th>
                <th className="px-3 py-2 text-right font-semibold">
                  नियुक्त पर्यवेक्षक
                </th>
                <th className="px-3 py-2 text-left font-semibold">स्थिती</th>
                <th className="px-3 py-2 text-left font-semibold">कृती</th>
              </tr>
            </thead>
            <tbody>
              {officers.map((o, i) => (
                <tr
                  key={o.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                  data-ocid={`nodal-officers.item.${i + 1}`}
                >
                  <td className="px-3 py-2 font-medium">{o.name}</td>
                  <td className="px-3 py-2">{o.designation}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {o.assignedSupervisorIds.length}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                    >
                      {o.isActive ? "सक्रिय" : "निष्क्रिय"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(o)}
                          data-ocid={`nodal-officers.edit_button.${i + 1}`}
                        >
                          संपादित
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowAssign(o);
                            setField("assignedSupervisorIds", [
                              ...o.assignedSupervisorIds,
                            ]);
                          }}
                          data-ocid={`nodal-officers.assign_button.${i + 1}`}
                        >
                          नियुक्ती
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            if (
                              !window.confirm(
                                "हा नोडल अधिकारी हटवायचा आहे का? हे पूर्ववत होणार नाही.",
                              )
                            )
                              return;
                            try {
                              await deleteNodalOfficerMutation.mutateAsync({
                                id: o.id,
                                constituencyId: CONST_ID,
                              });
                              qc.invalidateQueries({
                                queryKey: ["nodalOfficers"],
                              });
                              toast("नोडल अधिकारी यशस्वीरित्या हटवले", "success");
                              recordDeletion(
                                "नोडल अधिकारी",
                                o.name,
                                "admin",
                                "Admin द्वारे हटवले",
                              );
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
                          data-ocid={`nodal-officers.delete_button.${i + 1}`}
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

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => !v && setShowForm(false)}>
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="nodal-officers.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-primary">
              {isEditing ? "नोडल अधिकारी संपादित" : "नवीन नोडल अधिकारी"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-3 mt-2">
            <div>
              <Label htmlFor="nodal-name">नाव *</Label>
              <Input
                id="nodal-name"
                value={editing.name ?? ""}
                onChange={(e) => setField("name", e.target.value)}
                required
                data-ocid="nodal-officers.name.input"
              />
            </div>
            <div>
              <Label htmlFor="nodal-des">पद *</Label>
              <Input
                id="nodal-des"
                value={editing.designation ?? ""}
                onChange={(e) => setField("designation", e.target.value)}
                required
                data-ocid="nodal-officers.designation.input"
              />
            </div>
            {!isEditing && (
              <div>
                <Label htmlFor="nodal-pwd">पासवर्ड *</Label>
                <Input
                  id="nodal-pwd"
                  type="password"
                  value={editing.password ?? ""}
                  onChange={(e) => setField("password", e.target.value)}
                  required
                  data-ocid="nodal-officers.password.input"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={editing.isActive ?? true}
                onCheckedChange={(c) => setField("isActive", c)}
                data-ocid="nodal-officers.active.switch"
              />
              <Label>सक्रिय</Label>
            </div>

            {/* Supervisor assignment section */}
            <div className="border border-border rounded-md p-3 bg-muted/20">
              <p className="text-sm font-semibold text-primary mb-2">
                नियुक्त पर्यवेक्षक{" "}
                {(editing.assignedSupervisorIds ?? []).length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    ({(editing.assignedSupervisorIds ?? []).length} निवडले)
                  </span>
                )}
              </p>
              <SupervisorSearchPicker
                supervisors={supervisors}
                selectedIds={editing.assignedSupervisorIds ?? []}
                onChange={(ids) => setField("assignedSupervisorIds", ids)}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                data-ocid="nodal-officers.cancel_button"
              >
                रद्द करा
              </Button>
              <Button
                type="submit"
                disabled={saving}
                data-ocid="nodal-officers.save_button"
              >
                {saving ? "जतन होत आहे..." : "जतन करा"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Supervisors Dialog */}
      <Dialog
        open={!!showAssign}
        onOpenChange={(v) => !v && setShowAssign(null)}
      >
        <DialogContent
          className="sm:max-w-sm max-h-[80vh] overflow-y-auto"
          data-ocid="nodal-officers.assign.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-primary">
              पर्यवेक्षक नियुक्ती — {showAssign?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {supervisors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                कोणतेही पर्यवेक्षक उपलब्ध नाही
              </p>
            ) : (
              supervisors.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 px-2 py-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={(editing.assignedSupervisorIds ?? []).includes(
                      s.id,
                    )}
                    onChange={(e) =>
                      handleToggleSupervisor(s.id, e.target.checked)
                    }
                    className="accent-primary"
                  />
                  <span className="text-sm">
                    {s.name} — {s.phone}
                  </span>
                </label>
              ))
            )}
            <p className="text-xs text-muted-foreground">
              नियुक्त:{" "}
              {(editing.assignedSupervisorIds ?? [])
                .map((id) => supMap[id]?.name ?? id)
                .join(", ") || "कोणी नाही"}
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAssign(null)}
                data-ocid="nodal-officers.assign.cancel_button"
              >
                रद्द करा
              </Button>
              <Button
                type="button"
                onClick={handleAssignSave}
                data-ocid="nodal-officers.assign.confirm_button"
              >
                जतन करा
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
