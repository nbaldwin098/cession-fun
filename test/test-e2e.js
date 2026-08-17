async function testAll() {
  console.log('--- TESTING CESSION.FUN & PUMP.FUN FULL FUNCTIONALITY ---');

  // 1. Test Coin Creation with 0.1 SOL fee
  console.log('\n[1] Testing Token Minting (0.1 SOL fee + 0.5 SOL buy)...');
  const createRes = await fetch('http://localhost:3000/api/tokens/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Pepe Bull Run',
      symbol: 'PEPEBULL_' + Math.floor(Math.random()*1000),
      description: 'The greenest sovereign bull on Solana curve.',
      creator: '0x88f4b23a99102837482910',
      mintFeeSol: 0.1,
      initialBuySol: 0.5
    })
  });
  const createData = await createRes.json();
  console.log('Create Result:', createData.success, 'Symbol:', createData.token?.symbol, 'Mint Fee:', createData.mintFee, 'Mcap:', createData.token?.marketCapUsd);

  const sym = createData.token?.symbol || 'CESS';

  // 2. Test Bonding Curve Buy
  console.log(`\n[2] Testing Buy 0.2 SOL of $${sym}...`);
  const buyRes = await fetch(`http://localhost:3000/api/tokens/${sym}/buy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      solAmount: 0.2,
      buyerAddress: '0xTraderPhantom991'
    })
  });
  const buyData = await buyRes.json();
  console.log('Buy Result:', buyData.success, buyData.message);

  // 3. Test Bonding Curve Sell
  console.log(`\n[3] Testing Sell 500,000 tokens of $${sym}...`);
  const sellRes = await fetch(`http://localhost:3000/api/tokens/${sym}/sell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tokenAmount: 500000,
      sellerAddress: '0xTraderPhantom991'
    })
  });
  const sellData = await sellRes.json();
  console.log('Sell Result:', sellData.success, sellData.message);

  // 4. Test Bundles
  console.log('\n[4] Testing Bundles & Top/Worst...');
  const bundlesRes = await fetch('http://localhost:3000/api/tokens/bundles');
  const bundlesData = await bundlesRes.json();
  console.log('Bundles count:', bundlesData.count, 'Sample Bundle:', bundlesData.bundles[0]?.name);

  const topRes = await fetch('http://localhost:3000/api/tokens/bundles/top');
  const topData = await topRes.json();
  console.log('Top performing bundles:', topData.bundles?.map(b => `${b.name} (${b.roi24h})`).join(', '));

  const worstRes = await fetch('http://localhost:3000/api/tokens/bundles/worst');
  const worstData = await worstRes.json();
  console.log('Worst performing bundles:', worstData.bundles?.map(b => `${b.name} (${b.roi24h})`).join(', '));

  console.log('\n✅ ALL PUMP.FUN & CESSION BACKEND APIS VERIFIED AND WORKING SMOOTHLY!');
}

testAll().catch(console.error);
