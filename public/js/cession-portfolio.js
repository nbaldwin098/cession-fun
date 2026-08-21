(function () {
  var range = '7d';
  var points = [];

  function addr() {
    return (
      localStorage.getItem('cession_address') ||
      localStorage.getItem('walletAddress') ||
      (window.walletEngine && (window.walletEngine.activeAddress || window.walletEngine.address)) ||
      ''
    );
  }

  function fmtUsd(n) {
    var v = Number(n) || 0;
    return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function draw() {
    var canvas = document.getElementById('pfChart');
    if (!canvas) return;
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth || 320;
    var h = 160;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var data = points.length ? points : baseline();
    var vals = data.map(function (p) { return Number(p.v) || 0; });
    var min = Math.min.apply(null, vals);
    var max = Math.max.apply(null, vals);
    if (max === min) {
      max = min + 1;
      min = min - 1;
    }
    var pad = 8;
    var up = vals[vals.length - 1] >= vals[0];
    var stroke = up ? '#098458' : '#d12b4a';
    var fillTop = up ? 'rgba(9, 132, 88, 0.12)' : 'rgba(209, 43, 74, 0.10)';

    ctx.beginPath();
    data.forEach(function (p, i) {
      var x = pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
      var y = pad + (1 - (Number(p.v) - min) / (max - min)) * (h - pad * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.lineTo(w - pad, h - pad);
    ctx.lineTo(pad, h - pad);
    ctx.closePath();
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, fillTop);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fill();

    var first = vals[0];
    var last = vals[vals.length - 1];
    var delta = last - first;
    var pct = first ? (delta / Math.abs(first)) * 100 : 0;
    var valEl = document.getElementById('pfValue');
    var deltaEl = document.getElementById('pfDelta');
    if (valEl) valEl.textContent = fmtUsd(last);
    if (deltaEl) {
      deltaEl.className = 'cx-pf-delta ' + (delta >= 0 ? 'up' : 'down');
      var sign = delta >= 0 ? '+' : '';
      deltaEl.textContent = sign + fmtUsd(Math.abs(delta)).replace('$', '$') + ' (' + sign + pct.toFixed(2) + '%)';
      if (!points.length) deltaEl.textContent = 'No activity in this period yet';
    }
  }

  function baseline() {
    var n = 48;
    var out = [];
    for (var i = 0; i < n; i++) out.push({ t: i, v: 0 });
    return out;
  }

  async function load(r) {
    range = r || range;
    document.querySelectorAll('.cx-pf-ranges button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-range') === range);
    });
    var a = addr();
    if (!a) {
      points = [];
      draw();
      return;
    }
    try {
      var res = await fetch('/api/wallets/' + encodeURIComponent(a) + '/pnl?range=' + encodeURIComponent(range));
      var d = await res.json();
      points = (d && d.points) || [];
    } catch (e) {
      points = [];
    }
    draw();
  }

  function bind() {
    document.querySelectorAll('.cx-pf-ranges button').forEach(function (b) {
      b.addEventListener('click', function () {
        load(b.getAttribute('data-range'));
      });
    });
    window.addEventListener('resize', function () { draw(); });
    load(range);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();

  window.CessionPortfolio = { load: load, draw: draw, refresh: function () { return load(range); } };
})();
