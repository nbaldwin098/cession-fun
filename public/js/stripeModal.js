/**
 * Cession Stripe Integration Controller
 * Handles Stripe Crypto Onramp sessions and Cession Pro Subscriptions ($19.99/mo).
 */

class CessionStripeManager {
  constructor() {
    this.btnInitiateOnramp = document.getElementById('btnInitiateOnramp');
    this.fiatAmountInput = document.getElementById('fiatAmountInput');
    this.fiatCryptoSelect = document.getElementById('fiatCryptoSelect');
    this.btnSubscribeProMonthly = document.getElementById('btnSubscribeProMonthly');
    this.btnSubscribeProAnnual = document.getElementById('btnSubscribeProAnnual');
    this.btnHeaderUpgrade = document.getElementById('btnHeaderUpgrade');

    this.init();
  }

  init() {
    if (this.btnInitiateOnramp) {
      this.btnInitiateOnramp.addEventListener('click', () => this.handleCryptoOnramp());
    }

    if (this.fiatAmountInput) {
      this.fiatAmountInput.addEventListener('input', () => this.updateFeeBreakdown());
    }

    if (this.btnSubscribeProMonthly) {
      this.btnSubscribeProMonthly.addEventListener('click', () => this.handleProSubscription('monthly'));
    }

    if (this.btnSubscribeProAnnual) {
      this.btnSubscribeProAnnual.addEventListener('click', () => this.handleProSubscription('annual'));
    }

    if (this.btnHeaderUpgrade) {
      this.btnHeaderUpgrade.addEventListener('click', () => {
        // Switch to fiat/pro tab
        const fiatTabBtn = document.querySelector('[data-tab="tabFiat"]');
        if (fiatTabBtn) fiatTabBtn.click();
      });
    }
  }

  updateFeeBreakdown() {
    const amt = parseFloat(this.fiatAmountInput.value) || 0;
    const estVal = document.getElementById('fiatEstCryptoVal');
    const totalPay = document.getElementById('fiatTotalPayable');

    if (amt > 0) {
      const net = Math.max(0, amt - 1.50 - 0.45);
      const solEst = (net / 150).toFixed(4);
      if (estVal) estVal.textContent = `≈ ${solEst} SOL`;
      if (totalPay) totalPay.textContent = `$${amt.toFixed(2)} USD`;
    } else {
      if (estVal) estVal.textContent = '≈ 0.00 SOL';
      if (totalPay) totalPay.textContent = '$0.00 USD';
    }
  }

  async handleCryptoOnramp() {
    const amt = parseFloat(this.fiatAmountInput.value) || 100;
    const crypto = this.fiatCryptoSelect.value;
    const destinationAddress = document.getElementById('fiatRecipientAddress').value;

    if (window.showToast) {
      window.showToast(`Initializing Stripe Instant Onramp for $${amt} USD...`, 'success');
    }

    try {
      const res = await fetch('/api/stripe/create-onramp-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUsd: amt, destinationAddress, destinationNetwork: crypto })
      });
      const data = await res.json();

      if (data.success) {
        if (data.clientSecret && data.clientSecret !== 'dummy_secret') {
          // Live Stripe Onramp Redirect
          window.location.href = `https://crypto.stripe.com/widget?client_secret=${data.clientSecret}`;
        } else {
          // Simulated Sandbox Mode
          setTimeout(() => {
            if (window.showToast) {
              window.showToast(`[Sandbox] Stripe Card Authorized: $${amt} USD settled. ${crypto} dispatched to ${destinationAddress.substring(0, 10)}...`, 'success');
            }
          }, 1200);
        }
      }
    } catch (err) {
      if (window.showToast) window.showToast('Failed to connect to Stripe Onramp.', 'error');
    }
  }

  async handleProSubscription(plan) {
    if (window.showToast) {
      window.showToast(`Creating Stripe Checkout Session for Cession Pro (${plan})...`, 'success');
    }

    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          successUrl: window.location.origin + '?pro_success=true',
          cancelUrl: window.location.origin + '?pro_cancel=true'
        })
      });
      const data = await res.json();

      if (data.success && data.url) {
        if (data.url.startsWith('http')) {
          window.location.href = data.url;
        } else {
          // Sandbox active notification
          setTimeout(() => {
            if (window.showToast) {
              window.showToast('Cession Pro ($19.99/mo) Activated! VIP L2 Priority Enabled.', 'success');
            }
          }, 800);
        }
      }
    } catch (err) {
      if (window.showToast) window.showToast('Error initiating Stripe Pro checkout.', 'error');
    }
  }
}

window.stripeManager = null;
document.addEventListener('DOMContentLoaded', () => {
  window.stripeManager = new CessionStripeManager();
});
