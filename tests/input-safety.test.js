import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldCaptureGameKey } from '../src/input-safety.js';

const source=readFileSync(new URL('../src/duel.js',import.meta.url),'utf8');
const element=tagName=>({tagName});

test('keyboard gameplay ignores focused controls and editable content',()=>{
 for(const tagName of ['INPUT','TEXTAREA','SELECT','BUTTON','A'])
   assert.equal(shouldCaptureGameKey(element(tagName)),false,tagName);
 assert.equal(shouldCaptureGameKey({tagName:'DIV',isContentEditable:true}),false);
 assert.equal(shouldCaptureGameKey(element('CANVAS')),true);
 assert.equal(shouldCaptureGameKey(null),true);
 assert.match(source,/shouldCaptureGameKey\(document\.activeElement\)/);
 assert.match(source,/visibilitychange/);
});
