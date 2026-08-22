(function () {
  'use strict';
  var KEY = 'cession_copilot_accepted_v1';

  function start() {
    var cb = document.getElementById('copilotAccept');
    if (!cb || !cb.checked) {
      alert('Please accept the terms to continue.');
      return;
    }
    localStorage.setItem(KEY, '1');
    showChat();
  }

  function showChat() {
    var gate = document.getElementById('copilotGate');
    var chat = document.getElementById('askAiBox');
    if (gate) gate.style.display = 'none';
    if (chat) {
      chat.style.display = 'flex';
      chat.classList.add('cx-chat-live');
    }
  }

  function ensure() {
    if (localStorage.getItem(KEY) === '1') showChat();
  }

  window.CessionCopilot = { start: start, ensure: ensure };
  document.addEventListener('DOMContentLoaded', ensure);
})();
