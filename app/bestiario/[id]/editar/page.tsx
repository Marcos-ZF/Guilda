import { notFound, redirect } from "next/navigation";
import Header from "@/app/Header";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import CreatureForm from "../../CreatureForm";
import { canEditCreature, uuidPattern, type Creature, type EmployeeOption } from "../../model";
import styles from "../../bestiario.module.css";

export default async function EditCreaturePage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(["funcionario", "admin"]);
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const supabase = await createClient();
  const { data: creature, error } = await supabase.from("bestiary_creatures").select("*").eq("id", id).maybeSingle<Creature>();
  if (error) return <><Header /><main className={styles.detail}><p className={styles.error}>Não foi possível carregar o registro. Tente novamente.</p></main></>;
  if (!creature) notFound();
  if (!canEditCreature(profile, creature)) redirect(`/bestiario/${id}`);
  const { data: employees, error: employeeError } = await supabase.from("employees").select("id,code,name").order("name").returns<EmployeeOption[]>();
  return <><Header /><main className={styles.detail}><p className={styles.kicker}>Bestiário / {creature.name}</p><h1>Editar criatura</h1>{employeeError ? <p className={styles.error}>Não foi possível carregar os responsáveis.</p> : <CreatureForm creature={creature} employees={employees ?? []} />}</main></>;
}
