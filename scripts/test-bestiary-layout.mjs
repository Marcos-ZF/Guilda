// Local browser layout regression test using the real components and styles,
// with fixture data only. Does not connect to Supabase.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
function compile(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, crypto, require: name => { if (name in dependencies) return dependencies[name]; throw Error(name); } });
  return exports;
}
const model = compile('../app/bestiario/model.ts');
const deps = { react: { ...React, useActionState: () => [{ error: '' }, '/fixture', false] }, 'react/jsx-runtime': jsx, './model': model, './bestiario.module.css': { default: new Proxy({}, { get: (_, key) => String(key) }) }, 'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) } };
deps['./ThreatStars'] = compile('../app/bestiario/ThreatStars.tsx', deps);
deps['./DamageDot'] = compile('../app/bestiario/DamageDot.tsx', deps);
const Form = compile('../app/bestiario/CreatureForm.tsx', { ...deps, './actions': { saveCreature() {} }, '@/app/components/ImageCropInput': { default: () => null } }).default;
const Directory = compile('../app/bestiario/CreatureDirectory.tsx', deps).default;
const Manual = compile('../app/bestiario/BestiaryManual.tsx', deps).default;
const creature = { id: 'fixture', name: 'Criatura de teste', category: 'Sapiens', threat: 8, abilities: [{ name: 'Habilidade mágica', description: 'Descrição', damage_type: 'magic' }], description: '', strategies: '' };
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8') + readFileSync(new URL('../app/bestiario/bestiario.module.css', import.meta.url), 'utf8');
const markup = renderToStaticMarkup(React.createElement(React.Fragment, null,
  React.createElement(Form, { creature, employees: [{ id: 'test', code: 'T1', name: 'Nome de exemplo' }] }),
  React.createElement(Manual),
  React.createElement(Directory, { creatures: [1,2,3].map(id => ({ ...creature, id: String(id), imageUrl: null, responsibleName: 'Responsável' })) })));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  for (const [width, columns] of [[1440,3],[900,2],[390,1],[320,1]]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.setContent(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><main style="max-width:1240px;margin:20px auto;padding:16px">${markup}</main></body></html>`);
    const values = await page.evaluate(() => {
      const threat = document.querySelector('[name=threat]').getBoundingClientRect();
      const responsible = document.querySelector('[name=discoverer_employee_id]').getBoundingClientRect();
      const cards = [...document.querySelectorAll('.card')].map(item => item.getBoundingClientRect());
      const controls = [...document.querySelectorAll('input,select,textarea,.card,.stars,.damagePicker')].filter(item => !item.closest('dialog')).map(item => item.getBoundingClientRect());
      return { aligned: Math.abs(threat.y - responsible.y) < 1 && threat.height === responsible.height, columns: cards.filter(item => item.y === cards[0].y).length, overflow: controls.some(item => item.right > innerWidth + 1 || item.left < -1), remove: document.querySelector('.removeAbility').getBoundingClientRect().height, add: [...document.querySelectorAll('button')].find(item => item.textContent.includes('Adicionar habilidade')).getBoundingClientRect().height };
    });
    assert.equal(values.columns, columns, `columns at ${width}`);
    assert.equal(values.overflow, false, `overflow at ${width}`);
    if (width > 760) assert.equal(values.aligned, true, `aligned controls at ${width}`);
    assert.ok(values.remove < values.add);
    await page.evaluate(() => document.querySelector('dialog').showModal());
    assert.equal(await page.locator('dialog').isVisible(), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog').isVisible(), false);
    console.log(`PASS ${width}px: ${columns} columns, aligned controls, no overflow, compact removal, modal Escape`);
    if (process.env.LAYOUT_SCREENSHOT && width === 1440) await page.screenshot({ path: process.env.LAYOUT_SCREENSHOT, fullPage: true });
  }
} finally { await browser.close(); }
