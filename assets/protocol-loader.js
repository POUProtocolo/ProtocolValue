// Individual JSONs remain canonical; a hash-verified bundle reduces initial downloads. No backend or PHP. Evidence-based runtime opt-in, same-block RPC and snapshot fallback.
// The catalog includes research records; their presence is not proof of an internal price.
function pvHasReproduciblePriceProof(d) {
  const p=d.priceProof||{}, i=d.identity||{}, c=d.contracts||{}, r=d.runtime||{};
  const b=d.referenceSnapshot||{}, calc=p.calculation||{};
  if (p.type!=='ONCHAIN_INTERNAL_PRICE'||p.status!=='BLOCK_PINNED_FORMULA_REPRODUCED'||
      p.method!=='ASSETS_PER_SHARE'||!Number.isSafeInteger(p.blockNumber)||p.blockNumber<0||
      p.blockNumber!==b.blockNumber||i.chainId!==p.chainId||i.chainId!==56||
      String(p.contract||'').toLowerCase()!==String(c.protocol||'').toLowerCase()||
      String(p.underlying||'').toLowerCase()!==String(c.underlying||'').toLowerCase()||
      String(p.blockHash||'').toLowerCase()!==String(b.blockHash||'').toLowerCase()||
      !/^0x[0-9a-f]{64}$/i.test(p.blockHash||'')||
      p.unit!=='USDT/ibUSDT'||r.readMode!=='PROTOCOL_USDT_VAULT_RATIO') return false;
  try {
    const total=BigInt(calc.totalTokenRaw),supply=BigInt(calc.totalSupplyRaw);
    const shareDecimals=calc.shareDecimals, underlyingDecimals=calc.underlyingDecimals;
    if(!Number.isInteger(shareDecimals)||shareDecimals!==18||underlyingDecimals!==18||
       total<=0n||supply<=0n||calc.rounding!=='FLOOR') return false;
    const raw=(total*10n**BigInt(shareDecimals))/supply;
    return raw.toString()===String(calc.resultRaw) && String(calc.resultRaw)===String(b.raw) &&
      p.calculation.result===b.normalized;
  } catch { return false; }
}
function pvHistoricalPriceProof(d) {
  const p=d.priceProof||{},v=d.valuation||{},r=d.runtime||{},i=d.identity||{},c=d.contracts||{};
  const ref=d.referenceSnapshot||d.value||{};
  if(p.type!=='ONCHAIN_INTERNAL_PRICE'||p.status!=='HISTORICAL_RPC_EVIDENCE_REPRODUCED_FROM_SUPPLIED_JSON'||
    p.chainId!==56||i.chainId!==56||p.blockNumber!==ref.blockNumber||
    !/^0x[0-9a-f]{64}$/i.test(p.blockHash||'')||String(p.blockHash).toLowerCase()!==String(ref.blockHash||'').toLowerCase()||
    String(p.contract).toLowerCase()!==String(c.protocol).toLowerCase()||
    String(p.underlying).toLowerCase()!==String(c.underlying).toLowerCase()||
    p.callData!==String(v.callData||v.selector)||p.outputDecimals!==r.outputDecimals||
    !/^0x[0-9a-f]{8}(?:[0-9a-f]{64})*$/i.test(p.callData||'')||
    v.quoteAsset!=='USDT'||!Number.isInteger(p.outputDecimals)||p.outputDecimals<0||p.outputDecimals>36) return false;
  try {
    if(BigInt(p.raw)<=0n||p.raw!==String(ref.raw))return false;
    const amount=String(p.normalized);
    if(!/^\d+(?:\.\d+)?$/.test(amount)||amount!==String(ref.normalized))return false;
    const parts=amount.split('.'), decimals=p.outputDecimals;
    if((parts[1]||'').length>decimals)return false;
    return BigInt(parts[0])*(10n**BigInt(decimals))+
      BigInt((parts[1]||'').padEnd(decimals,'0')||'0')===BigInt(p.raw);
  }catch{return false;}
}
// Strictly admit a newly researched token only when a block-pinned, publicly
// reproducible contract call yields its protocol-native USDT-per-token value.
// Recorded evidence proves internal mathematical consistency of the uploaded
// snapshot, not an independent re-fetch of historic RPC at site build time.
function pvMultichainPinnedPriceProof(d) {
  const p=d.priceProof||{}, i=d.identity||{}, c=d.contracts||{}, v=d.valuation||{}, r=d.runtime||{};
  const ref=d.referenceSnapshot||{}, ev=d.evidence||{}, calls=ev.calls||[];
  const hexAddr=/^0x[0-9a-f]{40}$/i, word=/^0x[0-9a-f]{64}$/i;
  if(p.type!=='ONCHAIN_INTERNAL_PRICE'||p.status!=='BLOCK_PINNED_RPC_METHOD_EVIDENCE'||
     p.method!=='DIRECT_CONVERSION'||![1,56,43114].includes(i.chainId)||
     p.chainId!==i.chainId||!hexAddr.test(c.protocol||'')||!hexAddr.test(c.underlying||'')||
     String(p.contract||'').toLowerCase()!==c.protocol.toLowerCase()||
     String(p.underlying||'').toLowerCase()!==c.underlying.toLowerCase()||
     p.unit!=='USDT/'+i.symbol||v.quoteAsset!=='USDT'||
     p.sourceFunction!==v.sourceFunction||p.outputDecimals!==v.outputDecimals||
     p.outputDecimals!==r.outputDecimals||p.callData!==(v.callData||v.selector)||
     !/^0x[0-9a-f]{8}(?:[0-9a-f]{64})*$/i.test(p.callData||'')||
     !Number.isSafeInteger(p.blockNumber)||p.blockNumber<=0||
     p.blockNumber!==ref.blockNumber||p.blockNumber!==ev.blockNumber||
     p.blockTag!=='0x'+p.blockNumber.toString(16)||
     !/^0x[0-9a-f]{64}$/i.test(p.blockHash||'')||
     p.blockHash.toLowerCase()!==String(ref.blockHash||'').toLowerCase()||
     p.blockHash.toLowerCase()!==String(ev.blockHash||'').toLowerCase()||
     p.raw!==ref.raw||p.normalized!==ref.normalized||
     !Number.isInteger(p.shareDecimals)||p.shareDecimals<0||p.shareDecimals>36||
     !Number.isInteger(p.underlyingDecimals)||p.underlyingDecimals<0||p.underlyingDecimals>36||
     !word.test(p.rawReturn||'')||!Array.isArray(calls))return false;
  try{
    const amount=BigInt(p.raw), scale=10n**BigInt(p.outputDecimals);
    if(amount<=0n||BigInt(p.rawReturn)!==amount)return false;
    const exact=(amount/scale).toString()+(amount%scale===0n?'':'.'+(amount%scale).toString().padStart(p.outputDecimals,'0').replace(/0+$/,''));
    if(exact!==p.normalized)return false;
    const main=calls.find(x=>x.function===p.sourceFunction&&x.to.toLowerCase()===c.protocol.toLowerCase()&&x.data===p.callData);
    if(!main||main.result!==p.rawReturn||main.blockTag!==p.blockTag)return false;
    const find=(address,fn)=>calls.find(x=>x.function===fn&&x.to.toLowerCase()===address.toLowerCase()&&word.test(x.result||''));
    const td=find(c.token,'decimals()'), ud=find(c.underlying,'decimals()');
    if(!td||!ud||BigInt(td.result)!==BigInt(p.shareDecimals)||BigInt(ud.result)!==BigInt(p.underlyingDecimals))return false;
    const getter=calls.find(x=>['asset()','underlying()'].includes(x.function)&&x.to.toLowerCase()===c.protocol.toLowerCase()&&word.test(x.result||''));
    if(!getter||BigInt(getter.result)!==BigInt(c.underlying))return false;
    if(p.sourceFunction==='convertToAssets(uint256)'){
      if(p.outputDecimals!==p.underlyingDecimals||
         BigInt(p.inputRaw||'0')!==10n**BigInt(p.shareDecimals)||
         p.callData.toLowerCase()!=='0x07a2d13a'+BigInt(p.inputRaw).toString(16).padStart(64,'0'))return false;
    }else if(p.sourceFunction==='exchangeRateStored()'){
      if(p.outputDecimals!==18+p.underlyingDecimals-p.shareDecimals||p.callData.toLowerCase()!=='0x182df0f5')return false;
    }else{return false;}
    return true;
  }catch{return false;}
}

// Native Curve single-coin USDT redemption quotation for exactly ONE whole LP.
// Historical RPC block evidence: not an independent invariant reimplementation.
function pvCurveUsdtRedemptionProof(d) {
  const i=d.identity||{}, c=d.contracts||{},v=d.valuation||{},r=d.runtime||{},
    ref=d.referenceSnapshot||{}, ev=d.evidence||{},ci=v.calculationInput||{},com=d.components||{};
  const usdt='0xdac17f958d2ee523a2206206994597c13d831ec7';
  const addr=/^0x[0-9a-f]{40}$/i, hash=/^0x[0-9a-f]{64}$/i;
  if(i.chainId!==1||i.protocol!=='Curve Finance'||
     !addr.test(c.protocol||'')||!addr.test(c.token||'')||
     String(c.underlying).toLowerCase()!==usdt||
     d.approval?.status!=='APPROVED'||d.eligibility?.publicAdmission!=='APPROVED_SNAPSHOT'||
     v.valueType!=='Redemption Value'||v.quoteAsset!=='USDT'||
     v.sourceFunction!=='calc_withdraw_one_coin(uint256,int128)'||
     v.sourceOutputIsPerTokenValue!==true||
     r.enabled!==false||r.autoUpdate!==false||r.readMode!=='ETH_CALL_UINT256'||r.outputDecimals!==6||
     ci.shareDecimals!==18||ci.underlyingDecimals!==6||ci.outputDecimals!==6||
     !Number.isInteger(ci.usdtIndex)||ci.usdtIndex<0||ci.usdtIndex>7||
     !Number.isSafeInteger(ref.blockNumber)||!hash.test(ref.blockHash||'')||
     com.componentsBlockNumber!==ref.blockNumber||
     String(com.componentsBlockHash).toLowerCase()!==ref.blockHash.toLowerCase()||
     !Array.isArray(ev.calls)||!Array.isArray(ev.codeChecks)||
     !ev.codeChecks.some(x=>String(x.address).toLowerCase()===c.protocol.toLowerCase() && /^[0-9a-f]{64}$/i.test(x.sha256||''))||
     ev.operational?.status!=='RECENT_OPERATION_CONFIRMED')return false;
  try{
    const share=10n**18n,index=BigInt(ci.usdtIndex),raw=BigInt(ref.raw);
    if(BigInt(ci.shareAmountRaw)!==share||raw<=0n||
       BigInt(com.usdtCashRaw)<raw||BigInt(com.totalSupplyRaw)<=0n)return false;
    const data='0xcc2b27d7'+share.toString(16).padStart(64,'0')+index.toString(16).padStart(64,'0');
    if(v.callData.toLowerCase()!==data||v.selector!=='0xcc2b27d7')return false;
    const tag='0x'+ref.blockNumber.toString(16);
    function call(fn,to,cd){
      const found=ev.calls.filter(x=>x.function===fn&&String(x.to).toLowerCase()===to.toLowerCase()&&
        String(x.data).toLowerCase()===cd.toLowerCase()&&x.blockTag===tag&&hash.test(x.result||''));
      if(found.length!==1)throw Error('Missing proof call');return BigInt(found[0].result);
    }
    if(call('decimals()',c.token,'0x313ce567')!==18n||
       call('decimals()',usdt,'0x313ce567')!==6n||
       call('coins(uint256)',c.protocol,'0xc6610657'+index.toString(16).padStart(64,'0'))!==BigInt(usdt)||
       call('calc_withdraw_one_coin(uint256,int128)',c.protocol,data)!==raw||
       call('totalSupply()',c.token,'0x18160ddd')!==BigInt(com.totalSupplyRaw)||
       call('balanceOf(address)',usdt,'0x70a08231'+c.protocol.slice(2).toLowerCase().padStart(64,'0'))!==BigInt(com.usdtCashRaw))return false;
    const amount=(raw/1000000n).toString()+(raw%1000000n===0n?'':'.'+(raw%1000000n).toString().padStart(6,'0').replace(/0+$/,''));
    return ref.normalized===amount && ref.display===amount+' USDT';
  }catch{return false;}
}

// Strict block-pinned accounting proof for Compound-style stored exchange rates.
// Mathematical integrity of a recorded response is NOT a security audit or a LIVE reading.
function pvAccountingPriceProof(d) {
  const p=d.priceProof||{},i=d.identity||{},c=d.contracts||{},v=d.valuation||{},r=d.runtime||{};
  const ref=d.referenceSnapshot||{},ev=d.evidence||{},calls=ev.calls||[],a=p.accounting||{};
  const addr=/^0x[0-9a-f]{40}$/i,word=/^0x[0-9a-f]{64}$/i;
  const usdt={56:'0x55d398326f99059ff775485246999027b3197955',1:'0xdac17f958d2ee523a2206206994597c13d831ec7'};
  if(p.type!=='ONCHAIN_INTERNAL_PRICE'||p.status!=='BLOCK_PINNED_EXACT_ACCOUNTING_RECONSTRUCTION'||
    p.method!=='STORED_EXCHANGE_RATE_ACCOUNTING'||!Object.hasOwn(usdt,i.chainId)||
    p.chainId!==i.chainId||!addr.test(c.protocol||'')||!addr.test(c.underlying||'')||
    c.underlying.toLowerCase()!==usdt[i.chainId]||
    String(p.contract).toLowerCase()!==c.protocol.toLowerCase()||
    String(p.underlying).toLowerCase()!==c.underlying.toLowerCase()||
    v.quoteAsset!=='USDT'||v.sourceFunction!=='exchangeRateStored()'||
    p.sourceFunction!=='exchangeRateStored()'||
    p.callData!=='0x182df0f5'||v.callData!==p.callData||
    r.readMode!=='ETH_CALL_UINT256'||p.outputDecimals!==r.outputDecimals||
    p.blockNumber!==ev.blockNumber||p.blockNumber!==ref.blockNumber||
    p.blockTag!=='0x'+p.blockNumber.toString(16)||ev.blockTag!==p.blockTag||
    !word.test(p.blockHash||'')||p.blockHash.toLowerCase()!==String(ev.blockHash||'').toLowerCase()||
    p.blockHash.toLowerCase()!==String(ref.blockHash||'').toLowerCase()||
    p.raw!==ref.raw||p.normalized!==ref.normalized||p.unit!=='USDT/'+i.symbol||
    !word.test(p.rawReturn||'')||p.outputDecimals!==18+p.underlyingDecimals-p.shareDecimals||
    !Number.isInteger(p.outputDecimals)||p.outputDecimals<0||p.outputDecimals>36||
    !Number.isInteger(p.shareDecimals)||p.shareDecimals<0||p.shareDecimals>36||
    !Number.isInteger(p.underlyingDecimals)||p.underlyingDecimals<0||p.underlyingDecimals>36||
    !Array.isArray(calls)||calls.length<8)return false;
  try{
    const selectors={'exchangeRateStored()':'0x182df0f5','getCash()':'0x3b1d21a2',
      'totalBorrows()':'0x47bd3718','totalReserves()':'0x8f840ddd','totalSupply()':'0x18160ddd',
      'decimals()':'0x313ce567','underlying()':'0x6f307dc3'};
    const read=(address,fn)=>{
      const found=calls.filter(x=>x.function===fn&&String(x.to).toLowerCase()===address.toLowerCase()&&
        String(x.data).toLowerCase()===selectors[fn]&&x.blockTag===p.blockTag&&word.test(x.result||''));
      if(found.length!==1)throw Error('Missing/duplicate source RPC call');
      return BigInt(found[0].result);
    };
    if(read(c.protocol,'decimals()')!==BigInt(p.shareDecimals)||
      read(c.underlying,'decimals()')!==BigInt(p.underlyingDecimals)||
      read(c.protocol,'underlying()')!==BigInt(c.underlying))return false;
    const cash=read(c.protocol,'getCash()'),borrows=read(c.protocol,'totalBorrows()'),
      reserves=read(c.protocol,'totalReserves()'),supply=read(c.protocol,'totalSupply()'),
      rate=read(c.protocol,'exchangeRateStored()');
    if(supply<=0n||cash+borrows<reserves||rate<=0n||
      cash!==BigInt(a.cash)||borrows!==BigInt(a.totalBorrows)||
      reserves!==BigInt(a.totalReserves)||supply!==BigInt(a.totalSupply)||
      cash+borrows-reserves!==BigInt(a.netUnderlying)||a.rounding!=='FLOOR')return false;
    const exact=(cash+borrows-reserves)*10n**18n/supply;
    const scale=10n**BigInt(p.outputDecimals);
    const normalized=(rate/scale).toString()+(rate%scale===0n?'':'.'+
      (rate%scale).toString().padStart(p.outputDecimals,'0').replace(/0+$/,''));
    return exact===rate&&rate===BigInt(p.raw)&&rate===BigInt(p.rawReturn)&&
      normalized===p.normalized;
  }catch{return false;}
}

// Block-pinned, publicly reproducible protocol-native USDT/share proof.
// The browser reader verifies the source-specific calculation again on current RPC data.
function pvValidatedNativePriceProof(d) {
  const i=d.identity||{}, c=d.contracts||{}, v=d.valuation||{},
    rt=d.runtime||{}, plan=rt.validationPlan||{},
    e=d.evidence||{}, ref=d.referenceSnapshot||{}, val=d.value||{},
    check=e.formulaCheck||{}, calls=e.calls||[];
  const addr=/^0x[0-9a-f]{40}$/i, hash=/^0x[0-9a-f]{64}$/i, word=/^0x(?:[0-9a-f]{64})+$/i;
  if(rt.readMode!=='VALIDATED_USDT_NATIVE'||![1,56,43114].includes(i.chainId)||
     plan.chainId!==i.chainId||!['MORPHO_4626','MORPHO_V2','AAVE_STATA_V2'].includes(plan.model)||
     v.quoteAsset!=='USDT'||v.sourceFunction!=='convertToAssets(uint256)'||
     !addr.test(c.protocol||'')||!addr.test(c.underlying||'')||
     !addr.test(c.token||'')||c.protocol.toLowerCase()!==c.token.toLowerCase()||
     c.underlying.toLowerCase()!=='0xdac17f958d2ee523a2206206994597c13d831ec7'||
     !addr.test(plan.token||'')||!addr.test(plan.underlying||'')||
     plan.token.toLowerCase()!==c.protocol.toLowerCase()||
     plan.underlying.toLowerCase()!==c.underlying.toLowerCase()||
     !Number.isSafeInteger(e.blockNumber)||e.blockNumber<=0||
     e.blockNumber!==val.blockNumber||e.blockNumber!==ref.blockNumber||
     !hash.test(e.blockHash||'')||e.blockHash.toLowerCase()!==String(val.blockHash||'').toLowerCase()||
     e.blockHash.toLowerCase()!==String(ref.blockHash||'').toLowerCase()||
     e.blockTag!=='0x'+e.blockNumber.toString(16)||
     !Array.isArray(calls)||calls.length<8||!check.exactMatch||
     !rt.enabled||!rt.autoUpdate||!Number.isInteger(rt.outputDecimals)||
     !Number.isInteger(plan.shareDecimals)||!Number.isInteger(plan.assetDecimals)||
     plan.shareDecimals<0||plan.shareDecimals>36||plan.assetDecimals<0||plan.assetDecimals>36||
     rt.outputDecimals!==plan.assetDecimals||
     String(check.calculatedRaw)!==String(check.observedRaw)||
     String(check.calculatedRaw)!==String(ref.raw)||
     String(check.observedRaw)!==String(val.raw)||
     v.normalizedInput!==String(plan.oneShareRaw)||
     v.callData!=='0x07a2d13a'+BigInt(plan.oneShareRaw).toString(16).padStart(64,'0')||
     !plan.reads||!plan.reads.asset||!plan.reads.price||
     !Array.isArray(plan.administrativeCalls)||!Array.isArray(plan.codeChecks)||
     !Array.isArray(plan.storageChecks)||!Array.isArray(plan.administrativeEvents)||
     !Number.isInteger(plan.approvedBlockNumber)) return false;
  try{
    const scale=10n**BigInt(rt.outputDecimals),raw=BigInt(val.raw);
    const fraction=(raw%scale).toString().padStart(rt.outputDecimals,'0').replace(/0+$/,'');
    const exact=(raw/scale).toString()+(fraction?'.'+fraction:'');
    if(exact!==val.normalized||exact!==ref.normalized||raw<=0n||
       BigInt(plan.oneShareRaw)!==10n**BigInt(plan.shareDecimals))return false;
    const find=(key)=>calls.filter(x=>x.key===key&&x.blockTag===e.blockTag&&word.test(x.result||''));
    const asset=find('asset'),sd=find('shareDecimals'),ad=find('assetDecimals'),supply=find('supply'),price=find('price');
    if([asset,sd,ad,supply,price].some(x=>x.length!==1))return false;
    if(BigInt(asset[0].result)!==BigInt(c.underlying)||
       BigInt(sd[0].result)!==BigInt(plan.shareDecimals)||
       BigInt(ad[0].result)!==BigInt(plan.assetDecimals)||
       BigInt(supply[0].result)<=0n||BigInt(price[0].result)!==raw||
       String(price[0].data).toLowerCase()!==v.callData.toLowerCase())return false;
    return true;
  }catch{return false;}
}

window.PVLoadProtocols = async function () {
  const resp = await fetch('data/protocols.json', {cache:'no-store'});
  if (!resp.ok) throw new Error('Cannot load protocols index: HTTP '+resp.status);
  const catalog=await resp.json();
  if (!Array.isArray(catalog.files)) throw new Error('Invalid protocol index');
  let bundled=null;
  if(catalog.bundle?.file==='catalog.bundle.json'&&/^[a-f0-9]{64}$/.test(catalog.bundle.sha256)){
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),4000);
    try{
      const response=await fetch('data/catalog.bundle.json',{cache:'no-store',signal:ctrl.signal});if(!response.ok)throw Error('Bundle HTTP '+response.status);
      const raw=await response.arrayBuffer();
      const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',raw))].map(x=>x.toString(16).padStart(2,'0')).join('');
      if(hash!==catalog.bundle.sha256)throw Error('Catalog bundle hash differs');
      const data=JSON.parse(new TextDecoder().decode(raw));
      if(Object.keys(data).length!==catalog.files.length||!catalog.files.every(f=>Object.hasOwn(data,f)))throw Error('Catalog bundle registry differs');
      bundled=data;
    }catch(error){console.warn('Catalog bundle unavailable; using individual token JSONs:',String(error));}
    finally{clearTimeout(timer);}
  }
  // Research filenames reside in a separate directory. No token JSON is rewritten.
  const researchFiles = new Set(); // Public site lists only records with a reproducible internal-price proof.
  const excludedLifecycles = new Set(['EOL', 'DEPRECATED', 'SUNSET_ISOLATED_POOL']);
  const processFile = async file => {
    if (!/^[a-z0-9_-]+\.json$/.test(file)) throw new Error('Invalid filename');
    const researchOnly=researchFiles.has(file);
    let d=bundled?.[file];
    if(!d){const r=await fetch((researchOnly?'data/candidates/':'data/tokens/')+file,{cache:'no-store'});if(!r.ok)throw new Error(file+': HTTP '+r.status);d=await r.json();}
    // Editorial exclusion: never surface retired/discontinued products, even if an older cached registry mentions them.
    if (excludedLifecycles.has(String(d.lifecycle?.status || '').trim().toUpperCase())) return null;
    const i=d.identity||{},c=d.contracts||{},v=d.valuation||{},a=d.approval||{};
    const ref=d.referenceSnapshot||d.value||{};
    const curveReady=window.PVCurve?.proof(d)===true;
    const priceProofReady=curveReady||(window.PVAdditionalNativeProof?.(d)===true)||pvHasReproduciblePriceProof(d)||pvHistoricalPriceProof(d)||pvMultichainPinnedPriceProof(d)||pvAccountingPriceProof(d)||(window.PVExtendedPriceProof?.(d)===true)||pvValidatedNativePriceProof(d)||pvCurveUsdtRedemptionProof(d);
    if(!priceProofReady) return null; // No address-only or undocumented candidates in the public catalog.
    return {
      id:i.id||file.replace(/\.json$/,''), protocol:i.protocol||'',asset:i.asset||'',
      symbol:i.symbol||'',chain:i.network||'',chainId:i.chainId,
      tokenContract:c.token||'',protocolContract:c.protocol||'',implementation:c.implementation||'',
      underlying:c.underlying||'',valueType:v.valueType||'',quoteAsset:v.quoteAsset||'',
      sourceFunction:v.sourceFunction||'',selector:v.selector||'',callData:v.callData||v.selector||'',normalizedInput:v.normalizedInput||'',
      formula:v.formula||'',methodology:v.methodology||'',
      approvalStatus:String(a.status||'UNSPECIFIED').toUpperCase(),
      value:ref.display||String(ref.normalized||'No reference snapshot'),
      valueStatus:String(ref.status||'REFERENCE_SNAPSHOT').toUpperCase(),
      observedAt:ref.observedAt||'',referenceBlock:ref.blockNumber||null,referenceHash:ref.blockHash||'',
      note:ref.note||'',aliases:(d.search||{}).aliases||[],
      links:d.links||{},sourceJson:file,researchOnly,
      priceProofStatus:priceProofReady?'BLOCK_PINNED_PRICE_PROOF':'NOT_PRESENT',
      priceProofReady, priceProofCallData:(d.priceProof||{}).callData||(v.callData||v.selector||''),
      validationPlan:(d.runtime||{}).validationPlan||null,
      curvePlan:curveReady?(d.runtime||{}).curvePlan:null,
      priceProofOrigin:(d.priceProof||{}).evidenceProvenance||(d.priceProof||{}).proofScope||'',
      extendedPriceKind:['BEEFY','MAPLE','MORPHO'].includes(d.priceProof?.type)?d.priceProof.type:'',
      curveSnapshotOnly:!curveReady&&pvCurveUsdtRedemptionProof(d),
      curveUsdtIndex:v.calculationInput?.usdtIndex,
      curvePoolCodeSHA256:(d.evidence?.codeChecks||[]).find(x=>String(x.address).toLowerCase()===String(c.protocol).toLowerCase())?.sha256||'',
      curveImplementationCodeSHA256:(d.evidence?.codeChecks||[]).find(x=>String(x.address).toLowerCase()===String(c.implementation).toLowerCase())?.sha256||'',
      sourceShareDecimals:(d.valuation||{}).calculationInput?.shareDecimals,
      sourceUnderlyingDecimals:(d.valuation||{}).calculationInput?.underlyingDecimals,
      lifecycleStatus:(d.lifecycle||{}).status||'NOT_SPECIFIED',
      capitalizationReference:(d.capitalization||{}).referenceSnapshot||null,
      capitalizationConfig: {
        enabled: (d.capitalization||{}).enabled === true,
        quoteAsset: (d.capitalization||{}).quoteAsset || '',
        supplyContract: (d.capitalization||{}).supplyContract || '',
        supplySelector: (d.capitalization||{}).supplySelector || '',
        supplyDecimals: (d.capitalization||{}).supplyDecimals,
        supplyBasis: (d.capitalization||{}).supplyBasis || '',
        requireSameBlock: (d.capitalization||{}).requireSameBlock === true
      },
      capitalizationLive:null, capitalizationError:'', 
      runtimeEnabled:(d.runtime||{}).enabled===true,
      autoUpdateEnabled:!researchOnly && priceProofReady && (d.runtime||{}).enabled===true && (d.runtime||{}).autoUpdate===true && [1,56,43114,10].includes(i.chainId) && v.quoteAsset==='USDT',
      calculationConfig:(d.runtime||{}).calculation||null,
      configurationSignature:JSON.stringify(d),
      auditState: priceProofReady ? "PRICE_PROOF_REPRODUCIBLE" : (String((d.approval||{}).status||"PENDING") === "APPROVED" ? "LEGACY_APPROVAL" : "REFERENCE_ONLY"),
      runtimeMode:(d.runtime||{}).readMode||"",outputDecimals:(d.runtime||{}).outputDecimals,
      runtimeCacheSeconds:(d.runtime||{}).cacheSeconds||60,
      approved:String(a.status||"").toUpperCase()==="APPROVED",
      live:null, liveStatus:"REFERENCE", liveError:"",
      snapshotValue:ref.display||String(ref.normalized||"No reference snapshot")
    };
  };
  const results=[];
  for(let offset=0;offset<catalog.files.length;offset+=4){
    results.push(...await Promise.allSettled(catalog.files.slice(offset,offset+4).map(processFile)));
    if(globalThis.scheduler?.yield)await globalThis.scheduler.yield();
    else await new Promise(resolve=>setTimeout(resolve,0));
  }
  const failures=results.filter(x=>x.status==='rejected');
  if(failures.length) console.warn('Some protocol JSONs failed:',failures.map(x=>String(x.reason)));
  // Only protocols without EOL, DEPRECATED or SUNSET_ISOLATED_POOL lifecycle status are catalogued.
  // Ten research-only records remain separate from eligible internal-price evidence.
  const tokens=results.filter(x=>x.status==='fulfilled' && x.value!==null).map(x=>x.value);
  const ids=new Set(),contracts=new Set();
  for(const t of tokens){
    const key=t.chainId+':'+t.tokenContract.toLowerCase();
    if(ids.has(t.id)||contracts.has(key))throw Error('Duplicate token identity or contract: '+t.sourceJson);
    ids.add(t.id);contracts.add(key);
  }
  tokens.expectedCatalogCount=Number(catalog.catalog?.total??catalog.files.length);
  tokens.skippedFiles=catalog.files.filter((file,index)=>results[index].status==='fulfilled' && results[index].value===null);
  tokens.registryFiles=[...catalog.files];
  tokens.originalCount=catalog.catalog?.previousRegistry ?? tokens.filter(t=>!t.researchOnly).length;
  tokens.researchCount=0;
  tokens.discoveryFiles=[];
  tokens.failedFiles=catalog.files.filter((file,index)=>results[index].status==='rejected');
  return tokens;
};
