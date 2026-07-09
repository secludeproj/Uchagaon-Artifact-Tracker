// Real Uchagaon room/space list, structured by block so it can be rendered
// as grouped dropdowns (<optgroup>) and sorted in physical property order
// anywhere it's used — dropdowns, filters, or listings.

export const ROOMS_BY_BLOCK: Record<string, string[]> = {
  "A Block — Main Haveli": [
    "Room 1", "Room 2", "Sun Room", "Tiger Room", "Living Room", "Library",
    "Library Alley", "Tiger Dining Hall", "Bow and Arrow Room", "Office",
    "Room 3", "Room 4", "Room 5", "Room 6", "Pool Table Room", "Room 7",
    "Ground Floor Main Building Outside Sitting", "First Floor Common Area",
    "Machan Common Areas", "Hog n Horse Entrance Room", "Hog n Horse Second Room",
    "Hog n Horse Third Room", "First Floor Dining Hall (Main)", "Risala",
  ],
  "B Block": [
    "Room 9", "Room 10", "Room 11", "Room 14", "Varanda Area",
    "Room 15", "Room 16", "Room 17", "Room 18",
  ],
  "C Block — Collector's Court": [
    "Room 21", "Room 22", "Room 23", "Room 31", "Room 32", "Room 33", "Room 34",
    "Collector's Court Common", "Collector's Court Common 1st Floor",
    "Terrace Sitting Collector's Court", "Pool Sitting", "Diwan Khana",
    "Diwan Khana Common",
  ],
};

// Flat list in the same block-then-room order, kept for any code that just
// needs "every real room" without caring about grouping.
export const REAL_ROOMS: string[] = Object.values(ROOMS_BY_BLOCK).flat();

// Given any location string (real room or a custom-typed one), returns which
// block group it belongs to, or "Other / Custom" if it's not a known room —
// e.g. a freshly custom-typed location that hasn't been added to the master
// list above yet.
export function blockForLocation(location: string): string {
  for (const [block, rooms] of Object.entries(ROOMS_BY_BLOCK)) {
    if (rooms.includes(location)) return block;
  }
  return "Other / Custom";
}
