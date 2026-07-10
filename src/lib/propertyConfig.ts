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
