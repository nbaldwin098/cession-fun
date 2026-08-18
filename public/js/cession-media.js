window.CessionMedia = {
  kind: function (url) {
    const u = String(url || '').trim();
    if (!u) return 'none';
    if (/\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u)) return 'video';
    if (/(youtube\.com\/watch|youtu\.be\/|youtube\.com\/embed\/)/i.test(u)) return 'youtube';
    if (/vimeo\.com\//i.test(u)) return 'vimeo';
    return 'image';
  },
  youtubeId: function (url) {
    const m = String(url || '').match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : '';
  },
  cardHtml: function (url, symbol) {
    const kind = this.kind(url);
    if (kind === 'video') {
      return '<video class="cx-media" data-symbol="' + symbol + '" src="' + url + '" muted playsinline loop autoplay preload="auto"></video>';
    }
    if (kind === 'youtube') {
      const id = this.youtubeId(url);
      return '<img class="cx-media" src="https://img.youtube.com/vi/' + id + '/hqdefault.jpg" alt="">';
    }
    if (kind === 'image') return '<img class="cx-media" src="' + url + '" alt="">';
    return '<div class="cx-media cx-media-empty"></div>';
  },
  pageHtml: function (url, symbol) {
    const kind = this.kind(url);
    if (kind === 'video') {
      return '<video class="cx-media-full" data-symbol="' + symbol + '" src="' + url + '" controls muted playsinline loop autoplay></video>';
    }
    if (kind === 'youtube') {
      const id = this.youtubeId(url);
      return '<iframe class="cx-media-full" src="https://www.youtube.com/embed/' + id + '?playsinline=1&loop=1&playlist=' + id + '&autoplay=1&mute=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>';
    }
    if (kind === 'image') return '<img class="cx-media-full" src="' + url + '" alt="">';
    return '';
  }
};
