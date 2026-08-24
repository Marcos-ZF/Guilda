import Header from "../Header";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import LiveNameSearch from "../components/LiveNameSearch";
import SubsidiaryCreateModal from "./SubsidiaryCreateModal";
import styles from "./subsidiarias.module.css";

type Subsidiary = {
  id: string;
  code: string;
  name: string;
  description: string;
  location: string;
  status: string;
  image_url: string | null;
  responsible_employee_id: string;
};

type Employee = { id: string; code: string; name: string };
type Props = { searchParams: Promise<{ erro?: string; excluido?: string; busca?: string }> };

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export default async function SubsidiariesPage({ searchParams }: Props) {
  const profile = await getCurrentProfile();
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data }, { data: employees }] = await Promise.all([
    supabase
      .from("subsidiaries")
      .select("id,code,name,description,location,status,image_url,responsible_employee_id")
      .order("code")
      .returns<Subsidiary[]>(),
    supabase.from("employees").select("id,code,name").eq("is_active", true).order("name").returns<Employee[]>(),
  ]);
  const list = data ?? [];
  const employeeList = employees ?? [];
  const names = new Map(employeeList.map((employee) => [employee.id, employee.name]));
  const search = normalizeSearch(query.busca?.trim() ?? "");
  const visibleSubsidiaries = search
    ? list.filter((item) => normalizeSearch(item.name).includes(search))
    : list;

  return (
    <div className={styles.page}>
      <Header />
      <main>
        <section className={styles.hero}>
          <p>ESTRUTURA / COMPANHIA / 06</p>
          <h1>Subsidiárias</h1>
          <span>Setores especializados vinculados à Companhia de Sideria.</span>
        </section>
        <section className={styles.content}>
          {query.excluido && <p className={styles.message}>Subsidiária excluída.</p>}
          {query.erro && <p className={styles.message}>Não foi possível concluir. Verifique os campos e o SQL do Supabase.</p>}
          <div className={styles.heading}>
            <div><small>ARQUIVO DE ESTRUTURA</small><h2>Unidades registradas</h2></div>
            {profile?.role === "admin" && <SubsidiaryCreateModal employees={employeeList} />}
          </div>
          <LiveNameSearch path="/subsidiarias" initialValue={query.busca} label="Pesquisar subsidiária por nome" />
          <div className={styles.grid}>
            {visibleSubsidiaries.map((item, index) => (
              <Link className={styles.card} href={`/subsidiarias/${item.code}`} key={item.id}>
                <div className={styles.image} style={item.image_url ? { backgroundImage: `url("${item.image_url}")` } : undefined}>
                  <b>{String(index + 1).padStart(2, "0")}</b><span>{item.code}</span>
                </div>
                <div className={styles.info}>
                  <small>{item.status} · {item.location || "Local não informado"}</small>
                  <h2>{item.name}</h2>
                  <p>{item.description || "Subsidiária sem descrição cadastrada."}</p>
                  <footer><span>{names.get(item.responsible_employee_id) || "Responsável"}</span><b>Abrir arquivo →</b></footer>
                </div>
              </Link>
            ))}
            {!visibleSubsidiaries.length && <p className={styles.empty}>Nenhuma subsidiária encontrada.</p>}
          </div>
          <Link className={styles.back} href="/">← Voltar para a Home</Link>
        </section>
      </main>
    </div>
  );
}
