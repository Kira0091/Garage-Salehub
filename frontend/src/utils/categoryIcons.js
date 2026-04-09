export function categoryIconName(categoryName) {
  const n = String(categoryName || "").trim().toLowerCase();
  if (!n) return "box";

  if (n.includes("furniture") || n.includes("home")) return "sofa";
  if (n.includes("electronic") || n.includes("gadget") || n.includes("phone")) return "phone";
  if (n.includes("cloth") || n.includes("apparel") || n.includes("fashion")) return "shirt";
  if (n.includes("book") || n.includes("stationery")) return "book";
  if (n.includes("kitchen") || n.includes("cook") || n.includes("dining")) return "utensils";
  if (n.includes("toy") || n.includes("game")) return "gamepad";
  if (n.includes("sport") || n.includes("fitness")) return "ball";
  if (n.includes("tool") || n.includes("hardware") || n.includes("diy")) return "wrench";

  return "box";
}

