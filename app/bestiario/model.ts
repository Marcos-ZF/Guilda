export const categories = ["Sapiens", "Ferais", "Amorfos", "Vegetais", "Umbros", "Artificiais"] as const;
export type Category = typeof categories[number];
export const threatLevels = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const damageTypes = ["magic", "physical", "hybrid"] as const;
export type DamageType = typeof damageTypes[number];
export const damageOptions = [
  { value: "", label: "Sem classificação", color: "gray", explanation: "Categoria de dano não informada ou não aplicável." },
  { value: "magic", label: "Mágico", color: "blue", explanation: "Dano proveniente de magia, habilidades sobrenaturais ou efeitos mágicos." },
  { value: "physical", label: "Físico", color: "red", explanation: "Dano causado por força física, armas ou ataques corporais." },
  { value: "hybrid", label: "Híbrido", color: "purple", explanation: "Combinação de dano físico e mágico no mesmo ataque ou habilidade." },
] as const;
export type Ability = { name: string; description: string; damage_type?: DamageType | null };
export type Creature = {
  id: string; name: string; category: Category; threat: number; image_path: string;
  description: string; abilities: Ability[]; strategies: string;
  discoverer_employee_id: string | null; created_by: string; created_at: string;
};
export type EmployeeOption = { id: string; code: string; name: string };
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function canEditCreature(profile: { id: string; role: string }, creature: { created_by: string }) {
  return profile.role === "admin" || (profile.role === "funcionario" && creature.created_by === profile.id);
}
export function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}
export function filterCreatures<T extends { name: string; category: string; threat: number }>(items: T[], search: string, category: string, threat: string) {
  const query = normalizeSearch(search.trim());
  return items.filter(item => normalizeSearch(item.name).includes(query)
    && (!category || item.category === category) && (!threat || item.threat === Number(threat)));
}
export function parseCreature(form: FormData) {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const name = text("name"), category = text("category"), threat = Number(text("threat"));
  const description = text("description"), strategies = text("strategies");
  const discoverer = text("discoverer_employee_id");
  const names = form.getAll("ability_name"), descriptions = form.getAll("ability_description");
  const damages = form.getAll("ability_damage_type");
  if (name.length < 2 || name.length > 120 || !categories.includes(category as Category)
    || !Number.isInteger(threat) || threat < 1 || threat > 8 || description.length > 10000
    || strategies.length > 10000 || (discoverer && !uuidPattern.test(discoverer))
    || names.length > 20 || names.length !== descriptions.length
    || (damages.length !== 0 && damages.length !== names.length)
    || damages.some(value => value !== "" && !damageTypes.includes(String(value) as DamageType))) return null;
  const abilities = names.map((value, index) => ({ name: String(value).trim(), description: String(descriptions[index]).trim(), damage_type: (damages[index] || null) as DamageType | null }))
    .filter(ability => ability.name || ability.description);
  if (abilities.some(ability => !ability.name || ability.name.length > 100 || ability.description.length > 2000)) return null;
  return { name, category: category as Category, threat, description, strategies, abilities, discoverer_employee_id: discoverer || null };
}
