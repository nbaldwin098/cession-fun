(function () {
  var gateMode = 'sign';
  var codeOpen = false;

  function setGateViewport() {
    var h = window.visualViewport && window.visualViewport.height
      ? window.visualViewport.height
      : window.innerHeight;
    if (!h) return;
    document.documentElement.style.setProperty('--gate-vh', (h * 0.01) + 'px');
  }
  function hideToolbarTip() {
    var tip = document.getElementById('gateToolbarTip');
    if (!tip) return;
    tip.classList.remove('open');
  }
  function showToolbarTip() {
    var tip = document.getElementById('gateToolbarTip');
    if (!tip) return;
    if (localStorage.getItem('cession_toolbar_tip_seen') === '1') return;
    tip.classList.add('open');
    var dismiss = function () {
      localStorage.setItem('cession_toolbar_tip_seen', '1');
      hideToolbarTip();
    };
    var close = document.getElementById('gateToolbarTipClose');
    var ok = document.getElementById('gateToolbarTipOk');
    if (close) close.onclick = dismiss;
    if (ok) ok.onclick = dismiss;
  }
  function hideApp(on) {
    document.documentElement.classList.toggle('gated', on);
    document.body.classList.toggle('gated', on);
  }
  function goHome() {
    localStorage.setItem('cession_onboarded', '1');
    localStorage.setItem('cession_gate_ok', '1');
    var g = document.getElementById('cessionGate');
    if (g) g.classList.remove('open');
    hideApp(false);
    if (window.CessionExchange && typeof CessionExchange.go === 'function') {
      try { CessionExchange.go(); } catch (e) {}
    }
  }
  function already() { return localStorage.getItem('cession_onboarded') === '1'; }
  function gated() { return localStorage.getItem('cession_gate_ok') === '1'; }
  function savedUser() { return String(localStorage.getItem('cession_username') || '').trim(); }
  function savedWallet() {
    return String(
      localStorage.getItem('cession_address') ||
      localStorage.getItem('walletAddress') ||
      (window.walletEngine && (window.walletEngine.activeAddress || window.walletEngine.address)) ||
      ''
    ).trim();
  }
  function hasSession() {
    return Boolean(localStorage.getItem('cession_session'));
  }
  function isReturningUser() {
    if (savedWallet() && hasSession()) return true;
    return Boolean(already() && savedWallet() && (savedUser() || hasSession()));
  }

  function afterUnlock() {
    localStorage.setItem('cession_gate_ok', '1');
    if (isReturningUser()) {
      goHome();
      return;
    }
    if (gateMode === 'login') {
      step('wallet');
      return;
    }
    if (savedUser()) {
      step('secure');
      return;
    }
    step('user');
  }

  function step(name) {
    hideToolbarTip();
    var root = document.getElementById('gateFlow');
    if (!root) return;
    if (name === 'user') {
      if (savedUser()) { step('secure'); return; }
      root.innerHTML =
        '<div class="gate-on"><div class="gate-phone">' +
        '<img class="gate-k" src="brand/cession-c-mark.svg" alt="">' +
        '<h1>Pick a<br>username</h1>' +
        '<input id="gateUser" type="text" maxlength="20" placeholder="username" autocomplete="off">' +
        '<label class="gate-agree"><input id="gateAgree" type="checkbox"> Trading stats under this name can be public. I agree to the <a href="/legal" style="color:inherit;text-decoration:underline">terms</a>.</label>' +
        '<button class="gate-go" id="gateUserGo" type="button" disabled>Continue</button></div></div>';
      var u = document.getElementById('gateUser');
      var a = document.getElementById('gateAgree');
      var b = document.getElementById('gateUserGo');
      function chk() { b.disabled = !(u.value.trim().length >= 3 && a.checked); }
      u.oninput = chk;
      a.onchange = chk;
      b.onclick = function () {
        localStorage.setItem('cession_username', u.value.trim().toLowerCase());
        step('secure');
      };
    }
    if (name === 'secure') {
      root.innerHTML =
        '<div class="gate-on"><div class="gate-phone">' +
        '<img class="gate-k" src="brand/cession-c-mark.svg" alt="">' +
        '<h1>Almost there</h1>' +
        '<p>Next: connect the wallet you actually use. Biometrics live in your wallet app, not here.</p>' +
        '<button class="gate-go" type="button" id="gateSecGo">Continue</button></div></div>';
      document.getElementById('gateSecGo').onclick = function () { step('wallet'); };
    }
    if (name === 'wallet') {
      var title = gateMode === 'login' ? 'Connect your<br>wallet' : 'Connect a<br>wallet';
      var sub = gateMode === 'login'
        ? 'Same wallet you used before.'
        : 'Phantom, MetaMask, or Trust. One approval.';
      root.innerHTML =
        '<div class="gate-on"><div class="gate-phone">' +
        '<img class="gate-k" src="brand/cession-c-mark.svg" alt="">' +
        '<h1>' + title + '</h1>' +
        '<p>' + sub + '</p>' +
        '<button class="gate-go" type="button" id="gatePh">Connect Phantom</button>' +
        '<button class="gate-go ghost" type="button" id="gateMm">Connect MetaMask</button>' +
        '<button class="gate-go ghost" type="button" id="gateTw">Connect Trust Wallet</button>' +
        '</div></div>';
      function waitWalletThenHome(kind) {
        var tries = 0;
        var t = setInterval(function () {
          tries++;
          var a = (window.walletEngine && (window.walletEngine.activeAddress || window.walletEngine.address))
            || localStorage.getItem('cession_address') || '';
          if (a) {
            clearInterval(t);
            goHome();
            return;
          }
          if (tries > 60) clearInterval(t);
        }, 400);
        if (kind === 'phantom' && window.CessionUI && CessionUI.connectPhantom) CessionUI.connectPhantom();
        else if (kind === 'metamask' && window.CessionUI && CessionUI.connectMetaMask) CessionUI.connectMetaMask();
        else if (kind === 'trust' && window.CessionUI && CessionUI.connectTrust) CessionUI.connectTrust();
      }
      document.getElementById('gatePh').onclick = function () { waitWalletThenHome('phantom'); };
      document.getElementById('gateMm').onclick = function () { waitWalletThenHome('metamask'); };
      var tw = document.getElementById('gateTw');
      if (tw) tw.onclick = function () { waitWalletThenHome('trust'); };
    }
  }

  async function submitCode(input, err) {
    if (!input || !err) return;
    err.textContent = '';
    var code = String(input.value || '').trim();
    if (!code) {
      err.textContent = 'Enter your access code.';
      return;
    }
    try {
      var r = await fetch('/api/access/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ code: code })
      });
      var d = await r.json();
      if (!d.success) {
        err.textContent = d.error || 'Wrong code.';
        return;
      }
      localStorage.setItem('cession_gate_code', code.toUpperCase());
      afterUnlock();
    } catch (e) {
      err.textContent = 'Could not reach the gate.';
    }
  }

  function openCodeField(btn, wrap, input, err, label) {
    codeOpen = true;
    wrap.classList.add('on');
    btn.textContent = label || 'Login';
    input.placeholder = 'Enter your code';
    err.textContent = '';
    input.focus();
  }

  function land() {
    var g = document.getElementById('cessionGate');
    if (!g) {
      g = document.createElement('div');
      g.id = 'cessionGate';
      document.body.appendChild(g);
    }
    g.className = 'open';
    hideApp(true);
    codeOpen = false;
    g.innerHTML =
      '<button class="gate-login" type="button" id="gateLogin">Login</button>' +
      '<aside class="gate-toolbar-tip" id="gateToolbarTip" aria-live="polite">' +
      '<button class="gate-toolbar-tip-close" id="gateToolbarTipClose" type="button" aria-label="Close">×</button>' +
      '<strong>Hide your browser toolbar</strong>' +
      '<p>For full-screen view, hide the URL bar/toolbar on your phone browser.</p>' +
      '<button class="gate-toolbar-tip-ok" id="gateToolbarTipOk" type="button">Got it</button>' +
      '</aside>' +
      '<div id="gateFlow"><div class="gate-land"><div class="gate-col">' +
      '<img class="gate-k" src="brand/cession-c-white.svg" alt="">' +
      '<p class="gate-skip">Early access.</p>' +
      '<button class="gate-cta" type="button" id="gateSign">Get in</button>' +
      '<div class="gate-code" id="gateCodeWrap"><input id="gateCode" type="text" autocomplete="off" placeholder="Enter code"><div class="gate-err" id="gateErr"></div></div>' +
      '<div class="gate-hero">Built for people who actually trade</div>' +
      '<img class="gate-word" src="brand/cession-wordmark-white.svg" alt="Cession">' +
      '</div></div></div>';

    var btn = document.getElementById('gateSign');
    var wrap = document.getElementById('gateCodeWrap');
    var input = document.getElementById('gateCode');
    var err = document.getElementById('gateErr');

    btn.onclick = function () {
      if (!codeOpen) {
        gateMode = 'sign';
        openCodeField(btn, wrap, input, err, 'Enter Code');
        return;
      }
      submitCode(input, err);
    };

    document.getElementById('gateLogin').onclick = async function () {
      gateMode = 'login';
      if (isReturningUser()) {
        goHome();
        return;
      }
      if (codeOpen) {
        await submitCode(input, err);
        return;
      }
      try {
        var r = await fetch('/api/access/gate', { credentials: 'same-origin' });
        var d = await r.json();
        if (d.open) {
          afterUnlock();
          return;
        }
      } catch (e) {}
      openCodeField(btn, wrap, input, err, 'Login');
    };

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (codeOpen) submitCode(input, err);
        else btn.click();
      }
    });
    showToolbarTip();
  }

  async function boot() {
    if (savedWallet() && localStorage.getItem('cession_session')) {
      hideApp(false);
      var g0 = document.getElementById('cessionGate');
      if (g0) g0.classList.remove('open');
      return;
    }
    if (already() && gated() && savedWallet()) {
      hideApp(false);
      return;
    }
    if (isReturningUser() && gated()) {
      hideApp(false);
      return;
    }
    setGateViewport();
    window.addEventListener('resize', setGateViewport);
    window.addEventListener('orientationchange', setGateViewport);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', setGateViewport);
    land();
    try {
      var inside =
        (window.phantom && window.phantom.solana) ||
        (window.solana && window.solana.isPhantom) ||
        (window.ethereum && (window.ethereum.isMetaMask || window.ethereum.isTrust || window.ethereum.isTrustWallet));
      if (inside && !savedWallet()) {
        step('wallet');
      }
    } catch (e0) {}
    try {
      var ctrl = new AbortController();
      var t = setTimeout(function () { ctrl.abort(); }, 4000);
      var r = await fetch('/api/access/gate', { credentials: 'same-origin', signal: ctrl.signal });
      clearTimeout(t);
      var d = await r.json();
      if (d.open && (isReturningUser() || (savedWallet() && localStorage.getItem('cession_session')))) {
        goHome();
        return;
      }
      if (d.open && !already() && !savedUser() && !savedWallet()) step('user');
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
