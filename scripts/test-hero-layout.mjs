import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const css = readFileSync(new URL('../app/globals.css',import.meta.url),'utf8')+readFileSync(new URL('../app/internal.module.css',import.meta.url),'utf8');
const examples = [
  ['Subsidiárias','Setores especializados vinculados à Companhia de Sideria.'],
  ['Funcionários','Registro oficial das pessoas, funções e especialidades que mantêm a Companhia Romanov em operação.'],
  ['Relatórios','Índice dos documentos oficiais da companhia. O conteúdo completo permanece organizado no Google Docs.'],
  ['Bestiário','Criaturas encontradas pela companhia, suas habilidades e estratégias de combate.'],
  ['Gerenciar funcionários','Cadastre os integrantes exibidos no arquivo público da Companhia Romanov.'],
  ['Painel ADM','Central de gestão do conteúdo, das pessoas e das permissões da companhia.'],
  ['Meu perfil','Gerencie sua identidade de acesso e consulte sua área na Companhia.'],
  ['Tesouraria','Registro oficial dos recursos financeiros da Companhia Romanov.'],
];
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  const page=await browser.newPage();
  for(const width of [320,390,600,768,1024,1440,1920]) {
    await page.setViewportSize({width,height:900});
    await page.setContent(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${examples.map(([title,description])=>`<section class="hero"><p class="eyebrow">ARQUIVO / COMPANHIA / 01</p><h1>${title}</h1><p>${description}</p></section>`).join('')}</body></html>`);
    const data=await page.evaluate(()=>[...document.querySelectorAll('.hero')].map(hero=>{
      const bounds=hero.getBoundingClientRect(), title=hero.querySelector('h1').getBoundingClientRect(), subtitle=hero.lastElementChild.getBoundingClientRect();
      return {height:bounds.height,fit:title.right<=bounds.right && title.bottom<=subtitle.top && subtitle.bottom<=bounds.bottom-16};
    }));
    assert.equal(new Set(data.map(item=>item.height)).size,1,`equal heights ${width}`);
    assert.ok(data.every(item=>item.fit),`no clipping/overlap ${width}`);
    console.log(`PASS ${width}px: all eight hero heights equal; text fits without overlap`);
    if(process.env.HERO_SCREENSHOT && [390,1440].includes(width))await page.screenshot({path:`${process.env.HERO_SCREENSHOT}-${width}.png`});
  }
}finally{await browser.close();}
