import Link from "next/link";
import Header from "../Header";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import CreatureDirectory from "./CreatureDirectory";
import BestiaryManual from "./BestiaryManual";
import { type Creature, type EmployeeOption } from "./model";
import layout from "../internal.module.css";
import styles from "./bestiario.module.css";
export const dynamic = "force-dynamic";
type Row = Pick<Creature, "id" | "name" | "category" | "threat" | "image_path" | "discoverer_employee_id">;

export default async function BestiaryPage({ searchParams }: { searchParams: Promise<{ excluido?: string; erro?: string }> }) {
  const profile = await requireRole(["aliado", "funcionario", "admin"]);
  const params = await searchParams;
  const supabase = await createClient();
  const [{ data, error }, { data: employees, error: employeeError }] = await Promise.all([
    supabase.from("bestiary_creatures").select("id,name,category,threat,image_path,discoverer_employee_id").order("name").returns<Row[]>(),
    supabase.from("employees").select("id,code,name").returns<EmployeeOption[]>(),
  ]);
  const rows = data ?? [];
  const { data: images } = rows.length ? await supabase.storage.from("bestiary-media").createSignedUrls(rows.map(item => item.image_path), 3600) : { data: [] };
  const imageUrls = new Map((images ?? []).map(image => [image.path, image.signedUrl]));
  const names = new Map((employees ?? []).map(employee => [employee.id, employee.name]));
  return <div className={layout.page}><Header /><main>
    <section className={layout.hero}><p className={layout.eyebrow}>ARQUIVO DE CAMPO / ACESSO INTERNO</p><h1>Bestiário</h1><p>Criaturas encontradas pela companhia, suas habilidades e estratégias de combate.</p></section>
    <section className={layout.content}>
      <div className={styles.toolbar}><h2>Arquivo de criaturas</h2><div className={styles.toolbarActions}><BestiaryManual />{profile.role !== "aliado" && <Link className={styles.button} href="/bestiario/novo">Nova criatura</Link>}</div></div>
      <p className={styles.notice}>{profile.role === "aliado" ? "Acesso de aliado: consulta do Bestiário, sem permissão para alterações." : "Funcionários podem cadastrar e editar os próprios registros. A administração gerencia todo o arquivo."}</p>
      {params.excluido && <p className={styles.notice}>Criatura excluída.</p>}
      {params.erro && <p role="alert" className={styles.error}>Não foi possível excluir o registro.</p>}
      {error || employeeError ? <p role="alert" className={styles.error}>Não foi possível carregar o Bestiário. Se esta é a primeira publicação, execute o SQL do Bestiário no Supabase.</p> : <CreatureDirectory creatures={rows.map(item => ({ id: item.id, name: item.name, category: item.category, threat: item.threat, imageUrl: imageUrls.get(item.image_path) || null, responsibleName: names.get(item.discoverer_employee_id ?? "") || null }))} />}
      <Link className={layout.back} href="/">← Voltar para a Home</Link>
    </section>
  </main></div>;
}
