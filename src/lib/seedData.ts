// ============================================================
// seedData.ts — Sample artifacts for testing
// Run once from browser console: import { seedTestData } from './lib/seedData'
// ============================================================

import { supabase } from './supabase';

export const TEST_ARTIFACTS = [
  {
    name: "Maharana Pratap's Battle Sword",
    category: "Weaponry & Armor",
    description: "A ceremonial sword believed to have been used during the Battle of Haldighati, 1576. Intricately engraved hilt with gold inlay depicting the royal Mewar sun emblem.",
    estimated_age: "16th Century (circa 1570)",
    material: "Damascus Steel, Gold, Ivory",
    dimensions: "110 cm length, 2.3 kg",
    condition: "Good",
    estimated_value: 4500000,
    original_location: "Durbar Hall East Wall",
    current_location: "Durbar Hall East Wall",
    status: "On Display",
    photos: ["https://images.unsplash.com/photo-1608734265656-f035d3e7bcbf?auto=format&fit=crop&q=80&w=600"],
    handling_notes: "Handle with cotton gloves only. No direct sunlight exposure. Humidity must remain below 45%.",
    conservation_notes: "Minor rust patina on blade edge treated with conservation wax in 2023.",
    last_inspected_date: "2026-01-15",
    story: "This sword witnessed one of the most valiant stands in Rajput history. The Maharana carried it into battle against the Mughal forces, and legend says it never touched the ground in defeat.",
    added_by: "Kamaljyot Singh",
    added_by_email: "kamaljyotsingh978@gmail.com",
    last_updated_by: "Kamaljyot Singh",
    last_updated_by_email: "kamaljyotsingh978@gmail.com",
  },
  {
    name: "Royal Durbar Carpet — Mughal Floral",
    category: "Textiles & Carpets",
    description: "An extraordinary hand-knotted carpet from the Mughal imperial workshops. Features intricate floral medallion design with 380 knots per square inch. Original deep crimson and ivory tones preserved.",
    estimated_age: "Early 17th Century",
    material: "Silk warp, Pashmina wool pile, natural dyes",
    dimensions: "8.2m × 4.6m",
    condition: "Fair",
    estimated_value: 12000000,
    original_location: "Durbar Hall West Wall",
    current_location: "Palace Conservation Laboratory",
    status: "Under Maintenance",
    photos: ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=600"],
    handling_notes: "Requires minimum 4 trained conservators to move. Roll only — never fold. Store in acid-free tubes.",
    conservation_notes: "Currently undergoing moth damage repair and colour stabilisation treatment.",
    last_inspected_date: "2025-11-20",
    story: "Commissioned by Emperor Jahangir for the coronation celebrations, this carpet has graced the floors of three royal courts across four centuries.",
    added_by: "Kamaljyot Singh",
    added_by_email: "kamaljyotsingh978@gmail.com",
    last_updated_by: "Kamaljyot Singh",
    last_updated_by_email: "kamaljyotsingh978@gmail.com",
  },
  {
    name: "Mewar School Miniature — Krishna Rasleela",
    category: "Artwork & Paintings",
    description: "Exquisite miniature painting from the Mewar School depicting the divine Rasleela of Krishna with the Gopis. Gold leaf accents, ultramarine lapis lazuli background. Signed by court painter Sahibdin.",
    estimated_age: "17th Century (circa 1640)",
    material: "Natural pigments on wasli paper, gold leaf",
    dimensions: "32cm × 24cm",
    condition: "Mint",
    estimated_value: 8500000,
    original_location: "North Gallery Walkway",
    current_location: "North Gallery Walkway",
    status: "On Display",
    photos: ["https://images.unsplash.com/photo-1578321272176-b7bbc0679853?auto=format&fit=crop&q=80&w=600"],
    handling_notes: "UV-filtered display case mandatory. Temperature 18-20°C, humidity 45-50% RH. White cotton gloves, no direct handling without conservator present.",
    conservation_notes: "Condition excellent. Gold leaf fully intact. Minimal foxing at lower margin treated.",
    last_inspected_date: "2026-03-10",
    story: "Painted during the reign of Maharana Jagat Singh I, this is one of only three authenticated Sahibdin works in private custody. The artist's hallmark lotus seal is visible in the lower right corner.",
    added_by: "Kamaljyot Singh",
    added_by_email: "kamaljyotsingh978@gmail.com",
    last_updated_by: "Kamaljyot Singh",
    last_updated_by_email: "kamaljyotsingh978@gmail.com",
  },
  {
    name: "Silver Puja Thali — Royal Prayer Set",
    category: "Religious & Ceremonial",
    description: "Complete royal puja ceremonial set comprising a large thali, five katoris, diya stand, and incense holder. Embossed with lotus motifs and inscribed with Sanskrit shlokas from the Vishnu Purana.",
    estimated_age: "18th Century",
    material: "Pure silver (925), handcrafted",
    dimensions: "Thali: 45cm diameter, Set weight: 3.8kg",
    condition: "Good",
    estimated_value: 950000,
    original_location: "West Wing Vault",
    current_location: "Lobby Lounge Area B",
    status: "On Display",
    photos: ["https://images.unsplash.com/photo-1602513580083-8d0f9d7d3d7e?auto=format&fit=crop&q=80&w=600"],
    handling_notes: "Polish only with non-abrasive silver cloth. Avoid exposure to sulphur compounds. Keep dry.",
    conservation_notes: "Minor tarnish on diya stand cleaned and treated with anti-tarnish lacquer.",
    last_inspected_date: "2025-09-05",
    story: "Used in the daily morning prayers of the royal family for over 200 years. The set was presented to the palace by the Nathdwara Temple priests as a coronation gift.",
    added_by: "Kamaljyot Singh",
    added_by_email: "kamaljyotsingh978@gmail.com",
    last_updated_by: "Kamaljyot Singh",
    last_updated_by_email: "kamaljyotsingh978@gmail.com",
  },
  {
    name: "Ivory Carved Elephant Procession",
    category: "Other",
    description: "A remarkable carved ivory tableau depicting a royal elephant procession with mahout, howdah and attending soldiers. Contains 23 individual figures carved from a single tusk section.",
    estimated_age: "Late 19th Century (1880s)",
    material: "Elephant ivory (pre-Convention, documented provenance)",
    dimensions: "62cm × 18cm × 24cm",
    condition: "Good",
    estimated_value: 2200000,
    original_location: "Main Lobby Display Panel A",
    current_location: "Main Lobby Display Panel A",
    status: "On Display",
    photos: ["https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?auto=format&fit=crop&q=80&w=600"],
    handling_notes: "Climate controlled display essential. Never expose to direct sunlight — ivory yellows and cracks. Humidity 45-55% RH.",
    conservation_notes: "Full CITES documentation on file. Legal provenance certificate dated 1987 archived.",
    last_inspected_date: "2026-02-28",
    story: "Commissioned to celebrate the visit of the Viceroy of India to Udaipur in 1887. The central howdah figure is modelled after Maharana Sajjan Singh himself.",
    added_by: "Kamaljyot Singh",
    added_by_email: "kamaljyotsingh978@gmail.com",
    last_updated_by: "Kamaljyot Singh",
    last_updated_by_email: "kamaljyotsingh978@gmail.com",
  },
  {
    name: "Jade Inlaid Bidriware Hookah Base",
    category: "Metalwork",
    description: "Exceptional Bidar-style hookah base with jade and mother-of-pearl inlay on blackened zinc-alloy. Features intricate arabesque patterns and calligraphic panels. One of the finest examples of Bidriware in existence.",
    estimated_age: "18th Century (circa 1750)",
    material: "Bidri alloy (zinc, copper), jade, mother-of-pearl, silver wire",
    dimensions: "38cm height, 22cm diameter",
    condition: "Mint",
    estimated_value: 3800000,
    original_location: "Zen Garden Pavillion",
    current_location: "Zen Garden Pavillion",
    status: "On Display",
    photos: ["https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=600"],
    handling_notes: "Extremely fragile jade inlay. Handle with extreme care. Do not immerse in water. Dust with soft camel hair brush only.",
    conservation_notes: "Condition pristine. No restoration required. Original surface patina intact.",
    last_inspected_date: "2026-04-01",
    story: "A diplomatic gift from the Nizam of Hyderabad to the Maharana of Mewar, sealing a peace treaty in 1754. The calligraphic panels contain verses from the Quran and Sanskrit shlokas side by side — a symbol of unity.",
    added_by: "Kamaljyot Singh",
    added_by_email: "kamaljyotsingh978@gmail.com",
    last_updated_by: "Kamaljyot Singh",
    last_updated_by_email: "kamaljyotsingh978@gmail.com",
  },
];

export async function seedTestData() {
  console.log("Seeding test artifacts...");
  const { data, error } = await supabase
    .from("artifacts")
    .insert(TEST_ARTIFACTS)
    .select();

  if (error) {
    console.error("Seed error:", error);
    return { success: false, error };
  }

  console.log(`Successfully seeded ${data.length} artifacts`);
  return { success: true, count: data.length };
}
