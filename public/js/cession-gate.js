(function () {
  function hideApp(on) {
    document.documentElement.classList.toggle('gated', on);
    document.body.classList.toggle('gated', on);
  }
  function done() {
    localStorage.setItem('cession_onboarded', '1');
    localStorage.setItem('cession_gate_ok', '1');
    const g = document.getElementById('cessionGate');
    if (g) g.classList.remove('open');
    hideApp(false);
  }
  function already() { return localStorage.getItem('cession_onboarded') === '1'; }
  function gated() { return localStorage.getItem('cession_gate_ok') === '1'; }
  function step(name) {
    const root = document.getElementById('gateFlow');
    if (!root) return;
    if (name === 'user') {
      root.innerHTML =
        '<div class="gate-on"><div class="gate-phone">' +
        '<img class="gate-k" src="brand/cession-c-mark.svg" alt="">' +
        '<h1>Claim your<br>username</h1>' +
        '<input id="gateUser" type="text" maxlength="20" placeholder="username" autocomplete="off">' +
        '<label class="gate-agree"><input id="gateAgree" type="checkbox"> I agree to the privacy policy and user agreement that my trading stats, including profits, open positions, payouts, and volume will be public alongside any comments or posts I make under my username.</label>' +
        '<button class="gate-go" id="gateUserGo" type="button" disabled>Continue</button></div></div>';
      const u = document.getElementById('gateUser');
      const a = document.getElementById('gateAgree');
      const b = document.getElementById('gateUserGo');
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
        '<h1>Secure your<br>account</h1>' +
        '<p>Set up biometric authentication in Phantom or MetaMask. We do not hold keys.</p>' +
        '<button class="gate-go" type="button" id="gateSecGo">Continue</button></div></div>';
      document.getElementById('gateSecGo').onclick = function () { step('wallet'); };
    }
    if (name === 'wallet') {
      root.innerHTML =
        '<div class="gate-on"><div class="gate-phone">' +
        '<img class="gate-k" src="brand/cession-c-mark.svg" alt="">' +
        '<h1>Get approved to<br>start trading</h1>' +
        '<p>You\'re almost there</p>' +
        '<button class="gate-go" type="button" id="gatePh">Connect Phantom</button>' +
        '<button class="gate-go ghost" type="button" id="gateMm">Connect MetaMask</button>' +
        '<button class="gate-go ghost" type="button" id="gateMake">Create a wallet</button></div></div>';
      document.getElementById('gatePh').onclick = function () {
        done();
        if (window.CessionUI && CessionUI.connectPhantom) CessionUI.connectPhantom();
      };
      document.getElementById('gateMm').onclick = function () {
        done();
        if (window.CessionUI && CessionUI.connectMetaMask) CessionUI.connectMetaMask();
      };
      document.getElementById('gateMake').onclick = function () {
        if (window.CessionWalletCreate) CessionWalletCreate.start();
      };
    }
  }
  function land() {
    let g = document.getElementById('cessionGate');
    if (!g) {
      g = document.createElement('div');
      g.id = 'cessionGate';
      document.body.appendChild(g);
    }
    g.className = 'open';
    hideApp(true);
    g.innerHTML =
      '<div id="gateFlow"><div class="gate-land"><div class="gate-col">' +
      '<img class="gate-k" src="brand/cession-c-white.svg" alt="">' +
      '<p class="gate-skip">Skip the line.</p>' +
      '<button class="gate-cta" type="button" id="gateSign">Sign up</button>' +
      '<div class="gate-code" id="gateCodeWrap"><input id="gateCode" type="text" autocomplete="off" placeholder="Enter code"><div class="gate-err" id="gateErr"></div></div>' +
      '<div class="gate-hero">Early access to</div>' +
      '<img class="gate-word" src="brand/cession-wordmark-white.svg" alt="Cession">' +
      '</div></div></div>';
    const btn = document.getElementById('gateSign');
    const wrap = document.getElementById('gateCodeWrap');
    const input = document.getElementById('gateCode');
    const err = document.getElementById('gateErr');
    let mode = 'sign';
    btn.onclick = async function () {
      if (mode === 'sign') {
        mode = 'code';
        btn.textContent = 'Enter Code';
        wrap.classList.add('on');
        input.focus();
        return;
      }
      err.textContent = '';
      try {
        const r = await fetch('/api/access/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ code: input.value })
        });
        const d = await r.json();
        if (!d.success) { err.textContent = d.error || 'Wrong code.'; return; }
        localStorage.setItem('cession_gate_ok', '1');
        step('user');
      } catch (e) { err.textContent = 'Could not reach the gate.'; }
    };
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') btn.click(); });
  }
  async function boot() {
    if (already() && gated()) return;
    hideApp(true);
    try {
      const r = await fetch('/api/access/gate', { credentials: 'same-origin' });
      const d = await r.json();
      if (d.open && already()) {
        localStorage.setItem('cession_gate_ok', '1');
        hideApp(false);
        return;
      }
      if (d.open && !already()) {
        land();
        step('user');
        return;
      }
    } catch (e) {}
    land();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
