import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

function compile(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, File, crypto, require(name) {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return exports;
}
const model = compile('../app/bestiario/model.ts');
const ownId = '10000000-0000-4000-8000-000000000001';
const otherId = '20000000-0000-4000-8000-000000000002';
const creatureId = '30000000-0000-4000-8000-000000000003';
function form(extra = {}) {
  const data = new FormData();
  Object.entries({ name: 'Rato alado', category: 'Ferais', threat: '2', ...extra }).forEach(([key,value]) => data.set(key, value));
  return data;
}

test('all six categories and eight threat levels are valid', () => {
  assert.equal(model.categories.length, 6);
  for (const category of model.categories) for (const threat of [1,2,3,4,5,6,7,8]) assert.ok(model.parseCreature(form({ category, threat: String(threat) })));
});
test('invalid threat, category, responsible ID and oversized fields are rejected', () => {
  for (const extra of [{ threat: '0' }, { threat: '9' }, { threat: '2.5' }, { threat: 'abc' }, { category: 'Outro' }, { discoverer_employee_id: 'bad' }, { name: 'x' }, { strategies: 'a'.repeat(10001) }]) assert.equal(model.parseCreature(form(extra)), null);
});
test('abilities stay separate and empty optional fields are accepted', () => {
  const data = form();
  for (const name of ['Voo','Mordida']) { data.append('ability_name', name); data.append('ability_description', 'Descrição'); }
  const result = model.parseCreature(data);
  assert.equal(result.abilities.length, 2);
  assert.equal(result.abilities[1].name, 'Mordida');
  assert.equal(result.description, '');
  assert.equal(result.discoverer_employee_id, null);
  data.append('ability_name', ''); data.append('ability_description', 'Sem nome');
  assert.equal(model.parseCreature(data), null);
});
test('search ignores accents; category and threat filters combine independently', () => {
  const rows = [{ name: 'Árvore Sombria', category: 'Vegetais', threat: 4 }, { name: 'Rato', category: 'Ferais', threat: 1 }];
  assert.equal(model.filterCreatures(rows, 'arvore', '', '').length, 1);
  assert.equal(model.filterCreatures(rows, '', 'Ferais', '1').length, 1);
  assert.equal(model.filterCreatures(rows, 'rato', 'Ferais', '4').length, 0);
});

function harness(role = 'funcionario', author = ownId, failure = false) {
  const writes = [], uploads = [], removed = [];
  const bucket = { upload: async path => { uploads.push(path); return { error: null }; }, remove: async paths => { removed.push(...paths); return { error: null }; } };
  const db = { storage: { from: () => bucket }, from(table) {
    if (table === 'employees') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: otherId }, error: null }) }) }) };
    assert.equal(table, 'bestiary_creatures');
    const success = () => ({ data: failure ? null : { id: creatureId, image_path: `${ownId}/old.webp` }, error: failure ? { code: '42501' } : null });
    const query = { eq: () => query, select: () => query, single: async () => success(), maybeSingle: async () => success() };
    return {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { created_by: author, image_path: `${ownId}/old.webp` }, error: null }) }) }),
      update: value => { writes.push(value); return query; }, insert: value => { writes.push(value); return query; }, delete: () => { writes.push('delete'); return query; },
    };
  } };
  const actions = compile('../app/bestiario/actions.ts', {
    './model': model,
    'next/cache': { revalidatePath() {} },
    'next/navigation': { redirect(path) { throw new Error(`REDIRECT:${path}`); } },
    '@/lib/auth': { requireRole: async roles => { if (!roles.includes(role)) throw new Error('FORBIDDEN'); return { id: ownId, role }; } },
    '@/lib/supabase/server': { createClient: async () => db },
  });
  return { actions, writes, uploads, removed };
}
test('employee creates a record with authenticated authorship, not forged creator', async () => {
  const h = harness();
  const data = form({ created_by: otherId, discoverer_employee_id: otherId });
  data.set('image', new File(['test'], 'photo.png', { type: 'image/png' }));
  await assert.rejects(h.actions.saveCreature({ error: '' }, data), /REDIRECT:/);
  assert.equal(h.writes[0].created_by, ownId);
  assert.equal(h.writes[0].discoverer_employee_id, otherId);
  assert.ok(h.uploads[0].startsWith(`${ownId}/`));
});
test('employee edits own creature, but cannot edit another creator or delete', async () => {
  const own = harness();
  await assert.rejects(own.actions.saveCreature({ error: '' }, form({ id: creatureId })), /REDIRECT:/);
  assert.equal(own.writes.length, 1);
  assert.ok(!Object.hasOwn(own.writes[0], 'created_by'));
  const other = harness('funcionario', otherId);
  const result = await other.actions.saveCreature({ error: '' }, form({ id: creatureId }));
  assert.match(result.error, /permissão/);
  assert.equal(other.writes.length, 0);
  await assert.rejects(other.actions.deleteCreature(form({ id: creatureId })), /FORBIDDEN/);
});
test('admin edits other creators and can delete', async () => {
  const h = harness('admin', otherId);
  await assert.rejects(h.actions.saveCreature({ error: '' }, form({ id: creatureId })), /REDIRECT:/);
  await assert.rejects(h.actions.deleteCreature(form({ id: creatureId })), /excluido=1/);
  assert.equal(h.writes.length, 2);
});
test('visitor cannot invoke creation or editing actions', async () => {
  const h = harness('visitor');
  await assert.rejects(h.actions.saveCreature({ error: '' }, form()), /FORBIDDEN/);
  assert.equal(h.writes.length, 0);
});
test('missing photo and unsupported file types do not write or upload', async () => {
  const h = harness();
  assert.match((await h.actions.saveCreature({ error: '' }, form())).error, /foto/);
  const data = form(); data.set('image', new File(['bad'], 'bad.svg', { type: 'image/svg+xml' }));
  assert.match((await h.actions.saveCreature({ error: '' }, data)).error, /imagem/);
  assert.equal(h.writes.length, 0); assert.equal(h.uploads.length, 0);
});
test('failed database save cleans only the new uploaded file', async () => {
  const h = harness('funcionario', ownId, true);
  const data = form({ id: creatureId }); data.set('image', new File(['test'], 'photo.webp', { type: 'image/webp' }));
  assert.match((await h.actions.saveCreature({ error: '' }, data)).error, /salvar/);
  assert.equal(h.removed[0], h.uploads[0]); assert.equal(h.removed.length, 1);
});
test('directory renders all categories, cards, two filters and accessible stars', () => {
  const dependencies = { react: React, 'react/jsx-runtime': jsx, './bestiario.module.css': { default: {} }, './model': model };
  const stars = compile('../app/bestiario/ThreatStars.tsx', dependencies);
  const directory = compile('../app/bestiario/CreatureDirectory.tsx', { ...dependencies,
    './ThreatStars': stars, 'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
  });
  const html = renderToStaticMarkup(React.createElement(directory.default, { creatures: [{ id: creatureId, name: 'Rato alado', category: 'Ferais', threat: 3, imageUrl: null, responsibleName: 'Descobridor' }] }));
  for (const category of model.categories) assert.ok(html.includes(category));
  assert.match(html, /Rato alado/); assert.match(html, /3 de 8 estrelas/);
  assert.match(html, /value="8"/);
  assert.equal((html.match(/<select/g) || []).length, 2);
});

test('damage categories are validated and gray is saved as null', () => {
  for (const damage of ['', 'magic', 'physical', 'hybrid']) {
    const data = form({ ability_name: 'Mordida', ability_description: '', ability_damage_type: damage });
    assert.equal(model.parseCreature(data).abilities[0].damage_type, damage || null);
  }
  assert.equal(model.parseCreature(form({ ability_name: 'Voo', ability_description: '' })).abilities[0].damage_type, null);
  for (const damage of ['red', 'invalid', 'null']) assert.equal(model.parseCreature(form({ ability_name: 'Voo', ability_description: '', ability_damage_type: damage })), null);
  const mismatch = form({ ability_name: 'Voo', ability_description: '', ability_damage_type: '' });
  mismatch.append('ability_damage_type', 'magic');
  assert.equal(model.parseCreature(mismatch), null);
});

test('level eight and ability colors reach the save payload', async () => {
  const h = harness();
  const data = form({ id: creatureId, threat: '8', ability_name: 'Mordida', ability_description: 'Dano físico', ability_damage_type: 'physical' });
  await assert.rejects(h.actions.saveCreature({ error: '' }, data), /REDIRECT:/);
  assert.equal(h.writes[0].threat, 8);
  assert.equal(h.writes[0].abilities[0].damage_type, 'physical');
});

test('manual renders eight difficulty levels and all four damage meanings', () => {
  const dependencies = { react: React, 'react/jsx-runtime': jsx, './bestiario.module.css': { default: {} }, './model': model };
  const dot = compile('../app/bestiario/DamageDot.tsx', dependencies);
  const stars = compile('../app/bestiario/ThreatStars.tsx', dependencies);
  const manual = compile('../app/bestiario/BestiaryManual.tsx', { ...dependencies, './DamageDot': dot, './ThreatStars': stars });
  const html = renderToStaticMarkup(React.createElement(manual.default));
  assert.match(html, /<dialog/);
  for (const level of model.threatLevels) assert.ok(html.includes(`${level} de 8 estrelas`));
  for (const option of model.damageOptions) assert.ok(html.includes(option.label));
  assert.match(html, /Chefes para um grupo de Divisão 1/);
  const legacy = renderToStaticMarkup(React.createElement(dot.default));
  assert.match(legacy, /Sem classificação/);
});
