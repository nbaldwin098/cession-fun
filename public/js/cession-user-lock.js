(function () {
  function addr() {
    return localStorage.getItem('cession_address') || '';
  }
  function key(a) {
    return 'cession_username:' + String(a || addr());
  }
  function savedName(a) {
    return localStorage.getItem(key(a)) || '';
  }
  function saveName(a, name) {
    if (a && name) localStorage.setItem(key(a), name);
  }
  function ready() {
    if (!window.CessionUI) return setTimeout(ready, 40);
    const prev = window.CessionUI.lockUsername;
    window.CessionUI.lockUsername = async function () {
      const name = (document.getElementById('newUsername').value || '').trim();
      const a = addr();
      if (name.length >= 3) saveName(a, name);
      if (prev) await prev();
      const modal = document.getElementById('usernameModal');
      if (modal) { modal.style.display = 'none'; modal.classList.remove('open'); }
    };
    const nameEl = document.getElementById('profileName');
    const mine = savedName();
    if (nameEl && mine) nameEl.textContent = mine;
  }
  ready();
})();
