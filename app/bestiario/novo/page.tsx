import Header from "@/app/Header";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import CreatureForm from "../CreatureForm";
import { type EmployeeOption } from "../model";
import styles from "../bestiario.module.css";

export default async function NewCreaturePage() {
  await requireRole(["funcionario", "admin"]);
  const supabase = await createClient();
  const { data, error } = await supabase.from("employees").select("id,code,name").order("name").returns<EmployeeOption[]>();
  return <><Header /><main className={styles.detail}><p className={styles.kicker}>Bestiário / Novo registro</p><h1>Nova criatura</h1>{error ? <p className={styles.error}>Não foi possível carregar os responsáveis. Tente novamente.</p> : <CreatureForm employees={data ?? []} />}</main></>;
}
