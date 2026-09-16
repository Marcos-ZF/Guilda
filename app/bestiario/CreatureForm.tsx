"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import ImageCropInput from "@/app/components/ImageCropInput";
import { saveCreature } from "./actions";
import { categories, type Creature, type EmployeeOption } from "./model";
import ThreatStars from "./ThreatStars";
import styles from "./bestiario.module.css";

export default function CreatureForm({ creature, employees }: { creature?: Creature; employees: EmployeeOption[] }) {
  const [state, action, pending] = useActionState(saveCreature, { error: "" });
  const [threat, setThreat] = useState(creature?.threat ?? 1);
  const [fields, setFields] = useState({ name: creature?.name ?? "", category: creature?.category ?? categories[0] as string, discoverer_employee_id: creature?.discoverer_employee_id ?? "", description: creature?.description ?? "", strategies: creature?.strategies ?? "" });
  const changeField = (key: keyof typeof fields, value: string) => setFields(current => ({ ...current, [key]: value }));
  const [abilities, setAbilities] = useState(() => (creature?.abilities ?? []).map((ability, index) => ({ ...ability, key: String(index) })));
  return <form action={action} className={styles.form}>
    {creature && <input type="hidden" name="id" value={creature.id} />}
    <label>Nome<input name="name" value={fields.name} onChange={event => changeField("name", event.target.value)} minLength={2} maxLength={120} required /></label>
    <label>Categoria<select name="category" value={fields.category} onChange={event => changeField("category", event.target.value)}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
    <label>Nível de ameaça<select name="threat" value={threat} onChange={event => setThreat(Number(event.target.value))}>{[1,2,3,4,5].map(level => <option value={level} key={level}>{level} {level === 1 ? "estrela" : "estrelas"}</option>)}</select><ThreatStars level={threat} /></label>
    <label>Responsável pela descoberta e informações (opcional)<select name="discoverer_employee_id" value={fields.discoverer_employee_id} onChange={event => changeField("discoverer_employee_id", event.target.value)}><option value="">Não informado</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name} · {employee.code}</option>)}</select></label>
    <div className={styles.wide}><ImageCropInput name="image" label={creature ? "Trocar foto (opcional)" : "Foto da criatura"} aspect={4/3} fit="contain" /><p className={styles.hint}>{creature ? "Sem uma nova imagem, a foto atual será mantida." : "Escolha a imagem e confirme o enquadramento em Aplicar."}</p></div>
    <label className={styles.wide}>Descrição (opcional)<textarea name="description" value={fields.description} onChange={event => changeField("description", event.target.value)} maxLength={10000} /></label>
    <fieldset className={styles.wide}><legend>Habilidades</legend>
      {abilities.map((ability, index) => <div className={styles.abilityEditor} key={ability.key}>
        <label>Nome da habilidade {index + 1}<input name="ability_name" maxLength={100} required value={ability.name} onChange={event => setAbilities(items => items.map(item => item.key === ability.key ? { ...item, name: event.target.value } : item))} /></label>
        <label>Descrição da habilidade<textarea name="ability_description" maxLength={2000} value={ability.description} onChange={event => setAbilities(items => items.map(item => item.key === ability.key ? { ...item, description: event.target.value } : item))} /></label>
        <button type="button" onClick={() => setAbilities(items => items.filter(item => item.key !== ability.key))}>Remover habilidade {index + 1}</button>
      </div>)}
      {!abilities.length && <p className={styles.hint}>Nenhuma habilidade adicionada.</p>}
      <button type="button" disabled={abilities.length >= 20} onClick={() => setAbilities(items => [...items, { key: crypto.randomUUID(), name: "", description: "" }])}>+ Adicionar habilidade</button>
    </fieldset>
    <label className={styles.wide}>Estratégias no combate (opcional)<textarea name="strategies" value={fields.strategies} onChange={event => changeField("strategies", event.target.value)} maxLength={10000} /></label>
    {state.error && <p role="alert" className={`${styles.wide} ${styles.formError}`}>{state.error} Se enviou uma nova foto, selecione-a novamente antes de tentar salvar.</p>}
    <div className={`${styles.wide} ${styles.actions}`}><Link href={creature ? `/bestiario/${creature.id}` : "/bestiario"}>Cancelar</Link><button type="submit" disabled={pending}>{pending ? "Salvando…" : creature ? "Salvar alterações" : "Cadastrar criatura"}</button></div>
  </form>;
}
