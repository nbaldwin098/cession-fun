/**
 * Banking (BaaS) surface — full customer dashboard.
 * Never invent money: show API zeros or $0.
 */
(function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function money(n) {
    return (Number(n) || 0).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  }

  function wallet() {
    var w = window.walletEngine;
    return (
      (w && (w.activeAddress || w.address)) ||
      localStorage.getItem('cession_address') ||
      ''
    ).trim();
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"');
  }

  async function api(path, opts) {
    var w = wallet();
    var headers = Object.assign(
      { Accept: 'application/json' },
      opts && opts.headers
    );
    if (w) headers['x-cession-wallet'] = w;
    if (opts && opts.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    var url = path;
    if (w && path.indexOf('wallet=') < 0) {
      url += (path.indexOf('?') >= 0 ? '&' : '?') + 'wallet=' + encodeURIComponent(w);
    }
    var r = await fetch(url, {
      method: (opts && opts.method) || 'GET',
      headers: headers,
      body: opts && opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin'
    });
    var d = await r.json().catch(function () {
      return { ok: false, error: 'Invalid response' };
    });
    if (!r.ok && d.ok !== false) d.ok = false;
    return d;
  }

  async function load() {
    var hero = $('baasHero');
    var cards = $('baasCards');
    var list = $('baasRecent');
    var cash = $('baasCashback');
    var give = $('baasGiveback');
    var savings = $('baasSavings');
    var family = $('baasFamily');
    var powered = $('baasPowered');
    var status = $('baasWalletStatus');

    var w = wallet();
    if (status) {
      status.innerHTML = w
        ? '<span class="cx-baas-ok">Connected</span> · ' + esc(w.slice(0, 6) + '…' + w.slice(-4))
        : '<span class="cx-baas-warn">Connect Phantom, MetaMask, or Trust Wallet</span>';
    }

    if (!hero) return;

    try {
      var d = await api('/api/baas/summary');
      if (!d.ok) throw new Error(d.error || 'baas');

      var checking = d.accounts && d.accounts.checking ? d.accounts.checking.available : 0;
      var sav = d.accounts && d.accounts.savings ? d.accounts.savings.available : 0;
      var apy =
        d.accounts && d.accounts.savings && d.accounts.savings.apyDisplay
          ? d.accounts.savings.apyDisplay
          : '—';
      var cbMonth = d.cashback ? d.cashback.thisMonth : 0;
      var cbLife = d.cashback ? d.cashback.lifetime : 0;
      var cbRate = d.cashback ? d.cashback.rateDisplay : '1.5%';

      var zeroBanner =
        d.demo || d.source === 'none'
          ? '<div class="cx-baas-sub" style="color:#b45309;margin-bottom:8px">Partner not connected · showing $0 (no invented money)</div>'
          : '';

      hero.innerHTML =
        zeroBanner +
        '<div class="cx-baas-sub">Checking · available</div>' +
        '<div class="cx-baas-balance">' +
        money(checking) +
        '</div>' +
        '<div class="cx-baas-sub" style="margin-top:8px">Savings ' +
        money(sav) +
        ' · ' +
        esc(apy) +
        ' APY display</div>' +
        '<div class="cx-baas-row">' +
        '<button type="button" class="primary" id="baasBtnDeposit">Deposit</button>' +
        '<button type="button" class="ghost" id="baasBtnWithdraw">Withdraw</button>' +
        '<button type="button" class="ghost" id="baasBtnBuy">Buy crypto</button>' +
        '</div>';

      var dep = $('baasBtnDeposit');
      var wit = $('baasBtnWithdraw');
      var buy = $('baasBtnBuy');
      if (dep)
        dep.onclick = function () {
          openTransfer('deposit');
        };
      if (wit)
        wit.onclick = function () {
          openTransfer('withdraw');
        };
      if (buy)
        buy.onclick = function () {
          if (window.CessionCaas && CessionCaas.openBuy) CessionCaas.openBuy();
        };

      if (cards) {
        if (d.cards && d.cards.length) {
          cards.innerHTML = d.cards
            .map(function (c) {
              return (
                '<div class="cx-card-debit">' +
                '<div class="chip"></div>' +
                '<div class="number">•••• •••• •••• ' +
                esc(c.last4 || '••••') +
                '</div>' +
                '<div class="meta"><span>' +
                esc(c.label || 'Cession Debit') +
                '</span><span>' +
                esc(c.network || '') +
                ' · ' +
                esc(c.status || '') +
                '</span></div>' +
                '<button type="button" class="cx-card-freeze" data-card="' +
                esc(c.id) +
                '">Freeze</button>' +
                '</div>'
              );
            })
            .join('');
          cards.querySelectorAll('.cx-card-freeze').forEach(function (btn) {
            btn.onclick = function () {
              freezeCard(btn.getAttribute('data-card'));
            };
          });
        } else {
          cards.innerHTML =
            '<p class="cx-muted">No card issued. Partner issues cards when live — nothing shown until then.</p>';
        }
      }

      if (list) {
        var recent = d.recent || [];
        list.innerHTML = recent.length
          ? recent
              .map(function (tx) {
                var dir = tx.dir === 'up' ? 'up' : 'down';
                var amt = Number(tx.amount) || 0;
                return (
                  '<div class="cx-baas-item">' +
                  '<div class="left"><span class="title">' +
                  esc(tx.title) +
                  '</span><span class="sub">' +
                  esc(tx.sub) +
                  ' · ' +
                  esc(tx.when) +
                  '</span></div>' +
                  '<div class="amt ' +
                  dir +
                  '">' +
                  (dir === 'up' ? '+' : '') +
                  money(Math.abs(amt)) +
                  '</div></div>'
                );
              })
              .join('')
          : '<p class="cx-muted">No activity yet.</p>';
      }

      if (cash) {
        cash.innerHTML =
          '<div class="cx-baas-stat"><span class="k">This month</span><span class="v">' +
          money(cbMonth) +
          '</span></div>' +
          '<div class="cx-baas-stat"><span class="k">Lifetime</span><span class="v">' +
          money(cbLife) +
          '</span></div>' +
          '<div class="cx-baas-stat"><span class="k">Rate</span><span class="v">' +
          esc(cbRate) +
          '</span></div>';
      }

      if (give && d.giveback) {
        var gb = d.giveback;
        give.innerHTML =
          '<p class="cx-muted">Daily micro SOL give-back · ' +
          esc(String(gb.dailyAmountSol || 0.001)) +
          ' SOL (entitlement only until treasury is funded)</p>' +
          (gb.claimedToday
            ? '<p class="cx-baas-ok">Claimed for ' + esc(gb.day) + '</p>'
            : '<button type="button" class="cx-launch" id="baasClaimGb">Claim today</button>');
        var cg = $('baasClaimGb');
        if (cg) cg.onclick = claimGiveback;
      }

      if (savings) {
        savings.innerHTML =
          '<div class="cx-baas-stat"><span class="k">Balance</span><span class="v">' +
          money(sav) +
          '</span></div>' +
          '<div class="cx-baas-stat"><span class="k">APY display</span><span class="v">' +
          esc(apy) +
          '</span></div>' +
          '<p class="cx-muted" style="margin-top:8px">Savings rates shown by partner bank. Not a Cession deposit product.</p>';
      }

      if (family && d.family) {
        family.innerHTML =
          '<p class="cx-muted">' +
          esc(d.family.note || 'Family accounts available with live partner.') +
          '</p>' +
          '<div class="cx-baas-stat"><span class="k">Parent</span><span class="v">' +
          esc(String(d.family.parentAccounts || 0)) +
          '</span></div>' +
          '<div class="cx-baas-stat"><span class="k">Kids</span><span class="v">' +
          esc(String(d.family.kidAccounts || 0)) +
          '</span></div>';
      }

      if (powered) {
        powered.textContent =
          (d.disclosure ||
            'Banking services provided by a licensed BaaS partner. Cession does not hold customer funds.') +
          (d.demo || d.source === 'none'
            ? ' · Showing $0 until partner API keys are connected.'
            : ' · Live partner mode.');
      }
    } catch (e) {
      hero.innerHTML =
        '<div class="cx-baas-sub">Banking</div>' +
        '<div class="cx-baas-balance">$0.00</div>' +
        '<div class="cx-baas-sub">Could not load. Check connection and try again.</div>' +
        '<div class="cx-baas-row"><button type="button" class="primary" id="baasRetry">Retry</button></div>';
      var retry = $('baasRetry');
      if (retry) retry.onclick = load;
    }
  }

  function requireWallet() {
    if (wallet()) return true;
    if (window.CessionUI && CessionUI.open) CessionUI.open('walletModal');
    else alert('Connect Phantom, MetaMask, or Trust Wallet first.');
    return false;
  }

  async function openTransfer(kind) {
    if (!requireWallet()) return;
    var amount = prompt(
      kind === 'deposit' ? 'Deposit amount (USD)' : 'Withdraw amount (USD)',
      '100'
    );
    if (amount == null) return;
    var n = Number(amount);
    if (!Number.isFinite(n) || n < 1) {
      alert('Enter a valid amount (min $1).');
      return;
    }
    var path = kind === 'deposit' ? '/api/baas/deposit' : '/api/baas/withdraw';
    var d = await api(path, {
      method: 'POST',
      body: { wallet: wallet(), amount: n }
    });
    alert(d.message || d.error || (d.ok ? 'Submitted' : 'Failed'));
    if (d.ok) load();
  }

  async function freezeCard(cardId) {
    if (!requireWallet()) return;
    if (!confirm('Freeze this card?')) return;
    var d = await api('/api/baas/cards/' + encodeURIComponent(cardId) + '/freeze', {
      method: 'POST',
      body: { wallet: wallet(), reason: 'user_request' }
    });
    alert(d.ok ? 'Card freeze requested.' : d.error || 'Failed');
    load();
  }

  async function claimGiveback() {
    if (!requireWallet()) return;
    var d = await api('/api/baas/giveback/claim', {
      method: 'POST',
      body: { wallet: wallet() }
    });
    alert(d.message || d.error || (d.ok ? 'Claimed' : 'Failed'));
    load();
  }

  function go() {
    try {
      document.querySelectorAll('.page-view').forEach(function (el) {
        el.classList.remove('active');
        el.style.setProperty('display', 'none', 'important');
      });
      var v = document.getElementById('viewBanking');
      if (!v) {
        console.error('[CessionBaas] viewBanking missing');
        return;
      }
      v.classList.add('active');
      v.style.setProperty('display', 'block', 'important');
      document.querySelectorAll('.bottom-nav-slot').forEach(function (t) {
        t.classList.remove('active');
      });
      var b = document.getElementById('bnavBanking');
      if (b) b.classList.add('active');
      document.title = 'Banking | Cession';
      load();
      try {
        window.scrollTo(0, 0);
      } catch (e) {}
    } catch (err) {
      console.error('[CessionBaas] go failed', err);
    }
  }

  window.CessionBaas = { go: go, load: load };

  function bindBankingClicks() {
    document.addEventListener(
      'click',
      function (e) {
        var t = e.target;
        if (!t) return;
        var hit = t.closest
          ? t.closest('#bnavBanking, #tabBanking, [data-nav="banking"]')
          : null;
        if (!hit && (t.id === 'bnavBanking' || t.id === 'tabBanking')) hit = t;
        if (!hit && t.closest) hit = t.closest('#bnavBanking');
        if (hit) {
          e.preventDefault();
          e.stopPropagation();
          go();
        }
      },
      true
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindBankingClicks);
  } else {
    bindBankingClicks();
  }
})();
