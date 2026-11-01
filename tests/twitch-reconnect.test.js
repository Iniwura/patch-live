import test from 'node:test';
import assert from 'node:assert/strict';
import { TwitchChat } from '../src/twitch.js';

class MockSocket {
  static sockets = [];
  constructor(url) { this.url = url; this.closed = false; MockSocket.sockets.push(this); }
  close() { this.closed = true; }
  emit(type, payload = {}, subscription_type = null) {
    this.onmessage?.({ data: JSON.stringify({metadata:{message_type:type,subscription_type},payload}) });
  }
}

test('Twitch reconnect keeps prior socket until replacement welcome and preserves chat messages', () => {
  const previous = globalThis.WebSocket;
  globalThis.WebSocket = MockSocket;
  try {
    MockSocket.sockets.length = 0;
    const messages = [], statuses = [];
    const chat = new TwitchChat({onStatus: s => statuses.push(s),onMessage: e => messages.push(e)});
    chat.stopped = false;
    chat.active = true;
    chat.userName = 'streamer';
    chat.connectSocket('wss://eventsub.wss.twitch.tv/ws', false);
    const old = MockSocket.sockets[0];
    old.emit('session_reconnect', {session:{reconnect_url:'wss://eventsub.wss.twitch.tv/ws?session=new'}});
    const newer = MockSocket.sockets[1];
    assert.equal(old.closed, false, 'old socket should remain open until replacement welcome');
    old.emit('notification',{event:{message_id:'one',message:{text:'!patch moon'}}},'channel.chat.message');
    assert.equal(messages.length, 1, 'chat must continue during handover');
    newer.emit('session_welcome',{session:{id:'new-session'}});
    assert.equal(old.closed, true, 'old socket closes after replacement welcome');
    assert.equal(chat.active, true);
    assert.equal(statuses.at(-1).state,'live');
    newer.emit('notification',{event:{message_id:'two',message:{text:'!patch meteor'}}},'channel.chat.message');
    assert.equal(messages.length,2);
    chat.stop();
    assert.equal(newer.closed, true);
  } finally {globalThis.WebSocket = previous;}
});

test('stopping during reconnect closes both sockets', () => {
  const previous = globalThis.WebSocket;
  globalThis.WebSocket = MockSocket;
  try {
    MockSocket.sockets.length = 0;
    const chat = new TwitchChat({onStatus:()=>{},onMessage:()=>{}});
    chat.stopped = false;
    chat.connectSocket('wss://eventsub.wss.twitch.tv/ws', false);
    const old = MockSocket.sockets[0];
    old.emit('session_reconnect',{session:{reconnect_url:'wss://eventsub.wss.twitch.tv/ws?session=new'}});
    const next=MockSocket.sockets[1];
    chat.stop();
    assert.equal(old.closed,true);
    assert.equal(next.closed,true);
  }finally{globalThis.WebSocket=previous;}
});

test('revocation stops the socket and removes the stale session token', () => {
  const previousSocket = globalThis.WebSocket;
  const previousStorage = globalThis.sessionStorage;
  globalThis.WebSocket = MockSocket;
  const values = new Map([['patchlive_twitch_token','revoked-token']]);
  globalThis.sessionStorage = {
    getItem: key => values.get(key) ?? null,
    removeItem: key => values.delete(key),
    setItem: (key,value) => values.set(key,String(value))
  };
  try {
    MockSocket.sockets.length = 0;
    const statuses=[];
    const chat = new TwitchChat({onStatus: s => statuses.push(s),onMessage:()=>{}});
    chat.stopped=false;
    chat.token='revoked-token';
    chat.connectSocket('wss://eventsub.wss.twitch.tv/ws',false);
    const socket=MockSocket.sockets[0];
    socket.emit('revocation',{subscription:{status:'authorization_revoked'}});
    assert.equal(chat.stopped,true);
    assert.equal(socket.closed,true);
    assert.equal(values.has('patchlive_twitch_token'),false);
    assert.equal(statuses.at(-1).state,'error');
    assert.match(statuses.at(-1).detail,/authorization_revoked/);
  } finally {
    globalThis.WebSocket=previousSocket;
    globalThis.sessionStorage=previousStorage;
  }
});
