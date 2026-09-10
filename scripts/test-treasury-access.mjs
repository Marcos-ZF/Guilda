// Regression checks for server actions. No database or credentials required.
// Run: node --test scripts/test-treasury-access.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../app/adm/tesouraria/actions.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const employee = { id: "10000000-0000-4000-8000-000000000001", name: "Personagem próprio" };

function harness(role = "funcionario", linked = true, databaseError = null, character = employee) {
  const writes = [];
  const invalidations = [];
  const profile = { id: "20000000-0000-4000-8000-000000000001", role, employee_id: linked ? "RR01" : null };
  const supabase = { from(table) {
    if (table === "employees") return { select: () => ({ eq: (column, code) => {
      assert.equal(column, "code");
      assert.equal(code, "RR01");
      return { maybeSingle: async () => ({ data: character, error: null }) };
    } }) };
    assert.equal(table, "treasury_transactions");
    return {
      insert: async (data) => { writes.push(data); return { error: databaseError }; },
      update: (data) => ({ eq: async () => { writes.push(data); return { error: null }; } }),
      delete: () => ({ eq: async () => { writes.push("delete"); return { error: null }; } }),
    };
  } };
  const exports = {};
  vm.runInNewContext(compiled, { exports, require(name) {
    if (name === "next/navigation") return { redirect: (location) => { throw new Error(location); } };
    if (name === "next/cache") return { revalidatePath: (path) => invalidations.push(path) };
    if (name === "@/lib/auth") return { requireRole: async (roles) => {
      if (!roles.includes(role)) throw new Error("forbidden");
      return profile;
    } };
    if (name === "@/lib/supabase/server") return { createClient: async () => supabase };
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return { actions: exports, writes, invalidations };
}

function form(overrides = {}) {
  const data = new FormData();
  Object.entries({ movement_type: "entrada", transaction_date: "2026-09-10", bronze: "5",
    counterparty: "Outro personagem, Mais alguém", description: "", ...overrides,
  }).forEach(([key, value]) => data.set(key, value));
  return data;
}

test("employee entry uses only the server-linked identity, ignoring forged IDs/names", async () => {
  const h = harness();
  await assert.rejects(h.actions.createTreasuryTransaction(form({ counterparty_employee_id: "forged" })), /criado=1/);
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].counterparty, employee.name);
  assert.equal(h.writes[0].counterparty_employee_id, employee.id);
  assert.equal(h.writes[0].movement_type, "entrada");
  assert.equal(h.writes[0].description, "");
  assert.deepEqual(h.invalidations, ["/adm/tesouraria", "/tesouraria"]);
});

test("employee cannot create outgoing transactions", async () => {
  const h = harness();
  await assert.rejects(h.actions.createTreasuryTransaction(form({ movement_type: "saida" })), /erro=permissao/);
  assert.equal(h.writes.length, 0);
});

test("unlinked or missing characters cannot create entries", async () => {
  for (const h of [harness("funcionario", false), harness("funcionario", true, null, null)]) {
    await assert.rejects(h.actions.createTreasuryTransaction(form()), /erro=permissao/);
    assert.equal(h.writes.length, 0);
  }
});

test("negative, zero and invalid amounts are rejected", async () => {
  for (const bronze of ["-10", "0", "NaN", "1.5", "9999999999999"]) {
    const h = harness();
    await assert.rejects(h.actions.createTreasuryTransaction(form({ bronze })), /erro=dados/);
    assert.equal(h.writes.length, 0);
  }
});

test("employee cannot update or delete even via direct action calls", async () => {
  const h = harness();
  await assert.rejects(h.actions.updateTreasuryTransaction(form({ id: employee.id })), /forbidden/);
  await assert.rejects(h.actions.deleteTreasuryTransaction(form({ id: employee.id })), /forbidden/);
  assert.equal(h.writes.length, 0);
});

test("admin retains outgoing, arbitrary counterparties, edit and delete", async () => {
  const h = harness("admin", false);
  await assert.rejects(h.actions.createTreasuryTransaction(form({ movement_type: "saida" })), /criado=1/);
  assert.equal(h.writes[0].movement_type, "saida");
  assert.equal(h.writes[0].counterparty, "Outro personagem, Mais alguém");
  await assert.rejects(h.actions.updateTreasuryTransaction(form({ id: employee.id })), /salvo=1/);
  await assert.rejects(h.actions.deleteTreasuryTransaction(form({ id: employee.id })), /excluido=1/);
  assert.equal(h.writes.length, 3);
});

test("database rejection is never reported as successful", async () => {
  const h = harness("funcionario", true, { code: "42501" });
  await assert.rejects(h.actions.createTreasuryTransaction(form()), /erro=salvar/);
  assert.equal(h.invalidations.length, 0);
});
