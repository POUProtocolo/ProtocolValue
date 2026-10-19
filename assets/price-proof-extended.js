// ProtocolValue 3.5 — block-pinned direct USDT-per-share evidence.
// Reproduces recorded call outputs using exact BigInt operations; not a fresh RPC query.
window.PVExtendedPriceProof = function (d) {
  const p=d?.priceProof||{}, i=d?.identity||{}, c=d?.contracts||{}, v=d?.valuation||{},
        r=d?.runtime||{}, ref=d?.referenceSnapshot||{}, ev=d?.evidence||{}, calls=ev.calls||[];
  const ADDR=/^0x[0-9a-f]{40}$/i, WORD=/^0x[0-9a-f]{64}$/i;
  const USDT={1:'0xdac17f958d2ee523a2206206994597c13d831ec7',43114:'0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7'};
  const kinds=['BEEFY','MAPLE','MORPHO'];
  if(!kinds.includes(p.type)||p.status!=='PINNED_ACCOUNTING_VALUE_VERIFIED'||
     !Object.hasOwn(USDT,i.chainId)||!ADDR.test(c.protocol||'')||!ADDR.test(c.underlying||'')||
     c.underlying.toLowerCase()!==USDT[i.chainId]||
     String(p.contract).toLowerCase()!==c.protocol.toLowerCase()||
     String(p.underlying).toLowerCase()!==c.underlying.toLowerCase()||
     p.chainId!==i.chainId||p.unit!=='USDT/share'||v.quoteAsset!=='USDT'||
     p.function!==v.sourceFunction||p.callData!==(v.callData||v.selector)||
     r.readMode!=='ETH_CALL_UINT256'||!Number.isInteger(p.outputDecimals)||
     p.outputDecimals<0||p.outputDecimals>36||r.outputDecimals!==p.outputDecimals||
     !Number.isSafeInteger(p.blockNumber)||p.blockNumber<=0||
     p.blockNumber!==ev.blockNumber||p.blockNumber!==ref.blockNumber||
     String(ref.blockHash).toLowerCase()!==String(p.blockHash).toLowerCase()||
     String(ev.blockHash).toLowerCase()!==String(p.blockHash).toLowerCase()||
     !WORD.test(p.blockHash||'')||ev.blockTag!=='0x'+p.blockNumber.toString(16)||
     p.raw!==ref.raw||p.normalized!==ref.normalized||
     !Array.isArray(calls)||calls.length<7)return false;
  try {
    if(d.value?.raw!==p.raw||d.value?.normalized!==p.normalized||
       d.value?.blockNumber!==p.blockNumber||
       d.value?.blockHash?.toLowerCase()!==p.blockHash.toLowerCase())return false;
    const ct=c.protocol.toLowerCase(), u=c.underlying.toLowerCase(), block=ev.blockTag;
    const sel={
      'getPricePerFullShare()':'0x77c7b8fc','balance()':'0xb69ef8a8',
      'totalSupply()':'0x18160ddd','decimals()':'0x313ce567',
      'asset()':'0x38d52e0f','want()':'0x1f1fcd51',
      'totalAssets()':'0x01e1d114','unrealizedLosses()':'0x67e2ba23',
      'lastTotalAssets()':'0x568efc07','fee()':'0xddca3f43','DECIMALS_OFFSET()':'0xaea70acc'
    };
    // Calldata is checked from the captured call, including the full input for convertToAssets().
    const get=(name,address=ct)=>{
      const matching=calls.filter(x=>x.function===name&&String(x.to).toLowerCase()===address&&x.blockTag===block&&WORD.test(x.result||''));
      if(matching.length!==1)throw Error('Missing or duplicate pinned call '+name);
      const found=matching[0];
      if(sel[name]&&found.data.toLowerCase()!==sel[name])throw Error('Function selector mismatch '+name);
      return BigInt(found.result);
    };
    if(calls.some(x=>x.blockTag!==block))return false;
    const underlyingDecimals=get('decimals()',u),shareDecimals=get('decimals()');
    const a=v.calculationInput||{};
    if(!Number.isInteger(a.shareDecimals)||!Number.isInteger(a.underlyingDecimals)||
      shareDecimals!==BigInt(a.shareDecimals)||underlyingDecimals!==BigInt(a.underlyingDecimals)||
      ![6n,18n].includes(shareDecimals)||underlyingDecimals!==6n)return false;
    if(get(p.type==='BEEFY'?'want()':'asset()')!==BigInt(c.underlying))return false;
    const raw=BigInt(p.raw),scale=10n**BigInt(p.outputDecimals);
    const actualStr=(raw/scale).toString()+(raw%scale===0n?'':'.'+(raw%scale).toString().padStart(p.outputDecimals,'0').replace(/0+$/,''));
    if(raw<=0n||actualStr!==p.normalized||
       String(ref.display)!==actualStr+' USDT')return false;
    const supply=get('totalSupply()');if(supply<=0n)return false;
    let expected=0n;
    if(p.type==='BEEFY') {
      if(p.function!=='getPricePerFullShare()'||p.callData!=='0x77c7b8fc'||
         p.outputDecimals!==Number(18n+underlyingDecimals-shareDecimals))return false;
      expected=get('balance()')*10n**shareDecimals/supply;
    } else {
      if(p.function!=='convertToAssets(uint256)'||p.outputDecimals!==Number(underlyingDecimals)||
         BigInt(v.normalizedInput||'0')!==10n**shareDecimals||
         p.callData.toLowerCase()!=='0x07a2d13a'+(10n**shareDecimals).toString(16).padStart(64,'0'))return false;
      if(p.type==='MAPLE') {
        const losses=get('unrealizedLosses()'),assets=get('totalAssets()');
        if(losses>assets)return false;
        expected=(assets-losses)*10n**shareDecimals/supply;
      } else {
        const assets=get('totalAssets()'),last=get('lastTotalAssets()'),fee=get('fee()'),offset=get('DECIMALS_OFFSET()');
        if(assets<=0n||fee>10n**18n||offset>36n)return false;
        const gain=assets>last?assets-last:0n,feeAssets=gain*fee/10n**18n;
        if(assets<feeAssets)return false;
        const feeShares=feeAssets*(supply+10n**offset)/(assets-feeAssets+1n);
        expected=10n**shareDecimals*(assets+1n)/(supply+feeShares+10n**offset);
      }
    }
    const main=calls.filter(x=>x.function===p.function&&String(x.to).toLowerCase()===ct&&x.data===p.callData&&x.blockTag===block&&WORD.test(x.result||''));
    if(main.length!==1)return false;
    // Separate, documented contract return MUST match exact independent integer math.
    return expected===raw&&BigInt(main[0].result)===raw;
  }catch(err){return false;}
};
