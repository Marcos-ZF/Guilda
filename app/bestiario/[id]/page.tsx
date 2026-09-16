/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/app/Header";
import ConfirmSubmitButton from "@/app/components/ConfirmSubmitButton";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canEditCreature, uuidPattern, type Creature } from "../model";
import { deleteCreature } from "../actions";
import ThreatStars from "../ThreatStars";
import styles from "../bestiario.module.css";

export default async function CreaturePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> }) {
  const profile = await requireRole(["funcionario", "admin"]);
  const { id } = await params, query = await searchParams;
  if (!uuidPattern.test(id)) notFound();
  const supabase = await createClient();
  const { data: creature, error } = await supabase.from("bestiary_creatures").select("*").eq("id", id).maybeSingle<Creature>();
  if (error) return <><Header /><main className={styles.detail}><p className={styles.error}>Não foi possível carregar a criatura.</p><Link href="/bestiario">Voltar ao Bestiário</Link></main></>;
  if (!creature) notFound();
  const [{ data: image }, { data: responsible }] = await Promise.all([
    supabase.storage.from("bestiary-media").createSignedUrl(creature.image_path, 3600),
    creature.discoverer_employee_id ? supabase.from("employees").select("name,code").eq("id", creature.discoverer_employee_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return <><Header /><main className={styles.detail}>
    <p className={styles.kicker}>Bestiário / {creature.category}</p><h1>{creature.name}</h1>
    {query.salvo && <p className={styles.notice}>Registro salvo com sucesso.</p>}
    <div className={styles.detailOverview}>
      {image?.signedUrl ? <img className={styles.detailImage} src={image.signedUrl} alt={creature.name} width={800} height={600} /> : <div className={styles.imagePlaceholder}>Foto indisponível</div>}
      <dl className={styles.facts}><div><dt>Categoria</dt><dd>{creature.category}</dd></div><div><dt>Nível de ameaça</dt><dd><ThreatStars level={creature.threat} /><span>{creature.threat} de 5</span></dd></div><div><dt>Responsável pela descoberta e informações</dt><dd>{responsible ? <Link href={`/funcionarios/${responsible.code}`}>{responsible.name}</Link> : "Não informado"}</dd></div></dl>
    </div>
    <section className={styles.textSection}><h2>Descrição</h2><p>{creature.description || "Nenhuma descrição registrada."}</p></section>
    <section className={styles.textSection}><h2>Habilidades</h2>{creature.abilities.length ? <ul className={styles.abilities}>{creature.abilities.map((ability, index) => <li key={index}><h3>{ability.name}</h3>{ability.description && <p>{ability.description}</p>}</li>)}</ul> : <p>Nenhuma habilidade registrada.</p>}</section>
    <section className={styles.textSection}><h2>Estratégias no combate</h2><p>{creature.strategies || "Nenhuma estratégia registrada."}</p></section>
    <div className={styles.actions}>{canEditCreature(profile, creature) && <Link className={styles.button} href={`/bestiario/${id}/editar`}>Editar criatura</Link>}{profile.role === "admin" && <form action={deleteCreature}><input type="hidden" name="id" value={id} /><ConfirmSubmitButton className={styles.button} message={`Excluir o registro de “${creature.name}”?`}>Excluir criatura</ConfirmSubmitButton></form>}</div>
    <Link className={styles.back} href="/bestiario">← Voltar ao Bestiário</Link>
  </main></>;
}
