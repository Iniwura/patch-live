/**
 * Screen-record a real PATCH//LIVE Chromium run. Every gameplay state is
 * produced by the genuine game update, combat, chat-demo and scoring code.
 * The guided audience is simulated and the video is explicitly labelled.
 */
import {chromium} from 'playwright';
import {mkdir,copyFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const dir=join(process.cwd(),'demo-capture');
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({
 viewport:{width:1280,height:720},deviceScaleFactor:1,
 recordVideo:{dir,size:{width:1280,height:720}}
});
const page=await context.newPage();
const errors=[],markers=[];
let start=Date.now(),lastState={};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const mark=(name,details={})=>{
 const entry={name,t:Number(((Date.now()-start)/1000).toFixed(2)),...details};
 markers.push(entry);console.log('CHAPTER',JSON.stringify(entry));
};
page.on('pageerror',e=>errors.push(e.message));
let captured=null;
try{
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
 mark('landing');await sleep(3500);
 await page.goto('http://127.0.0.1:4173/duel/',{waitUntil:'domcontentloaded'});
 mark('intro');await sleep(2500);
 await page.locator('.controls-help summary').click();
 await page.locator('.controls-help').scrollIntoViewIfNeeded();
 mark('controls');await sleep(3300);
 await page.locator('.controls-help summary').click();
 await page.evaluate(()=>document.querySelector('#stage')?.scrollIntoView({block:'start',behavior:'instant'}));
 await sleep(700);
 await page.locator('#show-btn').click();
 await page.evaluate(()=>{
  const badge=document.createElement('div');
  badge.textContent='OFFLINE GUIDED DEMO · SIMULATED CHAT';
  Object.assign(badge.style,{
   position:'fixed',top:'10px',left:'10px',zIndex:9999,
   background:'rgba(6,14,13,.95)',border:'1px solid #dfff69',
   color:'#dfff69',font:'bold 11px monospace',padding:'9px 11px',
   pointerEvents:'none',letterSpacing:'.6px'
  });
  document.body.append(badge);
  document.querySelector('#stage')?.scrollIntoView({block:'start',behavior:'instant'});
 });
 mark('raid-begins');
 let wave=-1,won=false;
 const deadline=Date.now()+100000;
 while(Date.now()<deadline){
  const s=await page.evaluate(()=>window.__demoAdvance(23));
  lastState=s;
  if(s.wave!==wave){
   wave=s.wave;
   mark('wave-'+(wave+1),{gameElapsed:Number(s.elapsed.toFixed(1)),kills:s.kills});
  }
  if(s.result){
   won=s.result==='VICTORY';
   mark('result-'+s.result,{gameElapsed:Number(s.elapsed.toFixed(1)),kills:s.kills});
   break;
  }
  await sleep(270);
 }
 if(!won)throw new Error('Guided real-combat run failed to reach victory: '+JSON.stringify(lastState));
 await sleep(4600);
 mark('local-twitch-option');
 await page.locator('#twitch-connect').click();
 await sleep(3700);
 await page.locator('#twitch-close').click();
 await sleep(700);
} catch(e){
 errors.push(String(e));
} finally {
 await writeFile(join(dir,'walkthrough-markers.json'),JSON.stringify({
   captured:'actual-Chromium-recording',mode:'offline-guided',realTwitch:false,
   result:lastState,markers,errors
 },null,2));
 const video=page.video();
 await context.close();
 if(video){captured=join(dir,'codebreakers-gameplay.webm');await copyFile(await video.path(),captured);}
 await browser.close();
}
console.log('RECORDING',captured,'ERRORS',JSON.stringify(errors));
if(errors.length)process.exitCode=1;
