import type { ExpenseCategory } from "./types";

export const CATEGORIES: { id: ExpenseCategory; emoji: string; label: string }[] = [
  { id: "food", emoji: "🍕", label: "Food" },
  { id: "travel", emoji: "🚕", label: "Travel" },
  { id: "stay", emoji: "🏨", label: "Stay" },
  { id: "drinks", emoji: "🍻", label: "Drinks" },
  { id: "tickets", emoji: "🎟️", label: "Tickets" },
  { id: "general", emoji: "📦", label: "General" },
];

export const categoryEmoji = (c: ExpenseCategory) =>
  CATEGORIES.find((x) => x.id === c)?.emoji ?? "📦";

const KEYWORDS: Record<Exclude<ExpenseCategory, "general">, string[]> = {
  food: ["food", "dinner", "lunch", "breakfast", "brunch", "coffee", "cafe", "tea", "snack", "pizza",
    "burger", "restaurant", "meal", "biryani", "thali", "dosa", "ice cream", "dessert", "zomato", "swiggy"],
  travel: ["taxi", "cab", "uber", "ola", "auto", "fuel", "petrol", "diesel", "gas", "toll", "parking",
    "train", "flight", "bus", "metro", "rental", "scooty", "bike", "ferry", "transport"],
  stay: ["hotel", "hostel", "airbnb", "stay", "room", "resort", "villa", "homestay", "lodge", "rent"],
  drinks: ["beer", "drinks", "bar", "pub", "wine", "vodka", "whisky", "cocktail", "club", "alcohol", "shots"],
  tickets: ["ticket", "entry", "museum", "show", "movie", "concert", "tour", "activity", "park", "cruise",
    "parasailing", "scuba", "pass"],
};

/** Guess a category from an expense title; returns null when nothing matches. */
export function detectCategory(title: string): ExpenseCategory | null {
  const t = title.toLowerCase();
  if (!t.trim()) return null;
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    if (words.some((w) => new RegExp(`\\b${w}`).test(t))) return cat as ExpenseCategory;
  }
  return null;
}
