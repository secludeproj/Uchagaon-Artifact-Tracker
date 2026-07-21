// Google Drive integration — lets staff pull photos directly from the Drive
// folder already linked to each room (artifacts.drive_link) instead of
// downloading from Drive and re-uploading to the app one item at a time.
//
// Requires the signed-in Google session to have granted the
// drive.readonly scope (see src/lib/auth.ts signInWithGoogle). If a Drive
// call gets a 401, the access token has expired or was never granted —
// the caller should prompt the user to sign out and back in.

export interface DriveImageFile {
  id: string;
  name: string;
}

export class DriveAuthError extends Error {}

export function extractDriveFolderId(driveLink: string): string | null {
  const match = (driveLink || "").match(/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function driveFetch(url: string, accessToken: string): Promise<Response> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 401) {
    throw new DriveAuthError(
      "Google Drive access has expired or was never granted. Please sign out and sign back in, and approve the Drive permission request."
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Drive API error (${res.status}): ${text}`);
  }
  return res;
}

export async function listImagesInFolder(folderId: string, accessToken: string): Promise<DriveImageFile[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and mimeType contains 'image/' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=500`;
  const res = await driveFetch(url, accessToken);
  const data = await res.json();
  return data.files || [];
}

export async function fetchDriveImageAsDataUrl(fileId: string, accessToken: string): Promise<string> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await driveFetch(url, accessToken);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Best-effort name similarity so a likely match is pre-selected for review —
// Drive filenames are often just camera defaults (IMG_1234.jpg) with no
// relation to the item name, so this is a convenience, not a requirement;
// the review UI always lets staff assign/change photos by hand regardless.
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function nameSimilarity(fileName: string, itemName: string): number {
  const a = normalizeForMatch(fileName);
  const b = normalizeForMatch(itemName);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.75;
  const wordsA = new Set(a.split(" ").filter(Boolean));
  const wordsB = new Set(b.split(" ").filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}
