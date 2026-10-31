import { cp, mkdir, rm } from 'node:fs/promises';
const out = new URL('../dist/', import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(new URL('../index.html', import.meta.url), new URL('index.html', out));
await cp(new URL('../src/', import.meta.url), new URL('src/', out), { recursive: true });
await cp(new URL('../play/', import.meta.url), new URL('play/', out), { recursive: true });
await cp(new URL('../duel/', import.meta.url), new URL('duel/', out), { recursive: true });
console.log('Static output created in dist/. No dependencies needed.');
