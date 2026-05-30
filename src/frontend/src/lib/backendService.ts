/**
 * Backend service — thin wrappers around the Motoko canister.
 * Uses createActor from auto-generated backend.ts (NOT process.env).
 * All methods are called on the actor instance from useActor().
 */
import type { Notice, createActor } from "@/backend";
import type {
  AppointmentOrder,
  BLO,
  ConstituencyConfig,
  NodalOfficer,
  OrderSettings,
  PasswordHistoryEntry,
  PollingStation,
  Supervisor,
} from "@/backend";

import { useBackendActorCtx } from "./actorContext";

export type {
  AppointmentOrder,
  BLO,
  ConstituencyConfig,
  NodalOfficer,
  Notice,
  OrderSettings,
  PasswordHistoryEntry,
  PollingStation,
  Supervisor,
};

/** Returns the actor instance to use in service calls (may be null if actor not ready). */
export function useBackendActor(): ReturnType<typeof createActor> | null {
  return useBackendActorCtx();
}

// ── Constituency ──────────────────────────────────────────────────────────────

export async function getConstituencyConfig(
  actor: ReturnType<typeof createActor>,
): Promise<ConstituencyConfig | null> {
  return actor.getConstituencyConfig();
}

export async function setConstituencyEnabled(
  actor: ReturnType<typeof createActor>,
  enabled: boolean,
  constituencyId = "211",
): Promise<boolean> {
  return actor.setConstituencyEnabled(constituencyId, enabled);
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function superAdminLogin(
  actor: ReturnType<typeof createActor>,
  password: string,
): Promise<boolean> {
  return actor.superAdminLogin(password);
}

export async function changeSuperAdminPassword(
  actor: ReturnType<typeof createActor>,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  return actor.changeSuperAdminPassword(currentPassword, newPassword);
}

export async function supervisorLogin(
  actor: ReturnType<typeof createActor>,
  phone: string,
  password: string,
  constituencyId = "211",
): Promise<Supervisor | null> {
  return actor.supervisorLogin(constituencyId, phone, password);
}

export async function nodalOfficerLogin(
  actor: ReturnType<typeof createActor>,
  designation: string,
  password: string,
  constituencyId = "211",
): Promise<NodalOfficer | null> {
  return actor.nodalOfficerLogin(constituencyId, designation, password);
}

// ── Polling Stations ──────────────────────────────────────────────────────────

export async function getPollingStations(
  actor: ReturnType<typeof createActor>,
  constituencyId = "211",
): Promise<PollingStation[]> {
  return actor.getPollingStations(constituencyId);
}

export async function bulkSavePollingStations(
  actor: ReturnType<typeof createActor>,
  stations: PollingStation[],
  constituencyId = "211",
): Promise<bigint> {
  return actor.bulkSavePollingStations(constituencyId, stations);
}

export async function addPollingStation(
  actor: ReturnType<typeof createActor>,
  station: PollingStation,
): Promise<boolean> {
  return actor.addPollingStation(station);
}

export async function updatePollingStation(
  actor: ReturnType<typeof createActor>,
  station: PollingStation,
): Promise<boolean> {
  return actor.updatePollingStation(station);
}

// ── BLOs ──────────────────────────────────────────────────────────────────────

export async function getBLOs(
  actor: ReturnType<typeof createActor>,
  constituencyId = "211",
): Promise<BLO[]> {
  return actor.getBLOs(constituencyId);
}

export async function saveBLO(
  actor: ReturnType<typeof createActor>,
  blo: BLO,
): Promise<boolean> {
  return actor.saveBLO(blo);
}

export async function updateBLO(
  actor: ReturnType<typeof createActor>,
  blo: BLO,
): Promise<boolean> {
  return actor.updateBLO(blo);
}

// ── Appointment Orders ────────────────────────────────────────────────────────

export async function getAppointmentOrders(
  actor: ReturnType<typeof createActor>,
  constituencyId = "211",
): Promise<AppointmentOrder[]> {
  return actor.getAppointmentOrders(constituencyId);
}

export async function createAppointmentOrder(
  actor: ReturnType<typeof createActor>,
  bloId: string,
  content: string,
  constituencyId = "211",
): Promise<AppointmentOrder | null> {
  return actor.createAppointmentOrder(constituencyId, bloId, content);
}

// ── Supervisors ───────────────────────────────────────────────────────────────

export async function getSupervisors(
  actor: ReturnType<typeof createActor>,
  constituencyId = "211",
): Promise<Supervisor[]> {
  return actor.getSupervisors(constituencyId);
}

export async function saveSupervisor(
  actor: ReturnType<typeof createActor>,
  supervisor: Supervisor,
): Promise<boolean> {
  return actor.saveSupervisor(supervisor);
}

export async function updateSupervisor(
  actor: ReturnType<typeof createActor>,
  supervisor: Supervisor,
): Promise<boolean> {
  return actor.updateSupervisor(supervisor);
}

// ── Nodal Officers ────────────────────────────────────────────────────────────

export async function getNodalOfficers(
  actor: ReturnType<typeof createActor>,
  constituencyId = "211",
): Promise<NodalOfficer[]> {
  return actor.getNodalOfficers(constituencyId);
}

export async function saveNodalOfficer(
  actor: ReturnType<typeof createActor>,
  officer: NodalOfficer,
): Promise<boolean> {
  return actor.saveNodalOfficer(officer);
}

// ── Password History ──────────────────────────────────────────────────────────

export async function getPasswordHistory(
  actor: ReturnType<typeof createActor>,
  constituencyId = "",
): Promise<PasswordHistoryEntry[]> {
  return actor.getPasswordHistory(constituencyId);
}

export async function recordPasswordChange(
  actor: ReturnType<typeof createActor>,
  constituencyId: string,
  role: string,
  identifier: string,
  changedBy: string,
  note: string,
): Promise<boolean> {
  return actor.recordPasswordChange(
    constituencyId,
    role,
    identifier,
    changedBy,
    note,
  );
}

// ── Health ────────────────────────────────────────────────────────────────────

export async function healthCheck(
  actor: ReturnType<typeof createActor>,
): Promise<string> {
  return actor.healthCheck();
}

export async function getOrderSettings(
  actor: ReturnType<typeof createActor>,
  constituencyId: string,
): Promise<OrderSettings | null> {
  try {
    const result = await actor.getOrderSettings(constituencyId);
    if (!result || (Array.isArray(result) && result.length === 0)) return null;
    const raw = Array.isArray(result) ? result[0] : result;
    return raw as OrderSettings;
  } catch (e) {
    console.error("getOrderSettings error:", e);
    return null;
  }
}

export async function saveOrderSettings(
  actor: ReturnType<typeof createActor>,
  settings: OrderSettings,
): Promise<boolean> {
  try {
    const result = await actor.saveOrderSettings(settings);
    return Boolean(result);
  } catch (e) {
    console.error("saveOrderSettings error:", e);
    return false;
  }
}

export async function getNextOutwardCounter(
  actor: ReturnType<typeof createActor>,
  constituencyId: string,
): Promise<number> {
  try {
    const result = await actor.getNextOutwardCounter(constituencyId);
    return Number(result);
  } catch (e) {
    console.error("getNextOutwardCounter error:", e);
    return 1;
  }
}

export async function incrementOutwardCounter(
  actor: ReturnType<typeof createActor>,
  constituencyId: string,
): Promise<number> {
  try {
    const result = await actor.incrementOutwardCounter(constituencyId);
    return Number(result);
  } catch (e) {
    console.error("incrementOutwardCounter error:", e);
    return 1;
  }
}

// ── Notices ───────────────────────────────────────────────────────────────────

export async function getNoticesForDashboard(
  actor: ReturnType<typeof createActor>,
  constituencyId: string,
  viewerRole: string,
  viewerId: string,
): Promise<Notice[]> {
  return actor.getNoticesForDashboard(constituencyId, viewerRole, viewerId);
}

export async function getNoticesByRecipient(
  actor: ReturnType<typeof createActor>,
  constituencyId: string,
  recipientId: string,
  recipientType: string,
): Promise<Notice[]> {
  return actor.getNoticesByRecipient(
    constituencyId,
    recipientId,
    recipientType,
  );
}

export async function getNoticesByCreator(
  actor: ReturnType<typeof createActor>,
  constituencyId: string,
  creatorId: string,
  creatorRole: string,
): Promise<Notice[]> {
  return actor.getNoticesByCreator(constituencyId, creatorId, creatorRole);
}

export async function addNoticePrintRecord(
  actor: ReturnType<typeof createActor>,
  constituencyId: string,
  noticeId: string,
  printedBy: string,
  printedByName: string,
): Promise<Notice | null> {
  return actor.addNoticePrintRecord(
    constituencyId,
    noticeId,
    printedBy,
    printedByName,
  );
}

// ── Honorarium Eligibility ────────────────────────────────────────────────────

export async function getHonorariumEligibility(
  actor: ReturnType<typeof createActor>,
  constituencyId: string,
) {
  return actor.getHonorariumEligibility(constituencyId);
}

export async function getEligibleBLOsForHonorarium(
  actor: ReturnType<typeof createActor>,
  constituencyId: string,
): Promise<BLO[]> {
  return actor.getEligibleBLOsForHonorarium(constituencyId);
}

export async function setHonorariumExcludeOverride(
  actor: ReturnType<typeof createActor>,
  constituencyId: string,
  bloId: string,
  isManuallyIncluded: boolean,
  reason: string | null,
  overriddenBy: string | null,
): Promise<boolean> {
  return actor.setHonorariumExcludeOverride(
    constituencyId,
    bloId,
    isManuallyIncluded,
    reason,
    overriddenBy,
  );
}

// ── Nodal Officer Queries ─────────────────────────────────────────────────────

export async function getNodalOfficerSupervisors(
  actor: ReturnType<typeof createActor>,
  nodalOfficerId: string,
  constituencyId: string,
): Promise<Supervisor[]> {
  return actor.getNodalOfficerSupervisors(nodalOfficerId, constituencyId);
}

export async function getNodalOfficerBLOs(
  actor: ReturnType<typeof createActor>,
  nodalOfficerId: string,
  constituencyId: string,
): Promise<Supervisor[]> {
  return actor.getNodalOfficerBLOs(nodalOfficerId, constituencyId);
}

// ── Notice Recipient Status ───────────────────────────────────────────────────
// ── Notice Settings ──────────────────────────────────────────────────────────

export interface NoticeSettings {
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
}

export async function getNoticeSettings(
  actor: ReturnType<typeof createActor>,
  constituencyId: string,
): Promise<NoticeSettings | null> {
  try {
    const result = await (actor as any).getNoticeSettings(constituencyId);
    if (!result || (Array.isArray(result) && result.length === 0)) return null;
    const raw = Array.isArray(result) ? result[0] : result;
    return raw as NoticeSettings;
  } catch (e) {
    console.error("getNoticeSettings error:", e);
    return null;
  }
}

export async function saveNoticeSettings(
  actor: ReturnType<typeof createActor>,
  settings: NoticeSettings,
): Promise<boolean> {
  try {
    const result = await (actor as any).saveNoticeSettings(settings);
    return Boolean(result);
  } catch (e) {
    console.error("saveNoticeSettings error:", e);
    return false;
  }
}

export async function updateNoticeRecipientStatus(
  actor: ReturnType<typeof createActor>,
  noticeId: string,
  recipientId: string,
  newStatus: string,
  recipientType: string,
): Promise<boolean> {
  return actor.updateNoticeRecipientStatus(
    noticeId,
    recipientId,
    newStatus,
    recipientType,
  );
}

export async function getGPSTrackingInfoService(
  actor: any,
  constituencyId: string,
): Promise<any[]> {
  try {
    const result = await actor.getGPSTrackingInfo(constituencyId);
    return (result || []).map((r: any) => ({
      pollingStation: r.pollingStation,
      gpsLocation:
        r.gpsLocation && r.gpsLocation.length > 0 ? r.gpsLocation[0] : null,
      assignedBLO:
        r.assignedBLO && r.assignedBLO.length > 0 ? r.assignedBLO[0] : null,
      assignedSupervisor:
        r.assignedSupervisor && r.assignedSupervisor.length > 0
          ? r.assignedSupervisor[0]
          : null,
      assignedNodalOfficer:
        r.assignedNodalOfficer && r.assignedNodalOfficer.length > 0
          ? r.assignedNodalOfficer[0]
          : null,
    }));
  } catch (e) {
    console.error("getGPSTrackingInfo error:", e);
    return [];
  }
}

export async function getAllGPSLocationsService(actor: any): Promise<any[]> {
  try {
    return (await actor.getAllGPSLocations()) || [];
  } catch (e) {
    console.error("getAllGPSLocations error:", e);
    return [];
  }
}

export async function saveGPSLocationService(
  actor: any,
  constituencyId: string,
  location: any,
): Promise<boolean> {
  try {
    const result = await actor.saveGPSLocation(constituencyId, location);
    return Boolean(result);
  } catch (e) {
    console.error("saveGPSLocation error:", e);
    return false;
  }
}

export async function getAllConstituencyConfigsService(
  actor: any,
): Promise<any[]> {
  try {
    return (await actor.getAllConstituencyConfigs()) || [];
  } catch (e) {
    console.error("getAllConstituencyConfigs error:", e);
    return [];
  }
}

export async function addConstituencyService(
  actor: any,
  id: string,
  name: string,
  adminPassword: string,
): Promise<boolean> {
  try {
    const result = await actor.addConstituency(id, name, adminPassword);
    return Boolean(result);
  } catch (e) {
    console.error("addConstituency error:", e);
    return false;
  }
}

export async function setConstituencyAdminPasswordService(
  actor: any,
  constituencyId: string,
  newPassword: string,
  changedBy: string,
): Promise<boolean> {
  try {
    const result = await actor.setConstituencyAdminPassword(
      constituencyId,
      newPassword,
      changedBy,
    );
    return Boolean(result);
  } catch (e) {
    console.error("setConstituencyAdminPassword error:", e);
    return false;
  }
}

// ── Delete / BLO Bulk Operations ────────────────────────────────────────────

export async function deleteBLOsByConstituency(
  actor: ReturnType<typeof createActor>,
  constituencyId: string,
): Promise<boolean> {
  try {
    return Boolean(
      await (actor as any).deleteBLOsByConstituency(constituencyId),
    );
  } catch (e) {
    console.error("deleteBLOsByConstituency error:", e);
    return false;
  }
}

// ── Delete History (localStorage-backed) ────────────────────────────────────

const DELETE_HISTORY_KEY = "blo_delete_history";

export interface DeleteRecord {
  type: string; // e.g. 'पर्यवेक्षक' | 'नोडल अधिकारी'
  name: string;
  deletedBy: string;
  reason: string;
  date: string; // ISO string
}

export function recordDeletion(
  type: string,
  name: string,
  deletedBy: string,
  reason: string,
): void {
  try {
    const existing = getDeleteHistory();
    const record: DeleteRecord = {
      type,
      name,
      deletedBy,
      reason,
      date: new Date().toISOString(),
    };
    const updated = [record, ...existing].slice(0, 200); // keep last 200
    localStorage.setItem(DELETE_HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("recordDeletion error:", e);
  }
}

export function getDeleteHistory(): DeleteRecord[] {
  try {
    const raw = localStorage.getItem(DELETE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DeleteRecord[]) : [];
  } catch (e) {
    console.error("getDeleteHistory error:", e);
    return [];
  }
}
