(function () {
  const SOL_APY = '6.0%';
  const PHANTOM_SOL = 'https://phantom.app/ul/browse/' + encodeURIComponent('https://help.phantom.com/hc/en-us/articles/41210373532307-Stake-SOL-with-Phantom-liquid-staking');
  const PHANTOM_USDC = 'https://phantom.app/ul/browse/' + encodeURIComponent('https://phantom.app');

  function addr() {
    return localStorage.getItem('cession_address') || '';
  }

  function showView(id) {
    document.querySelectorAll('.page-view').forEach(function (el) {
      const on = el.id === id;
      el.classList.toggle('active', on);
      el.style.display = on ? 'block' : 'none';
    });
    window.scrollTo(0, 0);
  }

  function markTab(id) {
    document.querySelectorAll('.cx-xtab').forEach(function (el) { el.classList.remove('on'); });
    const t = document.getElementById(id);
    if (t) t.classList.add('on');
  }

  function ensureViews() {
    const app = document.querySelector('.cx-app');
    if (!app) return;
    if (!document.getElementById('viewPredict')) {
      const m = document.createElement('main');
      m.id = 'viewPredict';
      m.className = 'page-view';
      m.innerHTML = '<h1 class="cx-title">Predictions</h1><div class="cx-card"><p class="cx-muted">Predictions are not live.</p></div>';
      app.appendChild(m);
    }
    if (!document.getElementById('viewImport')) {
      const m = document.createElement('main');
      m.id = 'viewImport';
      m.className = 'page-view';
      m.innerHTML =
        '<h1 class="cx-title" id="importTitle">Import</h1>' +
        '<div class="cx-card" id="importNeedWallet"><p class="cx-muted">Connect a wallet first.</p>' +
        '<button class="cx-door" type="button" onclick="CessionUI.go(\'wallet\')">Wallet</button></div>' +
        '<div class="cx-card" id="importForm" style="display:none">' +
        '<input class="form-input-pump" id="importMint" placeholder="Mint address">' +
        '<button class="cx-launch" type="button" id="importSaveBtn">Save to this wallet</button>' +
        '<div id="importList" class="cx-muted"></div></div>';
      app.appendChild(m);
    }
    if (!document.getElementById('viewSupport')) {
      const m = document.createElement('main');
      m.id = 'viewSupport';
      m.className = 'page-view';
      m.innerHTML =
        '<h1 class="cx-title">Support</h1>' +
        '<div class="cx-card"><p class="cx-muted">Do not send a seed phrase.</p>' +
        '<textarea class="form-input-pump" id="supportText" rows="5" placeholder="What is broken?"></textarea>' +
        '<button class="cx-launch" type="button" onclick="CessionUI.sendSupport()">Send</button>' +
        '<p class="cx-muted" id="supportNote"></p></div>';
      app.appendChild(m);
    }
  }

  function ensureHeader() {
    const header = document.querySelector('.cx-top');
    if (!header) return;
    if (!document.getElementById('tabPredictions')) {
      const b = document.createElement('button');
      b.id = 'tabPredictions';
      b.className = 'cx-xtab';
      b.type = 'button';
      b.textContent = 'Predictions';
      b.onclick = function () { window.CessionUI.go('predict'); };
      const ai = document.getElementById('tabAi');
      if (ai) header.insertBefore(b, ai);
      else header.appendChild(b);
    }
  }

  function ensureFooter() {
    document.querySelectorAll('.cx-you-footer').forEach(function (f) {
      const row = f.querySelector('div:last-child');
      if (!row || row.dataset.wired === '1') return;
      row.dataset.wired = '1';
      ['Import token', 'Import NFT', 'Support'].forEach(function (label) {
        if (row.textContent.indexOf(label) >= 0) return;
        const a = document.createElement('a');
        a.href = 'javascript:void(0)';
        a.textContent = label;
        a.onclick = function (e) {
          e.preventDefault();
          if (label === 'Support') window.CessionUI.openSupport();
          else if (label === 'Import NFT') window.CessionUI.importNft();
          else window.CessionUI.importToken();
        };
        row.appendChild(a);
      });
    });
  }

  function paintEarn() {
    const page = document.getElementById('viewRewards');
    if (!page) return;
    let box = document.getElementById('phantomStakeBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'phantomStakeBox';
      page.insertBefore(box, page.children[1] || null);
    }
    box.innerHTML =
      '<div class="cx-card"><strong>SOL</strong><p class="cx-muted">Phantom liquid stake (PSOL). About 6.0% APY as of 18 Aug 2026.</p>' +
      '<div class="cx-row"><span>APY</span><span>' + SOL_APY + '</span></div>' +
      '<button class="cx-launch" type="button" id="stakeSolBtn">Stake in Phantom</button></div>' +
      '<div class="cx-card"><strong>USDC</strong><p class="cx-muted">Phantom does not publish a fixed USDC stake APY. Stake opens Phantom Earn.</p>' +
      '<div class="cx-row"><span>APY</span><span>In Phantom</span></div>' +
      '<button class="cx-launch" type="button" id="stakeUsdcBtn">Stake in Phantom</button></div>';
    const s = document.getElementById('stakeSolBtn');
    const u = document.getElementById('stakeUsdcBtn');
    if (s) s.onclick = function () { window.location.href = PHANTOM_SOL; };
    if (u) u.onclick = function () { window.location.href = PHANTOM_USDC; };
  }

  function openImport(kind) {
    showView('viewImport');
    markTab('');
    document.getElementById('importTitle').textContent = kind === 'nft' ? 'Import NFT' : 'Import token';
    const need = document.getElementById('importNeedWallet');
    const form = document.getElementById('importForm');
    const has = !!addr();
    need.style.display = has ? 'none' : 'block';
    form.style.display = has ? 'block' : 'none';
    const key = kind === 'nft' ? 'cession_nfts' : 'cession_tokens';
    const list = JSON.parse(localStorage.getItem(key) || '[]').filter(function (x) { return x.wallet === addr(); });
    document.getElementById('importList').textContent = list.length
      ? list.map(function (x) { return x.mint; }).join('\n')
      : 'None imported yet.';
    document.getElementById('importSaveBtn').onclick = function () {
      const mint = (document.getElementById('importMint').value || '').trim();
      if (mint.length < 32) return alert('Need a mint address.');
      const rows = JSON.parse(localStorage.getItem(key) || '[]');
      rows.push({ mint: mint, at: Date.now(), wallet: addr(), kind: kind });
      localStorage.setItem(key, JSON.stringify(rows));
      document.getElementById('importMint').value = '';
      openImport(kind);
    };
  }

  function wire() {
    if (!window.CessionUI) return setTimeout(wire, 40);
    ensureViews();
    ensureHeader();
    ensureFooter();
    paintEarn();
    const ui = window.CessionUI;
    const prev = ui.go;
    ui.go = function (name) {
      if (name === 'predict') { showView('viewPredict'); markTab('tabPredictions'); return; }
      if (name === 'mint') {
        if (prev) prev('mint');
        const mint = document.getElementById('viewMint');
        if (mint) showView('viewMint');
        markTab('tabMint');
        return;
      }
      if (name === 'import') { openImport('token'); return; }
      if (name === 'support') { showView('viewSupport'); return; }
      if (prev) prev(name);
      if (name === 'rewards') paintEarn();
      if (name === 'ai') markTab('tabAi');
    };
    ui.searchLane = ui.searchLane || function (lane) {
      if (ui.setExploreLane) ui.setExploreLane(lane);
      ui.go('explore');
    };
    ui.openPhantomStake = function (asset) {
      window.location.href = asset === 'usdc' ? PHANTOM_USDC : PHANTOM_SOL;
    };
    ui.importToken = function () { openImport('token'); };
    ui.importNft = function () { openImport('nft'); };
    ui.openSupport = function () { showView('viewSupport'); };
    ui.sendSupport = function () {
      const text = (document.getElementById('supportText').value || '').trim();
      if (!text) return;
      const note = document.getElementById('supportNote');
      fetch('/api/admin/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr(), text: text })
      }).then(function (r) { return r.json(); }).then(function () {
        if (note) note.textContent = 'Sent.';
      }).catch(function () {
        if (note) note.textContent = 'Saved on this device. Desk is not live.';
        const q = JSON.parse(localStorage.getItem('cession_tickets') || '[]');
        q.push({ text: text, address: addr(), at: Date.now() });
        localStorage.setItem('cession_tickets', JSON.stringify(q));
      });
    };
    setTimeout(ensureFooter, 800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
