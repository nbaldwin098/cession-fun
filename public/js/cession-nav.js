(function () {
  function showMint() {
    document.querySelectorAll('.page-view').forEach(function (el) {
      const on = el.id === 'viewMint';
      el.classList.toggle('active', on);
      el.style.display = on ? 'block' : 'none';
    });
  }
  function closeSearch() {
    const m = document.getElementById('searchModal');
    if (!m) return;
    m.style.display = 'none';
    m.classList.remove('open');
  }
  function shortMint(mint) {
    const value = String(mint || '');
    return value.length > 6 ? value.slice(0, 3) + '...' + value.slice(-3) : value;
  }
  function addX(box, fn) {
    if (!box || box.querySelector('.cx-x')) return;
    const x = document.createElement('button');
    x.className = 'cx-x';
    x.type = 'button';
    x.setAttribute('aria-label', 'Close');
    x.textContent = '\u00d7';
    x.onclick = fn;
    box.insertBefore(x, box.firstChild);
  }
  function centerSheet(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.add('cx-center-sheet');
    addX(m.querySelector('.modal-box-pump'), function () {
      m.style.display = 'none';
      m.classList.remove('open');
    });
  }
  function bindLogo(root) {
    const brand = root.querySelector('.cx-foot-brand');
    if (!brand || brand.dataset.bound) return;
    brand.dataset.bound = '1';
    brand.addEventListener('click', function () { brand.classList.toggle('open'); });
    brand.addEventListener('mouseenter', function () { brand.classList.add('open'); });
    brand.addEventListener('mouseleave', function () { brand.classList.remove('open'); });
  }
  function placeFooters() {
    const src = document.querySelector('#viewWallet .cx-you-footer');
    if (!src) return;
    ['viewMint', 'viewRewards'].forEach(function (id) {
      const page = document.getElementById(id);
      if (!page || page.querySelector('.cx-you-footer')) return;
      page.appendChild(src.cloneNode(true));
    });
    document.querySelectorAll('.cx-you-footer').forEach(bindLogo);
  }
  function ready() {
    if (!window.CessionUI) return setTimeout(ready, 40);
    const ui = window.CessionUI;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/nav-extra.css';
    document.head.appendChild(link);
    const hdr = document.querySelector('.cx-search-btn');
    if (hdr) hdr.style.display = 'none';
    if (!document.getElementById('floatSearch')) {
      const b = document.createElement('button');
      b.id = 'floatSearch';
      b.className = 'cx-float-search';
      b.type = 'button';
      b.setAttribute('aria-label', 'Search');
      b.style.cssText = 'background:transparent;border:0;-webkit-appearance:none;';
      b.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0c0c0c" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
      b.onclick = function () { ui.openSearch(); };
      document.body.appendChild(b);
    }
    centerSheet('settingsModal');
    centerSheet('statementModal');
    placeFooters();
    ui.openSearch = function () {
      const m = document.getElementById('searchModal');
      if (!m) return;
      const box = m.querySelector('.modal-box-pump');
      addX(box, closeSearch);
      if (box && !document.getElementById('searchHits')) {
        const hits = document.createElement('div');
        hits.id = 'searchHits';
        hits.className = 'cx-feed';
        box.appendChild(hits);
      }
      m.style.display = 'flex';
      m.classList.add('open');
      m.onclick = function (e) { if (e.target === m) closeSearch(); };
    };
    ui.searchLane = function (lane) {
      if (ui.setExploreLane) ui.setExploreLane(lane);
      fillHits(lane);
    };
    async function fillHits(lane) {
      const box = document.getElementById('searchHits');
      if (!box) return;
      try {
        const r = await fetch('/api/pulse?lane=' + encodeURIComponent(lane || 'best') + '&limit=20');
        const d = await r.json();
        const list = (d.feed || []).filter(function (c) {
          return String(c.mintAddress || c.mint || '').length >= 32;
        });
        box.innerHTML = list.length
          ? list.map(function (c) {
            const visuals = window.CessionCard ? CessionCard.visuals(c) : '';
            return '<div class="cx-card-coin"><div class="cx-media-empty"></div><div class="meta"><div class="name">' + (c.name || c.symbol) + '</div><div class="tick">' + c.symbol + '</div><div class="tick">' + shortMint(c.mintAddress || c.mint) + '</div></div>' + visuals + '</div>';
          }).join('')
          : '<div class="cx-empty"><p class="cx-muted">No live coins yet.</p></div>';
      } catch (e) {
        box.innerHTML = '<div class="cx-empty"><p class="cx-muted">No live coins yet.</p></div>';
      }
    }
    const prev = ui.go;
    ui.go = function (name) {
      if (name === 'mint') {
        showMint();
        loadMint();
        document.querySelectorAll('.cx-xtab').forEach(function (el) { el.classList.remove('on'); });
        const t = document.getElementById('tabMint');
        if (t) t.classList.add('on');
        return;
      }
      if (prev) prev(name);
      if (name === 'explore') loadExplore();
    };
    async function loadExplore() {
      const king = document.getElementById('kingBox');
      try {
        const r = await fetch('/api/tokens/king');
        const d = await r.json();
        const t = d.king || d.token;
        if (king) {
          king.innerHTML = t && t.symbol
            ? '<strong>King of the hill</strong><p>' + (t.name || t.symbol) + ' \u00b7 ' + t.symbol + '</p>'
            : '<strong>King of the hill</strong><p class="cx-muted">No live coin yet.</p>';
        }
      } catch (e) {
        if (king) king.innerHTML = '<strong>King of the hill</strong><p class="cx-muted">No live coin yet.</p>';
      }
    }
    async function loadMint() {
      const list = document.getElementById('mintManage');
      if (!list) return;
      const addr = localStorage.getItem('cession_address') || '';
      if (!addr) {
        list.innerHTML = '<p class="cx-muted">Connect a wallet to manage coins you minted.</p>';
        return;
      }
      try {
        const r = await fetch('/api/wallets/' + encodeURIComponent(addr) + '/profile');
        const d = await r.json();
        const created = d.created || [];
        list.innerHTML = created.length
          ? created.map(function (c) {
            return '<div class="cx-row"><span>' + (c.symbol || c) + '</span><span>Burn and fee claims after deploy.</span></div>';
          }).join('')
          : '<p class="cx-muted">You have not minted a coin yet.</p>';
      } catch (e) {
        list.innerHTML = '<p class="cx-muted">No coins to manage yet.</p>';
      }
    }
  }
  ready();
})();
