// Native Curve LP -> USDT withdrawal quotations, including composed LP paths.
// A quote is not a guarantee of liquidity/execution for an investor's position.
window.PVCurve=(()=>{
 'use strict';const addr=/^0x[0-9a-f]{40}$/i,hash=/^[0-9a-f]{64}$/i;
 const assets={10:'0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',43114:'0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7',1:'0xdac17f958d2ee523a2206206994597c13d831ec7',56:'0x55d398326f99059ff775485246999027b3197955'};
 const word=n=>BigInt(n).toString(16).padStart(64,'0'),data=(selector,...args)=>selector+args.map(word).join('');
 const units=(n,d)=>{const s=10n**BigInt(d),f=(n%s).toString().padStart(d,'0').replace(/0+$/,'');return (n/s).toString()+(f?'.'+f:'');};
 function uint(raw,to,p){
  if(typeof raw!=='string'||!/^0x(?:[0-9a-f]{64})+$/i.test(raw))throw Error('Invalid Curve ABI');
  if(raw.length!==66){const fixed=p.fixedReturnAddresses?.includes(to.toLowerCase());if(!(fixed&&raw.length===8194)&&!raw.slice(66).match(/^0+$/))throw Error('Unexpected Curve multiword response');}
  return BigInt(raw.slice(0,66));
 }
 function proof(d){
  try{
   const p=d.runtime?.curvePlan,r=d.referenceSnapshot,v=d.valuation,c=d.contracts,i=d.identity;
   if(d.approval?.status!=='APPROVED'||d.runtime?.readMode!=='CURVE_NATIVE_PATH'||!p||p.chainId!==i.chainId||p.token.toLowerCase()!==c.token.toLowerCase()||p.underlying.toLowerCase()!==c.underlying.toLowerCase()||p.underlying.toLowerCase()!==assets[i.chainId]||!addr.test(p.token)||p.shareDecimals!==18||![6,18].includes(p.assetDecimals)||d.runtime.outputDecimals!==p.assetDecimals||v.quoteAsset!=='USDT'||!Array.isArray(p.steps)||!p.steps.length||p.steps.length>3||!p.codeChecks.length||!/^0x[0-9a-f]{64}$/i.test(r.blockHash)||BigInt(r.raw)<=0n||r.normalized!==units(BigInt(r.raw),p.assetDecimals)||r.display!==r.normalized+' USDT')return false;
   let amount=10n**18n;
   for(let n=0;n<p.steps.length;n++){
    const s=p.steps[n];if(![s.pool,s.lpToken,s.coin].every(x=>addr.test(x))||!Number.isInteger(s.index)||s.index<0||s.index>7||!['0xcc2b27d7','0x4fb08c5e'].includes(s.selector)||s.lpToken.toLowerCase()!==(n?p.steps[n-1].coin:p.token).toLowerCase()||!p.codeChecks.some(x=>x.address.toLowerCase()===s.pool.toLowerCase()&&hash.test(x.sha256)))return false;
    const cd=data(s.selector,amount,s.index),call=d.evidence.calls.find(x=>x.to.toLowerCase()===s.pool.toLowerCase()&&x.data.toLowerCase()===cd&&x.blockTag==='0x'+r.blockNumber.toString(16));if(!call)return false;amount=uint(call.result,s.pool,p);if(amount<=0n)return false;
   }
   return p.steps.at(-1).coin.toLowerCase()===p.underlying.toLowerCase()&&amount===BigInt(r.raw);
  }catch{return false;}
 }
 async function refresh(t,ctx){
  if(!t.curvePlan||!t.autoUpdateEnabled||!t.priceProofReady||t.auditState==='SUSPENDED')return false;const p=t.curvePlan;
  const keep=t.liveStatus==='LIVE'&&t.live&&Date.now()-Date.parse(t.live.observedAt)<120000;t.refreshing=true;
  if(!keep){t.live=null;t.capitalizationLive=null;t.liveStatus='READING';}
  try{
   const rpc=window.PVFastRPC;ctx=ctx||await rpc.create(t.chainId);if(ctx.chainId!==p.chainId)throw Error('Wrong Curve chain');
   const request=(to,calldata)=>rpc.read(ctx,{method:'eth_call',params:[{to,data:calldata},ctx.block]}).then(raw=>uint(raw,to,p));
   const checks=p.codeChecks.map(async c=>{const code=await rpc.read(ctx,{method:'eth_getCode',params:[c.address,ctx.block]});if(await rpc.sha(code)!==c.sha256)throw Error('Curve runtime bytecode changed; revalidation required');});
   const codeTask=Promise.all(checks);codeTask.catch(()=>{});
   const [sd,ad,supply]=await Promise.all([request(p.token,'0x313ce567'),request(p.underlying,'0x313ce567'),request(p.token,'0x18160ddd')]);
   if(sd!==BigInt(p.shareDecimals)||ad!==BigInt(p.assetDecimals)||supply<=0n)throw Error('Curve decimals/supply differ');
   let amount=10n**BigInt(p.shareDecimals);
   for(const s of p.steps){
    const [coin,raw,cash]=await Promise.all([request(s.pool,data('0xc6610657',s.index)),request(s.pool,data(s.selector,amount,s.index)),request(s.coin,data('0x70a08231',s.pool))]);
    if(coin!==BigInt(s.coin)||raw<=0n||cash<raw)throw Error('Curve coin, quotation or cash invalid');amount=raw;
   }
   await Promise.all(p.booleanChecks.map(async c=>{if(await request(c.to,c.data)!==0n)throw Error('Curve/USDT paused or blacklisted');}));
   await codeTask;await rpc.confirm(ctx);
   const value=units(amount,p.assetDecimals);t.capitalizationLive={normalized:units(amount*supply,p.assetDecimals+p.shareDecimals),quoteAsset:'USDT',status:'LIVE',blockNumber:ctx.blockNumber,blockHash:ctx.blockHash,observedAt:ctx.observedAt,valueNormalized:value,valueRaw:amount.toString(),valueDecimals:p.assetDecimals,supplyNormalized:units(supply,p.shareDecimals),supplyRaw:supply.toString(),supplyDecimals:p.shareDecimals,supplyBasis:'TOKEN_TOTAL_SUPPLY',rawProduct:(amount*supply).toString(),productDecimals:p.assetDecimals+p.shareDecimals,scope:'INDICATIVE_NATIVE_QUOTE_TIMES_SUPPLY'};t.live={value,display:value+' USDT',raw:amount.toString(),blockNumber:ctx.blockNumber,blockHash:ctx.blockHash,observedAt:ctx.observedAt,derived:p.steps.length>1,scope:'CURRENT_NATIVE_WITHDRAWAL_QUOTATION'};t.liveStatus='LIVE';t.liveError='';t.capitalizationError='';return true;
  }catch(e){t.live=null;t.capitalizationLive=null;t.liveStatus='UNAVAILABLE';t.liveError=String(e?.message||e);t.capitalizationError=t.liveError;if(/bytecode changed|revalidation required/i.test(t.liveError))t.auditState='SUSPENDED';return false;}finally{t.refreshing=false;}
 }
 return Object.freeze({proof,refresh,uint,units,version:'4.0.0'});
})();
