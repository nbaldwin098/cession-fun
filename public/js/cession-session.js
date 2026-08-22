/**
 * Signed wallet session — one sign prompt, then done.
 */
(function () {
  'use strict';

  var TOKEN_KEY = 'cession_session';
  var ADDR_KEY = 'cession_address';
  var busy = false;

  function token() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function addr() {
    return (
      (window.walletEngine && (window.walletEngine.activeAddress || window.walletEngine.address)) ||
      localStorage.getItem(ADDR_KEY) ||
      ''
    );
  }

  function setToken(t) {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function authHeaders(extra) {
    var h = Object.assign(
      { Accept: 'application/json', 'Content-Type': 'application/json' },
      extra || {}
    );
    var t = token();
    if (t) h.Authorization = 'Bearer ' + t;
    var a = addr();
    if (a) h['X-Cession-Wallet'] = a;
    return h;
  }

  function isAuthed() {
    return Boolean(token() && addr());
  }

  function requireWallet() {
    if (!addr()) {
      if (window.CessionUI && CessionUI.open) CessionUI.open('walletModal');
      return false;
    }
    return true;
  }

  function requireSession() {
    if (!requireWallet()) return false;
    if (!token()) {
      establish().catch(function () {});
      return false;
    }
    return true;
  }

  async function signMessage(message, kind) {
    kind = kind || localStorage.getItem('cession_wallet_type') || 'phantom';
    if (kind === 'phantom' || kind === 'solana') {
      var provider =
        (window.phantom && window.phantom.solana) ||
        (window.solana && window.solana.isPhantom ? window.solana : null);
      if (provider && provider.signMessage) {
        var encoded = new TextEncoder().encode(message);
        var signed = await provider.signMessage(encoded, 'utf8');
        var sig = signed.signature || signed;
        if (sig instanceof Uint8Array) {
          return Array.from(sig)
            .map(function (b) {
              return ('0' + b.toString(16)).slice(-2);
            })
            .join('');
        }
        return String(sig);
      }
    }
    var eth = window.ethereum;
    if (eth) {
      if (eth.providers && eth.providers.length) {
        var prefer =
          kind === 'trust'
            ? eth.providers.find(function (p) {
                return p.isTrust || p.isTrustWallet;
              })
            : eth.providers.find(function (p) {
                return p.isMetaMask && !p.isTrust;
              });
        if (prefer) eth = prefer;
      }
      var accounts = await eth.request({ method: 'eth_requestAccounts' });
      var from = (accounts && accounts[0]) || addr();
      return await eth.request({
        method: 'personal_sign',
        params: [message, from]
      });
    }
    throw new Error('No signer available');
  }

  async function establish(forceKind) {
    var a = addr();
    if (!a) return { ok: false, error: 'no wallet' };
    if (token()) return { ok: true };
    if (busy) return { ok: false, error: 'busy' };
    busy = true;
    try {
      var nr = await fetch('/api/auth/nonce?address=' + encodeURIComponent(a));
      var nd = await nr.json();
      if (!nd.success || !nd.message) throw new Error(nd.error || 'nonce failed');
      var kind = forceKind || localStorage.getItem('cession_wallet_type') || 'phantom';
      var chain = kind === 'metamask' || kind === 'trust' ? 'Ethereum' : 'Solana';
      var signature = await signMessage(nd.message, kind);
      if (!signature) throw new Error('Sign rejected');
      var lr = await fetch('/api/auth/wallet-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: a,
          chain: chain,
          walletType: kind,
          message: nd.message,
          signature: signature
        })
      });
      var ld = await lr.json();
      if (!ld.success || !ld.token) throw new Error(ld.error || 'login failed');
      setToken(ld.token);
      if (ld.user && ld.user.username) {
        localStorage.setItem('cession_username', ld.user.username);
      }
      busy = false;
      return { ok: true, user: ld.user };
    } catch (e) {
      busy = false;
      console.warn('[session]', e && e.message);
      return { ok: false, error: (e && e.message) || 'sign-in failed' };
    }
  }

  async function validate() {
    var t = token();
    if (!t) return false;
    try {
      var r = await fetch('/api/auth/session', {
        headers: { Authorization: 'Bearer ' + t }
      });
      var d = await r.json();
      if (!d.authenticated) {
        setToken('');
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  async function logout() {
    var t = token();
    try {
      if (t) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
          body: '{}'
        });
      }
    } catch (e) {}
    setToken('');
    localStorage.removeItem(ADDR_KEY);
    localStorage.removeItem('cession_wallet_type');
    localStorage.removeItem('walletAddress');
    if (window.walletEngine && window.walletEngine.logout) window.walletEngine.logout();
  }

  function maybeEstablish() {
    if (!addr() || token() || busy) return;
    establish();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (addr() && token()) validate();
  });

  function patchMoneyGates() {
    if (window.CessionCaas && CessionCaas.openBuy && !CessionCaas._sessPatched) {
      CessionCaas._sessPatched = true;
      var prev = CessionCaas.openBuy;
      CessionCaas.openBuy = function () {
        if (!requireSession()) return;
        return prev.apply(CessionCaas, arguments);
      };
      if (CessionCaas.confirmBuy) {
        var prevC = CessionCaas.confirmBuy;
        CessionCaas.confirmBuy = function () {
          if (!requireSession()) return;
          return prevC.apply(CessionCaas, arguments);
        };
      }
    }
    if (window.CessionXchange && CessionXchange.create && !CessionXchange._sessPatched) {
      CessionXchange._sessPatched = true;
      var prevX = CessionXchange.create;
      CessionXchange.create = function () {
        if (!requireSession()) return;
        return prevX.apply(CessionXchange, arguments);
      };
    }
    if (window.CessionPay && CessionPay.openSend && !CessionPay._sessPatched) {
      CessionPay._sessPatched = true;
      var prevS = CessionPay.openSend;
      CessionPay.openSend = function () {
        if (!requireWallet()) return;
        return prevS.apply(CessionPay, arguments);
      };
      if (CessionPay.confirmSend) {
        var prevCS = CessionPay.confirmSend;
        CessionPay.confirmSend = function () {
          if (!requireSession()) return;
          return prevCS.apply(CessionPay, arguments);
        };
      }
    }
  }

  var n = 0;
  var iv = setInterval(function () {
    patchMoneyGates();
    if (++n > 20) clearInterval(iv);
  }, 250);

  window.CessionSession = {
    token: token,
    setToken: setToken,
    authHeaders: authHeaders,
    isAuthed: isAuthed,
    requireWallet: requireWallet,
    requireSession: requireSession,
    establish: establish,
    validate: validate,
    logout: logout,
    maybeEstablish: maybeEstablish
  };
})();
