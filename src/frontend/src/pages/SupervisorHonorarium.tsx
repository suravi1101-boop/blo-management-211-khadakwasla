import { createActor } from "@/backend";
import {
  useBLOs,
  useClearNoticeForHonorarium,
  useCreateSupervisorHonorariumRequest,
  useHonorariumEligibility,
  useNotices,
  useRestoreHonorariumEligibility,
  useSupervisorHonorariumRequestsBySupervisor,
  useSupervisors,
} from "@/hooks/useQueries";
import React from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useBackendActorCtx } from "../lib/actorContext";

const _QUARTERLY_AMOUNT = 3500;

interface QuarterlyPayment {
  id: string;
  constituencyId: string;
  bloId: string;
  quarter: string;
  amount: number;
  status: string;
  createdAt: number;
  paidAt?: number;
}

interface Props {
  supervisorId: string;
  constituencyId: string;
  supervisorName: string;
}

export default function SupervisorHonorarium({
  supervisorId,
  constituencyId,
  supervisorName,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    "request" | "my-blos" | "history" | "excluded"
  >("request");
  const [pendingRestoreIds, setPendingRestoreIds] = useState<Set<string>>(
    new Set(),
  );
  const [restoredIds, setRestoredIds] = useState<Set<string>>(new Set());
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedQuarter, setSelectedQuarter] = useState<string>("Q1");
  const [selectedBloIds, setSelectedBloIds] = useState<Set<string>>(new Set());
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [payments, setPayments] = useState<QuarterlyPayment[]>([]);
  const [expandedBloId, setExpandedBloId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: blosRaw = [] } = useBLOs() as { data: any[] };
  const { data: supervisors = [] } = useSupervisors() as { data: any[] };
  const { data: eligibilityAll = [] } = useHonorariumEligibility() as {
    data: any[];
  };
  const { data: allNotices = [] } = useNotices() as { data: any[] };
  const { data: requestsRaw = [] } =
    useSupervisorHonorariumRequestsBySupervisor(supervisorId) as {
      data: any[];
    };
  const createRequest = useCreateSupervisorHonorariumRequest();
  const clearNoticeMutation = useClearNoticeForHonorarium();
  const restoreEligibilityMutation = useRestoreHonorariumEligibility();
  // actor kept for getQuarterlyPayments only
  const actor = useBackendActorCtx();

  const supervisor = useMemo(
    () => supervisors.find((s: any) => s.id === supervisorId),
    [supervisors, supervisorId],
  );
  const assignedStations = useMemo<string[]>(
    () => supervisor?.assignedStations || supervisor?.assignedStationIds || [],
    [supervisor],
  );

  const myBlos = useMemo(() => {
    const map = new Map<string, any>();
    for (const b of blosRaw) {
      if (!assignedStations.includes(b.partNumber)) continue;
      if (
        !map.has(b.partNumber) ||
        (b.updatedAt || 0) > (map.get(b.partNumber)?.updatedAt || 0)
      )
        map.set(b.partNumber, b);
    }
    return Array.from(map.values());
  }, [blosRaw, assignedStations]);

  const myBloIds = useMemo(
    () => new Set(myBlos.map((b: any) => b.id)),
    [myBlos],
  );

  useEffect(() => {
    if (myBlos.length > 0) {
      setSelectedBloIds(new Set(myBlos.map((b: any) => b.id)));
    }
  }, [myBlos]);
  const myEligibility = useMemo(
    () => eligibilityAll.filter((e: any) => myBloIds.has(e.bloId)),
    [eligibilityAll, myBloIds],
  );
  const eligibleCount = myEligibility.filter((e: any) => e.isEligible).length;
  const ineligibleCount = myEligibility.filter(
    (e: any) => !e.isEligible,
  ).length;

  useEffect(() => {
    if (!supervisorId) return;
    actor
      ?.getQuarterlyPayments(constituencyId)
      .then((p: any) => {
        const arr: QuarterlyPayment[] = Array.isArray(p) ? p : [];
        setPayments(arr.filter((x) => myBloIds.has(x.bloId)));
      })
      .catch(() => {});
  }, [actor, constituencyId, myBloIds, supervisorId]);

  const handleSubmitReport = async (bloId: string) => {
    setSubmitting(true);
    try {
      await restoreEligibilityMutation.mutateAsync({
        constituencyId,
        bloId,
        clearedBy: `${supervisorId}:${supervisorName}`,
      });
      toast.success("अहवाल यशस्वीपणे सादर केला");
      setExpandedBloId(null);
      setReportReason("");
    } catch {
      toast.error("त्रुटी आली. पुन्हा प्रयत्न करा");
    }
    setSubmitting(false);
  };

  const noticedBLONoticeMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const n of allNotices || []) {
      if ((n as any).status === "issued" && !(n as any).clearedForHonorarium) {
        map[(n as any).bloId] = (n as any).id;
      }
    }
    return map;
  }, [allNotices]);

  const handleManjuriVinanti = async (e: any, blo: any) => {
    setPendingRestoreIds((prev) => new Set([...prev, e.bloId]));
    try {
      const noticeId = noticedBLONoticeMap[e.bloId];
      if (noticeId) {
        await clearNoticeMutation.mutateAsync({
          noticeId,
          clearedById: supervisorId || "",
          clearedByName: supervisorName || "पर्यवेक्षक",
        });
      }
      await restoreEligibilityMutation.mutateAsync({
        constituencyId: constituencyId || "",
        bloId: e.bloId,
        clearedBy: supervisorName || "पर्यवेक्षक",
      });
      setRestoredIds((prev) => new Set([...prev, e.bloId]));
      toast.success(
        `${e.bloName || blo?.name || "BLO"} साठी मंजुरी विनंती यशस्वीपणे सादर केली`,
      );
    } catch {
      setPendingRestoreIds((prev) => {
        const next = new Set(prev);
        next.delete(e.bloId);
        return next;
      });
      toast.error("मंजुरी विनंती सादर करताना त्रुटी आली");
    }
  };

  const statusLabel = (s: string) =>
    s === "paid"
      ? "दिले"
      : s === "approved"
        ? "मंजूर"
        : s === "distributed"
          ? "वितरित"
          : "प्रलंबित";
  const statusColor = (s: string) =>
    s === "paid"
      ? "bg-green-100 text-green-800"
      : s === "approved"
        ? "bg-blue-100 text-blue-800"
        : s === "distributed"
          ? "bg-purple-100 text-purple-800"
          : "bg-yellow-100 text-yellow-800";

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const end = current + 2;
    const years: number[] = [];
    for (let y = 2026; y <= end; y++) years.push(y);
    return years;
  }, []);

  const quarterOptions = [
    { value: "Q1", label: "Q1 - जानेवारी ते मार्च" },
    { value: "Q2", label: "Q2 - एप्रिल ते जून" },
    { value: "Q3", label: "Q3 - जुलै ते सप्टेंबर" },
    { value: "Q4", label: "Q4 - ऑक्टोबर ते डिसेंबर" },
  ];

  const toggleBlo = (id: string) => {
    setSelectedBloIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () =>
    setSelectedBloIds(new Set(myBlos.map((b: any) => b.id)));
  const deselectAll = () => setSelectedBloIds(new Set());

  const handleSubmitRequest = async () => {
    if (selectedBloIds.size === 0) {
      toast.error("किमान एक BLO निवडा");
      return;
    }
    setRequestSubmitting(true);
    try {
      const request = {
        id: Date.now().toString(),
        constituencyId,
        supervisorId,
        supervisorName,
        year: selectedYear.toString(),
        quarter: selectedQuarter,
        bloIds: Array.from(selectedBloIds),
        requestedAt: BigInt(Date.now()),
        status: "pending",
      };
      await createRequest.mutateAsync(request);
      toast.success("मानधन विनंती यशस्वीपणे सादर केली");
    } catch {
      toast.error("मानधन विनंती सादर करताना त्रुटी आली");
    }
    setRequestSubmitting(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-blue-600 text-white p-3 rounded-lg">
        <h2 className="text-lg font-bold">मानधन व्यवस्थापन</h2>
        <p className="text-sm text-blue-100">पर्यवेक्षक: {supervisorName}</p>
      </div>
      <div className="flex border-b">
        {[
          { key: "request", label: "मानधन विनंती" },
          { key: "my-blos", label: "माझे BLO मानधन" },
          { key: "history", label: "मानधन इतिहास" },
          {
            key: "excluded",
            label: `वगळलेले BLO${ineligibleCount > 0 ? ` (${ineligibleCount})` : ""}`,
          },
        ].map((t) => (
          <button
            type="button"
            key={t.key}
            onClick={() =>
              setActiveTab(
                t.key as "request" | "my-blos" | "history" | "excluded",
              )
            }
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600 hover:text-blue-600"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {activeTab === "request" && (
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4 space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1">
                <label
                  htmlFor="year-select"
                  className="text-sm font-medium text-gray-700"
                >
                  वर्ष
                </label>
                <select
                  id="year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="border rounded px-3 py-2 text-sm min-w-[140px]"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="quarter-select"
                  className="text-sm font-medium text-gray-700"
                >
                  तिमाही
                </label>
                <select
                  id="quarter-select"
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(e.target.value)}
                  className="border rounded px-3 py-2 text-sm min-w-[220px]"
                >
                  {quarterOptions.map((q) => (
                    <option key={q.value} value={q.value}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="bg-blue-50 text-blue-700 px-3 py-1 rounded text-xs border border-blue-200 hover:bg-blue-100"
              >
                सर्व निवडा
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="bg-gray-50 text-gray-700 px-3 py-1 rounded text-xs border border-gray-200 hover:bg-gray-100"
              >
                सर्व रद्द करा
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="border p-2 text-left w-10">
                      <input
                        type="checkbox"
                        checked={
                          selectedBloIds.size === myBlos.length &&
                          myBlos.length > 0
                        }
                        onChange={() => {
                          if (selectedBloIds.size === myBlos.length)
                            deselectAll();
                          else selectAll();
                        }}
                      />
                    </th>
                    {["यादिभाग क्र", "BLO नाव", "पदनाम", "पात्रता"].map((h) => (
                      <th key={h} className="border p-2 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myBlos.map((blo: any) => {
                    const elig = myEligibility.find(
                      (e: any) => e.bloId === blo.id,
                    );
                    const isEligible = elig?.isEligible ?? true;
                    return (
                      <tr key={blo.id} className="hover:bg-blue-50">
                        <td className="border p-2">
                          <input
                            type="checkbox"
                            checked={selectedBloIds.has(blo.id)}
                            onChange={() => toggleBlo(blo.id)}
                          />
                        </td>
                        <td className="border p-2">{blo.partNumber || "—"}</td>
                        <td className="border p-2">{blo.name || "—"}</td>
                        <td className="border p-2">{blo.designation || "—"}</td>
                        <td className="border p-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${isEligible ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                          >
                            {isEligible ? "पात्र" : "वगळलेले"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {myBlos.length === 0 && (
                <p className="text-center py-4 text-gray-500">
                  कोणतेही BLO नियुक्त नाहीत
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={requestSubmitting || selectedBloIds.size === 0}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requestSubmitting ? "सादर करत आहे..." : "मानधन विनंती करा"}
              </button>
              <span className="text-sm text-gray-600">
                {selectedBloIds.size} / {myBlos.length} BLO निवडले
              </span>
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">
              सादर केलेल्या विनंती
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {["अनु.क्र.", "वर्ष", "तिमाही", "विनंती दिनांक", "स्थिती"].map(
                      (h) => (
                        <th key={h} className="border p-2 text-left">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {requestsRaw.map((req: any, idx: number) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="border p-2">{idx + 1}</td>
                      <td className="border p-2">{req.year}</td>
                      <td className="border p-2">{req.quarter}</td>
                      <td className="border p-2">
                        {new Date(Number(req.requestedAt)).toLocaleDateString(
                          "hi-IN",
                        )}
                      </td>
                      <td className="border p-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(req.status)}`}
                        >
                          {statusLabel(req.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {requestsRaw.length === 0 && (
                <p className="text-center py-4 text-gray-500">
                  अद्याप कोणतीही विनंती सादर केलेली नाही
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {activeTab === "my-blos" && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm">
              <span className="font-bold text-blue-700">{myBlos.length}</span>{" "}
              एकूण BLO
            </div>
            <div className="bg-green-50 border border-green-200 rounded px-3 py-2 text-sm">
              <span className="font-bold text-green-700">{eligibleCount}</span>{" "}
              पात्र
            </div>
            <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm">
              <span className="font-bold text-red-700">{ineligibleCount}</span>{" "}
              वगळलेले
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-blue-50">
                  {[
                    "यादिभाग क्र",
                    "BLO नाव",
                    "पदनाम",
                    "पात्रता",
                    "कारण",
                    "कृती",
                  ].map((h) => (
                    <th key={h} className="border p-2 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myEligibility.map((e: any) => {
                  const blo = myBlos.find((b: any) => b.id === e.bloId);
                  return (
                    <React.Fragment key={e.bloId}>
                      <tr className="hover:bg-blue-50">
                        <td className="border p-2">
                          {e.partNumber || blo?.partNumber || "—"}
                        </td>
                        <td className="border p-2">
                          {e.bloName || blo?.name || "—"}
                        </td>
                        <td className="border p-2">
                          {blo?.designation || "—"}
                        </td>
                        <td className="border p-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.isEligible ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                          >
                            {e.isEligible ? "पात्र" : "वगळलेले"}
                          </span>
                        </td>
                        <td className="border p-2 text-sm text-red-600">
                          {!e.isEligible
                            ? e.exclusionReason || "नोटीस / निष्क्रिय"
                            : "—"}
                        </td>
                        <td className="border p-2">
                          {!e.isEligible && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedBloId(
                                  expandedBloId === e.bloId ? null : e.bloId,
                                )
                              }
                              className="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600"
                            >
                              अहवाल द्या
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedBloId === e.bloId && (
                        <tr>
                          <td colSpan={6} className="border p-3 bg-orange-50">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">
                                पर्यवेक्षक अहवाल — {e.bloName || blo?.name}
                              </p>
                              <textarea
                                value={reportReason}
                                onChange={(ev) =>
                                  setReportReason(ev.target.value)
                                }
                                placeholder="अहवालाचे कारण लिहा..."
                                className="w-full border rounded p-2 text-sm"
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSubmitReport(e.bloId)}
                                  disabled={submitting}
                                  className="bg-green-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                                >
                                  सबमिट करा
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExpandedBloId(null)}
                                  className="bg-gray-400 text-white px-3 py-1 rounded text-sm"
                                >
                                  रद्द करा
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            {myEligibility.length === 0 && (
              <p className="text-center py-4 text-gray-500">
                माहिती लोड होत आहे...
              </p>
            )}
          </div>
        </div>
      )}
      {activeTab === "excluded" && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <span className="text-red-600 font-bold text-sm">⚠️</span>
            <span className="text-sm text-red-700">
              खालील BLO यांना सध्या मानधन दिले जात नाही. पर्यवेक्षक म्हणून तुम्ही
              त्यांच्यासाठी मंजुरी विनंती करू शकता.
            </span>
          </div>
          {ineligibleCount === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">✅</div>
              <p className="font-medium">सर्व BLO मानधनासाठी पात्र आहेत</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-red-50">
                    {[
                      "यादिभाग क्र",
                      "BLO नाव",
                      "पदनाम",
                      "वगळण्याचे कारण",
                      "स्थिती",
                      "कृती",
                    ].map((h) => (
                      <th key={h} className="border p-2 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myEligibility
                    .filter((e: any) => !e.isEligible)
                    .map((e: any) => {
                      const blo = myBlos.find((b: any) => b.id === e.bloId);
                      const isPending = pendingRestoreIds.has(e.bloId);
                      const isRestored = restoredIds.has(e.bloId);
                      return (
                        <tr key={e.bloId} className="hover:bg-red-50">
                          <td className="border p-2">
                            {e.partNumber || blo?.partNumber || "—"}
                          </td>
                          <td className="border p-2">
                            {e.bloName || blo?.name || "—"}
                          </td>
                          <td className="border p-2">
                            {blo?.designation || "—"}
                          </td>
                          <td className="border p-2 text-red-600 text-xs">
                            {e.exclusionReason || "नोटीस / निष्क्रिय"}
                          </td>
                          <td className="border p-2">
                            {isRestored ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                विनंती सादर
                              </span>
                            ) : isPending ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                प्रलंबित
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                वगळलेले
                              </span>
                            )}
                          </td>
                          <td className="border p-2">
                            {isRestored ? (
                              <span className="text-green-700 text-xs font-medium">
                                ✓ विनंती सादर
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={
                                  isPending ||
                                  clearNoticeMutation.isPending ||
                                  restoreEligibilityMutation.isPending
                                }
                                onClick={() => handleManjuriVinanti(e, blo)}
                                className="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isPending
                                  ? "सादर करत आहे..."
                                  : "मंजुरी विनंती करा"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {activeTab === "history" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {[
                  "यादिभाग क्र",
                  "BLO नाव",
                  "तिमाही",
                  "रक्कम",
                  "स्थिती",
                  "दिनांक",
                ].map((h) => (
                  <th key={h} className="border p-2 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const blo = myBlos.find((b: any) => b.id === p.bloId);
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="border p-2">{blo?.partNumber || "—"}</td>
                    <td className="border p-2">{blo?.name || p.bloId}</td>
                    <td className="border p-2">{p.quarter}</td>
                    <td className="border p-2">
                      ₹{p.amount.toLocaleString("hi-IN")}
                    </td>
                    <td className="border p-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(p.status)}`}
                      >
                        {statusLabel(p.status)}
                      </span>
                    </td>
                    <td className="border p-2">
                      {new Date(p.createdAt).toLocaleDateString("hi-IN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {payments.length === 0 && (
            <p className="text-center py-4 text-gray-500">
              कोणतेही मानधन नोंदी नाहीत
            </p>
          )}
        </div>
      )}
    </div>
  );
}
