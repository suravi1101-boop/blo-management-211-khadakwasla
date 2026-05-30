import type {
  AavakJavakEntry,
  AppointmentOrder,
  BLO,
  BankDetails,
  ConstituencyConfig,
  GPSLocation,
  GPSTrackingRecord,
  NodalOfficer,
  Notice,
  OfficialDocumentMeta,
  PasswordHistoryEntry,
  PollingStation,
  Supervisor,
} from "@/backend";
import {
  deleteBLOsByConstituency,
  getDeleteHistory,
  recordDeletion,
} from "@/services/backendService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBackendActorCtx } from "../lib/actorContext";

const CONST_ID = "211";

// ── Query Hooks ────────────────────────────────────────────────────────────

export function usePollingStations() {
  const actor = useBackendActorCtx();
  return useQuery<PollingStation[]>({
    queryKey: ["pollingStations"],
    queryFn: async () => {
      try {
        if (!actor) return [];
        return await actor.getPollingStations(CONST_ID);
      } catch (e) {
        console.warn("[BLO] getPollingStations failed:", e);
        return [];
      }
    },
    enabled: !!actor,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

export function useBLOs() {
  const actor = useBackendActorCtx();
  return useQuery<BLO[]>({
    queryKey: ["blos"],
    queryFn: async () => {
      try {
        if (!actor) return [];
        return await actor.getBLOs(CONST_ID);
      } catch (e) {
        console.warn("[BLO] getBLOs failed:", e);
        return [];
      }
    },
    enabled: !!actor,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

export function useBLOsBySupervisor(supervisorId: string | undefined) {
  const actor = useBackendActorCtx();
  return useQuery<BLO[]>({
    queryKey: ["blos-supervisor", supervisorId],
    queryFn: async () => {
      if (!actor || !supervisorId) return [];
      const result = await (actor as any).getBLOsBySupervisor(
        supervisorId,
        CONST_ID,
      );
      return Array.isArray(result) ? result : [];
    },
    enabled: !!actor && !!supervisorId,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

export function useSupervisors() {
  const actor = useBackendActorCtx();
  return useQuery<Supervisor[]>({
    queryKey: ["supervisors"],
    queryFn: async () => {
      try {
        if (!actor) return [];
        return await actor.getSupervisors(CONST_ID);
      } catch (e) {
        console.warn("[BLO] getSupervisors failed:", e);
        return [];
      }
    },
    enabled: !!actor,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

export function useNodalOfficers() {
  const actor = useBackendActorCtx();
  return useQuery<NodalOfficer[]>({
    queryKey: ["nodalOfficers"],
    queryFn: async () => {
      try {
        if (!actor) return [];
        return await actor.getNodalOfficers(CONST_ID);
      } catch (e) {
        console.warn("[BLO] getNodalOfficers failed:", e);
        return [];
      }
    },
    enabled: !!actor,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

export function useConstituencyConfigs() {
  const actor = useBackendActorCtx();
  return useQuery<ConstituencyConfig[]>({
    queryKey: ["constituencyConfigs"],
    queryFn: async () => {
      try {
        if (!actor) return [];
        return await actor.getAllConstituencyConfigs();
      } catch (e) {
        console.warn("[BLO] getAllConstituencyConfigs failed:", e);
        return [];
      }
    },
    enabled: !!actor,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

export function useGPSTrackingInfo(constituencyId: string = CONST_ID) {
  const actor = useBackendActorCtx();
  return useQuery<GPSTrackingRecord[]>({
    queryKey: ["gpsTrackingInfo", constituencyId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getGPSTrackingInfo(constituencyId);
    },
    enabled: !!actor && !!constituencyId,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

export function useAppointmentOrders() {
  const actor = useBackendActorCtx();
  return useQuery<AppointmentOrder[]>({
    queryKey: ["appointmentOrders"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAppointmentOrders(CONST_ID);
    },
    enabled: !!actor,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

export function usePasswordHistory() {
  const actor = useBackendActorCtx();
  return useQuery<PasswordHistoryEntry[]>({
    queryKey: ["passwordHistory"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPasswordHistory("");
    },
    enabled: !!actor,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

export function useDashboardStats() {
  const actor = useBackendActorCtx();
  return useQuery({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      try {
        if (!actor)
          return {
            totalStations: 0,
            activeBLOs: 0,
            activeSupervisors: 0,
            noAppointment: 0,
            withNotice: 0,
          };
        const [stations, blos, supervisors] = await Promise.all([
          actor.getPollingStations(CONST_ID),
          actor.getBLOs(CONST_ID),
          actor.getSupervisors(CONST_ID),
        ]);
        const activeBLOs = blos.filter((b) => b.status === "active").length;
        const activeSupervisors = supervisors.filter((s) => s.isActive).length;
        const bloStationIds = new Set(
          blos
            .filter((b) => b.status === "active")
            .map((b) => String(b.partNumber)),
        );
        const noAppointment = stations.filter(
          (s) => !bloStationIds.has(String(s.partNumber)),
        ).length;
        return {
          totalStations: stations.length,
          activeBLOs,
          activeSupervisors,
          noAppointment,
          withNotice: 0,
        };
      } catch (e) {
        console.warn("[BLO] dashboardStats failed:", e);
        return {
          totalStations: 0,
          activeBLOs: 0,
          activeSupervisors: 0,
          noAppointment: 0,
          withNotice: 0,
        };
      }
    },
    enabled: !!actor,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

// ── Mutation Hooks ────────────────────────────────────────────────────────────

export function useBulkSavePollingStations() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stations: PollingStation[]) => {
      if (!actor) throw new Error("actor not ready");
      return actor.bulkSavePollingStations(CONST_ID, stations);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pollingStations"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useSaveBLO() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (blo: BLO) => {
      if (!actor) throw new Error("actor not ready");
      return actor.saveBLO(blo);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blos"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useSaveSupervisor() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (supervisor: Supervisor) => {
      if (!actor) throw new Error("actor not ready");
      return actor.saveSupervisor(supervisor);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supervisors"] });
    },
  });
}

export function useDeleteSupervisor() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      constituencyId,
    }: { id: string; constituencyId: string }) => {
      if (!actor) throw new Error("actor not ready");
      return (actor as any).deleteSupervisor(id, constituencyId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supervisors"] });
    },
  });
}

export function useDeleteNodalOfficer() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      constituencyId,
    }: { id: string; constituencyId: string }) => {
      if (!actor) throw new Error("actor not ready");
      return (actor as any).deleteNodalOfficer(id, constituencyId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nodalOfficers"] });
    },
  });
}

export function useSaveNodalOfficer() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (officer: NodalOfficer) => {
      if (!actor) throw new Error("actor not ready");
      return actor.saveNodalOfficer(officer);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nodalOfficers"] });
    },
  });
}

export function useCreateAppointmentOrder() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bloId,
      content,
    }: { bloId: string; content: string }) => {
      if (!actor) throw new Error("actor not ready");
      return actor.createAppointmentOrder(CONST_ID, bloId, content);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointmentOrders"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useSaveGPSLocation() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      constituencyId,
      location,
    }: { constituencyId: string; location: GPSLocation }) => {
      if (!actor) throw new Error("actor not ready");
      return actor.saveGPSLocation(constituencyId, location);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gpsTrackingInfo"] });
    },
  });
}

export function useSetConstituencyEnabled() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      constituencyId,
      enabled,
    }: { constituencyId: string; enabled: boolean }) => {
      if (!actor) throw new Error("actor not ready");
      return actor.setConstituencyEnabled(constituencyId, enabled);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["constituencyConfigs"] });
    },
  });
}

export function useSetConstituencyAdminPassword() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      constituencyId,
      newPassword,
      changedBy,
    }: { constituencyId: string; newPassword: string; changedBy: string }) => {
      if (!actor) throw new Error("actor not ready");
      return actor.setConstituencyAdminPassword(
        constituencyId,
        newPassword,
        changedBy,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["constituencyConfigs"] });
      qc.invalidateQueries({ queryKey: ["passwordHistory"] });
    },
  });
}

export function useAddConstituency() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      adminPassword,
    }: { id: string; name: string; adminPassword: string }) => {
      if (!actor) throw new Error("actor not ready");
      return actor.addConstituency(id, name, adminPassword);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["constituencyConfigs"] });
    },
  });
}

// ── Notice Queries ───────────────────────────────────────────────────────────

export function useNoticesForDashboard(
  constituencyId: string,
  viewerRole: string,
  viewerId: string,
) {
  const actor = useBackendActorCtx();
  return useQuery<Notice[]>({
    queryKey: ["notices", "dashboard", constituencyId, viewerRole, viewerId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getNoticesForDashboard(constituencyId, viewerRole, viewerId);
    },
    enabled: !!actor && !!viewerRole && !!viewerId,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

export function useSupervisorNotices(supervisorId: string) {
  return useNoticesForDashboard(CONST_ID, "supervisor", supervisorId);
}

export function useNodalOfficerNotices(nodalOfficerId: string) {
  return useNoticesForDashboard(CONST_ID, "nodal_officer", nodalOfficerId);
}

export function useBLONotices(bloId: string, _partNumber?: string) {
  return useNoticesForDashboard(CONST_ID, "blo", bloId);
}

export function useAddNoticePrintRecord() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      constituencyId,
      noticeId,
      printedBy,
      printedByName,
    }: {
      constituencyId: string;
      noticeId: string;
      printedBy: string;
      printedByName: string;
    }) => {
      if (!actor) throw new Error("actor not ready");
      return actor.addNoticePrintRecord(
        constituencyId,
        noticeId,
        printedBy,
        printedByName,
      );
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["notices", "dashboard", variables.constituencyId],
      });
      qc.invalidateQueries({
        queryKey: ["notices", "recipient", variables.constituencyId],
      });
      qc.invalidateQueries({
        queryKey: ["notices", "creator", variables.constituencyId],
      });
    },
  });
}

export function useNotices() {
  const actor = useBackendActorCtx();
  return useQuery<Notice[]>({
    queryKey: ["notices"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getNotices(CONST_ID);
    },
    enabled: !!actor,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

export function useActiveBLOs() {
  const { data: blos = [], isLoading, error } = useBLOs();
  return { data: blos.filter((b) => b.status === "active"), isLoading, error };
}

export function useAllPollingStations() {
  return usePollingStations();
}

export function useIssueNotice() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notice: Notice) => {
      if (!actor) throw new Error("actor not ready");
      // Use issueNotice backend method which handles noticeType and issuingAuthority fields
      return actor.issueNotice(CONST_ID, notice);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notices"] });
    },
  });
}

export function useSaveNotice() {
  return useIssueNotice();
}

export function useNoticeDeliveryReport(noticeId: string) {
  const actor = useBackendActorCtx();
  return useQuery({
    queryKey: ["noticeDeliveryReport", noticeId],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await (actor as any).getNoticeDeliveryReport(CONST_ID, noticeId);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !!noticeId,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

export function useUpdateNoticeDeliveryStatus() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      noticeId,
      recipientId,
      recipientType,
      status,
    }: {
      noticeId: string;
      recipientId: string;
      recipientType: string;
      status: string;
    }) => {
      if (!actor) throw new Error("actor not ready");
      // updateNoticeDeliveryStatus(constituencyId, noticeId, recipientId, recipientType, newStatus)
      return actor.updateNoticeDeliveryStatus(
        CONST_ID,
        noticeId,
        recipientId,
        recipientType || "blo",
        status,
      );
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["noticeDeliveryReport", variables.noticeId],
      });
      qc.invalidateQueries({ queryKey: ["notices"] });
    },
  });
}

// Fetch notices for a specific supervisor — only notices relevant to that supervisor and their BLOs
export function useNoticesForSupervisor(
  supervisorId: string,
  assignedBloIds: string[] = [],
) {
  const actor = useBackendActorCtx();
  return useQuery<Notice[]>({
    queryKey: ["notices-supervisor", supervisorId, assignedBloIds],
    queryFn: async () => {
      if (!actor || !supervisorId) return [];
      return actor.getNoticesForSupervisor(
        CONST_ID,
        supervisorId,
        assignedBloIds,
      );
    },
    enabled: !!actor && !!supervisorId,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: false,
  });
}

// Fetch notices for a specific nodal officer — notices for assigned supervisors and BLOs
export function useNoticesForNodalOfficer(
  nodalOfficerId: string,
  assignedSupervisorIds: string[] = [],
  supervisorBloIds: string[] = [],
) {
  const actor = useBackendActorCtx();
  return useQuery<Notice[]>({
    queryKey: [
      "notices-nodal",
      nodalOfficerId,
      assignedSupervisorIds,
      supervisorBloIds,
    ],
    queryFn: async () => {
      if (!actor || !nodalOfficerId) return [];
      return actor.getNoticesForNodalOfficer(
        CONST_ID,
        nodalOfficerId,
        assignedSupervisorIds,
        supervisorBloIds,
      );
    },
    enabled: !!actor && !!nodalOfficerId,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: false,
  });
}

export function useClearNoticeForHonorarium() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      noticeId,
      clearedById,
      clearedByName,
    }: {
      noticeId: string;
      clearedById: string;
      clearedByName: string;
    }) => {
      if (!actor) throw new Error("actor not ready");
      return actor.clearNoticeForHonorarium(
        noticeId,
        clearedById,
        clearedByName,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notices"] });
      qc.invalidateQueries({ queryKey: ["honorarium-eligibility"] });
      qc.invalidateQueries({ queryKey: ["eligible-blos-honorarium"] });
    },
  });
}

// Restore honorarium eligibility for a BLO (after supervisor approval)
export function useRestoreHonorariumEligibility() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      constituencyId,
      bloId,
      clearedBy,
    }: {
      constituencyId: string;
      bloId: string;
      clearedBy: string | null;
    }) => {
      if (!actor) throw new Error("actor not ready");
      return actor.restoreHonorariumEligibility(
        constituencyId,
        bloId,
        clearedBy,
      );
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["honorarium-eligibility", variables.constituencyId],
      });
      qc.invalidateQueries({
        queryKey: ["eligible-blos-honorarium", variables.constituencyId],
      });
    },
  });
}

// ── Honorarium Queries ───────────────────────────────────────────────────────

export interface HonorariumRecord {
  id: string;
  bloId: string;
  supervisorId: string;
  quarter: string;
  amount: number;
  status: "pending" | "approved" | "paid";
  createdAt: bigint;
  approvedBy?: string;
  approvedAt?: bigint;
  paidAt?: bigint;
  constituencyId: string;
}

export function useHonorariumByConstituency(constituencyId: string = CONST_ID) {
  const actor = useBackendActorCtx();
  return useQuery<HonorariumRecord[]>({
    queryKey: ["honorarium", "constituency", constituencyId],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getHonorariumByConstituency(constituencyId);
    },
    enabled: !!actor,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

export function useHonorariumBySupervisor(supervisorId: string) {
  const actor = useBackendActorCtx();
  return useQuery<HonorariumRecord[]>({
    queryKey: ["honorarium", "supervisor", supervisorId],
    queryFn: async () => {
      if (!actor || !supervisorId) return [];
      return (actor as any).getHonorariumBySupervisor(supervisorId);
    },
    enabled: !!actor && !!supervisorId,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

export function useHonorariumSummary(constituencyId: string = CONST_ID) {
  const actor = useBackendActorCtx();
  return useQuery<{ pending: number; approved: number; paid: number }>({
    queryKey: ["honorarium", "summary", constituencyId],
    queryFn: async () => {
      if (!actor) return { pending: 0, approved: 0, paid: 0 };
      return (actor as any).getHonorariumSummary(constituencyId);
    },
    enabled: !!actor,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

export function useCreateHonorariumRecord() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bloId,
      supervisorId,
      quarter,
      amount,
      constituencyId,
    }: {
      bloId: string;
      supervisorId: string;
      quarter: string;
      amount: number;
      constituencyId: string;
    }) => {
      if (!actor) throw new Error("actor not ready");
      const record: import("@/backend").HonorariumRecord = {
        id: `hon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        bloId,
        supervisorId,
        quarter,
        amount: BigInt(Math.round(amount)),
        status: "pending",
        constituencyId,
        createdAt: BigInt(Date.now()),
      };
      return actor.createHonorariumRecord(record);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["honorarium", "constituency", variables.constituencyId],
      });
      qc.invalidateQueries({ queryKey: ["honorarium", "summary"] });
    },
  });
}

export function useApproveHonorarium() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recordId,
      supervisorId,
    }: {
      recordId: string;
      supervisorId: string;
    }) => {
      if (!actor) throw new Error("actor not ready");
      return (actor as any).approveHonorarium(recordId, supervisorId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["honorarium"] });
    },
  });
}

export function useMarkHonorariumPaid() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recordId: string) => {
      if (!actor) throw new Error("actor not ready");
      return (actor as any).markHonorariumPaid(recordId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["honorarium"] });
    },
  });
}

// ── Honorarium Eligibility Hooks ─────────────────────────────────────────────

export function useHonorariumEligibility(constituencyId: string = CONST_ID) {
  const actor = useBackendActorCtx();
  return useQuery({
    queryKey: ["honorarium-eligibility", constituencyId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getHonorariumEligibility(constituencyId);
    },
    enabled: !!actor,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: false,
  });
}

export function useEligibleBLOsForHonorarium(
  constituencyId: string = CONST_ID,
) {
  const actor = useBackendActorCtx();
  return useQuery<BLO[]>({
    queryKey: ["eligible-blos-honorarium", constituencyId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getEligibleBLOsForHonorarium(constituencyId);
    },
    enabled: !!actor,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: false,
  });
}

export function useSetHonorariumExcludeOverride() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      constituencyId,
      bloId,
      isManuallyIncluded,
      reason,
      overriddenBy,
    }: {
      constituencyId: string;
      bloId: string;
      isManuallyIncluded: boolean;
      reason: string | null;
      overriddenBy: string | null;
    }) => {
      if (!actor) throw new Error("actor not ready");
      return actor.setHonorariumExcludeOverride(
        constituencyId,
        bloId,
        isManuallyIncluded,
        reason,
        overriddenBy,
      );
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["honorarium-eligibility", variables.constituencyId],
      });
      qc.invalidateQueries({
        queryKey: ["eligible-blos-honorarium", variables.constituencyId],
      });
    },
  });
}

// ── Nodal Officer Supervisor/BLO Hooks ───────────────────────────────────────

export function useNodalOfficerSupervisors(
  nodalOfficerId: string,
  constituencyId: string = CONST_ID,
) {
  const actor = useBackendActorCtx();
  return useQuery<Supervisor[]>({
    queryKey: ["nodal-supervisors", nodalOfficerId],
    queryFn: async () => {
      if (!actor || !nodalOfficerId) return [];
      return actor.getNodalOfficerSupervisors(nodalOfficerId, constituencyId);
    },
    enabled: !!actor && !!nodalOfficerId,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: false,
  });
}

export function useNodalOfficerBLOs(
  nodalOfficerId: string,
  constituencyId: string = CONST_ID,
) {
  const actor = useBackendActorCtx();
  return useQuery<Supervisor[]>({
    queryKey: ["nodal-blos", nodalOfficerId],
    queryFn: async () => {
      if (!actor || !nodalOfficerId) return [];
      return actor.getNodalOfficerBLOs(nodalOfficerId, constituencyId);
    },
    enabled: !!actor && !!nodalOfficerId,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: false,
  });
}

// ── Notice Recipient Status Mutation ─────────────────────────────────────────

export function useUpdateNoticeRecipientStatus() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      noticeId,
      recipientId,
      newStatus,
      recipientType,
    }: {
      noticeId: string;
      recipientId: string;
      newStatus: string;
      recipientType: string;
    }) => {
      if (!actor) throw new Error("actor not ready");
      return actor.updateNoticeRecipientStatus(
        noticeId,
        recipientId,
        newStatus,
        recipientType,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notices"] });
    },
  });
}

// ── BLO Bank Details Hook ────────────────────────────────────────────────────

export function useBLOBankDetails(constituencyId: string, bloId: string) {
  const actor = useBackendActorCtx();
  return useQuery({
    queryKey: ["blo-bank-details", constituencyId, bloId],
    queryFn: async () => {
      if (!actor || !bloId) return null;
      return actor.getBLOBankDetails(constituencyId, bloId);
    },
    enabled: !!actor && !!bloId,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: false,
  });
}

// ── AavakJavak Hooks ────────────────────────────────────────────────────────

export function useAavakJavakEntries(constituency: string = CONST_ID) {
  const actor = useBackendActorCtx();
  return useQuery<AavakJavakEntry[]>({
    queryKey: ["aavakJavak", constituency],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAavakJavakEntries(constituency);
    },
    enabled: !!actor && !!constituency,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: false,
  });
}

export function useAddAavakJavakEntry() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: AavakJavakEntry) => {
      if (!actor) throw new Error("actor not ready");
      const result = await actor.addAavakJavakEntry(entry);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["aavakJavak", variables.constituency],
      });
    },
  });
}

export function useDeleteAavakJavakEntry() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      constituency: _constituency,
    }: { id: string; constituency: string }) => {
      if (!actor) throw new Error("actor not ready");
      const result = await actor.deleteAavakJavakEntry(id);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["aavakJavak", variables.constituency],
      });
    },
  });
}

// ── OfficialDocMeta Hooks ────────────────────────────────────────────────────

export function useOfficialDocMetas(constituency: string = CONST_ID) {
  const actor = useBackendActorCtx();
  return useQuery<OfficialDocumentMeta[]>({
    queryKey: ["officialDocs", constituency],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getOfficialDocMetas(constituency);
    },
    enabled: !!actor && !!constituency,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: false,
  });
}

export function useAddOfficialDocMeta() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (meta: OfficialDocumentMeta) => {
      if (!actor) throw new Error("actor not ready");
      const result = await actor.addOfficialDocMeta(meta);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["officialDocs", variables.constituency],
      });
    },
  });
}

export function useDeleteOfficialDocMeta() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      constituency: _constituency,
    }: { id: string; constituency: string }) => {
      if (!actor) throw new Error("actor not ready");
      const result = await actor.deleteOfficialDocMeta(id);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["officialDocs", variables.constituency],
      });
    },
  });
}

// ── Delete BLOs & Deletion History Hooks ────────────────────────────────────

export function useDeleteBLOsByConstituency() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (constituencyId: string) => {
      if (!actor) throw new Error("actor not ready");
      return deleteBLOsByConstituency(actor as any, constituencyId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blos"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useGetDeleteHistory() {
  const actor = useBackendActorCtx();
  return useQuery<Array<[string, string, string, string, bigint]>>({
    queryKey: ["deleteHistory"],
    queryFn: async () => {
      if (!actor) return [];
      return getDeleteHistory(actor as any);
    },
    enabled: !!actor,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

// Re-export types used by consumers
// ── Notice Settings Hooks ────────────────────────────────────────────────────

export function useNoticeSettings(constituencyId = "211") {
  const actor = useBackendActorCtx();
  return useQuery({
    queryKey: ["noticeSettings", constituencyId],
    queryFn: async () => {
      if (!actor) return null;
      try {
        const result = await (actor as any).getNoticeSettings(constituencyId);
        if (!result || (Array.isArray(result) && result.length === 0))
          return null;
        return Array.isArray(result) ? result[0] : result;
      } catch {
        return null;
      }
    },
    enabled: !!actor,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: false,
  });
}

export function useSaveNoticeSettings() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: {
      constituencyId: string;
      noticeHeaderLine1: string;
      noticeHeaderLine2: string;
      noticeHeaderPhone: string;
      noticeHeaderEmail: string;
      noticeOfficerName: string;
      noticeOfficerDesignation: string;
      noticeOfficerConstituency: string;
      noticeOfficerTehsil: string;
      updatedAt: number;
    }) => {
      if (!actor) throw new Error("actor not ready");
      return (actor as any).saveNoticeSettings(settings);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["noticeSettings", variables.constituencyId],
      });
    },
  });
}

// ── Local types for new backend methods ──────────────────────────────────────

export interface SupervisorHonorariumRequest {
  id: string;
  constituencyId: string;
  supervisorId: string;
  supervisorName: string;
  year: string;
  quarter: string;
  bloIds: string[];
  requestedAt: bigint;
  status: string;
}

export interface HonorariumDistribution {
  id: string;
  constituencyId: string;
  year: string;
  quarter: string;
  baseAmount: number;
  createdBy: string;
  createdAt: number;
  note: string;
}

export type {
  AavakJavakEntry,
  AppointmentOrder,
  BankDetails,
  BLO,
  ConstituencyConfig,
  GPSLocation,
  GPSTrackingRecord,
  NodalOfficer,
  Notice,
  OfficialDocumentMeta,
  PasswordHistoryEntry,
  PollingStation,
  Supervisor,
};

// ── Supervisor Honorarium Request Hooks ──────────────────────────────────────

export function useSupervisorHonorariumRequests(
  constituencyId: string = CONST_ID,
) {
  const actor = useBackendActorCtx();
  return useQuery<SupervisorHonorariumRequest[]>({
    queryKey: ["supervisorHonorariumRequests", constituencyId],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getSupervisorHonorariumRequests(constituencyId);
    },
    enabled: !!actor,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: false,
  });
}

export function useSupervisorHonorariumRequestsBySupervisor(
  supervisorId: string,
) {
  const actor = useBackendActorCtx();
  return useQuery<SupervisorHonorariumRequest[]>({
    queryKey: ["supervisorHonorariumRequests", "supervisor", supervisorId],
    queryFn: async () => {
      if (!actor || !supervisorId) return [];
      return (actor as any).getSupervisorHonorariumRequestsBySupervisor(
        supervisorId,
      );
    },
    enabled: !!actor && !!supervisorId,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: false,
  });
}

export function useCreateSupervisorHonorariumRequest() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (request: SupervisorHonorariumRequest) => {
      if (!actor) throw new Error("actor not ready");
      return (actor as any).createSupervisorHonorariumRequest(request);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["supervisorHonorariumRequests", variables.constituencyId],
      });
    },
  });
}

// ── Honorarium Distribution Hooks ────────────────────────────────────────────

export function useHonorariumDistributions(constituencyId: string = CONST_ID) {
  const actor = useBackendActorCtx();
  return useQuery<HonorariumDistribution[]>({
    queryKey: ["honorariumDistributions", constituencyId],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getHonorariumDistributions(constituencyId);
    },
    enabled: !!actor,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: false,
  });
}

export function useSetHonorariumDistribution() {
  const actor = useBackendActorCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dist: HonorariumDistribution) => {
      if (!actor) throw new Error("actor not ready");
      return (actor as any).setHonorariumDistribution(dist);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["honorariumDistributions", variables.constituencyId],
      });
    },
  });
}

// ── Extra Payments Hook ──────────────────────────────────────────────────────

export function useExtraPaymentsByConstituency(
  constituencyId: string = CONST_ID,
) {
  const actor = useBackendActorCtx();
  return useQuery({
    queryKey: ["extraPayments", constituencyId],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getExtraPaymentsByConstituency(constituencyId);
    },
    enabled: !!actor,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: false,
  });
}
