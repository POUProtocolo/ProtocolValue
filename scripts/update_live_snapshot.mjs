#!/usr/bin/env node
/* ProtocolValue — scheduled collector. Reuses the exact public proof and price adapters.
   No wallets, signatures, market APIs or third-party price substitution.
   Node >=22: node scripts/update_live_snapshot.mjs --check | --publish */
import {readFile,writeFile,rename} from 'node:fs/promises';
import {resolve,dirname,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInThisContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const publish=process.argv.includes('--publish');
const check=process.argv.includes('--check');
if(!publish && !check) {console.error('Use --check (offline validation) or --publish (RPC reads and atomically publish verified feed)');process.exit(2)}
if(!globalThis.crypto?.subtle)globalThis.crypto=webcrypto;
globalThis.window=globalThis;
const realFetch=globalThis.fetch.bind(globalThis);
globalThis.fetch=async (url,options={})=>{
  if(typeof url==='string' && !/^https?:\/\//i.test(url)){
    const path=resolve(root,url.replace(/^\//,''));
    if(path!==root && !path.startsWith(root+sep))throw Error('Local read outside project');
    try{const bytes=await readFile(path);return new Response(bytes,{status:200,headers:{'content-type':url.endsWith('.json')?'application/json':'application/octet-stream'}})}
    catch(e){if(e?.code==='ENOENT')return new Response('Not found',{status:404});throw e}
  }
  return realFetch(url,options);
};
const files=['fast-rpc','curve-reader','capitalization','price-proof-extended','protocol-loader','live-reader','validated-usdt-reader','native-proof'];
for(const file of files)runInThisContext(await readFile(resolve(root,'assets',file+'.js'),'utf8'),{filename:file+'.js'});
const tokens=await window.PVLoadProtocols();
const index=JSON.parse(await readFile(resolve(root,'data/protocols.json'),'utf8'));
const bundleHash=index.bundle?.sha256;
if(!/^[a-f0-9]{64}$/.test(bundleHash||'') || tokens.length!==index.catalog.total || tokens.failedFiles.length || tokens.skippedFiles.length) {
  throw Error('Catalog integrity mismatch: refusing to publish shared feed');
}
const identity=new Set(tokens.map(t=>t.chainId+':'+t.tokenContract.toLowerCase()));
if(identity.size!==tokens.length)throw Error('Duplicate token identity');
console.log(`Catalog verified: ${tokens.length} eligible protocols, ${new Set(tokens.map(t=>t.chainId)).size} chains, bundle ${bundleHash.slice(0,10)}…`);
if(check){console.log('CHECK OK: All token proofs passed their existing catalog loader. No RPC and no output modifications.');process.exit(0)}
const allowed=t=>t.autoUpdateEnabled&&t.auditState!=='SUSPENDED';
const byChain=new Map();
for(const token of tokens.filter(allowed)){
  if(!byChain.has(token.chainId))byChain.set(token.chainId,[]);
  byChain.get(token.chainId).push(token);
}
const records={};const errors={};const stats={};
const runGroup=async (chain,items)=>{
  const deadlineAt=Date.now()+85000;
  try{
    const ctx=await window.PVLive.cycle(chain,{deadlineAt});
    const native=items.filter(t=>t.runtimeMode==='VALIDATED_USDT_NATIVE');
    if(native.length) window.PVValidatedUSDT.prepareEvents(native,ctx);
    // Bound concurrency per chain while retaining the existing batch RPC transport.
    const pending=[...items];
    await Promise.all(Array.from({length:Math.min(5,items.length)},async()=>{
      while(pending.length){
        const token=pending.shift();
        try{
          await window.PVLive.refresh(token,ctx);
          const r=token.live;
          if(token.liveStatus!=='LIVE'||!r||r.blockHash?.toLowerCase()!==ctx.blockHash.toLowerCase()||
             String(r.blockNumber)!==String(ctx.blockNumber)||!/^\d+$/.test(String(r.raw||''))||
             r.observedAt!==ctx.observedAt)throw Error('Incomplete pinned on-chain verification');
          records[token.id]={id:token.id,status:'LIVE',chainId:token.chainId,
            tokenContract:token.tokenContract,protocolContract:token.protocolContract,
            live:r,capitalizationLive:token.capitalizationLive||null};
        }catch(e){errors[token.id]=String(e?.message||e).slice(0,240)}
      }
    }));
    stats[String(chain)]={blockNumber:ctx.blockNumber,blockHash:ctx.blockHash,...ctx.stats};
  }catch(e){
    for(const token of items)errors[token.id]=String(e?.message||e).slice(0,240);
  }
};
await Promise.all([...byChain].map(([chain,items])=>runGroup(chain,items)));
const successes=Object.keys(records).length;
console.log(`Collector result: ${successes}/${tokens.filter(allowed).length} verified, ${Object.keys(errors).length} not confirmed`);
if(successes===0){console.error('No current successful RPC observations. Previous published feed preserved.');process.exit(1)}
// SWR retention: only carry an independently verified prior result while its original
// BLOCK timestamp is still fresh. Never modify observedAt or claim the failed adapter succeeded.
let retained=0;
try{
  const previous=JSON.parse(await readFile(resolve(root,'data/live/current.json'),'utf8'));
  if(previous.catalogHash===bundleHash&&previous.schemaVersion===1&&previous.records){
    for(const token of tokens.filter(allowed)){
      if(records[token.id])continue;
      const row=previous.records[token.id],blockTime=Date.parse(row?.live?.observedAt||'');
      if(row?.status==='LIVE' && row.chainId===token.chainId &&
        String(row.tokenContract||'').toLowerCase()===token.tokenContract.toLowerCase() &&
        String(row.protocolContract||'').toLowerCase()===token.protocolContract.toLowerCase() &&
        Number.isFinite(blockTime) && Date.now()-blockTime>=-30000 && Date.now()-blockTime<110000){
          records[token.id]=row;retained++;
      }
    }
  }
}catch{}
console.log(`Reused ${retained} verified observations from the prior cycle, within strict 110 s block-age limit.`);
const payload={schemaVersion:1,catalogHash:bundleHash,generatedAt:new Date().toISOString(),
  status:successes===tokens.filter(allowed).length?'COMPLETE':'PARTIAL',
  records,summary:{eligible:tokens.length,attempted:tokens.filter(allowed).length,verified:successes,retainedStillFresh:retained,published:Object.keys(records).length,unavailable:Object.keys(errors).length},
  chainStats:stats,errors};
const target=resolve(root,'data/live/current.json');const temp=target+'.tmp';
await writeFile(temp,JSON.stringify(payload,null,2)+'\n');await rename(temp,target);
console.log('Published atomically:',relative(root,target));
