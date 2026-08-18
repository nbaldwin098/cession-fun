(function () {
  const views = {
    home: 'viewHome',
    pulse: 'viewExplore',
    explore: 'viewExplore',
    wallet: 'viewWallet',
    you: 'viewProfile',
    profile: 'viewProfile',
    coin: 'viewCoin'
  };
  const tabs = {
    home: 'bnavForYou',
    pulse: 'bnavPulse',
    explore: 'bnavPulse',
    wallet: 'bnavWallet',
    you: 'bnavYou',
    profile: 'bnavYou'
  };

  function toast(msg) {
    if (window.showToast) return window.showToast(msg, 'info');
    alert(msg);
  }

  function address() {
    const w = window.walletEngine;
    return (w && (w.state?.address || w.address || w.publicKey)) || localStorage.getItem('cession_address') || '';
  }

  function emptyHtml(title, sub) {
    return `<div class="cx-empty"><div class="cx-empty-icon">✦</div><h2>${title}</h2><p>${sub}</p><button class="cx-launch" type="button" onclick="CessionUI.openCreate()">Launch</button></div>`;
  }

  function show(name) {
    const key = views[name] ? name : 'home';
    document.querySelectorAll('.page-view').forEach((el) => {
      const on = el.id === views[key];
      el.classList.toggle('active', on);
      el.style.display = on ? 'block' : 'none';
    });
    document.querySelectorAll('.bottom-nav-slot').forEach((el) => el.classList.remove('active'));
    const tab = document.getElementById(tabs[key]);
    if (tab) tab.classList.add('active');
    if (key === 'home' || key === 'pulse' || key === 'explore') loadPulse();
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
    const pulse = document.getElementById('exploreCoinsGrid');
    const q = (document.getElementById('tokenSearchInput')?.value || '').toLowerCase();
    try {
      const res = await fetch('/api/pulse?lane=all&limit=20');
      const data = await res.json();
      const feed = (data.feed || []).filter((c) => {
        if (!c || !c.symbol) return false;
        if (!q) return true;
        return String(c.symbol).toLowerCase().includes(q) || String(c.name || '').toLowerCase().includes(q);
      });
      const html = feed.length
        ? feed.map((c) => `<button class="cx-coin" type="button" onclick='CessionUI.openCoin(${JSON.stringify({ symbol: c.symbol, name: c.name || c.symbol, mint: c.mintAddress || '' })})'><span>${c.name || c.symbol}<br><small>${c.symbol}</small></span><span>${c.pulseScore ?? ''}</span></button>`).join('')
        : emptyHtml('No live coins yet.', 'Be the first to add a coin.');
      if (home) home.innerHTML = html;
      if (pulse) pulse.innerHTML = feed.length ? html : emptyHtml('No coins to rank yet.', 'Be the first to add a coin.');
    } catch (e) {
      if (home) home.innerHTML = emptyHtml('No live coins yet.', 'Be the first to add a coin.');
      if (pulse) pulse.innerHTML = emptyHtml('No coins to rank yet.', 'Be the first to add a coin.');
    }
  }

  function openCoin(coin) {
    show('coin');
    document.getElementById('coinTitle').textContent = coin.name || coin.symbol || 'Coin';
    document.getElementById('coinMeta').textContent = coin.mint ? coin.mint : 'No live mint yet.';
    const empty = document.getElementById('chartEmpty');
    const el = document.getElementById('cessionChart');
    el.innerHTML = '';
    if (!coin.mint || !window.LightweightCharts) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    const chart = LightweightCharts.createChart(el, {
      width: el.clientWidth,
      height: 220,
      layout: { background: { color: '#0b0e16' }, textColor: '#94a3b8' },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } }
    });
    const series = chart.addAreaSeries({ lineColor: '#5B6CFF', topColor: 'rgba(91,108,255,0.3)', bottomColor: 'rgba(91,108,255,0.0)' });
    series.setData([]);
  }

  async function openStatement() {
    const addr = address();
    const month = document.getElementById('settingsStatementMonth')?.value || new Date().toISOString().slice(0, 7);
    const body = document.getElementById('statementBody');
    open('statementModal');
    if (!addr) {
      body.textContent = 'Connect a wallet to load a month.';
      return;
    }
    body.textContent = 'Loading…';
    try {
      const res = await fetch(`/api/wallets/${encodeURIComponent(addr)}/statement?month=${encodeURIComponent(month)}`);
      const data = await res.json();
      body.innerHTML = `<div>Month: ${data.month || month}</div><div>Transactions: ${data.count || (data.transactions || []).length || 0}</div><div>Holdings: none unless a real trade exists.</div><p>${data.disclaimer || 'We index trades. We do not hold keys. Not tax advice.'}</p>`;
    } catch (e) {
      body.textContent = 'No statement yet. No trades indexed.';
    }
  }

  async function downloadCsv() {
    const addr = address();
    if (!addr) return toast('Connect a wallet first.');
    const res = await fetch(`/api/wallets/${encodeURIComponent(addr)}/trades`);
    const data = await res.json();
    const rows = data.trades || data.transactions || [];
    const csv = ['time,type,symbol,sol,txHash']
      .concat(rows.map((t) => [t.time || t.createdAt || '', t.type || '', t.symbol || '', t.sol || t.amount || '', t.txHash || ''].join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cession-${addr.slice(0, 6)}-trades.csv`;
    a.click();
  }

  function openSettings() {
    document.getElementById('settingsWalletAddress').textContent = address() || 'Not connected';
    const month = document.getElementById('settingsStatementMonth');
    if (month && !month.value) month.value = new Date().toISOString().slice(0, 7);
    const link = document.getElementById('settingsSolscan');
    const addr = address();
    if (link) link.href = addr ? `https://solscan.io/account/${addr}` : 'https://solscan.io';
    open('settingsModal');
  }

  function connectPhantom() {
    if (window.walletEngine?.connectPhantom) return window.walletEngine.connectPhantom();
    toast('Phantom is not available in this browser.');
  }
  function connectMetaMask() {
    const w = window.walletEngine;
    if (w?.connectMetaMask) return w.connectMetaMask();
    if (w?.connectEVM) return w.connectEVM('metamask');
    toast('MetaMask is not available in this browser.');
  }

  window.CessionUI = {
    go: show,
    openCreate() { open('deployModal'); },
    openSettings,
    openStatement,
    openCoin,
    downloadCsv,
    connectPhantom,
    connectMetaMask,
    close,
    loadPulse
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnConnectWallet')?.addEventListener('click', () => open('walletModal'));
    document.getElementById('tokenSearchInput')?.addEventListener('input', loadPulse);
    document.getElementById('deployCoinForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      toast('Create is not live until the program is deployed.');
    });
    show('home');
  });
})();
