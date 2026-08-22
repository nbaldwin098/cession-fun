/**
 * BaaS surface — renders banking summary from /api/baas/summary
 * Looks like a real money app. All data is demo until partner is live.
 */
(function () {
  function $(id) { return document.getElementById(id); }

  function money(n) {
    return (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  async function load() {
    const hero = $('baasHero');
    const list = $('baasRecent');
    const cards = $('baasCards');
    if (!hero) return;

    try {
      const r = await fetch('/api/baas/summary');
      const d = await r.json();
      if (!d.ok) throw new Error('baas');

      const checking = d.accounts && d.accounts.checking ? d.accounts.checking.available : 0;
      const savings = d.accounts && d.accounts.savings ? d.accounts.savings.available : 0;

      hero.innerHTML =
        '<div class="cx-baas-sub">Available balance</div>' +
        '<div class="cx-baas-balance">' + money(checking) + '</div>' +
        '<div class="cx-baas-sub" style="margin-top:6px">Savings ' + money(savings) +
        (d.accounts.savings && d.accounts.savings.apyDisplay ? ' · ' + d.accounts.savings.apyDisplay + ' APY display' : '') +
        '</div>' +
        '<div class="cx-baas-row">' +
        '<button type="button" class="primary" onclick="CessionCaas && CessionCaas.openBuy()">Add money</button>' +
        '<button type="button" class="ghost" onclick="CessionPay && CessionPay.openSend()">Send</button>' +
        '</div>';

      if (cards && d.cards && d.cards[0]) {
        const c = d.cards[0];
        cards.innerHTML =
          '<div class="cx-card-debit">' +
          '<div class="chip"></div>' +
          '<div class="number">•••• •••• •••• ' + (c.last4 || '4242') + '</div>' +
          '<div class="meta"><span>' + (c.label || 'Cession Debit') + '</span><span>' + (c.network || 'Visa') + '</span></div>' +
          '</div>';
      }

      if (list && Array.isArray(d.recent)) {
        list.innerHTML = d.recent.map(function (tx) {
          return '<div class="cx-baas-item">' +
            '<div class="left"><span class="title">' + tx.title + '</span><span class="sub">' + tx.sub + ' · ' + tx.when + '</span></div>' +
            '<span class="amt ' + (tx.dir || '') + '">' + (tx.dir === 'up' ? '+' : '') + money(Math.abs(tx.amount)) + '</span>' +
            '</div>';
        }).join('');
      }

      const powered = $('baasPowered');
      if (powered) powered.textContent = d.disclosure || 'Banking services provided by licensed partner. Demo data shown.';
    } catch (e) {
      if (hero) hero.innerHTML = '<div class="cx-baas-sub">Banking</div><div class="cx-baas-balance">—</div><div class="cx-baas-sub">Connect partner to load live balances</div>';
    }
  }

  function go() {
    document.querySelectorAll('.page-view').forEach(function (el) { el.classList.remove('active'); });
    var v = document.getElementById('viewBanking');
    if (v) v.classList.add('active');
    document.querySelectorAll('.bottom-nav-slot').forEach(function (t) { t.classList.remove('active'); });
    var b = document.getElementById('bnavBanking');
    if (b) b.classList.add('active');
    document.querySelectorAll('.cx-xtab').forEach(function (t) { t.classList.remove('on'); });
    document.title = 'Banking | Cession';
    load();
  }

  window.CessionBaas = { go: go, load: load };
})();
