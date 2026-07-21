import { supabase } from "./supabase";

const BUCKET = "artifact-photos";

// Turns a room name into a safe folder name — "Collector's Court Common"
// becomes "collectors-court-common", so the Storage bucket's folder
// structure mirrors your physical rooms cleanly.
export function slugifyRoom(room: string): string {
  return (room || "unassigned")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents (é, etc.)
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unassigned";
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:([^;]+);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const ext = mime.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { blob: new Blob([bytes], { type: mime }), ext };
}

// Uploads one photo (as a base64 data URL) to Storage under a room-wise
// folder path, and returns its public URL. If the photo is already a real
// URL (not a data: URL — meaning it's already been uploaded previously),
// it's returned unchanged rather than re-uploaded.
export async function uploadPhotoToStorage(
  photo: string,
  room: string,
  artifactId: string,
  index: number
): Promise<string> {
  if (!photo.startsWith("data:")) {
    return photo; // already a Storage URL from an earlier save — leave as-is
  }

  const { blob, ext } = dataUrlToBlob(photo);
  const folder = slugifyRoom(room);
  const path = `${folder}/${artifactId}_${index}_${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type,
    upsert: true,
    // Photos are re-uploaded under a new timestamped filename whenever they
    // change (see the path above), so a stale long-lived cache is never a
    // correctness problem — only ever a speed/egress win. Without this,
    // Supabase's short default meant every repeat view re-downloaded
    // unchanged photos from Storage, which is exactly what burns through
    // free-tier egress fastest as the collection grows.
    cacheControl: "31536000",
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Uploads every not-yet-uploaded photo in an array (data: URLs) and passes
// through anything that's already a Storage URL untouched. Use this right
// before saving an artifact's `photos` field.
export async function resolvePhotosForStorage(
  photos: string[],
  room: string,
  artifactId: string
): Promise<string[]> {
  const results: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    results.push(await uploadPhotoToStorage(photos[i], room, artifactId, i));
  }
  return results;
}

// Deletes a photo from Storage given its public URL — used when a photo is
// removed from an item or replaced by a re-crop, so orphaned files don't
// quietly pile up in storage.
export async function deletePhotoFromStorage(url: string): Promise<void> {
  if (!url.includes(`/storage/v1/object/public/${BUCKET}/`)) return; // not one of ours (e.g. external link) — leave it alone
  const path = url.split(`/storage/v1/object/public/${BUCKET}/`)[1];
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([decodeURIComponent(path)]);
}
