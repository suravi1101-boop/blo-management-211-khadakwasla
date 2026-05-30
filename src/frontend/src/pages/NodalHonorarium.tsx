import {
  useBLOs,
  useHonorariumEligibility,
  useNodalOfficers,
  useSupervisors,
} from "@/hooks/useQueries";
import React, { useState, useMemo } from "react";

const QUARTERLY_AMOUNT = 3500;

interface Props {
  nodalOfficerId: string;
  constituencyId: string;
  nodalOfficerName: string;
}

export default function NodalHonorarium({
  nodalOfficerId,
  // biome-ignore lint/correctness/noUnusedVariables: passed as prop but using CONST_ID internally
  constituencyId,
  nodalOfficerName,
}: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "details">(
    "overview",
  );

  const { data: blosRaw = [] } = useBLOs() as { data: any[] };
  const { data: supervisors = [] } = useSupervisors() as { data: any[] };
  const { data: nodalOfficers = [] } = useNodalOfficers() as { data: any[] };
  const { data: eligibilityAll = [] } = useHonorariumEligibility() as {
    data: any[];
  };

  const nodalOfficer = useMemo(
    () => nodalOfficers.find((n: any) => n.id === nodalOfficerId),
    [nodalOfficers, nodalOfficerId],
  );
  const assignedSupervisorIds = useMemo<string[]>(
    () => nodalOfficer?.assignedSupervisors || [],
    [nodalOfficer],
  );
  const assignedSupervisors = useMemo(
    () => supervisors.filter((s: any) => assignedSupervisorIds.includes(s.id)),
    [supervisors, assignedSupervisorIds],
  );

  const allAssignedStations = useMemo(() => {
    const stations = new Set<string>();
    for (const s of assignedSupervisors) {
      for (const p of s.assignedStations || s.assignedStationIds || []) {
        stations.add(p);
      }
    }
    return stations;
  }, [assignedSupervisors]);

  const myBlos = useMemo(() => {
    const map = new Map<string, any>();
    for (const b of blosRaw) {
      if (!allAssignedStations.has(b.partNumber)) continue;
      if (
        !map.has(b.partNumber) ||
        (b.updatedAt || 0) > (map.get(b.partNumber)?.updatedAt || 0)
      )
        map.set(b.partNumber, b);
    }
    return Array.from(map.values());
  }, [blosRaw, allAssignedStations]);

  const myBloIds = useMemo(
    () => new Set(myBlos.map((b: any) => b.id)),
    [myBlos],
  );
  const myEligibility = useMemo(
    () => eligibilityAll.filter((e: any) => myBloIds.has(e.bloId)),
    [eligibilityAll, myBloIds],
  );
  const eligibleCount = myEligibility.filter((e: any) => e.isEligible).length;
  const ineligibleCount = myEligibility.filter(
    (e: any) => !e.isEligible,
  ).length;
  const totalAmount = eligibleCount * QUARTERLY_AMOUNT;

  const supervisorStats = useMemo(
    () =>
      assignedSupervisors.map((s: any) => {
        const supStations = new Set<string>(
          s.assignedStations || s.assignedStationIds || [],
        );
        const supBlos = myBlos.filter((b: any) =>
          supStations.has(b.partNumber),
        );
        const supBloIds = new Set(supBlos.map((b: any) => b.id));
        const supElig = myEligibility.filter((e: any) =>
          supBloIds.has(e.bloId),
        );
        return {
          supervisor: s,
          total: supBlos.length,
          eligible: supElig.filter((e: any) => e.isEligible).length,
          excluded: supElig.filter((e: any) => !e.isEligible).length,
          amount:
            supElig.filter((e: any) => e.isEligible).length * QUARTERLY_AMOUNT,
        };
      }),
    [assignedSupervisors, myBlos, myEligibility],
  );

  const getBloSupervisor = (blo: any) =>
    assignedSupervisors.find((s: any) =>
      (s.assignedStations || s.assignedStationIds || []).includes(
        blo.partNumber,
      ),
    );

  return (
    <div className="p-4 space-y-4">
      <div className="bg-blue-600 text-white p-3 rounded-lg">
        <h2 className="text-lg font-bold">मानधन आढावा</h2>
        <p className="text-sm text-blue-100">
          नोडल अधिकारी: {nodalOfficerName}
        </p>
      </div>
      <div className="flex border-b">
        {[
          { key: "overview", label: "मानधन आढावा" },
          { key: "details", label: "BLO तपशील" },
        ].map((t) => (
          <button
            type="button"
            key={t.key}
            onClick={() => setActiveTab(t.key as "overview" | "details")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600 hover:text-blue-600"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-700">
                {myBlos.length}
              </div>
              <div className="text-sm text-blue-600">एकूण BLO</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-700">
                {eligibleCount}
              </div>
              <div className="text-sm text-green-600">पात्र BLO</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-700">
                {ineligibleCount}
              </div>
              <div className="text-sm text-red-600">वगळलेले BLO</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-700">
                ₹{totalAmount.toLocaleString("hi-IN")}
              </div>
              <div className="text-sm text-purple-600">तिमाही मानधन</div>
            </div>
          </div>
          {assignedSupervisors.length > 0 && (
            <div className="overflow-x-auto">
              <h3 className="font-semibold text-gray-700 mb-2">
                पर्यवेक्षक-निहाय तपशील
              </h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-blue-50">
                    {[
                      "पर्यवेक्षक नाव",
                      "एकूण BLO",
                      "पात्र",
                      "वगळलेले",
                      "तिमाही रक्कम",
                    ].map((h) => (
                      <th key={h} className="border p-2 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {supervisorStats.map((s: any, i: number) => (
                    <tr
                      key={s.supervisor.id}
                      className={i % 2 === 0 ? "bg-white" : "bg-blue-50"}
                    >
                      <td className="border p-2">{s.supervisor.name}</td>
                      <td className="border p-2 text-center">{s.total}</td>
                      <td className="border p-2 text-center text-green-700">
                        {s.eligible}
                      </td>
                      <td className="border p-2 text-center text-red-700">
                        {s.excluded}
                      </td>
                      <td className="border p-2">
                        ₹{s.amount.toLocaleString("hi-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {assignedSupervisors.length === 0 && (
            <p className="text-center py-8 text-gray-500">
              कोणतेही पर्यवेक्षक नियुक्त नाहीत
            </p>
          )}
        </div>
      )}
      {activeTab === "details" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-50">
                {["यादिभाग क्र", "BLO नाव", "पदनाम", "पर्यवेक्षक", "पात्रता"].map(
                  (h) => (
                    <th key={h} className="border p-2 text-left">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {myBlos.map((blo: any, i: number) => {
                const elig = myEligibility.find((e: any) => e.bloId === blo.id);
                const sup = getBloSupervisor(blo);
                return (
                  <tr
                    key={blo.id}
                    className={i % 2 === 0 ? "bg-white" : "bg-blue-50"}
                  >
                    <td className="border p-2">{blo.partNumber}</td>
                    <td className="border p-2">{blo.name}</td>
                    <td className="border p-2">{blo.designation || "—"}</td>
                    <td className="border p-2">{sup?.name || "—"}</td>
                    <td className="border p-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${elig?.isEligible ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                      >
                        {elig?.isEligible ? "पात्र" : "वगळलेले"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {myBlos.length === 0 && (
            <p className="text-center py-8 text-gray-500">
              कोणतेही BLO नियुक्त नाहीत
            </p>
          )}
        </div>
      )}
    </div>
  );
}
