(function () {
  var KEY = 'cession_buffer_on';
  var QUEUE_KEY = 'cession_buffer_queue';

  function minutes() {
    return Number(window.CESSION_BUFFER_MINUTES) || 15;
  }

  function enabled() {
    var el = document.getElementById('bufferToggle');
    if (el) return Boolean(el.checked);
    return localStorage.getItem(KEY) !== '0';
  }

  function setEnabled(on) {
    localStorage.setItem(KEY, on ? '1' : '0');
    ['bufferToggle', 'tradeBufferToggle', 'sendBufferToggle'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.checked = on;
    });
  }

  function loadQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch (e) { return []; }
  }

  function saveQueue(q) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  }

  function enqueue(intent) {
    var q = loadQueue();
    var item = {
      id: 'b_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      type: intent.type || 'send',
      amount: intent.amount || '',
      dest: intent.dest || '',
      symbol: intent.symbol || '',
      createdAt: Date.now(),
      releaseAt: Date.now() + minutes() * 60 * 1000,
      status: 'pending'
    };
    q.push(item);
    saveQueue(q);
    render();
    return item;
  }

  function cancel(id) {
    var q = loadQueue().map(function (x) {
      if (x.id === id && x.status === 'pending') x.status = 'cancelled';
      return x;
    });
    saveQueue(q);
    render();
  }

  function tick() {
    var now = Date.now();
    var q = loadQueue().map(function (x) {
      if (x.status === 'pending' && x.releaseAt <= now) x.status = 'released';
      return x;
    });
    saveQueue(q);
    render();
  }

  function render() {
    var box = document.getElementById('bufferQueue');
    if (!box) return;
    var q = loadQueue().filter(function (x) { return x.status === 'pending'; });
    if (!q.length) {
      box.innerHTML = '<p class="cx-muted">No buffered actions. Optional buffer holds a send or trade for ' + minutes() + ' minutes so you can cancel before it goes final.</p>';
      return;
    }
    box.innerHTML = q.map(function (x) {
      var left = Math.max(0, Math.ceil((x.releaseAt - Date.now()) / 1000));
      var m = Math.floor(left / 60);
      var s = left % 60;
      return '<div class="cx-row" style="align-items:flex-start;gap:8px;margin-bottom:8px">'
        + '<div style="flex:1"><strong>' + (x.type || 'action') + '</strong> '
        + (x.amount ? x.amount + ' ' : '') + (x.symbol || '') + '<br>'
        + '<span class="cx-muted">Releases in ' + m + 'm ' + s + 's · cancel any time before release</span></div>'
        + '<button class="cx-ghost" type="button" data-cancel="' + x.id + '">Cancel</button></div>';
    }).join('');
    box.querySelectorAll('[data-cancel]').forEach(function (btn) {
      btn.addEventListener('click', function () { cancel(btn.getAttribute('data-cancel')); });
    });
  }

  function bind() {
    var on = localStorage.getItem(KEY) !== '0';
    ['bufferToggle', 'tradeBufferToggle', 'sendBufferToggle'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.checked = on;
      el.addEventListener('change', function () { setEnabled(el.checked); });
    });
    render();
    setInterval(tick, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();

  window.CessionBuffer = {
    enabled: enabled,
    setEnabled: setEnabled,
    enqueue: enqueue,
    cancel: cancel,
    minutes: minutes,
    render: render
  };
})();
