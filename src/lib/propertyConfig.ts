// Central place for property identity and lease dates so they're consistent
// everywhere they're mentioned across the app (header, reports, certificates).

export const PROPERTY_NAME = "Seclude Fort Uchagaon";

// Update this once, on the actual lease start date — every screen that shows
// "Lease Start" reads from here.
export const LEASE_START_DATE = "2025-04-01"; // YYYY-MM-DD

export function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function daysSinceLeaseStart(): number {
  const start = new Date(LEASE_START_DATE);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

// The public, unauthenticated QR-scan URL for an artifact's guest story
// card. Shared by every place that generates or prints a guest-story QR
// (ItemDetailView's single-item placard, the Guest Story QR Hub) so the
// URL format only has to be right in one place.
export function getPublicStoryUrl(item: { id: string; qrCode?: string }): string {
  if (item.qrCode && (item.qrCode.startsWith("http://") || item.qrCode.startsWith("https://"))) {
    return item.qrCode;
  }
  return `${window.location.origin}/?storyId=${item.id}`;
}
