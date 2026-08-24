import Header from "./Header";
import Image from "next/image";
import ContactModal from "./ContactModal";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

type TimelinePerson = { id: string; code: string; name: string };
type TimelineView = { type: string; day: string; month: string; year: string; title: string; text: string; people: TimelinePerson[] };

const fallbackTimeline: TimelineView[] = [
  { type: "COMUNICADO", day: "21", month: "AGO", year: "2026", title: "Assembleia geral convocada", text: "Todos os funcionários devem apresentar-se no salão principal para a definição das próximas operações.", people: [] },
  { type: "FEITO", day: "18", month: "AGO", year: "2026", title: "A passagem de Valebruma", text: "A rota entre os povoados do norte foi restaurada e declarada segura.", people: [] },
  { type: "NOVO FUNCIONÁRIO", day: "14", month: "AGO", year: "2026", title: "Sienna Ember integra o arquivo", text: "A pesquisadora assume a função de Arquivista da Companhia Romanov.", people: [] },
  { type: "RELATÓRIO", day: "02", month: "AGO", year: "2026", title: "Ruínas do Santuário", text: "Inventário preliminar dos artefatos recuperados durante a expedição.", people: [] },
  { type: "FEITO", day: "24", month: "JUL", year: "2026", title: "O sino perdido de Eredan", text: "A relíquia foi recuperada e devolvida ao povo de Eredan.", people: [] },
  { type: "COMUNICADO", day: "17", month: "JUL", year: "2026", title: "Treinamento em dois turnos", text: "O salão de treinamento passa a operar em dois turnos nos dias úteis.", people: [] },
];

type TimelineEntry = { id: string; entry_type: string; entry_date: string; title: string; description: string; involved: { employee: TimelinePerson | TimelinePerson[] | null }[] | null };
type HomeMetrics = { employees?: number; reports?: number; service_time?: string };

function timelineDate(value: string) {
  const parts = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).formatToParts(new Date(`${value}T00:00:00Z`));
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? "";
  return { day: read("day"), month: read("month").replace(".", "").toUpperCase(), year: read("year") };
}

function Crest() {
  return <Image className={styles.crest} src="/guilda-romanov.png" width={96} height={96} alt="" aria-hidden="true" />;
}

export default async function Home() {
  let metrics: HomeMetrics = { employees: 0, reports: 0, service_time: "08" };
  let timeline = fallbackTimeline;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const supabase = await createClient();
    const [{ data: metricData }, { data: timelineData }] = await Promise.all([
      supabase.rpc("home_metrics"),
      supabase.from("timeline_entries").select("id,entry_type,entry_date,title,description,involved:timeline_entry_employees(employee:employees(id,code,name))").order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(40).returns<TimelineEntry[]>(),
    ]);
    if (metricData && typeof metricData === "object") metrics = metricData as HomeMetrics;
    if (timelineData?.length) timeline = timelineData.map(item => ({ type: item.entry_type.toUpperCase(), ...timelineDate(item.entry_date), title: item.title, text: item.description, people: (item.involved ?? []).flatMap(link => Array.isArray(link.employee) ? link.employee : link.employee ? [link.employee] : []) }));
  }
  const employeeCount = String(metrics.employees ?? 0).padStart(2, "0");
  const reportCount = String(metrics.reports ?? 0).padStart(2, "0");
  const serviceTime = String(metrics.service_time || "08");
  return (
    <div className={styles.page}>
      <Header />
      <main>
        <section className={styles.hero} id="inicio">
          <div className={styles.posterRay} aria-hidden="true" />
          <div className={styles.heroContent}>
            <p className={styles.kicker}>Companhia de Sideria</p>
            <h1>
              <span>Companhia</span>
              <strong aria-label="Romanov">
                <Image className={styles.heroTitleMark} src="/guilda-romanov.png" width={190} height={190} alt="" aria-hidden="true" priority />
                <b aria-hidden="true">omanov</b>
              </strong>
            </h1>
            <p className={styles.motto}>СИЛА <i /> ПОРЯДОК <i /> ПАМЯТЬ</p>
            <p className={styles.heroText}>Força para avançar. Ordem para permanecer. Memória para que nenhum feito seja esquecido.</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#sobre">Abrir arquivo institucional</a>
              <a className={styles.textLink} href="#linha-do-tempo">Registros recentes ↓</a>
            </div>
          </div>
        </section>

        <section className={styles.about} id="sobre">
          <div className={styles.sectionIntro}>
            <p className={styles.sectionNumber}>01 — SOBRE A COMPANHIA</p>
            <h2>Uma instituição construída para <em>permanecer.</em></h2>
          </div>
          <div className={styles.aboutBody}>
            <p className={styles.lead}>A Companhia Romanov reúne especialistas, combatentes e estudiosos sob uma estrutura séria, hierárquica e orientada pela memória.</p>
            <p>Ligada ao legado de Rodion Romanovich, a instituição preserva cada missão, descoberta e nome em seu arquivo central. Nada se perde. Nada é esquecido.</p>
            <div className={styles.stats}>
              <div><small>01</small><strong>{employeeCount}</strong><span>Funcionários</span></div>
              <div><small>02</small><strong>{reportCount}</strong><span>Relatórios arquivados</span></div>
              <div><small>03</small><strong>{serviceTime}</strong><span>Tempo de serviço</span></div>
            </div>
          </div>
          <div className={styles.aboutGraphic} aria-hidden="true"><span>R</span><b>ROMANOV</b></div>
        </section>

        <section className={styles.chronicles} id="linha-do-tempo">
          <div className={styles.chronicleIntro}>
            <p className={styles.sectionNumber}>02 — MURAL HISTÓRICO</p>
            <h2>Linha do<br />tempo.</h2>
            <p>Comunicados, admissões e feitos preservados no arquivo público da instituição.</p>
            <span className={styles.archiveCode}>RG-2026 / ATUALIZAÇÃO CONTÍNUA</span>
          </div>
          <div className={styles.timeline}>
            {timeline.map((item) => (
              <details className={styles.timelineItem} key={`${item.title}-${item.day}-${item.month}-${item.year}`}>
                <summary>
                  <span className={styles.date}><b>{item.day}</b><small>{item.month}<br />{item.year}</small></span>
                  <span className={styles.timelineType}>{item.type}</span>
                  <strong>{item.title}</strong>
                  <span className={styles.expandIcon} aria-hidden="true">+</span>
                </summary>
                <div className={styles.timelineDetails}><p>{item.text}</p>{item.people.length > 0 && <div className={styles.involved}><b>Funcionários envolvidos</b><span>{item.people.map(person => person.name).join("  /  ")}</span></div>}</div>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.cta} id="contato">
          <span className={styles.ctaNumber}>03</span>
          <div><p>COMUNICAÇÃO EXTERNA</p><h2>O arquivo permanece aberto a novos capítulos.</h2></div>
          <ContactModal />
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={styles.brand}><Crest /><span><strong>Companhia Romanov</strong><small>Arquivo institucional</small></span></div>
        <p>© 2026 · Todos os registros preservados.</p><a href="#inicio">TOPO ↑</a>
      </footer>
    </div>
  );
}
