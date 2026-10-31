import test from 'node:test';
import assert from 'node:assert/strict';
import {drawCodexMonster,drawCompilerStage} from '../src/codex-monster.js';
const palette=['PRIME','CATACLYSM','SINGULARITY','ECLIPSE'];
function instrumentedCanvas(){
 const calls=[];
 const gradient=()=>({addColorStop(...args){calls.push(['stop',...args]);}});
 const methods=new Set(['save','restore','translate','scale','beginPath','moveTo','lineTo','closePath','fill','stroke','arc','ellipse','rotate','setLineDash','fillRect','strokeRect','fillText']);
 const ctx=new Proxy({},{
  get(target,key){
   if(key==='createLinearGradient'||key==='createRadialGradient')return (...a)=>{calls.push([key,...a]);return gradient();};
   if(methods.has(key))return (...a)=>{calls.push([key,...a]);};
   return target[key];
  },
  set(target,key,value){target[key]=value;return true;}
 });
 return {ctx,calls};
}
test('four distinct original monster bodies render using Canvas without external artwork',()=>{
 const results=[];
 for(const [i,form] of palette.entries()){
  const {ctx,calls}=instrumentedCanvas();
  drawCodexMonster(ctx,{x:900,y:320,form,evolution:i,aspects:['meteor','moon','reverse'].slice(0,i),maxHealth:460,weakWindow:.5,hitFlash:0,morphPulse:.4},1.5);
  assert.ok(calls.filter(x=>x[0]==='fill').length>25,form);
  assert.ok(calls.some(x=>x[0]==='ellipse'||x[0]==='arc'),form);
  results.push(calls.length);
 }
 assert.equal(results.length,4);
 assert.ok(new Set(results).size>=3,'physical forms must not be identical geometry');
});
test('armor and frenzy produce additional visible monster geometry',()=>{
 const base=instrumentedCanvas();
 drawCodexMonster(base.ctx,{x:900,y:300,form:'PRIME',evolution:0,maxHealth:460},1);
 const evolved=instrumentedCanvas();
 drawCodexMonster(evolved.ctx,{x:900,y:300,form:'PRIME',evolution:0,maxHealth:500,frenzied:true},1);
 assert.ok(evolved.calls.length>base.calls.length+20);
});
test('mutations color the original rift stage and keep floor visible',()=>{
 for(const form of palette){
  const {ctx,calls}=instrumentedCanvas();
  drawCompilerStage(ctx,1.2,form,2);
  assert.ok(calls.filter(x=>x[0]==='fillRect').length>=3,form);
  assert.ok(calls.filter(x=>x[0]==='fillText').length>20,form);
 }
});
