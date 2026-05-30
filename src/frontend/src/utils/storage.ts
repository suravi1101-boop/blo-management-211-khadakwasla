import type { NodalOfficer } from "../types/domain";

// Local LocalJavakEntry type for localStorage-based register (different from backend LocalJavakEntry)
export interface LocalLocalJavakEntry {
  id: string;
  javakNumber: string;
  documentType: string;
  date: string;
  subject: string;
  recipientName: string;
  recipientDesignation: string;
  pollingPartNumber?: string;
  remarks?: string;
  createdBy?: string;
  createdByRole?: string;
  isManual?: boolean;
}

// Alias for legacy code that uses LocalJavakEntry
export type LocalJavakEntry = LocalLocalJavakEntry;

import type {
  AppointmentOrder,
  BLO,
  Notice,
  PollingStation,
} from "../types/domain";

// ── Constituency prefix management ─────────────────────────────────────────
let _constituencyPrefix = "";

export function setCurrentConstituency(id: string) {
  _constituencyPrefix = id;
}

export function getCurrentConstituency(): string {
  // Prefer sessionStorage session over in-memory prefix
  try {
    const raw = sessionStorage.getItem("blo_session_v2");
    if (raw) {
      const sess = JSON.parse(raw) as { constituencyId?: string };
      if (sess?.constituencyId) return sess.constituencyId;
    }
  } catch {
    /* ignore */
  }
  return _constituencyPrefix;
}

// ── Session management (sessionStorage — persists on refresh, cleared on tab close) ────
export interface SessionData {
  role: "admin" | "supervisor" | "nodal" | "superadmin";
  constituencyId: string; // MUST be numeric '211'–'231'
  userId: string;
  name: string;
}

const SESSION_KEY = "blo_session_v2";

export function saveSession(data: SessionData): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    // Also update the in-memory prefix
    _constituencyPrefix = data.constituencyId;
  } catch {
    /* ignore */
  }
}

export function getSession(): SessionData | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  _constituencyPrefix = "";
}

export function getCurrentConstituencyId(): string | null {
  const sess = getSession();
  return sess?.constituencyId ?? null;
}

// ── Cache helpers (localStorage — offline fallback ONLY, never primary) ─────
import type {
  BLO as BackendBLO,
  PollingStation as BackendPollingStation,
} from "../backend";

export function getCachedBLOs(constituencyId: string): BackendBLO[] {
  try {
    const raw = localStorage.getItem(`blo_cache_${constituencyId}`);
    return raw ? (JSON.parse(raw) as BackendBLO[]) : [];
  } catch {
    return [];
  }
}

export function setCachedBLOs(
  constituencyId: string,
  data: BackendBLO[],
): void {
  try {
    localStorage.setItem(`blo_cache_${constituencyId}`, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function getCachedPollingStations(
  constituencyId: string,
): BackendPollingStation[] {
  try {
    const raw = localStorage.getItem(`ps_cache_${constituencyId}`);
    return raw ? (JSON.parse(raw) as BackendPollingStation[]) : [];
  } catch {
    return [];
  }
}

export function setCachedPollingStations(
  constituencyId: string,
  data: BackendPollingStation[],
): void {
  try {
    localStorage.setItem(`ps_cache_${constituencyId}`, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

// ── Migration helper: reads OLD localStorage data in all legacy key formats ──
// For constituency '211' (Khadakwasla), tries:
//   1. 'khadakwasla_' prefixed keys (legacy format used before v140)
//   2. '211_' prefixed keys (numeric format)
//   3. Un-prefixed keys (oldest v120 format)
//
// Returns object with arrays for each data type. Empty arrays if nothing found.
export function getMigrationLocalData(constituencyId: string): {
  pollingStations: object[];
  blos: object[];
  supervisors: object[];
  nodalOfficers: object[];
  orders: object[];
  notices: object[];
  honorarium: object[];
  gpsLocations: object[];
  javakEntries: object[];
} {
  function tryRead(key: string): object[] {
    try {
      const raw = localStorage.getItem(key);
      if (!raw || raw === "[]" || raw === "") return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function bestOf(...keys: string[]): object[] {
    for (const key of keys) {
      const result = tryRead(key);
      if (result.length > 0) return result;
    }
    return [];
  }

  // For constituency 211, also try 'khadakwasla' prefixed and un-prefixed
  const legacyPrefix =
    constituencyId === "211" ? "khadakwasla" : constituencyId;

  return {
    pollingStations: bestOf(
      `${legacyPrefix}_blo_stations`,
      `${constituencyId}_blo_stations`,
      "blo_stations",
    ),
    blos: bestOf(
      `${legacyPrefix}_blo_blos`,
      `${constituencyId}_blo_blos`,
      "blo_blos",
    ),
    supervisors: bestOf(
      `${legacyPrefix}_blo_supervisors`,
      `${constituencyId}_blo_supervisors`,
      "blo_supervisors",
    ),
    nodalOfficers: bestOf(
      `${legacyPrefix}_nodal_officers`,
      `${constituencyId}_nodal_officers`,
    ),
    orders: bestOf(
      `${legacyPrefix}_blo_orders`,
      `${constituencyId}_blo_orders`,
      "blo_orders",
    ),
    notices: bestOf(
      `${legacyPrefix}_blo_notices`,
      `${constituencyId}_blo_notices`,
      "blo_notices",
    ),
    honorarium: bestOf(
      `${legacyPrefix}_honorarium_quarterly`,
      `${constituencyId}_honorarium_quarterly`,
    ),
    gpsLocations: bestOf(
      `${legacyPrefix}_gps_locations`,
      `${constituencyId}_gps_locations`,
    ),
    javakEntries: bestOf(
      `${legacyPrefix}_javak_entries`,
      `${constituencyId}_javak_entries`,
    ),
  };
}

export function migrateKhadakwaslaData() {
  const oldToNew: [string, string][] = [
    ["blo_stations", "khadakwasla_blo_stations"],
    ["blo_orders", "khadakwasla_blo_orders"],
    ["blo_blos", "khadakwasla_blo_blos"],
    ["blo_notices", "khadakwasla_blo_notices"],
    ["blo_bank_details", "khadakwasla_blo_bank_details"],
    ["honorarium_config", "khadakwasla_honorarium_config"],
    ["honorarium_quarterly", "khadakwasla_honorarium_quarterly"],
    ["honorarium_extra", "khadakwasla_honorarium_extra"],
    ["honorarium_date_changes", "khadakwasla_honorarium_date_changes"],
    ["blo_supervisors", "khadakwasla_blo_supervisors"],
    ["supervisor_blo_change_log", "khadakwasla_supervisor_blo_change_log"],
    ["supervisor_bank_details", "khadakwasla_supervisor_bank_details"],
    ["supervisor_notices", "khadakwasla_supervisor_notices"],
    [
      "supervisor_honorarium_config",
      "khadakwasla_supervisor_honorarium_config",
    ],
    [
      "supervisor_honorarium_quarterly",
      "khadakwasla_supervisor_honorarium_quarterly",
    ],
    ["supervisor_honorarium_extra", "khadakwasla_supervisor_honorarium_extra"],
    ["supervisor_date_changes", "khadakwasla_supervisor_date_changes"],
    ["supervisor_login_history", "khadakwasla_supervisor_login_history"],
    ["supervisor_work_reports", "khadakwasla_supervisor_work_reports"],
    ["officer_settings", "khadakwasla_officer_settings"],
  ];

  let migrated = false;
  for (const [oldKey, newKey] of oldToNew) {
    const val = localStorage.getItem(oldKey);
    // Copy old→new if new key is empty/missing (runs every load — safe because it only copies when new key is empty)
    const newVal = localStorage.getItem(newKey);
    const newIsEmpty = newVal === null || newVal === "[]" || newVal === "";
    if (val !== null && val !== "[]" && val !== "" && newIsEmpty) {
      localStorage.setItem(newKey, val);
      migrated = true;
    }
  }

  // Safety recovery: if khadakwasla_blo_supervisors is still empty but blo_supervisors has data, force-copy
  const khadakwaslaSups = localStorage.getItem("khadakwasla_blo_supervisors");
  const oldSups = localStorage.getItem("blo_supervisors");
  if (
    (khadakwaslaSups === null ||
      khadakwaslaSups === "[]" ||
      khadakwaslaSups === "") &&
    oldSups !== null &&
    oldSups !== "[]" &&
    oldSups !== ""
  ) {
    localStorage.setItem("khadakwasla_blo_supervisors", oldSups);
    migrated = true;
  }

  // Safety recovery for supervisor change log
  const khadakwaslaLog = localStorage.getItem(
    "khadakwasla_supervisor_blo_change_log",
  );
  const oldLog = localStorage.getItem("supervisor_blo_change_log");
  if (
    (khadakwaslaLog === null ||
      khadakwaslaLog === "[]" ||
      khadakwaslaLog === "") &&
    oldLog !== null &&
    oldLog !== "[]" &&
    oldLog !== ""
  ) {
    localStorage.setItem("khadakwasla_supervisor_blo_change_log", oldLog);
    migrated = true;
  }

  if (migrated) {
    console.log(
      "Migrated/recovered Khadakwasla data to constituency-prefixed keys",
    );
  }
}

export interface BankDetails {
  bankName: string;
  branch: string;
  accountNumber: string;
  ifsc: string;
  accountHolder: string;
  accountType: "savings" | "current";
}

export interface HonorariumConfig {
  amountPerQuarter: number;
}

export interface QuarterlyPayment {
  id: string;
  bloId: string;
  quarterLabel: string;
  quarterStart: string;
  quarterEnd: string;
  amount: number;
  paid: boolean;
  paidDate?: string;
  paidByGrant?: boolean;
}

export interface ExtraPayment {
  id: string;
  bloId: string;
  amount: number;
  reason: string;
  date: string;
  paid: boolean;
  paidDate?: string;
}

export interface AppointmentDateChange {
  id: string;
  bloId: string;
  bloName: string;
  partNumber: string;
  oldDate: string;
  newDate: string;
  changedAt: string;
  quartersDifference: number;
  amountDifference: number;
}

export interface Supervisor {
  id: string;
  name: string;
  designation: string;
  office: string;
  phone: string;
  whatsappNumber: string;
  officeEmail: string;
  appointmentDate: string;
  assignedPartNumbers: number[];
  status: "active" | "inactive";
  password?: string;
}

export interface BLOChangeRecord {
  id: string;
  type: "edit" | "replace";
  partNumber: number;
  supervisorId: string;
  supervisorName: string;
  changedAt: string;
  oldData?: {
    name?: string;
    designation?: string;
    office?: string;
    phone?: string;
    epicNumber?: string;
    appointmentDate?: string;
  };
  newData?: {
    name?: string;
    designation?: string;
    office?: string;
    phone?: string;
    epicNumber?: string;
    appointmentDate?: string;
  };
  oldBLOName?: string;
  newBLOName?: string;
}

export interface SupervisorBankDetails {
  bankName: string;
  branch: string;
  accountNumber: string;
  ifsc: string;
}

export interface SupervisorNotice {
  id: string;
  supervisorId: string;
  supervisorName: string;
  supervisorDesignation?: string;
  supervisorOffice?: string;
  supervisorPhone?: string;
  supervisorEmail?: string;
  noticeType: "notice1" | "notice2" | "notice3";
  issuedDate: string;
  description: string;
}

export interface NodalNotice {
  id: string;
  nodalOfficerId: string;
  nodalOfficerName: string;
  nodalOfficerDesignation?: string;
  nodalOfficerOffice?: string;
  nodalOfficerWhatsapp?: string;
  noticeType: "notice1" | "notice2" | "notice3";
  issuedDate: string;
  description: string;
}

export interface SupervisorQuarterlyPayment {
  id: string;
  supervisorId: string;
  quarterLabel: string;
  quarterStart: string;
  quarterEnd: string;
  amount: number;
  paid: boolean;
  paidDate?: string;
  paidByGrant?: boolean;
}

export interface SupervisorExtraPayment {
  id: string;
  supervisorId: string;
  amount: number;
  reason: string;
  date: string;
  paid: boolean;
  paidDate?: string;
}

export interface SupervisorAppointmentDateChange {
  id: string;
  supervisorId: string;
  supervisorName: string;
  oldDate: string;
  newDate: string;
  changedAt: string;
  quartersDifference: number;
  amountDifference: number;
}

export interface SupervisorWorkReportEntry {
  bloId: string;
  partNum: number;
  name: string;
  worked: boolean;
  remark: string;
}

export interface SupervisorWorkReport {
  id: string;
  supervisorId: string;
  quarter: string;
  year: string;
  submittedAt: string;
  blos: SupervisorWorkReportEntry[];
}

const KEYS = {
  get stations() {
    return `${_constituencyPrefix}_blo_stations`;
  },
  get orders() {
    return `${_constituencyPrefix}_blo_orders`;
  },
  get blos() {
    return `${_constituencyPrefix}_blo_blos`;
  },
  get notices() {
    return `${_constituencyPrefix}_blo_notices`;
  },
  get bankDetails() {
    return `${_constituencyPrefix}_blo_bank_details`;
  },
  get honorariumConfig() {
    return `${_constituencyPrefix}_honorarium_config`;
  },
  get honorariumQuarterly() {
    return `${_constituencyPrefix}_honorarium_quarterly`;
  },
  get honorariumExtra() {
    return `${_constituencyPrefix}_honorarium_extra`;
  },
  get appointmentDateChanges() {
    return `${_constituencyPrefix}_honorarium_date_changes`;
  },
  get supervisors() {
    return `${_constituencyPrefix}_blo_supervisors`;
  },
  get bloChangeLog() {
    return `${_constituencyPrefix}_supervisor_blo_change_log`;
  },
  get supervisorBankDetails() {
    return `${_constituencyPrefix}_supervisor_bank_details`;
  },
  get supervisorNotices() {
    return `${_constituencyPrefix}_supervisor_notices`;
  },
  get supervisorHonorariumConfig() {
    return `${_constituencyPrefix}_supervisor_honorarium_config`;
  },
  get supervisorHonorariumQuarterly() {
    return `${_constituencyPrefix}_supervisor_honorarium_quarterly`;
  },
  get supervisorHonorariumExtra() {
    return `${_constituencyPrefix}_supervisor_honorarium_extra`;
  },
  get supervisorDateChanges() {
    return `${_constituencyPrefix}_supervisor_date_changes`;
  },
  get supervisorLoginHistory() {
    return `${_constituencyPrefix}_supervisor_login_history`;
  },
  get officerSettings() {
    return `${_constituencyPrefix}_officer_settings`;
  },
  get supervisorWorkReports() {
    return `${_constituencyPrefix}_supervisor_work_reports`;
  },
  get javakEntries() {
    return `${_constituencyPrefix}_javak_entries`;
  },
  get javakCounter() {
    return `${_constituencyPrefix}_javak_counter`;
  },
  get nodalOfficers() {
    return `${_constituencyPrefix}_nodal_officers`;
  },
  get nodalNotices() {
    return `${_constituencyPrefix}_nodal_notices`;
  },
  // Global keys (NOT per-constituency):
  supervisorSession: "supervisor_session",
  adminSession: "admin_session",
  adminPassword: "admin_password",
};

const BIGINT_KEYS = new Set([
  "id",
  "pollingStationId",
  "appointmentOrderId",
  "bloId",
]);

function getItem<T>(key: string): T[] {
  try {
    const val = localStorage.getItem(key);
    if (!val) return [];
    return JSON.parse(val, (k, v) => {
      if (BIGINT_KEYS.has(k) && typeof v === "string" && /^\d+$/.test(v)) {
        return BigInt(v);
      }
      return v;
    });
  } catch {
    return [];
  }
}

function setItem<T>(key: string, items: T[]) {
  localStorage.setItem(
    key,
    JSON.stringify(items, (_k, v) =>
      typeof v === "bigint" ? v.toString() : v,
    ),
  );
  // Notify ConstituencyHome to refresh stats
  window.dispatchEvent(new Event("blo-data-updated"));
}

function getJsonItem<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
}

// ── Migration data reader — reads localStorage for one-time migration ─────────
export function getMigrationData(constituencyId: string): {
  blos: BLO[];
  stations: PollingStation[];
} {
  const prevPrefix = _constituencyPrefix;
  _constituencyPrefix = constituencyId;
  const blos = getItem<BLO>(KEYS.blos);
  const stations = getItem<PollingStation>(KEYS.stations);
  _constituencyPrefix = prevPrefix;
  return { blos, stations };
}

export const storage = {
  getStations: () => getItem<PollingStation>(KEYS.stations),
  setStations: (
    constituencyId: string | PollingStation[],
    stations?: PollingStation[],
  ) => {
    if (typeof constituencyId === "string" && stations !== undefined) {
      localStorage.setItem(
        `${constituencyId}_blo_stations`,
        JSON.stringify(stations, (_k, v) =>
          typeof v === "bigint" ? v.toString() : v,
        ),
      );
      window.dispatchEvent(new Event("blo-data-updated"));
    } else {
      setItem(KEYS.stations, constituencyId as PollingStation[]);
    }
  },
  getOrders: () => getItem<AppointmentOrder>(KEYS.orders),
  setOrders: (
    constituencyId: string | AppointmentOrder[],
    orders?: AppointmentOrder[],
  ) => {
    if (typeof constituencyId === "string" && orders !== undefined) {
      localStorage.setItem(
        `${constituencyId}_blo_orders`,
        JSON.stringify(orders, (_k, v) =>
          typeof v === "bigint" ? v.toString() : v,
        ),
      );
      window.dispatchEvent(new Event("blo-data-updated"));
    } else {
      setItem(KEYS.orders, constituencyId as AppointmentOrder[]);
    }
  },
  getBLOs: () => getItem<BLO>(KEYS.blos),
  setBLOs: (constituencyId: string | BLO[], blos?: BLO[]) => {
    if (typeof constituencyId === "string" && blos !== undefined) {
      localStorage.setItem(
        `${constituencyId}_blo_blos`,
        JSON.stringify(blos, (_k, v) =>
          typeof v === "bigint" ? v.toString() : v,
        ),
      );
      window.dispatchEvent(new Event("blo-data-updated"));
    } else {
      setItem(KEYS.blos, constituencyId as BLO[]);
    }
  },
  getNotices: () => getItem<Notice>(KEYS.notices),
  setNotices: (constituencyId: string | Notice[], notices?: Notice[]) => {
    if (typeof constituencyId === "string" && notices !== undefined) {
      localStorage.setItem(
        `${constituencyId}_blo_notices`,
        JSON.stringify(notices, (_k, v) =>
          typeof v === "bigint" ? v.toString() : v,
        ),
      );
      window.dispatchEvent(new Event("blo-data-updated"));
    } else {
      setItem(KEYS.notices, constituencyId as Notice[]);
    }
  },
  getBankDetails: (): Record<string, BankDetails> => {
    try {
      const val = localStorage.getItem(KEYS.bankDetails);
      return val ? JSON.parse(val) : {};
    } catch {
      return {};
    }
  },
  setBankDetails: (
    constituencyId: string | Record<string, BankDetails>,
    details?: BankDetails,
  ) => {
    if (typeof constituencyId === "string" && details !== undefined) {
      localStorage.setItem(
        `${constituencyId}_blo_bank_details`,
        JSON.stringify(details),
      );
    } else {
      localStorage.setItem(KEYS.bankDetails, JSON.stringify(constituencyId));
    }
  },
  saveBankDetail: (bloId: string, details: BankDetails) => {
    const map = storage.getBankDetails();
    map[bloId] = details;
    storage.setBankDetails(map);
  },
  getBankDetail: (bloId: string): BankDetails | null => {
    return storage.getBankDetails()[bloId] ?? null;
  },
  getHonorariumConfig: (): HonorariumConfig => {
    return getJsonItem<HonorariumConfig>(KEYS.honorariumConfig, {
      amountPerQuarter: 500,
    });
  },
  setHonorariumConfig: (
    constituencyId: string | HonorariumConfig,
    config?: HonorariumConfig,
  ) => {
    if (typeof constituencyId === "string" && config !== undefined) {
      localStorage.setItem(
        `${constituencyId}_honorarium_config`,
        JSON.stringify(config),
      );
    } else {
      localStorage.setItem(
        KEYS.honorariumConfig,
        JSON.stringify(constituencyId),
      );
    }
  },
  getQuarterlyPayments: (): QuarterlyPayment[] => {
    return getJsonItem<QuarterlyPayment[]>(KEYS.honorariumQuarterly, []);
  },
  setQuarterlyPayments: (
    constituencyId: string | QuarterlyPayment[],
    payments?: QuarterlyPayment[],
  ) => {
    if (typeof constituencyId === "string" && payments !== undefined) {
      localStorage.setItem(
        `${constituencyId}_honorarium_quarterly`,
        JSON.stringify(payments),
      );
    } else {
      localStorage.setItem(
        KEYS.honorariumQuarterly,
        JSON.stringify(constituencyId),
      );
    }
  },
  getExtraPayments: (): ExtraPayment[] => {
    return getJsonItem<ExtraPayment[]>(KEYS.honorariumExtra, []);
  },
  setExtraPayments: (
    constituencyId: string | ExtraPayment[],
    payments?: ExtraPayment[],
  ) => {
    if (typeof constituencyId === "string" && payments !== undefined) {
      localStorage.setItem(
        `${constituencyId}_honorarium_extra`,
        JSON.stringify(payments),
      );
    } else {
      localStorage.setItem(
        KEYS.honorariumExtra,
        JSON.stringify(constituencyId),
      );
    }
  },
  getAppointmentDateChanges: (): AppointmentDateChange[] => {
    return getJsonItem<AppointmentDateChange[]>(
      KEYS.appointmentDateChanges,
      [],
    );
  },
  setAppointmentDateChanges: (
    constituencyId: string | AppointmentDateChange[],
    changes?: AppointmentDateChange[],
  ) => {
    if (typeof constituencyId === "string" && changes !== undefined) {
      localStorage.setItem(
        `${constituencyId}_honorarium_date_changes`,
        JSON.stringify(changes),
      );
    } else {
      localStorage.setItem(
        KEYS.appointmentDateChanges,
        JSON.stringify(constituencyId),
      );
    }
  },
  getSupervisors: (): Supervisor[] => {
    return getJsonItem<Supervisor[]>(KEYS.supervisors, []);
  },
  setSupervisors: (supervisors: Supervisor[]) => {
    localStorage.setItem(KEYS.supervisors, JSON.stringify(supervisors));
    window.dispatchEvent(new Event("blo-data-updated"));
  },
  getBLOChangeLog: (): BLOChangeRecord[] =>
    getJsonItem<BLOChangeRecord[]>(KEYS.bloChangeLog, []),
  setBLOChangeLog: (records: BLOChangeRecord[]) =>
    localStorage.setItem(KEYS.bloChangeLog, JSON.stringify(records)),
  addBLOChangeRecord: (record: BLOChangeRecord) => {
    const existing = storage.getBLOChangeLog();
    storage.setBLOChangeLog([record, ...existing]);
  },
  // ── Supervisor Bank Details ──────────────────────────────────────────────
  getSupervisorBankDetails: (): Record<string, SupervisorBankDetails> => {
    try {
      const val = localStorage.getItem(KEYS.supervisorBankDetails);
      return val ? JSON.parse(val) : {};
    } catch {
      return {};
    }
  },
  setSupervisorBankDetails: (
    constituencyId: string | Record<string, SupervisorBankDetails>,
    details?: BankDetails,
  ) => {
    if (typeof constituencyId === "string" && details !== undefined) {
      localStorage.setItem(
        `${constituencyId}_supervisor_bank_details`,
        JSON.stringify(details),
      );
    } else {
      localStorage.setItem(
        KEYS.supervisorBankDetails,
        JSON.stringify(constituencyId),
      );
    }
  },
  saveSupervisorBankDetail: (
    supervisorId: string,
    details: SupervisorBankDetails,
  ) => {
    const map = storage.getSupervisorBankDetails();
    map[supervisorId] = details;
    storage.setSupervisorBankDetails(map);
  },
  getSupervisorBankDetail: (
    supervisorId: string,
  ): SupervisorBankDetails | null => {
    return storage.getSupervisorBankDetails()[supervisorId] ?? null;
  },
  // ── Supervisor Notices ────────────────────────────────────────────────────
  getSupervisorNotices: (): SupervisorNotice[] =>
    getJsonItem<SupervisorNotice[]>(KEYS.supervisorNotices, []),
  setSupervisorNotices: (n: SupervisorNotice[]) =>
    localStorage.setItem(KEYS.supervisorNotices, JSON.stringify(n)),
  // ── Supervisor Honorarium Config ──────────────────────────────────────────
  getSupervisorHonorariumConfig: (): HonorariumConfig =>
    getJsonItem<HonorariumConfig>(KEYS.supervisorHonorariumConfig, {
      amountPerQuarter: 500,
    }),
  setSupervisorHonorariumConfig: (config: HonorariumConfig) =>
    localStorage.setItem(
      KEYS.supervisorHonorariumConfig,
      JSON.stringify(config),
    ),
  // ── Supervisor Quarterly Payments ─────────────────────────────────────────
  getSupervisorQuarterlyPayments: (): SupervisorQuarterlyPayment[] =>
    getJsonItem<SupervisorQuarterlyPayment[]>(
      KEYS.supervisorHonorariumQuarterly,
      [],
    ),
  setSupervisorQuarterlyPayments: (p: SupervisorQuarterlyPayment[]) =>
    localStorage.setItem(KEYS.supervisorHonorariumQuarterly, JSON.stringify(p)),
  // ── Supervisor Extra Payments ─────────────────────────────────────────────
  getSupervisorExtraPayments: (): SupervisorExtraPayment[] =>
    getJsonItem<SupervisorExtraPayment[]>(KEYS.supervisorHonorariumExtra, []),
  setSupervisorExtraPayments: (p: SupervisorExtraPayment[]) =>
    localStorage.setItem(KEYS.supervisorHonorariumExtra, JSON.stringify(p)),
  // ── Supervisor Date Changes ───────────────────────────────────────────────
  getSupervisorDateChanges: (): SupervisorAppointmentDateChange[] =>
    getJsonItem<SupervisorAppointmentDateChange[]>(
      KEYS.supervisorDateChanges,
      [],
    ),
  setSupervisorDateChanges: (c: SupervisorAppointmentDateChange[]) =>
    localStorage.setItem(KEYS.supervisorDateChanges, JSON.stringify(c)),
  // ── Supervisor Session ────────────────────────────────────────────────────
  getSupervisorSession: (): string | null => {
    const key = _constituencyPrefix
      ? `${_constituencyPrefix}_supervisor_session`
      : KEYS.supervisorSession;
    return sessionStorage.getItem(key);
  },
  setSupervisorSession: (id: string | null) => {
    const key = _constituencyPrefix
      ? `${_constituencyPrefix}_supervisor_session`
      : KEYS.supervisorSession;
    if (id === null) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, id);
    }
  },
  // ── Supervisor Login History ──────────────────────────────────────────────
  getSupervisorLoginHistory: (): Array<{
    id: string;
    supervisorId: string;
    supervisorName: string;
    loginTime: string;
    logoutTime?: string;
  }> => {
    try {
      return JSON.parse(
        localStorage.getItem(KEYS.supervisorLoginHistory) || "[]",
      );
    } catch {
      return [];
    }
  },
  addSupervisorLoginEntry: (
    supervisorId: string,
    supervisorName: string,
  ): string => {
    const history = (() => {
      try {
        return JSON.parse(
          localStorage.getItem(KEYS.supervisorLoginHistory) || "[]",
        );
      } catch {
        return [];
      }
    })();
    const entryId = Date.now().toString();
    history.unshift({
      id: entryId,
      supervisorId,
      supervisorName,
      loginTime: new Date().toISOString(),
    });
    if (history.length > 500) history.splice(500);
    localStorage.setItem(KEYS.supervisorLoginHistory, JSON.stringify(history));
    return entryId;
  },
  updateSupervisorLogoutEntry: (entryId: string) => {
    const history = (() => {
      try {
        return JSON.parse(
          localStorage.getItem(KEYS.supervisorLoginHistory) || "[]",
        );
      } catch {
        return [];
      }
    })();
    const entry = history.find((h: { id: string }) => h.id === entryId);
    if (entry) {
      entry.logoutTime = new Date().toISOString();
      localStorage.setItem(
        KEYS.supervisorLoginHistory,
        JSON.stringify(history),
      );
    }
  },
  // ── Supervisor Work Reports ──────────────────────────────────────────────
  getSupervisorWorkReports: (): SupervisorWorkReport[] =>
    getJsonItem<SupervisorWorkReport[]>(KEYS.supervisorWorkReports, []),
  setSupervisorWorkReports: (reports: SupervisorWorkReport[]) =>
    localStorage.setItem(KEYS.supervisorWorkReports, JSON.stringify(reports)),
  saveOrUpdateWorkReport: (report: SupervisorWorkReport) => {
    const all = storage.getSupervisorWorkReports();
    const idx = all.findIndex(
      (r) =>
        r.supervisorId === report.supervisorId &&
        r.quarter === report.quarter &&
        r.year === report.year,
    );
    if (idx >= 0) {
      all[idx] = report;
    } else {
      all.push(report);
    }
    storage.setSupervisorWorkReports(all);
  },
  getWorkReportForSupervisor: (
    supervisorId: string,
    quarter: string,
    year: string,
  ): SupervisorWorkReport | null => {
    const all = storage.getSupervisorWorkReports();
    return (
      all.find(
        (r) =>
          r.supervisorId === supervisorId &&
          r.quarter === quarter &&
          r.year === year,
      ) ?? null
    );
  },
  // ── Supervisor Honorarium Approvals ───────────────────────────────────────────────
  getSupervisorHonorariumApprovals: (): Array<{
    id: string;
    supervisorId: string;
    bloId: string;
    quarter: string;
    approvedAt: string;
    status: "approved" | "rejected";
    remark?: string;
  }> => {
    try {
      return JSON.parse(
        localStorage.getItem(
          `${_constituencyPrefix}_supervisor_honorarium_approvals`,
        ) || "[]",
      );
    } catch {
      return [];
    }
  },
  saveSupervisorHonorariumApproval: (approval: {
    id: string;
    supervisorId: string;
    bloId: string;
    quarter: string;
    approvedAt: string;
    status: "approved" | "rejected";
    remark?: string;
  }) => {
    const all = storage.getSupervisorHonorariumApprovals();
    const idx = all.findIndex(
      (a) =>
        a.supervisorId === approval.supervisorId &&
        a.bloId === approval.bloId &&
        a.quarter === approval.quarter,
    );
    if (idx >= 0) {
      all[idx] = approval;
    } else {
      all.push(approval);
    }
    localStorage.setItem(
      `${_constituencyPrefix}_supervisor_honorarium_approvals`,
      JSON.stringify(all),
    );
  },
  // ── Javak Register ────────────────────────────────────────────────────────────────────────────
  getJavakEntries: (): LocalJavakEntry[] =>
    getJsonItem<LocalJavakEntry[]>(KEYS.javakEntries, []),
  setJavakEntries: (entries: LocalJavakEntry[]) =>
    localStorage.setItem(KEYS.javakEntries, JSON.stringify(entries)),
  getNextJavakNumber: (date: string): string => {
    const year = date.split("-")[0] || new Date().getFullYear().toString();
    // Read current counter for this year
    const counterKey = KEYS.javakCounter;
    let counters: Record<string, number> = {};
    try {
      counters = JSON.parse(localStorage.getItem(counterKey) || "{}");
    } catch {
      counters = {};
    }
    const current = counters[year] || 0;
    const next = current + 1;
    counters[year] = next;
    localStorage.setItem(counterKey, JSON.stringify(counters));
    // Constituency number extraction: use first segment of prefix or '211' for khadakwasla
    const constituencyNum =
      _constituencyPrefix === "khadakwasla"
        ? "211"
        : _constituencyPrefix.replace(/[^0-9]/g, "") || "0";
    return `${constituencyNum}/${year}/${String(next).padStart(4, "0")}`;
  },
  addLocalJavakEntry: (
    entry: Omit<LocalJavakEntry, "id" | "javakNumber">,
  ): LocalJavakEntry => {
    const javakNumber = storage.getNextJavakNumber(entry.date);
    const full: LocalJavakEntry = {
      ...entry,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      javakNumber,
    };
    const all = storage.getJavakEntries();
    storage.setJavakEntries([...all, full]);
    return full;
  },
  // ── Nodal Officers ────────────────────────────────────────────────────────────────────────────
  getNodalOfficers: (): NodalOfficer[] =>
    getJsonItem<NodalOfficer[]>(KEYS.nodalOfficers, []),
  saveNodalOfficers: (officers: NodalOfficer[]) =>
    localStorage.setItem(KEYS.nodalOfficers, JSON.stringify(officers)),
  getNodalNotices: (): NodalNotice[] =>
    getJsonItem<NodalNotice[]>(KEYS.nodalNotices, []),
  setNodalNotices: (n: NodalNotice[]) =>
    localStorage.setItem(KEYS.nodalNotices, JSON.stringify(n)),
  getAdminSession: (): boolean => {
    const key = _constituencyPrefix
      ? `${_constituencyPrefix}_admin_session`
      : KEYS.adminSession;
    return sessionStorage.getItem(key) === "true";
  },
  setAdminSession: (val: boolean) => {
    const key = _constituencyPrefix
      ? `${_constituencyPrefix}_admin_session`
      : KEYS.adminSession;
    if (val) sessionStorage.setItem(key, "true");
    else sessionStorage.removeItem(key);
  },
  getAdminPassword: (): string =>
    localStorage.getItem(KEYS.adminPassword) || "admin123",
  setAdminPassword: (pwd: string) =>
    localStorage.setItem(KEYS.adminPassword, pwd),
  getAdminSecurityQuestion: (): string =>
    localStorage.getItem("admin_security_question") || "",
  setAdminSecurityQuestion: (q: string) =>
    localStorage.setItem("admin_security_question", q),
  getAdminSecurityAnswer: (): string =>
    localStorage.getItem("admin_security_answer") || "",
  setAdminSecurityAnswer: (a: string) =>
    localStorage.setItem("admin_security_answer", a),
  getOfficerSettings: (): {
    name: string;
    designation: string;
    office: string;
  } => {
    try {
      return (
        JSON.parse(localStorage.getItem(KEYS.officerSettings) || "null") || {
          name: "",
          designation: "",
          office: "",
        }
      );
    } catch {
      return { name: "", designation: "", office: "" };
    }
  },
  setOfficerSettings: (val: {
    name: string;
    designation: string;
    office: string;
  }) => localStorage.setItem(KEYS.officerSettings, JSON.stringify(val)),
  // ── Constituency Card Passwords ───────────────────────────────────────────
  getConstituencyPasswords(): Record<string, string> {
    try {
      return JSON.parse(
        localStorage.getItem("constituency_card_passwords") || "{}",
      );
    } catch {
      return {};
    }
  },
  setConstituencyPasswords(map: Record<string, string>): void {
    localStorage.setItem("constituency_card_passwords", JSON.stringify(map));
  },
  getUnlockedConstituencies(): string[] {
    try {
      return JSON.parse(
        localStorage.getItem("unlocked_constituencies") || "[]",
      );
    } catch {
      return [];
    }
  },
  addUnlockedConstituency(id: string): void {
    const current = this.getUnlockedConstituencies();
    if (!current.includes(id)) {
      localStorage.setItem(
        "unlocked_constituencies",
        JSON.stringify([...current, id]),
      );
    }
  },
  // ── Current Constituency (persisted across refresh) ───────────────────────
  getCurrentConstituencyId(): string | null {
    return localStorage.getItem("current_constituency_id");
  },
  setCurrentConstituencyId(id: string | null): void {
    if (id === null) {
      localStorage.removeItem("current_constituency_id");
    } else {
      localStorage.setItem("current_constituency_id", id);
    }
  },
  // ── Constituency Password History ─────────────────────────────────────────
  getConstituencyPasswordHistory(): Array<{
    constituencyId: string;
    constituencyName: string;
    changedAt: string;
    action: "set" | "changed" | "removed";
  }> {
    try {
      return JSON.parse(
        localStorage.getItem("constituency_password_history") || "[]",
      );
    } catch {
      return [];
    }
  },
  addConstituencyPasswordHistory(entry: {
    constituencyId: string;
    constituencyName: string;
    changedAt: string;
    action: "set" | "changed" | "removed";
  }): void {
    const history = this.getConstituencyPasswordHistory();
    history.unshift(entry);
    if (history.length > 200) history.splice(200);
    localStorage.setItem(
      "constituency_password_history",
      JSON.stringify(history),
    );
  },
};
