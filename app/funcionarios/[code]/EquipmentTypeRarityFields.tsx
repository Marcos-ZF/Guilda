"use client";

import { useId, useState } from "react";
import {
  equipmentRarityValues,
  getEquipmentRarityLabel,
  type EquipmentRarity,
  type EquipmentType,
} from "./equipment-rarity";

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
  const rarityOptions = equipmentRarityValues.map((value) => ({
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
