/**
 * Cession.fun — Master Application Orchestrator
 * Connects WebSockets for live ticks & candles, manages global toasts.
 */

window.showToast = function(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

class CessionApp {
  constructor() {
    this.ws = null;
    this.initWebSocket();
  }

  initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[Cession.fun WS] Connected to Sovereign Engine Gateway.');
      };

      this.ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          this.handleSocketMessage(msg);
        } catch (e) {
          console.warn('[Cession WS] JSON parse error:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[Cession WS] Error:', err);
      };

      this.ws.onclose = () => {
        console.log('[Cession WS] Disconnected. Reconnecting in 3s...');
        setTimeout(() => this.initWebSocket(), 3000);
      };
    } catch (err) {
      console.warn('[Cession WS] Failed to init WebSocket:', err);
    }
  }

  handleSocketMessage(msg) {
    if (msg.type === 'TICK') {
      const sym = msg.symbol;
      const price = parseFloat(msg.price);
      
      if (sym === 'SOL-USD') {
        const el = document.getElementById('ribbonSol');
        if (el) el.textContent = `$${price.toFixed(2)}`;
      } else if (sym === 'ETH-USD') {
        const el = document.getElementById('ribbonEth');
        if (el) el.textContent = `$${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      } else if (sym === 'BTC-USD') {
        const el = document.getElementById('ribbonBtc');
        if (el) el.textContent = `$${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      }
    }

    if (msg.type === 'CANDLE_UPDATE' && window.chartController) {
      if (msg.symbol === window.chartController.currentSymbol) {
        window.chartController.updateTick(msg.candle);
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.cessionApp = new CessionApp();
});
