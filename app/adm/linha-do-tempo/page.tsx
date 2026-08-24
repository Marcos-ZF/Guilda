import Header from "../../Header";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import TimelineModal, { type TimelineEntry, type EmployeeOption } from "./TimelineModal";
import ConfirmSubmitButton from "@/app/components/ConfirmSubmitButton";
import { deleteTimelineEntry, updateServiceTime } from "./actions";
import styles from "./timeline.module.css";

type Props = { searchParams: Promise<{ criado?: string; salvo?: string; excluido?: string; tempo?: string; erro?: string }> };

export default async function TimelineAdminPage({ searchParams }: Props) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const supabase = await createClient();
  type EntryRow = Omit<TimelineEntry, "employee_ids"> & { involved: { employee_id: string }[] | null };
  const [{ data: entryRows, error }, { data: setting }, { data: employees }] = await Promise.all([
    supabase.from("timeline_entries").select("id,entry_type,entry_date,title,description,involved:timeline_entry_employees(employee_id)").order("entry_date", { ascending: false }).order("created_at", { ascending: false }).returns<EntryRow[]>(),
    supabase.from("site_settings").select("value").eq("key", "service_time").maybeSingle<{ value: string }>(),
    supabase.from("employees").select("id,code,name").eq("is_active", true).order("name").returns<EmployeeOption[]>(),
  ]);
  const entries: TimelineEntry[] = (entryRows ?? []).map(entry => ({ ...entry, employee_ids: (entry.involved ?? []).map(item => item.employee_id) }));
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return <div className={styles.page}><Header /><main className={styles.content}>
    <div className={styles.top}><div><p className={styles.eyebrow}>ADMINISTRAÇÃO / ARQUIVO PÚBLICO</p><h1>Linha do tempo</h1></div><TimelineModal today={today} employees={employees ?? []} /></div>
    {error && <p className={`${styles.message} ${styles.error}`}>A estrutura ainda não foi criada no Supabase. Execute o novo arquivo SQL entregue junto do projeto.</p>}
    {(params.criado || params.salvo || params.excluido || params.tempo) && <p className={styles.message}>{params.tempo ? "Tempo de serviço atualizado." : params.excluido ? "Registro excluído." : params.criado ? "Registro criado." : "Registro atualizado."}</p>}
    {params.erro && <p className={`${styles.message} ${styles.error}`}>Não foi possível concluir. Confira os dados e tente novamente.</p>}
    <form className={styles.setting} action={updateServiceTime}><div><h2>Tempo de serviço</h2><p>Este valor aparece no terceiro contador da página principal.</p></div><label>Valor exibido<input name="service_time" defaultValue={setting?.value ?? "08"} maxLength={30} required /></label><button>Salvar valor</button></form>
    <section className={styles.list}>{entries.map(entry => <article className={styles.entry} key={entry.id}><span className={styles.date}>{new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${entry.entry_date}T00:00:00Z`))}</span><span className={styles.type}>{entry.entry_type}</span><div><h2>{entry.title}</h2><p>{entry.description}</p></div><div className={styles.controls}><TimelineModal entry={entry} today={today} employees={employees ?? []} /><form action={deleteTimelineEntry}><input type="hidden" name="id" value={entry.id} /><ConfirmSubmitButton className={styles.delete} message={`O registro “${entry.title}” será removido da linha do tempo.`}>Excluir</ConfirmSubmitButton></form></div></article>)}{!error && !entries.length && <p className={styles.empty}>Nenhum registro publicado.</p>}</section>
    <Link className={styles.back} href="/adm">← Voltar ao painel ADM</Link>
  </main></div>;
}
