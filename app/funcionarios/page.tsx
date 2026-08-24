import Header from "../Header";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import LiveNameSearch from "../components/LiveNameSearch";
import styles from "../internal.module.css";
import employeeStyles from "./funcionarios.module.css";

type Employee = {
  id: string;
  code: string;
  initials: string;
  name: string;
  role_title: string;
  position_title: string | null;
  honor_title: string | null;
  specialty: string;
  photo_url: string | null;
  employee_status: "active" | "inactive" | "deceased";
};

const fallbackEmployees: Employee[] = [
  { id: "rr01", code: "RR01", initials: "RR", name: "Rodion Romanovich", role_title: "Comandante", position_title: "Guildmaster", honor_title: null, specialty: "Estratégia e liderança", photo_url: null, employee_status: "active" },
  { id: "vm02", code: "VM02", initials: "VM", name: "Vera Morozova", role_title: "Vigia-Mor", position_title: null, honor_title: null, specialty: "Exploração e reconhecimento", photo_url: null, employee_status: "active" },
  { id: "dm03", code: "DM03", initials: "DM", name: "Dimitri Markov", role_title: "Guardião", position_title: null, honor_title: null, specialty: "Defesa e linha de frente", photo_url: null, employee_status: "active" },
  { id: "ak04", code: "AK04", initials: "AK", name: "Anya Kuznetsova", role_title: "Arquivista", position_title: null, honor_title: null, specialty: "Pesquisa e documentação", photo_url: null, employee_status: "active" },
];

type Props = { searchParams: Promise<{ busca?: string }> };

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function EmployeeCard({ employee, index, memorial = false, inactive = false }: { employee: Employee; index: number; memorial?: boolean; inactive?: boolean }) {
  return (
    <Link className={`${employeeStyles.card} ${memorial ? employeeStyles.memorialCard : ""} ${inactive ? employeeStyles.inactiveCard : ""}`} href={`/funcionarios/${employee.code}`}>
      <div className={employeeStyles.portrait} style={employee.photo_url ? { backgroundImage: `url("${employee.photo_url}")` } : undefined}>
        {!employee.photo_url && <span className={employeeStyles.initials}>{employee.initials}</span>}
        <small className={employeeStyles.number}>{String(index + 1).padStart(2, "0")}</small>
      </div>
      <div className={employeeStyles.info}>
        <p className={employeeStyles.role}>{memorial ? "In memoriam" : inactive ? `Inativo · ${employee.position_title || employee.role_title}` : employee.position_title || employee.role_title}{employee.honor_title ? ` · ${employee.honor_title}` : ""}</p>
        <h2>{employee.name}</h2>
        <span className={employeeStyles.specialty}>{employee.specialty}</span>
      </div>
      <span className={employeeStyles.open}>{memorial ? "Abrir memorial" : "Abrir ficha"} →</span>
    </Link>
  );
}

export default async function EmployeesPage({ searchParams }: Props) {
  await connection();
  const params = await searchParams;
  let employees = fallbackEmployees;

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("employees")
      .select("id, code, initials, name, role_title, position_title, honor_title, specialty, photo_url, employee_status")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .returns<Employee[]>();

    if (data?.length) employees = data;
  }

  const search = normalizeSearch(params.busca?.trim() ?? "");
  const visibleEmployees = search
    ? employees.filter((employee) => normalizeSearch(employee.name).includes(search))
    : employees;
  const activeEmployees = visibleEmployees.filter((employee) => employee.employee_status === "active");
  const inactiveEmployees = visibleEmployees.filter((employee) => employee.employee_status === "inactive");
  const normalEmployees = [...activeEmployees, ...inactiveEmployees];
  const deceasedEmployees = visibleEmployees.filter((employee) => employee.employee_status === "deceased");

  return (
    <div className={styles.page}>
      <Header />
      <main>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>АРХИВ / PESSOAL / 01</p>
          <h1>Funcionários</h1>
          <p>Registro oficial das pessoas, funções e especialidades que mantêm a Companhia Romanov em operação.</p>
        </section>
        <section className={styles.content}>
          <LiveNameSearch path="/funcionarios" initialValue={params.busca} label="Pesquisar funcionário por nome" />
          <div className={employeeStyles.roster}>
            {normalEmployees.map((employee, index) => <EmployeeCard employee={employee} index={index} inactive={employee.employee_status === "inactive"} key={employee.id} />)}
            {!normalEmployees.length && <p className={employeeStyles.empty}>Nenhum funcionário encontrado.</p>}
          </div>
          <Link className={styles.back} href="/">← Voltar para a Home</Link>
          {deceasedEmployees.length > 0 && (
            <>
              <div className={employeeStyles.memorialDivider} />
              <section className={employeeStyles.memorial}>
                <p>Arquivo de memória</p>
                <h2>Memorial</h2>
                <span>Fichas preservadas dos funcionários falecidos da Companhia Romanov.</span>
                <div className={`${employeeStyles.roster} ${employeeStyles.memorialRoster}`}>
                  {deceasedEmployees.map((employee, index) => <EmployeeCard employee={employee} index={index} memorial key={employee.id} />)}
                </div>
              </section>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
