"use client";

import { useId, useState } from "react";

export type EquipmentType = "Arma" | "Acessório" | "Armadura";
export type EquipmentRarity = "common" | "rare" | "epic" | "legendary";

const rarityLabels: Record<EquipmentRarity, { feminine: string; masculine: string }> = {
  common: { feminine: "Comum", masculine: "Comum" },
  rare: { feminine: "Rara", masculine: "Raro" },
  epic: { feminine: "Épica", masculine: "Épico" },
  legendary: { feminine: "Lendária", masculine: "Lendário" },
};

export function getEquipmentRarityLabel(itemType: string, rarity: string) {
  const labels = rarityLabels[rarity as EquipmentRarity] ?? rarityLabels.common;
  return itemType === "Acessório" ? labels.masculine : labels.feminine;
}

type Props = {
  defaultItemType?: EquipmentType;
  defaultRarity?: EquipmentRarity;
  nestedLabels?: boolean;
};

export default function EquipmentTypeRarityFields({
  defaultItemType = "Arma",
  defaultRarity = "common",
  nestedLabels = false,
}: Props) {
  const [itemType, setItemType] = useState<EquipmentType>(defaultItemType);
  const typeId = useId();
  const rarityId = useId();
  const rarityOptions = (Object.keys(rarityLabels) as EquipmentRarity[]).map((value) => ({
    value,
    label: getEquipmentRarityLabel(itemType, value),
  }));

  const typeSelect = (
    <select
      id={typeId}
      name="item_type"
      value={itemType}
      onChange={(event) => setItemType(event.target.value as EquipmentType)}
      required
    >
      <option>Arma</option>
      <option>Acessório</option>
      <option>Armadura</option>
    </select>
  );
  const raritySelect = (
    <select id={rarityId} name="rarity" defaultValue={defaultRarity} required>
      {rarityOptions.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );

  if (nestedLabels) {
    return (
      <>
        <label htmlFor={typeId}>Tipo{typeSelect}</label>
        <label htmlFor={rarityId}>Raridade{raritySelect}</label>
      </>
    );
  }

  return (
    <>
      <label htmlFor={typeId}>Tipo</label>{typeSelect}
      <label htmlFor={rarityId}>Raridade</label>{raritySelect}
    </>
  );
}
