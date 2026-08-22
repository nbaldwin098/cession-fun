/**
 * Fuse — optional agent toggle on coin create only.
 * NOT a nav page. 24h agent, extra 1B supply, leftover burns.
 */
(function () {
  'use strict';

  function enhanceCreateForm() {
    var buy = document.getElementById('deployFirstBuy');
    if (buy) {
      buy.min = '0.06';
      if (!buy.value || Number(buy.value) < 0.06) buy.value = '0.06';
    }
    if (!document.getElementById('deployFuse')) {
      var form = document.getElementById('deployCoinForm');
      if (form) {
        var label = document.createElement('label');
        label.className = 'cx-muted';
        label.innerHTML =
          '<input type="checkbox" id="deployFuse" checked> Fuse agent on create (2B supply, 24h, unused burns). Min first buy 0.06 SOL.';
        var mode = document.createElement('select');
        mode.className = 'form-input-pump';
        mode.id = 'deployFuseMode';
        mode.innerHTML = '<option value="auto">Auto</option><option value="manual">Manual</option>';
        var submit = form.querySelector('button[type="submit"]');
        if (submit) {
          form.insertBefore(label, submit);
          form.insertBefore(mode, submit);
        } else {
          form.appendChild(label);
          form.appendChild(mode);
        }
      }
    }
    var tab = document.getElementById('tabFuse');
    if (tab && tab.parentNode) tab.parentNode.removeChild(tab);
    var vf = document.getElementById('viewFuse');
    if (vf) {
      vf.style.display = 'none';
      vf.classList.remove('active');
    }
  }

  document.addEventListener('DOMContentLoaded', enhanceCreateForm);
  setTimeout(enhanceCreateForm, 500);
  setTimeout(enhanceCreateForm, 1500);

  window.CessionFuse = {
    enhance: enhanceCreateForm,
    show: function () {
      if (window.CessionUI && CessionUI.openCreate) CessionUI.openCreate();
      else {
        var m = document.getElementById('deployModal');
        if (m) m.classList.add('open');
      }
    }
  };
})();
