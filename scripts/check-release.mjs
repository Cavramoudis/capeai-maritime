import {readFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ENGINE_VERSION,SCHEMA_VERSION} from '../src/model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const manifest=JSON.parse(await readFile(path.join(root,'release.json'),'utf8'));
const problems=[];
if(manifest.engineVersion!==ENGINE_VERSION||manifest.schemaVersion!==SCHEMA_VERSION)problems.push('Release version differs from the engine.');
const expected=['index.html','src/app.mjs','src/styles.css','src/model.mjs','src/studies.mjs','src/exports.mjs','manual.html','manual.pdf','glossary.html','current-system.html','target-system.html','model-contract.html','references.html','vendor/pptxgenjs-4.0.1.bundle.js'];
for(const file of expected){try{if(!(await stat(path.join(root,file))).isFile())throw new Error();}catch{problems.push(`Missing release file: ${file}`);}}
const actualFiles=[];
async function inventory(dir){
  for(const item of await readdir(dir,{withFileTypes:true})){
    const location=path.join(dir,item.name),file=path.relative(root,location).split(path.sep).join('/');
    if(/(?:^|\/)(?:\.git(?:ignore)?|\.env(?:\.[^/]*)?|\.impeccable|node_modules|tests|app 2|__pycache__)(?:\/|$)/.test(file)||file.endsWith('RELEASE-REVIEW.md'))problems.push(`Development or retired file shipped: ${file}`);
    if(item.isSymbolicLink()){problems.push(`Symbolic link in release: ${file}`);continue;}
    if(item.isDirectory())await inventory(location);
    else if(item.isFile()&&file!=='release.json')actualFiles.push(file);
    else if(!item.isFile())problems.push(`Unsupported release entry: ${file}`);
  }
}
await inventory(root);
const hashes=manifest.files&&typeof manifest.files==='object'&&!Array.isArray(manifest.files)?manifest.files:{};
if(hashes!==manifest.files)problems.push('The release file manifest must be an object.');
for(const file of actualFiles){
  if(!Object.hasOwn(hashes,file)){problems.push(`Release file has no checksum: ${file}`);continue;}
  const actual=createHash('sha256').update(await readFile(path.join(root,file))).digest('hex');
  if(actual!==hashes[file])problems.push(`Checksum mismatch: ${file}`);
}
for(const file of Object.keys(hashes)){
  if(file.includes('\\')||file.startsWith('/')||file.split('/').some(part=>!part||part==='.'||part==='..'))problems.push(`Unsafe manifest path: ${file}`);
  if(!actualFiles.includes(file))problems.push(`Manifest file is absent from release: ${file}`);
}
const index=await readFile(path.join(root,'index.html'),'utf8');
if(!/src\s*=\s*["'][^"']*src\/app\.mjs["']/.test(index))problems.push('Index does not load the replacement application.');
if(!index.includes('Content-Security-Policy')||!index.includes("connect-src 'none'"))problems.push('The offline calculation boundary is not enforced by the index CSP.');
if(/supabase|api\.anthropic|auth-password|on(?:click|input|change)\s*=/i.test(index))problems.push('Legacy service or inline event handler remains in the index.');
for(const file of (await readdir(root)).filter(name=>name.endsWith('.html'))){
  const html=await readFile(path.join(root,file),'utf8');
  for(const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)){
    const url=match[1].replaceAll('&amp;','&');
    if(/^(?:https?:|mailto:|data:)/.test(url))continue;
    const [rawPath,fragment]=url.split('#');
    const target=path.resolve(root,decodeURIComponent(rawPath||file));
    if(!target.startsWith(root+path.sep)){problems.push(`${file}: link escapes release root: ${url}`);continue;}
    try{
      await stat(target);
      if(fragment&&target.endsWith('.html')){
        const targetHTML=await readFile(target,'utf8');
        if(!targetHTML.includes(`id="${decodeURIComponent(fragment)}"`)&&!targetHTML.includes(`id='${decodeURIComponent(fragment)}'`))problems.push(`${file}: missing fragment: ${url}`);
      }
    }catch{problems.push(`${file}: broken local link: ${url}`);}
  }
}
const pdf=await readFile(path.join(root,'manual.pdf'));
if(pdf.subarray(0,5).toString()!=='%PDF-')problems.push('The manual is not a PDF file.');
if(problems.length){console.error(problems.join('\n'));process.exitCode=1;}else console.log(`Release verified: ${actualFiles.length} checksummed files, replacement app, documentation links and downloadable PDF.`);
