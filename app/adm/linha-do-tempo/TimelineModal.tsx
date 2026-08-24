"use client";

import { useRef } from "react";
import { createTimelineEntry, updateTimelineEntry } from "./actions";
import styles from "./timeline.module.css";

export type EmployeeOption = { id: string; code: string; name: string };
export type TimelineEntry = { id: string; entry_type: string; entry_date: string; title: string; description: string; employee_ids: string[] };

export default function TimelineModal({ entry, today, employees }: { entry?: TimelineEntry; today: string; employees: EmployeeOption[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const editing = Boolean(entry);
  return <>
    <button className={editing ? styles.edit : styles.create} type="button" onClick={() => dialog.current?.showModal()}>{editing ? "Editar" : "Novo registro"}</button>
    <dialog className={styles.modal} ref={dialog} onClick={(event) => { if (event.target === dialog.current) dialog.current.close(); }}>
      <div className={styles.panel}>
        <div className={styles.modalHeader}><div><small>Linha do tempo</small><h2>{editing ? "Editar registro" : "Novo registro"}</h2></div><button type="button" onClick={() => dialog.current?.close()}>×</button></div>
        <form className={styles.form} action={editing ? updateTimelineEntry : createTimelineEntry}>
          {entry && <input type="hidden" name="id" value={entry.id} />}
          <label>Tipo<select name="entry_type" defaultValue={entry?.entry_type ?? "Comunicado"}><option>Comunicado</option><option>Feito</option><option>Novo funcionário</option><option>Relatório</option><option>Evento</option></select></label>
          <label>Data<input name="entry_date" type="date" defaultValue={entry?.entry_date ?? today} required /></label>
          <label className={styles.wide}>Título<input name="title" defaultValue={entry?.title ?? ""} maxLength={160} required autoFocus /></label>
          <label className={styles.wide}>Descrição<textarea name="description" defaultValue={entry?.description ?? ""} maxLength={5000} required /></label>
          <fieldset className={styles.people}><legend>Funcionários envolvidos <span>(opcional)</span></legend><p>Selecione todas as pessoas ligadas a este registro.</p><div>{employees.map(employee => <label key={employee.id}><input name="employee_ids" type="checkbox" value={employee.id} defaultChecked={entry?.employee_ids.includes(employee.id) ?? false} /><span>{employee.name}</span></label>)}</div></fieldset>
          <div className={styles.actions}><button className={styles.cancel} type="button" onClick={() => dialog.current?.close()}>Cancelar</button><button type="submit">{editing ? "Salvar alterações" : "Criar registro"}</button></div>
        </form>
      </div>
    </dialog>
  </>;
}
