import type { NodalOfficer as StorageNodalOfficer } from "./nodalStorage";
import { nodalStorage } from "./nodalStorage";
import { getCurrentConstituency } from "./storage";

// Extended NodalOfficer with bank details for honorarium
// Uses the localStorage-based NodalOfficer shape (which has appointmentDate, office, etc.)
export interface NodalOfficerWithBank extends StorageNodalOfficer {
  bankName?: string;
  bankBranch?: string;
  accountNo?: string;
  ifsc?: string;
}

export interface NodalHonorariumConfig {
  amountPerQuarter: number;
}

export interface NodalHonorariumQuarterly {
  id: string;
  nodalId: string;
  quarterLabel: string;
  quarterStart: string;
  quarterEnd: string;
  amount: number;
  paid: boolean;
  paidDate?: string;
  paidByGrant?: boolean;
}

export interface NodalHonorariumExtra {
  id: string;
  nodalId: string;
  amount: number;
  reason: string;
  date: string;
  paid: boolean;
  paidDate?: string;
}

export interface NodalHonorariumDateChange {
  id: string;
  nodalId: string;
  nodalName: string;
  oldDate: string;
  newDate: string;
  changedAt: string;
  quartersDifference: number;
  amountDifference: number;
}

function prefix(): string {
  return getCurrentConstituency();
}

function key(suffix: string): string {
  return `${prefix()}_nodal_honorarium_${suffix}`;
}

function getJson<T>(storageKey: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setJson<T>(storageKey: string, val: T): void {
  localStorage.setItem(storageKey, JSON.stringify(val));
}

export const nodalHonorariumStorage = {
  // Config
  getConfig(): NodalHonorariumConfig {
    return getJson<NodalHonorariumConfig>(key("config"), {
      amountPerQuarter: 500,
    });
  },
  setConfig(c: NodalHonorariumConfig): void {
    setJson(key("config"), c);
  },

  // Quarterly payments
  getQuarterly(): NodalHonorariumQuarterly[] {
    return getJson<NodalHonorariumQuarterly[]>(key("quarterly"), []);
  },
  setQuarterly(p: NodalHonorariumQuarterly[]): void {
    setJson(key("quarterly"), p);
  },

  // Extra payments
  getExtras(): NodalHonorariumExtra[] {
    return getJson<NodalHonorariumExtra[]>(key("extras"), []);
  },
  setExtras(p: NodalHonorariumExtra[]): void {
    setJson(key("extras"), p);
  },

  // Date change log
  getDateChanges(): NodalHonorariumDateChange[] {
    return getJson<NodalHonorariumDateChange[]>(key("date_changes"), []);
  },
  setDateChanges(c: NodalHonorariumDateChange[]): void {
    setJson(key("date_changes"), c);
  },

  // Get nodal officers (with bank details) from nodalStorage
  getNodalOfficers(): NodalOfficerWithBank[] {
    const officers = nodalStorage.getNodalOfficers();
    // Bank details stored separately
    const bankMap = getJson<
      Record<
        string,
        {
          bankName?: string;
          bankBranch?: string;
          accountNo?: string;
          ifsc?: string;
        }
      >
    >(key("bank_details"), {});
    return officers.map((o) => ({
      ...o,
      bankName: bankMap[o.id]?.bankName || "",
      bankBranch: bankMap[o.id]?.bankBranch || "",
      accountNo: bankMap[o.id]?.accountNo || "",
      ifsc: bankMap[o.id]?.ifsc || "",
    }));
  },

  // Save bank details for a nodal officer
  saveBankDetails(
    nodalId: string,
    details: {
      bankName: string;
      bankBranch: string;
      accountNo: string;
      ifsc: string;
    },
  ): void {
    const bankMap = getJson<
      Record<
        string,
        {
          bankName?: string;
          bankBranch?: string;
          accountNo?: string;
          ifsc?: string;
        }
      >
    >(key("bank_details"), {});
    bankMap[nodalId] = details;
    setJson(key("bank_details"), bankMap);
  },
};
