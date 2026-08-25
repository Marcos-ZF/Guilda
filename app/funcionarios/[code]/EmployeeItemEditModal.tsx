"use client";

import { useRef } from "react";
import ImageCropInput from "@/app/components/ImageCropInput";
import { updateAchievement, updateEquipment } from "./actions";
import EquipmentTypeRarityFields from "./EquipmentTypeRarityFields";
import { type EquipmentRarity, type EquipmentType } from "./equipment-rarity";
import styles from "./item-edit-modal.module.css";

type Equipment = { id: string; name: string; item_type: EquipmentType; rarity: EquipmentRarity; sort_order: number; description: string; image_url: string | null; document_url: string | null };
type Achievement = { id: string; title: string; description: string; sort_order: number };
type Common = { employeeId: string; code: string };

export function EquipmentEditModal({ employeeId, code, item, position }: Common & { item: Equipment; position: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <><button className={styles.open} type="button" onClick={() => dialog.current?.showModal()}>Editar</button><dialog className={styles.modal} ref={dialog} onClick={event => { if (event.target === dialog.current) dialog.current.close(); }}><div className={styles.panel}><Header title="Editar equipamento" close={() => dialog.current?.close()} /><form className={styles.form} action={updateEquipment}><Hidden employeeId={employeeId} code={code} itemId={item.id} /><label>Nome<input name="name" defaultValue={item.name} required /></label><label>Posição de exibição<input name="sort_order" type="number" min="1" max="9999" defaultValue={position} required /></label><EquipmentTypeRarityFields defaultItemType={item.item_type} defaultRarity={item.rarity} nestedLabels /><label className={styles.wide}>Descrição<textarea name="description" defaultValue={item.description} /></label><label className={styles.wide}>Link de Doc (opcional)<input name="document_url" type="url" defaultValue={item.document_url ?? ""} placeholder="https://docs.google.com/..." /></label><div className={styles.wide}><ImageCropInput name="image" label="Trocar foto do equipamento (opcional)" aspect={4 / 3} fit="contain" /></div><Actions close={() => dialog.current?.close()} /></form></div></dialog></>;
}

export function AchievementEditModal({ employeeId, code, item, position }: Common & { item: Achievement; position: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <><button className={styles.open} type="button" onClick={() => dialog.current?.showModal()}>Editar</button><dialog className={styles.modal} ref={dialog} onClick={event => { if (event.target === dialog.current) dialog.current.close(); }}><div className={styles.panel}><Header title="Editar feito" close={() => dialog.current?.close()} /><form className={styles.form} action={updateAchievement}><Hidden employeeId={employeeId} code={code} itemId={item.id} /><label className={styles.wide}>Título<input name="title" defaultValue={item.title} required /></label><label>Posição de exibição<input name="sort_order" type="number" min="1" max="9999" defaultValue={position} required /></label><label className={styles.wide}>Descrição<textarea name="description" defaultValue={item.description} /></label><Actions close={() => dialog.current?.close()} /></form></div></dialog></>;
}

function Hidden({ employeeId, code, itemId }: Common & { itemId: string }) { return <><input type="hidden" name="employee_id" value={employeeId} /><input type="hidden" name="code" value={code} /><input type="hidden" name="item_id" value={itemId} /></>; }
function Header({ title, close }: { title: string; close: () => void }) { return <div className={styles.header}><div><small>Ficha do funcionário</small><h2>{title}</h2></div><button type="button" onClick={close} aria-label="Fechar janela">×</button></div>; }
function Actions({ close }: { close: () => void }) { return <div className={styles.actions}><button className={styles.cancel} type="button" onClick={close}>Cancelar</button><button type="submit">Salvar alterações</button></div>; }
