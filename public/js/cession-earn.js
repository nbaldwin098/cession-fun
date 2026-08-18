(function () {
  const SOL_APY = '6.0%';
  const SOL_NOTE = 'Phantom liquid stake (PSOL). About 6.0% APY as of 18 Aug 2026. Moves with the network.';
  const USDC_NOTE = 'Phantom does not publish a fixed USDC stake APY. Stake opens Phantom so you see their live Earn rate.';
  const PHANTOM_SOL = 'https://phantom.app/ul/browse/' + encodeURIComponent('https://help.phantom.com/hc/en-us/articles/41210373532307-Stake-SOL-with-Phantom-liquid-staking');
  const PHANTOM_USDC = 'https://phantom.app/ul/browse/' + encodeURIComponent('https://phantom.app');

  function addr() {
    return localStorage.getItem('cession_address') || '';
  }

  function needWallet() {
    if (addr()) return true;
    if (window.CessionUI && CessionUI.go) CessionUI.go('wallet');
    return false;
  }

  function addTab() {
    const header = document.querySelector('.cx-top');
    if (!header || document.getElementById('tabPredictions')) return;
    const b = document.createElement('button');
    b.id = 'tabPredictions';
    b.className = 'cx-xtab';
    b.type = 'button';
    b.textContent = 'Predictions';
    b.onclick = function () {
      if (window.CessionUI) CessionUI.go('predict');
    };
    const ai = document.getElementById('tabAi');
    if (ai) header.insertBefore(b, ai);
    else header.appendChild(b);
  }

  function addPredictView() {
    if (document.getElementById('viewPredict')) return;
    const app = document.querySelector('.cx-app');
    if (!app) return;
    const m = document.createElement('main');
    m.className = 'page-view';
    m.id = 'viewPredict';
    m.innerHTML = '<h1 class="cx-title">Predictions</h1><div class="cx-card"><p class="cx-muted">Predictions are not live.</p></div>';
    app.appendChild(m);
  }

  function footerLinks() {
    document.querySelectorAll('.cx-you-footer').forEach(function (f) {
      let row = f.querySelector('.cx-foot-links');
      if (!row) {
        row = f.querySelector('div:last-child');
      }
      if (!row || row.dataset.extra) return;
      row.dataset.extra = '1';
      row.innerHTML +=
        '<a href="javascript:CessionUI.importToken()">Import token</a>' +
        '<a href="javascript:CessionUI.importNft()">Import NFT</a>' +
        '<a href="javascript:CessionUI.openSupport()">Support</a>';
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
      '<div class="cx-card"><strong>SOL</strong><p class="cx-muted">' + SOL_NOTE +
      '</p><div class="cx-row"><span>APY</span><span>' + SOL_APY +
      '</span></div><button class="cx-launch" type="button" onclick="CessionUI.openPhantomStake(\'sol\')">Stake in Phantom</button></div>' +
      '<div class="cx-card"><strong>USDC</strong><p class="cx-muted">' + USDC_NOTE +
      '</p><div class="cx-row"><span>APY</span><span>In Phantom</span></div>' +
      '<button class="cx-launch" type="button" onclick="CessionUI.openPhantomStake(\'usdc\')">Stake in Phantom</button></div>';
  }

  function importPrompt(kind) {
    if (!needWallet()) return;
    const mint = window.prompt(kind === 'nft' ? 'NFT mint address' : 'Token mint address');
    if (!mint) return;
    const key = kind === 'nft' ? 'cession_nfts' : 'cession_tokens';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.push({ mint: mint.trim(), at: Date.now(), wallet: addr() });
    localStorage.setItem(key, JSON.stringify(list));
    alert((kind === 'nft' ? 'NFT' : 'Token') + ' saved to this wallet on Cession.');
  }

  function ready() {
    if (!window.CessionUI) return setTimeout(ready, 40);
    addTab();
    addPredictView();
    footerLinks();
    paintEarn();
    const ui = window.CessionUI;
    const prev = ui.go;
    ui.go = function (name) {
      if (name === 'predict') {
        document.querySelectorAll('.page-view').forEach(function (el) {
          const on = el.id === 'viewPredict';
          el.classList.toggle('active', on);
          el.style.display = on ? 'block' : 'none';
        });
        document.querySelectorAll('.cx-xtab').forEach(function (el) { el.classList.remove('on'); });
        const t = document.getElementById('tabPredictions');
        if (t) t.classList.add('on');
        return;
      }
      if (prev) prev(name);
      if (name === 'rewards') paintEarn();
    };
    ui.openPhantomStake = function (asset) {
      window.location.href = asset === 'usdc' ? PHANTOM_USDC : PHANTOM_SOL;
    };
    ui.importToken = function () { importPrompt('token'); };
    ui.importNft = function () { importPrompt('nft'); };
    ui.openSupport = function () {
      if (ui.openTicket) return ui.openTicket();
      window.location.href = '/legal#support';
    };
  }
  ready();
})();
