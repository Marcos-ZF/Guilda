import Header from "@/app/Header";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createEmployee, toggleEmployeeStatus } from "./actions";
import styles from "../../internal.module.css";
import employeeStyles from "./funcionarios-admin.module.css";

type Employee = {
  id: string;
  code: string;
  name: string;
  role_title: string;
  position_title: string | null;
  honor_title: string | null;
  specialty: string;
  initials: string;
  is_active: boolean;
  employee_status: "active" | "inactive" | "deceased";
  sort_order: number;
  photo_url: string | null;
};

type PageProps = {
  searchParams: Promise<{ criado?: string; salvo?: string; erro?: string }>;
};

const errors: Record<string, string> = {
  dados: "Preencha todos os campos corretamente.",
  codigo: "Já existe um funcionário usando esse código.",
  salvar: "Não foi possível salvar. Execute primeiro o arquivo SQL incluído no projeto.",
};

export default async function AdminEmployeesPage({ searchParams }: PageProps) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select("id, code, name, role_title, position_title, honor_title, specialty, initials, is_active, employee_status, sort_order, photo_url")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .returns<Employee[]>();
  const employees = data ?? [];

  return (
    <div className={styles.page}>
      <Header />
      <main>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>УПРАВЛЕНИЕ / PESSOAL / 04</p>
          <h1>Gerenciar funcionários</h1>
          <p>Cadastre os integrantes exibidos no arquivo público da Companhia Romanov.</p>
        </section>

        <section className={styles.content}>
          {(params.criado || params.salvo) && <p className={`${employeeStyles.message} ${employeeStyles.success}`}>Alteração concluída com sucesso.</p>}
          {params.erro && <p className={`${employeeStyles.message} ${employeeStyles.error}`} role="alert">{errors[params.erro] ?? "Não foi possível concluir a alteração."}</p>}

          <section className={employeeStyles.intro} id="novo">
            <div>
              <h2>Novo funcionário</h2>
              <p className={employeeStyles.introText}>As informações cadastradas aqui aparecem automaticamente na página pública de funcionários.</p>
            </div>
            <form className={employeeStyles.form} action={createEmployee}>
              <div className={`${employeeStyles.field} ${employeeStyles.wide}`}><label htmlFor="code">Código</label><input id="code" name="code" placeholder="Ex.: RR05" maxLength={20} required /></div>
              <div className={`${employeeStyles.field} ${employeeStyles.wide}`}><label htmlFor="name">Nome completo</label><input id="name" name="name" maxLength={80} required /></div>
              <div className={employeeStyles.field}><label htmlFor="role_title">Função (Classe)</label><input id="role_title" name="role_title" placeholder="Ex.: Guerreiro" maxLength={80} required /></div>
              <div className={employeeStyles.field}><label htmlFor="sort_order">Ordem de exibição</label><input id="sort_order" name="sort_order" type="number" min="0" max="999" defaultValue="10" required /></div>
              <div className={employeeStyles.field}><label htmlFor="position_title">Cargo</label><input id="position_title" name="position_title" placeholder="Ex.: Comandante" maxLength={80} /></div>
              <div className={employeeStyles.field}><label htmlFor="honor_title">Cargo de Honra</label><select id="honor_title" name="honor_title" defaultValue=""><option value="">Sem cargo de honra</option>{["Katyusha","Ilya","Dobrynya","Alyosha","Rasputin","Baba Yaga","Vasilisa"].map(title=><option key={title}>{title}</option>)}</select></div>
              <div className={`${employeeStyles.field} ${employeeStyles.wide}`}><label htmlFor="specialty">Especialidade</label><input id="specialty" name="specialty" maxLength={160} required /></div>
              <button className={`${employeeStyles.submit} ${employeeStyles.wide}`} type="submit">Cadastrar funcionário →</button>
            </form>
          </section>

          <section id="lista">
            <div className={employeeStyles.listHeader}>
              <div><h2>Arquivo de pessoal</h2><p>Ativos aparecem na lista principal, inativos ficam arquivados e falecidos passam ao Memorial público.</p></div>
              <span>{employees.length} registros</span>
            </div>
            <div className={employeeStyles.list}>
              {employees.map((employee) => (
                <article className={employeeStyles.employee} key={employee.id}>
                  <div className={employeeStyles.badge} style={employee.photo_url ? { backgroundImage: `url("${employee.photo_url}")` } : undefined}>{!employee.photo_url && employee.initials}</div>
                  <div className={employeeStyles.employeeInfo}>
                    <small>{employee.code} · {employee.position_title||"Sem cargo"}{employee.honor_title?` · ${employee.honor_title}`:""}</small>
                    <h3>{employee.name}</h3>
                    <p>Função (Classe): {employee.role_title}<br/>{employee.specialty}</p>
                    <div className={employeeStyles.meta}>
                      <span className={`${employeeStyles.status} ${employee.employee_status === "active" ? "" : employeeStyles.inactive}`}>{employee.employee_status === "active" ? "Ativo" : employee.employee_status === "deceased" ? "Falecido" : "Inativo"}</span>
                      <form className={employeeStyles.toggle} action={toggleEmployeeStatus}>
                        <input type="hidden" name="id" value={employee.id} />
                        <select name="employee_status" defaultValue={employee.employee_status} aria-label={`Status de ${employee.name}`}>
                          <option value="active">Ativo</option>
                          <option value="inactive">Inativo</option>
                          <option value="deceased">Falecido</option>
                        </select>
                        <button type="submit">Salvar status</button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
              {employees.length === 0 && <p className={employeeStyles.empty}>Nenhum funcionário cadastrado.</p>}
            </div>
          </section>

          <Link className={styles.back} href="/adm">← Voltar ao painel ADM</Link>
        </section>
      </main>
    </div>
  );
}
