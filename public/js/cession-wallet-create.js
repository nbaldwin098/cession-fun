(function () {
  let words = [];
  let seed = [];

  async function loadWords() {
    if (words.length === 2048) return words;
    const r = await fetch('https://raw.githubusercontent.com/bitcoin/bips/master/bip-0039/english.txt');
    const t = await r.text();
    words = t.split(/\n/).map(function (w) { return w.trim(); }).filter(Boolean);
    if (words.length !== 2048) throw new Error('Word list failed');
    return words;
  }

  async function make12() {
    const list = await loadWords();
    const ent = new Uint8Array(16);
    crypto.getRandomValues(ent);
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', ent));
    let bits = '';
    for (let i = 0; i < ent.length; i++) bits += ent[i].toString(2).padStart(8, '0');
    bits += hash[0].toString(2).padStart(8, '0').slice(0, 4);
    const out = [];
    for (let i = 0; i < 12; i++) {
      out.push(list[parseInt(bits.slice(i * 11, i * 11 + 11), 2)]);
    }
    return out;
  }

  function root() {
    return document.getElementById('gateFlow');
  }

  function wipe() {
    seed = [];
  }

  function showSeed(list) {
    seed = list;
    const el = root();
    if (!el) return;
    el.innerHTML =
      '<div class="gate-on"><div class="gate-phone">' +
      '<h1>Write this down</h1>' +
      '<p class="gate-warn">Official BIP-39. 2048 words. Checksum included. We do not save this. We cannot reset it. Import it into Phantom or MetaMask, then connect.</p>' +
      '<div class="gate-words gate-seed" id="gateSeed">' +
      seed.map(function (w, i) { return '<span>' + (i + 1) + '. ' + w + '</span>'; }).join('') +
      '</div>' +
      '<button class="gate-go" type="button" id="gateWrote">I wrote it down</button></div></div>';
    document.getElementById('gateWrote').onclick = quiz;
  }

  function quiz() {
    const used = {};
    const q = [];
    while (q.length < 3) {
      const i = Math.floor(Math.random() * 12);
      if (used[i]) continue;
      used[i] = 1;
      q.push(i);
    }
    const el = root();
    el.innerHTML =
      '<div class="gate-on"><div class="gate-phone"><h1>Prove you have it</h1>' +
      q.map(function (i) {
        return '<p>Word ' + (i + 1) + '</p><input type="text" class="gateQ" data-i="' + i + '" autocomplete="off" autocapitalize="off">';
      }).join('') +
      '<p class="gate-err" id="gateQerr"></p>' +
      '<button class="gate-go" type="button" id="gateQuizGo">Continue</button></div></div>';
    document.getElementById('gateQuizGo').onclick = function () {
      const ok = [].every.call(document.querySelectorAll('.gateQ'), function (inp) {
        return String(inp.value || '').trim().toLowerCase() === seed[Number(inp.getAttribute('data-i'))];
      });
      if (!ok) {
        document.getElementById('gateQerr').textContent = 'That is not the phrase.';
        return;
      }
      wipe();
      const box = root();
      box.innerHTML =
        '<div class="gate-on"><div class="gate-phone">' +
        '<h1>Import, then connect</h1>' +
        '<p>Open Phantom or MetaMask. Import the 12 words. Then come back and connect. The phrase is gone from this site.</p>' +
        '<button class="gate-go" type="button" id="gatePh2">Connect Phantom</button>' +
        '<button class="gate-go ghost" type="button" id="gateMm2">Connect MetaMask</button></div></div>';
      document.getElementById('gatePh2').onclick = function () {
        localStorage.setItem('cession_onboarded', '1');
        localStorage.setItem('cession_gate_ok', '1');
        document.getElementById('cessionGate').classList.remove('open');
        if (window.CessionUI && CessionUI.connectPhantom) CessionUI.connectPhantom();
      };
      document.getElementById('gateMm2').onclick = function () {
        localStorage.setItem('cession_onboarded', '1');
        localStorage.setItem('cession_gate_ok', '1');
        document.getElementById('cessionGate').classList.remove('open');
        if (window.CessionUI && CessionUI.connectMetaMask) CessionUI.connectMetaMask();
      };
    };
  }

  window.CessionWalletCreate = {
    start: async function () {
      const el = root();
      if (el) el.innerHTML = '<div class="gate-on"><div class="gate-phone"><p>Making a real 12-word phrase…</p></div></div>';
      try {
        showSeed(await make12());
      } catch (e) {
        if (el) el.innerHTML = '<div class="gate-on"><div class="gate-phone"><p>Could not load the official word list. Use Phantom or MetaMask to create a wallet.</p></div></div>';
      }
    }
  };
})();
