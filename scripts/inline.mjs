/** Single-file artifact for offline judging and static Vercel deployment.
 * Each ESM dependency is embedded as a data URL; no build dependencies.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const memo=new Map();
async function bundle(path) {
  if(memo.has(path))return memo.get(path);
  let code=await readFile(path,'utf8');
  const pattern=/\bfrom\s+(['"])(\.\/[\w.-]+\.js)\1/g;
  const refs=[...code.matchAll(pattern)];
  for(const match of refs){
    const dependency=resolve(dirname(path),match[2]);
    const encoded=await bundle(dependency);
    code=code.replace(match[0],`from "data:text/javascript;base64,${encoded}"`);
  }
  const base64=Buffer.from(code,'utf8').toString('base64');
  memo.set(path,base64);return base64;
}
let html=await readFile(join(root,'play','index.html'),'utf8');
const playCss=await readFile(join(root,'src','play.css'),'utf8');
html=html.replace('<link rel="stylesheet" href="/src/play.css" />',`<style>\n${playCss}\n</style>`);
const play=await bundle(join(root,'src','play.js'));
html=html.replace('<script type="module" src="/src/play.js"></script>',`<script type="module">import "data:text/javascript;base64,${play}";</script>`);
await mkdir(join(root,'dist-standalone'),{recursive:true});
await writeFile(join(root,'dist-standalone','index.html'),html);
console.log(`Standalone artifact ready: ${Buffer.byteLength(html)} bytes`);
