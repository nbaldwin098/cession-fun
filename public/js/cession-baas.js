/**
 * Banking surface — coming soon overlay + waitlist request.
 */
(function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function wallet() {
    var w = window.walletEngine;
    return (
      (w && (w.activeAddress || w.address)) ||
      localStorage.getItem('cession_address') ||
      ''
    ).trim();
  }

  function hideAllViews() {
    document.querySelectorAll('.page-view').forEach(function (el) {
      el.classList.remove('active');
      el.style.display = 'none';
    });
  }

  function setNav() {
    document.querySelectorAll('.bottom-nav-slot').forEach(function (t) {
      t.classList.remove('active');
    });
    var b = $('bnavBanking');
    if (b) b.classList.add('active');
    document.title = 'Banking | Cession';
  }

  async function submitWaitlist(e) {
    if (e) e.preventDefault();
    var email = ($('baasWaitEmail') && $('baasWaitEmail').value) || '';
    var note = ($('baasWaitNote') && $('baasWaitNote').value) || '';
    var msg = $('baasWaitMsg');
    var btn = $('baasWaitBtn');
    if (btn) btn.disabled = true;
    try {
      var r = await fetch('/api/waitlist/banking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: email, wallet: wallet(), note: note })
      });
      var d = await r.json();
      if (msg) {
        msg.textContent = d.message || (d.ok ? 'Saved.' : d.error || 'Could not save');
        msg.style.color = d.ok ? '#0a7a3e' : '#b42318';
      }
      if (d.ok && $('baasWaitEmail')) $('baasWaitEmail').value = '';
    } catch (err) {
      if (msg) {
        msg.textContent = 'Network error — try again';
        msg.style.color = '#b42318';
      }
    }
    if (btn) btn.disabled = false;
  }

  function load() {
    var form = $('baasWaitForm');
    if (form && !form._bound) {
      form._bound = true;
      form.addEventListener('submit', submitWaitlist);
    }
    var soon = $('baasComingSoon');
    var live = $('baasLiveDash');
    if (soon) soon.style.display = 'block';
    if (live) live.style.display = 'none';
  }

  function go() {
    try {
      hideAllViews();
      setNav();
      var v = $('viewBanking');
      if (v) {
        v.classList.add('active');
        v.style.setProperty('display', 'block', 'important');
      }
      load();
      try {
        window.scrollTo(0, 0);
      } catch (e) {}
    } catch (err) {
      console.error('[CessionBaas]', err);
    }
  }

  window.CessionBaas = { go: go, load: load, refresh: load };

  document.addEventListener(
    'click',
    function (e) {
      var t = e.target;
      if (!t) return;
      var hit = t.closest ? t.closest('#bnavBanking, #tabBanking, [data-nav="banking"]') : null;
      if (!hit && t.closest) hit = t.closest('#bnavBanking');
      if (hit) {
        e.preventDefault();
        e.stopPropagation();
        go();
      }
    },
    true
  );
})();
