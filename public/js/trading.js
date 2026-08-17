/**
 * Cession.fun — Pump.fun Exact Trade Controller
 */

class PumpTradingManager {
  constructor() {
    this.activeToken = null;
    this.side = 'buy'; // 'buy' or 'sell'
    this.slippagePercent = 1.0;
    this.isCoinUnit = false; // toggle between SOL and Token

    this.btnBuy = document.getElementById('btnToggleBuy');
    this.btnSell = document.getElementById('btnToggleSell');
    this.amountInput = document.getElementById('tradeAmountInput');
    this.unitLabel = document.getElementById('tradeUnitLabel');
    this.outputQuote = document.getElementById('tradeOutputQuote');
    this.btnPlaceTrade = document.getElementById('btnPlaceTrade');
    this.btnSlippage = document.getElementById('btnSetSlippage');
    this.slippageVal = document.getElementById('currentSlippageVal');

    this.init();
  }

  init() {
    if (this.btnBuy && this.btnSell) {
      this.btnBuy.addEventListener('click', () => this.setSide('buy'));
      this.btnSell.addEventListener('click', () => this.setSide('sell'));
    }

    if (this.amountInput) {
      this.amountInput.addEventListener('input', () => this.calculateQuote());
    }

    if (this.btnPlaceTrade) {
      this.btnPlaceTrade.addEventListener('click', () => this.executeTrade());
    }

    if (this.btnSlippage) {
      this.btnSlippage.addEventListener('click', () => this.promptSlippage());
    }
  }

  setActiveToken(token) {
    this.activeToken = token;
    if (this.amountInput) this.amountInput.value = '';
    this.calculateQuote();
  }

  setSide(side) {
    this.side = side;
    if (this.btnBuy && this.btnSell && this.btnPlaceTrade) {
      if (side === 'buy') {
        this.btnBuy.classList.add('active');
        this.btnSell.classList.remove('active');
        this.btnPlaceTrade.classList.remove('sell');
        this.btnPlaceTrade.textContent = 'place trade';
        if (this.unitLabel) this.unitLabel.textContent = 'SOL';
      } else {
        this.btnSell.classList.add('active');
        this.btnBuy.classList.remove('active');
        this.btnPlaceTrade.classList.add('sell');
        this.btnPlaceTrade.textContent = 'place trade (sell)';
        if (this.unitLabel) this.unitLabel.textContent = this.activeToken ? `$${this.activeToken.symbol}` : 'TOKENS';
      }
    }
    this.calculateQuote();
  }

  setPreset(preset) {
    if (!this.amountInput) return;
    if (preset === 0) {
      this.amountInput.value = '';
    } else if (preset === 'max') {
      this.amountInput.value = this.side === 'buy' ? '10' : '1000000';
    } else {
      this.amountInput.value = preset;
    }
    this.calculateQuote();
  }

  calculateQuote() {
    if (!this.outputQuote) return;
    const val = parseFloat(this.amountInput ? this.amountInput.value : 0) || 0;
    if (!this.activeToken || val <= 0) {
      this.outputQuote.textContent = this.side === 'buy' ? 'you receive: 0 tokens' : 'you receive: 0 SOL';
      return;
    }

    const priceSol = this.activeToken.currentPriceSol || 0.000000025;

    if (this.side === 'buy') {
      const tokensOut = Math.floor(val / priceSol);
      this.outputQuote.textContent = `you receive: ~${tokensOut.toLocaleString()} $${this.activeToken.symbol}`;
    } else {
      const solOut = (val * priceSol * 0.995).toFixed(4);
      this.outputQuote.textContent = `you receive: ~${solOut} SOL`;
    }
  }

  promptSlippage() {
    const input = prompt('Enter max slippage percentage (%):', this.slippagePercent);
    if (input !== null) {
      const parsed = parseFloat(input);
      if (!isNaN(parsed) && parsed >= 0.1 && parsed <= 50) {
        this.slippagePercent = parsed;
        if (this.slippageVal) this.slippageVal.textContent = `${parsed}%`;
      } else {
        alert('Please enter a valid slippage between 0.1% and 50%.');
      }
    }
  }

  async executeTrade() {
    if (!this.activeToken) {
      if (window.launchpadManager) window.launchpadManager.toast('No token selected', 'error');
      return;
    }

    const amount = parseFloat(this.amountInput ? this.amountInput.value : 0);
    if (!amount || amount <= 0) {
      if (window.launchpadManager) window.launchpadManager.toast('Please enter a valid trade amount', 'error');
      return;
    }

    const trader = window.walletEngine && window.walletEngine.activeAddress
      ? window.walletEngine.activeAddress
      : '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');

    const endpoint = this.side === 'buy' 
      ? `/api/tokens/${this.activeToken.symbol}/buy`
      : `/api/tokens/${this.activeToken.symbol}/sell`;

    const payload = this.side === 'buy'
      ? { solAmount: amount, buyer: trader, slippageTolerancePercent: this.slippagePercent }
      : { tokenAmount: amount, seller: trader, slippageTolerancePercent: this.slippagePercent };

    try {
      if (this.btnPlaceTrade) this.btnPlaceTrade.textContent = 'processing on-chain...';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        if (window.launchpadManager) {
          window.launchpadManager.toast(
            `Successfully ${this.side === 'buy' ? 'bought' : 'sold'} on bonding curve!`,
            'success'
          );
          // Refresh token data & UI
          await window.launchpadManager.fetchTokens(false);
          window.launchpadManager.openTokenDetail(this.activeToken.symbol);
        }
        if (this.amountInput) this.amountInput.value = '';
        this.calculateQuote();
      } else {
        if (window.launchpadManager) {
          window.launchpadManager.toast(data.error || 'Trade failed', 'error');
        }
      }
    } catch (e) {
      if (window.launchpadManager) {
        window.launchpadManager.toast('Network error executing trade', 'error');
      }
    } finally {
      if (this.btnPlaceTrade) {
        this.btnPlaceTrade.textContent = this.side === 'buy' ? 'place trade' : 'place trade (sell)';
      }
    }
  }
}

window.tradingManager = null;
window.PumpTradingManager = PumpTradingManager;
document.addEventListener('DOMContentLoaded', () => {
  window.tradingManager = new PumpTradingManager();
});
