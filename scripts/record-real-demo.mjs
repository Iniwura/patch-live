/**
 * Real Chromium screen recording of PATCH//LIVE.
 * This is OFFLINE GUIDED gameplay and is labelled accordingly.
 * No fake Twitch packets, no forged chat usernames, no forced win flags.
 */
import { chromium } from 'playwright';
import {mkdir,copyFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const dir=join(process.cwd(),'demo-capture');
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({
  viewport:{width:1600,height:900},
  recordVideo:{dir,size:{width:1600,height:900}},
  reducedMotion:'no-preference'
});
const page=await context.newPage();
page.setDefaultTimeout(18000);
const errors=[];
page.on('pageerror',err=>errors.push(err.message));
const base='http://127.0.0.1:4173';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const log=msg=>console.log('[DEMO]',msg);
try {
  log('Recording real landing page');
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  await sleep(4500);
  await page.locator('a[href="/duel/"]').first().click();
  await page.waitForURL(/\/duel\/$/);
  await page.locator('#play-btn').waitFor();
  await page.evaluate(()=>document.querySelector('#stage')?.scrollIntoView({block:'start',behavior:'instant'}));
  await sleep(1600);
  // Actual instructions, not a mock.
  await page.locator('.controls-help summary').click();
  await page.locator('.controls-help').scrollIntoViewIfNeeded();
  await sleep(3200);
  await page.locator('.controls-help summary').click();
  await page.evaluate(()=>document.querySelector('#stage')?.scrollIntoView({block:'start',behavior:'instant'}));
  await sleep(850);
  log('Starting genuine guided game engine');
  await page.locator('#show-btn').click();
  await page.evaluate(()=>document.querySelector('#stage')?.scrollIntoView({block:'start',behavior:'instant'}));
  const deadline=Date.now()+110000;
  let lastWave='';
  let completed=false;
  while(Date.now()<deadline){
    if(await page.locator('#result-screen').isVisible()){completed=true;break;}
    const wave=(await page.locator('#wave-label').textContent().catch(()=>''))||'';
    if(wave!==lastWave){log('Observed wave '+wave);lastWave=wave;}
    await sleep(1500);
  }
  log('Guide victory screen visible: '+completed);
  if(!completed)errors.push('Guided showcase did not reach the result screen within 110 seconds.');
  await sleep(4700);
  // Show how to connect the actual Twitch gateway, without claiming authentication.
  await page.locator('#twitch-connect').click();
  await sleep(3500);
  await page.locator('#twitch-close').click();
  await sleep(1200);
  await writeFile(join(dir,'report.json'),JSON.stringify({
    recordingMode:'offline-guided-showcase',
    twitchLiveTested:false,
    completed,
    finalWave:lastWave,
    pageErrors:errors,
    recordedAt:new Date().toISOString()
  },null,2));
} finally {
  const video=page.video();
  await context.close();
  if(video)await copyFile(await video.path(),join(dir,'codebreakers-actual-gameplay.webm'));
  await browser.close();
}
console.log('[DEMO] Browser errors:',JSON.stringify(errors));
if(errors.length)process.exitCode=1;
