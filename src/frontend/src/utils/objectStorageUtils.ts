/**
 * Object storage utilities for official documents.
 * Files are stored as base64 data URLs keyed by a generated fileKey.
 * The fileKey is stored in the backend OfficialDocumentMeta.fileKey.
 * Actual binary content is stored in sessionStorage/indexedDB for the session
 * and retrieved via the fileKey when viewing/downloading.
 *
 * Since the Caffeine platform's object-storage extension is not yet wired
 * for this project, we use the backend metadata store combined with an
 * in-memory/session file cache keyed by fileKey.
 */

const FILE_CACHE_PREFIX = "official_doc_file_";

/**
 * Upload a File: reads it as base64, stores in sessionStorage keyed by fileKey,
 * and returns the fileKey for saving in backend metadata.
 */
export async function uploadFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileKey = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) {
        reject(new Error("फाइल वाचताना त्रुटी आली"));
        return;
      }
      try {
        // Store in sessionStorage for this session
        sessionStorage.setItem(`${FILE_CACHE_PREFIX}${fileKey}`, dataUrl);
      } catch {
        // sessionStorage might be full; we'll still have the key
        // The caller should handle viewing failures gracefully
      }
      resolve(fileKey);
    };
    reader.onerror = () => reject(new Error("फाइल वाचताना त्रुटी आली"));
    reader.readAsDataURL(file);
  });
}

/**
 * Get file data URL from fileKey (from session cache).
 * Returns null if not available (session expired or storage cleared).
 */
export function getFileDataUrl(fileKey: string): string | null {
  try {
    return sessionStorage.getItem(`${FILE_CACHE_PREFIX}${fileKey}`);
  } catch {
    return null;
  }
}

/**
 * Store a data URL with a given fileKey (used when loading existing docs).
 */
export function storeFileDataUrl(fileKey: string, dataUrl: string): void {
  try {
    sessionStorage.setItem(`${FILE_CACHE_PREFIX}${fileKey}`, dataUrl);
  } catch {
    // ignore if storage is full
  }
}

/**
 * Remove a file from session cache.
 */
export function removeFileFromCache(fileKey: string): void {
  try {
    sessionStorage.removeItem(`${FILE_CACHE_PREFIX}${fileKey}`);
  } catch {
    // ignore
  }
}

/**
 * Convert a base64 data URL to a Blob URL for viewing/printing.
 * Returns null if the data URL is not available.
 */
export function dataUrlToBlobUrl(dataUrl: string): string | null {
  try {
    const parts = dataUrl.split(",");
    const base64 = parts[1];
    if (!base64) return null;
    const byteString = atob(base64);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      bytes[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/pdf" });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/**
 * Format file size in human-readable form.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
