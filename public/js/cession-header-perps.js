(function () {
  function ready() {
    const header = document.querySelector('.cx-top');
    if (!header) return setTimeout(ready, 40);
    if (!document.getElementById('tabPerps')) {
      const b = document.createElement('button');
      b.id = 'tabPerps';
      b.className = 'cx-xtab';
      b.type = 'button';
      b.textContent = 'Perps';
      b.onclick = function () { if (window.CessionUI) CessionUI.go('perps'); };
      const ai = document.getElementById('tabAi');
      if (ai) header.insertBefore(b, ai);
      else header.appendChild(b);
    }
    if (localStorage.getItem('cession_username') || localStorage.getItem('cession_username:' + (localStorage.getItem('cession_address') || ''))) {
      document.body.classList.add('has-user');
      const hide = document.createElement('style');
      hide.textContent = 'body.has-user #usernameModal{display:none !important}';
      document.head.appendChild(hide);
    }
    var s = document.createElement('script');
    s.src = 'js/cession-header-perps.js';
  }
  ready();
})();
