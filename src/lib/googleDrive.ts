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

export class DriveFolderNotAccessibleError extends Error {}

// Confirms the signed-in account can actually see this folder before
// listing its contents. This matters because Drive's files.list with a
// "'<id>' in parents" query returns an empty array — not a 403 — for a
// folder the account has no access to, which is indistinguishable from a
// genuinely empty folder unless checked separately like this.
async function assertFolderAccessible(folderId: string, accessToken: string): Promise<void> {
  // supportsAllDrives is required or Drive silently 404s a folder that's
  // actually a shared folder living inside someone else's Shared Drive —
  // visible and browsable in the Drive UI, invisible to a plain API call.
  const url = `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,trashed&supportsAllDrives=true`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 401) {
    throw new DriveAuthError(
      "Google Drive access has expired or was never granted. Please sign out and sign back in, and approve the Drive permission request."
    );
  }
  if (res.status === 404 || res.status === 403) {
    throw new DriveFolderNotAccessibleError(
      "This Drive folder isn't shared with your Google account (or was moved/deleted) — that's why it shows no photos. Ask whoever owns it to share the folder with your account, then try again."
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Drive API error (${res.status}): ${text}`);
  }
  const data = await res.json();
  if (data.trashed) {
    throw new DriveFolderNotAccessibleError("This Drive folder has been moved to trash — that's why it shows no photos.");
  }
}

export async function listImagesInFolder(folderId: string, accessToken: string): Promise<DriveImageFile[]> {
  await assertFolderAccessible(folderId, accessToken);
  const q = encodeURIComponent(`'${folderId}' in parents and mimeType contains 'image/' and trashed = false`);
  const url =
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=500` +
    `&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await driveFetch(url, accessToken);
  const data = await res.json();
  return data.files || [];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Camera-original Drive photos can be several MB each — multiple times
// larger than the ~150-200KB photos the app's own crop tool produces.
// Every extra byte stored gets re-served (and re-metered against Supabase's
// free-tier egress) on every future view, so downscale before it ever
// reaches Storage. 1600px on the longer side keeps items clearly
// identifiable while cutting typical file size by 80%+.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

async function downscaleDataUrl(dataUrl: string): Promise<string> {
  const img = new Image();
  const loaded = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not decode image for resizing"));
  });
  img.src = dataUrl;
  await loaded;

  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl; // fall back to the original rather than fail the import
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export async function fetchDriveImageAsDataUrl(fileId: string, accessToken: string): Promise<string> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`;
  const res = await driveFetch(url, accessToken);
  const blob = await res.blob();
  const dataUrl = await blobToDataUrl(blob);
  try {
    return await downscaleDataUrl(dataUrl);
  } catch (err) {
    console.warn("Downscale failed, using original image:", err);
    return dataUrl;
  }
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
