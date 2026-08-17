# 🔒 IMMUTABLE TEMPLATE LOCK MANIFEST — PUMP.FUN 2026 REPLICA

**Status:** `LOCKED & FROZEN`  
**Lock Date:** August 17, 2026  
**Git Tag:** `v1.0.0-pumpfun-locked-template`  
**Backup Directory:** `templates/pump_fun_2026_locked/`

---

## 1. Locked Layout & Component Tree
This layout is the frozen standard for all frontend views:

1. **Top Notice Banner**:
   - `Trade faster. Pump is better on mobile. ›` with `✕` dismiss button.
2. **Left Vertical Sidebar Rail (`.sidebar-rail`)**:
   - Fixed 58px width dark rail (`#090c13`).
   - Angled mint pill SVG logo at top.
   - 9 vertical icon buttons: `Home`, `Explore` (active), `Profile`, `Chat`, `Leaderboard`, `Livestreams`, `Support`, `Swap`, `Tokens`.
   - Bottom pinned `[ + ]` mint green create coin button.
3. **Top Navbar (`.top-navbar`)**:
   - `‹` and `›` navigation chevrons.
   - Search bar (`🔍 Search for coins and users...`) with `⌘ K` keyboard badge & trash button.
   - `+ Create` button.
   - `Sign in` mint button / connected wallet pill (`balance` + `address`).
4. **"Trending now" Carousel (`.trending-section`)**:
   - Section header with `‹` and `›` carousel navigation controls.
   - 4-column responsive grid with market cap badges, title, ticker, and excerpt.
5. **"Explore coins" Section (`.explore-section`)**:
   - Category filter pills: `✨ Movers`, `🔥 Mayhem`, `🌱 New`, `💖 Charities`, `📹 Live`, `🔥 Market cap`, `🤖 Agents`, `⏳ Oldest`, `⚡ Last trade`.
   - Right controls: `⚙ Filter`, `⊞ Grid` & `☷ Table` switcher, `⚙` Settings gear.
6. **Main Coin Cards Grid (`.explore-coins-grid`)**:
   - Square image box with embedded green SVG sparkline graph overlay.
   - Title, ticker, market cap, creator badge, and 2-line excerpt description.
7. **Table View (`.explore-table-container`)**:
   - Full tabular view when `☷ Table` is selected.
8. **"We value your privacy" Cookie Banner (`.privacy-cookie-banner`)**:
   - Bottom-right floating card with `Reject all`, `Customize`, and `Accept all` buttons.
9. **Token Detail View Modal (`#tokenDetailModal`)**:
   - TradingView candlestick chart with timeframe selector.
   - Bonding curve progress bar ($69,420 graduation target).
   - `thread` (with meme upload), `trades`, `holders` tabs.
   - Buy/Sell trade execution card with slippage selector.

---

## 2. Frozen Color & Token Palette
```css
:root {
  --bg-app: #0c0f17;
  --bg-sidebar: #090c13;
  --bg-card: #131824;
  --bg-card-hover: #1a2232;
  --bg-input: #121824;
  --bg-pill: #1a2233;
  --bg-pill-hover: #222d42;
  --pump-mint: #86efac;
  --pump-mint-hover: #4ade80;
  --pump-mint-dark: #14532d;
  --accent-red: #f87171;
  --font-sans: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

---

## 3. Restoration Runbook
If any accidental modifications occur, run:
```powershell
Copy-Item templates/pump_fun_2026_locked/index.html public/index.html -Force
Copy-Item templates/pump_fun_2026_locked/style.css public/css/style.css -Force
Copy-Item templates/pump_fun_2026_locked/*.js public/js/ -Force
```
