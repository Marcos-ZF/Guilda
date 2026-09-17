import styles from "./bestiario.module.css";

export default function InformationOrigin({ text }: { text?: string | null }) {
  return <div>
    <dt id="information-origin-title">Origem da Informação</dt>
    <dd><div className={styles.informationOrigin} role="region" aria-labelledby="information-origin-title" tabIndex={0}>{text?.trim() || "Não informada."}</div></dd>
  </div>;
}
