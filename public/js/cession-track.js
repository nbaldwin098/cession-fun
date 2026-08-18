(function () {
  const viewer = localStorage.getItem('cession_address') || ('v_' + Math.random().toString(36).slice(2, 10));
  if (!localStorage.getItem('cession_viewer')) localStorage.setItem('cession_viewer', viewer);
  const who = localStorage.getItem('cession_viewer');
  const seen = new WeakMap();
  function emit(type, symbol, ms) {
    if (!symbol) return;
    fetch('/api/pulse/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: type,
        symbol: symbol,
        ms: ms || 0,
        address: localStorage.getItem('cession_address') || '',
        viewer: who
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
      video.addEventListener('ended', function () { emit('video_complete', symbol, (video.duration || 0) * 1000); });
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
