#!/usr/bin/env node
/* Refuse to deploy a stale, malformed, mismatched or empty feed. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const feed=JSON.parse(await readFile(resolve(root,'data/live/current.json'),'utf8'));
const index=JSON.parse(await readFile(resolve(root,'data/protocols.json'),'utf8'));
assert.equal(feed.schemaVersion,1);
assert.equal(feed.catalogHash,index.bundle.sha256);
assert.ok(['COMPLETE','PARTIAL'].includes(feed.status));
assert.ok(feed.records && Object.keys(feed.records).length>0,'No verified records: refusing FTP');
assert.ok(Date.now()-Date.parse(feed.generatedAt)>=-30000 && Date.now()-Date.parse(feed.generatedAt)<180000,'Feed generation date invalid or stale');
const hashes=new Set();let good=0;
for(const [id,row] of Object.entries(feed.records)){
 assert.equal(row.id,id);assert.equal(row.status,'LIVE');
 assert.match(String(row.tokenContract||''),/^0x[0-9a-f]{40}$/i);
 assert.match(String(row.protocolContract||''),/^0x[0-9a-f]{40}$/i);
 assert.match(String(row.live?.blockHash||''),/^0x[0-9a-f]{64}$/i);
 assert.match(String(row.live?.raw||''),/^\d+$/);
 const age=Date.now()-Date.parse(row.live.observedAt);
 assert.ok(age>=-30000 && age<480000,'Stale block in new feed for '+id);
 hashes.add(row.chainId+':'+row.live.blockNumber+':'+row.live.blockHash);good++;
}
assert.ok(good<=index.catalog.total);
console.log('OK: '+good+' verified contract observations across '+hashes.size+' block contexts.');
