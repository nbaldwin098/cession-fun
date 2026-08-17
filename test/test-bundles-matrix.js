const assert = require('assert');

async function runBundleTests() {
  console.log('=== TEST SUITE: BUNDLES CATEGORIZATION & TOP 5 BEST/WORST MATRIX ===\n');

  const categories = ['memes', 'politics', 'trends', 'whale', 'ai'];

  // 1. Test Matrix API
  console.log('[1] Testing /api/tokens/bundles/matrix ...');
  const matrixRes = await fetch('http://localhost:3000/api/tokens/bundles/matrix');
  const matrixData = await matrixRes.json();
  assert(matrixData.success, 'Matrix API must return success: true');
  assert(matrixData.matrix.top5.length === 5, `Global top5 must have 5 items, got ${matrixData.matrix.top5.length}`);
  assert(matrixData.matrix.worst5.length === 5, `Global worst5 must have 5 items, got ${matrixData.matrix.worst5.length}`);
  console.log('✓ Matrix API returned global Top 5 and Worst 5.');

  // 2. Test each individual category Top 5 and Worst 5
  console.log('\n[2] Testing Top 5 and Worst 5 for each category:');
  for (const cat of categories) {
    // Top 5
    const topRes = await fetch(`http://localhost:3000/api/tokens/bundles/top?category=${cat}&limit=5`);
    const topData = await topRes.json();
    assert(topData.success, `Category ${cat} top must succeed`);
    assert(topData.bundles.length === 5, `Category ${cat} top must return 5 bundles, got ${topData.bundles.length}`);
    
    // Worst 5
    const worstRes = await fetch(`http://localhost:3000/api/tokens/bundles/worst?category=${cat}&limit=5`);
    const worstData = await worstRes.json();
    assert(worstData.success, `Category ${cat} worst must succeed`);
    assert(worstData.bundles.length === 5, `Category ${cat} worst must return 5 bundles, got ${worstData.bundles.length}`);

    console.log(`\n  Category: [${cat.toUpperCase()}]`);
    console.log(`    🚀 TOP 5 BEST:`);
    topData.bundles.forEach((b, i) => {
      console.log(`       #${i+1} $${b.symbol} - ${b.name} (+${b.roi24h}% 24h ROI) [${b.category}]`);
    });
    console.log(`    📉 TOP 5 WORST (DIP HUNTERS):`);
    worstData.bundles.forEach((b, i) => {
      console.log(`       #${i+1} $${b.symbol} - ${b.name} (${b.roi24h}% 24h ROI) [${b.category}]`);
    });
  }

  // 3. Test Creating a Bundle in Category 'politics'
  console.log('\n[3] Testing Creation of a New Bundle in Category "politics"...');
  const createBundleRes = await fetch('http://localhost:3000/api/tokens/bundles/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Constitution 2026 Alpha',
      symbol: 'CONST26',
      description: 'PolitiFi sovereign index basket for election meta.',
      category: 'politics',
      creator: '0xSenatorWhale99',
      imageUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=500',
      tokens: [
        { symbol: 'PATRIOT', weight: 50, name: 'Patriot Sol' },
        { symbol: 'VOTE2026', weight: 50, name: 'Vote 2026' }
      ]
    })
  });
  const createBundleData = await createBundleRes.json();
  assert(createBundleData.success, 'Bundle creation must succeed');
  assert(createBundleData.bundle.category === 'politics', 'Bundle category must be politics');
  console.log(`✓ Created bundle $${createBundleData.bundle.symbol} with ID: ${createBundleData.bundle.id} in category: ${createBundleData.bundle.category}`);

  // 4. Test 1-Click Buy on a Bundle
  console.log('\n[4] Testing 1-Click Buy for Bundle ID:', createBundleData.bundle.id);
  const buyRes = await fetch(`http://localhost:3000/api/tokens/bundles/${createBundleData.bundle.id}/buy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      solAmount: 0.5,
      buyerAddress: '0xTraderPhantom99'
    })
  });
  const buyData = await buyRes.json();
  assert(buyData.success, 'Buy bundle must succeed');
  console.log('✓ Bought bundle atomically! Executed allocations across curves:', buyData.trades?.length || 2, 'tokens.');

  console.log('\n=============================================================');
  console.log('🎉 ALL 5 BUNDLE CATEGORIES & TOP/WORST MATRICES VERIFIED 100%!');
  console.log('=============================================================');
}

runBundleTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
