import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Header from "../Header";
import ImageCropInput from "../components/ImageCropInput";
import styles from "../internal.module.css";
import profileStyles from "./perfil.module.css";
import { updateOwnAccount } from "./actions";

type Props = { searchParams: Promise<{ salvo?: string; erro?: string }> };
type Employee = { id: string; code: string; name: string; role_title: string; position_title: string | null; honor_title: string | null; specialty: string; photo_url: string | null; employee_status: string; created_at: string };
type Achievement = { id: string; title: string; description: string; sort_order: number };
type Report = { id: string; title: string; report_date: string; summary: string; author_employee_id: string };
type Subsidiary = { id: string; code: string; name: string; status: string; location: string };

const reportDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
const errorMessages: Record<string, string> = {
  dados: "Confira o e-mail, o nome e use uma senha com pelo menos 8 caracteres.",
  imagem: "Não foi possível salvar a foto. Use JPG, PNG, WebP ou GIF de até 5 MB.",
  auth: "Não foi possível alterar as credenciais desta conta.",
  salvar: "As credenciais foram alteradas, mas o perfil não pôde ser atualizado.",
};

const honorClasses: Record<string, string> = {
  Katyusha: profileStyles.honorKatyusha,
  Ilya: profileStyles.honorIlya,
  Dobrynya: profileStyles.honorDobrynya,
  Alyosha: profileStyles.honorAlyosha,
  Rasputin: profileStyles.honorRasputin,
  "Baba Yaga": profileStyles.honorBabaYaga,
  Vasilisa: profileStyles.honorVasilisa,
};

function formatServiceTime(createdAt: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000));
  if (days < 30) return `${days} ${days === 1 ? "dia" : "dias"}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return remainingMonths ? `${years}a ${remainingMonths}m` : `${years} ${years === 1 ? "ano" : "anos"}`;
}

export default async function ProfilePage({ searchParams }: Props) {
  const profile = await requireRole(["funcionario", "admin"]);
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: accountData }, { data: employeeData }] = await Promise.all([
    supabase.from("profiles").select("avatar_url").eq("id", profile.id).maybeSingle<{ avatar_url: string | null }>(),
    profile.employee_id
      ? supabase.from("employees").select("id,code,name,role_title,position_title,honor_title,specialty,photo_url,employee_status,created_at").eq("code", profile.employee_id).maybeSingle<Employee>()
      : Promise.resolve({ data: null }),
  ]);

  const employee = employeeData as Employee | null;
  let achievements: Achievement[] = [];
  let reports: Report[] = [];
  let subsidiaries: Subsidiary[] = [];

  if (employee) {
    const [achievementResult, authoredReportsResult, subsidiaryResult, involvementResult] = await Promise.all([
      supabase.from("employee_achievements").select("id,title,description,sort_order").eq("employee_id", employee.id).order("sort_order"),
      supabase.from("reports").select("id,title,report_date,summary,author_employee_id").eq("author_employee_id", employee.id).order("report_date", { ascending: false }),
      supabase.from("subsidiaries").select("id,code,name,status,location").eq("responsible_employee_id", employee.id).order("name"),
      supabase.from("timeline_entry_employees").select("timeline_entry_id").eq("employee_id", employee.id),
    ]);

    achievements = (achievementResult.data ?? []) as Achievement[];
    subsidiaries = (subsidiaryResult.data ?? []) as Subsidiary[];
    const authoredReports = (authoredReportsResult.data ?? []) as Report[];
    const timelineIds = (involvementResult.data ?? []).map((item) => item.timeline_entry_id as string);
    let involvedReports: Report[] = [];

    if (timelineIds.length > 0) {
      const { data: timelineSources } = await supabase.from("timeline_entries").select("source_id").eq("source_type", "report").in("id", timelineIds);
      const reportIds = (timelineSources ?? []).map((item) => item.source_id as string | null).filter((id): id is string => Boolean(id));
      if (reportIds.length > 0) {
        const { data } = await supabase.from("reports").select("id,title,report_date,summary,author_employee_id").in("id", reportIds).order("report_date", { ascending: false });
        involvedReports = (data ?? []) as Report[];
      }
    }

    reports = Array.from(new Map([...authoredReports, ...involvedReports].map((report) => [report.id, report])).values())
      .sort((a, b) => b.report_date.localeCompare(a.report_date));
  }

  const initials = (profile.display_name || profile.email || "C").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <div className={styles.page}>
      <Header />
      <main>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>CONTA / PERFIL / 05</p>
          <h1>Meu perfil</h1>
          <p>Gerencie sua identidade de acesso e consulte sua área na Companhia.</p>
        </section>

        <section className={styles.content}>
          {params.salvo && <p className={profileStyles.success}>Perfil atualizado. Se alterou o e-mail, confirme a mudança pela mensagem enviada.</p>}
          {params.erro && <p className={profileStyles.error}>{errorMessages[params.erro] ?? "Não foi possível atualizar o perfil."}</p>}

          <form className={profileStyles.form} action={updateOwnAccount}>
            <div className={profileStyles.accountIntro}>
              <small>Conta atual</small>
              <h2>{profile.display_name || "Sem nome definido"}</h2>
              <p>{profile.role === "admin" ? "Administrador" : "Funcionário"}</p>
            </div>

            <div className={profileStyles.avatarColumn}>
              <div className={profileStyles.avatarPreview} style={accountData?.avatar_url ? { backgroundImage: `url(${accountData.avatar_url})` } : undefined} aria-label="Foto atual do perfil">
                {!accountData?.avatar_url && <span>{initials}</span>}
              </div>
              <ImageCropInput name="avatar" label="Foto do perfil" aspect={1} outputWidth={1000} quality={0.9} />
              <p className={profileStyles.avatarHelp}>Esta imagem aparece apenas na conta e no cabeçalho. Ela não altera a foto da ficha.</p>
            </div>

            <div className={profileStyles.loginFields}>
              <label>Nome exibido<input name="display_name" defaultValue={profile.display_name ?? ""} maxLength={80} /></label>
              <label>E-mail<input name="email" type="email" defaultValue={profile.email ?? ""} required /></label>
              <label>Nova senha <span>(opcional)</span><input name="password" type="password" minLength={8} placeholder="Deixe vazio para manter a atual" /></label>
            </div>
            <button type="submit">Salvar alterações</button>
          </form>

          <section className={profileStyles.dashboard}>
            <div className={profileStyles.dashboardHeading}>
              <p>ÁREA PESSOAL / ARQUIVO VINCULADO</p>
              <h2>Minha Companhia</h2>
              <span>Seu histórico e suas responsabilidades reunidos em um único lugar.</span>
            </div>

            {employee ? (
              <>
                <Link className={profileStyles.employeeCard} href={`/funcionarios/${employee.code}`}>
                  <div className={profileStyles.employeePhoto} style={employee.photo_url ? { backgroundImage: `url(${employee.photo_url})` } : undefined}>
                    {!employee.photo_url && <span>{employee.name.slice(0, 2).toUpperCase()}</span>}
                  </div>
                  <div>
                    <small>Sua ficha / {employee.code}</small>
                    <h3>{employee.name}</h3>
                    <p>{employee.position_title || employee.role_title}</p>
                    <strong>{employee.employee_status === "inactive" ? "Inativo" : employee.employee_status === "deceased" ? "Falecido" : "Ativo"}</strong>
                  </div>
                  <b>Abrir ficha →</b>
                </Link>

                <section className={profileStyles.operationalSummary}>
                  <div className={profileStyles.summaryHeading}>
                    <p>RESUMO OPERACIONAL</p>
                    <h3>Estatísticas pessoais</h3>
                  </div>
                  <div className={profileStyles.summaryGrid}>
                    <div><small>Tempo de serviço</small><strong>{formatServiceTime(employee.created_at)}</strong></div>
                    <div><small>Feitos</small><strong>{String(achievements.length).padStart(2, "0")}</strong></div>
                    <div><small>Relatórios</small><strong>{String(reports.length).padStart(2, "0")}</strong></div>
                    <div><small>Subsidiárias</small><strong>{String(subsidiaries.length).padStart(2, "0")}</strong></div>
                    <div className={profileStyles.rankStat}><small>Cargo</small><strong><i />{employee.position_title || "Não informado"}</strong></div>
                    <div className={`${profileStyles.rankStat} ${employee.honor_title ? honorClasses[employee.honor_title] ?? "" : ""}`}><small>Cargo de honra</small><strong><i />{employee.honor_title || "Sem cargo de honra"}</strong></div>
                  </div>
                </section>

                <div className={profileStyles.dashboardGrid}>
                  <article className={profileStyles.panel}>
                    <header><span>01</span><h3>Feitos</h3><b>{String(achievements.length).padStart(2, "0")}</b></header>
                    <div className={profileStyles.panelList}>
                      {achievements.length ? achievements.map((achievement, index) => (
                        <div className={profileStyles.listItem} key={achievement.id}>
                          <small>{String(index + 1).padStart(2, "0")}</small>
                          <div><strong>{achievement.title}</strong>{achievement.description && <p>{achievement.description}</p>}</div>
                        </div>
                      )) : <p className={profileStyles.empty}>Nenhum feito registrado.</p>}
                    </div>
                  </article>

                  <article className={profileStyles.panel}>
                    <header><span>02</span><h3>Relatórios</h3><b>{String(reports.length).padStart(2, "0")}</b></header>
                    <div className={profileStyles.panelList}>
                      {reports.length ? reports.map((report) => (
                        <Link className={profileStyles.listItem} href={`/relatorios/${report.id}`} key={report.id}>
                          <small>{reportDate.format(new Date(`${report.report_date}T00:00:00Z`))}</small>
                          <div><strong>{report.title}</strong><p>{report.summary}</p></div>
                        </Link>
                      )) : <p className={profileStyles.empty}>Nenhuma participação em relatórios.</p>}
                    </div>
                  </article>

                  <article className={profileStyles.panel}>
                    <header><span>03</span><h3>Subsidiárias</h3><b>{String(subsidiaries.length).padStart(2, "0")}</b></header>
                    <div className={profileStyles.panelList}>
                      {subsidiaries.length ? subsidiaries.map((subsidiary) => (
                        <Link className={profileStyles.listItem} href={`/subsidiarias/${subsidiary.code}`} key={subsidiary.id}>
                          <small>{subsidiary.code}</small>
                          <div><strong>{subsidiary.name}</strong><p>{subsidiary.location || "Localização não informada"}</p><em>{subsidiary.status}</em></div>
                        </Link>
                      )) : <p className={profileStyles.empty}>Nenhuma subsidiária sob sua responsabilidade.</p>}
                    </div>
                  </article>
                </div>
              </>
            ) : (
              <div className={profileStyles.noEmployee}>
                <strong>Nenhuma ficha vinculada a esta conta.</strong>
                <p>Um administrador pode realizar o vínculo pelo painel administrativo.</p>
              </div>
            )}
          </section>

          <Link className={styles.back} href="/">← Voltar para a Home</Link>
        </section>
      </main>
    </div>
  );
}
