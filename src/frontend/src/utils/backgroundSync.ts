/**
 * backgroundSync.ts
 *
 * Silent 10-second background polling using getDataVersionUpdate (update call, not query).
 * IC update calls bypass boundary node HTTP cache — ensuring cross-device sync works.
 *
 * Design principles to avoid flickering:
 * - Uses queryClient.invalidateQueries only when version actually changes
 * - Single interval, never duplicated
 * - Stops when tab is hidden, resumes on focus
 * - No loading state triggered unless data actually changed
 * - User can click tabs freely — no UI blocking
 */

import type { QueryClient } from "@tanstack/react-query";
import { getDataVersionUpdate } from "./backendService";

const POLL_INTERVAL_MS = 10_000; // 10 seconds
const POST_MANUAL_REFRESH_SKIP_MS = 5_000;

let _intervalId: ReturnType<typeof setInterval> | null = null;
let _queryClient: QueryClient | null = null;
let _lastManualRefreshTime = 0;
let _lastKnownVersion: bigint = BigInt(0);
let _isPolling = false;
let _errorCount = 0;

/** Call after any manual data refresh so the next poll is skipped */
export function markManualRefresh(): void {
  _lastManualRefreshTime = Date.now();
}

/** Returns true if the document is visible and user is not typing */
function shouldPoll(): boolean {
  if (document.visibilityState === "hidden") return false;
  if (Date.now() - _lastManualRefreshTime < POST_MANUAL_REFRESH_SKIP_MS)
    return false;
  // Skip state update (but still allow poll) if user is typing
  return true;
}

/** Returns true if focused element is an input — used to skip state updates only */
function userIsTyping(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    (el as HTMLElement).isContentEditable
  );
}

async function doPoll(): Promise<void> {
  if (_isPolling) return;
  if (!shouldPoll()) return;
  if (!_queryClient) return;

  _isPolling = true;
  try {
    // getDataVersionUpdate is an IC update call — bypasses boundary node cache.
    // Returns a monotonically increasing version counter from the backend.
    const version = await getDataVersionUpdate();
    if (version !== _lastKnownVersion) {
      if (_lastKnownVersion !== BigInt(0)) {
        // Version changed — invalidate all React Query caches silently.
        // Only re-renders components that are currently mounted.
        if (!userIsTyping()) {
          _queryClient.invalidateQueries({ queryKey: ["constituencyConfigs"] });
          // Try to get current constituency and invalidate its data queries
          try {
            const { getCurrentConstituency } = await import("./storage");
            const cid = getCurrentConstituency();
            if (cid) {
              _queryClient.invalidateQueries({
                queryKey: ["pollingStations", cid],
              });
              _queryClient.invalidateQueries({ queryKey: ["activeBLOs", cid] });
              _queryClient.invalidateQueries({
                queryKey: ["appointmentOrders", cid],
              });
              _queryClient.invalidateQueries({
                queryKey: ["supervisors", cid],
              });
              _queryClient.invalidateQueries({
                queryKey: ["nodalOfficers", cid],
              });
              _queryClient.invalidateQueries({ queryKey: ["notices", cid] });
              _queryClient.invalidateQueries({
                queryKey: ["gpsLocations", cid],
              });
              _queryClient.invalidateQueries({
                queryKey: ["dashboardStats", cid],
              });
            }
          } catch {
            // ignore circular dep errors
          }
        }
      }
      _lastKnownVersion = version;
    }
    _errorCount = 0;
  } catch {
    _errorCount++;
    if (_errorCount >= 5) {
      stopPolling();
    }
  } finally {
    _isPolling = false;
  }
}

function handleVisibilityChange(): void {
  if (document.visibilityState === "visible") {
    // Tab became visible — run one immediate poll then resume interval
    doPoll();
    startPolling(_queryClient!);
  } else {
    // Tab hidden — stop interval to save resources
    stopPolling();
  }
}

export function startPolling(queryClient: QueryClient): void {
  _queryClient = queryClient;

  // Clear any existing interval before starting a new one
  if (_intervalId !== null) {
    clearInterval(_intervalId);
    _intervalId = null;
  }

  // Only start if tab is visible
  if (document.visibilityState === "hidden") return;

  _intervalId = setInterval(() => {
    doPoll();
  }, POLL_INTERVAL_MS);
}

export function stopPolling(): void {
  if (_intervalId !== null) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

/**
 * Initialize background sync.
 * Call once from App.tsx after QueryClient is available.
 * Manages its own lifecycle (visibility changes, cleanup).
 */
export function initBackgroundSync(queryClient: QueryClient): () => void {
  _queryClient = queryClient;
  // Reset state on init
  _lastKnownVersion = BigInt(0);
  _errorCount = 0;

  // Start polling if visible
  startPolling(queryClient);

  // Listen for tab visibility changes
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // Return cleanup function
  return () => {
    stopPolling();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    _queryClient = null;
  };
}
