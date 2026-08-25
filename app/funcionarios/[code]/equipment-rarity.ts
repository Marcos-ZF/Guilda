export type EquipmentType = "Arma" | "Acessório" | "Armadura";
export type EquipmentRarity = "common" | "rare" | "epic" | "legendary";

const rarityLabels: Record<EquipmentRarity, { feminine: string; masculine: string }> = {
  common: { feminine: "Comum", masculine: "Comum" },
  rare: { feminine: "Rara", masculine: "Raro" },
  epic: { feminine: "Épica", masculine: "Épico" },
  legendary: { feminine: "Lendária", masculine: "Lendário" },
};

export const equipmentRarityValues = Object.keys(rarityLabels) as EquipmentRarity[];

export function getEquipmentRarityLabel(itemType: string, rarity: string) {
  const labels = rarityLabels[rarity as EquipmentRarity] ?? rarityLabels.common;
  return itemType === "Acessório" ? labels.masculine : labels.feminine;
}
