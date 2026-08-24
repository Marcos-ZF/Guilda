import Header from "../Header";
import Link from "next/link";
import { requireRole, type UserRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAccount, updateProfile } from "./actions";
import styles from "../internal.module.css";
import adminStyles from "./adm.module.css";

const tools = [
  { title: "Funcionários", text: "Cadastre pessoas, altere funções e atualize informações públicas.", href: "/adm/funcionarios" },
  { title: "Subsidiárias", text: "Crie unidades, defina responsáveis e acompanhe seus serviços.", href: "/subsidiarias" },
  { title: "Linha do tempo", text: "Publique comunicados, conquistas e entradas de novos funcionários.", href: "/adm/linha-do-tempo" },
  { title: "Relatórios", text: "Crie e gerencie os documentos internos da companhia.", href: "/relatorios" },
  { title: "Tesouraria", text: "Controle os saldos e o histórico de entradas e saídas da Companhia Romanov.", href: "/adm/tesouraria", important: true },
];

type ManagedProfile = { id: string; email: string | null; display_name: string | null; role: UserRole; employee_id: string | null; created_at: string };
type Props = { searchParams: Promise<{ salvo?: string; criado?: string; erro?: string }> };
type Employee = { code: string; name: string; is_active: boolean };

const backupEntries = [
  { name: "Backup do Sistema", status: "Sistema operacional" },
  { name: "Backup de Arquivos", status: "Sistema operacional" },
  { name: "Backup Vivian Bellarose", status: "Sistema Autômato Autoconsciente" },
];

function backupHours(index: number) {
  const twoDayCycle = Math.floor(Date.now() / (48 * 60 * 60 * 1000));
  let seed = (twoDayCycle + 1) * 2654435761 + (index + 11) * 1013904223;
  seed = (seed ^ (seed >>> 16)) >>> 0;
  return 48 + (seed % 49);
}

const errors: Record<string, string> = {
  dados: "Confira os dados informados e tente novamente.",
  proprio: "Você não pode remover o cargo administrativo da sua própria conta.",
  fundador: "O cargo do administrador fundador é permanente e não pode ser removido.",
  salvar: "Não foi possível salvar o perfil.",
  config: "Adicione a chave privada do Supabase ao arquivo .env.local para administrar contas.",
  conta: "O Supabase recusou a alteração da conta. Confira se o e-mail já está em uso.",
};

export default async function AdminPage({ searchParams }: Props) {
  const current = await requireRole(["admin"]);
  const params = await searchParams;
  const supabase = await createClient();
  const [{ data }, { data: employeeData }] = await Promise.all([
    supabase.from("profiles").select("id,email,display_name,role,employee_id,created_at").order("created_at").order("id").returns<ManagedProfile[]>(),
    supabase.from("employees").select("code,name,is_active").order("name").returns<Employee[]>(),
  ]);
  const profiles = data ?? [];
  const employees = employeeData ?? [];
  const founderAdminId = profiles.find((profile) => profile.role === "admin")?.id;
  const backups = backupEntries.map((backup, index) => ({ ...backup, hours: backupHours(index) }));

  return (
    <div className={styles.page}>
      <Header />
      <main>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>УПРАВЛЕНИЕ / ACESSO RESTRITO / 03</p>
          <h1>Painel ADM</h1>
          <p>Central de gestão do conteúdo, das pessoas e das permissões da companhia.</p>
        </section>
        <section className={styles.content}>
          <p className={styles.adminNotice}>Acesso exclusivo para administradores da Companhia Romanov.</p>
          <form className={styles.signout} action="/auth/signout" method="post"><button>Encerrar sessão</button></form>

          <div className={`${styles.toolbar} ${adminStyles.moduleHeader}`}><h2>Módulos administrativos</h2></div>
          <div className={`${styles.grid} ${adminStyles.modules}`}>
            {tools.map((tool, index) => (
              <article className={`${styles.card} ${tool.important ? adminStyles.treasuryModule : ""}`} key={tool.title}>
                <p className={styles.cardLabel}>Módulo {String(index + 1).padStart(2, "0")}</p>
                <h2>{tool.title}</h2><p>{tool.text}</p><Link className={tool.important ? adminStyles.treasuryLink : undefined} href={tool.href}>{tool.important ? "Acessar Tesouraria →" : "Gerenciar →"}</Link>
              </article>
            ))}
          </div>

          <section className={adminStyles.section} id="usuarios">
            <div className={adminStyles.sectionHeader}>
              <div><h2>Usuários e cargos</h2><p>Gerencie o nome exibido, o nível de acesso e o vínculo com um funcionário.</p></div>
              <span className={adminStyles.count}>{profiles.length} contas</span>
            </div>
            {(params.salvo || params.criado) && <p className={`${adminStyles.message} ${adminStyles.success}`}>{params.criado ? "Conta criada com sucesso." : "Perfil atualizado com sucesso."}</p>}
            {params.erro && <p className={`${adminStyles.message} ${adminStyles.error}`}>{errors[params.erro] ?? "Não foi possível concluir."}</p>}

            <form className={adminStyles.createAccount} id="nova-conta" action={createAccount}>
              <div className={adminStyles.createIntro}><small>Nova conta</small><h3>Criar acesso</h3><p>Cadastre o acesso e, se desejar, vincule-o a uma ficha existente.</p></div>
              <div className={adminStyles.field}><label>Nome exibido</label><input name="display_name" maxLength={80} /></div>
              <div className={adminStyles.field}><label>E-mail</label><input name="email" type="email" required /></div>
              <div className={adminStyles.field}><label>Senha inicial</label><input name="password" type="password" minLength={8} required /></div>
              <div className={adminStyles.field}><label>Funcionário vinculado</label><select name="employee_id" defaultValue=""><option value="">Nenhum funcionário</option>{employees.map((employee) => <option value={employee.code} key={employee.code}>{employee.name} · {employee.code}{employee.is_active ? "" : " (inativo)"}</option>)}</select></div>
              <div className={adminStyles.field}><label>Permissão</label><select name="role" defaultValue="funcionario"><option value="funcionario">Funcionário</option><option value="admin">Administrador</option></select></div>
              <button className={adminStyles.save}>Criar conta</button>
            </form>

            <div className={adminStyles.users}>
              {profiles.map((profile) => {
                const own = profile.id === current.id;
                const founder = profile.id === founderAdminId;
                const roleLocked = own || founder;
                return (
                  <form className={adminStyles.user} action={updateProfile} key={profile.id}>
                    <input type="hidden" name="id" value={profile.id} />
                    <div className={adminStyles.identity}><small>{founder ? "Administrador fundador" : own ? "Sua conta" : "Conta ativa"}</small><strong>{profile.display_name || "Sem nome definido"}</strong><span>{profile.email}</span>{founder && <b className={adminStyles.protected}>Cargo permanente</b>}</div>
                    <div className={adminStyles.field}><label>Nome exibido</label><input name="display_name" defaultValue={profile.display_name ?? ""} /></div>
                    <div className={adminStyles.field}><label>E-mail</label><input name="email" type="email" defaultValue={profile.email ?? ""} required /></div>
                    <div className={adminStyles.field}><label>Nova senha</label><input name="password" type="password" minLength={8} placeholder="Manter senha atual" /></div>
                    <div className={adminStyles.field}><label>Funcionário vinculado</label><select name="employee_id" defaultValue={profile.employee_id ?? ""}><option value="">Nenhum funcionário</option>{employees.map((employee) => <option value={employee.code} key={employee.code}>{employee.name} · {employee.code}</option>)}</select></div>
                    <div className={adminStyles.field}><label>Cargo de acesso</label>{roleLocked && <input type="hidden" name="role" value="admin" />}<select name={roleLocked ? undefined : "role"} defaultValue={profile.role} disabled={roleLocked}><option value="funcionario">Funcionário</option><option value="admin">Administrador</option></select>{founder && <small className={adminStyles.fieldHint}>Protegido contra rebaixamento</small>}</div>
                    <button className={adminStyles.save}>Salvar perfil</button>
                  </form>
                );
              })}
              {!profiles.length && <p className={adminStyles.empty}>Nenhum perfil encontrado.</p>}
            </div>
          </section>

          <section className={adminStyles.backups} aria-labelledby="backups-title">
            <div className={adminStyles.backupHeading}>
              <div>
                <p>REDUNDÂNCIA / MONITOR</p>
                <h2 id="backups-title">Backups</h2>
              </div>
              <span>Ciclo de atualização · 48 horas</span>
            </div>
            <div className={adminStyles.backupGrid}>
              {backups.map((backup, index) => (
                <article className={adminStyles.backupCard} key={backup.name}>
                  <small>{String(index + 1).padStart(2, "0")} / ARQUIVO SEGURO</small>
                  <h3>{backup.name}</h3>
                  <div className={adminStyles.backupStatus}><i aria-hidden="true" /><span>{backup.status}</span></div>
                  <p>Último arquivo de backup gerado há <strong>{backup.hours} horas</strong>.</p>
                </article>
              ))}
            </div>
          </section>

          <Link className={styles.back} href="/">← Voltar para a Home</Link>
        </section>
      </main>
    </div>
  );
}
