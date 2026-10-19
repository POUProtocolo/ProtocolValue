// Decimal strings and BigInt keep financial values out of floating point.
window.PVCapital = (() => {
  function valid(v) { return typeof v === 'string' && /^\d+(?:\.\d+)?$/.test(v); }
  function formatUSDT(value) {
    if (!valid(value)) return 'Unavailable';
    const [whole, fraction = ''] = value.split('.');
    let cents = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
    if ((fraction[2] || '0') >= '5') cents += 1n;
    const integer = (cents / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return integer + '.' + (cents % 100n).toString().padStart(2, '0') + ' USDT';
  }
  function pick(t) {
    const cap = t.capitalizationLive || t.capitalization || t.capitalizationReference || null;
    if (valid(cap?.normalized) && (cap.quoteAsset !== 'USDT' || !cap.blockNumber || !/^0x[0-9a-fA-F]{64}$/.test(cap.blockHash || ''))) {
      return {normalized:null, error:'Missing same-block evidence of USDT value and token supply.'};
    }
    return cap;
  }
  function escape(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function status(cap) { if(cap?.status === 'LIVE') return Date.now()-Date.parse(cap.observedAt||'')<=120000?'Live on-chain':'Verified on-chain'; return cap?.status === 'STALE' ? 'Outdated' : 'Historical snapshot'; }
  function cell(t) {
    if(t.curveSnapshotOnly&&!t.capitalizationLive)return '<div class="cap-main unavailable-value">Not applicable</div><div class="value-sub">One-LP redemption quote ≠ capitalization</div>';
    const cap = pick(t);
    if (!valid(cap?.normalized)) return '<div class="cap-main unavailable-value">Unavailable</div><div class="value-sub">'+escape(cap?.error || 'Compatible value and supply data unavailable')+'</div>';
    return '<div class="cap-main" title="'+escape(cap.normalized+' USDT')+'">'+formatUSDT(cap.normalized)+'</div><div class="value-sub">'+status(cap)+(cap.scope==='INDICATIVE_NATIVE_QUOTE_TIMES_SUPPLY'?' · indicative LP value':'')+' · block '+escape(cap.blockNumber || '—')+(t.capitalizationError && cap.status!=='LIVE' ? ' · '+escape(/429|rate.?limit|too many/i.test(t.capitalizationError)?'RPC rate limited; retry scheduled':'current RPC unavailable') : '')+'</div>';
  }
  function details(t) {
    if(t.curveSnapshotOnly&&!t.capitalizationLive)return '<div class="cap-details"><h4>Internal capitalization — USDT</h4><p>Not applicable: a native one-LP redemption quotation cannot be multiplied into a guaranteed liquidation value of the entire LP supply.</p></div>';
    const cap = pick(t);
    if (!valid(cap?.normalized)) return '<div class="cap-details"><h4>Internal capitalization — USDT</h4><p>'+escape(cap?.error || 'Unavailable: missing matching value and supply at the same block.')+'</p></div>';
    const supplyLabel = cap.supplyBasis === 'SUPPLY_INCLUDING_QUARANTINE' ? 'Supply including quarantine' : 'Total token supply';
    return '<div class="cap-details"><h4>Internal capitalization — USDT</h4><div class="kv"><span>Data source</span><b>'+escape(status(cap))+'</b></div>'+(t.capitalizationError && cap.status!=='LIVE' ? '<div class="kv"><span>Diagnostic</span><b>'+escape(/429|rate.?limit|too many/i.test(t.capitalizationError)?'RPC HTTP 429: public endpoint rate-limited. Pinned historical value retained; a current reading is pending.':t.capitalizationError)+'</b></div>' : '')+'<div class="kv"><span>Capitalization</span><b>'+formatUSDT(cap.normalized)+'</b></div><div class="kv"><span>'+supplyLabel+'</span><b>'+escape(cap.supplyNormalized)+' '+escape(t.symbol)+'</b></div><div class="kv"><span>Internal value per token</span><b>'+escape(cap.valueNormalized)+' USDT</b></div><div class="kv"><span>Calculation block</span><b>'+escape(cap.blockNumber)+'</b></div><p>Internal unit value × corresponding token supply at the same block. For LP tokens this is indicative quotation-based capitalization, not total pool NAV or a full-supply liquidation quote. This refers to the listed token, not the market capitalization of the protocol, and does not guarantee available reserves.</p></div>';
  }
  function compare(a, b) {
    const x = pick(a)?.normalized, y = pick(b)?.normalized;
    if (!valid(x)) return valid(y) ? 1 : 0;
    if (!valid(y)) return -1;
    const [xi, xf=''] = x.split('.'), [yi, yf=''] = y.split('.');
    const places = Math.max(xf.length, yf.length);
    const xv = BigInt(xi + xf.padEnd(places,'0')), yv = BigInt(yi + yf.padEnd(places,'0'));
    return xv === yv ? 0 : xv > yv ? -1 : 1;
  }
  return {formatUSDT, pick, cell, details, compare};
})();
