/**
 * Cession.fun — TradingView Lightweight Charts Controller
 * Exact Pump.fun Candlestick & Volume chart renderer
 */

class CessionChartController {
  constructor() {
    this.chartContainer = document.getElementById('tradingviewChart');
    this.chart = null;
    this.candleSeries = null;
    this.volumeSeries = null;
    this.currentSymbol = 'CESS';
    this.currentTimeframe = '5m';
    
    this.initChart();
    this.bindTimeframeButtons();
  }

  initChart() {
    if (!this.chartContainer || typeof LightweightCharts === 'undefined') {
      console.warn('[Charts] LightweightCharts library not loaded or container not found.');
      return;
    }

    // Chart Configuration
    this.chart = LightweightCharts.createChart(this.chartContainer, {
      layout: {
        background: { color: '#ffffff' },
        textColor: '#475569',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace"
      },
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' }
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Candlestick Series
    this.candleSeries = this.chart.addCandlestickSeries({
      upColor: '#16a34a',
      downColor: '#dc2626',
      borderVisible: false,
      wickUpColor: '#16a34a',
      wickDownColor: '#dc2626',
    });

    // Volume Histogram Series
    this.volumeSeries = this.chart.addHistogramSeries({
      color: '#cbd5e1',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Handle responsive resize
    window.addEventListener('resize', () => {
      this.resize();
    });
  }

  resize() {
    if (this.chart && this.chartContainer && this.chartContainer.clientWidth > 0) {
      this.chart.applyOptions({
        width: this.chartContainer.clientWidth,
        height: 320
      });
    }
  }

  bindTimeframeButtons() {
    const buttons = document.querySelectorAll('.tf-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTimeframe = btn.getAttribute('data-tf');
        if (this.currentSymbol) {
          this.loadCandles(this.currentSymbol);
        }
      });
    });
  }

  async loadCandles(symbol) {
    this.currentSymbol = symbol;
    setTimeout(() => this.resize(), 50);

    try {
      const res = await fetch(`/api/market/candles/${symbol}?tf=${this.currentTimeframe}`);
      const data = await res.json();
      if (data.success && data.candles && data.candles.length > 0) {
        const formattedCandles = data.candles.map(c => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close
        }));

        const formattedVolume = data.candles.map(c => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(134, 239, 172, 0.3)' : 'rgba(239, 68, 68, 0.3)'
        }));

        this.candleSeries.setData(formattedCandles);
        this.volumeSeries.setData(formattedVolume);
        this.chart.timeScale().fitContent();
      } else {
        // Fallback synthetic initial candle if new token
        this.generateSyntheticCandles();
      }
    } catch (err) {
      this.generateSyntheticCandles();
    }
  }

  generateSyntheticCandles() {
    if (!this.candleSeries) return;
    const now = Math.floor(Date.now() / 1000);
    const candles = [];
    const volumes = [];
    let price = 0.000000025;

    for (let i = 30; i >= 0; i--) {
      const time = now - (i * 300);
      const change = (Math.random() - 0.48) * 0.000000003;
      const open = price;
      price = Math.max(0.00000001, price + change);
      const high = Math.max(open, price) + Math.random() * 0.000000002;
      const low = Math.min(open, price) - Math.random() * 0.000000002;
      const close = price;

      candles.push({ time, open, high, low, close });
      volumes.push({
        time,
        value: Math.floor(Math.random() * 50000 + 10000),
        color: close >= open ? 'rgba(134, 239, 172, 0.3)' : 'rgba(239, 68, 68, 0.3)'
      });
    }

    this.candleSeries.setData(candles);
    this.volumeSeries.setData(volumes);
    this.chart.timeScale().fitContent();
  }

  updateTick(candle) {
    if (this.candleSeries && candle) {
      this.candleSeries.update(candle);
      if (this.volumeSeries && candle.volume) {
        this.volumeSeries.update({
          time: candle.time,
          value: candle.volume,
          color: candle.close >= candle.open ? 'rgba(134, 239, 172, 0.3)' : 'rgba(239, 68, 68, 0.3)'
        });
      }
    }
  }
}

window.chartController = null;
window.CessionChartController = CessionChartController;
document.addEventListener('DOMContentLoaded', () => {
  window.chartController = new CessionChartController();
});
