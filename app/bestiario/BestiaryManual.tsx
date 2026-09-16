"use client";
import { useId, useRef } from "react";
import { categories, damageOptions, threatLevels, type Category } from "./model";
import DamageDot from "./DamageDot";
import ThreatStars from "./ThreatStars";
import styles from "./bestiario.module.css";

const categoryDescriptions: Record<Category, string> = {
  Sapiens: "Seres inteligentes dotados de pensamento complexo, linguagem articulada e capacidade de desenvolver culturas, estabelecer leis e criar tecnologias. Destacam-se pela organização social, cooperação e uso de ferramentas, além de acumular e transmitir conhecimentos entre gerações. Sua criatividade e capacidade de adaptação permitem transformar o ambiente e encontrar soluções para novos desafios.",
  Ferais: "Criaturas ligadas ao mundo natural, moldadas pela evolução ou transformadas por influências mágicas. Movidas principalmente pelo instinto, possuem sentidos aguçados e comportamentos voltados à sobrevivência, à caça e à proteção de seu território. Podem viver de forma solitária ou em grupos organizados por hierarquias de dominância, desenvolvendo estratégias de defesa e cooperação para enfrentar as ameaças de seu habitat.",
  Amorfos: "Criaturas de corpo mutável, desprovidas de esqueleto, órgãos definidos ou forma estável. Sua plasticidade corporal permite moldar a própria estrutura, atravessar passagens estreitas e envolver objetos ou presas. São capazes de se dividir em partes menores e se fundir novamente, apresentando resistência quase absoluta a impactos, cortes e perfurações, pois não possuem pontos vitais convencionais.",
  Vegetais: "Seres de natureza vegetal que despertaram para a consciência por meio de magia ancestral, rituais druídicos ou vínculos com as forças primordiais da terra. Obtêm energia pela fotossíntese e mantêm uma relação simbiótica com o solo, de onde extraem nutrientes e percebem mudanças ao redor. Seu crescimento é lento, porém implacável, permitindo que criem raízes profundas, regenerem partes danificadas e adaptem sua estrutura ao ambiente. Profundamente ligados aos ciclos naturais, podem agir como guardiões de florestas e territórios sagrados.",
  Umbros: "Criaturas nascidas das trevas, vinculadas à morte, a maldições ancestrais ou a forças sombrias. Alimentam-se de energias negativas e encontram na escuridão um refúgio que fortalece seus poderes e oculta sua presença. Sujeitos à influência da lua, podem sofrer transformações que alteram sua aparência, seus instintos e suas habilidades. Sua essência amaldiçoada repele o sagrado, enquanto sua presença pode despertar medo, drenar a vitalidade e corromper o ambiente ao redor.",
  Artificiais: "Construtos fabricados por meio de magia, alquimia ou tecnologia arcana, animados por encantamentos, mecanismos ou núcleos de energia. Dispensam alimentação, respiração e repouso biológico, executando funções determinadas por comandos ou propósitos inscritos em sua criação. Suas resistências são incorporadas à própria estrutura, variando conforme os materiais e as técnicas empregados. Podem atuar como guardiões, trabalhadores ou instrumentos de guerra, mantendo-se fiéis às suas diretrizes mesmo quando seus criadores já desapareceram.",
};

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
        <h3>Categorias de criaturas</h3>
        <ul className={styles.categoryGuide}>{categories.map(category => <li key={category}><h4>{category}</h4><p>{categoryDescriptions[category]}</p></li>)}</ul>
        <h3>Nível de ameaça</h3><p>De 1 a 8 estrelas: quanto mais estrelas, maior a dificuldade.</p>
        <ol className={styles.difficultyList}>{threatLevels.map((level, index) => <li key={level}><div><ThreatStars level={level} /><strong>{level} {level === 1 ? "estrela" : "estrelas"}</strong></div><p>{difficulty[index]}</p></li>)}</ol>
        <h3>Categoria de dano</h3><p>A bolinha antes de cada habilidade indica seu tipo de dano.</p>
        <ul className={styles.damageLegend}>{damageOptions.map(option => <li key={option.value}><DamageDot type={option.value || null} /><p><strong>{option.label}</strong> — {option.explanation}</p></li>)}</ul>
        <button type="button" className={styles.button} onClick={() => dialog.current?.close()}>Fechar manual</button>
      </div>
    </dialog>
  </>;
}
