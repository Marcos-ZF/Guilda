import { damageOptions, type DamageType } from "./model";
import styles from "./bestiario.module.css";

export default function DamageDot({ type }: { type?: DamageType | null }) {
  const option = damageOptions.find(item => item.value === (type ?? "")) ?? damageOptions[0];
  return <span className={`${styles.damageDot} ${styles[option.color]}`} role="img" aria-label={option.label} title={option.label} />;
}
