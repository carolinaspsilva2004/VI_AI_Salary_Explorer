const PALETTE = [
  "#2563eb", "#16a34a", "#7c3aed", "#0891b2",
  "#db2777", "#ea580c", "#ca8a04", "#4f46e5",
];

function hashCategory(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0; // keep 32-bit
  }
  return Math.abs(hash);
}

export function getCategoryColor(category) {
  if (!category) return PALETTE[0];
  const idx = hashCategory(category) % PALETTE.length;
  return PALETTE[idx];
}

export { PALETTE as CATEGORY_PALETTE };
