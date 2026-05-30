// Deprecated — use src/lib/backendService.ts
// Re-exports types and keeps legacy stubs so old callers don't break.
export type {
  AppointmentOrder,
  BLO,
  ConstituencyConfig,
  NodalOfficer,
  PasswordHistoryEntry,
  PollingStation,
  Supervisor,
} from "../lib/backendService";

// Stubs for removed features — kept as no-ops so importing files don't break
export async function addLocalJavakEntry(_entry: unknown): Promise<boolean> {
  return false;
}
export async function isMigrationDone(
  _constituencyId: string,
): Promise<boolean> {
  return false;
}
export async function setMigrationDone(
  _constituencyId: string,
): Promise<boolean> {
  return false;
}
export async function getDataVersionUpdate(): Promise<bigint> {
  return BigInt(0);
}

// Legacy stubs for SuperAdminPanel — these functions take no actor parameter
// (actor-based versions are in lib/backendService.ts)
export async function setConstituencyEnabled(
  _constituencyId: string,
  _enabled: boolean,
): Promise<boolean> {
  return false;
}

export async function getPasswordHistory(
  _constituencyId: string | null,
): Promise<import("../lib/backendService").PasswordHistoryEntry[]> {
  return [];
}
