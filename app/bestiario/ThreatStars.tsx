import styles from "./bestiario.module.css";
export default function ThreatStars({ level }: { level: number }) {
  return <span className={styles.stars} role="img" aria-label={`Nível de ameaça: ${level} de 5 estrelas`}>
    <span aria-hidden="true">{[1, 2, 3, 4, 5].map(star => <span className={star <= level ? styles.lit : styles.unlit} key={star}>{star <= level ? "★" : "☆"}</span>)}</span>
  </span>;
}
