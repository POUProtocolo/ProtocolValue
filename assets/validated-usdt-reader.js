// Source-specific, read-only USDT accounting. This adapter does not approve JSONs.
window.PVValidatedUSDT = (() => {
  'use strict';
  const endpoints={10:'https://optimism-rpc.publicnode.com',1:'https://ethereum-rpc.publicnode.com',56:'https://bsc-dataseed.bnbchain.org',43114:'https://avalanche-c-chain-rpc.publicnode.com'};
  const lastChecked=new Map(),eventCoverage=new Map();
  const alternatives={10:['https://optimism-rpc.publicnode.com','https://mainnet.optimism.io'],1:['https://ethereum-rpc.publicnode.com','https://eth.drpc.org'],56:['https://bsc-dataseed.bnbchain.org','https://bsc-rpc.publicnode.com'],43114:['https://avalanche-c-chain-rpc.publicnode.com','https://api.avax.network/ext/bc/C/rpc']};
  const positions=new Map();
  const cooling=new Map();
  let nextId=500000;
  const address=/^0x[0-9a-f]{40}$/i, hex=/^0x[0-9a-f]+$/i;
  const fail=message=>{throw Error(message);};
  function words(raw){
    if(typeof raw!=='string'||!/^0x(?:[0-9a-f]{64})+$/i.test(raw))fail('Invalid ABI response');
    return raw.slice(2).match(/.{64}/g).map(w=>BigInt('0x'+w));
  }
  function decode(raw,spec){
    const w=words(raw);
    if(w.length>spec.maxWords)fail('ABI layout changed');
    if(spec.decode==='words')return w;
    if(spec.decode==='array'){
      const i=Number(w[0]/32n),n=Number(w[i]);
      if(w[0]%32n||!Number.isSafeInteger(n)||n<0||i+1+n!==w.length)fail('Invalid array response');
      return w.slice(i+1);
    }
    if(w.slice(1).some(v=>v!==0n))fail('Ambiguous scalar ABI response');
    return w[0];
  }
  function units(n,d){
    if(!Number.isInteger(d)||d<0||d>72)fail('Invalid decimal precision');
    const scale=10n**BigInt(d),part=(n%scale).toString().padStart(d,'0').replace(/0+$/,'');
    return (n/scale).toString()+(part?'.'+part:'');
  }
  function rpow(x,n){
    const ray=10n**27n;let z=n%2n?x:ray;n/=2n;
    while(n){x=(x*x+ray/2n)/ray;if(n%2n)z=(z*x+ray/2n)/ray;n/=2n;}return z;
  }
  function derive(plan,v,timestamp){
    const one=BigInt(plan.oneShareRaw),ray=10n**27n;
    if(v.supply<=0n||v.shareDecimals!==BigInt(plan.shareDecimals)||v.assetDecimals!==BigInt(plan.assetDecimals)||v.asset!==BigInt(plan.underlying))fail('Underlying, decimals or supply invalid');
    let computed;
    switch(plan.model){
      case 'SPARK_RAY':{
        const chi=timestamp>v.rho?rpow(v.vsr,timestamp-v.rho)*v.chi/ray:v.chi;
        if(chi!==v.nowChi||v.assets!==v.supply*chi/ray||v.maxDeposit<=0n)fail('Spark accounting or deposit capacity changed');
        computed=one*chi/ray;break;
      }
      case 'AAVE_STATA_V2':
        if(v.maxDeposit<=0n||v.paused!==0n||v.assetPaused!==0n||v.assetBlacklisted!==0n||
           (v.reserveConfig>>56n&1n)!==1n||(v.reserveConfig>>57n&1n)!==0n||
           (v.reserveConfig>>60n&1n)!==0n||
           v.aTokenBalance<(v.supply*v.poolRate+ray-1n)/ray)
          fail('Aave reserve, wrapper or backing invalid');
        computed=one*v.poolRate/ray;break;
      case 'AAVE_STATIC':
        if(v.rate!==v.poolRate||v.maxDeposit<=0n||(v.reserveConfig>>56n&1n)!==1n||(v.reserveConfig>>60n&1n)!==0n)fail('Aave reserve inactive or conversion mismatch');
        computed=one*v.poolRate/ray;break;
      case 'MORPHO_4626':{
        const interest=v.assets>v.lastAssets?v.assets-v.lastAssets:0n;
        const feeAssets=interest*v.fee/10n**18n,virtual=10n**v.offset;
        const feeShares=feeAssets*(v.supply+virtual)/(v.assets-feeAssets+1n);
        if(v.maxDeposit<=0n)fail('Morpho deposit capacity unavailable');
        computed=one*(v.assets+1n)/(v.supply+feeShares+virtual);break;
      }
      case 'MORPHO_V2':{
        if(plan.liquidityCapacityKey&&v[plan.liquidityCapacityKey]<=0n)fail('Liquidity child deposit capacity unavailable');
        if(v.firstAssets!==0n||v.lastUpdate>timestamp||v.virtualShares<=0n||v.adaptersLength!==BigInt(plan.adapters.length))fail('Morpho V2 accounting context invalid');
        if(['receiveSharesGate','sendSharesGate','receiveAssetsGate','sendAssetsGate'].some(key=>v[key]!==0n))fail('Morpho V2 permissions require revalidation');
        if(v.assetPaused!==0n||v.assetBlacklisted!==0n)fail('Underlying USDT is paused or vault blacklisted');
        let real=v.cash;
        for(const adapter of plan.adapters)real+=v[adapter.assetsKey];
        const elapsed=timestamp-v.lastUpdate,cap=v.storedAssets+v.storedAssets*elapsed*v.maxRate/10n**18n;
        const assets=real<cap?real:cap,interest=assets>v.storedAssets?assets-v.storedAssets:0n;
        const perf=v.canReceivePerformanceFee===1n?interest*v.performanceFee/10n**18n:0n;
        const mgmt=v.canReceiveManagementFee===1n?assets*elapsed*v.managementFee/10n**18n:0n;
        if(assets<=0n||assets<perf+mgmt)fail('Morpho V2 assets or fees invalid');
        const denominator=assets-perf-mgmt+1n;
        const perfShares=perf*(v.supply+v.virtualShares)/denominator,mgmtShares=mgmt*(v.supply+v.virtualShares)/denominator;
        if(v.assets!==assets||v.accrued.length!==3||v.accrued[0]!==assets||v.accrued[1]!==perfShares||v.accrued[2]!==mgmtShares)fail('Morpho V2 independent asset/fee accrual failed');
        computed=one*(assets+1n)/(v.supply+perfShares+mgmtShares+v.virtualShares);break;
      }
      case 'FLUID_4626':{
        const info=v.getData;
        if(info.length!==9||info.slice(0,5).some((x,i)=>x!==BigInt(plan.fluidFixedData[i])))fail('Fluid authority or rewards configuration changed');
        if(v.assets!==v.supply*info[8]/10n**12n||v.maxDeposit<=0n)fail('Fluid accounting or capacity mismatch');
        computed=one*info[8]/10n**12n;break;
      }
      case 'COMPOUND_RATE':
        if(v.cash+v.borrows<v.reserves||v.cash<=0n||v.mintPaused!==0n||v.market[0]!==1n)fail('Lending market paused or invalid');
        computed=(v.cash+v.borrows-v.reserves)*10n**18n/v.supply;
        if(computed!==v.rate)fail('Lending exchange-rate mismatch');break;
      case 'YEARN_V2':{
        const ratio=(timestamp>v.lastReport?timestamp-v.lastReport:0n)*v.degradation;
        const locked=ratio<10n**18n?v.lockedProfit-v.lockedProfit*ratio/10n**18n:0n;
        if(v.assets!==v.cash+v.debt||v.assets<locked)fail('Yearn debt/free-funds mismatch');
        computed=one*(v.assets-locked)/v.supply;break;
      }
      case 'IDLE_NAV':{
        let nav=v.cash*10n**18n;
        for(const asset of plan.idleAssets)nav+=v[asset.priceKey]*v[asset.balanceKey];
        if(v.paused!==0n)fail('Idle is paused');computed=nav/v.supply;break;
      }
      case 'STARGATE_PAR':
        if(v.tvl!==v.supply||v.status!==1n||v.poolBalance<=0n)fail('Stargate liabilities, status or liquidity changed');
        computed=one*v.tvl/v.supply;break;
      case 'GEARBOX_4626':
        if(v.paused!==0n||v.maxDeposit<=0n)fail('Gearbox is paused');computed=one*v.assets/v.supply;break;
      default:fail('Unsupported validated model');
    }
    const observed=plan.model==='STARGATE_PAR'?computed:plan.model==='COMPOUND_RATE'?v.rate:v.price;
    if(observed!==computed||computed<=0n)fail('Independent native-value calculation failed');
    return computed;
  }
  // Per-network HTTP queue with per-read provider pinning and in-flight deduplication.
  // This layer does not cache any state or bypass administrative, code or event checks.
  const queueByChain=new Map(), pendingRequests=new Map(), tokenUpdates=new WeakMap();
  const minGapMs=250;
  const sleep=ms=>new Promise(done=>setTimeout(done,ms));
  function fixedProvider(chain){
    const pool=alternatives[chain];if(!pool)fail('Unsupported chain');
    const slot=positions.get(chain)||0;
    positions.set(chain,slot+1);
    return pool[slot%pool.length];
  }
  function retryDelay(response,tryNo){
    const text=response.headers?.get?.('Retry-After');
    let ms=NaN;
    if(text!=null && String(text).trim()){
      ms=/^\d+(?:\.\d+)?$/.test(String(text).trim())?1000*Number(text):Date.parse(text)-Date.now();
    }
    if(!Number.isFinite(ms))ms=800*(2**tryNo);
    return Math.max(0,ms)+50+Math.floor(Math.random()*100);
  }
  function chainQueue(chain){
    if(!queueByChain.has(chain))queueByChain.set(chain,{pending:[],busy:false,scheduled:false,nextAllowedAt:0});
    return queueByChain.get(chain);
  }
  async function httpCall(chain,endpoint,jobs){
    const request=jobs.map(x=>({jsonrpc:'2.0',id:nextId++,method:x.method,params:x.params}));
    for(let attempt=0;attempt<3;attempt++){
      const control=new AbortController(),deadline=setTimeout(()=>control.abort(),12000);
      try{
        const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
          cache:'no-store',signal:control.signal,body:JSON.stringify(request.length===1?request[0]:request)});
        if(response.status===429){
          const delay=retryDelay(response,attempt);
          if(delay>30000){cooling.set(chain,Date.now()+delay);throw Error('RPC_RATE_LIMITED: Retry-After '+Math.ceil(delay/1000)+'s');}
          if(attempt===2){cooling.set(chain,Date.now()+Math.max(20000,delay));throw Error('RPC_RATE_LIMITED: HTTP 429, retries exhausted');}
          await sleep(Math.max(minGapMs,delay));continue;
        }
        if(!response.ok)throw Error('RPC HTTP '+response.status);
        let data=await response.json();if(!Array.isArray(data))data=[data];
        if(data.length!==request.length)throw Error('Incomplete RPC batch');
        const byId=new Map(data.map(x=>[x.id,x]));
        return request.map(r=>{
          const value=byId.get(r.id);
          if(!value||value.error||!Object.hasOwn(value,'result')){
            const message=String(value?.error?.message||'Incomplete RPC response');
            if(/429|rate.?limit|too many/i.test(message)){
              cooling.set(chain,Date.now()+30000);throw Error('RPC_RATE_LIMITED: '+message);
            }
            throw Error(message);
          }
          return value.result;
        });
      }finally{clearTimeout(deadline)}
    }
    throw Error('RPC retry limit reached');
  }
  async function pump(chain){
    const q=chainQueue(chain);
    if(q.busy)return;
    q.busy=true;q.scheduled=false;
    try{
      while(q.pending.length){
        const endpoint=q.pending[0].endpoint,limit=chain===56?10:20,group=[];
        for(let i=0;i<q.pending.length && group.length<limit;){
          if(q.pending[i].endpoint===endpoint)group.push(q.pending.splice(i,1)[0]);else i++;
        }
        try{
          if(Date.now()<(cooling.get(chain)||0))throw Error('RPC_RATE_LIMITED: chain cooling down');
          if(Date.now()<q.nextAllowedAt)await sleep(q.nextAllowedAt-Date.now());
          const replies=await httpCall(chain,endpoint,group);
          replies.forEach((value,i)=>group[i].resolve(value));
        }catch(err){group.forEach(job=>job.reject(err));}
        finally{q.nextAllowedAt=Date.now()+minGapMs;}
      }
    }finally{q.busy=false;if(q.pending.length)void pump(chain)}
  }
  function single(chain,endpoint,request){
    if(!endpoint)return Promise.reject(Error('RPC chain unavailable'));
    const key=JSON.stringify([chain,endpoint,request.method,request.params]);
    if(pendingRequests.has(key))return pendingRequests.get(key);
    const promise=new Promise((resolve,reject)=>{
      const q=chainQueue(chain);
      q.pending.push({...request,endpoint,resolve,reject});
      if(!q.busy&&!q.scheduled){
        q.scheduled=true;
        Promise.resolve().then(()=>pump(chain));
      }
    });
    pendingRequests.set(key,promise);
    promise.finally(()=>{if(pendingRequests.get(key)===promise)pendingRequests.delete(key)}).catch(()=>{});
    return promise;
  }
  function batch(chain,requests,endpoint){
    const pinned=endpoint||alternatives[chain]?.[0];
    if(!pinned)fail('Unsupported chain');
    return Promise.all(requests.map(request=>single(chain,pinned,request)));
  }

  async function sha256(code){
    if(typeof code!=='string'||!/^0x(?:[a-f0-9]{2})+$/i.test(code))fail('Runtime code unavailable');
    const bytes=Uint8Array.from(code.slice(2).match(/../g),b=>parseInt(b,16));
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  async function indexedLogs(chain,contract,from,to){
    const logs=[];
    for(let page=1;page<=10;page++){
      const url=`https://api.routescan.io/v2/network/mainnet/evm/${chain}/etherscan/api?module=logs&action=getLogs&address=${contract}&fromBlock=${from}&toBlock=${to}&page=${page}&offset=1000`;
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
      try{
        const response=await fetch(url,{cache:'no-store',signal:controller.signal});if(!response.ok)fail('Administrative log index unavailable');
        const data=await response.json();
        if(!Array.isArray(data.result)){
          if(data.status==='0'&&/no (?:records|logs) found/i.test(String(data.message)+' '+String(data.result)))return logs;
          fail('Administrative log index returned an error');
        }
        for(const log of data.result){if(!hex.test(log.blockNumber)||BigInt(log.blockNumber)<BigInt(from)||BigInt(log.blockNumber)>BigInt(to))fail('Log outside requested blocks');logs.push(log);}
        if(data.result.length<1000)return logs;
      }finally{clearTimeout(timer);}
    }
    fail('Administrative log coverage exceeded pagination bound');
  }
  async function checkEvents(token,plan,block,endpoint,ctx){
    const checkpoint=lastChecked.get(token.id);
    const previous=checkpoint && checkpoint.signature===token.configurationSignature?checkpoint.block:plan.approvedBlockNumber;
    const current=Number(BigInt(block));
    if(current<previous||current-previous>plan.maxAdministrativeLookbackBlocks)fail('Administrative history requires revalidation');
    if(current===previous||!plan.administrativeEvents.length)return;
    const grouped=new Map();
    for(const event of plan.administrativeEvents){const key=event.address.toLowerCase();if(!grouped.has(key))grouped.set(key,new Set());grouped.get(key).add(event.topic.toLowerCase());}
    for(const [contract,topics] of grouped){
      let logs;
      try{
        if(ctx?.auditLogsPromise){
          logs=(await ctx.auditLogsPromise).filter(log=>String(log.address).toLowerCase()===contract&&Number(BigInt(log.blockNumber))>previous&&topics.has(String(log.topics?.[0]).toLowerCase()));
        }else{
        logs=[];
        const step=token.chainId===43114?100:token.chainId===56?1000:50000;
        for(let from=previous+1;from<=current;from+=step){
          const to=Math.min(current,from+step-1);
          const [part]=await batch(token.chainId,[{method:'eth_getLogs',params:[{address:contract,fromBlock:'0x'+from.toString(16),toBlock:'0x'+to.toString(16),topics:[[...topics]]}]}],endpoint);
          if(!Array.isArray(part))fail('Administrative logs malformed');logs.push(...part);
        }
        }
      }
      catch(err){
        if(ctx?.auditLogsPromise)throw err;
        if(![1,43114].includes(token.chainId)||/429|rate.?limit|too many/i.test(String(err?.message||err)))throw err;
        logs=await indexedLogs(token.chainId,contract,previous+1,current);
      }
      if(!Array.isArray(logs))fail('Administrative logs malformed');
      if(logs.some(log=>{
        const topic=String(log.topics?.[0]).toLowerCase();if(!topics.has(topic))return false;
        const rule=plan.administrativeEvents.find(e=>e.address.toLowerCase()===contract&&e.topic.toLowerCase()===topic);
        // VaultV2 allocators routinely change routing data. Only the already
        // approved adapter is allowed; a transient adapter change still suspends.
        if(rule?.allowedAdapterTopic&&log.topics?.length===4&&log.data==='0x'&&String(log.topics[2]).toLowerCase()===rule.allowedAdapterTopic.toLowerCase())return false;
        return true;
      }))fail('Administrative event observed; revalidation required');
    }
  }
  async function refreshInternal(token,ctx){
    const plan=token.validationPlan;
    if(!token.priceProofReady||token.auditState==='SUSPENDED'||token.runtimeEnabled!==true||!plan||plan.chainId!==token.chainId)return false;
    const keep=token.liveStatus==='LIVE'&&token.live&&Date.now()-Date.parse(token.live.observedAt)<120000;
    token.refreshing=true;
    if(!keep){token.live=null;token.capitalizationLive=null;token.liveStatus='READING';token.publicRuntimeEligible=false;}
    try{
      ctx=ctx||await window.PVFastRPC.create(token.chainId);
      if(ctx.chainId!==token.chainId)fail('Wrong cycle chain');
      if(!ctx.auditLogsPromise)prepareEvents([token],ctx);
      const endpoint=ctx.url;
      const read=requests=>window.PVFastRPC.all(ctx,requests);
      if(!address.test(plan.underlying)||!address.test(plan.token)||plan.cacheSeconds!==60)fail('Invalid validation plan');
      const chainRaw='0x'+ctx.chainId.toString(16),block=ctx.block;
      if(BigInt(chainRaw)!==BigInt(token.chainId)||!hex.test(block))fail('Chain identity or block invalid');
      const specs=Object.entries(plan.reads),requests=[];
      for(const [,spec] of specs)requests.push({method:'eth_call',params:[{to:spec.to,data:spec.data},block]});
      for(const check of plan.administrativeCalls)requests.push({method:'eth_call',params:[{to:check.to,data:check.data},block]});
      for(const check of plan.storageChecks)requests.push({method:'eth_getStorageAt',params:[check.address,check.slot,block]});
      for(const check of plan.codeChecks)requests.push({method:'eth_getCode',params:[check.address,block]});
      const adminEnd=specs.length+plan.administrativeCalls.length;
      const parts=await Promise.all([window.PVFastRPC.all(ctx,requests.slice(0,specs.length),{priority:1}),window.PVFastRPC.all(ctx,requests.slice(specs.length,adminEnd),{priority:2}),window.PVFastRPC.all(ctx,requests.slice(adminEnd),{priority:0})]);
      ctx.stats.nativeReadsMs=Math.round(Date.now()-ctx.createdAt);const results=parts.flat();
      // Compare raw administrative layouts first so a role/member array change
      // suspends the record before scalar/array decoding can classify it as an outage.
      let index=specs.length;
      for(const check of plan.administrativeCalls)if(String(results[index++]).toLowerCase()!==check.expected.toLowerCase())fail('Administrative configuration changed: '+check.function);
      for(const check of plan.storageChecks)if(String(results[index++]).toLowerCase()!==check.expected.toLowerCase())fail('Proxy implementation or admin changed');
      for(const check of plan.codeChecks)if(await sha256(results[index++])!==check.sha256)fail('Runtime bytecode changed');
      const header=ctx.header;if(!header||BigInt(header.number)!==BigInt(block)||!/^0x[0-9a-f]{64}$/i.test(header.hash))fail('Pinned block header unavailable');
      const v={};index=0;for(const [key,spec] of specs)v[key]=decode(results[index++],spec);
      const raw=derive(plan,v,BigInt(header.timestamp)),value=units(raw,token.outputDecimals);
      await checkEvents(token,plan,block,endpoint,ctx);
      const confirmation=await window.PVFastRPC.confirm(ctx);
      if(confirmation?.hash!==header.hash)fail('Pinned block changed during read');
      const blockNumber=BigInt(block).toString(),observedAt=new Date(Number(BigInt(header.timestamp))*1000).toISOString();
      token.live={value,display:value+' USDT',blockNumber,blockHash:header.hash,observedAt,raw:raw.toString()};
      token.capitalizationLive={normalized:units(raw*v.supply,token.outputDecimals+plan.shareDecimals),quoteAsset:'USDT',status:'LIVE',blockNumber,blockHash:header.hash,observedAt,valueNormalized:value,valueRaw:raw.toString(),valueDecimals:token.outputDecimals,supplyNormalized:units(v.supply,plan.shareDecimals),supplyRaw:v.supply.toString(),supplyDecimals:plan.shareDecimals,supplyBasis:'TOKEN_TOTAL_SUPPLY',rawProduct:(raw*v.supply).toString(),productDecimals:token.outputDecimals+plan.shareDecimals};
      lastChecked.set(token.id,{block:Number(BigInt(block)),signature:token.configurationSignature});token.publicRuntimeEligible=true;token.liveStatus='LIVE';token.liveError='';token.capitalizationError='';return true;
    }catch(err){
      token.live=null;token.capitalizationLive=null;
      token.liveStatus='UNAVAILABLE';token.liveError=String(err?.message||err);token.capitalizationError=token.liveError;
      console.warn('[ProtocolValue native]',token.id,token.liveError);
      token.publicRuntimeEligible=false;
      if(/(?:configuration|implementation|admin|bytecode) changed|Administrative event|requires revalidation/i.test(token.liveError))token.auditState='SUSPENDED';
      return false;
    }
  }
  function prepareEvents(tokens,ctx){
    const contracts=new Map(),topics=new Set();let previous=Number(BigInt(ctx.block));
    for(const token of tokens){const p=token.validationPlan;if(!p||p.chainId!==ctx.chainId)continue;const checkpoint=lastChecked.get(token.id);const from=checkpoint&&checkpoint.signature===token.configurationSignature?checkpoint.block:p.approvedBlockNumber;
      if(Number(BigInt(ctx.block))-from>p.maxAdministrativeLookbackBlocks)continue;
      if(!p.administrativeEvents.length)continue;previous=Math.min(previous,from);for(const e of p.administrativeEvents){const a=e.address.toLowerCase();if(!contracts.has(a))contracts.set(a,new Set());contracts.get(a).add(e.topic.toLowerCase());topics.add(e.topic.toLowerCase());}
    }
    const scope=JSON.stringify([ctx.chainId,tokens.filter(t=>t.validationPlan).map(t=>[t.id,t.configurationSignature,t.validationPlan.approvedBlockNumber]).sort(),[...contracts].map(([a,t])=>[a,[...t].sort()]).sort()]);
    ctx.auditLogsPromise=(async()=>{
      const logs=[],current=Number(BigInt(ctx.block));if(previous===current||!contracts.size)return logs;
      const step=ctx.chainId===43114?100:ctx.chainId===56?1000:50000;
      let next=previous+1;const cached=eventCoverage.get(scope);
      if(cached&&cached.from<=next&&cached.to>=previous&&cached.to<=current){
        const h=await window.PVFastRPC.read(ctx,{method:'eth_getBlockByNumber',params:['0x'+cached.to.toString(16),false]},{fresh:true});
        if(h?.hash!==cached.hash){eventCoverage.delete(scope);fail('Administrative coverage block changed; retry required');}
        logs.push(...cached.logs.filter(l=>Number(BigInt(l.blockNumber))>previous));next=cached.to+1;
      }
      const entries=[...contracts],groups=[],groupSize=ctx.chainId===1?50:5;
      for(let i=0;i<entries.length;i+=groupSize)groups.push(entries.slice(i,i+groupSize));
      // Two ranges overlap in flight. Publish only a fully validated contiguous prefix.
      for(let from=next;from<=current;from+=step*2){
        const ranges=[];for(let n=0;n<2&&from+n*step<=current;n++)ranges.push({from:from+n*step,to:Math.min(current,from+(n+1)*step-1)});
        const batches=await Promise.all(ranges.map(async range=>{
          const parts=await Promise.all(groups.map(group=>window.PVFastRPC.read(ctx,{method:'eth_getLogs',params:[{address:group.length===1?group[0][0]:group.map(([a])=>a),fromBlock:'0x'+range.from.toString(16),toBlock:'0x'+range.to.toString(16),topics:[[...new Set(group.flatMap(([,t])=>[...t]))]]}]},{priority:2})));
          const selectedLogs=[];
          for(const [n,part] of parts.entries()){
            if(!Array.isArray(part)||part.length>=10000)fail('Administrative log coverage unavailable');
            const selected=new Map(groups[n]);
            for(const log of part){
              const allowed=selected.get(String(log.address).toLowerCase());
              if(!allowed||log.removed===true||!hex.test(log.blockNumber)||BigInt(log.blockNumber)<BigInt(range.from)||BigInt(log.blockNumber)>BigInt(range.to))fail('Administrative logs malformed');
              if(allowed.has(String(log.topics?.[0]).toLowerCase()))selectedLogs.push(log);
            }
          }return selectedLogs;
        }));
        const to=ranges[ranges.length-1].to;
        const h=await window.PVFastRPC.read(ctx,{method:'eth_getBlockByNumber',params:['0x'+to.toString(16),false]},{fresh:true});
        if(!h||Number(BigInt(h.number))!==to||!/^0x[0-9a-f]{64}$/i.test(h.hash))fail('Administrative coverage header unavailable');
        logs.push(...batches.flat());eventCoverage.set(scope,{from:previous+1,to,hash:h.hash,logs:logs.slice()});
      }
      ctx.stats.administrativeLogsMs=Math.round(Date.now()-ctx.createdAt);return logs;
    })();ctx.auditLogsPromise.catch(()=>{});
  }
  function refresh(token,ctx){
    if(tokenUpdates.has(token))return tokenUpdates.get(token);
    const task=refreshInternal(token,ctx).finally(()=>{tokenUpdates.delete(token);token.refreshing=false;});
    tokenUpdates.set(token,task);
    return task;
  }
  return Object.freeze({refresh,prepareEvents,derive,decode,units,rpow,version:'4.0.0'});
})();
const PVLegacyRefresh=window.PVLive.refresh;
window.PVLive={...window.PVLive,refresh:(token,ctx)=>token.runtimeMode==='VALIDATED_USDT_NATIVE'?window.PVValidatedUSDT.refresh(token,ctx):PVLegacyRefresh(token,ctx)};
