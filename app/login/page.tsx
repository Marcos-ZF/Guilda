import Image from "next/image";
import { enterAsVisitor, login } from "./actions";
import styles from "./login.module.css";

const messages: Record<string, string> = {
  campos: "Preencha o e-mail e a senha.",
  credenciais: "E-mail ou senha inválidos.",
  configuracao: "A conexão com o Supabase ainda não foi configurada neste ambiente.",
  perfil: "Sua conta ainda não possui um perfil de acesso. Fale com um administrador.",
  sessao: "Sua sessão de quatro horas terminou. Entre novamente para continuar.",
};

type LoginPageProps = {
  searchParams: Promise<{ erro?: string }>;
};

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const message = params.erro ? messages[params.erro] : null;

  return (
    <main className={styles.page}>
      <section className={styles.poster}>
        <div className={styles.posterContent}>
          <p>ДОСТУП / ACESSO INTERNO</p>
          <h1>Companhia<br />Romanov</h1>
          <span>СИЛА · ПОРЯДОК · ПАМЯТЬ</span>
        </div>
        <Image className={styles.mark} src="/guilda-romanov.png" width={420} height={420} alt="" priority />
        <small>DOCUMENTO DE ACESSO · 04</small>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.formHeader}>
          <Image
            className={styles.loginHeaderLogo}
            src="/guilda-romanov.png"
            width={84}
            height={84}
            alt="Símbolo da Companhia Romanov"
          />
          <div><p>IDENTIFICAÇÃO</p><h2>Entrar no sistema</h2></div>
        </div>

        <p className={styles.intro}>Utilize as credenciais fornecidas pela administração da Companhia Romanov.</p>

        {message && <p className={styles.error} role="alert">{message}</p>}

        <form action={login} className={styles.form}>
          <label htmlFor="email">E-mail institucional</label>
          <input id="email" name="email" type="email" autoComplete="username" required />

          <label htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required minLength={6} />

          <button type="submit">Autenticar <span>→</span></button>
        </form>

        <form action={enterAsVisitor}>
          <button className={styles.visitorButton} type="submit">
            <span><small>ACESSO PÚBLICO</small>Login de Visitante</span>
            <b>→</b>
          </button>
        </form>

        <p className={styles.help}>O visitante acessa somente as páginas e registros públicos.</p>
      </section>
    </main>
  );
}
