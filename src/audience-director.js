import { compilePatch } from './patches.js';

/** No user-supplied code, coordinates, timers, or arbitrary values reach the engine. */
export const POWERS = Object.freeze([
  {id:'medkit',name:'MEDKIT',icon:'✚',side:'ally',description:'+24 streamer HP',duration:0},
  {id:'shield',name:'AEGIS',icon:'◇',side:'ally',description:'Block the next hit',duration:12},
  {id:'lance',name:'LANCE',icon:'⚔',side:'ally',description:'Long-range reflection',duration:12},
  {id:'cannon',name:'RAILGUN',icon:'⌁',side:'ally',description:'Powerful return shots',duration:12},
  {id:'vampire',name:'VAMPIRE',icon:'♧',side:'ally',description:'Reflections restore HP',duration:12},
  {id:'overtime',name:'OVERTIME',icon:'◷',side:'ally',description:'+10 seconds of survival',duration:0},
  {id:'bossheal',name:'BOSS HEAL',icon:'♥',side:'enemy',description:'Repair boss by 35 HP',duration:0},
  {id:'armor',name:'ARMOR',icon:'⬟',side:'enemy',description:'Increase boss max HP',duration:0},
  {id:'frenzy',name:'FRENZY',icon:'↯',side:'enemy',description:'Accelerate boss attacks',duration:10},
  {id:'shackle',name:'SHACKLES',icon:'⊗',side:'enemy',description:'Streamer speed -40%',duration:7},
  {id:'reverse',name:'REVERSE',icon:'↔',side:'enemy',description:'Reverse player controls',duration:7},
  {id:'timecut',name:'TIME CUT',icon:'⌛',side:'enemy',description:'Remove 7 seconds',duration:0},
  {id:'squeeze',name:'SQUEEZE',icon:'⇥',side:'arena',description:'Arena bounds close in',duration:10},
  {id:'crossfire',name:'CROSSFIRE',icon:'✣',side:'arena',description:'Extra attack lanes',duration:10},
  {id:'eclipse',name:'ECLIPSE',icon:'◒',side:'arena',description:'Darken the battlefield',duration:10},
  {id:'shock',name:'SHOCK ZONE',icon:'⚡',side:'arena',description:'Electrify a warning lane',duration:9},
  {id:'evolve',name:'EVOLVE',icon:'✳',side:'arena',description:'Mutate the boss form',duration:0},
  {id:'shuffle',name:'TELEPORT',icon:'⌘',side:'arena',description:'Reposition the streamer',duration:0}
].map(p=>Object.freeze(p)));
export const POWER_MAP=new Map(POWERS.map(p=>[p.id,p]));
export const SIDE_INFO=Object.freeze({
  ally:Object.freeze({label:'HELP THE STREAMER',command:'!power',color:'#eaff68'}),
  enemy:Object.freeze({label:'HELP THE BOSS',command:'!power',color:'#ff738e'}),
  arena:Object.freeze({label:'REWRITE THE ARENA',command:'!power',color:'#b6acff'})
});
const commandPattern=/^\s*!power\s+([a-z]{3,20})\s*$/i;
const patchPattern=/^\s*!patch\s+([a-z-]+(?:\s*\+\s*[a-z-]+)?)\s*$/i;

/** Explicitly supports original 6 physics rules and new 18 audience powers. */
export function parseAudienceCommand(input){
  if(typeof input!=='string'||input.length>100)return null;
  const p=commandPattern.exec(input);
  if(p){const id=p[1].toLowerCase();return POWER_MAP.has(id)?Object.freeze({type:'power',id,key:'power:'+id}):null;}
  const m=patchPattern.exec(input);
  if(m){const recipe=compilePatch(m[1]);return recipe?Object.freeze({type:'patch',id:recipe.id,key:'patch:'+recipe.id}):null;}
  return null;
}
export function canonicalAudienceUser(event){
  if(!event || !event.chatter_user_id || typeof event.message?.text!=='string')return null;
  const command=parseAudienceCommand(event.message.text);
  if(!command)return null;
  return {
    userId:String(event.chatter_user_id),
    name:String(event.chatter_user_name||event.chatter_user_login||'Viewer').slice(0,32),
    messageId:typeof event.message_id==='string'?event.message_id:null,
    ...command
  };
}
export class AudienceRound{
  constructor(durationMs=12000,now=Date.now()){
    this.durationMs=durationMs;this.startedAt=now;this.endsAt=now+durationMs;
    this.votes=new Map();this.names=new Map();
  }
  vote(userId,command,now=Date.now(),displayName=''){
    if(!userId||!command?.key||now<this.startedAt||now>=this.endsAt)return false;
    if(!parseAudienceCommand(command.type==='power'?'!power '+command.id:'!patch '+command.id))return false;
    if(this.votes.get(userId)===command.key)return false;
    this.votes.set(userId,command.key);this.names.set(userId,String(displayName).slice(0,32));return true;
  }
  counts(){const c={};for(const key of this.votes.values())c[key]=(c[key]||0)+1;return c;}
  leader(){
    const counts=this.counts();
    const key=Object.entries(counts).sort(([a,n],[b,m])=>m-n||a.localeCompare(b))[0]?.[0];
    if(!key)return null;
    const [type,id]=key.split(/:(.+)/);return {...parseAudienceCommand((type==='power'?'!power ':'!patch ')+id),votes:counts[key]};
  }
  credits(key){return [...this.votes].filter(([,v])=>v===key).map(([uid])=>this.names.get(uid)).filter(Boolean).slice(0,4);}
  total(){return this.votes.size;}
  remaining(now=Date.now()){return Math.max(0,Math.ceil((this.endsAt-now)/1000));}
}

/** Bounded modifiers live only in memory for a single run, expire after duration. */
export function hasPower(state,id,elapsed=state.elapsed){return (state.modifiers?.[id]||0)>elapsed;}
export function applyPower(state,id,authors=[]){
  const power=POWER_MAP.get(id);if(!power)return null;
  const p=state.player,b=state.boss;
  state.modifiers??={};
  const until=state.elapsed+power.duration;
  if(power.duration)state.modifiers[id]=Math.max(state.modifiers[id]||0,until);
  let description=power.description;
  switch(id){
    case'medkit':p.health=Math.min(100,p.health+24);break;
    case'shield':p.shields=Math.min(2,(p.shields||0)+1);break;
    case'lance':case'cannon':case'vampire':state.weapon=id;state.weaponUntil=state.elapsed+power.duration;break;
    case'overtime':state.duration=Math.min(90,state.duration+10);description='Clock extended by 10s';break;
    case'bossheal':b.health=Math.min(b.maxHealth,b.health+35);break;
    case'armor':{const gain=Math.min(45,500-b.maxHealth);b.maxHealth+=gain;b.health+=gain;break;}
    case'timecut':state.duration=Math.max(state.elapsed+15,Math.max(25,state.duration-7));break;
    case'shuffle':p.x=p.x<490?800:205;p.invuln=Math.max(p.invuln,.5);break;
    case'evolve':{
      const path=['meteor+moon','reverse+magnet','blackout+magnet'];
      const e=evolveArchitect(b,compilePatch(path[Math.min(2,b.evolution||0)]));
      description=e?.name||description;
      break;
    }
    default:break; // a temporary effect is activated by the modifier clock
  }
  if(id==='evolve')b.morphPulse=1.4;
  return {...power,description,authors:[...authors],until:power.duration?until:null};
}
import { evolveArchitect } from './boss-evolution.js';
