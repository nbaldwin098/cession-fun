(function () {
  const WORDS = 'able acid also area army away back ball band bank base beat been best bill blue boat body book born both burn call came card care case city cold come cook cool copy cost dark data date dead deal dear deep does done door down draw drop each east easy edge else even ever face fact fail fall farm fast fear feel fill find fire firm fish five flat flow food foot form full game gave gift girl give glad goes gold gone good gray grew grow hair half hall hand hang hard have head hear heat held help here high hold hole home hope hour huge idea into iron item join just keep kind knew know land last late lead left less life lift like line list live long look lost love made main make many mark mean meet mind miss moon more most move much must name near need news next nice nine none nose note once only open over page paid park part pass past plan play plus rain read real rest ride right ring rise road rock roll room rose rule safe said same save seat seem seen sell send ship shop show side sign site size snow soft some soon sort star stay step stop such sure take talk team tell than that them then they this thus tied time told took town tree true turn type unit upon used very wait walk wall want warm warn wear week well went were west what when whom wide wife wild will wind wine wing wish with wood word work year your zero zone'.split(' ');

  let seed = [];
  let quiz = [];

  function el(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.firstElementChild;
  }

  function hideApp(on) {
    document.documentElement.classList.toggle('gated', on);
    const app = document.querySelector('.cx-app');
    const top = document.querySelector('.cx-top');
    if (app) app.style.visibility = on ? 'hidden' : '';
    if (top) top.style.visibility = on ? 'hidden' : '';
  }

  function done() {
    localStorage.setItem('cession_onboarded', '1');
    seed = [];
    quiz = [];
    const g = document.getElementById('cessionGate');
    if (g) g.classList.remove('open');
    hideApp(false);
  }

  function already() {
    return localStorage.getItem('cession_onboarded') === '1';
  }

  function randWords() {
    const out = [];
    const buf = new Uint32Array(12);
    crypto.getRandomValues(buf);
    for (let i = 0; i < 12; i++) out.push(WORDS[buf[i] % WORDS.length]);
    return out;
  }

  function step(name) {
    const root = document.getElementById('gateFlow');
    if (!root) return;
    if (name === 'user') {
      root.innerHTML =
        '<div class="gate-on"><div class="gate-phone">' +
        '<img class="gate-k" src="brand/cession-c-mark.svg" alt="">' +
        '<h1>Claim your<br>username</h1>' +
        '<input id="gateUser" type="text" maxlength="20" placeholder="username" autocomplete="off">' +
        '<label class="gate-agree"><input id="gateAgree" type="checkbox"> I agree that my trading stats, including profits, open positions, payouts, and volume may be public with comments I make under this username. Username cannot be changed.</label>' +
        '<button class="gate-go" id="gateUserGo" type="button" disabled>Continue</button></div></div>';
      const u = document.getElementById('gateUser');
      const a = document.getElementById('gateAgree');
      const b = document.getElementById('gateUserGo');
      function chk() { b.disabled = !(u.value.trim().length >= 3 && a.checked); }
      u.oninput = chk; a.onchange = chk;
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
        '<p>Use this device. We do not hold keys. Biometrics stay in your wallet app.</p>' +
        '<button class="gate-go" type="button" id="gateSecGo">Continue</button></div></div>';
      document.getElementById('gateSecGo').onclick = function () { step('wallet'); };
    }
    if (name === 'wallet') {
      root.innerHTML =
        '<div class="gate-on"><div class="gate-phone">' +
        '<img class="gate-k" src="brand/cession-c-mark.svg" alt="">' +
        '<h1>Get approved to<br>start trading</h1>' +
        '<p>Link a wallet you already have, or write down a recovery phrase on this device only.</p>' +
        '<button class="gate-go" type="button" id="gateLink">Link Phantom or MetaMask</button>' +
        '<button class="gate-go ghost" type="button" id="gateMake">Create a phrase here</button></div></div>';
      document.getElementById('gateLink').onclick = function () {
        done();
        if (window.CessionUI && CessionUI.go) CessionUI.go('wallet');
      };
      document.getElementById('gateMake').onclick = function () { step('seed'); };
    }
    if (name === 'seed') {
      seed = randWords();
      root.innerHTML =
        '<div class="gate-on"><div class="gate-phone">' +
        '<h1>Write this down</h1>' +
        '<p class="gate-warn">Never share this. We do not save it. We cannot reset it. Screenshots are a risk.</p>' +
        '<div class="gate-words gate-seed" id="gateSeed">' +
        seed.map(function (w, i) { return '<span>' + (i + 1) + '. ' + w + '</span>'; }).join('') +
        '</div>' +
        '<button class="gate-go" type="button" id="gateWrote">I wrote it down</button></div></div>';
      document.addEventListener('visibilitychange', blurSeed);
      document.addEventListener('keyup', blockShot);
      document.getElementById('gateWrote').onclick = function () { step('quiz'); };
    }
    if (name === 'quiz') {
      const used = {};
      quiz = [];
      while (quiz.length < 3) {
        const i = Math.floor(Math.random() * 12);
        if (used[i]) continue;
        used[i] = 1;
        quiz.push(i);
      }
      root.innerHTML =
        '<div class="gate-on"><div class="gate-phone"><h1>Prove you have it</h1>' +
        quiz.map(function (i, n) {
          return '<p>Word ' + (i + 1) + '</p><input type="text" class="gateQ" data-i="' + i + '" autocomplete="off" autocapitalize="off">';
        }).join('') +
        '<p class="gate-err" id="gateQerr"></p>' +
        '<button class="gate-go" type="button" id="gateQuizGo">Continue</button></div></div>';
      document.getElementById('gateQuizGo').onclick = function () {
        const inputs = [].slice.call(document.querySelectorAll('.gateQ'));
        const ok = inputs.every(function (inp) {
          return String(inp.value || '').trim().toLowerCase() === seed[Number(inp.getAttribute('data-i'))];
        });
        if (!ok) {
          document.getElementById('gateQerr').textContent = 'That is not the phrase. Look at what you wrote.';
          return;
        }
        seed = [];
        done();
      };
    }
  }

  function blurSeed() {
    const box = document.getElementById('gateSeed');
    if (!box) return;
    box.classList.toggle('hide', document.hidden);
  }
  function blockShot(e) {
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      const box = document.getElementById('gateSeed');
      if (box) box.classList.add('hide');
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
      '<div id="gateFlow">' +
      '<div class="gate-land">' +
      '<img class="gate-k" src="brand/cession-c-white.svg" alt="">' +
      '<p class="gate-skip">Skip the line.</p>' +
      '<button class="gate-cta" type="button" id="gateSign">Sign up</button>' +
      '<div class="gate-code" id="gateCodeWrap"><input id="gateCode" type="text" inputmode="text" autocomplete="off" placeholder="Enter code"><div class="gate-err" id="gateErr"></div></div>' +
      '<div class="gate-hero">Early access to</div>' +
      '<img class="gate-word" src="brand/cession-wordmark-white.svg" alt="Cession">' +
      '</div></div>';
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
        if (!d.success) {
          err.textContent = d.error || 'Wrong code.';
          return;
        }
        sessionStorage.setItem('cession_gate', '1');
        step('user');
      } catch (e) {
        err.textContent = 'Could not reach the gate.';
      }
    };
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') btn.click();
    });
  }

  async function boot() {
    if (!document.getElementById('gateCss')) {
      const l = document.createElement('link');
      l.id = 'gateCss';
      l.rel = 'stylesheet';
      l.href = 'css/gate.css';
      document.head.appendChild(l);
    }
    if (already() && sessionStorage.getItem('cession_gate') === '1') return;
    try {
      const r = await fetch('/api/access/gate', { credentials: 'same-origin' });
      const d = await r.json();
      if (d.open && already()) return;
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
