// Base heritage categories. Users can add their own beyond this list — see
// blockForLocation-style helper below for how custom categories mix in.
export const BASE_CATEGORIES: string[] = [
  "Weaponry & Armor",
  "Artwork & Paintings",
  "Furniture",
  "Textiles & Carpets",
  "Ceramics & Pottery",
  "Metalwork",
  "Religious & Ceremonial",
  "Manuscripts & Books",
  "Jewelry & Ornaments",
  "Other",
];

// Builds the full category list to show in a dropdown: the base categories
// plus any custom categories already used by existing artifacts (so a
// custom category typed in once becomes a normal option from then on,
// the same self-expanding pattern used for locations).
export function buildCategoryList(existingCategories: (string | undefined | null)[]): string[] {
  const set = new Set<string>(BASE_CATEGORIES);
  existingCategories.forEach((c) => {
    if (c) set.add(c);
  });
  return Array.from(set);
}
