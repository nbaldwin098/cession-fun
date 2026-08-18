# 🔓 CESSION.FUN MOBILE-FIRST LAYOUT SPECIFICATION

**Status:** `UNLOCKED & UPDATED — CESSION 2026 MOBILE SPEC`  
**Updated Date:** August 18, 2026  
**Active Architecture:** Cession 2026 Mobile-First Single-Page Application (5-Slot Bottom Bar)

---

## 1. Active Cession Mobile-First Layout Spec

The application uses a 100% dark void theme (`#050711`), steel-violet active accents (`#5B6CFF`), top clean header, and a fixed 5-slot bottom navigation bar stuck to the bottom of the screen above all content:

1. **Top Header Bar**:
   - Brand title: `CESSION`
   - Search bar: `🔍 Search coins` (active on Pulse view)
   - `Connect Wallet` button / connected pill

2. **Fixed 5-Slot Bottom Navigation Bar (`#bottomNav`)**:
   - Always visible, fixed to the bottom of the viewport (`position: fixed; bottom: 0; z-index: 9999;`).
   - High enough z-index and main content padding (`padding-bottom: 96px`) so no content is covered.
   - **Slot 1: For You (`🔥`)** — Main shop feed (empty state shows "No live coins yet.", zero mock tickers).
   - **Slot 2: Pulse (`📈`)** — Coin search, ranking, and category lanes.
   - **Slot 3: Wallet (`👛`)** — Raised circle in center (`#5B6CFF`). Logged out: full-screen connect card ("Connect Phantom" & "Connect MetaMask", short line "We do not hold keys. All transactions are signed directly by your wallet."). Logged in: shows connected wallet icon (Phantom/MetaMask) and truncated address. Center button shows the same connected wallet icon.
   - **Slot 4: Create (`➕`)** — Two panels: Launch coin (0.05 SOL) & Stake (official Cession coins and SOL only, lock status "Not live yet").
   - **Slot 5: You (`👤`)** — Profile, settings, monthly statements, holdings.

3. **Footer**:
   - Single clean dark protocol line at bottom of page flow (`#050711` background):
     `CESSION • Solana Fair Launch Bonding Curve Protocol • Create Fee: 0.05 SOL • We do not hold keys. Not live until the program is deployed.`
   - NO white blocks, NO Base/BaseScan claims, NO fake 48.60 SOL treasury theater.

4. **Removed Chrome**:
   - Cookie privacy popup card completely deleted.
   - Old white footer block completely deleted.
   - Left sidebar rail deleted.
   - Back / Forward chevrons deleted.
   - "Protocol is live" banner deleted.

---

## 2. Deprecation Notice
The previous `templates/pump_fun_2026_locked/` template is **DEPRECATED & UNLOCKED**. Do NOT copy or restore files from `templates/pump_fun_2026_locked/` over `public/`.
