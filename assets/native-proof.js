// Admission proof for reviewed native accounting models. This never approves a candidate.
window.PVAdditionalNativeProof=d=>{
 try{
  const i=d.identity,c=d.contracts,v=d.valuation,rt=d.runtime,p=rt?.validationPlan,e=d.evidence,r=d.referenceSnapshot;
  const assets={1:'0xdac17f958d2ee523a2206206994597c13d831ec7',56:'0x55d398326f99059ff775485246999027b3197955',43114:'0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7',10:'0x94b008aa00579c1307b0ef2c499ad98a8ce58e58'};
  const modelMethods={AAVE_STATIC:'convertToAssets(uint256)',GEARBOX_4626:'convertToAssets(uint256)',IDLE_NAV:'tokenPrice()',STARGATE_PAR:'tvl()/lpToken.totalSupply()'};
  if(d.approval?.status!=='APPROVED'||rt.readMode!=='VALIDATED_USDT_NATIVE'||!rt.enabled||!rt.autoUpdate||!p||p.chainId!==i.chainId||!modelMethods[p.model]||v.sourceFunction!==modelMethods[p.model]||v.quoteAsset!=='USDT'||p.underlying.toLowerCase()!==assets[i.chainId]||c.underlying.toLowerCase()!==assets[i.chainId]||c.token.toLowerCase()!==p.token.toLowerCase()||rt.outputDecimals!==p.assetDecimals||!Number.isInteger(p.shareDecimals)||p.shareDecimals<0||p.shareDecimals>36||BigInt(p.oneShareRaw)!==10n**BigInt(p.shareDecimals))return false;
  if(!Number.isSafeInteger(e.blockNumber)||e.blockNumber<=0||e.blockNumber!==r.blockNumber||e.blockTag!=='0x'+e.blockNumber.toString(16)||!/^0x[\da-f]{64}$/i.test(e.blockHash)||e.blockHash!==r.blockHash||!p.codeChecks.length||!Array.isArray(p.administrativeCalls)||!Array.isArray(p.storageChecks)||!Array.isArray(p.administrativeEvents)||p.approvedBlockNumber!==e.blockNumber||!e.verifiedSources?.length)return false;
  if(c.token.toLowerCase()!==c.protocol.toLowerCase()&&p.model!=='STARGATE_PAR')return false;
  const values={};
  for(const [key,spec] of Object.entries(p.reads)){
   const found=e.calls.filter(x=>x.to.toLowerCase()===spec.to.toLowerCase()&&x.data.toLowerCase()===spec.data.toLowerCase()&&x.blockTag===e.blockTag);
   if(!found.length||found.some(x=>x.result!==found[0].result))return false;
   values[key]=window.PVValidatedUSDT.decode(found[0].result,spec);
  }
  if(p.model==='STARGATE_PAR'&&values.lpToken!==BigInt(c.token))return false;
  if(['AAVE_STATIC','GEARBOX_4626'].includes(p.model)&&v.callData!=='0x07a2d13a'+BigInt(p.oneShareRaw).toString(16).padStart(64,'0'))return false;
  const timestamp=BigInt(Math.floor(Date.parse(e.blockTimestamp)/1000)),raw=window.PVValidatedUSDT.derive(p,values,timestamp);
  return raw===BigInt(r.raw)&&raw===BigInt(d.value.raw)&&window.PVValidatedUSDT.units(raw,rt.outputDecimals)===r.normalized&&r.display===r.normalized+' USDT'&&e.formulaCheck?.exactMatch===true&&String(e.formulaCheck.calculatedRaw)===String(r.raw);
 }catch{return false;}
};
