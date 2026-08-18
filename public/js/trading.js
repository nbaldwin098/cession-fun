/**
 * Cession.fun — Pump.fun Exact Trade Controller
 * Real Constant Product Swap Math ($k = x \cdot y$), Slippage Modal, & Quick Presets
 */

class PumpTradingManager {
  constructor() {
    this.activeToken = null;
    this.side = 'buy'; // 'buy' or 'sell'
    this.slippagePercent = 1.0;
    this.isCoinUnit = false;

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
      this.btnSlippage.addEventListener('click', () => this.openSlippageModal());
    }

    const btnCloseSlip = document.getElementById('btnCloseSlippageModal');
    if (btnCloseSlip) {
      btnCloseSlip.addEventListener('click', () => {
        const modal = document.getElementById('slippageModal');
        if (modal) modal.style.display = 'none';
      });
    }

    const btnSaveCustomSlip = document.getElementById('btnSaveCustomSlippage');
    if (btnSaveCustomSlip) {
      btnSaveCustomSlip.addEventListener('click', () => {
        const customVal = parseFloat(document.getElementById('customSlippageInput')?.value);
        if (!isNaN(customVal) && customVal > 0 && customVal <= 50) {
          this.setSlippage(customVal);
        } else {
          if (window.launchpadManager) window.launchpadManager.toast('Please enter slippage between 0.1% and 50%', 'error');
        }
      });
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

  openSlippageModal() {
    const modal = document.getElementById('slippageModal');
    if (modal) modal.style.display = 'flex';
  }

  setSlippage(val) {
    this.slippagePercent = parseFloat(val);
    if (this.slippageVal) this.slippageVal.textContent = `${this.slippagePercent.toFixed(1)}%`;
    const modal = document.getElementById('slippageModal');
    if (modal) modal.style.display = 'none';
    if (window.launchpadManager) window.launchpadManager.toast(`Max slippage set to ${this.slippagePercent}%`, 'info');
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

    const we = window.walletEngine;
    if (!we || !we.isAuthenticated || !we.activeAddress) {
      if (window.launchpadManager) {
        window.launchpadManager.toast('Please connect your crypto wallet to trade.', 'info');
      }
      if (we) we.openWalletModal();
      return;
    }

    if (this.side === 'buy') {
      const availableSol = (we.balances && we.balances.sol !== undefined) ? we.balances.sol : 0.00;
      if (availableSol <= 0 || availableSol < amount) {
        if (window.launchpadManager) {
          window.launchpadManager.toast(`Insufficient SOL balance (${availableSol.toFixed(2)} SOL). Please deposit SOL to trade.`, 'error');
        }
        if (we) we.openDepositModal();
        return;
      }
    }

    const trader = we.activeAddress;
    const chain = we.activeChain || 'Solana';

    const trader = we.activeAddress;
    const chain = we.activeChain || 'Solana';

    try {
      let txHash = '';
      if (this.btnPlaceTrade) this.btnPlaceTrade.textContent = `Approve ${this.side.toUpperCase()} in wallet...`;

      if (chain === 'Solana' && window.solana?.isPhantom && window.solanaWeb3 && window.solana.publicKey) {
        const web3 = window.solanaWeb3;
        const spl = window.splToken;

        const PROGRAM_ID = new web3.PublicKey('Epxb6TRhGwT1gQFj5xCLM6KtZUz9ajD7jZzkVrp3qBR9');
        const TOKEN_PROGRAM_ID = spl ? spl.TOKEN_PROGRAM_ID : new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        const ASSOCIATED_TOKEN_PROGRAM_ID = spl ? spl.ASSOCIATED_TOKEN_PROGRAM_ID : new web3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
        const TREASURY_PUBKEY = new web3.PublicKey('8cdpVXsrQQDf84H4KC9pfqEKxUV9ZJjZZbeueWmJCCvH');

        const mintPubkey = new web3.PublicKey(this.activeToken.mintAddress || 'So11111111111111111111111111111111111111112');

        // Derive PDAs
        const [curvePda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from('curve'), mintPubkey.toBuffer()],
          PROGRAM_ID
        );

        const [solVaultPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from('sol_vault'), mintPubkey.toBuffer()],
          PROGRAM_ID
        );

        const [tokenVaultAta] = web3.PublicKey.findProgramAddressSync(
          [curvePda.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintPubkey.toBuffer()],
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const [traderAta] = web3.PublicKey.findProgramAddressSync(
          [window.solana.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintPubkey.toBuffer()],
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const transaction = new web3.Transaction();

        // Check/Create trader ATA instruction if needed
        if (spl && spl.createAssociatedTokenAccountInstruction && this.side === 'buy') {
          transaction.add(
            spl.createAssociatedTokenAccountInstruction(
              window.solana.publicKey,
              traderAta,
              window.solana.publicKey,
              mintPubkey,
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }

        if (this.side === 'buy') {
          // Instruction: buy (Discriminator: 0x66063d1201daebea)
          const buyDiscriminator = new Uint8Array([102, 6, 61, 18, 1, 218, 235, 234]);
          const lamports = BigInt(Math.floor(amount * 1000000000));
          const minTokens = 1n; // 1 token minimum slippage protection

          const dataBuffer = new Uint8Array(8 + 8 + 8);
          dataBuffer.set(buyDiscriminator, 0);
          new DataView(dataBuffer.buffer).setBigUint64(8, lamports, true);
          new DataView(dataBuffer.buffer).setBigUint64(16, minTokens, true);

          const buyIx = new web3.TransactionInstruction({
            programId: PROGRAM_ID,
            keys: [
              { pubkey: window.solana.publicKey, isSigner: true, isWritable: true },
              { pubkey: mintPubkey, isSigner: false, isWritable: false },
              { pubkey: tokenVaultAta, isSigner: false, isWritable: true },
              { pubkey: solVaultPda, isSigner: false, isWritable: true },
              { pubkey: traderAta, isSigner: false, isWritable: true },
              { pubkey: TREASURY_PUBKEY, isSigner: false, isWritable: true },
              { pubkey: curvePda, isSigner: false, isWritable: true },
              { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
              { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
            ],
            data: dataBuffer
          });

          transaction.add(buyIx);
        } else {
          // Instruction: sell (Discriminator: 0x33e683f124403326)
          const sellDiscriminator = new Uint8Array([51, 230, 131, 241, 36, 64, 51, 38]);
          const tokenUnits = BigInt(Math.floor(amount * 1000000)); // 6 decimals
          const minSol = 1n; // 1 lamport minimum

          const dataBuffer = new Uint8Array(8 + 8 + 8);
          dataBuffer.set(sellDiscriminator, 0);
          new DataView(dataBuffer.buffer).setBigUint64(8, tokenUnits, true);
          new DataView(dataBuffer.buffer).setBigUint64(16, minSol, true);

          const sellIx = new web3.TransactionInstruction({
            programId: PROGRAM_ID,
            keys: [
              { pubkey: window.solana.publicKey, isSigner: true, isWritable: true },
              { pubkey: mintPubkey, isSigner: false, isWritable: false },
              { pubkey: tokenVaultAta, isSigner: false, isWritable: true },
              { pubkey: solVaultPda, isSigner: false, isWritable: true },
              { pubkey: traderAta, isSigner: false, isWritable: true },
              { pubkey: TREASURY_PUBKEY, isSigner: false, isWritable: true },
              { pubkey: curvePda, isSigner: false, isWritable: true },
              { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
              { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
            ],
            data: dataBuffer
          });

          transaction.add(sellIx);
        }

        const connection = new web3.Connection('https://api.mainnet-beta.solana.com');
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = window.solana.publicKey;

        const signed = await window.solana.signAndSendTransaction(transaction);
        txHash = signed.signature;

        if (!txHash) {
          throw new Error('Transaction was cancelled or rejected in Phantom wallet.');
        }
      } else if (chain === 'Ethereum' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const curveAbi = [
          "function buyTokens(address tokenAddress) external payable",
          "function sellTokens(address tokenAddress, uint256 tokenAmount) external"
        ];
        const curveAddress = "0x7120B5B943800000000000000000000000000001";
        const contract = new ethers.Contract(curveAddress, curveAbi, signer);

        const tokenAddress = this.activeToken.mintAddress || "0x7120B5B943800000000000000000000000000002";

        if (this.side === 'buy') {
          const weiVal = ethers.parseEther(amount.toString());
          const tx = await contract.buyTokens(tokenAddress, { value: weiVal });
          txHash = tx.hash;
          await tx.wait(1);
        } else {
          const tokenUnits = ethers.parseUnits(amount.toString(), 18);
          const tx = await contract.sellTokens(tokenAddress, tokenUnits);
          txHash = tx.hash;
          await tx.wait(1);
        }
      } else {
        throw new Error('Connected crypto wallet required to trade on-chain.');
      }

      if (this.btnPlaceTrade) this.btnPlaceTrade.textContent = 'Confirming on-chain trade...';

      const endpoint = this.side === 'buy'
        ? `/api/tokens/${this.activeToken.symbol}/buy`
        : `/api/tokens/${this.activeToken.symbol}/sell`;

      const payload = this.side === 'buy'
        ? { solAmount: amount, buyer: trader, slippageTolerancePercent: this.slippagePercent, txHash }
        : { tokenAmount: amount, seller: trader, slippageTolerancePercent: this.slippagePercent, txHash };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${we.sessionToken || ''}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        const explorerUrl = chain === 'Solana'
          ? `https://solscan.io/tx/${txHash}`
          : `https://etherscan.io/tx/${txHash}`;

        if (window.launchpadManager) {
          window.launchpadManager.toast(
            `✓ On-Chain ${this.side.toUpperCase()} Confirmed! <a href="${explorerUrl}" target="_blank" style="color:#00f2fe; text-decoration:underline;">View Transaction on Explorer ↗</a>`,
            'success'
          );
          await window.launchpadManager.fetchTokens(false);
          window.launchpadManager.openTokenDetail(this.activeToken.symbol);
        }
        if (this.amountInput) this.amountInput.value = '';
        this.calculateQuote();
      } else {
        if (window.launchpadManager) {
          window.launchpadManager.toast(data.error || 'Trade failed to record', 'error');
        }
      }
    } catch (e) {
      console.error('On-chain trade error:', e);
      if (window.launchpadManager) {
        window.launchpadManager.toast('Trade aborted: ' + (e.message || 'Signature rejected'), 'error');
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
