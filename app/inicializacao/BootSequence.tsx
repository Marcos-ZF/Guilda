"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./boot.module.css";

const BOOT_DURATION_MS = 3000;
const EXIT_FADE_MS = 500;

const phases = [
  "Preparando ambiente",
  "Carregando componentes",
  "Iniciando sessão",
  "Sistema pronto",
];

function completedBootPath(path: string) {
  const destination = new URL(path, window.location.origin);
  destination.searchParams.set("vivianos", "pronto");
  return `${destination.pathname}${destination.search}${destination.hash}`;
}

type BootSequenceProps = {
  returnTo: string;
};

export default function BootSequence({ returnTo }: BootSequenceProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(phases[0]);
  const [leaving, setLeaving] = useState(false);
  const completionRequested = useRef(false);

  useEffect(() => {
    const storageKey = "vivianos-boot-start";
    const storedStart = Number(window.sessionStorage.getItem(storageKey));
    const startedAt = Number.isFinite(storedStart) && storedStart > 0
      ? storedStart
      : Date.now();

    window.sessionStorage.setItem(storageKey, String(startedAt));
    let frame = 0;
    let active = true;

    const tick = () => {
      if (!active) return;
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min(100, Math.floor((elapsed / BOOT_DURATION_MS) * 100));
      setProgress(nextProgress);
      setPhase(phases[Math.min(phases.length - 1, Math.floor(nextProgress / 30))]);

      if (elapsed < BOOT_DURATION_MS) {
        frame = requestAnimationFrame(tick);
        return;
      }

      if (completionRequested.current) return;
      completionRequested.current = true;

      window.sessionStorage.removeItem(storageKey);
      setLeaving(true);
      window.setTimeout(
        () => window.location.replace(completedBootPath(returnTo)),
        EXIT_FADE_MS,
      );
    };

    frame = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [returnTo]);

  return (
    <main className={`${styles.page} ${leaving ? styles.leaving : ""}`}>
      <section className={styles.terminal} aria-labelledby="boot-title">
        <div className={styles.identity}>
          <div className={styles.logoLockup}>
            <Image
              className={styles.butterfly}
              src="/vivianos-butterfly.png"
              width={92}
              height={92}
              alt=""
              aria-hidden="true"
              priority
            />
            <h1 id="boot-title">Vivian<span>OS</span></h1>
          </div>
          <p>Inicializando sistema</p>
        </div>

        <div className={styles.status} aria-live="polite">
          <div className={styles.statusLine}>
            <span>{phase}</span>
            <b>{String(progress).padStart(3, "0")}%</b>
          </div>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>

        <span className={styles.spinner} aria-hidden="true" />

      </section>

      <footer>
        <span>VIVIAN SYSTEMS</span>
        <span>VERSION 2.0</span>
      </footer>
    </main>
  );
}
