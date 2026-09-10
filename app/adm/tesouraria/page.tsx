import Header from "../../Header";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import TreasuryLedger from "./TreasuryLedger";
import TreasuryModal, {
  type TreasuryEmployeeOption,
  type TreasuryTransaction,
} from "./TreasuryModal";
import styles from "./treasury.module.css";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    criado?: string;
    salvo?: string;
    excluido?: string;
    erro?: string;
  }>;
};

type TreasuryBalances = {
  bronze: number;
  prata: number;
  ouro: number;
  platina: number;
};

type TransactionRow = Omit<TreasuryTransaction, "creator"> & {
  creator: { display_name: string | null; email: string | null } | null;
};

const zeroBalances: TreasuryBalances = { bronze: 0, prata: 0, ouro: 0, platina: 0 };
const numberFormatter = new Intl.NumberFormat("pt-BR");

const errorMessages: Record<string, string> = {
  dados: "Confira os dados da movimentação e informe ao menos uma quantia.",
  salvar: "Não foi possível salvar a movimentação.",
  excluir: "Não foi possível excluir a movimentação.",
  permissao: "É necessário ter um personagem vinculado para registrar uma entrada em seu nome.",
};

export default async function TreasuryPage({ searchParams }: Props) {
  const current = await requireRole(["admin", "funcionario"]);
  const isAdmin = current.role === "admin";
  const params = await searchParams;
  const supabase = await createClient();

  const [
    { data: transactionData, error: transactionError },
    { data: balanceData, error: balanceError },
    { data: employeeData, error: employeeError },
  ] =
    await Promise.all([
      supabase
        .from("treasury_transactions")
        .select(
          isAdmin
            ? "id,movement_type,transaction_date,bronze,prata,ouro,platina,counterparty,description,created_at,creator:profiles!treasury_transactions_created_by_fkey(display_name,email)"
            : "id,movement_type,transaction_date,bronze,prata,ouro,platina,counterparty,description,created_at,creator:profiles!treasury_transactions_created_by_fkey(display_name)",
        )
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500)
        .returns<TransactionRow[]>(),
      supabase.rpc("treasury_balances").maybeSingle<TreasuryBalances>(),
      isAdmin ? supabase
        .from("employees")
        .select("id,code,name")
        .order("name", { ascending: true })
        .returns<TreasuryEmployeeOption[]>() : current.employee_id
          ? supabase.from("employees").select("id,code,name")
              .eq("code", current.employee_id).returns<TreasuryEmployeeOption[]>()
          : Promise.resolve({ data: [], error: null }),
    ]);

  const hasStructureError = Boolean(transactionError || balanceError || employeeError);
  const balances = balanceData ?? zeroBalances;
  const transactions: TreasuryTransaction[] = transactionData ?? [];
  const employees: TreasuryEmployeeOption[] = employeeData ?? [];
  const ownEmployee = !isAdmin ? employees[0] : undefined;
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  const currencies = [
    { key: "bronze", label: "Elos de Bronze", value: balances.bronze },
    { key: "prata", label: "Elos de Prata", value: balances.prata },
    { key: "ouro", label: "Elos de Ouro", value: balances.ouro },
    { key: "platina", label: "Elos de Platina", value: balances.platina },
  ];

  return (
    <div className={styles.page}>
      <Header />
      <main>
        <section className={styles.hero}>
          <div>
            <p>CONTROLE CENTRAL / MÓDULO 05</p>
            <h1>Tesouraria</h1>
            <span>Registro oficial dos recursos financeiros da Companhia Romanov.</span>
          </div>
        </section>

        <section className={styles.content}>
          <div className={styles.topbar}>
            <div>
              <p>SALDO CONSOLIDADO</p>
              <h2>Caixa da Companhia</h2>
            </div>
            {!hasStructureError && (isAdmin || ownEmployee) && (
              <TreasuryModal today={today} employees={isAdmin ? employees : []} ownEmployee={ownEmployee} />
            )}
          </div>

          {hasStructureError && (
            <p className={`${styles.message} ${styles.error}`}>
              Não foi possível carregar a Tesouraria. Tente novamente; se o problema persistir, avise a administração.
            </p>
          )}
          {(params.criado || params.salvo || params.excluido) && (
            <p className={styles.message}>
              {params.excluido
                ? "Movimentação excluída e saldos recalculados."
                : params.salvo
                  ? "Movimentação atualizada com sucesso."
                  : "Movimentação registrada com sucesso."}
            </p>
          )}
          {params.erro && (
            <p className={`${styles.message} ${styles.error}`}>
              {errorMessages[params.erro] ?? "Não foi possível concluir a operação."}
            </p>
          )}

          <div className={styles.balances}>
            {currencies.map((currency, index) => (
              <article className={styles.balanceCard} key={currency.key}>
                <small>{String(index + 1).padStart(2, "0")} / MOEDA</small>
                <h3>{currency.label}</h3>
                <strong className={Number(currency.value) < 0 ? styles.negative : undefined}>
                  {hasStructureError ? "—" : numberFormatter.format(Number(currency.value))}
                </strong>
              </article>
            ))}
          </div>

          <p className={styles.balanceNote}>
            Os saldos são calculados automaticamente pelas entradas e saídas. Cada tipo de Elo permanece independente, sem conversão automática.
          </p>

          {!isAdmin && (
            <p className={styles.balanceNote}>
              {ownEmployee
                ? "Você pode consultar o caixa e o histórico e registrar entradas somente em nome do seu personagem."
                : "Caixa e histórico disponíveis somente para consulta. Para registrar entradas, solicite à administração o vínculo da sua conta com um personagem."}
            </p>
          )}

          {!hasStructureError && (
            <TreasuryLedger transactions={transactions} today={today} employees={isAdmin ? employees : []} canManage={isAdmin} />
          )}

          <Link className={styles.back} href="/adm">
            ← Voltar ao painel ADM
          </Link>
        </section>
      </main>
    </div>
  );
}
