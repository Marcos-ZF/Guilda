import styles from "./bestiario.module.css";
import { threatLevels } from "./model";
export default function ThreatStars({ level }: { level: number }) {
  return <span className={styles.stars} role="img" aria-label={`Nível de ameaça: ${level} de 8 estrelas`}>
    <span aria-hidden="true">{threatLevels.map(star => <span className={star <= level ? styles.lit : styles.unlit} key={star}>{star <= level ? "★" : "☆"}</span>)}</span>
  </span>;
}
