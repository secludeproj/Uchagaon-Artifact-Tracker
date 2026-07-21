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

// Case/whitespace-insensitive matching for room names — "SUN Room",
// "sun room", and "Sun Room " are all the same physical room. Without this,
// two nearly-identical strings silently create separate room groups instead
// of landing together (this bit us before in By Location; the same bug
// pattern applies everywhere a location string gets grouped or matched).
function normalizeRoomName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

const NORMALIZED_ROOM_MAP: Map<string, string> = new Map(
  REAL_ROOMS.map((r) => [normalizeRoomName(r), r])
);

// Longest-name-first so a prefix match always picks the most specific real
// room — e.g. against "Room 3" and "Room 31", "room 31 window seat" must
// match "Room 31", not incorrectly match "Room 3" first.
const REAL_ROOMS_BY_LENGTH_DESC = [...REAL_ROOMS].sort((a, b) => b.length - a.length);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// One compiled boundary-prefix regex per real room, built once — matches if
// the normalized location starts with this room's name followed by anything
// that ISN'T a letter or digit (space, apostrophe, parenthesis, comma, or
// end of string all count as a boundary). That's what lets "Room 5's
// BEDROOM" and "Room 17's (hall)" match "Room 5"/"Room 17" — a plain
// "must be followed by a space" check missed the possessive "'s" case —
// while still correctly refusing to let "Room 1" swallow "Room 10", or
// "Room 3" swallow "Room 31"/"Room 32"/etc., since a digit right after
// isn't a valid boundary.
const ROOM_PREFIX_PATTERNS: { room: string; pattern: RegExp }[] = REAL_ROOMS_BY_LENGTH_DESC.map((room) => ({
  room,
  pattern: new RegExp(`^${escapeRegExp(normalizeRoomName(room))}(?![a-z0-9])`),
}));

// Given any raw location string, returns the canonical REAL_ROOMS spelling
// if it matches one, otherwise returns the trimmed input unchanged (e.g. a
// genuinely custom-typed location). Two passes:
//  1. Exact match, case/whitespace-insensitive ("SUN Room" -> "Sun Room").
//  2. Prefix match on a word boundary — a real room name can be followed by
//     extra descriptive text someone added to tell sub-areas apart at a
//     glance ("Room 3 Main Room", "ROOM 4   BEDROOM", "Room 5's BEDROOM"),
//     but it's still physically the same room, so it should group as one.
export function canonicalizeRoomName(location: string): string {
  const raw = (location || "").trim();
  if (!raw) return raw;
  const normalized = normalizeRoomName(raw);

  const exact = NORMALIZED_ROOM_MAP.get(normalized);
  if (exact) return exact;

  for (const { room, pattern } of ROOM_PREFIX_PATTERNS) {
    if (pattern.test(normalized)) return room;
  }

  return raw;
}

// Given any location string (real room or a custom-typed one), returns which
// block group it belongs to, or "Other / Custom" if it's not a known room —
// e.g. a freshly custom-typed location that hasn't been added to the master
// list above yet.
export function blockForLocation(location: string): string {
  const canonical = canonicalizeRoomName(location);
  for (const [block, rooms] of Object.entries(ROOMS_BY_BLOCK)) {
    if (rooms.includes(canonical)) return block;
  }
  return "Other / Custom";
}

// Groups any list of location-bearing records by block, then by room within
// the block, in the same physical order as ROOMS_BY_BLOCK — so UIs (QR label
// printing, checklists, etc.) can be worked through room-by-room instead of
// arbitrary insertion order. Rooms not in the master list are appended at
// the end, grouped by their own (canonicalized) name. Case/whitespace
// variants of the same room name are merged into one group.
export function groupByRoom<T extends { currentLocation: string }>(
  records: T[]
): { block: string; room: string; items: T[] }[] {
  const byRoom = new Map<string, T[]>();
  for (const item of records) {
    const room = canonicalizeRoomName(item.currentLocation) || "Unassigned";
    if (!byRoom.has(room)) byRoom.set(room, []);
    byRoom.get(room)!.push(item);
  }

  const groups: { block: string; room: string; items: T[] }[] = [];
  for (const [block, rooms] of Object.entries(ROOMS_BY_BLOCK)) {
    for (const room of rooms) {
      if (byRoom.has(room)) {
        groups.push({ block, room, items: byRoom.get(room)! });
        byRoom.delete(room);
      }
    }
  }
  for (const [room, items] of byRoom.entries()) {
    groups.push({ block: blockForLocation(room), room, items });
  }
  return groups;
}

// Case/whitespace-insensitive equality for two location strings — use this
// instead of `a === b` wherever "same room" needs checking (e.g. "has this
// item been returned to its original spot"), since the same physical room
// can be typed with different casing depending on when/how it was entered.
export function sameRoom(a: string, b: string): boolean {
  return normalizeRoomName(canonicalizeRoomName(a)) === normalizeRoomName(canonicalizeRoomName(b));
}
