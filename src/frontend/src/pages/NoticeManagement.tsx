import type { Notice } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useAddNoticePrintRecord,
  useBLOs,
  useIssueNotice,
  useNodalOfficers,
  useNoticeSettings,
  useNotices,
  useSaveNoticeSettings,
  useSupervisors,
  useUpdateNoticeDeliveryStatus,
} from "@/hooks/useQueries";
import { getCurrentNodalOfficer, getCurrentSupervisor } from "@/lib/auth";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

const CONST_ID = "211";

function generateNoticeNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const seq = now.getTime() % 100000;
  return `NTC/${y}/${String(seq).padStart(5, "0")}`;
}

function formatDateMs(ts: bigint | number | undefined): string {
  if (ts === undefined || ts === null) return "—";
  try {
    const ms = typeof ts === "bigint" ? Number(ts) : ts;
    return new Date(ms).toLocaleDateString("mr-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "प्रलंबित";
    case "delivered":
      return "वितरित";
    case "read":
      return "वाचले";
    default:
      return status || "प्रलंबित";
  }
}

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "pending":
      return "outline";
    case "delivered":
      return "secondary";
    case "read":
      return "default";
    default:
      return "outline";
  }
}

interface Props {
  isSupMode?: boolean;
  isNodalMode?: boolean;
}

const NOTICE_TYPES = [
  "कारणे दाखवा नोटीस",
  "नोटीस 1",
  "नोटीस 2",
  "नोटीस 3",
  "शिस्तभंगाची कारवाई",
  "पोलीस कारवाई",
];

const ISSUING_AUTHORITIES = [
  "तहसीलदार",
  "उपविभागीय अधिकारी",
  "पर्यवेक्षक",
  "नोडल अधिकारी",
];

interface SearchableOption {
  id: string;
  label: string;
}

function SearchableRecipient({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: SearchableOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options.slice(0, 50);

  const selected = options.find((o) => o.id === value);

  // When value resets externally (e.g. after form reset), also clear local query
  const prevValueRef = { current: value };
  if (prevValueRef.current !== value && !value) {
    setQuery("");
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={open ? query : (selected?.label ?? "")}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value) onChange("");
        }}
        onFocus={(e) => {
          setQuery(
            e.currentTarget.value === (selected?.label ?? "") ? "" : query,
          );
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={placeholder ?? "शोधा..."}
        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
        data-ocid="notice.search_input"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 max-h-56 overflow-y-auto border border-border rounded-md bg-card shadow-lg">
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(o.id);
                setQuery("");
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BatchRecipientSelector({
  recipientOptions,
  recipientType,
  batchPartFilter,
  setBatchPartFilter,
  batchRecipientIds,
  setBatchRecipientIds,
}: {
  recipientOptions: Array<{ id: string; label: string }>;
  recipientType: string;
  batchPartFilter: string;
  setBatchPartFilter: (v: string) => void;
  batchRecipientIds: string[];
  setBatchRecipientIds: (
    updater: string[] | ((prev: string[]) => string[]),
  ) => void;
}) {
  const filteredOpts =
    recipientType === "blo" && batchPartFilter
      ? recipientOptions.filter((o) =>
          o.label.toLowerCase().includes(batchPartFilter.toLowerCase()),
        )
      : recipientOptions;

  return (
    <div>
      {recipientType === "blo" && (
        <input
          type="text"
          placeholder="भाग क्रमांक किंवा नाव टाका (फिल्टर)"
          value={batchPartFilter}
          onChange={(e) => setBatchPartFilter(e.target.value)}
          className="border border-input rounded px-2 py-1 text-sm w-full mb-2 bg-background text-foreground"
        />
      )}
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => setBatchRecipientIds(filteredOpts.map((o) => o.id))}
        >
          सर्व निवडा
        </button>
        <span className="text-muted-foreground text-xs">|</span>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:underline"
          onClick={() => setBatchRecipientIds([])}
        >
          सर्व रद्द करा
        </button>
        <span className="text-xs text-primary ml-2 font-medium">
          {batchRecipientIds.length} निवडले
        </span>
      </div>
      <div className="max-h-56 overflow-y-auto border border-border rounded-md">
        {filteredOpts.map((opt) => (
          <label
            key={opt.id}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/30 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={batchRecipientIds.includes(opt.id)}
              onChange={(e) => {
                const checked = e.target.checked;
                setBatchRecipientIds((prev) =>
                  checked
                    ? prev.includes(opt.id)
                      ? prev
                      : [...prev, opt.id]
                    : prev.filter((x) => x !== opt.id),
                );
              }}
              className="w-4 h-4"
            />
            <span className="text-sm">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

interface NoticeFormState {
  recipientType: "blo" | "supervisor" | "nodal";
  recipientId: string;
  batchRecipientIds: string[];
  noticeDate: string;
  noticeText: string;
  noticeType: string;
  issuingAuthority: string;
  isBatch: boolean;
}

const EMPTY_FORM: NoticeFormState = {
  recipientType: "blo",
  recipientId: "",
  batchRecipientIds: [],
  noticeDate: new Date().toISOString().slice(0, 10),
  noticeText: "",
  noticeType: "",
  issuingAuthority: "",
  isBatch: false,
};

export function NoticeManagement({
  isSupMode = false,
  isNodalMode = false,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NoticeFormState>({ ...EMPTY_FORM });
  const [formError, setFormError] = useState("");
  const [batchPartFilter, setBatchPartFilter] = useState("");
  const [showNoticeSettings, setShowNoticeSettings] = useState(false);
  const [nsForm, setNsForm] = useState<Record<string, string> | null>(null);

  const supervisor = getCurrentSupervisor();
  const nodal = getCurrentNodalOfficer();

  const currentRole = isSupMode
    ? "supervisor"
    : isNodalMode
      ? "nodal_officer"
      : "admin";
  const currentId = isSupMode
    ? (supervisor?.id ?? "")
    : isNodalMode
      ? (nodal?.id ?? "")
      : "admin";
  const currentName = isSupMode
    ? (supervisor?.name ?? "पर्यवेक्षक")
    : isNodalMode
      ? (nodal?.name ?? "नोडल अधिकारी")
      : "प्रशासक";

  const {
    data: allNotices = [],
    isLoading: noticesLoading,
    error: noticesError,
    refetch: refetchNotices,
  } = useNotices();
  const { data: blos = [] } = useBLOs();
  const allBLOs = blos;
  const { data: supervisors = [] } = useSupervisors();
  const { data: nodalOfficers = [] } = useNodalOfficers();

  const issueNotice = useIssueNotice();
  const updateStatus = useUpdateNoticeDeliveryStatus();
  const addPrintRecord = useAddNoticePrintRecord();
  const saveNsMutation = useSaveNoticeSettings();
  const { data: noticeSettingsData } = useNoticeSettings(CONST_ID);
  const ns = noticeSettingsData ?? {
    noticeHeaderLine1: "२११ खडकवासला विधानसभा मतदार संघ तथा तहसिलदार हवेली (पुणे)",
    noticeHeaderLine2: "यांचे कार्यालय शुक्रवार पेठ, खडकमाळ आळी  ता. हवेली, जि. पुणे",
    noticeHeaderPhone: "020-24472348",
    noticeHeaderEmail: "211khadakwaslaac@gmail.com",
    noticeOfficerName: "(डॉ. अर्चना निकम)",
    noticeOfficerDesignation: "सहा.मतदार नोंदणी अधिकारी",
    noticeOfficerConstituency: "२११ खडकवासला विधानसभा मतदार संघ",
    noticeOfficerTehsil: "तथा तहसिलदार हवेली (पुणे)",
  };

  // Filter notices for current user's role
  const notices = useMemo(() => {
    if (isSupMode && supervisor) {
      // Build set of BLO IDs assigned to this supervisor (match by partNumber)
      const assignedStationSet = new Set(
        (supervisor.assignedStationIds ?? []).map(String),
      );
      const assignedBloIdSet = new Set(
        blos
          .filter((b) => assignedStationSet.has(String(b.partNumber)))
          .map((b) => b.id),
      );
      return allNotices.filter(
        (n) =>
          (n.recipientType === "blo" && assignedBloIdSet.has(n.recipientId)) ||
          (n.recipientType === "supervisor" && n.recipientId === supervisor.id),
      );
    }
    if (isNodalMode && nodal) {
      return allNotices.filter(
        (n) =>
          (n.recipientType === "nodal" && n.recipientId === nodal.id) ||
          (n.createdByRole === "nodal_officer" && n.createdById === nodal.id),
      );
    }
    return allNotices;
  }, [allNotices, blos, isSupMode, isNodalMode, supervisor, nodal]);

  const recipientOptions = useMemo(() => {
    if (form.recipientType === "blo") {
      if (isSupMode && supervisor) {
        // Supervisor mode: only show BLOs assigned to this supervisor
        const assignedIds = new Set(
          (supervisor.assignedStationIds ?? []).map(String),
        );
        const filteredBlos = blos.filter((b) =>
          assignedIds.has(String(b.partNumber)),
        );
        return filteredBlos.map((b) => ({
          id: b.id,
          label: `${b.name} (केंद्र ${b.partNumber})`,
        }));
      }
      if (isNodalMode && nodal) {
        // Nodal mode: show BLOs from this nodal officer's assigned supervisors
        const assignedSupIds = new Set(
          (nodal.assignedSupervisorIds ?? []).map(String),
        );
        const assignedSupStationIds = new Set(
          supervisors
            .filter((s) => assignedSupIds.has(String(s.id)))
            .flatMap((s) => (s.assignedStationIds ?? []).map(String)),
        );
        const filteredBlos = blos.filter((b) =>
          assignedSupStationIds.has(String(b.partNumber)),
        );
        return filteredBlos.map((b) => ({
          id: b.id,
          label: `${b.name} (केंद्र ${b.partNumber})`,
        }));
      }
      return blos.map((b) => ({
        id: b.id,
        label: `${b.name} (केंद्र ${b.partNumber})`,
      }));
    }
    if (form.recipientType === "supervisor") {
      if (isNodalMode && nodal) {
        // Nodal mode: only show supervisors assigned to this nodal officer
        const assignedSupIds = new Set(
          (nodal.assignedSupervisorIds ?? []).map(String),
        );
        return supervisors
          .filter((s) => assignedSupIds.has(String(s.id)))
          .map((s) => ({ id: s.id, label: s.name }));
      }
      return supervisors.map((s) => ({ id: s.id, label: s.name }));
    }
    return nodalOfficers.map((n) => ({ id: n.id, label: n.name }));
  }, [
    form.recipientType,
    blos,
    supervisors,
    nodalOfficers,
    isSupMode,
    isNodalMode,
    supervisor,
    nodal,
  ]);

  const handleOpenForm = useCallback(() => {
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setFormError("");
  }, []);

  const handleFormChange = useCallback(
    <K extends keyof NoticeFormState>(key: K, value: NoticeFormState[K]) => {
      setForm((prev) => {
        if (key === "recipientType") {
          setBatchPartFilter("");
          return {
            ...prev,
            recipientType: value as NoticeFormState["recipientType"],
            recipientId: "",
            batchRecipientIds: [],
          };
        }
        return { ...prev, [key]: value };
      });
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    setFormError("");
    if (form.isBatch) {
      if (form.batchRecipientIds.length === 0) {
        setFormError("कृपया किमान एक प्राप्तकर्ता निवडा.");
        return;
      }
    } else if (!form.recipientId) {
      setFormError("कृपया प्राप्तकर्ता निवडा.");
      return;
    }
    if (!form.noticeText.trim()) {
      setFormError("कृपया नोटीस मजकूर भरा.");
      return;
    }

    const now = BigInt(Date.now());
    const targetIds = form.isBatch
      ? form.batchRecipientIds
      : [form.recipientId];

    try {
      for (const rid of targetIds) {
        const noticeNumber = generateNoticeNumber();
        const notice: Notice = {
          id: `ntc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          constituencyId: CONST_ID,
          noticeNumber,
          subject: noticeNumber,
          content: form.noticeText.trim(),
          status: "pending",
          issuedDate: now,
          createdAt: now,
          updatedAt: now,
          recipientType: form.recipientType,
          recipientId: rid,
          createdByRole: currentRole,
          createdById: currentId,
          createdByName: currentName,
          printHistory: [],
          noticeRecipients: [],
          clearedForHonorarium: false,
          noticeType: form.noticeType,
          issuingAuthority: form.issuingAuthority,
        };
        await issueNotice.mutateAsync(notice);
        // Small delay to ensure unique timestamps for notice numbers
        await new Promise((r) => setTimeout(r, 5));
      }
      await refetchNotices();
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
    } catch (err) {
      setFormError(
        `नोटीस जतन करताना त्रुटी: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }, [form, currentRole, currentId, currentName, issueNotice, refetchNotices]);

  const handleStatusUpdate = useCallback(
    async (notice: Notice, newStatus: string) => {
      try {
        await updateStatus.mutateAsync({
          noticeId: notice.id,
          recipientId: notice.recipientId,
          recipientType: notice.recipientType ?? "blo",
          status: newStatus,
        });
        await refetchNotices();
      } catch (err) {
        console.error("नोटीस स्थिती अपडेट अयशस्वी:", err);
      }
    },
    [updateStatus, refetchNotices],
  );

  const handlePrint = useCallback(
    async (notice: Notice) => {
      try {
        await addPrintRecord.mutateAsync({
          constituencyId: CONST_ID,
          noticeId: notice.id,
          printedBy: currentId,
          printedByName: currentName,
        });
      } catch {
        // Non-critical: proceed even if record fails
      }

      let recipientName = "—";
      let partNumber = "";
      if (notice.recipientType === "blo" || !notice.recipientType) {
        const rid = notice.recipientId;
        const b = allBLOs.find((x) => x.id === rid);
        recipientName = b ? `${b.name}` : (rid ?? "—");
        partNumber = b ? String(b.partNumber) : "";
      } else if (notice.recipientType === "supervisor") {
        const s = supervisors.find((x) => x.id === notice.recipientId);
        recipientName = s?.name ?? notice.recipientId ?? "—";
      } else if (notice.recipientType === "nodal") {
        const n = nodalOfficers.find((x) => x.id === notice.recipientId);
        recipientName = n?.name ?? notice.recipientId ?? "—";
      }

      const printWin = window.open("", "_blank", "width=850,height=1000");
      if (!printWin) return;

      printWin.document.write(`
<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="UTF-8" />
  <title>नोटीस - ${notice.noticeNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap');
    @page { size: A4 portrait; margin: 2cm; }
    body { font-family: 'Noto Sans Devanagari', serif; font-size: 13pt; line-height: 1.8; color: #000; margin: 0; padding: 0; }
    .letterhead { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
    .letterhead .main-title { font-size: 17pt; font-weight: 700; margin: 0 0 4px 0; }
    .letterhead .sub-title { font-size: 13pt; font-weight: 600; margin: 0; }
    .ref-date-row { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 12pt; }
    .notice-heading { text-align: center; font-size: 15pt; font-weight: 700; text-decoration: underline; margin: 18px 0 14px 0; }
    .notice-type-badge { text-align: center; font-size: 12pt; font-weight: 600; margin-bottom: 14px; }
    .notice-body { margin: 14px 0; font-size: 13pt; white-space: pre-wrap; min-height: 120px; text-align: justify; }
    .recipient-box { border: 1px solid #333; padding: 10px 14px; margin: 14px 0; }
    .recipient-box p { margin: 2px 0; font-size: 12pt; }
    .footer-sig { margin-top: 48px; display: flex; justify-content: flex-end; }
    .sig-block { text-align: center; }
    .sig-line { border-top: 1px solid #333; width: 200px; margin: 0 auto 4px auto; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="letterhead">
    <p class="main-title">${ns.noticeHeaderLine1}</p>
    <p class="sub-title">${ns.noticeHeaderLine2}</p>
    <p style="font-size:11pt;margin:4px 0 0 0;">संपर्क: ${ns.noticeHeaderPhone} | ई-मेल: ${ns.noticeHeaderEmail}</p>
  </div>
  <div class="ref-date-row">
    <span>संदर्भ क्र.: <strong>${notice.noticeNumber}</strong></span>
    <span>दिनांक: <strong>${formatDateMs(notice.issuedDate)}</strong></span>
  </div>
  <div class="notice-heading">नोटीस</div>
  <div class="notice-type-badge">[${notice.noticeType || "नोटीस"}]</div>
  <div class="recipient-box">
    <p><strong>प्रति:</strong></p>
    <p><strong>${recipientName}</strong>${partNumber ? `, मतदान केंद्र क्र. ${partNumber}` : ""}</p>
    <p>${ns.noticeOfficerConstituency}</p>
  </div>
  <div class="notice-body">${notice.content || "—"}</div>
  <div class="footer-sig">
    <div class="sig-block">
      <div class="sig-line"></div>
      <p style="margin:0;font-size:12pt;"><strong>${ns.noticeOfficerName}</strong></p>
      <p style="margin:0;font-size:11pt;">${ns.noticeOfficerDesignation}</p>
      <p style="margin:0;font-size:11pt;">${ns.noticeOfficerConstituency}</p>
      <p style="margin:0;font-size:11pt;">${ns.noticeOfficerTehsil}</p>
      <p style="margin:4px 0 0 0;font-size:11pt;">दिनांक: ______________</p>
    </div>
  </div>
</body>
</html>
      `);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
      }, 600);
    },
    [
      addPrintRecord,
      allBLOs,
      supervisors,
      nodalOfficers,
      currentId,
      currentName,
      ns,
    ],
  );

  const getRecipientDisplay = useCallback(
    (notice: Notice): { name: string; typeLabel: string } => {
      const typeLabel = (() => {
        switch (notice.recipientType) {
          case "blo":
            return "BLO";
          case "supervisor":
            return "पर्यवेक्षक";
          case "nodal":
            return "नोडल अधिकारी";
          default:
            return "BLO";
        }
      })();

      let name = "—";
      if (notice.recipientType === "blo" || !notice.recipientType) {
        const rid = notice.recipientId;
        if (allBLOs.length === 0) {
          const parts = (rid ?? "").split("-");
          if (parts.length >= 3 && parts[0] === "blo") {
            name = `BLO (केंद्र ${parts[2]})`;
          } else {
            name = rid ?? "—";
          }
        } else {
          const b = allBLOs.find((x) => x.id === rid);
          if (b) {
            name = `${b.name} (केंद्र ${b.partNumber})`;
          } else {
            const parts = (rid ?? "").split("-");
            if (parts.length >= 3 && parts[0] === "blo") {
              const partNum = parts[2];
              const byPart = allBLOs.find(
                (x) => String(x.partNumber) === partNum,
              );
              if (byPart) {
                name = `${byPart.name} (केंद्र ${byPart.partNumber})`;
              } else {
                name = `BLO (केंद्र ${partNum})`;
              }
            } else {
              name = rid ?? "—";
            }
          }
        }
      } else if (notice.recipientType === "supervisor") {
        if (supervisors.length === 0) {
          name = notice.recipientId ?? "—";
        } else {
          const s = supervisors.find((x) => x.id === notice.recipientId);
          name = s?.name ?? notice.recipientId ?? "—";
        }
      } else if (notice.recipientType === "nodal") {
        if (nodalOfficers.length === 0) {
          name = notice.recipientId ?? "—";
        } else {
          const n = nodalOfficers.find((x) => x.id === notice.recipientId);
          name = n?.name ?? notice.recipientId ?? "—";
        }
      }

      return { name, typeLabel };
    },
    [allBLOs, supervisors, nodalOfficers],
  );

  if (noticesError) {
    return (
      <div className="p-6 text-center" data-ocid="notice.error_state">
        <p className="text-destructive mb-3">
          नोटीस माहिती लोड करताना त्रुटी आली.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            void refetchNotices();
          }}
        >
          पुन्हा प्रयत्न करा
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4" data-ocid="notice.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          नोटीस व्यवस्थापन
        </h2>
        <div className="flex gap-2 flex-wrap">
          {!isSupMode && !isNodalMode && (
            <button
              type="button"
              className="bg-muted border border-border text-foreground px-3 py-1.5 rounded text-sm hover:bg-muted/70"
              onClick={() => {
                setNsForm({ ...ns } as Record<string, string>);
                setShowNoticeSettings(true);
              }}
              data-ocid="notice.settings_button"
            >
              ⚙️ नोटीस सेटिंग्ज
            </button>
          )}
          <Button
            type="button"
            onClick={handleOpenForm}
            data-ocid="notice.open_modal_button"
          >
            + नवीन नोटीस तयार करा
          </Button>
        </div>
      </div>

      {/* New Notice Form */}
      {showForm && (
        <Card className="border-primary/30 bg-card" data-ocid="notice.dialog">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">नवीन नोटीस तयार करा</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Notice Type */}
            <div className="space-y-1">
              <Label>
                नोटीस प्रकार <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.noticeType}
                onValueChange={(v) => handleFormChange("noticeType", v)}
              >
                <SelectTrigger data-ocid="notice.type_select">
                  <SelectValue placeholder="नोटीस प्रकार निवडा" />
                </SelectTrigger>
                <SelectContent>
                  {NOTICE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Issuing Authority */}
            <div className="space-y-1">
              <Label>
                जारी करणारे अधिकारी <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.issuingAuthority}
                onValueChange={(v) => handleFormChange("issuingAuthority", v)}
              >
                <SelectTrigger data-ocid="notice.authority_select">
                  <SelectValue placeholder="अधिकारी निवडा" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUING_AUTHORITIES.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Batch toggle */}
            <div className="flex items-center gap-3 p-2 rounded-md bg-muted/40 border border-border">
              <input
                type="checkbox"
                id="notice-batch-toggle"
                checked={form.isBatch}
                onChange={(e) => handleFormChange("isBatch", e.target.checked)}
                className="accent-primary"
              />
              <label
                htmlFor="notice-batch-toggle"
                className="text-sm font-medium cursor-pointer"
              >
                📋 बॅच नोटीस — अनेक BLO ला एकाच वेळी नोटीस द्या
              </label>
            </div>

            {/* Recipient Type */}
            <div className="space-y-1">
              <Label>
                प्राप्तकर्ता प्रकार <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.recipientType}
                onValueChange={(v) =>
                  handleFormChange(
                    "recipientType",
                    v as NoticeFormState["recipientType"],
                  )
                }
              >
                <SelectTrigger data-ocid="notice.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blo">BLO</SelectItem>
                  <SelectItem value="supervisor">पर्यवेक्षक</SelectItem>
                  <SelectItem value="nodal">नोडल अधिकारी</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.isBatch ? (
              /* Batch multi-select */
              <div className="space-y-1">
                <Label>
                  प्राप्तकर्ते निवडा{" "}
                  <span className="text-xs text-muted-foreground">
                    (एकापेक्षा जास्त निवडता येतात)
                  </span>{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <BatchRecipientSelector
                  recipientOptions={recipientOptions}
                  recipientType={form.recipientType}
                  batchPartFilter={batchPartFilter}
                  setBatchPartFilter={setBatchPartFilter}
                  batchRecipientIds={form.batchRecipientIds}
                  setBatchRecipientIds={(ids) => {
                    const resolved =
                      typeof ids === "function"
                        ? ids(form.batchRecipientIds)
                        : ids;
                    setForm((prev) => ({
                      ...prev,
                      batchRecipientIds: resolved,
                    }));
                  }}
                />
              </div>
            ) : (
              /* Single searchable recipient */
              <div className="space-y-1">
                <Label>
                  प्राप्तकर्ता{" "}
                  <span className="text-xs text-muted-foreground">
                    (
                    {form.recipientType === "blo"
                      ? "यादिभाग क्रमांक किंवा नाव"
                      : "नाव"}
                    )
                  </span>{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <SearchableRecipient
                  options={recipientOptions}
                  value={form.recipientId}
                  onChange={(v) => handleFormChange("recipientId", v)}
                  placeholder={
                    form.recipientType === "blo"
                      ? "यादिभाग क्रमांक किंवा BLO नाव टाका..."
                      : "नाव टाका..."
                  }
                />
                {form.recipientId && (
                  <p className="text-xs text-primary">
                    ✓{" "}
                    {recipientOptions.find((o) => o.id === form.recipientId)
                      ?.label ?? "निवडले"}
                  </p>
                )}
              </div>
            )}

            {/* Auto notice number */}
            <div className="space-y-1">
              <Label>नोटीस क्रमांक (स्वयंचलित)</Label>
              <div className="px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground font-mono">
                NTC/{new Date().getFullYear()}/...
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1">
              <Label htmlFor="notice-date">
                नोटीस तारीख <span className="text-destructive">*</span>
              </Label>
              <input
                id="notice-date"
                type="date"
                value={form.noticeDate}
                onChange={(e) => handleFormChange("noticeDate", e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
                data-ocid="notice.input"
              />
            </div>

            {/* Notice Text */}
            <div className="space-y-1">
              <Label htmlFor="notice-text">
                नोटीस मजकूर <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="notice-text"
                value={form.noticeText}
                onChange={(e) => handleFormChange("noticeText", e.target.value)}
                placeholder="नोटीसचा मजकूर येथे लिहा..."
                rows={5}
                data-ocid="notice.textarea"
              />
            </div>

            {formError && (
              <p
                className="text-sm text-destructive"
                data-ocid="notice.field_error"
              >
                {formError}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                onClick={() => {
                  void handleSubmit();
                }}
                disabled={issueNotice.isPending}
                data-ocid="notice.submit_button"
              >
                {issueNotice.isPending
                  ? "जतन करत आहे..."
                  : form.isBatch
                    ? `सर्वांना नोटीस द्या (${form.batchRecipientIds.length})`
                    : "नोटीस जारी करा"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseForm}
                data-ocid="notice.cancel_button"
              >
                रद्द करा
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary stats row */}
      {!noticesLoading && (
        <div
          className="flex flex-wrap gap-4 items-center px-3 py-2 bg-muted/30 rounded-md border border-border"
          data-ocid="notice.summary_row"
        >
          <span className="text-sm text-foreground font-medium">
            एकूण नोटीसा:{" "}
            <span className="font-bold text-primary">{notices.length}</span>
          </span>
          <span className="text-sm text-muted-foreground">
            प्रलंबित:{" "}
            <span className="font-semibold text-amber-700 dark:text-amber-400">
              {
                notices.filter(
                  (n) => n.status === "pending" || n.status === "issued",
                ).length
              }
            </span>
          </span>
          <span className="text-sm text-muted-foreground">
            वितरीत:{" "}
            <span className="font-semibold text-green-700 dark:text-green-400">
              {
                notices.filter(
                  (n) => n.status === "delivered" || n.status === "read",
                ).length
              }
            </span>
          </span>
          {isSupMode &&
            supervisor &&
            (() => {
              const assignedStationSet = new Set(
                (supervisor.assignedStationIds ?? []).map(String),
              );
              const assignedBloIdSet = new Set(
                blos
                  .filter((b) => assignedStationSet.has(String(b.partNumber)))
                  .map((b) => b.id),
              );
              const noticedBloCount = new Set(
                notices
                  .filter(
                    (n) =>
                      n.recipientType === "blo" &&
                      assignedBloIdSet.has(n.recipientId),
                  )
                  .map((n) => n.recipientId),
              ).size;
              if (noticedBloCount === 0) return null;
              return (
                <span className="text-sm text-destructive font-medium">
                  ⚠️ {noticedBloCount} BLO यांना नोटीस दिलेल्या आहेत
                </span>
              );
            })()}
        </div>
      )}

      {/* Notices List with Tabs */}
      {noticesLoading ? (
        <div className="space-y-2" data-ocid="notice.loading_state">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="all" data-ocid="notice.tab">
          <TabsList className="mb-3">
            <TabsTrigger value="all" data-ocid="notice.all.tab">
              सर्व ({notices.length})
            </TabsTrigger>
            <TabsTrigger value="pending" data-ocid="notice.pending.tab">
              प्रलंबित (
              {
                notices.filter(
                  (n) => n.status === "issued" || n.status === "pending",
                ).length
              }
              )
            </TabsTrigger>
            <TabsTrigger value="delivered" data-ocid="notice.delivered.tab">
              वितरीत (
              {
                notices.filter(
                  (n) => n.status === "delivered" || n.status === "read",
                ).length
              }
              )
            </TabsTrigger>
          </TabsList>

          {(["all", "pending", "delivered"] as const).map((tab) => {
            const filtered =
              tab === "all"
                ? notices
                : tab === "pending"
                  ? notices.filter(
                      (n) => n.status === "issued" || n.status === "pending",
                    )
                  : notices.filter(
                      (n) => n.status === "delivered" || n.status === "read",
                    );
            return (
              <TabsContent key={tab} value={tab}>
                {filtered.length === 0 ? (
                  <Card data-ocid={`notice.${tab}.empty_state`}>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground text-lg">
                        {tab === "pending"
                          ? "कोणतीही प्रलंबित नोटीस नाही."
                          : tab === "delivered"
                            ? "कोणतीही वितरीत नोटीस नाही."
                            : "कोणतीही नोटीस उपलब्ध नाही."}
                      </p>
                      {tab === "all" && (
                        <p className="text-sm text-muted-foreground mt-1">
                          वरील बटण दाबून नवीन नोटीस तयार करा.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2" data-ocid={`notice.${tab}.list`}>
                    {filtered.map((notice, idx) => {
                      const { name, typeLabel } = getRecipientDisplay(notice);
                      return (
                        <NoticeRow
                          key={notice.id}
                          notice={notice}
                          index={idx + 1}
                          recipientName={name}
                          recipientTypeLabel={typeLabel}
                          onPrint={handlePrint}
                          onStatusUpdate={handleStatusUpdate}
                          isUpdatingStatus={updateStatus.isPending}
                        />
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {/* Notice Settings Modal */}
      {showNoticeSettings && nsForm && (
        <dialog
          open
          aria-label="नोटीस सेटिंग्ज"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNoticeSettings(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowNoticeSettings(false);
          }}
          data-ocid="notice.settings.dialog"
        >
          <div className="bg-card rounded-xl shadow-xl border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-base font-semibold text-foreground mb-4">
              नोटीस सेटिंग्ज — खडकवासला (211)
            </h3>
            <div className="space-y-3">
              {(
                [
                  ["noticeHeaderLine1", "शीर्षक ओळ १"],
                  ["noticeHeaderLine2", "पत्ता"],
                  ["noticeHeaderPhone", "संपर्क क्रमांक"],
                  ["noticeHeaderEmail", "ई-मेल"],
                  ["noticeOfficerName", "अधिकारी नाव"],
                  ["noticeOfficerDesignation", "पदनाम"],
                  ["noticeOfficerConstituency", "मतदारसंघ"],
                  ["noticeOfficerTehsil", "तहसील"],
                ] as [string, string][]
              ).map(([field, label]) => (
                <div key={field}>
                  <label
                    htmlFor={`ns-field-${field}`}
                    className="text-sm font-medium text-foreground block mb-1"
                  >
                    {label}
                  </label>
                  <input
                    id={`ns-field-${field}`}
                    type="text"
                    value={nsForm[field] ?? ""}
                    onChange={(e) =>
                      setNsForm((prev) => ({
                        ...prev!,
                        [field]: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
                    data-ocid={`notice.settings.${field}.input`}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button
                type="button"
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted"
                onClick={() => setShowNoticeSettings(false)}
                data-ocid="notice.settings.cancel_button"
              >
                रद्द करा
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-60"
                disabled={saveNsMutation.isPending}
                onClick={() => {
                  if (!nsForm) return;
                  saveNsMutation.mutate(
                    {
                      constituencyId: CONST_ID,
                      noticeHeaderLine1: nsForm.noticeHeaderLine1 ?? "",
                      noticeHeaderLine2: nsForm.noticeHeaderLine2 ?? "",
                      noticeHeaderPhone: nsForm.noticeHeaderPhone ?? "",
                      noticeHeaderEmail: nsForm.noticeHeaderEmail ?? "",
                      noticeOfficerName: nsForm.noticeOfficerName ?? "",
                      noticeOfficerDesignation:
                        nsForm.noticeOfficerDesignation ?? "",
                      noticeOfficerConstituency:
                        nsForm.noticeOfficerConstituency ?? "",
                      noticeOfficerTehsil: nsForm.noticeOfficerTehsil ?? "",
                      updatedAt: Date.now(),
                    },
                    { onSuccess: () => setShowNoticeSettings(false) },
                  );
                }}
                data-ocid="notice.settings.save_button"
              >
                {saveNsMutation.isPending ? "जतन होत आहे..." : "जतन करा"}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}

// ── NoticeRow ───────────────────────────────────────────────────────────

interface NoticeRowProps {
  notice: Notice;
  index: number;
  recipientName: string;
  recipientTypeLabel: string;
  onPrint: (n: Notice) => void;
  onStatusUpdate: (n: Notice, s: string) => void;
  isUpdatingStatus: boolean;
}

function NoticeRow({
  notice,
  index,
  recipientName,
  recipientTypeLabel,
  onPrint,
  onStatusUpdate,
  isUpdatingStatus,
}: NoticeRowProps) {
  const nextStatus =
    notice.status === "pending"
      ? "delivered"
      : notice.status === "delivered"
        ? "read"
        : notice.status === "read"
          ? null
          : null;

  return (
    <Card
      className="bg-card border border-border"
      data-ocid={`notice.item.${index}`}
    >
      <CardContent className="py-3 px-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
          <span className="text-sm text-muted-foreground min-w-[24px] font-mono pt-0.5">
            {index}.
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-sm text-foreground truncate">
                {recipientName}
              </span>
              <Badge variant="outline" className="text-xs shrink-0">
                {recipientTypeLabel}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <span className="text-xs text-muted-foreground">
                क्र: <span className="font-mono">{notice.noticeNumber}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                दिनांक:{" "}
                {notice.issuedDate
                  ? new Date(Number(notice.issuedDate)).toLocaleDateString(
                      "mr-IN",
                    )
                  : "—"}
              </span>
              {notice.createdByName && (
                <span className="text-xs text-muted-foreground">
                  जारी: {notice.createdByName}
                </span>
              )}
            </div>
            {notice.content && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words">
                {notice.content}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Badge variant={statusVariant(notice.status)}>
              {statusLabel(notice.status)}
            </Badge>
            {nextStatus && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUpdatingStatus}
                onClick={() => onStatusUpdate(notice, nextStatus)}
                data-ocid={`notice.toggle.${index}`}
                className="text-xs"
              >
                → {statusLabel(nextStatus)}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const bloOrName = recipientName;
                const text = encodeURIComponent(
                  `नोटीस क्रमांक: ${notice.noticeNumber}\nप्राप्तकर्ता: ${bloOrName}\nनोटीस प्रकार: ${notice.noticeType || "नोटीस"}\nदिनांक: ${notice.issuedDate ? new Date(Number(notice.issuedDate)).toLocaleDateString("mr-IN") : "—"}\nथोडक्यात: ${(notice.content ?? "").slice(0, 100)}`,
                );
                window.open(`https://wa.me/?text=${text}`, "_blank");
              }}
              data-ocid={`notice.whatsapp_button.${index}`}
              className="text-xs text-green-700 border-green-300 hover:bg-green-50"
            >
              📲 WhatsApp
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPrint(notice)}
              data-ocid={`notice.print_button.${index}`}
              className="text-xs"
            >
              🖨️ प्रिंट
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
