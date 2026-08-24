"use client";

import { useRef } from "react";
import styles from "./ContactModal.module.css";

export default function ContactModal() {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button className={styles.open} type="button" onClick={() => dialog.current?.showModal()}>
        Contatar a Companhia <span>↗</span>
      </button>
      <dialog className={styles.modal} ref={dialog} onClick={(event) => {
        if (event.target === dialog.current) dialog.current.close();
      }}>
        <div className={styles.panel}>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Fechar janela">×</button>
          <small>COMUNICAÇÃO EXTERNA</small>
          <h2>Entre em contato por RP :P</h2>
          <button className={styles.close} type="button" onClick={() => dialog.current?.close()}>Entendido</button>
        </div>
      </dialog>
    </>
  );
}
