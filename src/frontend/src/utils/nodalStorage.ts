import { getCurrentConstituency } from "./storage";

export interface NodalOfficer {
  id: string;
  name: string;
  designation: string;
  office: string;
  whatsappNumber: string;
  appointmentOrderNumber: string;
  appointmentDate: string;
  appointmentAuthority: string;
  notes: string;
  assignedSupervisorIds: string[];
  createdAt: string;
  // Bank details for honorarium
  bankName?: string;
  bankBranch?: string;
  accountNo?: string;
  ifsc?: string;
}

export interface NodalLoginEntry {
  id: string;
  nodalId: string;
  nodalName: string;
  loginTime: string;
  logoutTime?: string;
}

function getPrefix(prefix?: string): string {
  return prefix ?? getCurrentConstituency();
}

function getKey(prefix?: string): string {
  return `${getPrefix(prefix)}_nodal_officers`;
}

function getLoginHistoryKey(prefix?: string): string {
  return `${getPrefix(prefix)}_nodal_login_history`;
}

export const nodalStorage = {
  getNodalOfficers(prefix?: string): NodalOfficer[] {
    try {
      const raw = localStorage.getItem(getKey(prefix));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
  saveNodalOfficers(list: NodalOfficer[], prefix?: string): void {
    localStorage.setItem(getKey(prefix), JSON.stringify(list));
    window.dispatchEvent(new Event("blo-data-updated"));
  },
  getNodalLoginHistory(prefix?: string): NodalLoginEntry[] {
    try {
      const raw = localStorage.getItem(getLoginHistoryKey(prefix));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
  addNodalLoginEntry(
    nodalId: string,
    nodalName: string,
    prefix?: string,
  ): string {
    const history = nodalStorage.getNodalLoginHistory(prefix);
    const id = Date.now().toString();
    history.unshift({
      id,
      nodalId,
      nodalName,
      loginTime: new Date().toISOString(),
    });
    if (history.length > 300) history.splice(300);
    localStorage.setItem(getLoginHistoryKey(prefix), JSON.stringify(history));
    return id;
  },
  updateNodalLogoutEntry(entryId: string, prefix?: string): void {
    const history = nodalStorage.getNodalLoginHistory(prefix);
    const entry = history.find((h) => h.id === entryId);
    if (entry) {
      entry.logoutTime = new Date().toISOString();
      localStorage.setItem(getLoginHistoryKey(prefix), JSON.stringify(history));
    }
  },

  setNodalSession(nodalId: string | null): void {
    if (nodalId) {
      sessionStorage.setItem("nodalSession_id", nodalId);
    } else {
      sessionStorage.removeItem("nodalSession_id");
      sessionStorage.removeItem("nodalSession_loginEntryId");
    }
  },

  getNodalSession(): string | null {
    return sessionStorage.getItem("nodalSession_id");
  },
};
