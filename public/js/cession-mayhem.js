(function () {
  function ready() {
    if (!window.CessionUI) return setTimeout(ready, 40);
    const hdr = document.querySelector('.cx-top');
    if (hdr && !document.getElementById('tabMayhem')) {
      const b = document.createElement('button');
      b.className = 'cx-xtab';
      b.id = 'tabMayhem';
      b.type = 'button';
      b.textContent = 'Mayhem';
      b.onclick = function () { CessionUI.go('mayhem'); };
      const search = hdr.querySelector('.cx-search-btn');
      if (search) hdr.insertBefore(b, search);
      else hdr.appendChild(b);
    }
    var page = document.getElementById('viewMayhem');
    if (!page) {
      page = document.createElement('main');
      page.className = 'page-view';
      page.id = 'viewMayhem';
      var app = document.querySelector('.cx-app');
      if (app) app.appendChild(page);
    }
    page.innerHTML =
      '<p class="cx-muted">Agent offline</p>' +
      '<h1 class="cx-title">Mayhem Mode</h1>' +
      '<div class="cx-card">' +
      '<p>An agent trades your coin at launch to kickstart the tape.</p>' +
      '<p class="cx-muted">Auto: the agent buys and sells on its own for 24 hours. The more people trade, the more it trades.</p>' +
      '<p class="cx-muted">Manual: you trigger each agent fill. Size and side stay random.</p>' +
      '</div>' +
      '<div class="cx-card">' +
      '<div class="cx-row"><span>Active coins</span><span>0</span></div>' +
      '<div class="cx-row"><span>Agent 24h vol</span><span>0 SOL</span></div>' +
      '<div class="cx-row"><span>Coins created 24h</span><span>0</span></div>' +
      '<div class="cx-row"><span>Traders 24h</span><span>0</span></div>' +
      '</div>' +
      '<div class="cx-card">' +
      '<strong>How it works</strong>' +
      '<p class="cx-muted">Create with Mayhem on. Supply is 2B. 1B on the curve. 1B to the agent.</p>' +
      '<p class="cx-muted">The agent random-walks buy and sell for 24 hours. At most one fill per second. Leftover agent tokens burn.</p>' +
      '<p class="cx-muted">Activity is not guaranteed. The agent can buy or sell. This is not a return.</p>' +
      '</div>' +
      '<div class="cx-card">' +
      '<strong>Top Mayhem traders</strong>' +
      '<p class="cx-muted">No traders yet. Agent does not run until the program is live.</p>' +
      '</div>' +
      '<div class="cx-card">' +
      '<strong>Active coins</strong>' +
      '<p class="cx-muted">No Mayhem coins yet.</p>' +
      '<button class="cx-launch" type="button" onclick="CessionUI.openCreate()">Create your own</button>' +
      '</div>';
    var flag = document.getElementById('deployMayhem');
    if (flag && flag.closest('label')) flag.closest('label').remove();
    var prev = CessionUI.go;
    CessionUI.go = function (name) {
      if (name === 'mayhem') {
        document.querySelectorAll('.page-view').forEach(function (el) {
          var on = el.id === 'viewMayhem';
          el.classList.toggle('active', on);
          el.style.display = on ? 'block' : 'none';
        });
        document.querySelectorAll('.cx-xtab').forEach(function (el) { el.classList.remove('on'); });
        var t = document.getElementById('tabMayhem');
        if (t) t.classList.add('on');
        window.scrollTo(0, 0);
        return;
      }
      if (prev) prev(name);
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
