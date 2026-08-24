"use client";

import { useMemo, useState } from "react";
import ConfirmSubmitButton from "@/app/components/ConfirmSubmitButton";
import { deleteTreasuryTransaction } from "./actions";
import TreasuryModal, {
  type TreasuryEmployeeOption,
  type TreasuryTransaction,
} from "./TreasuryModal";
import styles from "./treasury.module.css";

const numberFormatter = new Intl.NumberFormat("pt-BR");

function currencySummary(transaction: TreasuryTransaction) {
  return [
    [transaction.bronze, "Bronze"],
    [transaction.prata, "Prata"],
    [transaction.ouro, "Ouro"],
    [transaction.platina, "Platina"],
  ]
    .filter(([amount]) => Number(amount) > 0)
    .map(([amount, currency]) => `${numberFormatter.format(Number(amount))} ${currency}`)
    .join(" · ");
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

export default function TreasuryLedger({
  transactions,
  today,
  employees,
}: {
  transactions: TreasuryTransaction[];
  today: string;
  employees: TreasuryEmployeeOption[];
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("todos");
  const [date, setDate] = useState("");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return transactions.filter((transaction) => {
      const matchesName =
        !normalizedQuery ||
        transaction.counterparty.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
      const matchesType = type === "todos" || transaction.movement_type === type;
      const matchesDate = !date || transaction.transaction_date === date;
      return matchesName && matchesType && matchesDate;
    });
  }, [date, query, transactions, type]);

  return (
    <section className={styles.ledger} aria-labelledby="ledger-title">
      <div className={styles.ledgerHeading}>
        <div>
          <p>REGISTRO CONTÍNUO</p>
          <h2 id="ledger-title">Histórico de movimentações</h2>
        </div>
        <span>{filtered.length} registros exibidos</span>
      </div>

      <div className={styles.filters}>
        <label className={styles.searchField}>
          Pesquisar quem pediu/deu
          <span>
            <b aria-hidden="true">⌕</b>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Digite um nome..."
            />
          </span>
        </label>
        <label>
          Tipo
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="todos">Entradas e saídas</option>
            <option value="entrada">Somente entradas</option>
            <option value="saida">Somente saídas</option>
          </select>
        </label>
        <label>
          Data
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        {(query || type !== "todos" || date) && (
          <button
            className={styles.clearFilters}
            type="button"
            onClick={() => {
              setQuery("");
              setType("todos");
              setDate("");
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className={styles.log}>
        {filtered.map((transaction) => (
          <details className={styles.transaction} key={transaction.id}>
            <summary>
              <time>{formatDate(transaction.transaction_date)}</time>
              <span className={transaction.movement_type === "entrada" ? styles.incoming : styles.outgoing}>
                {transaction.movement_type}
              </span>
              <strong>{transaction.counterparty}</strong>
              <b>{transaction.movement_type === "entrada" ? "+" : "−"} {currencySummary(transaction)}</b>
              <i aria-hidden="true">+</i>
            </summary>
            <div className={styles.transactionDetails}>
              <div className={styles.fullCounterparty}>
                <small>Quem pediu/deu o dinheiro</small>
                <p>{transaction.counterparty}</p>
              </div>
              <div>
                <small>Descrição</small>
                <p>{transaction.description || "Sem descrição."}</p>
              </div>
              <dl>
                <div>
                  <dt>Registrado por</dt>
                  <dd>{transaction.creator?.display_name || transaction.creator?.email || "Administrador"}</dd>
                </div>
                <div>
                  <dt>Registro criado em</dt>
                  <dd>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(transaction.created_at))}</dd>
                </div>
              </dl>
              <div className={styles.transactionActions}>
                <TreasuryModal transaction={transaction} today={today} employees={employees} />
                <form action={deleteTreasuryTransaction}>
                  <input type="hidden" name="id" value={transaction.id} />
                  <ConfirmSubmitButton
                    className={styles.deleteButton}
                    message={`A movimentação de “${transaction.counterparty}” será excluída e o saldo será recalculado.`}
                  >
                    Excluir
                  </ConfirmSubmitButton>
                </form>
              </div>
            </div>
          </details>
        ))}
        {!filtered.length && (
          <p className={styles.empty}>
            {transactions.length
              ? "Nenhuma movimentação corresponde aos filtros."
              : "Nenhuma movimentação registrada."}
          </p>
        )}
      </div>
    </section>
  );
}
