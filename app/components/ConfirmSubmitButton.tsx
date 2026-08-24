"use client";

import { useEffect, useRef } from "react";
import styles from "./confirm-submit-button.module.css";

type ConfirmSubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  title?: string;
  message: string;
};

export default function ConfirmSubmitButton({
  children,
  className,
  title = "Confirmar exclusão",
  message,
}: ConfirmSubmitButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") dialogRef.current?.close();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  function confirm() {
    const form = triggerRef.current?.form;
    dialogRef.current?.close();
    form?.requestSubmit();
  }

  return (
    <>
      <button
        ref={triggerRef}
        className={className}
        type="button"
        onClick={() => dialogRef.current?.showModal()}
      >
        {children}
      </button>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className={styles.panel}>
          <p className={styles.eyebrow}>Ação irreversível</p>
          <h2>{title}</h2>
          <p className={styles.message}>{message}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.cancel} onClick={() => dialogRef.current?.close()}>
              Cancelar
            </button>
            <button type="button" className={styles.confirm} onClick={confirm}>
              Sim, excluir
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
