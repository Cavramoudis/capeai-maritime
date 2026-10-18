import test from 'node:test';
import assert from 'node:assert/strict';
import {createExampleStudy} from '../src/model.mjs';
import {parseStudyJSON,serializeStudy,loadWorkspace,saveDraft,saveStudy,deleteStudy,WORKSPACE_KEY} from '../src/studies.mjs';
function memoryStorage() {const map=new Map();return {getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)};}

test('study export excludes credentials and unknown data at every object level',()=>{
  const study=createExampleStudy();
  study['auth-password']='never-export-this';study.acquisition.token='never-export-this';
  const text=serializeStudy(study);
  assert.equal(text.includes('never-export-this'),false);
  assert.equal(text.includes('auth-password'),false);
  assert.equal(parseStudyJSON(text).study.acquisition.price,study.acquisition.price);
});
test('import and export preserve explicit zero assumptions and charter holidays',()=>{
  const study=createExampleStudy();
  study.financing.ltvPct=0;study.operations.inflationPct=0;study.operations.brokeragePct=0;study.carry.ratePct=0;
  study.charter=[{year:1,dailyRate:0,revenueDays:0}];
  const result=parseStudyJSON(serializeStudy(study));
  assert.equal(result.study.financing.ltvPct,0);
  assert.equal(result.study.operations.inflationPct,0);
  assert.equal(result.study.operations.brokeragePct,0);
  assert.deepEqual(result.study.charter,[{year:1,dailyRate:0,revenueDays:0}]);
});
test('legacy migration preserves zero values and explicitly flags CAPEX timing',()=>{
  const result=parseStudyJSON(JSON.stringify({a_price:'10000000',a_debt:'0',s_tc:'12000',s_hold:'5',s_opex_inflation:'0',spv_comm:'0',sv_dd_cost:'300000','auth-password':'secret',hire_rate_y1:'0',hire_days_y1:'0'}));
  assert.equal(result.study.financing.ltvPct,0);
  assert.equal(result.study.operations.brokeragePct,0);
  assert.deepEqual(result.study.charter,[{year:1,dailyRate:0,revenueDays:0}]);
  assert.equal(result.study.capex[0].amount,300000);
  assert.ok(result.warnings.some(w=>w.includes('Year 1')));
  assert.equal(JSON.stringify(result).includes('secret'),false);
});
test('hostile or malformed imports cannot create properties or turn numbers into strings',()=>{
  assert.throws(()=>parseStudyJSON('{broken'),/valid JSON/);
  assert.throws(()=>parseStudyJSON('[]'),/object/);
  assert.throws(()=>parseStudyJSON('{"schemaVersion":999}'),/version/);
  const s=createExampleStudy();s.acquisition.price='1000000';
  assert.throws(()=>parseStudyJSON(JSON.stringify(s)),/finite number/);
  const raw=JSON.stringify(createExampleStudy()).replace('{','{"__proto__":{"polluted":true},');
  const result=parseStudyJSON(raw);
  assert.equal(result.study.polluted,undefined);assert.equal({}.polluted,undefined);
});
test('all model-supported CAPEX rows roundtrip and legacy scrap tonnage follows original precedence',()=>{
  const study=createExampleStudy();study.capex=Array.from({length:300},(_,i)=>({year:1,amount:i,label:`Payment ${i}`}));
  assert.equal(parseStudyJSON(serializeStudy(study)).study.capex.length,300);
  const migrated=parseStudyJSON(JSON.stringify({a_price:1000000,s_ldt:3000,v_ldt:4000,_exitMode:'scrap',s_scrap_p:500}));
  assert.equal(migrated.study.vessel.ldt,3000);
});
test('empty legacy fields use documented original defaults while explicit zeros stay zero',()=>{
  const blank=parseStudyJSON(JSON.stringify({a_price:1000000,s_dep:'',s_opex_inflation:'',spv_comm:''}));
  assert.equal(blank.study.exit.depreciationPct,0);
  assert.equal(blank.study.operations.inflationPct,2.5);
  assert.equal(blank.study.operations.brokeragePct,1.25);
  const zero=parseStudyJSON(JSON.stringify({a_price:1000000,s_dep:0,s_opex_inflation:0,spv_comm:0}));
  assert.equal(zero.study.operations.inflationPct,0);assert.equal(zero.study.operations.brokeragePct,0);
});
test('library updates one saved study and recovers the active draft',()=>{
  const storage=memoryStorage();const s=createExampleStudy();
  const first=saveStudy(s,undefined,storage);
  s.name='Changed scenario';saveStudy(s,first.id,storage);
  assert.equal(loadWorkspace(storage).savedStudies.length,1);
  assert.equal(loadWorkspace(storage).activeStudy.name,'Changed scenario');
  deleteStudy(first.id,storage);
  assert.equal(loadWorkspace(storage).savedStudies.length,0);
  assert.equal(loadWorkspace(storage).activeStudy.name,'Changed scenario');
});
test('storage failures are explicit and damaged data is not overwritten',()=>{
  const storage=memoryStorage();storage.setItem(WORKSPACE_KEY,'broken original');
  assert.ok(loadWorkspace(storage).warning);
  assert.equal(saveDraft(createExampleStudy(),storage).ok,false);
  assert.equal(storage.getItem(WORKSPACE_KEY),'broken original');
  const blocked={getItem:()=>null,setItem:()=>{throw new Error('Quota');}};
  assert.match(saveDraft(createExampleStudy(),blocked).error,/could not save/);
  assert.throws(()=>saveStudy(createExampleStudy(),undefined,blocked),/could not save/);
});
test('an oversized damaged library is preserved rather than truncated on autosave',()=>{
  const storage=memoryStorage();const s=createExampleStudy();
  const original=JSON.stringify({version:1,draft:s,saved:Array.from({length:41},(_,i)=>({id:String(i),study:s,updatedAt:'2026-10-18'}))});
  storage.setItem(WORKSPACE_KEY,original);
  assert.ok(loadWorkspace(storage).warning);assert.equal(saveDraft(s,storage).ok,false);
  assert.equal(storage.getItem(WORKSPACE_KEY),original);
});
test('duplicate saved IDs are marked damaged and cannot collapse on save',()=>{
  const storage=memoryStorage(),s=createExampleStudy();
  const original=JSON.stringify({version:1,draft:s,saved:[{id:'same',study:s},{id:'same',study:{...s,name:'Second original'}}]});
  storage.setItem(WORKSPACE_KEY,original);
  assert.ok(loadWorkspace(storage).warning);assert.throws(()=>deleteStudy('same',storage),/damaged/);
  assert.equal(storage.getItem(WORKSPACE_KEY),original);
});
