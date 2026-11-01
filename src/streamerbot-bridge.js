/**
 * Optional Twitch chat transport using Streamer.bot's LOCAL WebSocket server.
 * Does not require a PATCH Twitch developer application.
 * Streamer.bot still needs the broadcaster's real Twitch OAuth login.
 * No mock/chat-lab events may be represented as live messages.
 *
 * https://docs.streamer.bot/api/websocket/guide/configuration
 * https://docs.streamer.bot/api/websocket/requests
 * https://docs.streamer.bot/api/websocket/events/twitch/chat-message
 */
const ENDPOINT='ws://127.0.0.1:8080/';
const SUBSCRIBE_ID='patch-streamerbot-chat-subscribe';

/** Convert only real Streamer.bot Twitch.ChatMessage events to EventSub-shaped input. */
export function normalizeStreamerbotChat(packet){
 if(!packet||packet.event?.source!=='Twitch'||packet.event?.type!=='ChatMessage')return null;
 const d=packet.data;
 if(!d||d.isTest!==false||d.meta?.isTest===true||d.anonymous===true)return null;
 if(d.isFromSharedChatGuest===true)return null;
 const id=String(d.user?.id||'');
 if(!/^[0-9]{1,25}$/.test(id)||typeof d.text!=='string'||d.text.length>100)return null;
 const name=d.user?.name||d.user?.login||'Viewer';
 return {
  chatter_user_id:id,
  chatter_user_name:String(name).slice(0,32),
  chatter_user_login:String(d.user?.login||name).slice(0,32),
  message:{text:d.text},
  message_id:typeof d.messageId==='string'?d.messageId:null
 };
}
export class StreamerbotChatBridge{
 constructor({onStatus=()=>{},onMessage=()=>{},WebSocketCtor=null}={}){
  this.onStatus=onStatus;this.onMessage=onMessage;this.WebSocketCtor=WebSocketCtor;
  this.socket=null;this.stopped=true;this.seen=new Set();this.ready=false;this.live=false;
 }
 status(state,detail=''){this.onStatus({state,detail});}
 connect(){
  this.disconnect(false);
  const Socket=this.WebSocketCtor||globalThis.WebSocket;
  if(!Socket){this.status('error','This browser does not support WebSockets.');return;}
  this.stopped=false;this.status('connecting','Connecting to Streamer.bot on this computer…');
  let socket;
  try{socket=new Socket(ENDPOINT);}catch(e){
   this.stopped=true;this.status('error','Local WebSocket blocked: '+e.message);return;
  }
  this.socket=socket;
  socket.onopen=()=>{
   if(this.stopped||socket!==this.socket)return;
   socket.send(JSON.stringify({request:'Subscribe',id:SUBSCRIBE_ID,events:{Twitch:['ChatMessage']}}));
  };
  socket.onmessage=event=>{
   if(this.stopped||socket!==this.socket)return;
   let packet;
   try{packet=JSON.parse(event.data);}catch{return;}
   if(packet?.request==='Hello'&&packet.authentication){
     // This lightweight, read-only fallback intentionally does not handle secrets.
     this.disconnect(false);
     this.status('error','Streamer.bot WebSocket authentication is enforced. Use its default local-only configuration.');return;
   }
   if(packet?.id===SUBSCRIBE_ID){
     if(packet.status==='ok'){
       this.ready=true;this.status('connected','Local Streamer.bot subscription active. Waiting for a real Twitch chat message.');
     }else{
       this.disconnect(false);this.status('error','Streamer.bot refused Twitch.ChatMessage subscription.');
     }
     return;
   }
   if(!this.ready)return;
   const chat=normalizeStreamerbotChat(packet);
   if(!chat)return;
   if(chat.message_id&&this.seen.has(chat.message_id))return;
   if(chat.message_id)this.seen.add(chat.message_id);
   if(this.seen.size>1200)this.seen.clear();
   if(!this.live){
     this.live=true;
     this.status('live','Real Twitch chat message received through local Streamer.bot.');
   }
   this.onMessage(chat);
  };
  socket.onerror=()=>{if(!this.stopped&&socket===this.socket)this.status('error','Cannot reach Streamer.bot at 127.0.0.1:8080. Start its WebSocket Server and allow the browser local-network permission.');};
  socket.onclose=()=>{if(this.stopped||socket!==this.socket)return;this.socket=null;this.stopped=true;this.ready=false;this.live=false;this.status('error','Streamer.bot disconnected. Restart its local server and reconnect.');};
 }
 disconnect(report=true){
  this.stopped=true;this.ready=false;this.live=false;this.seen.clear();
  const socket=this.socket;this.socket=null;
  if(socket){socket.onclose=null;socket.onmessage=null;socket.onerror=null;socket.onopen=null;try{socket.close();}catch{}}
  if(report)this.status('offline','Streamer.bot disconnected.');
 }
}
