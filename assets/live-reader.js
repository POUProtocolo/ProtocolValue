// ProtocolValue 2.7: read-only observations on BNB Chain, Ethereum and Avalanche.
// This reader never writes to contracts, never updates hosted JSON files, and never calls
// a price oracle or market-data API. Historic observations are NOT equivalent to LIVE data.
window.PVLive = (() => {
  const ENDPOINTS = Object.freeze({10:'https://optimism-rpc.publicnode.com',56:'https://bsc-dataseed.bnbchain.org',1:'https://ethereum-rpc.publicnode.com',43114:'https://avalanche-c-chain-rpc.publicnode.com'});
  const USDT = Object.freeze({10:'0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',56:'0x55d398326f99059ff775485246999027b3197955',1:'0xdac17f958d2ee523a2206206994597c13d831ec7',43114:'0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7'});
  const addrRE=/^0x[0-9a-f]{40}$/i, callRE=/^0x[0-9a-f]{8}(?:[0-9a-f]{64})*$/i;
  const wordRE=/^0x[0-9a-f]{64}$/i;
  let nextId=1;
  const FALLBACKS={10:['https://optimism-rpc.publicnode.com','https://mainnet.optimism.io'],56:['https://bsc-dataseed.bnbchain.org','https://bsc-rpc.publicnode.com'],1:['https://ethereum-rpc.publicnode.com','https://eth.drpc.org'],43114:['https://avalanche-c-chain-rpc.publicnode.com','https://api.avax.network/ext/bc/C/rpc']};
  const endpointOrder={10:0,56:0,1:0,43114:0};
  const rateLimitUntil={10:0,56:0,1:0,43114:0};
  const format=(n,d)=>{
    const v=BigInt(n);if(!Number.isInteger(d)||d<0||d>36)throw Error('Invalid output decimals');
    const scale=10n**BigInt(d),fraction=(v%scale).toString().padStart(d,'0').replace(/0+$/,'');
    return (v/scale).toString()+(fraction?'.'+fraction:'');
  };
  async function rpc(chainId,method,params){
    const list=FALLBACKS[chainId];if(!list)throw Error('RPC chain not configured');
    if(Date.now()<rateLimitUntil[chainId])throw Error('RPC_RATE_LIMITED: retry after cooldown');
    const payload=JSON.stringify({jsonrpc:'2.0',id:nextId++,method,params});
    let lastError=null;
    for(let attempt=0;attempt<list.length;attempt++){
      const j=(endpointOrder[chainId]+attempt)%list.length;
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
      try{
        const response=await fetch(list[j],{method:'POST',headers:{'Content-Type':'application/json'},
          body:payload,signal:controller.signal,cache:'no-store'});
        if(!response.ok)throw Error('RPC HTTP '+response.status);
        const result=await response.json();if(result.error)throw Error(String(result.error.message||'RPC error'));
        if(!Object.hasOwn(result,'result'))throw Error('RPC response missing result');
        endpointOrder[chainId]=j;
        return result.result;
      }catch(e){lastError=e;}
      finally{clearTimeout(timer)}
    }
    const last=String(lastError?.message||lastError);
    if(/429|rate.?limit|too many/i.test(last))rateLimitUntil[chainId]=Date.now()+45000;
    throw Error(last);
  }

  function decode(raw,token){
    if(wordRE.test(raw))return BigInt(raw);
    if(typeof raw!=='string'||!/^0x(?:[0-9a-f]{64}){2,32}$/i.test(raw))throw Error('Unexpected uint256 return encoding');
    const words=raw.slice(2).match(/.{64}/g);
    if(words.length===3&&BigInt('0x'+words[0])===32n&&BigInt('0x'+words[1])===32n) return BigInt('0x'+words[2]);
    // The supplied baseline explicitly records trailing-zero proxy ABI words.
    if(['pou','venus-vusdt'].includes(token.id)&&words.slice(1).every(x=>BigInt('0x'+x)===0n))return BigInt('0x'+words[0]);
    throw Error('Ambiguous multiword ABI response');
  }
  async function cycle(chainId=56,options){
    if(window.PVFastRPC)return window.PVFastRPC.create(chainId,options);
    const chain=await rpc(chainId,'eth_chainId',[]);
    if(!/^0x[0-9a-f]+$/i.test(chain)||Number(BigInt(chain))!==chainId)throw Error('RPC returned wrong chain');
    const block=await rpc(chainId,'eth_blockNumber',[]);
    if(!/^0x[0-9a-f]+$/i.test(block))throw Error('Missing RPC block number');
    const header=await rpc(chainId,'eth_getBlockByNumber',[block,false]);
    if(!header||!/^0x[0-9a-f]{64}$/i.test(header.hash||'')||
      !/^0x[0-9a-f]+$/i.test(header.number||'')||BigInt(header.number)!==BigInt(block))
      throw Error('Cannot pin chain block hash');
    // A single header is shared by all independent token reads in this refresh.
    return Object.freeze({chainId,block,blockNumber:BigInt(block).toString(),blockHash:header.hash,
      observedAt:new Date().toISOString()});
  }
  async function readUint(token,to,calldata,ctx){
    if(token.chainId!==ctx.chainId||!addrRE.test(to)||!callRE.test(calldata))throw Error('Invalid on-chain calldata');
    // Keep the original zero-caller semantics for legacy methods.
    const encoded=ctx.url?await window.PVFastRPC.read(ctx,{method:'eth_call',params:[{to,data:calldata,from:'0x0000000000000000000000000000000000000000'},ctx.block]}):await rpc(ctx.chainId,'eth_call',[{to,data:calldata},ctx.block]);
    return decode(encoded,token);
  }
  function ensureConfig(token){
    if(!token.autoUpdateEnabled||!token.priceProofReady||!ENDPOINTS[token.chainId]||
      token.quoteAsset!=='USDT'||!addrRE.test(token.protocolContract)||
      !addrRE.test(token.underlying)||token.underlying.toLowerCase()!==USDT[token.chainId]||
      !Number.isInteger(token.outputDecimals)||token.outputDecimals<0||token.outputDecimals>36)
      throw Error('Missing reproducible on-chain price configuration');
  }
  async function vaultRatio(token,ctx){
    const c=token.calculationConfig, k=token.capitalizationConfig,contract=token.protocolContract;
    if(token.runtimeMode!=='PROTOCOL_USDT_VAULT_RATIO'||!c||c.type!=='ASSETS_PER_SHARE'||
      c.assetsContract.toLowerCase()!==contract.toLowerCase()||!callRE.test(c.assetsCallData)||
      !callRE.test(c.assetGetterCallData)||!Number.isInteger(c.shareDecimals)||
      c.shareDecimals<0||c.shareDecimals>36||c.assetsDecimals!==18||token.outputDecimals!==18)
      throw Error('Unsupported assets-per-share configuration');
    const [underlying,tokenDec,assetDec,total,supply]=await Promise.all([
      readUint(token,contract,c.assetGetterCallData,ctx),readUint(token,contract,'0x313ce567',ctx),
      readUint(token,token.underlying,'0x313ce567',ctx),readUint(token,contract,c.assetsCallData,ctx),
      readUint(token,contract,'0x18160ddd',ctx)
    ]);
    if(underlying!==BigInt(token.underlying)||tokenDec!==BigInt(c.shareDecimals)||assetDec!==18n||
       total<=0n||supply<=0n)throw Error('Underlying, decimals or vault amounts inconsistent');
    if(c.accounting){
      const a=c.accounting;
      if(![a.cashCallData,a.debtCallData,a.reservesCallData].every(s=>callRE.test(s)))
        throw Error('Malformed accounting method');
      const [cash,debt,reserve]=await Promise.all([
        readUint(token,token.underlying,a.cashCallData,ctx),
        readUint(token,contract,a.debtCallData,ctx),readUint(token,contract,a.reservesCallData,ctx)
      ]);
      if(cash+debt<reserve||cash+debt-reserve!==total)throw Error('totalToken accounting mismatch');
    }
    const valueRaw=total*10n**BigInt(c.shareDecimals)/supply;
    if(valueRaw<=0n)throw Error('Nonpositive protocol value');
    return {valueRaw,supplyRaw:supply,supplyDecimals:c.shareDecimals};
  }
  async function directPrice(token,ctx){
    if(token.runtimeMode!=='ETH_CALL_UINT256'||!callRE.test(token.callData)||
       token.callData.toLowerCase()!==token.priceProofCallData.toLowerCase())
      throw Error('Direct protocol price method not configured');
    // Extra checks for newly listed vaults, all pinned to this same block.
    // Without a confirmed USDT underlying and share/asset decimals, no LIVE label is shown.
    if(['BEEFY','MAPLE','MORPHO'].includes(token.extendedPriceKind)) {
      const getter=token.extendedPriceKind==='BEEFY'?'0x1f1fcd51':'0x38d52e0f';
      const [underlying,shareDec,assetDec]=await Promise.all([
        readUint(token,token.protocolContract,getter,ctx),
        readUint(token,token.protocolContract,'0x313ce567',ctx),
        readUint(token,token.underlying,'0x313ce567',ctx)
      ]);
      if(underlying!==BigInt(token.underlying)||
        shareDec!==BigInt(token.sourceShareDecimals)||
        assetDec!==BigInt(token.sourceUnderlyingDecimals))
        throw Error('LIVE source asset/decimals inconsistent with proof');
    }
    const valueRaw=await readUint(token,token.protocolContract,token.callData,ctx);
    if(valueRaw<=0n)throw Error('Protocol returned nonpositive price');
    let supplyRaw;
    if(['BEEFY','MAPLE','MORPHO'].includes(token.extendedPriceKind)){
      supplyRaw=await readUint(token,token.protocolContract,'0x18160ddd',ctx);if(supplyRaw<=0n)throw Error('Nonpositive share supply');
      let expected;
      if(token.extendedPriceKind==='BEEFY'){
        if(token.outputDecimals!==18+token.sourceUnderlyingDecimals-token.sourceShareDecimals)throw Error('Beefy unit scale mismatch');
        const balance=await readUint(token,token.protocolContract,'0xb69ef8a8',ctx);expected=balance*10n**18n/supplyRaw;
      }else{
        const assets=await readUint(token,token.protocolContract,'0x01e1d114',ctx),one=10n**BigInt(token.sourceShareDecimals);
        if(token.extendedPriceKind==='MAPLE'){
          const losses=await readUint(token,token.protocolContract,'0x67e2ba23',ctx);if(losses>assets)throw Error('Invalid Maple losses');expected=(assets-losses)*one/supplyRaw;
        }else{
          const [last,fee,offset]=await Promise.all([readUint(token,token.protocolContract,'0x568efc07',ctx),readUint(token,token.protocolContract,'0xddca3f43',ctx),readUint(token,token.protocolContract,'0xaea70acc',ctx)]);
          if(fee>10n**18n||offset>36n)throw Error('Invalid Morpho accounting');const gain=assets>last?assets-last:0n,feeAssets=gain*fee/10n**18n;if(feeAssets>assets)throw Error('Invalid Morpho fee assets');const feeShares=feeAssets*(supplyRaw+10n**offset)/(assets-feeAssets+1n);expected=one*(assets+1n)/(supplyRaw+feeShares+10n**offset);
        }
      }
      if(expected!==valueRaw)throw Error('Independent current-block accounting differs from native price');
    }
    return {valueRaw,supplyRaw};
  }
  async function capitalization(token,ctx,valueRaw,ratioSupply){
    const cfg=['BEEFY','MAPLE','MORPHO'].includes(token.extendedPriceKind)?{enabled:true,quoteAsset:'USDT',supplyContract:token.protocolContract,supplySelector:'0x18160ddd',supplyDecimals:token.sourceShareDecimals,supplyBasis:'TOKEN_TOTAL_SUPPLY',requireSameBlock:true}:token.capitalizationConfig;
    if(!cfg?.enabled||cfg.quoteAsset!=='USDT'||!addrRE.test(cfg.supplyContract)||
      !callRE.test(cfg.supplySelector)||!Number.isInteger(cfg.supplyDecimals)||
      cfg.supplyDecimals<0||cfg.supplyDecimals>36||cfg.requireSameBlock!==true)
      return null;
    const supplyRaw=ratioSupply??await readUint(token,cfg.supplyContract,cfg.supplySelector,ctx);
    if(supplyRaw<=0n)throw Error('Nonpositive total supply');
    const rawProduct=valueRaw*supplyRaw,prodDecimals=token.outputDecimals+cfg.supplyDecimals;
    return {normalized:format(rawProduct,prodDecimals),quoteAsset:'USDT',status:'LIVE',
      blockNumber:ctx.blockNumber,blockHash:ctx.blockHash,observedAt:ctx.observedAt,
      valueNormalized:format(valueRaw,token.outputDecimals),valueRaw:valueRaw.toString(),
      valueDecimals:token.outputDecimals,supplyNormalized:format(supplyRaw,cfg.supplyDecimals),
      supplyRaw:supplyRaw.toString(),supplyDecimals:cfg.supplyDecimals,supplyBasis:cfg.supplyBasis,
      rawProduct:rawProduct.toString(),productDecimals:prodDecimals};
  }
  async function refresh(token,ctx){
    if(token.runtimeMode==='CURVE_NATIVE_PATH')return window.PVCurve.refresh(token,ctx);
    if(token.autoUpdateEnabled!==true)return false;
    try{
      ensureConfig(token);
      if(!ctx||ctx.chainId!==token.chainId)throw Error('Current chain block not available');
      const r=token.runtimeMode==='PROTOCOL_USDT_VAULT_RATIO'?await vaultRatio(token,ctx):await directPrice(token,ctx);
      // Never turn failures in the optional capitalization calculation into fabricated capitalization.
      let cap=null,capError='';
      try{cap=await capitalization(token,ctx,r.valueRaw,r.supplyRaw)}catch(e){capError=String(e?.message||e)}
      const value=format(r.valueRaw,token.outputDecimals);
      if(ctx.url)await window.PVFastRPC.confirm(ctx);
      token.live={value,display:value+' USDT',raw:r.valueRaw.toString(),blockNumber:ctx.blockNumber,
        blockHash:ctx.blockHash,observedAt:ctx.observedAt,derived:token.runtimeMode==='PROTOCOL_USDT_VAULT_RATIO'};
      token.liveStatus='LIVE';token.liveError='';token.capitalizationLive=cap;token.capitalizationError=capError;
      return true;
    }catch(e){
      token.liveStatus='UNAVAILABLE';token.liveError=String(e?.message||e).slice(0,220);
      token.live=null;token.capitalizationLive=null;token.capitalizationError=token.liveError;
      console.warn('[ProtocolValue on-chain]',token.sourceJson,token.liveError);
      return false;
    }
  }
  return Object.freeze({version:'3.5.0',endpoints:ENDPOINTS,cycle,refresh});
})();
