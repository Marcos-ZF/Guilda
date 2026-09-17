import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';

test('Home excludes automatic reports before its limit but retains manual and other events', async () => {
  const rows = [
    {source_type:'report',title:'Relatório automático oculto'},
    {source_type:null,title:'Relatório manual visível'},
    {source_type:'employee',title:'Contratação visível'},
    {source_type:'subsidiary',title:'Subsidiária visível'},
    {source_type:'achievement',title:'Feito visível'},
  ].map((row,index)=>({...row,id:String(index),entry_type:'Relatório',entry_date:'2026-09-17',description:'Texto do evento',involved:[]}));
  const calls=[];
  let visible=rows;
  const query={select:()=>query,or:filter=>{calls.push('filter');assert.equal(filter,'source_type.is.null,source_type.neq.report');visible=rows.filter(row=>row.source_type!=='report');return query;},order:()=>query,limit:n=>{calls.push('limit');visible=visible.slice(0,n);return query;},returns:async()=>({data:visible,error:null})};
  const code=ts.transpileModule(readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const exports={};
  vm.runInNewContext(code,{exports,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'test',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test'}},require(name){
    if(name==='react/jsx-runtime')return jsx;
    if(name.endsWith('.css'))return {default:{}};
    if(['./Header','./ContactModal','next/image'].includes(name))return {default:()=>null};
    if(name==='@/lib/supabase/server')return {createClient:async()=>({from:()=>query,rpc:async()=>({data:{reports:12,employees:2,service_time:'08'}})})};
    throw Error(name);
  }});
  const html=renderToStaticMarkup(await exports.default());
  assert.deepEqual(calls,['filter','limit']);
  assert.ok(!html.includes(rows[0].title));
  for(const row of rows.slice(1))assert.ok(html.includes(row.title));
});

test('migration stops only the report creation trigger without deleting history', () => {
  const sql=readFileSync(new URL('../supabase/migrations/202609170002_disable_report_timeline.sql',import.meta.url),'utf8');
  assert.match(sql,/drop trigger if exists report_created_timeline on public\.reports;/);
  assert.doesNotMatch(sql,/delete from|truncate|drop table|employee_created_timeline|subsidiary_created_timeline|achievement_created_timeline/i);
});
