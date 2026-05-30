// ── Domain types for BLO Management System (backend-aligned) ─────────────────

export interface PollingStation {
  id: string;
  constituencyId: string;
  partNumber: string;
  partName: string;
  location: string;
  lat?: number;
  lon?: number;
  bloId?: string;
  // Legacy fields used by page components
  stationNumber?: string;
  stationName?: string;
  ward?: string;
  hasBLO?: boolean;
  gps?: { lat: number; lon: number; lng?: number };
}

export interface BLO {
  id: string;
  constituencyId: string;
  name: string;
  phone: string;
  whatsapp?: string;
  address: string;
  pollingStationId: string;
  partNumber: string;
  status: string;
  orderNumber?: string;
  appointmentDate?: bigint;
  supervisorId?: string;
  honorariumEligible: boolean;
  deactivatedAt?: bigint;
  noticeCount: bigint;
  epicNumber?: string;
  // Legacy optional fields used by page components
  designation?: string;
  office?: string;
  officeAddress?: string;
  whatsappNumber?: string;
  reactivationDate?: string;
  deactivationDate?: string;
  partName?: string;
  pollingStationName?: string;
}

export interface AppointmentOrder {
  id: string;
  constituencyId: string;
  bloId: string;
  orderNumber: string;
  partNumber: string;
  issueDate: bigint;
  designation: string;
  referenceNumber?: string;
  // Legacy optional fields used by page components
  pollingStationId?: string;
  pollingStationName?: string;
  orderDate?: number | bigint;
  bloName?: string;
  office?: string;
  status?: string;
}

export interface PrintRecord {
  printedBy: string;
  printedAt: bigint;
  printedByName: string;
}

export interface Notice {
  id: string;
  constituencyId: string;
  bloId: string;
  noticeNumber?: string;
  referenceNumber: string;
  issueDate: bigint;
  noticeText: string;
  status: string;
  whatsappSent: boolean;
  emailSent: boolean;
  acknowledgedAt?: bigint;
  // New fields for creator/recipient tracking
  createdByRole?: string;
  createdById?: string;
  createdByName?: string;
  recipientType?: string;
  recipientId?: string;
  printHistory?: PrintRecord[];
  // Legacy optional fields used by page components
  noticeType?: string;
  description?: string;
  issuedDate?: bigint;
  bloName?: string;
}

export interface Supervisor {
  id: string;
  constituencyId: string;
  name: string;
  phone: string;
  designation: string;
  passwordHash: string;
  assignedParts: string[];
  isActive: boolean;
  passwordChangedAt: bigint;
  loginAttempts: bigint;
  lockedUntil?: bigint;
  // Legacy optional field
  whatsapp?: string;
}

export interface NodalOfficer {
  id: string;
  constituencyId: string;
  name: string;
  phone: string;
  designation: string;
  passwordHash: string;
  assignedSupervisorIds: string[];
  isActive: boolean;
  passwordChangedAt: bigint;
  loginAttempts: bigint;
  lockedUntil?: bigint;
}

export interface HonorariumRecord {
  id: string;
  constituencyId: string;
  bloId: string;
  quarter: string;
  year: bigint;
  amount: number;
  proRata: boolean;
  proRataReason?: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: bigint;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  paidAt?: bigint;
  status: string;
}

export interface GPSLocation {
  pollingStationId: string;
  constituencyId: string;
  lat: number;
  lon: number;
  updatedBy: string;
  updatedAt: bigint;
  stationId: string;
  updatedByRole: string;
  updatedByName: string;
}

export interface JavakEntry {
  id: string;
  constituencyId: string;
  docType: string;
  direction: string;
  description: string;
  date: bigint;
  docNumber: string;
  sequenceNumber: bigint;
  deleted: boolean;
}

export interface OfficialDoc {
  id: string;
  constituencyId: string;
  fileName: string;
  uploadedAt: bigint;
  uploadedBy: string;
  url: string;
}

export interface ConstituencyConfig {
  constituencyId: string;
  name: string;
  number: string;
  enabled: boolean;
  adminPassword: string;
  passwordChangedAt: bigint;
  loginAttempts: bigint;
  lockedUntil?: bigint;
}

export interface PasswordHistoryEntry {
  id: string;
  constituencyId: string;
  role: string;
  userId: string;
  changedAt: bigint;
  changedBy: string;
}

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

// Helper to convert bigint/number/string to string safely
export const toStr = (
  v: bigint | string | number | null | undefined,
): string => (v == null ? "" : String(v));

// Legacy enum aliases for page components that reference these
export enum BLOStatus {
  active = "active",
  pending = "pending",
  removed = "removed",
  inactive = "inactive",
}

export enum NoticeType {
  first = "first",
  second = "second",
  third = "third",
  notice1 = "notice1",
  notice2 = "notice2",
  notice3 = "notice3",
  disciplinary = "disciplinary",
  police = "police",
}

export interface SessionData {
  role: "admin" | "supervisor" | "nodal" | "superadmin";
  constituencyId: string;
  userId: string;
  name: string;
}

export interface DashboardStats {
  totalStations: bigint;
  stationsWithoutBLO: bigint;
  activeBLOs: bigint;
  pendingOrders: bigint;
  blosWithNotices: bigint;
}

export interface GPSTrackingRecord {
  pollingStation: PollingStation;
  gpsLocation: GPSLocation | null;
  assignedBLO: BLO | null;
  assignedSupervisor: Supervisor | null;
  assignedNodalOfficer: NodalOfficer | null;
}
