/**
 * Cession.fun TradingView Lightweight Charts Controller
 * Renders high-performance, real-time candlestick charts and volume bars.
 */

class CessionChartController {
  constructor() {
    this.chartContainer = document.getElementById('tradingviewChart');
    this.chart = null;
    this.candleSeries = null;
    this.volumeSeries = null;
    this.currentSymbol = 'BTC-USD';
    this.currentTimeframe = '1m';
    
    this.initChart();
  }

  initChart() {
    if (!this.chartContainer || typeof LightweightCharts === 'undefined') {
      console.warn('[Charts] LightweightCharts library not loaded.');
      return;
    }

    // Chart Configuration
    this.chart = LightweightCharts.createChart(this.chartContainer, {
      layout: {
        background: { color: '#0d111a' },
        textColor: '#94a3b8',
        fontSize: 12,
        fontFamily: "'JetBrains Mono', monospace"
      },
      grid: {
        vertLines: { color: '#151c2c' },
        horzLines: { color: '#151c2c' }
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Candlestick Series
    this.candleSeries = this.chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    // Volume Histogram Series
    this.volumeSeries = this.chart.addHistogramSeries({
      color: '#1e293b',
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
      if (this.chart && this.chartContainer) {
        this.chart.applyOptions({
          width: this.chartContainer.clientWidth,
          height: this.chartContainer.clientHeight || 420
        });
      }
    });

    // Fetch initial candles from API
    this.loadCandles(this.currentSymbol);
  }

  async loadCandles(symbol) {
    this.currentSymbol = symbol;
    try {
      const res = await fetch(`/api/market/candles/${symbol}`);
      const data = await res.json();
      if (data.success && data.candles && data.candles.length > 0) {
        // Format for Lightweight Charts
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
          color: c.close >= c.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'
        }));

        this.candleSeries.setData(formattedCandles);
        this.volumeSeries.setData(formattedVolume);
        this.chart.timeScale().fitContent();
      }
    } catch (err) {
      console.warn('[Charts] Error loading candles:', err);
    }
  }

  updateTick(candle) {
    if (this.candleSeries && candle) {
      this.candleSeries.update(candle);
      if (this.volumeSeries && candle.volume) {
        this.volumeSeries.update({
          time: candle.time,
          value: candle.volume,
          color: candle.close >= candle.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'
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
