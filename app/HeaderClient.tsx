"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { CurrentProfile } from "@/lib/auth";
import { SESSION_DEADLINE_COOKIE } from "@/lib/session";
import styles from "./page.module.css";

type HeaderClientProps = {
  profile: CurrentProfile | null;
  photoUrl: string | null;
  isVisitor: boolean;
};

function Crest() {
  return (
    <Image
      className={styles.crest}
      src="/guilda-romanov.png"
      width={48}
      height={48}
      alt=""
      aria-hidden="true"
      priority
    />
  );
}

function getInitials(profile: CurrentProfile) {
  const source = profile.display_name?.trim() || profile.email || "Usuário";
  const parts = source.split(/\s+/).filter(Boolean);

  return (parts.length > 1
    ? `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`
    : source.slice(0, 2)
  ).toUpperCase();
}

export default function HeaderClient({ profile, photoUrl, isVisitor }: HeaderClientProps) {
  const [scrolled, setScrolled] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateHeader = () => {
      const isScrolled = window.scrollY > 80;
      setScrolled(isScrolled);

      if (!isScrolled) setExpanded(false);
    };

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const updateMode = () => {
      setIsMobile(media.matches);
      if (!media.matches) setMobileOpen(false);
    };

    updateMode();
    media.addEventListener("change", updateMode);
    return () => media.removeEventListener("change", updateMode);
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.body.classList.toggle(styles.mobileMenuLocked, mobileOpen);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove(styles.mobileMenuLocked);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!profile) return;

    const deadlineCookie = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith(`${SESSION_DEADLINE_COOKIE}=`));
    const deadline = Number(deadlineCookie?.split("=")[1]);

    if (!Number.isFinite(deadline)) return;

    const endSession = () => {
      void fetch("/auth/signout", { method: "POST" }).finally(() => {
        window.location.replace("/login?erro=sessao");
      });
    };
    const remaining = deadline - Date.now();

    if (remaining <= 0) {
      endSession();
      return;
    }

    const timeout = window.setTimeout(endSession, remaining);
    return () => window.clearTimeout(timeout);
  }, [profile]);

  const compact = scrolled && !expanded;
  const isAdmin = profile?.role === "admin";
  const accountHref = "/perfil";

  return (
    <header className={`${styles.header} ${scrolled ? styles.headerFloating : ""} ${compact ? styles.headerCompact : ""}`}>
      <div className={styles.headerInner}>
        <Link
          className={styles.brand}
          href="/#inicio"
          onClick={(event) => {
            if (!isMobile) return;
            event.preventDefault();
            setMobileOpen((value) => !value);
          }}
          aria-expanded={isMobile ? mobileOpen : undefined}
          aria-controls={isMobile ? "mobile-navigation" : undefined}
          aria-label={isMobile ? (mobileOpen ? "Fechar navegação" : "Abrir navegação") : "Companhia Romanov — início"}
        >
          <Crest />
          <span className={styles.brandText}>
            <strong>Companhia Romanov</strong>
            <small>Сила · Порядок · Память</small>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Navegação principal">
          <Link href="/#inicio">A Companhia</Link>
          <Link href="/#linha-do-tempo">Linha do tempo</Link>
          <Link href="/subsidiarias">Subsidiárias</Link>
          <Link href="/funcionarios">Funcionários</Link>
          {profile && <Link href="/relatorios">Relatórios</Link>}
          {isAdmin && <Link href="/adm">ADM</Link>}
        </nav>

        <div className={styles.headerActions}>
          {profile ? (
            <>
              <span className={styles.accountText}>
                <strong>{profile.display_name || profile.email}</strong>
                <small>{isAdmin ? "Administrador" : "Funcionário"}</small>
              </span>
              <Link className={styles.profileButton} style={photoUrl ? { backgroundImage: `url("${photoUrl}")` } : undefined} href={accountHref} aria-label="Abrir meu perfil" title="Meu perfil">
                {!photoUrl && <span>{getInitials(profile)}</span>}
              </Link>
              <form className={styles.signoutForm} action="/auth/signout" method="post">
                <button type="submit">Sair</button>
              </form>
            </>
          ) : isVisitor ? (
            <form className={styles.signoutForm} action="/auth/signout" method="post">
              <button type="submit">Sair</button>
            </form>
          ) : (
            <a className={styles.loginButton} href="/login">Entrar</a>
          )}
          <button
            className={styles.headerToggle}
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={!compact}
            aria-label={compact ? "Expandir menu" : "Minimizar menu"}
            title={compact ? "Expandir menu" : "Minimizar menu"}
          >
            <span aria-hidden="true">{compact ? "⌄" : "⌃"}</span>
          </button>
        </div>
      </div>

      {isMobile && (
        <>
          <button
            className={`${styles.mobileBackdrop} ${mobileOpen ? styles.mobileBackdropOpen : ""}`}
            type="button"
            aria-label="Fechar navegação"
            tabIndex={mobileOpen ? 0 : -1}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            id="mobile-navigation"
            className={`${styles.mobileSidebar} ${mobileOpen ? styles.mobileSidebarOpen : ""}`}
            aria-hidden={!mobileOpen}
            inert={!mobileOpen}
          >
            <button className={styles.mobileSidebarHead} type="button" onClick={() => setMobileOpen(false)} aria-label="Fechar navegação">
              <Crest />
              <div><small>Arquivo de navegação</small><strong>Companhia Romanov</strong></div>
            </button>
            <nav className={styles.mobileNav} aria-label="Navegação móvel">
              <Link href="/#inicio" onClick={() => setMobileOpen(false)}><span>01</span>Início</Link>
              <Link href="/#inicio" onClick={() => setMobileOpen(false)}><span>02</span>A Companhia</Link>
              <Link href="/#linha-do-tempo" onClick={() => setMobileOpen(false)}><span>03</span>Linha do tempo</Link>
              <Link href="/subsidiarias" onClick={() => setMobileOpen(false)}><span>04</span>Subsidiárias</Link>
              <Link href="/funcionarios" onClick={() => setMobileOpen(false)}><span>05</span>Funcionários</Link>
              {profile && <Link href="/relatorios" onClick={() => setMobileOpen(false)}><span>06</span>Relatórios</Link>}
              {profile && <Link href="/perfil" onClick={() => setMobileOpen(false)}><span>07</span>Meu perfil</Link>}
              {isAdmin && <Link href="/adm" onClick={() => setMobileOpen(false)}><span>08</span>Administração</Link>}
            </nav>
            <div className={styles.mobileAccount}>
              {profile ? (
                <>
                  <div className={styles.mobileIdentity}>
                    <span className={styles.mobileAvatar} style={photoUrl ? { backgroundImage: `url("${photoUrl}")` } : undefined}>
                      {!photoUrl && getInitials(profile)}
                    </span>
                    <p><strong>{profile.display_name || profile.email}</strong><small>{isAdmin ? "Administrador" : "Funcionário"}</small></p>
                  </div>
                  <form action="/auth/signout" method="post"><button type="submit">Encerrar sessão</button></form>
                </>
              ) : isVisitor ? (
                <form action="/auth/signout" method="post">
                  <button type="submit">Sair do modo visitante</button>
                </form>
              ) : (
                <a href="/login" onClick={() => setMobileOpen(false)}>Entrar no sistema →</a>
              )}
            </div>
          </aside>
        </>
      )}
    </header>
  );
}
