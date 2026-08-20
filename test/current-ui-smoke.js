const assert = require('assert');
const puppeteer = require('puppeteer');

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  try {
    const response = await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    assert.strictEqual(response.status(), 200, 'Home page should load');
    await page.waitForFunction(() => Boolean(window.CessionUI));

    for (const view of ['home', 'explore', 'wallet', 'rewards', 'ai', 'mint']) {
      await page.evaluate((name) => window.CessionUI.go(name), view);
      await page.waitForFunction((name) => {
        const map = { home: 'viewHome', explore: 'viewExplorePulse', wallet: 'viewWallet', rewards: 'viewRewards', ai: 'viewAi', mint: 'viewMint' };
        return document.getElementById(map[name]).classList.contains('active');
      }, {}, view);
    }

    await page.evaluate(() => {
      document.getElementById('filterAge').value = '24';
      document.getElementById('filterVolume').value = '100';
      document.getElementById('filterLiquidity').value = '1';
      document.getElementById('filterHolders').value = '10';
      document.getElementById('filterVerified').checked = true;
      ['filterAge', 'filterVolume', 'filterLiquidity', 'filterHolders', 'filterVerified'].forEach((id) => {
        document.getElementById(id).dispatchEvent(new Event('change', { bubbles: true }));
      });
      window.CessionUI.openCoin({
        symbol: 'UIFLOW',
        name: 'UI Flow',
        mint: '2zS11111111111111111111111111111111111176c',
        creator: '3xT1111111111111111111111111111111111117Qe',
        holdersCount: 42,
        realSolRaised: 12.5,
        safetyAudit: { grade: 'A', score: 95, warnings: [] },
        recentTrades: [{ type: 'BUY', amountSol: 0.25, time: 'Now' }, { type: 'SELL', amountSol: 0.1, time: 'Now' }]
      });
    });
    await page.waitForFunction(() => document.getElementById('viewCoin').classList.contains('active'));
    assert.strictEqual(await page.$eval('#coinTradeFeedRows', element => element.children.length), 2, 'Trade feed should render buys and sells');
    await page.hover('#coinTradeFeed');

    await page.evaluate(() => window.CessionUI.openTrade('buy'));
    assert.strictEqual(await page.$eval('#walletModal', element => element.classList.contains('open')), true, 'Wallet modal should open when disconnected');
    await page.evaluate(() => {
      window.CessionUI.close('walletModal');
      localStorage.setItem('cession_address', '3xT1111111111111111111111111111111111117Qe');
      window.CessionUI.openTrade('buy');
      window.dispatchEvent(new CustomEvent('cession:trade-status', { detail: { state: 'confirmed', message: 'Buy confirmed on-chain' } }));
    });
    assert.strictEqual(await page.$eval('#tradeModal', element => element.classList.contains('open')), true, 'Trade modal should open when connected');
    assert.strictEqual(await page.$eval('#coinTradeStatus', element => element.dataset.state), 'confirmed', 'Trade status should update from the trade event');

    // Rewards page: should render a wallet's points, tier, and referral link once connected.
    await page.evaluate(() => window.CessionUI.go('rewards'));
    await page.waitForFunction(() => document.getElementById('viewRewards').classList.contains('active'));
    await page.waitForFunction(() => (document.getElementById('rewardsBody').textContent || '').includes('Tier'), { timeout: 10000 });
    const rewardsText = await page.$eval('#rewardsBody', element => element.textContent);
    assert(rewardsText.includes('Tier'), 'Rewards body should show a tier once a wallet is connected');
    assert(rewardsText.includes('Points'), 'Rewards body should show points');

    assert.deepStrictEqual(errors, [], `Browser errors: ${errors.join('; ')}`);
    console.log('Current UI interaction smoke test passed.');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
