"use client";
import { useId, useRef } from "react";
import { damageOptions, threatLevels } from "./model";
import DamageDot from "./DamageDot";
import ThreatStars from "./ThreatStars";
import styles from "./bestiario.module.css";

const difficulty = [
  "Criaturas fracas em geral, que um grupo de Divisão 7 derrota sem muitas complicações.",
  "Chefes para um grupo de Divisão 7; um grupo de Divisão 6 derrota sem muitas complicações.",
  "Chefes para um grupo de Divisão 6; um grupo de Divisão 5 derrota sem muitas complicações.",
  "Chefes para um grupo de Divisão 5; um grupo de Divisão 4 derrota sem muitas complicações.",
  "Chefes para um grupo de Divisão 4; um grupo de Divisão 3 derrota sem muitas complicações.",
  "Chefes para um grupo de Divisão 3; um grupo de Divisão 2 derrota sem muitas complicações.",
  "Chefes para um grupo de Divisão 2; um grupo de Divisão 1 derrota sem muitas complicações.",
  "Chefes para um grupo de Divisão 1.",
];

export default function BestiaryManual() {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return <>
    <button type="button" className={`${styles.button} ${styles.manualButton}`} onClick={() => dialog.current?.showModal()}>Manual do Bestiário</button>
    <dialog ref={dialog} className={styles.manual} aria-labelledby={titleId} onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      <div className={styles.manualPanel}>
        <header><h2 id={titleId}>Manual do Bestiário</h2><button type="button" aria-label="Fechar manual" onClick={() => dialog.current?.close()}>×</button></header>
        <h3>Nível de ameaça</h3><p>De 1 a 8 estrelas: quanto mais estrelas, maior a dificuldade.</p>
        <ol className={styles.difficultyList}>{threatLevels.map((level, index) => <li key={level}><div><ThreatStars level={level} /><strong>{level} {level === 1 ? "estrela" : "estrelas"}</strong></div><p>{difficulty[index]}</p></li>)}</ol>
        <h3>Categoria de dano</h3><p>A bolinha antes de cada habilidade indica seu tipo de dano.</p>
        <ul className={styles.damageLegend}>{damageOptions.map(option => <li key={option.value}><DamageDot type={option.value || null} /><p><strong>{option.label}</strong> — {option.explanation}</p></li>)}</ul>
        <button type="button" className={styles.button} onClick={() => dialog.current?.close()}>Fechar manual</button>
      </div>
    </dialog>
  </>;
}
