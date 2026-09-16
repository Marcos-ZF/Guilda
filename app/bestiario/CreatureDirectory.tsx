/* eslint-disable @next/next/no-img-element */
"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { categories, filterCreatures, type Creature } from "./model";
import ThreatStars from "./ThreatStars";
import styles from "./bestiario.module.css";
export type CreatureCard = Pick<Creature, "id" | "name" | "category" | "threat"> & { imageUrl: string | null; responsibleName: string | null };

export default function CreatureDirectory({ creatures }: { creatures: CreatureCard[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [threat, setThreat] = useState("");
  const visible = useMemo(() => filterCreatures(creatures, search, category, threat), [creatures, search, category, threat]);
  return <>
    <div className={styles.filters}>
      <label>Pesquisar criatura<input type="search" placeholder="Digite um nome…" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <label>Categoria<select value={category} onChange={event => setCategory(event.target.value)}><option value="">Todas as categorias</option>{categories.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Nível de ameaça<select value={threat} onChange={event => setThreat(event.target.value)}><option value="">Todos os níveis</option>{[1,2,3,4,5].map(level => <option key={level} value={level}>{level} {level === 1 ? "estrela" : "estrelas"}</option>)}</select></label>
      {(search || category || threat) && <button type="button" onClick={() => { setSearch(""); setCategory(""); setThreat(""); }}>Limpar filtros</button>}
    </div>
    <p className={styles.resultCount} aria-live="polite">{visible.length} {visible.length === 1 ? "criatura encontrada" : "criaturas encontradas"}</p>
    {categories.filter(item => !category || item === category).map(item => {
      const rows = visible.filter(creature => creature.category === item);
      return <section className={styles.category} key={item} aria-label={item}>
        <h2>{item}<small>{rows.length} registros</small></h2>
        {rows.length ? <div className={styles.cards}>{rows.map(creature => <Link className={styles.card} href={`/bestiario/${creature.id}`} key={creature.id}>
          <div className={styles.cardTop}><span>{creature.category}</span><ThreatStars level={creature.threat} /></div>
          <div className={styles.cardMain}><h3>{creature.name}</h3>{creature.imageUrl ? <img src={creature.imageUrl} alt={creature.name} width={240} height={180} loading="lazy" /> : <div className={styles.imagePlaceholder}>Foto indisponível</div>}</div>
          <div className={styles.cardFoot}><span>{creature.responsibleName || "Responsável não informado"}</span><span>Abrir registro →</span></div>
        </Link>)}</div> : <p className={styles.empty}>{search || threat ? "Nenhuma criatura corresponde aos filtros nesta categoria." : "Nenhuma criatura cadastrada nesta categoria."}</p>}
      </section>;
    })}
  </>;
}
