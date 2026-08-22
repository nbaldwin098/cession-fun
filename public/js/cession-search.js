/**
 * Header search — FAQ / help only. Market prices deferred.
 */
(function () {
  'use strict';

  var FAQ = [
    { q: 'How do I connect a wallet?', a: 'Open Wallet and choose Phantom, MetaMask, or Trust.' },
    { q: 'Is banking live?', a: 'Banking is coming soon. You can request early access on the Banking tab.' },
    { q: 'Where does crypto go when I buy?', a: 'To the wallet you connected. Cession does not hold your keys.' },
    { q: 'What is Xchange?', a: 'Create and trade community coins. Optional Fuse is on the create form.' },
    { q: 'What is Copilot?', a: 'In-app help. Accept terms first. Not financial advice.' },
    { q: 'Fees', a: 'Platform fees will be shown in each flow before you confirm.' },
    { q: 'Support', a: 'Use Support in the footer or email support@cession.us.' }
  ];

  function openModal() {
    var m = document.getElementById('searchModal');
    if (m) m.classList.add('open');
    render('');
    var inp = document.getElementById('searchInput');
    if (inp) {
      inp.value = '';
      setTimeout(function () { inp.focus(); }, 40);
    }
  }

  function closeModal() {
    var m = document.getElementById('searchModal');
    if (m) m.classList.remove('open');
  }

  function render(q) {
    var box = document.getElementById('searchResults');
    if (!box) return;
    q = (q || '').toLowerCase().trim();
    var html = '';
    FAQ.forEach(function (item) {
      if (q && item.q.toLowerCase().indexOf(q) < 0 && item.a.toLowerCase().indexOf(q) < 0) return;
      html +=
        '<div class="cx-search-row" style="flex-direction:column;align-items:flex-start;gap:4px">' +
        '<strong>' + item.q + '</strong>' +
        '<span class="cx-muted">' + item.a + '</span></div>';
    });
    box.innerHTML = html || '<p class="cx-muted" style="padding:12px">No matches</p>';
  }

  function bind() {
    var inp = document.getElementById('searchInput');
    if (inp && !inp._bound) {
      inp._bound = true;
      inp.addEventListener('input', function () { render(inp.value); });
    }
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.getAttribute && t.getAttribute('data-close-sheet') === 'searchModal') closeModal();
    });
  }

  window.CessionSearch = { open: openModal, close: closeModal, load: function () {}, refresh: function () {} };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
