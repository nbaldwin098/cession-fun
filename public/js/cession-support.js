(function () {
  function ready() {
    if (!window.CessionUI) return setTimeout(ready, 40);
    const box = document.getElementById('walletScreenConnected');
    if (box && !document.getElementById('supportBtn')) {
      const b = document.createElement('button');
      b.id = 'supportBtn';
      b.className = 'cx-ghost';
      b.type = 'button';
      b.textContent = 'Support';
      b.onclick = window.CessionUI.openSupport;
      box.appendChild(b);
    }
    const disc = document.getElementById('walletScreenDisconnected');
    if (disc && !document.getElementById('supportBtnOut')) {
      const b = document.createElement('button');
      b.id = 'supportBtnOut';
      b.className = 'cx-ghost';
      b.type = 'button';
      b.textContent = 'Support';
      b.onclick = window.CessionUI.openSupport;
      disc.appendChild(b);
    }
    window.CessionUI.openSupport = function () {
      const msg = prompt('How can we help?');
      if (!msg) return;
      fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: localStorage.getItem('cession_address') || '',
          message: msg
        })
      }).then(function (r) { return r.json(); }).then(function (d) {
        alert(d.success ? ('Ticket ' + d.id) : (d.error || 'Could not send'));
      }).catch(function () { alert('Could not send'); });
    };
  }
  ready();
})();
