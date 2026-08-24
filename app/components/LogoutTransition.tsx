"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import bootStyles from "../inicializacao/boot.module.css";
import styles from "./logoutTransition.module.css";

const SIGNOUT_DELAY_MS = 2200;

export default function LogoutTransition() {
  const [active, setActive] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    function interceptSignout(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      const action = new URL(form.action, window.location.href);
      if (action.pathname !== "/auth/signout" || submitting.current) return;

      event.preventDefault();
      submitting.current = true;
      setActive(true);

      window.setTimeout(() => form.submit(), SIGNOUT_DELAY_MS);
    }

    document.addEventListener("submit", interceptSignout, true);
    return () => document.removeEventListener("submit", interceptSignout, true);
  }, []);

  return (
    <div
      className={`${styles.overlay} ${active ? styles.active : ""}`}
      aria-hidden={!active}
      aria-live="polite"
    >
      <section className={`${bootStyles.terminal} ${styles.positioning}`}>
        <div className={`${bootStyles.identity} ${styles.placeholder}`}>
          <div className={bootStyles.logoLockup}>
            <Image
              className={bootStyles.butterfly}
              src="/vivianos-butterfly.png"
              width={92}
              height={92}
              alt=""
            />
            <h1>Vivian<span>OS</span></h1>
          </div>
          <p>Inicializando sistema</p>
        </div>
        <div className={`${bootStyles.status} ${styles.placeholder}`}>
          <div className={bootStyles.statusLine}>
            <span>Preparando ambiente</span>
            <b>000%</b>
          </div>
          <div className={bootStyles.progressTrack}><span /></div>
        </div>
        <span
          className={`${bootStyles.spinner} ${styles.spinner}`}
          aria-hidden="true"
        />
      </section>
      {active && <span className={styles.srOnly}>Encerrando sessão</span>}
    </div>
  );
}
