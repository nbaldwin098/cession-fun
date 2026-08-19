(function () {
  const viewer = localStorage.getItem('cession_address') || localStorage.getItem('cession_viewer') || ('v_' + Math.random().toString(36).slice(2, 10));
  localStorage.setItem('cession_viewer', viewer);
  let lastHuman = 0;
  function markHuman() { lastHuman = Date.now(); }
  ['pointerdown', 'touchstart', 'keydown', 'scroll'].forEach(function (ev) {
    window.addEventListener(ev, markHuman, { passive: true });
  });
  function isHuman() {
    return document.hasFocus() && !document.hidden && (Date.now() - lastHuman) < 30000;
  }
  const seen = new WeakMap();
  function who() {
    return localStorage.getItem('cession_address') || localStorage.getItem('cession_viewer');
  }
  function emit(type, symbol, ms) {
    if (!symbol) return;
    fetch('/api/pulse/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: type,
        symbol: symbol,
        ms: ms || 0,
        human: isHuman(),
        address: localStorage.getItem('cession_address') || '',
        viewer: who()
      })
    }).catch(function () {});
  }
  function bindCard(el) {
    if (seen.has(el)) return;
    const symbol = el.getAttribute('data-symbol');
    if (!symbol) return;
    seen.set(el, 1);
    let entered = 0;
    const video = el.querySelector('video');
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          entered = Date.now();
          if (video) {
            video.muted = true;
            video.loop = true;
            video.play().catch(function () {});
          }
        } else if (entered) {
          const ms = Date.now() - entered;
          if (video) {
            video.pause();
            emit(ms < 3000 ? 'video_skip' : 'video_watch', symbol, ms);
          } else {
            emit(ms >= 1000 ? 'impression' : 'scroll_past', symbol, ms);
          }
          entered = 0;
        }
      });
    }, { threshold: [0.6] });
    io.observe(el);
    if (video) {
      video.loop = true;
      video.addEventListener('ended', function () {
        emit('video_complete', symbol, (video.duration || 0) * 1000);
        video.currentTime = 0;
        video.play().catch(function () {});
      });
      video.addEventListener('play', function () {
        if (!video._plays) video._plays = 0;
        video._plays += 1;
        if (video._plays > 1) emit('video_replay', symbol, 0);
      });
    }
  }
  function scan() {
    document.querySelectorAll('.cx-card-coin[data-symbol]').forEach(bindCard);
  }
  const mo = new MutationObserver(scan);
  mo.observe(document.body, { childList: true, subtree: true });
  scan();
  let dwellStart = 0;
  let dwellSymbol = '';
  window.CessionTrack = {
    emit: emit,
    viewer: who,
    open: function (symbol) {
      if (dwellSymbol && dwellStart) emit('dwell', dwellSymbol, Date.now() - dwellStart);
      dwellSymbol = symbol;
      dwellStart = Date.now();
      emit('open', symbol, 0);
    },
    leave: function () {
      if (!dwellSymbol || !dwellStart) return;
      const ms = Date.now() - dwellStart;
      emit(ms < 3000 ? 'bounce' : 'dwell', dwellSymbol, ms);
      dwellSymbol = '';
      dwellStart = 0;
    }
  };
  window.addEventListener('pagehide', function () { if (window.CessionTrack) CessionTrack.leave(); });
})();
