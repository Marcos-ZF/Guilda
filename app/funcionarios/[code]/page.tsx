/* eslint-disable react-hooks/static-components */
import Header from "@/app/Header";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  addAchievement,
  addEquipment,
  removeEmployeeItem,
  updateEmployeeMemorial,
  updateEmployeeProfile,
  updateEmployeeStatus,
} from "./actions";
import ImageCropInput from "@/app/components/ImageCropInput";
import ConfirmSubmitButton from "@/app/components/ConfirmSubmitButton";
import { AchievementEditModal, EquipmentEditModal } from "./EmployeeItemEditModal";
import EquipmentTypeRarityFields, { getEquipmentRarityLabel, type EquipmentRarity, type EquipmentType } from "./EquipmentTypeRarityFields";
import styles from "./profile.module.css";

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ salvo?: string; erro?: string }>;
};

type EmployeeStatus = "active" | "inactive" | "deceased";

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
  employee_status: EmployeeStatus;
  about: string;
  photo_url: string | null;
  height: string | null;
  race: string | null;
  age: number | null;
  sex: string | null;
  document_url: string | null;
  memento_image_url: string | null;
  memento_text: string;
  memento_url: string | null;
};

type Equipment = {
  id: string;
  name: string;
  item_type: EquipmentType;
  rarity: EquipmentRarity;
  description: string;
  image_url: string | null;
  document_url: string | null;
};

type Achievement = { id: string; title: string; description: string };

const honorColors: Record<string, string> = {
  Katyusha: "#dd2b0b",
  Ilya: "#d9ae05",
  Dobrynya: "#aab6c2",
  Alyosha: "#27a8c0",
  Rasputin: "#62b400",
  "Baba Yaga": "#7b35ad",
  Vasilisa: "#c34b87",
};

const statusLabels: Record<EmployeeStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  deceased: "Falecido",
};

export default async function EmployeeProfilePage({ params, searchParams }: Props) {
  await connection();
  const { code } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const { data: employee } = await supabase
    .from("employees")
    .select("id, code, name, role_title, position_title, honor_title, specialty, initials, is_active, employee_status, about, photo_url, height, race, age, sex, document_url, memento_image_url, memento_text, memento_url")
    .eq("code", decodeURIComponent(code).toUpperCase())
    .maybeSingle<Employee>();

  if (!employee) notFound();

  const [{ data: equipmentData }, { data: achievementData }] = await Promise.all([
    supabase
      .from("employee_equipment")
      .select("id, name, item_type, rarity, description, image_url, document_url")
      .eq("employee_id", employee.id)
      .order("sort_order"),
    supabase
      .from("employee_achievements")
      .select("id, title, description")
      .eq("employee_id", employee.id)
      .order("sort_order"),
  ]);

  const equipment = (equipmentData ?? []) as Equipment[];
  const achievements = (achievementData ?? []) as Achievement[];
  const canEdit = profile?.role === "admin" || profile?.employee_id === employee.code;
  const isAdmin = profile?.role === "admin";
  const employeeStatus = employee.employee_status ?? (employee.is_active ? "active" : "inactive");
  const Hidden = () => (
    <>
      <input type="hidden" name="employee_id" value={employee.id} />
      <input type="hidden" name="code" value={employee.code} />
    </>
  );

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.sheet}>
        <p className={styles.index}>MEMBRO / {employee.code}</p>
        <div className={styles.rule} />

        <div className={styles.titleRow}>
          <div>
            <p className={styles.label}>{employee.position_title || employee.role_title}</p>
            <h1>{employee.name}</h1>
          </div>
          <p className={styles[employeeStatus]}>{statusLabels[employeeStatus]}</p>
        </div>
        <div className={styles.rule} />

        {(query.salvo || query.erro) && (
          <p className={styles.message}>
            {query.salvo
              ? "Alteração salva com sucesso."
              : query.erro === "imagem"
                ? "A imagem deve ter até 5 MB e ser JPG, PNG, WEBP ou GIF."
                : "Não foi possível salvar. Confira os campos."}
          </p>
        )}

        <section className={styles.overview}>
          <div
            className={styles.photo}
            style={employee.photo_url ? { backgroundImage: `url("${employee.photo_url}")` } : undefined}
          >
            {!employee.photo_url && <span>{employee.initials}</span>}
          </div>
          <div className={styles.about}>
            <div className={styles.ranks}>
              <div>
                <p className={styles.label}>Cargo</p>
                <strong className={styles.rankValue}><i className={styles.rankDot} />{employee.position_title || "Não informado"}</strong>
              </div>
              <div>
                <p className={styles.label}>Cargo de Honra</p>
                <strong className={styles.rankValue}>
                  <i className={styles.rankDot} style={{ background: employee.honor_title ? honorColors[employee.honor_title] : "#777" }} />
                  {employee.honor_title || "Sem cargo de honra"}
                </strong>
              </div>
            </div>
            <div className={styles.aboutSection}>
              <p className={styles.label}>Sobre</p>
              <p className={styles.aboutText}>{employee.about || "Esta ficha ainda não possui uma apresentação."}</p>
            </div>
            <dl className={styles.general}>
              <div><dt>ID</dt><dd>{employee.code}</dd></div>
              <div><dt>Função (Classe)</dt><dd>{employee.role_title}</dd></div>
              <div><dt>Altura</dt><dd>{employee.height || "—"}</dd></div>
              <div><dt>Raça</dt><dd>{employee.race || "—"}</dd></div>
              <div><dt>Idade</dt><dd>{employee.age ?? "—"}</dd></div>
              <div><dt>Sexo</dt><dd>{employee.sex || "—"}</dd></div>
              <div><dt>Doc</dt><dd>{employee.document_url ? <a href={employee.document_url} target="_blank" rel="noreferrer">Abrir ficha ↗</a> : "—"}</dd></div>
            </dl>
          </div>
        </section>
        <div className={styles.rule} />

        {employeeStatus === "deceased" && (
          <>
            <section className={`${styles.section} ${styles.memento}`} id="memento">
              <p className={styles.mementoKicker}>Memória preservada</p>
              <h2>Memento</h2>
              {employee.memento_image_url && (
                <div className={styles.mementoImage} style={{ backgroundImage: `url("${employee.memento_image_url}")` }} role="img" aria-label={`Memento de ${employee.name}`} />
              )}
              {employee.memento_text && <p className={styles.mementoText}>{employee.memento_text}</p>}
              {employee.memento_url && <a className={styles.mementoLink} href={employee.memento_url} target="_blank" rel="noreferrer">Memento Mori / Testamento ↗</a>}
              {!employee.memento_image_url && !employee.memento_text && !employee.memento_url && <p className={styles.empty}>Nenhum Memento registrado.</p>}
            </section>
            <div className={styles.rule} />
          </>
        )}

        <section className={styles.section}>
          <h2>Especialidade</h2>
          <p className={styles.specialty}>{employee.specialty}</p>
        </section>
        <div className={styles.rule} />

        <section className={styles.section} id="equipamentos">
          <h2>Equipamentos</h2>
          <div className={styles.equipment}>
            {equipment.map((item, index) => (
              <article className={styles.equipmentItem} key={item.id}>
                <strong>{String(index + 1).padStart(2, "0")}</strong>
                <div className={styles.equipmentImage} style={item.image_url ? { backgroundImage: `url("${item.image_url}")` } : undefined} />
                <div className={styles.equipmentBody}>
                  <small>{item.item_type} · {getEquipmentRarityLabel(item.item_type, item.rarity)}</small>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  {item.document_url && <a className={styles.documentLink} href={item.document_url} target="_blank" rel="noreferrer">Documento do Equipamento ↗</a>}
                  {canEdit && (
                    <div className={styles.itemActions}>
                      <EquipmentEditModal employeeId={employee.id} code={employee.code} item={item} />
                      <form className={styles.remove} action={removeEmployeeItem}>
                        <Hidden /><input type="hidden" name="item_id" value={item.id} /><input type="hidden" name="kind" value="equipment" />
                        <ConfirmSubmitButton message={`O equipamento “${item.name}” será removido permanentemente da ficha.`}>Remover</ConfirmSubmitButton>
                      </form>
                    </div>
                  )}
                </div>
              </article>
            ))}
            {!equipment.length && <p className={styles.empty}>Nenhum equipamento registrado.</p>}
          </div>
        </section>
        <div className={styles.rule} />

        <section className={styles.section} id="feitos">
          <h2>Feitos</h2>
          <div className={styles.achievements}>
            {achievements.map((item, index) => (
              <article className={styles.achievement} key={item.id}>
                <span className={styles.achievementNumber}>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{item.title}</h3>
                  {item.description && <p>{item.description}</p>}
                  {isAdmin && (
                    <div className={styles.itemActions}>
                      <AchievementEditModal employeeId={employee.id} code={employee.code} item={item} />
                      <form className={styles.remove} action={removeEmployeeItem}>
                        <Hidden /><input type="hidden" name="item_id" value={item.id} /><input type="hidden" name="kind" value="achievement" />
                        <ConfirmSubmitButton message={`O feito “${item.title}” será removido permanentemente e também deixará a linha do tempo.`}>Remover</ConfirmSubmitButton>
                      </form>
                    </div>
                  )}
                </div>
              </article>
            ))}
            {!achievements.length && <p className={styles.empty}>Nenhum feito registrado.</p>}
          </div>
        </section>

        {canEdit && (
          <details className={styles.edit} id="editar">
            <summary>Editar ficha — acesso autorizado</summary>
            <div className={styles.editGroups}>
              <details className={styles.editGroup}>
                <summary>Dados gerais e foto</summary>
                <section className={styles.editBlock}>
                  <form className={styles.form} action={updateEmployeeProfile}>
                    <Hidden />
                    <label>ID</label><input value={employee.code} disabled />
                    <label>Nome</label><input name="name" defaultValue={employee.name} required />
                    <label>Função (Classe)</label><input name="role_title" defaultValue={employee.role_title} required />
                    <label>Altura</label><input name="height" defaultValue={employee.height ?? ""} placeholder="Ex.: 1,80 m" />
                    <label>Raça</label><input name="race" defaultValue={employee.race ?? ""} />
                    <label>Idade</label><input name="age" type="number" min="0" max="9999" defaultValue={employee.age ?? ""} />
                    <label>Sexo</label><select name="sex" defaultValue={employee.sex ?? ""}><option value="">Não informado</option><option value="Feminino">Feminino</option><option value="Masculino">Masculino</option></select>
                    <label>Doc — link do Google Docs (opcional)</label><input name="document_url" type="url" defaultValue={employee.document_url ?? ""} placeholder="https://docs.google.com/..." />
                    <label>Cargo</label><input name="position_title" defaultValue={employee.position_title ?? ""} />
                    <label>Cargo de Honra</label>
                    <select name="honor_title" defaultValue={employee.honor_title ?? ""}>
                      <option value="">Sem cargo de honra</option>
                      {["Katyusha", "Ilya", "Dobrynya", "Alyosha", "Rasputin", "Baba Yaga", "Vasilisa"].map((title) => <option key={title}>{title}</option>)}
                    </select>
                    <label>Sobre</label><textarea name="about" defaultValue={employee.about} />
                    <label>Especialidade</label><textarea name="specialty" defaultValue={employee.specialty} required />
                    <ImageCropInput name="photo" label="Foto do funcionário" aspect={5 / 8} />
                    <button>Salvar ficha</button>
                  </form>
                </section>
              </details>

              <details className={styles.editGroup}>
                <summary>Armas e equipamentos</summary>
                <section className={styles.editBlock}>
                  <form className={styles.form} action={addEquipment}>
                    <Hidden />
                    <label>Nome</label><input name="name" required />
                    <EquipmentTypeRarityFields />
                    <label>Descrição</label><textarea name="description" />
                    <label>Link de Doc (opcional)</label><input name="document_url" type="url" placeholder="https://docs.google.com/..." />
                    <ImageCropInput name="image" label="Foto da arma/equipamento" aspect={4 / 3} />
                    <button>Adicionar equipamento</button>
                  </form>
                </section>
              </details>

              {isAdmin && (
                <details className={styles.editGroup}>
                  <summary>Feitos — somente administradores</summary>
                  <section className={styles.editBlock}>
                    <form className={styles.form} action={addAchievement}>
                      <Hidden /><label>Título</label><input name="title" required /><label>Descrição</label><textarea name="description" /><button>Adicionar feito</button>
                    </form>
                  </section>
                </details>
              )}
            </div>
          </details>
        )}

        {isAdmin && (
          <details className={`${styles.edit} ${styles.statusEditor}`} id="status">
            <summary>Status — somente administradores</summary>
            <section className={styles.editBlock}>
              <form className={styles.form} action={updateEmployeeStatus}>
                <Hidden />
                <label>Status do funcionário</label>
                <select name="employee_status" defaultValue={employeeStatus} required>
                  <option value="active">Ativo</option><option value="inactive">Inativo</option><option value="deceased">Falecido</option>
                </select>
                <button>Salvar status</button>
              </form>
            </section>
          </details>
        )}

        {isAdmin && employeeStatus === "deceased" && (
          <details className={`${styles.edit} ${styles.statusEditor}`} id="memento-editor">
            <summary>Memento — somente administradores</summary>
            <section className={styles.editBlock}>
              <form className={styles.form} action={updateEmployeeMemorial}>
                <Hidden />
                <ImageCropInput name="memento_image" label="Imagem do Memento — 1280 × 720" aspect={16 / 9} outputWidth={1280} quality={.95} />
                <label>Texto livre do Memento</label><textarea name="memento_text" defaultValue={employee.memento_text} maxLength={10000} />
                <label>Memento Mori / Testamento — link opcional</label><input name="memento_url" type="url" defaultValue={employee.memento_url ?? ""} placeholder="https://..." />
                <button>Salvar Memento</button>
              </form>
            </section>
          </details>
        )}

        <Link className={styles.back} href="/funcionarios">← Voltar para funcionários</Link>
      </main>
    </div>
  );
}
