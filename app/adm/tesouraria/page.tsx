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
};

export default async function TreasuryPage({ searchParams }: Props) {
  await requireRole(["admin"]);
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
          "id,movement_type,transaction_date,bronze,prata,ouro,platina,counterparty,description,created_at,creator:profiles!treasury_transactions_created_by_fkey(display_name,email)",
        )
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500)
        .returns<TransactionRow[]>(),
      supabase.rpc("treasury_balances").maybeSingle<TreasuryBalances>(),
      supabase
        .from("employees")
        .select("id,code,name")
        .order("name", { ascending: true })
        .returns<TreasuryEmployeeOption[]>(),
    ]);

  const hasStructureError = Boolean(transactionError || balanceError || employeeError);
  const balances = balanceData ?? zeroBalances;
  const transactions: TreasuryTransaction[] = transactionData ?? [];
  const employees: TreasuryEmployeeOption[] = employeeData ?? [];
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
            {!hasStructureError && <TreasuryModal today={today} employees={employees} />}
          </div>

          {hasStructureError && (
            <p className={`${styles.message} ${styles.error}`}>
              A estrutura da Tesouraria ainda não existe no Supabase. Execute o novo arquivo SQL entregue junto do projeto.
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
                  {numberFormatter.format(Number(currency.value))}
                </strong>
              </article>
            ))}
          </div>

          <p className={styles.balanceNote}>
            Os saldos são calculados automaticamente pelas entradas e saídas. Cada tipo de Elo permanece independente, sem conversão automática.
          </p>

          {!hasStructureError && (
            <TreasuryLedger transactions={transactions} today={today} employees={employees} />
          )}

          <Link className={styles.back} href="/adm">
            ← Voltar ao painel ADM
          </Link>
        </section>
      </main>
    </div>
  );
}
