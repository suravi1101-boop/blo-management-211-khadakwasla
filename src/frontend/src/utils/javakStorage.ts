import { addLocalJavakEntry as backendAddJavakEntry } from "./backendService";
import { getCurrentConstituency } from "./storage";

export type JavakDocType =
  | "blo_notice"
  | "supervisor_notice"
  | "blo_order"
  | "supervisor_order"
  | "nodal_order"
  | "letter"
  | "other";

export const DOC_TYPE_LABELS: Record<JavakDocType, string> = {
  blo_notice: "BLO नोटीस",
  supervisor_notice: "पर्यवेक्षक नोटीस",
  blo_order: "BLO नियुक्ती आदेश",
  supervisor_order: "पर्यवेक्षक नियुक्ती आदेश",
  nodal_order: "नोडल अधिकारी आदेश",
  letter: "पत्र",
  other: "इतर",
};

export interface JavakEntry {
  id: string;
  javakNumber: string;
  date: string;
  docType: JavakDocType;
  subject: string;
  recipientName: string;
  recipientDesignation: string;
  partNumber?: string;
  createdBy: string;
  createdByRole: "admin" | "supervisor" | "nodal";
  remarks: string;
}

function getKey(): string {
  return `${getCurrentConstituency()}_javak_register`;
}

function getCounterKey(): string {
  return `${getCurrentConstituency()}_javak_counter`;
}

export const javakStorage = {
  async getEntriesFromBackend(): Promise<JavakEntry[]> {
    return javakStorage.getEntries();
  },
  getEntries(): JavakEntry[] {
    try {
      const raw = localStorage.getItem(getKey());
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
  saveEntries(entries: JavakEntry[]): void {
    localStorage.setItem(getKey(), JSON.stringify(entries));
  },
  generateNextNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const nextYear = year + 1;
    const yearLabel = `${year}-${nextYear}`;
    const counterRaw = localStorage.getItem(getCounterKey());
    let counter: { yearLabel: string; seq: number } = { yearLabel, seq: 0 };
    try {
      if (counterRaw) counter = JSON.parse(counterRaw);
    } catch {
      /* ignore */
    }
    if (counter.yearLabel !== yearLabel) {
      counter = { yearLabel, seq: 0 };
    }
    counter.seq += 1;
    localStorage.setItem(getCounterKey(), JSON.stringify(counter));
    const seq = counter.seq.toString().padStart(3, "0");
    return `${yearLabel}/${seq}`;
  },
  addEntry(entry: Omit<JavakEntry, "id" | "javakNumber">): JavakEntry {
    const entries = javakStorage.getEntries();
    const newEntry: JavakEntry = {
      ...entry,
      id: Date.now().toString(),
      javakNumber: javakStorage.generateNextNumber(),
    };
    entries.unshift(newEntry);
    javakStorage.saveEntries(entries);
    // Sync to backend (fire and forget — localStorage is source of truth for UI)
    const constituencyId = getCurrentConstituency();
    if (constituencyId) {
      backendAddJavakEntry(newEntry).catch(() => {});
    }
    return newEntry;
  },
};
