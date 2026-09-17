import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

const id = '10000000-0000-4000-8000-000000000001';
const profile = { id, role: 'aliado', display_name: 'Leitor', employee_id: 'RR01' };
function compile(file, overrides = {}, role = 'aliado') {
  const code = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  const dependencies = {
    react: React, 'react/jsx-runtime': jsx,
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
    'next/image': { default: () => null },
    'next/navigation': { redirect: url => { throw Error(`REDIRECT:${url}`); }, notFound: () => { throw Error('NOT_FOUND'); } },
    'next/cache': { revalidatePath() {} },
    '@/lib/auth': { getCurrentProfile: async () => ({ ...profile, role }), requireRole: async roles => { if (!roles.includes(role)) throw Error('FORBIDDEN'); return { ...profile, role }; } },
    '@/lib/session': { SESSION_DEADLINE_COOKIE: 'deadline' },
    '@/lib/supabase/server': { createClient: async () => { throw Error('Unexpected database access'); } },
    '@/lib/supabase/admin': { createAdminClient: () => { throw Error('Unexpected admin access'); } },
    ...overrides,
  };
  vm.runInNewContext(code, { exports, File, crypto, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.invalid', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test' } }, require(name) {
    if (name in dependencies) return dependencies[name];
    if (name.endsWith('.css')) return { default: {} };
    if (name.endsWith('/InformationOrigin')) return compile('app/bestiario/InformationOrigin.tsx');
    if (/Header$|Modal$|ConfirmSubmitButton$|LiveNameSearch$|CreatureDirectory$|BestiaryManual$|ThreatStars$|DamageDot$|CreatureForm$|TreasuryLedger$|ImageCropInput$/.test(name)) return { default: () => null };
    if (name.endsWith('/model') || name === './model' || name === '../model') return compile('app/bestiario/model.ts');
    if (name.endsWith('/actions') || name === './actions') return {};
    throw Error(`Unexpected import: ${file}: ${name}`);
  } });
  return exports;
}

test('ally recognized by actual auth helper but denied staff-only roles', async () => {
  const auth = compile('lib/auth.ts', {
    react: { cache: fn => fn }, 'next/server': { connection: async () => {} },
    '@/lib/supabase/server': { createClient: async () => ({ auth: { getClaims: async () => ({ data: { claims: { sub: id } } }) }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile }) }) }) }) }) },
  });
  assert.equal((await auth.getCurrentProfile()).role, 'aliado');
  assert.equal((await auth.requireRole(['aliado','funcionario','admin'])).id, id);
  await assert.rejects(auth.requireRole(['funcionario','admin']), /sem-permissao/);
});

test('ally navigation includes archives but not ADM or account editing, desktop and mobile', () => {
  for (const mobile of [false,true]) {
    let state = 0;
    const Header = compile('app/HeaderClient.tsx', { react: { ...React, useState: initial => [++state === 4 ? mobile : initial, () => {}] } }).default;
    const html = renderToStaticMarkup(React.createElement(Header, { profile, photoUrl: null, isVisitor: false }));
    assert.match(html, /href="\/bestiario"/); assert.match(html, /href="\/relatorios"/);
    assert.match(html, /Aliado/);
    assert.doesNotMatch(html, /href="\/(adm|tesouraria|perfil)/);
  }
});

test('ally cannot enter restricted pages, even with an employee link', async () => {
  for (const path of ['adm/page.tsx','adm/tesouraria/page.tsx','adm/funcionarios/page.tsx','bestiario/novo/page.tsx','bestiario/[id]/editar/page.tsx','perfil/page.tsx']) {
    const Page = compile(`app/${path}`).default;
    await assert.rejects(Page({ params: Promise.resolve({id}), searchParams: Promise.resolve({}) }), /FORBIDDEN/, path);
  }
});

test('ally direct mutation calls are rejected before accessing the database', async () => {
  for (const file of ['bestiario/actions.ts','relatorios/actions.ts','adm/actions.ts','adm/tesouraria/actions.ts','funcionarios/[code]/actions.ts','subsidiarias/actions.ts','subsidiarias/modal-actions.ts','perfil/actions.ts']) {
    const actions = compile(`app/${file}`);
    for (const [name, action] of Object.entries(actions)) {
      if (typeof action !== 'function') continue;
      const data = new FormData();
      await assert.rejects(name === 'saveCreature' ? action({error:''}, data) : action(data), /FORBIDDEN/, `${file}: ${name}`);
    }
  }
});

function archiveDb() {
  const creature = { id, name: 'Criatura teste', category: 'Ferais', threat: 8, image_path: 'test.webp', discoverer_employee_id: null, created_by: id, description: 'Descrição', strategies: '', abilities: [] };
  return { storage: { from: () => ({ createSignedUrls: async () => ({data:[]}), createSignedUrl: async () => ({data:null}) }) }, from(table) {
    const row = table === 'bestiary_creatures' ? creature : { id, title:'Relatório teste', report_date:'2026-09-16', summary:'Resumo', document_url:'https://example.com/doc', author_employee_id:null };
    const q = { select: () => q, eq: () => q, order: () => q, returns: async () => ({ data: table === 'employees' ? [] : [row] }), maybeSingle: async () => ({data:row}) };
    return q;
  } };
}
test('ally can render archive lists and details without create/edit/delete controls, including own former entries', async () => {
  for (const path of ['bestiario/page.tsx','bestiario/[id]/page.tsx','relatorios/page.tsx','relatorios/[id]/page.tsx']) {
    const Page = compile(`app/${path}`, { '@/lib/supabase/server': { createClient: async () => archiveDb() } }).default;
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) }));
    assert.doesNotMatch(html, /Nova criatura|Editar criatura|Excluir criatura|Novo relatório|Excluir relatório|href="[^\"]*\/editar"/, path);
  }
});

test('migration has separate read permissions and restrictive ally write guards', () => {
  const sql = readFileSync(new URL('../supabase/migrations/202609160003_ally_readonly.sql', import.meta.url), 'utf8');
  assert.match(sql, /role::text in \('aliado','funcionario','admin'\)/);
  assert.doesNotMatch(sql, /create or replace function private.can_access_bestiary/);
  for (const command of ['insert','update','delete']) assert.ok(sql.includes(`as restrictive for ${command}`));
  assert.match(sql, /aliado_no_treasury/);
  assert.match(sql, /p.role::text='funcionario'/);
});

test('administrator can create an ally account', async () => {
  const writes = [];
  const actions = compile('app/adm/actions.ts', { '@/lib/supabase/admin': { createAdminClient: () => ({
    auth: { admin: { createUser: async () => ({data:{user:{id}}}), deleteUser: async () => {} } },
    from: () => ({ upsert: async data => { writes.push(data); return {error:null}; } }),
  }) } }, 'admin');
  const form = new FormData();
  Object.entries({email:'ally@example.com',password:'test-password',display_name:'Aliado teste',role:'aliado',employee_id:''}).forEach(([key,value])=>form.set(key,value));
  await assert.rejects(actions.createAccount(form), /criado=1/);
  assert.equal(writes[0].role, 'aliado');
});
