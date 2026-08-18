(function () {
  const BLOCKED = new Set(['TDOGE', 'QPEPE', 'BDOGE', 'GRAD', 'ABULL', 'SNIPE', 'BFT', 'TEST', 'DEMO']);
  const views = {
    home: 'viewHome', pulse: 'viewExplorePulse', explore: 'viewExplore',
    wallet: 'viewWallet', you: 'viewProfile', profile: 'viewProfile', coin: 'viewCoin'
  };
  const tabs = {
    home: 'bnavForYou', pulse: 'bnavPulse', explore: 'bnavExplore',
    wallet: 'bnavWallet', you: 'bnavYou', profile: 'bnavYou'
  };
  let activeCoin = null;
  let tradeSide = 'buy';
  function toast(msg) {
    if (window.showToast) return window.showToast(msg, 'info');
    alert(msg);
  }
  function engine() { return window.walletEngine || null; }
  function address() {
    const w = engine();
    return (w && (w.activeAddress || w.address || w.publicKey)) || sessionStorage.getItem('cession_address') || '';
  }
  function isPhone() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }
  function presets() {
    try { return JSON.parse(localStorage.getItem('cession_presets') || '{}'); } catch { return {}; }
  }
  function savePresets() {
    localStorage.setItem('cession_presets', JSON.stringify({
      buySol: parseFloat(document.getElementById('presetBuySol')?.value || '0.05'),
      slippage: parseFloat(document.getElementById('presetSlippage')?.value || '1')
    }));
    toast('Presets saved on this device.');
  }
  function isLiveCoin(c) {
    if (!c || !c.symbol) return false;
    const sym = String(c.symbol).toUpperCase();
    const name = String(c.name || '');
    if (BLOCKED.has(sym)) return false;
    if (/test|demo|example|mock|graduation token/i.test(sym + ' ' + name)) return false;
    if (c.isTestStage) return false;
    const mint = c.mintAddress || c.mint || '';
    return mint.length >= 32;
  }
  function emptyHtml(title, sub) {
    return '<div class="cx-empty"><h2>' + title + '</h2><p>' + sub + '</p></div>';
  }
  function cardHtml(c) {
    const img = c.imageUrl || c.image || '';
    const payload = JSON.stringify({ symbol: c.symbol, name: c.name || c.symbol, mint: c.mintAddress || c.mint || '', image: img });
    return '<button class="cx-card-coin" type="button" onclick=\'CessionUI.openCoin(' + payload + ')\'>' + (img ? '<img src="' + img + '" alt="">' : '') + '<div class="meta"><div class="name">' + (c.name || c.symbol) + '</div><div class="tick">' + c.symbol + '</div></div></button>';
  }
  function show(name) {
    const key = views[name] ? name : 'home';
    document.querySelectorAll('.page-view').forEach(function (el) {
      const on = el.id === views[key];
      el.classList.toggle('active', on);
      el.style.display = on ? 'block' : 'none';
    });
    document.querySelectorAll('.bottom-nav-slot').forEach(function (el) { el.classList.remove('active'); });
    const tab = document.getElementById(tabs[key]);
    if (tab) tab.classList.add('active');
    if (key === 'home' || key === 'pulse' || key === 'explore') loadPulse();
    if (key === 'you' || key === 'wallet') syncFromBackend();
    window.scrollTo(0, 0);
  }
  function open(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.style.display = 'flex';
    modal.classList.add('open');
  }
  function close(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.style.display = 'none';
    modal.classList.remove('open');
  }
  async function loadPulse() {
    const home = document.getElementById('forYouCoinsGrid');
    const best = document.getElementById('pulseBestGrid');
    const worst = document.getElementById('pulseWorstGrid');
    const bundles = document.getElementById('pulseBundleGrid');
    const q = (document.getElementById('tokenSearchInput') && document.getElementById('tokenSearchInput').value || '').toLowerCase();
    try {
      const res = await fetch('/api/pulse?lane=all&limit=50');
      const data = await res.json();
      const live = (data.feed || []).filter(isLiveCoin).filter(function (c) {
        if (!q) return true;
        return String(c.symbol).toLowerCase().includes(q) || String(c.name || '').toLowerCase().includes(q);
      });
      if (home) home.innerHTML = live.length ? live.map(cardHtml).join('') : emptyHtml('No live coins yet.', 'Be the first to add a coin.');
      const byChg = live.slice().sort(function (a, b) { return Number(b.change24h || 0) - Number(a.change24h || 0); });
      if (best) best.innerHTML = byChg.slice(0, 10).map(cardHtml).join('') || emptyHtml('No coins to rank yet.', 'Be the first to add a coin.');
      if (worst) worst.innerHTML = byChg.slice().reverse().slice(0, 10).map(cardHtml).join('') || emptyHtml('No coins to rank yet.', 'Be the first to add a coin.');
    } catch (e) {
      if (home) home.innerHTML = emptyHtml('No live coins yet.', 'Be the first to add a coin.');
    }
    if (bundles) bundles.innerHTML = emptyHtml('No official bundles yet.', 'House coins only.');
  }
  function openCoin(coin) {
    activeCoin = coin;
    show('coin');
    document.getElementById('coinTitle').textContent = coin.name || coin.symbol || 'Coin';
    const meta = document.getElementById('coinMeta');
    if (meta) meta.textContent = coin.mint || 'No live mint yet.';
    const img = document.getElementById('coinImage');
    if (img) {
      if (coin.image) { img.src = coin.image; img.style.display = 'block'; } else img.style.display = 'none';
    }
  }
  function openTrade(side) {
    if (!address()) { open('walletModal'); return; }
    if (!activeCoin || !activeCoin.mint) return toast('No live mint to trade.');
    tradeSide = side;
    const title = document.getElementById('tradeTitle');
    if (title) title.textContent = side === 'sell' ? 'Sell' : 'Buy';
    const label = document.getElementById('tradeCoinLabel');
    if (label) label.textContent = activeCoin.symbol || '';
    const amt = document.getElementById('tradeAmount');
    if (amt) amt.value = presets().buySol || 0.05;
    open('tradeModal');
  }
  function confirmTrade() {
    if (!address()) { open('walletModal'); return; }
    toast('Sign this one trade in Phantom or MetaMask.');
  }
  async function syncFromBackend() {
    const addr = address();
    const out = document.getElementById('youLoggedOut');
    const inn = document.getElementById('youLoggedIn');
    if (out && inn) {
      out.style.display = addr ? 'none' : 'block';
      inn.style.display = addr ? 'block' : 'none';
    }
    const settingsAddr = document.getElementById('settingsWalletAddress');
    const profileAddr = document.getElementById('profileAddressFull');
    if (settingsAddr) settingsAddr.textContent = addr || 'Not connected';
    if (profileAddr && addr) profileAddr.textContent = addr;
    if (!addr) return;
    sessionStorage.setItem('cession_address', addr);
  }
  async function openStatement() {
    const addr = address();
    const body = document.getElementById('statementBody');
    const btn = document.getElementById('statementDownloadBtn');
    open('statementModal');
    if (!addr) {
      if (body) body.textContent = 'No statements to display.';
      if (btn) btn.style.display = 'none';
      return;
    }
    try {
      const res = await fetch('/api/wallets/' + encodeURIComponent(addr) + '/statement');
      const data = await res.json();
      const txs = data.transactions || data.trades || [];
      if (!txs.length && !data.count) {
        if (body) body.textContent = 'No statements to display.';
        if (btn) btn.style.display = 'none';
        return;
      }
      if (body) body.innerHTML = '<div>Wallet: ' + addr + '</div><div>Transactions: ' + (data.count || txs.length) + '</div>';
      if (btn) btn.style.display = 'block';
    } catch (e) {
      if (body) body.textContent = 'No statements to display.';
      if (btn) btn.style.display = 'none';
    }
  }
  async function downloadCsv() {
    const addr = address();
    if (!addr) return toast('No statements to display.');
    const res = await fetch('/api/wallets/' + encodeURIComponent(addr) + '/trades');
    const data = await res.json();
    const rows = data.trades || data.transactions || [];
    if (!rows.length) return toast('No statements to display.');
    const csv = ['time,type,symbol,sol,txHash'].concat(rows.map(function (t) { return [t.time || '', t.type || '', t.symbol || '', t.sol || '', t.txHash || ''].join(','); })).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'cession-statement-' + addr.slice(0, 6) + '.csv';
    a.click();
  }
  function setHints() {
    const text = isPhone()
      ? 'On phone, open this site in the Phantom or MetaMask app. We will not ask you to install a Chrome extension.'
      : 'On desktop, use the Phantom or MetaMask Chrome extension.';
    ['walletExtHint', 'walletExtHintModal'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    });
  }
  function connectPhantom() {
    if (isPhone() && !window.solana) {
      window.location.href = 'https://phantom.app/ul/browse/' + encodeURIComponent(window.location.href) + '?ref=cession';
      return;
    }
    if (engine() && engine().connectPhantom) return engine().connectPhantom();
    toast(isPhone() ? 'Open this page in the Phantom app.' : 'Install the Phantom Chrome extension, then connect.');
  }
  function connectMetaMask() {
    if (isPhone() && !window.ethereum) {
      window.location.href = 'https://metamask.app.link/dapp/' + window.location.host + window.location.pathname;
      return;
    }
    const w = engine();
    if (w && w.connectMetaMask) return w.connectMetaMask();
    if (w && w.connectEVM) return w.connectEVM('metamask');
    toast(isPhone() ? 'Open this page in the MetaMask app.' : 'Install the MetaMask Chrome extension, then connect.');
  }
  function openStake() { open('stakeModal'); }
  function openPhantomStake() {
    if (isPhone()) {
      window.location.href = 'https://phantom.app/ul/browse/' + encodeURIComponent('https://help.phantom.com/hc/en-us/articles/4406374138771');
      return;
    }
    window.open('https://help.phantom.com/hc/en-us/articles/4406374138771-Stake-SOL-natively-to-a-validator', '_blank', 'noopener');
  }
  function hookWallet() {
    const w = engine();
    if (!w || w._cessionHooked) return;
    w._cessionHooked = true;
    const original = w.renderState && w.renderState.bind(w);
    if (original) {
      w.renderState = function () {
        original();
        if (w.activeAddress) sessionStorage.setItem('cession_address', w.activeAddress);
        syncFromBackend();
      };
    }
  }
  window.CessionUI = {
    go: show, open: open, close: close,
    openCreate: function () { open('deployModal'); },
    openSettings: function () { syncFromBackend(); open('settingsModal'); },
    openStatement: openStatement, downloadCsv: downloadCsv, savePresets: savePresets,
    openCoin: openCoin, openTrade: openTrade, confirmTrade: confirmTrade,
    connectPhantom: connectPhantom, connectMetaMask: connectMetaMask,
    openStake: openStake, openPhantomStake: openPhantomStake, loadPulse: loadPulse, syncFromBackend: syncFromBackend
  };
  document.addEventListener('DOMContentLoaded', function () {
    hookWallet();
    setHints();
    const btn = document.getElementById('btnConnectWallet');
    if (btn) btn.addEventListener('click', function () { open('walletModal'); });
    const search = document.getElementById('tokenSearchInput');
    if (search) search.addEventListener('input', loadPulse);
    const form = document.getElementById('deployCoinForm');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      toast('Create is not live until the program is deployed.');
    });
    show('home');
    setTimeout(hookWallet, 500);
  });
})();
