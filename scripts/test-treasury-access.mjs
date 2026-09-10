// Regression checks for server actions. No database or credentials required.
// Run: node --test scripts/test-treasury-access.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

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

function renderLedger(canManage) {
  const ledgerSource = readFileSync(new URL("../app/adm/tesouraria/TreasuryLedger.tsx", import.meta.url), "utf8");
  const ledgerCode = ts.transpileModule(ledgerSource, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(ledgerCode, { exports, require(name) {
    if (name === "react") return React;
    if (name === "react/jsx-runtime") return jsxRuntime;
    if (name === "./treasury.module.css") return { default: {} };
    if (name === "./actions") return { deleteTreasuryTransaction: "/test-delete" };
    if (name === "./TreasuryModal") return { default: () => React.createElement("button", null, "Editar") };
    if (name === "@/app/components/ConfirmSubmitButton") return { default: ({ children }) => React.createElement("button", null, children) };
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return renderToStaticMarkup(React.createElement(exports.default, {
    canManage, today: "2026-09-10", employees: [], transactions: [{
      id: employee.id, movement_type: "entrada", transaction_date: "2026-09-10",
      bronze: 5, prata: 0, ouro: 0, platina: 0, counterparty: "Personagem próprio",
      description: "Doação", created_at: "2026-09-10T12:00:00Z", creator: null,
    }],
  }));
}

test("employee history shows records and filters without mutation controls", () => {
  for (const canManage of [false, undefined]) {
    const html = renderLedger(canManage);
    assert.match(html, /Histórico de movimentações/);
    assert.match(html, /Pesquisar quem pediu/);
    assert.match(html, /Personagem próprio/);
    assert.match(html, /Doação/);
    assert.doesNotMatch(html, /Editar|Excluir|<form/);
  }
});

test("admin history retains edit and delete controls", () => {
  const html = renderLedger(true);
  assert.match(html, /Editar/);
  assert.match(html, /Excluir/);
});

async function renderPanel(role) {
  const panelSource = readFileSync(new URL("../app/adm/page.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(panelSource, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const queries = [];
  const exports = {};
  vm.runInNewContext(code, { exports, require(name) {
    if (name === "react/jsx-runtime") return jsxRuntime;
    if (name.endsWith(".css")) return { default: {} };
    if (name === "../Header") return { default: () => null };
    if (name === "next/link") return { default: ({ children, ...props }) => React.createElement("a", props, children) };
    if (name === "./actions") return { createAccount: "/test-create", updateProfile: "/test-update" };
    if (name === "@/lib/auth") return { requireRole: async (roles) => {
      assert.ok(roles.includes(role));
      return { id: employee.id, role };
    } };
    if (name === "@/lib/supabase/server") return { createClient: async () => ({ from(table) {
      queries.push(table);
      const query = { select: () => query, order: () => query, returns: async () => ({ data: [] }) };
      return query;
    } }) };
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return { html: renderToStaticMarkup(await exports.default({ searchParams: Promise.resolve({}) })), queries };
}

test("employee ADM panel contains only treasury and backups, without querying private accounts", async () => {
  const { html, queries } = await renderPanel("funcionario");
  assert.match(html, /Módulo 05/);
  assert.match(html, /Tesouraria/);
  assert.match(html, /Backups/);
  assert.doesNotMatch(html, /Usuários e cargos|Criar acesso|Módulo 01|Módulo 02|Módulo 03|Módulo 04/);
  assert.deepEqual(queries, []);
  const hours = [...html.matchAll(/<strong>(\d+) horas<\/strong>/g)].map((match) => Number(match[1]));
  assert.equal(hours.length, 3);
  assert.ok(hours.every((value) => value >= 48 && value <= 120));
});

test("admin retains all modules and account management", async () => {
  const { html, queries } = await renderPanel("admin");
  assert.match(html, /Usuários e cargos/);
  assert.match(html, /Criar acesso/);
  assert.match(html, /Módulo 01/);
  assert.match(html, /Módulo 05/);
  assert.deepEqual(queries, ["profiles", "employees"]);
});
