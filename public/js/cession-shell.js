(function () {
  const BLOCKED = new Set(['TDOGE','QPEPE','BDOGE','GRAD','ABULL','SNIPE','BFT','TEST','DEMO']);
  const views = { home:'viewHome', pulse:'viewExplorePulse', explore:'viewExplore', wallet:'viewWallet', you:'viewWallet', ai:'viewAi', coin:'viewCoin' };
  const tabs = { home:'bnavForYou', pulse:'bnavPulse', explore:'bnavExplore', wallet:'bnavWallet', you:'bnavWallet', ai:'bnavYou' };
  let activeCoin = null, tradeSide = 'buy', exploreLane = 'mix', cached = [];
  function toast(m){ if (window.showToast) return window.showToast(m,'info'); alert(m); }
  function engine(){ return window.walletEngine || null; }
  function isPhone(){ return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent); }
  function inMetaMask(){ return !!(window.ethereum && window.ethereum.isMetaMask) || /MetaMaskMobile/i.test(navigator.userAgent); }
  function address(){
    const w = engine();
    return (w && (w.activeAddress || w.address)) || localStorage.getItem('cession_address') || sessionStorage.getItem('cession_address') || '';
  }
  function saveAddr(a){ if (!a) return; localStorage.setItem('cession_address', a); sessionStorage.setItem('cession_address', a); }
  function signals(){ try { return JSON.parse(localStorage.getItem('cession_signals') || '{"holds":[],"opens":{},"skips":[]}'); } catch { return {holds:[],opens:{},skips:[]}; } }
  function writeSignals(s){ localStorage.setItem('cession_signals', JSON.stringify(s)); }
  function presets(){ try { return JSON.parse(localStorage.getItem('cession_presets') || '{}'); } catch { return {}; } }
  function savePresets(){
    const buy = document.getElementById('presetBuySol') || document.getElementById('tradeAmount');
    const slip = document.getElementById('presetSlippage') || document.getElementById('tradeSlippage');
    localStorage.setItem('cession_presets', JSON.stringify({ buySol: parseFloat(buy && buy.value || '0.05'), slippage: parseFloat(slip && slip.value || '1') }));
    toast('Presets saved on this device.');
  }
  function isLiveCoin(c){
    if (!c || !c.symbol) return false;
    const sym = String(c.symbol).toUpperCase();
    if (BLOCKED.has(sym) || /test|demo|mock/i.test(sym + ' ' + (c.name||''))) return false;
    if (c.isTestStage) return false;
    return String(c.mintAddress || c.mint || '').length >= 32;
  }
  function hoursOld(c){ const t = Date.parse(c.createdAt || c.created || 0); return t ? Math.max(0, (Date.now()-t)/3600000) : 24; }
  function forYouScore(c){
    const s = signals();
    const hold = s.holds.includes(c.symbol) ? 25 : 0;
    const opens = Math.min(20, (s.opens[c.symbol] || 0) * 4);
    const skip = s.skips.includes(c.symbol) ? -30 : 0;
    const unique = Math.min(30, Number(c.uniqueTraders || 0));
    const vel = Math.min(20, Number(c.volume24hUsd || c.volume || 0) / 500);
    return (hold + opens + unique + vel + skip) * Math.exp(-0.05 * hoursOld(c));
  }
  function exploreScore(c){
    const trend = Math.min(40, Number(c.volume24hUsd || 0) / 400);
    const value = Math.min(30, Number(c.marketCapUsd || c.priceUsd || 0));
    const neu = Math.max(0, 30 - hoursOld(c));
    if (exploreLane === 'trending') return trend * 2 + Number(c.change24h || 0);
    if (exploreLane === 'value') return value * 2;
    if (exploreLane === 'new') return neu * 2;
    return 0.4 * trend + 0.3 * value + 0.3 * neu;
  }
  function emptyHtml(t,s){ return '<div class="cx-empty"><h2>'+t+'</h2><p class="cx-muted">'+s+'</p></div>'; }
  function cardHtml(c){
    const img = c.imageUrl || c.image || '';
    const chg = Number(c.change24h || 0);
    const payload = JSON.stringify({symbol:c.symbol,name:c.name||c.symbol,mint:c.mintAddress||c.mint||'',image:img,change24h:chg});
    return '<button class="cx-card-coin" type="button" onclick=\'CessionUI.openCoin('+payload+')\'>'+(img?'<img src="'+img+'" alt="">':'')+'<div class="meta"><div class="name">'+(c.name||c.symbol)+'</div><div class="tick">'+c.symbol+(chg?(' '+(chg>0?'+':'')+chg.toFixed(1)+'%'):'')+'</div></div></button>';
  }
  function updateAsk(live){
    const el = document.getElementById('askBanner');
    if (!el) return;
    if (!live.length) { el.textContent = 'Ask · Why are there no live coins yet'; return; }
    const mover = live.slice().sort(function(a,b){ return Math.abs(b.change24h||0) - Math.abs(a.change24h||0); })[0];
    const chg = Number(mover.change24h || 0);
    el.textContent = 'Ask · Why is ' + (mover.symbol||'this coin') + ' ' + (chg>=0?'up':'down') + ' ' + Math.abs(chg).toFixed(1) + '%';
  }
  function show(name){
    const key = views[name] ? name : 'home';
    document.querySelectorAll('.page-view').forEach(function(el){ const on = el.id === views[key]; el.classList.toggle('active', on); el.style.display = on ? 'block' : 'none'; });
    document.querySelectorAll('.bottom-nav-slot').forEach(function(el){ el.classList.remove('active'); });
    const tab = document.getElementById(tabs[key]); if (tab) tab.classList.add('active');
    if (key === 'home' || key === 'pulse' || key === 'explore') loadPulse();
    if (key === 'wallet') syncFromBackend();
    if (key === 'ai') bootAi();
    window.scrollTo(0,0);
  }
  function open(id){ const m=document.getElementById(id); if(!m) return; m.style.display='flex'; m.classList.add('open'); }
  function close(id){ const m=document.getElementById(id); if(!m) return; m.style.display='none'; m.classList.remove('open'); }
  async function loadPulse(){
    const home=document.getElementById('forYouCoinsGrid');
    const best=document.getElementById('pulseBestGrid');
    const worst=document.getElementById('pulseWorstGrid');
    const bundles=document.getElementById('pulseBundleGrid');
    const explore=document.getElementById('exploreGrid');
    const q=(document.getElementById('tokenSearchInput') && document.getElementById('tokenSearchInput').value || '').toLowerCase();
    try { const res = await fetch('/api/pulse?lane=all&limit=50'); const data = await res.json(); cached = (data.feed || []).filter(isLiveCoin); } catch(e) { cached = []; }
    const live = cached.filter(function(c){ if (!q) return true; return String(c.symbol).toLowerCase().includes(q) || String(c.name||'').toLowerCase().includes(q); });
    updateAsk(live);
    if (home) {
      const ranked = live.slice().sort(function(a,b){ return forYouScore(b)-forYouScore(a); });
      if (!ranked.length) home.innerHTML = emptyHtml('No live coins yet.','Be the first to add a coin.');
      else {
        const parts = [];
        ranked.forEach(function(c,i){ if (i && i % 6 === 0) parts.push('<div class="cx-ad">Cession · 0.05 SOL to create · 0.50% trade fee · we do not hold keys.</div>'); parts.push(cardHtml(c)); });
        home.innerHTML = parts.join('');
      }
    }
    const byChg = live.slice().sort(function(a,b){ return Number(b.change24h||0)-Number(a.change24h||0); });
    if (best) best.innerHTML = byChg.slice(0,10).map(cardHtml).join('') || emptyHtml('No coins to rank yet.','Be the first to add a coin.');
    if (worst) worst.innerHTML = byChg.slice().reverse().slice(0,10).map(cardHtml).join('') || emptyHtml('No coins to rank yet.','Be the first to add a coin.');
    if (bundles) bundles.innerHTML = emptyHtml('No official bundles yet.','House coins only.');
    if (explore) {
      const ranked = live.slice().sort(function(a,b){ return exploreScore(b)-exploreScore(a); });
      explore.innerHTML = ranked.length ? ranked.map(cardHtml).join('') : emptyHtml('No live coins yet.','Search after the first mint.');
    }
  }
  function setExploreLane(lane){ exploreLane = lane; const p=document.getElementById('botsPanel'); if (p) p.style.display = lane === 'bots' ? 'block' : 'none'; loadPulse(); }
  function openCoin(coin){
    activeCoin = coin;
    const s = signals(); s.opens[coin.symbol] = (s.opens[coin.symbol]||0)+1; writeSignals(s);
    show('coin');
    document.getElementById('coinTitle').textContent = coin.name || coin.symbol || 'Coin';
    document.getElementById('coinMeta').textContent = coin.mint || 'No live mint yet.';
  }
  function openTrade(side){
    if (!address()) { open('walletModal'); return; }
    if (!activeCoin || !activeCoin.mint) return toast('No live mint to trade.');
    tradeSide = side;
    document.getElementById('tradeTitle').textContent = side === 'sell' ? 'Sell' : 'Buy';
    document.getElementById('tradeCoinLabel').textContent = activeCoin.symbol || '';
    const p = presets();
    document.getElementById('tradeAmount').value = p.buySol || 0.05;
    document.getElementById('tradeSlippage').value = p.slippage || 1;
    open('tradeModal');
  }
  function confirmTrade(){ if (!address()) { open('walletModal'); return; } toast('Sign this one trade in your wallet.'); }
  async function syncFromBackend(){
    const addr = address();
    const out = document.getElementById('walletScreenDisconnected');
    const inn = document.getElementById('walletScreenConnected');
    if (out && inn) { out.style.display = addr ? 'none' : 'block'; inn.style.display = addr ? 'block' : 'none'; }
    const settingsAddr = document.getElementById('settingsWalletAddress');
    if (settingsAddr) settingsAddr.textContent = addr || 'Not connected';
    const wa = document.getElementById('walletScreenAddress');
    if (wa && addr) wa.textContent = addr;
    if (addr) saveAddr(addr);
  }
  async function openStatement(){
    const addr = address(); const body = document.getElementById('statementBody'); const btn = document.getElementById('statementDownloadBtn');
    open('statementModal');
    if (!addr) { if (body) body.textContent = 'No statements to display.'; if (btn) btn.style.display='none'; return; }
    try {
      const res = await fetch('/api/wallets/'+encodeURIComponent(addr)+'/statement');
      const data = await res.json();
      const txs = data.transactions || data.trades || [];
      if (!txs.length && !data.count) { if (body) body.textContent='No statements to display.'; if (btn) btn.style.display='none'; return; }
      if (body) body.innerHTML = '<div>Wallet: '+addr+'</div><div>Transactions: '+(data.count||txs.length)+'</div>';
      if (btn) btn.style.display='block';
    } catch(e) { if (body) body.textContent='No statements to display.'; if (btn) btn.style.display='none'; }
  }
  async function downloadCsv(){
    const addr = address(); if (!addr) return toast('No statements to display.');
    const res = await fetch('/api/wallets/'+encodeURIComponent(addr)+'/trades');
    const data = await res.json();
    const rows = data.trades || data.transactions || [];
    if (!rows.length) return toast('No statements to display.');
    const csv = ['time,type,symbol,sol,txHash'].concat(rows.map(function(t){ return [t.time||'',t.type||'',t.symbol||'',t.sol||'',t.txHash||''].join(','); })).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download = 'cession-statement-'+addr.slice(0,6)+'.csv'; a.click();
  }
  function connectPhantom(){
    if (isPhone() && !window.solana) { window.location.href = 'https://phantom.app/ul/browse/' + encodeURIComponent(window.location.href); return; }
    if (engine() && engine().connectPhantom) return engine().connectPhantom();
    toast('Open this page in Phantom.');
  }
  function connectMetaMask(){
    if (isPhone() && !inMetaMask()) { window.location.href = 'https://metamask.app.link/dapp/' + window.location.host + window.location.pathname; return; }
    const w = engine();
    if (w && w.connectMetaMask) return w.connectMetaMask();
    if (w && w.connectEVM) return w.connectEVM('metamask');
    if (window.ethereum && window.ethereum.request) {
      window.ethereum.request({ method:'eth_requestAccounts' }).then(function(acc){ if (acc && acc[0]) { saveAddr(acc[0]); syncFromBackend(); } });
      return;
    }
    toast('Stay in the MetaMask app browser to stay logged in.');
  }
  function toggleTheme(){
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cession_theme', next);
  }
  function bootAi(){
    const log = document.getElementById('aiLog');
    if (log && !log.dataset.ready) { log.dataset.ready = '1'; addAi('bot', 'Ask me about coins, why something moved, or your wallet. I only use Cession data.'); }
  }
  function addAi(who, text){
    const log = document.getElementById('aiLog'); if (!log) return;
    const d = document.createElement('div'); d.className = 'cx-msg ' + who; d.textContent = text; log.appendChild(d); log.scrollTop = log.scrollHeight;
  }
  async function sendAi(){
    const input = document.getElementById('aiInput'); const q = (input && input.value || '').trim(); if (!q) return;
    input.value = ''; addAi('me', q);
    const addr = address(); const low = q.toLowerCase();
    if (/pnl|p\/l|profit|loss|statement|hold/i.test(low)) {
      if (!addr) { addAi('bot', 'Connect a wallet first. Safari cannot see a login that happened inside MetaMask.'); return; }
      try {
        const res = await fetch('/api/wallets/'+encodeURIComponent(addr)+'/statement');
        const data = await res.json();
        addAi('bot', 'Wallet '+addr.slice(0,4)+'\u2026 ' + (data.count ? ('has '+data.count+' indexed Cession trades.') : 'has no Cession statement yet.') + ' Not tax advice.');
      } catch(e) { addAi('bot', 'No statements to display.'); }
      return;
    }
    if (/why|up|down|move/i.test(low) && cached.length) {
      const mover = cached.slice().sort(function(a,b){ return Math.abs(b.change24h||0)-Math.abs(a.change24h||0); })[0];
      addAi('bot', (mover.symbol||'A coin')+' is the largest 24h move on this board at '+(Number(mover.change24h||0).toFixed(1))+'%.');
      return;
    }
    if (!cached.length) { addAi('bot', 'No live coins yet. Create is 0.05 SOL. The program is not live.'); return; }
    addAi('bot', 'I see '+cached.length+' live coins. For You uses holds, opens, unique traders, volume, and time decay. Explore mixes trending, value, and new.');
  }
  window.CessionUI = {
    go:show, open:open, close:close,
    openCreate:function(){ open('deployModal'); },
    openSettings:function(){ syncFromBackend(); open('settingsModal'); },
    openStatement:openStatement, downloadCsv:downloadCsv, savePresets:savePresets,
    openCoin:openCoin, openTrade:openTrade, confirmTrade:confirmTrade,
    connectPhantom:connectPhantom, connectMetaMask:connectMetaMask,
    openStake:function(){ open('stakeModal'); },
    openPhantomStake:function(){
      if (isPhone()) window.location.href = 'https://phantom.app/ul/browse/'+encodeURIComponent('https://help.phantom.com/hc/en-us/articles/4406374138771');
      else window.open('https://help.phantom.com/hc/en-us/articles/4406374138771-Stake-SOL-natively-to-a-validator','_blank','noopener');
    },
    loadPulse:loadPulse, syncFromBackend:syncFromBackend, sendAi:sendAi, toggleTheme:toggleTheme, setExploreLane:setExploreLane
  };
  document.addEventListener('DOMContentLoaded', function(){
    document.documentElement.setAttribute('data-theme', localStorage.getItem('cession_theme') || 'dark');
    const search = document.getElementById('tokenSearchInput'); if (search) search.addEventListener('input', loadPulse);
    const form = document.getElementById('deployCoinForm'); if (form) form.addEventListener('submit', function(e){ e.preventDefault(); toast('Create is not live until the program is deployed.'); });
    const ai = document.getElementById('aiInput'); if (ai) ai.addEventListener('keydown', function(e){ if (e.key==='Enter') sendAi(); });
    const pills = document.getElementById('topPills');
    if (pills) pills.addEventListener('click', function(e){
      const b = e.target.closest('.cx-pill'); if (!b) return;
      document.querySelectorAll('#topPills .cx-pill').forEach(function(x){ x.classList.remove('on'); });
      b.classList.add('on');
      const lane = b.getAttribute('data-lane');
      if (lane === 'earn' || lane === 'rewards' || lane === 'perps') toast(b.textContent + ' is not live.');
      if (lane === 'trending') { exploreLane = 'trending'; show('explore'); }
    });
    if (address()) syncFromBackend();
    if (inMetaMask() && window.ethereum && window.ethereum.request) {
      window.ethereum.request({ method:'eth_accounts' }).then(function(acc){ if (acc && acc[0]) { saveAddr(acc[0]); syncFromBackend(); } });
    }
    window.addEventListener('pageshow', syncFromBackend);
    show('home');
  });
})();
