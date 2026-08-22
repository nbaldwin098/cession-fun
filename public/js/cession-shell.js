(function(){
  // Load full shell from last known-good commit, then remap nav IDs to money-first layout.
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/nbaldwin098/cession-fun@641ef4a2a5104d4de18346185d1ef33a26cebbb3/public/js/cession-shell.js';
  s.onload = function () {
    function alias(fromId, toId) {
      var src = document.getElementById(fromId);
      var dst = document.getElementById(toId);
      if (!src || !dst) return;
      var obs = new MutationObserver(function () {
        if (src.classList.contains('active')) {
          document.querySelectorAll('.bottom-nav-slot').forEach(function (el) { el.classList.remove('active'); });
          dst.classList.add('active');
        }
      });
      obs.observe(src, { attributes: true, attributeFilter: ['class'] });
    }
    ['bnavForYou','bnavPulse','bnavExplore','bnavYou'].forEach(function (id) {
      if (!document.getElementById(id)) {
        var b = document.createElement('button');
        b.id = id;
        b.className = 'bottom-nav-slot';
        b.style.display = 'none';
        b.type = 'button';
        document.body.appendChild(b);
      }
    });
    alias('bnavForYou', 'bnavMint');
    alias('bnavPulse', 'bnavMint');
    alias('bnavExplore', 'bnavMint');
    alias('bnavYou', 'bnavAi');
  };
  document.head.appendChild(s);
})();
