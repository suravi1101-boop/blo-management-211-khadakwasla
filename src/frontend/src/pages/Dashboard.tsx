// @ts-nocheck
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Bell,
  Building2,
  FileText,
  MapPin,
  RefreshCw,
  ShieldCheck,
  UserX,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import type { Page } from "../App";
import {
  useAddNoticePrintRecord,
  useDashboardStats,
  useSupervisorNotices,
} from "../hooks/useQueries";
import { getCurrentSupervisor } from "../lib/auth";
import { BLOStatus } from "../types/domain";
import {
  fetchAllDataFromBackend,
  syncConstituencyEnabled,
} from "../utils/backendService";
import { getCurrentConstituency } from "../utils/storage";
import { storage } from "../utils/storage";

interface DashboardProps {
  onNavigate: (page: Page) => void;
  isAdminLoggedIn?: boolean;
}

type DialogType =
  | null
  | "totalStations"
  | "noBLO"
  | "noticeBLO"
  | "supervisors";

export function Dashboard({ onNavigate }: DashboardProps) {
  const { data: stats, isLoading, refetch } = useDashboardStats();
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Supervisor notices
  const currentSupervisor = getCurrentSupervisor();
  const { data: supervisorNotices = [] } = useSupervisorNotices(
    currentSupervisor?.id || "",
  );
  const addPrintRecord = useAddNoticePrintRecord();

  // Fetch enabled/disabled status from backend on mount so all devices stay in sync.
  useEffect(() => {
    Promise.resolve();
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const constituencyId = getCurrentConstituency();
      if (constituencyId) {
        await fetchAllDataFromBackend(constituencyId);
      }
      await Promise.resolve();
      await refetch();
      setRefreshKey((k) => k + 1);
    } catch (_e) {
      // silent
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const allBLOs = (() => {
    try {
      return storage.getBLOs() ?? [];
    } catch {
      return [];
    }
  })();
  const allStations = (() => {
    try {
      return storage.getStations() ?? [];
    } catch {
      return [];
    }
  })();
  const allNotices = (() => {
    try {
      return storage.getNotices() ?? [];
    } catch {
      return [];
    }
  })();

  // Stations without an active BLO: totalStations - activeBLOs
  const activeBLOStationIds = new Set(
    allBLOs
      .filter((b) => b.status === BLOStatus.active || b.status === "active")
      .map((b) => String(b.pollingStationId ?? "")),
  );
  const stationsWithoutBLO = allStations.filter(
    (s) => !activeBLOStationIds.has(String(s.id ?? "")),
  );

  // BLOs that received at least one notice
  const bloIdsWithNotice = new Set(
    allNotices.map((n) => String(n.bloId ?? "")).filter(Boolean),
  );
  const blosWithNotice = allBLOs.filter((b) =>
    bloIdsWithNotice.has(String(b.id ?? "")),
  );

  const supervisors = storage
    .getSupervisors()
    .filter((s) => s.status === "active");
  const supervisorCount = supervisors.length;

  // Get notices grouped by BLO for the notice dialog
  const noticesByBLO = new Map<string, typeof allNotices>();
  for (const notice of allNotices) {
    if (!notice?.bloId) continue;
    const key = String(notice.bloId);
    if (!noticesByBLO.has(key)) noticesByBLO.set(key, []);
    noticesByBLO.get(key)!.push(notice);
  }

  // noBLOCount = totalStations - activeBLOs, so noBLOCount + activeBLOCount = totalStations
  const activeBLOCount = allBLOs.filter(
    (b) => b.status === BLOStatus.active || b.status === "active",
  ).length;
  const noBLOCount = allStations.length - activeBLOCount;

  const statCards = [
    {
      label: "एकूण मतदान केंद्रे",
      value: allStations.length,
      icon: Building2,
      color: "bg-white border-blue-200",
      labelColor: "text-blue-600",
      iconBg: "bg-blue-50 text-blue-600",
      dialog: "totalStations" as DialogType,
    },
    {
      label: "सक्रिय पर्यवेक्षक",
      value: supervisorCount,
      icon: ShieldCheck,
      color: "bg-white border-teal-200",
      labelColor: "text-teal-700",
      iconBg: "bg-teal-100 text-teal-700",
      dialog: "supervisors" as DialogType,
    },
    {
      label: "BLO नियुक्ती नाही",
      value: noBLOCount,
      icon: UserX,
      color: "bg-white border-orange-200",
      labelColor: "text-orange-700",
      iconBg: "bg-orange-100 text-orange-700",
      dialog: "noBLO" as DialogType,
    },
    {
      label: "सक्रिय BLO",
      value: activeBLOCount,
      icon: Users,
      color: "bg-white border-green-200",
      labelColor: "text-green-700",
      iconBg: "bg-green-100 text-green-700",
      dialog: null as DialogType,
      navigate: "blos" as Page,
    },
    {
      label: "नोटीस प्राप्त BLO",
      value: stats ? Number(stats.blosWithNotices) : 0,
      icon: AlertTriangle,
      color: "bg-white border-red-200",
      labelColor: "text-red-700",
      iconBg: "bg-red-100 text-red-700",
      dialog: "noticeBLO" as DialogType,
    },
  ];

  const noticeLabel = (type: string) => {
    if (type === "notice1") return "नोटीस १";
    if (type === "notice2") return "नोटीस २";
    if (type === "notice3") return "नोटीस ३";
    return type;
  };

  return (
    <div key={refreshKey} className="p-6 space-y-6 min-h-full bg-background">
      {/* Welcome */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">डॅशबोर्ड</h2>
          <p className="text-muted-foreground text-sm mt-1">
            २११ खडकवासला मतदार संघ - BLO व्यवस्थापन प्रणाली
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-sky-400 text-sky-700 hover:bg-sky-50 gap-1.5"
          onClick={handleRefresh}
          disabled={isRefreshing}
          data-ocid="dashboard.refresh_button"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "माहिती येत आहे..." : "ताजी माहिती मिळवा"}
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card
                className={`border ${card.color} shadow-sm cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5`}
                onClick={() => {
                  if (card.dialog) setActiveDialog(card.dialog);
                  else if (card.navigate) onNavigate(card.navigate);
                }}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      {isLoading ? (
                        <Skeleton className="h-7 w-12 mb-1" />
                      ) : (
                        <p className="text-2xl font-bold text-foreground">
                          {card.value}
                        </p>
                      )}
                      <p
                        className={`text-xs font-semibold mt-1 leading-tight ${card.labelColor}`}
                      >
                        {card.label}
                      </p>
                    </div>
                    <div className={`${card.iconBg} p-1.5 rounded-lg`}>
                      <Icon size={16} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          त्वरित क्रिया
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Card
            className="border border-border hover:border-primary/40 hover:shadow-card cursor-pointer transition-all"
            onClick={() => onNavigate("stations")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <MapPin size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">मतदान केंद्र पाहा</p>
                <p className="text-xs text-muted-foreground">सर्व केंद्रांची यादी</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="border border-border hover:border-primary/40 hover:shadow-card cursor-pointer transition-all"
            onClick={() => onNavigate("orders")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <FileText size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">नियुक्ती आदेश</p>
                <p className="text-xs text-muted-foreground">
                  नवीन आदेश तयार करा
                </p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="border border-border hover:border-primary/40 hover:shadow-card cursor-pointer transition-all"
            onClick={() => onNavigate("blos")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Users size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">BLO यादी</p>
                <p className="text-xs text-muted-foreground">सर्व सक्रिय BLO</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="border border-border hover:border-primary/40 hover:shadow-card cursor-pointer transition-all"
            onClick={() => onNavigate("supervisors")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-teal-100 p-2 rounded-lg">
                <ShieldCheck size={16} className="text-teal-700" />
              </div>
              <div>
                <p className="text-sm font-medium">पर्यवेक्षक</p>
                <p className="text-xs text-muted-foreground">
                  नियुक्त पर्यवेक्षक यादी
                </p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="border border-border hover:border-primary/40 hover:shadow-card cursor-pointer transition-all"
            onClick={() => onNavigate("notices")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Bell size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">नोटीस द्या</p>
                <p className="text-xs text-muted-foreground">BLO ला नोटीस</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Supervisor Notices */}
      {currentSupervisor && (
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <h3 className="font-semibold text-blue-800 mb-3">
            नोटीस ({supervisorNotices.length})
          </h3>
          {supervisorNotices.length === 0 ? (
            <p className="text-gray-500 text-sm">कोणत्याही नोटीसा नाहीत</p>
          ) : (
            <div className="space-y-2">
              {supervisorNotices.map((notice) => (
                <div key={notice.id} className="border rounded p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium">
                        {notice.noticeNumber || notice.id}
                      </span>
                      <span className="text-gray-500 ml-2">
                        - {notice.createdByName || "प्रशासन"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        addPrintRecord.mutate({
                          constituencyId: "211",
                          noticeId: notice.id,
                          printedBy: currentSupervisor?.id || "",
                          printedByName: currentSupervisor?.name || "",
                        });
                        window.print();
                      }}
                      className="text-blue-600 text-xs border border-blue-300 px-2 py-1 rounded hover:bg-blue-50"
                      data-ocid="dashboard.notice.print_button"
                    >
                      मुद्रण
                    </button>
                  </div>
                  <p className="text-gray-600 mt-1">{notice.noticeText}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== एकूण मतदान केंद्रे Dialog ===== */}
      <Dialog
        open={activeDialog === "totalStations"}
        onOpenChange={(o) => !o && setActiveDialog(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader className="border-b border-blue-100 pb-3">
            <DialogTitle className="text-blue-800 flex items-center gap-2">
              <Building2 size={20} className="text-blue-600" />
              एकूण मतदान केंद्रे
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-100">
              एकूण: {allStations.length} केंद्रे
            </Badge>
          </div>
          {allStations.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Building2 size={40} className="mx-auto mb-3 text-blue-200" />
              <p>कोणतेही केंद्र नोंदवलेले नाही.</p>
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: "60vh" }}>
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-blue-50">
                  <tr>
                    <th className="text-left p-2 border border-blue-100 text-blue-800 font-semibold">
                      क्र.
                    </th>
                    <th className="text-left p-2 border border-blue-100 text-blue-800 font-semibold">
                      केंद्र क्रमांक
                    </th>
                    <th className="text-left p-2 border border-blue-100 text-blue-800 font-semibold">
                      केंद्राचे नाव
                    </th>
                    <th className="text-left p-2 border border-blue-100 text-blue-800 font-semibold">
                      वार्ड / ठिकाण
                    </th>
                    <th className="text-left p-2 border border-blue-100 text-blue-800 font-semibold">
                      BLO स्थिती
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allStations.map((s, idx) => (
                    <tr
                      key={s.id.toString()}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="p-2 border border-slate-100 text-center text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="p-2 border border-slate-100 font-medium text-slate-800">
                        {s.stationNumber}
                      </td>
                      <td className="p-2 border border-slate-100 text-slate-700">
                        {s.stationName}
                      </td>
                      <td className="p-2 border border-slate-100 text-slate-600">
                        {s.ward || s.location || "—"}
                      </td>
                      <td className="p-2 border border-slate-100 text-center">
                        {s.hasBLO ? (
                          <Badge className="bg-green-100 text-green-800 border border-green-200 hover:bg-green-100">
                            नियुक्त
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-800 border border-orange-200 hover:bg-orange-100">
                            रिक्त
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setActiveDialog(null)}>
              बंद करा
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                setActiveDialog(null);
                onNavigate("stations");
              }}
            >
              <Building2 size={16} className="mr-2" />
              केंद्र यादीत जा
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== BLO नियुक्ती नाही Dialog ===== */}
      <Dialog
        open={activeDialog === "noBLO"}
        onOpenChange={(o) => !o && setActiveDialog(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader className="border-b border-orange-100 pb-3">
            <DialogTitle className="text-orange-800 flex items-center gap-2">
              <UserX size={20} className="text-orange-600" />
              BLO नियुक्त नाही — केंद्रांची यादी
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-orange-100 text-orange-800 border border-orange-200 hover:bg-orange-100">
              एकूण: {stationsWithoutBLO.length} केंद्रे
            </Badge>
          </div>
          {stationsWithoutBLO.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <UserX size={40} className="mx-auto mb-3 text-orange-200" />
              <p>सर्व केंद्रांना BLO नियुक्त आहे.</p>
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: "60vh" }}>
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-orange-50">
                  <tr>
                    <th className="text-left p-2 border border-orange-100 text-orange-800 font-semibold">
                      क्र.
                    </th>
                    <th className="text-left p-2 border border-orange-100 text-orange-800 font-semibold">
                      केंद्र क्रमांक
                    </th>
                    <th className="text-left p-2 border border-orange-100 text-orange-800 font-semibold">
                      केंद्राचे नाव
                    </th>
                    <th className="text-left p-2 border border-orange-100 text-orange-800 font-semibold">
                      वार्ड / ठिकाण
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stationsWithoutBLO.map((s, idx) => (
                    <tr
                      key={s.id.toString()}
                      className="hover:bg-orange-50/40 transition-colors"
                    >
                      <td className="p-2 border border-slate-100 text-center text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="p-2 border border-slate-100 font-medium text-slate-800">
                        {s.stationNumber}
                      </td>
                      <td className="p-2 border border-slate-100 text-slate-700">
                        {s.stationName}
                      </td>
                      <td className="p-2 border border-slate-100 text-slate-600">
                        {s.ward || s.location || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setActiveDialog(null)}>
              बंद करा
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => {
                setActiveDialog(null);
                onNavigate("orders");
              }}
            >
              <FileText size={16} className="mr-2" />
              नियुक्ती आदेश तयार करा
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== नोटीस प्राप्त BLO Dialog ===== */}
      <Dialog
        open={activeDialog === "noticeBLO"}
        onOpenChange={(o) => !o && setActiveDialog(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader className="border-b border-red-100 pb-3">
            <DialogTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle size={20} className="text-red-600" />
              नोटीस प्राप्त BLO यादी
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-red-100 text-red-800 border border-red-200 hover:bg-red-100">
              एकूण: {blosWithNotice.length} BLO
            </Badge>
          </div>
          {blosWithNotice.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <AlertTriangle size={40} className="mx-auto mb-3 text-red-200" />
              <p>कोणत्याही BLO ला नोटीस दिलेली नाही.</p>
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: "60vh" }}>
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-red-50">
                  <tr>
                    <th className="text-left p-2 border border-red-100 text-red-800 font-semibold">
                      क्र.
                    </th>
                    <th className="text-left p-2 border border-red-100 text-red-800 font-semibold">
                      BLO नाव
                    </th>
                    <th className="text-left p-2 border border-red-100 text-red-800 font-semibold">
                      भाग क्रमांक
                    </th>
                    <th className="text-left p-2 border border-red-100 text-red-800 font-semibold">
                      शेवटची नोटीस
                    </th>
                    <th className="text-left p-2 border border-red-100 text-red-800 font-semibold">
                      नोटीस दिनांक
                    </th>
                    <th className="text-left p-2 border border-red-100 text-red-800 font-semibold">
                      एकूण नोटीसा
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {blosWithNotice.map((b, idx) => {
                    const notices = noticesByBLO.get(b.id.toString()) || [];
                    const lastNotice = notices.slice().sort((a, z) => {
                      try {
                        const aTime =
                          a.issuedDate != null ? Number(a.issuedDate) : 0;
                        const zTime =
                          z.issuedDate != null ? Number(z.issuedDate) : 0;
                        return zTime - aTime;
                      } catch {
                        return 0;
                      }
                    })[0];
                    return (
                      <tr
                        key={String(b.id ?? b.pollingStationId ?? idx)}
                        className="hover:bg-red-50/40 transition-colors"
                      >
                        <td className="p-2 border border-slate-100 text-center text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="p-2 border border-slate-100 font-medium text-slate-800">
                          {b.name || "रिक्त"}
                        </td>
                        <td className="p-2 border border-slate-100 text-slate-700">
                          {b.pollingStationId.toString()}
                        </td>
                        <td className="p-2 border border-slate-100 text-center">
                          <Badge className="bg-red-100 text-red-800 border border-red-200 hover:bg-red-100 text-xs">
                            {lastNotice
                              ? noticeLabel(lastNotice.noticeType)
                              : "—"}
                          </Badge>
                        </td>
                        <td className="p-2 border border-slate-100 text-slate-600">
                          {lastNotice?.issuedDate || "—"}
                        </td>
                        <td className="p-2 border border-slate-100 text-center">
                          <Badge className="bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-100">
                            {notices.length}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setActiveDialog(null)}>
              बंद करा
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                setActiveDialog(null);
                onNavigate("notices");
              }}
            >
              <Bell size={16} className="mr-2" />
              नोटीस व्यवस्थापनात जा
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== सक्रिय पर्यवेक्षक Dialog ===== */}
      <Dialog
        open={activeDialog === "supervisors"}
        onOpenChange={(o) => !o && setActiveDialog(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader className="border-b border-teal-100 pb-3">
            <DialogTitle className="text-teal-800 flex items-center gap-2">
              <ShieldCheck size={20} className="text-teal-600" />
              सक्रिय पर्यवेक्षक यादी
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-teal-100 text-teal-800 border border-teal-200 hover:bg-teal-100">
              एकूण: {supervisorCount} पर्यवेक्षक
            </Badge>
          </div>
          {supervisorCount === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ShieldCheck size={40} className="mx-auto mb-3 text-teal-200" />
              <p>अद्याप कोणतेही पर्यवेक्षक नियुक्त नाहीत.</p>
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: "60vh" }}>
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-teal-50">
                  <tr>
                    <th className="text-left p-2 border border-teal-100 text-teal-800 font-semibold">
                      क्र.
                    </th>
                    <th className="text-left p-2 border border-teal-100 text-teal-800 font-semibold">
                      नाव
                    </th>
                    <th className="text-left p-2 border border-teal-100 text-teal-800 font-semibold">
                      पद
                    </th>
                    <th className="text-left p-2 border border-teal-100 text-teal-800 font-semibold">
                      कार्यालय
                    </th>
                    <th className="text-left p-2 border border-teal-100 text-teal-800 font-semibold">
                      नियुक्ती दिनांक
                    </th>
                    <th className="text-left p-2 border border-teal-100 text-teal-800 font-semibold">
                      नियुक्त BLO भाग
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {supervisors.map((sup, idx) => (
                    <tr
                      key={sup.id}
                      className="hover:bg-teal-50/50 transition-colors"
                    >
                      <td className="p-2 border border-slate-100 text-center text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="p-2 border border-slate-100 font-medium text-slate-800">
                        {sup.name || "—"}
                      </td>
                      <td className="p-2 border border-slate-100 text-slate-600">
                        {sup.designation || "—"}
                      </td>
                      <td className="p-2 border border-slate-100 text-slate-600">
                        {sup.office || "—"}
                      </td>
                      <td className="p-2 border border-slate-100 text-slate-600">
                        {sup.appointmentDate || "—"}
                      </td>
                      <td className="p-2 border border-slate-100 text-center">
                        <Badge className="bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-100">
                          {sup.assignedPartNumbers?.length ?? 0} भाग
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setActiveDialog(null)}>
              बंद करा
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => {
                setActiveDialog(null);
                onNavigate("supervisors");
              }}
            >
              <ShieldCheck size={16} className="mr-2" />
              पर्यवेक्षक यादीत जा
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
