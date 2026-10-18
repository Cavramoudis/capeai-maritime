import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateStudy,createExampleStudy} from '../src/model.mjs';
import {buildCSV,buildReportHTML,buildPowerPoint,csvCell,exportPowerPoint,exportReport} from '../src/exports.mjs';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

test('CSV contains the exact engine flows, full assumptions and all return bases',()=>{
  const study=createExampleStudy(),model=calculateStudy(study),csv=buildCSV(model);
  for(const flow of Object.values(model.flows)) for(const value of flow) assert.ok(csv.includes(String(value)));
  assert.ok(csv.includes('"financing.balloonPct",30'));
  assert.ok(csv.includes('"Investor net cash flow"'));
  assert.ok(csv.includes('"year","dailyRate"'));
});
test('CSV neutralizes formula strings without changing negative numeric flows',()=>{
  for(const text of ['=1+1','+SUM(A1)',' @CMD','\tformula','-command']) assert.ok(csvCell(text).startsWith('"\''));
  assert.equal(csvCell(-123),'-123');
  assert.equal(csvCell('A "name"'),'"A ""name"""');
});
test('report escapes hostile study text and recomputes changed assumptions',()=>{
  const study=createExampleStudy(),old=calculateStudy(study);
  study.name='<img src=x onerror=alert(1)>';study.notes='</p><script>steal()</script>';study.exit.mode='manual';study.exit.manualValue=12345678;
  const html=buildReportHTML(study,old);
  assert.ok(!html.includes('<img src=x'));assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('$12,345,678'));
  assert.ok(html.includes('default-src \'none\''));
});
test('report opens a navigable HTML Blob, disconnects its opener and defers URL cleanup',async()=>{
  const previousWindow=globalThis.window,previousTimer=globalThis.setTimeout;
  const previousCreate=URL.createObjectURL,previousRevoke=URL.revokeObjectURL;
  const events=[];let content,cleanup,delay;
  try {
    URL.createObjectURL=blob=>{content=blob;events.push('create');return 'blob:https://capeai.test/report';};
    URL.revokeObjectURL=url=>events.push(['revoke',url]);
    globalThis.window={open:(url,target)=>{events.push(['open',url,target]);return {set opener(value){events.push(['opener',value]);},get document(){throw new Error('Report navigation must not write into a blank document.');}};}};
    globalThis.setTimeout=(callback,ms)=>{cleanup=callback;delay=ms;events.push('schedule');};
    const study=createExampleStudy();study.name='<script>hostile()</script>';
    exportReport(study);
    assert.deepEqual(events,['create',['open','blob:https://capeai.test/report','_blank'],['opener',null],'schedule']);
    assert.equal(content.type,'text/html;charset=utf-8');
    const html=await content.text();
    assert.ok(html.includes('&lt;script&gt;hostile()&lt;/script&gt;'));
    assert.ok(!html.includes('<script>hostile()'));
    assert.ok(html.includes("default-src 'none'"));
    assert.equal(delay,5*60*1000);
    cleanup();assert.deepEqual(events.at(-1),['revoke','blob:https://capeai.test/report']);
  } finally {
    URL.createObjectURL=previousCreate;URL.revokeObjectURL=previousRevoke;globalThis.setTimeout=previousTimer;
    if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;
  }
});
test('blocked report popup releases its Blob URL and preserves an actionable error',()=>{
  const previousWindow=globalThis.window,previousCreate=URL.createObjectURL,previousRevoke=URL.revokeObjectURL;
  const revoked=[];
  try {
    URL.createObjectURL=()=> 'blob:https://capeai.test/blocked';
    URL.revokeObjectURL=url=>revoked.push(url);
    globalThis.window={open:()=>null};
    assert.throws(()=>exportReport(createExampleStudy()),/Allow a new tab for this site/);
    assert.deepEqual(revoked,['blob:https://capeai.test/blocked']);
  } finally {
    URL.createObjectURL=previousCreate;URL.revokeObjectURL=previousRevoke;
    if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;
  }
});
test('calculation exports reject invalid studies',()=>{
  const study=createExampleStudy();study.acquisition.price=-1;
  assert.throws(()=>buildReportHTML(study),/Correct the study/);
  assert.throws(()=>buildCSV(calculateStudy(study)),/Correct the study/);
});
test('model rejects XML-illegal text but accepts complete Unicode and normal notes',()=>{
  const study=createExampleStudy();
  for(const bad of ['NUL\u0000','control\u000B','unpaired\uD800','\uFFFE']) {
    study.name=bad;assert.equal(calculateStudy(study).valid,false);assert.throws(()=>buildReportHTML(study),/Correct the study/);
  }
  study.name='Ελληνικό πλοίο 🚢';study.notes='Line one\nLine two\tTab';assert.equal(calculateStudy(study).valid,true);
});
test('real PowerPoint file contains current engine values and escaped study text',async()=>{
  const context={console,TextEncoder,TextDecoder,setTimeout,clearTimeout,Blob,Uint8Array,ArrayBuffer};
  context.window=context;context.global=context;vm.createContext(context);
  vm.runInContext(await readFile(new URL('../vendor/pptxgenjs-4.0.1.bundle.js',import.meta.url),'utf8'),context);
  const study=createExampleStudy();study.name='Test <vessel> & owners';study.exit.mode='manual';study.exit.manualValue=12345678;
  const model=calculateStudy(study),deck=buildPowerPoint(context.PptxGenJS,study);
  const bytes=await deck.write({outputType:'uint8array',compression:true});
  const zip=await context.JSZip.loadAsync(bytes);
  const slides=Object.keys(zip.files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name));
  assert.equal(slides.length,7);
  const xml=(await Promise.all(slides.map(file=>zip.file(file).async('string')))).join('\n');
  assert.ok(xml.includes('Test &lt;vessel&gt; &amp; owners'));
  assert.ok(xml.includes('$12,345,678'));
  assert.ok(xml.includes((model.metrics.investor.irr.value*100).toFixed(2)+'%'));
  assert.ok(xml.includes(model.metrics.investor.multiple.toFixed(3)+'x'));
  assert.ok(zip.file('[Content_Types].xml'));
});
test('asynchronous PowerPoint export retains the assumptions selected before the library loads',async()=>{
  const context={console,TextEncoder,TextDecoder,setTimeout,clearTimeout,Blob,Uint8Array,ArrayBuffer};
  context.window=context;context.global=context;vm.createContext(context);
  vm.runInContext(await readFile(new URL('../vendor/pptxgenjs-4.0.1.bundle.js',import.meta.url),'utf8'),context);
  const previousDocument=globalThis.document,previousLibrary=globalThis.PptxGenJS;
  let loader,bytes,fileName;
  try {
    delete globalThis.PptxGenJS;
    globalThis.document={createElement:()=>({}),head:{append:script=>{loader=script;}}};
    const study=createExampleStudy();study.name='Export before edits';study.exit.mode='manual';study.exit.manualValue=12345678;
    const exporting=exportPowerPoint(study);
    assert.ok(loader,'The export must wait for the first library load.');
    study.name='Changed after export';study.exit.manualValue=98765432;
    globalThis.PptxGenJS=function(){
      const deck=new context.PptxGenJS();
      deck.writeFile=async options=>{fileName=options.fileName;bytes=await deck.write({outputType:'uint8array',compression:true});};
      return deck;
    };
    loader.onload();
    await exporting;
    const zip=await context.JSZip.loadAsync(bytes);
    const slideFiles=Object.keys(zip.files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name));
    const xml=(await Promise.all(slideFiles.map(file=>zip.file(file).async('string')))).join('\n');
    assert.equal(fileName,'Export-before-edits.pptx');
    assert.ok(xml.includes('Export before edits'));
    assert.ok(xml.includes('$12,345,678'));
    assert.ok(!xml.includes('Changed after export'));
    assert.ok(!xml.includes('$98,765,432'));
  } finally {
    if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
    if(previousLibrary===undefined)delete globalThis.PptxGenJS;else globalThis.PptxGenJS=previousLibrary;
  }
});
