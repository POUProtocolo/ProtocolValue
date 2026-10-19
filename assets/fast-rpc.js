// Shared block-pinned read transport. No wallet, signatures or transactions.
window.PVFastRPC=(()=>{
 'use strict';
 const endpoints={10:['https://optimism-rpc.publicnode.com','https://mainnet.optimism.io'],1:['https://ethereum-rpc.publicnode.com','https://eth.drpc.org'],56:['https://bsc-rpc.publicnode.com','https://bsc-dataseed.bnbchain.org'],43114:['https://avalanche-c-chain-rpc.publicnode.com','https://api.avax.network/ext/bc/C/rpc']};
 const multicall='0xca11bde05977b3631167028862be2a173976ca11',codeHash='2756d7c52baee85cacb504f6ee1df7aad6809ac8d94a4a111d76991f90d36d6e';
 const queues=new Map(),positions=new Map();let nextId=900000;
 const wait=ms=>new Promise(r=>setTimeout(r,ms)),word=n=>BigInt(n).toString(16).padStart(64,'0');
 const address=/^0x[0-9a-f]{40}$/i,bytes=/^0x(?:[0-9a-f]{2})*$/i;
 function encode(calls){
  const tuples=calls.map(c=>{if(!address.test(c.to)||!bytes.test(c.data))throw Error('Invalid multicall input');return word(c.to)+word(1)+word(96)+word((c.data.length-2)/2)+c.data.slice(2).padEnd(Math.ceil((c.data.length-2)/64)*64,'0');});
  let offset=32*calls.length;const offsets=tuples.map(t=>{const o=word(offset);offset+=t.length/2;return o;});
  return '0x82ad56cb'+word(32)+word(calls.length)+offsets.join('')+tuples.join('');
 }
 function decode(raw,count){
  if(!bytes.test(raw)||raw.length%64!==2)throw Error('Invalid multicall encoding');
  const data=raw.slice(2),length=data.length/2;
  const at=pos=>{if(!Number.isSafeInteger(pos)||pos<0||pos%32||pos+32>length)throw Error('Multicall offset out of bounds');return BigInt('0x'+data.slice(pos*2,pos*2+64));};
  const start=Number(at(0));if(start!==32||at(start)!==BigInt(count))throw Error('Multicall result count mismatch');
  const base=start+32;
  return Array.from({length:count},(_,i)=>{const p=base+Number(at(base+i*32)),success=at(p),offset=Number(at(p+32));if(success!==0n&&success!==1n||offset!==64)throw Error('Invalid multicall tuple');const n=Number(at(p+offset)),from=p+offset+32;if(!Number.isSafeInteger(n)||n<0||from+n>length)throw Error('Multicall bytes out of bounds');return {success:success===1n,data:'0x'+data.slice(from*2,(from+n)*2)};});
 }
 async function sha(code){if(!bytes.test(code)||code==='0x')throw Error('Missing runtime');return [...new Uint8Array(await crypto.subtle.digest('SHA-256',Uint8Array.from(code.slice(2).match(/../g),b=>parseInt(b,16))))].map(x=>x.toString(16).padStart(2,'0')).join('');}
 function pump(q){
  q.pending=q.pending.filter(job=>{if(Date.now()<job.deadlineAt)return true;job.reject(Error('LIVE_READ_DEADLINE: current read exceeded the page budget'));return false;});
  if(q.active>=2||!q.pending.length||q.timer)return;
  if(q.cool>Date.now()){for(const job of q.pending.splice(0))job.reject(Error('RPC_RATE_LIMITED: provider cooling down'));return;}
  const delay=q.next-Date.now();if(delay>0){q.timer=setTimeout(()=>{q.timer=null;pump(q)},delay);return;}
  q.pending.sort((a,b)=>a.priority-b.priority);const index=q.pending.findIndex(job=>!job.logs||q.logActive<2);if(index<0)return;const [job]=q.pending.splice(index,1);q.active++;if(job.logs)q.logActive++;q.next=Date.now()+Math.max(150,job.weight*34);
  Promise.resolve().then(()=>job.work(q)).then(job.resolve,job.reject).finally(()=>{q.active--;if(job.logs)q.logActive--;pump(q)});pump(q);
 }
 function queue(url,work,priority,logs=false,deadlineAt=Infinity,weight=1){let q=queues.get(url);if(!q){q={pending:[],active:0,next:0,cool:0,timer:null,failures:0,logActive:0};queues.set(url,q);}const task=new Promise((resolve,reject)=>q.pending.push({work,priority,logs,deadlineAt,weight,resolve,reject}));pump(q);return task;}
 function request(url,items,priority=0,deadlineAt=Infinity){return queue(url,async q=>{
  const payload=items.map(x=>({jsonrpc:'2.0',id:nextId++,method:x.method,params:x.params}));
  for(let attempt=0;attempt<2;attempt++){
   if(Date.now()>=deadlineAt)throw Error('LIVE_READ_DEADLINE: current read exceeded the page budget');
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),Math.min(4000,Math.max(1,deadlineAt-Date.now())));
   try{
    const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload.length===1?payload[0]:payload),signal:ctrl.signal,cache:'no-store'});
    if(response.status===429){const r=response.headers?.get?.('Retry-After');let delay=r&&/^\d+(?:\.\d+)?$/.test(r)?Number(r)*1000:Date.parse(r)-Date.now();if(!Number.isFinite(delay)||delay<0)delay=1200*(attempt+1);if(attempt||delay>10000){q.cool=Date.now()+Math.max(delay,15000);throw Error('RPC_RATE_LIMITED: HTTP 429 '+items.map(x=>x.method).join(',')+' '+(items[0]?.params?.[0]?.to||''));}if(delay>=deadlineAt-Date.now())throw Error('LIVE_READ_DEADLINE: retry exceeds page budget');clearTimeout(timer);await wait(delay);continue;}
    if(!response.ok)throw Error('RPC HTTP '+response.status+' at '+url+' ('+items.map(x=>x.method).filter((x,i,a)=>a.indexOf(x)===i).join(', ')+')');let data=await response.json();if(Date.now()>=deadlineAt)throw Error('LIVE_READ_DEADLINE: current read exceeded the page budget');if(!Array.isArray(data))data=[data];if(data.length!==payload.length)throw Error('Incomplete RPC response');const byId=new Map(data.map(x=>[x.id,x]));
    const results=payload.map(x=>{const value=byId.get(x.id);if(!value||value.error||!Object.hasOwn(value,'result')){const message=String(value?.error?.message||'Missing RPC result');if(/429|rate.?limit|too many/i.test(message))q.cool=Date.now()+15000;throw Error(message);}return value.result;});q.failures=0;return results;
   }catch(e){
    if(Date.now()>=deadlineAt)throw Error('LIVE_READ_DEADLINE: current read exceeded the page budget');
    if(/RPC HTTP (?:403|408|5\d\d)|AbortError|Failed to fetch|fetch failed|NetworkError|timeout/i.test(String(e))){
      q.failures++;if(q.failures>=2){q.cool=Date.now()+15000;for(const [chain,list] of Object.entries(endpoints)){const n=list.indexOf(url);if(n>=0)positions.set(Number(chain),(n+1)%list.length);}}
    }
    throw e;
   }finally{clearTimeout(timer);}
  }
 },priority,items.some(x=>x.method==='eth_getLogs'),deadlineAt,items.length);}
 async function create(chainId,{deadlineAt=Date.now()+25000}={}){
  const list=endpoints[chainId];if(!list)throw Error('Unsupported chain');let last;
  for(let i=0;i<list.length;i++){
   const slot=((positions.get(chainId)||0)+i)%list.length,url=list[slot];
   try{
    const [chain,block]=await request(url,[{method:'eth_chainId',params:[]},{method:'eth_blockNumber',params:[]}],0,deadlineAt);
    if(BigInt(chain)!==BigInt(chainId)||!/^0x[0-9a-f]+$/i.test(block))throw Error('Wrong chain or block');
    const [header,code]=await request(url,[{method:'eth_getBlockByNumber',params:[block,false]},{method:'eth_getCode',params:[multicall,block]}],0,deadlineAt);
    if(!header||BigInt(header.number)!==BigInt(block)||!/^0x[0-9a-f]{64}$/i.test(header.hash)||await sha(code)!==codeHash)throw Error('Header or Multicall3 runtime differs');
    const age=Date.now()/1000-Number(BigInt(header.timestamp));if(age>120||age< -30)throw Error('RPC returned a stale or future block');
    positions.set(chainId,slot);const ctx={chainId,url,block,header,deadlineAt,blockNumber:BigInt(block).toString(),blockHash:header.hash,observedAt:new Date(Number(BigInt(header.timestamp))*1000).toISOString(),cache:new Map(),pending:[],flushPending:false,stats:{httpRequests:2,rpcCalls:4,contractCalls:0,multicalls:0,cacheHits:0},createdAt:Date.now()};return ctx;
   }catch(e){last=e;}
  }
  positions.set(chainId,((positions.get(chainId)||0)+1)%list.length);throw last;
 }
 // Only transport/provider failures may switch source. Contract and proof errors do not.
 const recoverable=e=>/RPC HTTP (?:400|403|408|429|5\d\d)|RPC_RATE_LIMITED|AbortError|Failed to fetch|fetch failed|NetworkError|timeout|limit exceeded|block range too large|too many/i.test(String(e));
 async function pinnedRequest(ctx,items,priority=0){
  const kind=['eth_getLogs','eth_getCode'].includes(items[0].method)?'audit':'state';
  const preferred=kind==='audit'&&ctx.chainId===1?'https://rpc.mevblocker.io':ctx.url;
  const candidates=[...new Set([preferred,...endpoints[ctx.chainId]])];
  ctx.failedProviders=ctx.failedProviders||new Set();ctx.providerProofs=ctx.providerProofs||new Map();let last;
  for(const url of candidates){
   if(ctx.failedProviders.has(url))continue;
   try{
    if(url!==ctx.url){
     if(!ctx.providerProofs.has(url)){
      ctx.stats.rpcCalls+=2;ctx.stats.httpRequests++;
      ctx.providerProofs.set(url,request(url,[{method:'eth_chainId',params:[]},{method:'eth_getBlockByNumber',params:[ctx.block,false]}],0,ctx.deadlineAt).then(([chain,h])=>{
       if(BigInt(chain)!==BigInt(ctx.chainId)||h?.number!==ctx.block||h?.hash!==ctx.blockHash)throw Error('Fallback RPC block identity differs');return true;
      }));
     }
     await ctx.providerProofs.get(url);
    }
    ctx.stats.rpcCalls+=items.length;ctx.stats.httpRequests++;
    return await request(url,items,priority,ctx.deadlineAt);
   }catch(e){last=e;if(!recoverable(e))throw e;ctx.failedProviders.add(url);ctx.stats.fallbacks=(ctx.stats.fallbacks||0)+1;}
  }
  throw last||Error('All pinned RPC providers unavailable');
 }
 function flush(ctx){
  ctx.flushPending=false;const jobs=ctx.pending.splice(0),limit=ctx.url.includes('drpc.org')?3:20;
  const contract=jobs.filter(x=>x.method==='eth_call'&&!x.params[0].from&&x.params[1]===ctx.block),logs=jobs.filter(x=>x.method==='eth_getLogs'),other=jobs.filter(x=>!contract.includes(x)&&!logs.includes(x));
  const run=async group=>{try{const results=await pinnedRequest(ctx,group,group[0].priority);group.forEach((job,i)=>job.resolve(results[i]));}catch(e){group.forEach(job=>job.reject(e));}};
  for(const priority of [0,1,2]){
   const codeJobs=other.filter(x=>x.priority===priority&&x.method==='eth_getCode'),misc=other.filter(x=>x.priority===priority&&x.method!=='eth_getCode'),events=logs.filter(x=>x.priority===priority),calls=contract.filter(x=>x.priority===priority);
   for(let i=0;i<codeJobs.length;i+=10)void run(codeJobs.slice(i,i+10));
   for(let i=0;i<misc.length;i+=limit)void run(misc.slice(i,i+limit));
   for(let i=0;i<events.length;i++)void run(events.slice(i,i+1));
   for(let i=0;i<calls.length;i+=64){const group=calls.slice(i,i+64);ctx.stats.multicalls++;ctx.stats.contractCalls+=group.length;
    void (async()=>{try{const [raw]=await pinnedRequest(ctx,[{method:'eth_call',params:[{to:multicall,data:encode(group.map(job=>job.params[0])),gas:'0xf42400'},ctx.block]}],priority);const results=decode(raw,group.length);results.forEach((result,n)=>result.success?group[n].resolve(result.data):group[n].reject(Error('Contract call reverted: '+group[n].params[0].to+' '+group[n].params[0].data.slice(0,10))));}catch(e){group.forEach(job=>job.reject(e));}})();
   }
  }
 }
 function read(ctx,item,{fresh=false,priority=0}={}){
  if(item.method==='eth_call'&&item.params[1]!==ctx.block)throw Error('Read not pinned to cycle block');
  const key=JSON.stringify([item.method,item.params]);if(!fresh&&ctx.cache.has(key)){ctx.stats.cacheHits++;return ctx.cache.get(key);}
  const promise=new Promise((resolve,reject)=>{ctx.pending.push({...item,priority,resolve,reject});if(!ctx.flushPending){ctx.flushPending=true;Promise.resolve().then(()=>flush(ctx));}});
  if(!fresh){ctx.cache.set(key,promise);promise.catch(()=>{if(ctx.cache.get(key)===promise)ctx.cache.delete(key);});}return promise;
 }
 const all=(ctx,items,options)=>Promise.all(items.map(item=>read(ctx,item,options)));
 async function confirm(ctx){if(ctx.confirming)return ctx.confirming;ctx.confirming=(async()=>{const [header]=await all(ctx,[{method:'eth_getBlockByNumber',params:[ctx.block,false]}],{fresh:true});if(header?.hash!==ctx.blockHash)throw Error('Pinned block changed during read');return header;})();try{return await ctx.confirming;}finally{ctx.confirming=null;}}
 return Object.freeze({create,read,all,confirm,sha,encode,decode,version:'4.8.0'});
})();
