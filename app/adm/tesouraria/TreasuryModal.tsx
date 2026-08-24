"use client";

import { useMemo, useRef, useState } from "react";
import { createTreasuryTransaction, updateTreasuryTransaction } from "./actions";
import styles from "./treasury.module.css";

export type TreasuryTransaction = {
  id: string;
  movement_type: "entrada" | "saida";
  transaction_date: string;
  bronze: number;
  prata: number;
  ouro: number;
  platina: number;
  counterparty: string;
  description: string;
  created_at: string;
  creator: { display_name: string | null; email: string | null } | null;
};

export type TreasuryEmployeeOption = {
  id: string;
  code: string;
  name: string;
};

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export default function TreasuryModal({
  today,
  transaction,
  employees,
}: {
  today: string;
  transaction?: TreasuryTransaction;
  employees: TreasuryEmployeeOption[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const editing = Boolean(transaction);
  const initialCounterparties = useMemo(
    () =>
      (transaction?.counterparty ?? "")
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    [transaction?.counterparty],
  );
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(() => {
    const initialNames = new Set(initialCounterparties.map(normalizeName));
    return employees
      .filter((employee) => initialNames.has(normalizeName(employee.name)))
      .map((employee) => employee.id);
  });
  const [freeNames, setFreeNames] = useState(() => {
    const employeeNames = new Set(employees.map((employee) => normalizeName(employee.name)));
    return initialCounterparties
      .filter((name) => !employeeNames.has(normalizeName(name)))
      .join(", ");
  });
  const counterparty = useMemo(() => {
    const selectedNames = employees
      .filter((employee) => selectedEmployeeIds.includes(employee.id))
      .map((employee) => employee.name);
    const additionalNames = freeNames
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);

    return [...selectedNames, ...additionalNames].join(", ");
  }, [employees, freeNames, selectedEmployeeIds]);

  function toggleEmployee(id: string) {
    setSelectedEmployeeIds((current) =>
      current.includes(id)
        ? current.filter((employeeId) => employeeId !== id)
        : [...current, id],
    );
  }

  return (
    <>
      <button
        className={editing ? styles.editButton : styles.newButton}
        type="button"
        onClick={() => dialog.current?.showModal()}
      >
        {editing ? "Editar" : "Nova movimentação"}
      </button>

      <dialog
        className={styles.modal}
        ref={dialog}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
      >
        <div className={styles.modalPanel}>
          <div className={styles.modalHeader}>
            <div>
              <small>Tesouraria / Registro financeiro</small>
              <h2>{editing ? "Editar movimentação" : "Nova movimentação"}</h2>
            </div>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Fechar janela"
            >
              ×
            </button>
          </div>

          <form
            className={styles.form}
            action={editing ? updateTreasuryTransaction : createTreasuryTransaction}
          >
            {transaction && <input type="hidden" name="id" value={transaction.id} />}

            <label>
              Tipo
              <select
                name="movement_type"
                defaultValue={transaction?.movement_type ?? "entrada"}
                required
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </label>

            <label>
              Data
              <input
                name="transaction_date"
                type="date"
                defaultValue={transaction?.transaction_date ?? today}
                required
              />
            </label>

            <fieldset className={styles.currencyFields}>
              <legend>Quantias</legend>
              <p>Preencha ao menos uma das quatro moedas.</p>
              <div>
                <label>
                  Elos de Bronze
                  <input name="bronze" type="number" min="0" step="1" max="999999999999" defaultValue={transaction?.bronze || ""} placeholder="0" />
                </label>
                <label>
                  Elos de Prata
                  <input name="prata" type="number" min="0" step="1" max="999999999999" defaultValue={transaction?.prata || ""} placeholder="0" />
                </label>
                <label>
                  Elos de Ouro
                  <input name="ouro" type="number" min="0" step="1" max="999999999999" defaultValue={transaction?.ouro || ""} placeholder="0" />
                </label>
                <label>
                  Elos de Platina
                  <input name="platina" type="number" min="0" step="1" max="999999999999" defaultValue={transaction?.platina || ""} placeholder="0" />
                </label>
              </div>
            </fieldset>

            <fieldset className={styles.peopleSelector}>
              <legend>Funcionários cadastrados</legend>
              <p>Clique nos nomes para selecionar ou remover.</p>
              <div className={styles.employeeOptions}>
                {employees.map((employee) => {
                  const selected = selectedEmployeeIds.includes(employee.id);
                  return (
                    <button
                      aria-pressed={selected}
                      className={selected ? styles.employeeSelected : undefined}
                      key={employee.id}
                      onClick={() => toggleEmployee(employee.id)}
                      type="button"
                    >
                      <span>{employee.name}</span>
                      <small>{employee.code}</small>
                    </button>
                  );
                })}
                {!employees.length && (
                  <span className={styles.noEmployees}>Nenhum funcionário cadastrado.</span>
                )}
              </div>
            </fieldset>

            <label className={styles.wide}>
              Outros nomes (opcional)
              <input
                value={freeNames}
                onChange={(event) => setFreeNames(event.target.value)}
                maxLength={160}
                placeholder="Digite nomes externos separados por vírgula."
              />
              <small className={styles.fieldHint}>
                Use este campo quando a pessoa não estiver na lista de funcionários.
              </small>
            </label>

            <label className={`${styles.wide} ${styles.counterpartyPreview}`}>
              Quem pediu/deu o dinheiro
              <input
                name="counterparty"
                value={counterparty}
                readOnly
                required
                aria-describedby="counterparty-help"
              />
              <small className={styles.fieldHint} id="counterparty-help">
                Esta é a lista completa que será salva no registro.
              </small>
            </label>

            <label className={styles.wide}>
              Descrição (opcional)
              <textarea
                name="description"
                defaultValue={transaction?.description ?? ""}
                maxLength={3000}
                placeholder="Informe de onde veio o dinheiro ou por que ele saiu."
              />
            </label>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                type="button"
                onClick={() => dialog.current?.close()}
              >
                Cancelar
              </button>
              <button type="submit">
                {editing ? "Salvar alterações" : "Registrar movimentação"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
