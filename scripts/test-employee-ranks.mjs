import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../app/funcionarios/[code]/actions.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText;

function setup(role, linked = true) {
  const writes = [];
  const query = {
    select: () => query, eq: () => query,
    single: async () => ({ data: { id: 'employee-id', code: 'RR01' } }),
    update: (data) => ({ eq: async () => { writes.push(data); return { error: null }; } }),
  };
  const exports = {};
  vm.runInNewContext(code, { exports, File, require(name) {
    if (name === 'next/cache') return { revalidatePath() {} };
    if (name === 'next/navigation') return { redirect(location) { throw new Error(location); } };
    if (name === '@/lib/auth') return { requireRole: async () => ({ role, employee_id: linked ? 'RR01' : 'OTHER' }) };
    if (name === '@/lib/supabase/server') return { createClient: async () => ({ from: () => query }) };
    throw new Error(name);
  } });
  return { action: exports.updateEmployeeProfile, writes };
}
function form(extra = {}) {
  const data = new FormData();
  Object.entries({ employee_id: 'employee-id', code: 'RR01', name: 'Nome atualizado',
    role_title: 'Classe', specialty: 'Especialidade atualizada', about: 'Sobre atualizado', ...extra,
  }).forEach(([key, value]) => data.set(key, value));
  return data;
}
test('employee edits own profile without clearing omitted ranks', async () => {
  const h = setup('funcionario');
  await assert.rejects(h.action(form()), /salvo=1/);
  assert.equal(h.writes[0].about, 'Sobre atualizado');
  assert.equal(h.writes[0].role_title, 'Classe');
  assert.ok(!Object.hasOwn(h.writes[0], 'position_title'));
  assert.ok(!Object.hasOwn(h.writes[0], 'honor_title'));
});
test('forged employee rank fields never reach the update', async () => {
  const h = setup('funcionario');
  await assert.rejects(h.action(form({ position_title: 'Comandante', honor_title: 'Katyusha' })), /salvo=1/);
  assert.ok(!Object.hasOwn(h.writes[0], 'position_title'));
  assert.ok(!Object.hasOwn(h.writes[0], 'honor_title'));
});
test('admin can set and clear both ranks', async () => {
  const h = setup('admin');
  await assert.rejects(h.action(form({ position_title: 'Comandante', honor_title: 'Katyusha' })), /salvo=1/);
  assert.equal(h.writes[0].position_title, 'Comandante');
  assert.equal(h.writes[0].honor_title, 'Katyusha');
  await assert.rejects(h.action(form()), /salvo=1/);
  assert.equal(h.writes[1].position_title, null);
  assert.equal(h.writes[1].honor_title, null);
});
test('employee cannot edit another character', async () => {
  const h = setup('funcionario', false);
  await assert.rejects(h.action(form()), /sem-permissao/);
  assert.equal(h.writes.length, 0);
});
