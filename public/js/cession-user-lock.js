(function () {
  function addr() {
    return localStorage.getItem('cession_address') || '';
  }
  function key(a) {
    return 'cession_username:' + String(a || addr());
  }
  function savedName(a) {
    return localStorage.getItem(key(a)) || localStorage.getItem('cession_username') || '';
  }
  function saveName(a, name) {
    if (name) {
      localStorage.setItem('cession_username', name);
      if (a) localStorage.setItem(key(a), name);
    }
  }
  function closeUserModal() {
    const m = document.getElementById('usernameModal');
    if (!m) return;
    m.style.display = 'none';
    m.classList.remove('open');
  }
  function apply() {
    const name = savedName();
    const el = document.getElementById('profileName');
    if (el && name) el.textContent = name;
    if (name) closeUserModal();
  }
  function ready() {
    if (!window.CessionUI) return setTimeout(ready, 40);
    const prevLock = window.CessionUI.lockUsername;
    window.CessionUI.lockUsername = async function () {
      const name = (document.getElementById('newUsername').value || '').trim();
      saveName(addr(), name);
      apply();
      if (prevLock) await prevLock();
      apply();
    };
    const prevGo = window.CessionUI.go;
    window.CessionUI.go = function (name) {
      if (prevGo) prevGo(name);
      apply();
    };
    setInterval(apply, 800);
    apply();
  }
  ready();
})();
