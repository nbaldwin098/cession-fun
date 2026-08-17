/**
 * Calabi Pro Trading Terminal Controller
 * Handles orderbook depth rendering, instant swap execution,
 * pair switching, and real-time trade tape updates.
 */

class CalabiTradingManager {
  constructor() {
    this.currentPair = 'BTC/USD';
    this.currentPrice = 65420.50;
    this.currentTradeSide = 'BUY'; // 'BUY' or 'SELL'
    this.pairSelect = document.getElementById('pairSelect');
    this.payInput = document.getElementById('tradePayAmount');
    this.receiveInput = document.getElementById('tradeReceiveAmount');
    this.tabBuy = document.getElementById('tradeTabBuy');
    this.tabSell = document.getElementById('tradeTabSell');
    this.btnExecute = document.getElementById('btnExecuteTrade');

    this.init();
  }

  init() {
    if (this.pairSelect) {
      this.pairSelect.addEventListener('change', (e) => this.switchPair(e.target.value));
    }

    if (this.tabBuy && this.tabSell) {
      this.tabBuy.addEventListener('click', () => this.setSide('BUY'));
      this.tabSell.addEventListener('click', () => this.setSide('SELL'));
    }

    if (this.payInput) {
      this.payInput.addEventListener('input', () => this.calculateReceive());
    }

    if (this.btnExecute) {
      this.btnExecute.addEventListener('click', () => this.executeOrder());
    }

    this.renderOrderbook();
  }

  switchPair(newPair) {
    this.currentPair = newPair;
    const [base, quote] = newPair.split('/');
    
    // Update chart
    if (window.chartController) {
      window.chartController.loadCandles(newPair.replace('/', '-'));
    }

    // Update labels
    const paySym = document.getElementById('paySymbolTag');
    const receiveSym = document.getElementById('receiveSymbolTag');
    if (this.currentTradeSide === 'BUY') {
      if (paySym) paySym.textContent = quote;
      if (receiveSym) receiveSym.textContent = base;
    } else {
      if (paySym) paySym.textContent = base;
      if (receiveSym) receiveSym.textContent = quote;
    }

    this.calculateReceive();
    if (window.showToast) window.showToast(`Switched market pair to ${newPair}`, 'success');
  }

  setSide(side) {
    this.currentTradeSide = side;
    const [base, quote] = this.currentPair.split('/');
    const paySym = document.getElementById('paySymbolTag');
    const receiveSym = document.getElementById('receiveSymbolTag');

    if (side === 'BUY') {
      if (this.tabBuy) this.tabBuy.classList.add('active');
      if (this.tabSell) this.tabSell.classList.remove('active');
      if (this.btnExecute) {
        this.btnExecute.textContent = `Buy ${base}`;
        this.btnExecute.className = 'btn btn-action-buy';
      }
      if (paySym) paySym.textContent = quote;
      if (receiveSym) receiveSym.textContent = base;
    } else {
      if (this.tabBuy) this.tabBuy.classList.remove('active');
      if (this.tabSell) this.tabSell.classList.add('active');
      if (this.btnExecute) {
        this.btnExecute.textContent = `Sell ${base}`;
        this.btnExecute.className = 'btn btn-action-sell';
      }
      if (paySym) paySym.textContent = base;
      if (receiveSym) receiveSym.textContent = quote;
    }
    this.calculateReceive();
  }

  calculateReceive() {
    if (!this.payInput || !this.receiveInput) return;
    const amt = parseFloat(this.payInput.value) || 0;
    
    if (this.currentTradeSide === 'BUY') {
      const out = amt / (this.currentPrice || 65000);
      this.receiveInput.value = amt > 0 ? out.toFixed(6) : '';
    } else {
      const out = amt * (this.currentPrice || 65000);
      this.receiveInput.value = amt > 0 ? out.toFixed(2) : '';
    }
  }

  executeOrder() {
    const amt = parseFloat(this.payInput.value);
    if (!amt || amt <= 0) {
      if (window.showToast) window.showToast('Please enter an amount to trade.', 'error');
      return;
    }

    const [base, quote] = this.currentPair.split('/');
    const msg = this.currentTradeSide === 'BUY'
      ? `Purchased ${(amt / this.currentPrice).toFixed(4)} ${base} for $${amt.toFixed(2)} USD (0.20% sovereign routing fee)`
      : `Sold ${amt} ${base} for $${(amt * this.currentPrice).toFixed(2)} USD`;

    if (window.showToast) window.showToast(msg, 'success');
    this.payInput.value = '';
    this.receiveInput.value = '';

    // Push to trade tape
    this.addTradeToTape({
      time: new Date().toLocaleTimeString(),
      price: this.currentPrice.toFixed(2),
      size: (amt / this.currentPrice).toFixed(4),
      side: this.currentTradeSide
    });
  }

  addTradeToTape(trade) {
    const tbody = document.getElementById('tradeTapeBody');
    if (!tbody) return;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="color: var(--text-muted);">${trade.time}</td>
      <td style="color: ${trade.side === 'BUY' ? 'var(--accent-emerald)' : 'var(--accent-rose)'}; font-weight: 700;">$${trade.price}</td>
      <td>${trade.size}</td>
    `;
    tbody.insertBefore(row, tbody.firstChild);
    if (tbody.children.length > 20) {
      tbody.removeChild(tbody.lastChild);
    }
  }

  renderOrderbook() {
    const asksEl = document.getElementById('orderbookAsks');
    const bidsEl = document.getElementById('orderbookBids');
    if (!asksEl || !bidsEl) return;

    const basePrice = this.currentPrice;
    
    // Asks (above price)
    let asksHtml = '';
    for (let i = 5; i >= 1; i--) {
      const p = (basePrice * (1 + (i * 0.0003))).toFixed(2);
      const s = (Math.random() * 0.8 + 0.1).toFixed(4);
      const width = Math.min(100, Math.floor(Math.random() * 60 + 20));
      asksHtml += `
        <div class="ob-row ask">
          <div class="ob-bar ask" style="width: ${width}%;"></div>
          <span class="p">$${p}</span>
          <span class="s">${s}</span>
        </div>
      `;
    }
    asksEl.innerHTML = asksHtml;

    // Bids (below price)
    let bidsHtml = '';
    for (let i = 1; i <= 5; i++) {
      const p = (basePrice * (1 - (i * 0.0003))).toFixed(2);
      const s = (Math.random() * 0.8 + 0.1).toFixed(4);
      const width = Math.min(100, Math.floor(Math.random() * 60 + 20));
      bidsHtml += `
        <div class="ob-row bid">
          <div class="ob-bar bid" style="width: ${width}%;"></div>
          <span class="p">$${p}</span>
          <span class="s">${s}</span>
        </div>
      `;
    }
    bidsEl.innerHTML = bidsHtml;
  }
}

window.tradingManager = null;
document.addEventListener('DOMContentLoaded', () => {
  window.tradingManager = new CalabiTradingManager();
});
