import JSZip from "jszip";
import type { Artifact } from "../types";

// Draws a caption bar onto a copy of the source image and returns it as a JPEG blob.
async function captionPhoto(imageSrc: string, lines: string[]): Promise<Blob> {
  const img = document.createElement("img");
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || 800;
  canvas.height = img.naturalHeight || 600;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Caption bar at the bottom, sized to fit the number of lines
  const lineHeight = Math.max(18, Math.round(canvas.width * 0.028));
  const barHeight = lineHeight * lines.length + 20;
  ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
  ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

  ctx.fillStyle = "#ffffff";
  ctx.font = `${lineHeight - 4}px sans-serif`;
  ctx.textBaseline = "top";
  lines.forEach((line, i) => {
    // Truncate with an ellipsis if a line is too wide for the image
    let text = line;
    const maxWidth = canvas.width - 20;
    while (ctx.measureText(text).width > maxWidth && text.length > 3) {
      text = text.slice(0, -2);
    }
    if (text !== line) text = text.slice(0, -1) + "…";
    ctx.fillText(text, 10, canvas.height - barHeight + 10 + i * lineHeight);
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create image blob"))),
      "image/jpeg",
      0.9
    );
  });
}

// Determines whether a stored "photo" value is something we can actually turn
// into image bytes (a data URI, or a direct link to an image file/response),
// as opposed to e.g. a Google Drive folder link, which just points at a page.
async function resolvePhotoSource(photo: string): Promise<string | null> {
  if (photo.startsWith("data:image")) return photo;

  if (photo.startsWith("http")) {
    try {
      const res = await fetch(photo);
      if (!res.ok) return null;
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) return null;
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }

  return null;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim().slice(0, 80) || "untitled";
}

export interface PhotoExportResult {
  zipBlob: Blob;
  exportedCount: number;
  skippedCount: number;
}

// Builds a zip file: one folder per room, each containing that room's
// item photos with an info caption burned into the image, plus a
// manifest.txt listing anything that couldn't be exported and why
// (most commonly: the artifact's "photo" is a Google Drive folder link,
// not a direct image — those need exporting manually from Drive).
export async function exportPhotoAlbumsByRoom(
  artifacts: Artifact[],
  onProgress?: (done: number, total: number) => void
): Promise<PhotoExportResult> {
  const zip = new JSZip();
  const skippedLines: string[] = [];
  let exportedCount = 0;
  let skippedCount = 0;

  const totalPhotos = artifacts.reduce((sum, a) => sum + (a.photos?.length || 0), 0);
  let done = 0;

  for (const artifact of artifacts) {
    const room = artifact.currentLocation || "Unassigned";
    const folder = zip.folder(sanitizeFilename(room));
    const photos = artifact.photos || [];

    if (photos.length === 0) {
      skippedLines.push(`${artifact.id} | ${artifact.name} | ${room} | No photo on file`);
      skippedCount++;
      continue;
    }

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const resolved = await resolvePhotoSource(photo);

      if (!resolved) {
        skippedLines.push(
          `${artifact.id} | ${artifact.name} | ${room} | Photo ${i + 1}: not a direct image (likely a Drive folder/page link) — export manually from Drive`
        );
        skippedCount++;
        done++;
        onProgress?.(done, totalPhotos);
        continue;
      }

      try {
        const captionLines = [
          artifact.name,
          `${artifact.id}  •  ${room}`,
          `${artifact.category}${artifact.condition ? "  •  " + artifact.condition : ""}`,
        ];
        const blob = await captionPhoto(resolved, captionLines);
        const suffix = photos.length > 1 ? `_${i + 1}` : "";
        const filename = `${sanitizeFilename(artifact.name)} (${artifact.id})${suffix}.jpg`;
        folder?.file(filename, blob);
        exportedCount++;
      } catch (err) {
        skippedLines.push(
          `${artifact.id} | ${artifact.name} | ${room} | Photo ${i + 1}: failed to process (${(err as Error).message})`
        );
        skippedCount++;
      } finally {
        if (resolved.startsWith("blob:")) URL.revokeObjectURL(resolved);
        done++;
        onProgress?.(done, totalPhotos);
      }
    }
  }

  const manifest = [
    "SECLUDE HERITAGE — PHOTO EXPORT MANIFEST",
    `Exported: ${exportedCount} photo(s)`,
    `Skipped: ${skippedCount} photo(s)`,
    "",
    "Items/photos NOT included in this export, and why:",
    ...(skippedLines.length ? skippedLines : ["(none — everything exported cleanly)"]),
  ].join("\n");
  zip.file("manifest.txt", manifest);

  const zipBlob = await zip.generateAsync({ type: "blob" });
  return { zipBlob, exportedCount, skippedCount };
}
