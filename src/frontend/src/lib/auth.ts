/**
 * Auth state management — session stored in sessionStorage (device memory only, never primary data).
 * Backend is the single source of truth for all user data.
 */
import type { NodalOfficer, Supervisor } from "@/backend";

const ADMIN_KEY = "blo_admin_session";
const SUPER_ADMIN_KEY = "blo_superadmin_session";
const SUPERVISOR_KEY = "blo_supervisor_session";
const NODAL_KEY = "blo_nodal_session";

// ── Admin ─────────────────────────────────────────────────────────────────────

export function isAdminLoggedIn(): boolean {
  return sessionStorage.getItem(ADMIN_KEY) === "true";
}

export function loginAdmin(): void {
  sessionStorage.setItem(ADMIN_KEY, "true");
}

export function logoutAdmin(): void {
  sessionStorage.removeItem(ADMIN_KEY);
}

// ── Super Admin ───────────────────────────────────────────────────────────────

export function isSuperAdminLoggedIn(): boolean {
  return sessionStorage.getItem(SUPER_ADMIN_KEY) === "true";
}

export function loginSuperAdmin(): void {
  sessionStorage.setItem(SUPER_ADMIN_KEY, "true");
}

export function logoutSuperAdmin(): void {
  sessionStorage.removeItem(SUPER_ADMIN_KEY);
}

// ── Supervisor ────────────────────────────────────────────────────────────────

export function getCurrentSupervisor(): Supervisor | null {
  const raw = sessionStorage.getItem(SUPERVISOR_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Supervisor;
  } catch {
    return null;
  }
}

export function loginSupervisor(supervisor: Supervisor): void {
  sessionStorage.setItem(SUPERVISOR_KEY, JSON.stringify(supervisor));
}

export function logoutSupervisor(): void {
  sessionStorage.removeItem(SUPERVISOR_KEY);
}

// ── Nodal Officer ─────────────────────────────────────────────────────────────

export function getCurrentNodalOfficer(): NodalOfficer | null {
  const raw = sessionStorage.getItem(NODAL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NodalOfficer;
  } catch {
    return null;
  }
}

export function loginNodalOfficer(officer: NodalOfficer): void {
  sessionStorage.setItem(NODAL_KEY, JSON.stringify(officer));
}

export function logoutNodalOfficer(): void {
  sessionStorage.removeItem(NODAL_KEY);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true if any privileged session is active. */
export function isAnyLoggedIn(): boolean {
  return (
    isSuperAdminLoggedIn() ||
    isAdminLoggedIn() ||
    getCurrentSupervisor() !== null ||
    getCurrentNodalOfficer() !== null
  );
}

/** Clear all sessions (full logout). */
export function logoutAll(): void {
  logoutSuperAdmin();
  logoutAdmin();
  logoutSupervisor();
  logoutNodalOfficer();
}
