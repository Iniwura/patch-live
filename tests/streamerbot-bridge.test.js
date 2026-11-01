import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStreamerbotChat, StreamerbotChatBridge } from '../src/streamerbot-bridge.js';
const event=(overrides={})=>({
 event:{source:'Twitch',type:'ChatMessage'},
 data:{isTest:false,anonymous:false,text:'!power shield',user:{id:'12345',login:'viewer',name:'Viewer'},
   messageId:'a',...overrides}
});
class Socket{
 static sockets=[];
 constructor(url){this.url=url;this.sent=[];this.closed=false;Socket.sockets.push(this);}
 send(x){this.sent.push(JSON.parse(x));}
 close(){this.closed=true;}
 emit(packet){this.onmessage?.({data:JSON.stringify(packet)});}
 open(){this.onopen?.();}
}
test('only real Twitch chat with a Twitch user ID is accepted',()=>{
 assert.equal(normalizeStreamerbotChat(event()).chatter_user_id,'12345');
 assert.equal(normalizeStreamerbotChat(event()).message.text,'!power shield');
 for(const change of [{isTest:true},{anonymous:true},{user:{id:'fake'}},{text:'a'.repeat(101)},{isFromSharedChatGuest:true},{meta:{isTest:true}}])
   assert.equal(normalizeStreamerbotChat(event(change)),null);
 assert.equal(normalizeStreamerbotChat({...event(),event:{source:'OBS',type:'ChatMessage'}}),null);
 assert.equal(normalizeStreamerbotChat({...event(),event:{source:'Twitch',type:'Raid'}}),null);
});
test('local WebSocket subscribes to ChatMessage and reports live only after real chat',()=>{
 Socket.sockets.length=0;
 const statuses=[],messages=[];
 const bridge=new StreamerbotChatBridge({WebSocketCtor:Socket,onStatus:s=>statuses.push(s),onMessage:m=>messages.push(m)});
 bridge.connect();
 const ws=Socket.sockets.at(-1);
 assert.equal(ws.url,'ws://127.0.0.1:8080/');
 assert.equal(statuses.at(-1).state,'connecting');
 ws.open();
 assert.deepEqual(ws.sent[0].events,{Twitch:['ChatMessage']});
 ws.emit({status:'ok',id:'patch-streamerbot-chat-subscribe'});
 assert.equal(statuses.at(-1).state,'connected');assert.equal(bridge.live,false);
 ws.emit(event({isTest:true}));
 assert.equal(messages.length,0);assert.equal(bridge.live,false);
 ws.emit(event());
 assert.equal(messages.length,1);assert.equal(bridge.live,true);
 assert.equal(statuses.at(-1).state,'live');
 ws.emit(event());assert.equal(messages.length,1);
 bridge.disconnect();assert.equal(ws.closed,true);assert.equal(bridge.live,false);
});
test('authentication, subscription error, socket failure and stale events fail closed',()=>{
 Socket.sockets.length=0;
 const statuses=[],messages=[];
 const b=new StreamerbotChatBridge({WebSocketCtor:Socket,onStatus:s=>statuses.push(s),onMessage:m=>messages.push(m)});
 b.connect();const ws=Socket.sockets.at(-1);ws.open();
 ws.emit({request:'Hello',authentication:{salt:'foo',challenge:'bar'}});
 assert.equal(ws.closed,true);assert.equal(b.stopped,true);assert.equal(statuses.at(-1).state,'error');
 ws.emit(event());assert.equal(messages.length,0);
 b.connect();const second=Socket.sockets.at(-1);second.open();
 second.emit({status:'error',id:'patch-streamerbot-chat-subscribe'});
 assert.equal(second.closed,true);assert.equal(b.stopped,true);assert.equal(statuses.at(-1).state,'error');
 b.connect();const third=Socket.sockets.at(-1);third.open();
 third.emit({status:'ok',id:'patch-streamerbot-chat-subscribe'});
 third.onclose();assert.equal(b.live,false);assert.equal(statuses.at(-1).state,'error');
});
