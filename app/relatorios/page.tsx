import Header from "../Header";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import LiveNameSearch from "../components/LiveNameSearch";
import ReportCreateModal from "./ReportCreateModal";
import styles from "../internal.module.css";
import reportStyles from "./relatorios.module.css";

type Report = { id: string; title: string; report_date: string; summary: string; document_url: string; author_employee_id: string };
type Employee = { id: string; code: string; name: string };
type Props = { searchParams: Promise<{ criado?: string; excluido?: string; erro?: string; busca?: string }> };

const date = (value: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export default async function ReportsPage({ searchParams }: Props) {
  const profile = await requireRole(["funcionario", "admin"]);
  const params = await searchParams;
  const supabase = await createClient();
  const [{ data: reportData, error }, { data: employeeData }] = await Promise.all([
    supabase.from("reports").select("id, title, report_date, summary, document_url, author_employee_id").order("report_date", { ascending: false }).returns<Report[]>(),
    supabase.from("employees").select("id, code, name").eq("is_active", true).order("name").returns<Employee[]>(),
  ]);
  const reports = reportData ?? [];
  const employees = employeeData ?? [];
  const names = new Map(employees.map((employee) => [employee.id, employee.name]));
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const search = normalizeSearch(params.busca?.trim() ?? "");
  const visibleReports = search
    ? reports.filter((report) => normalizeSearch(report.title).includes(search))
    : reports;

  return (
    <div className={styles.page}>
      <Header />
      <main>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>ДОКУМЕНТЫ / ACESSO INTERNO / 02</p>
          <h1>Relatórios</h1>
          <p>Índice dos documentos oficiais da companhia. O conteúdo completo permanece organizado no Google Docs.</p>
        </section>
        <section className={styles.content}>
          <p className={styles.adminNotice}>Acesso permitido para funcionários e administradores autenticados.</p>
          {(params.criado || params.excluido) && <p className={reportStyles.success}>{params.excluido ? "Relatório excluído." : "Relatório criado."}</p>}
          {(params.erro || error) && <p className={reportStyles.error}>Não foi possível carregar ou salvar. Execute primeiro o SQL de relatórios no Supabase.</p>}
          <div className={styles.toolbar}>
            <h2>Documentos recentes</h2>
            {profile.role === "admin" && <ReportCreateModal employees={employees} today={today} />}
          </div>
          <LiveNameSearch path="/relatorios" initialValue={params.busca} label="Pesquisar relatório por nome" />
          <div className={styles.grid}>
            {visibleReports.map((report) => (
              <Link className={`${styles.card} ${reportStyles.card}`} href={`/relatorios/${report.id}`} key={report.id}>
                <p className={styles.cardLabel}>Relatório · {date(report.report_date)}</p>
                <h2>{report.title}</h2>
                <p className={reportStyles.clamp}>{report.summary}</p>
                <div className={styles.cardMeta}><span>{names.get(report.author_employee_id) || "Funcionário"}</span><span>Abrir relatório →</span></div>
              </Link>
            ))}
            {!visibleReports.length && !error && <p className={reportStyles.empty}>Nenhum relatório encontrado.</p>}
          </div>
          <Link className={styles.back} href="/">← Voltar para a Home</Link>
        </section>
      </main>
    </div>
  );
}
