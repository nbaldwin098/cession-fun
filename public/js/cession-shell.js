(function(){
  const BLOCKED=new Set(['TDOGE','QPEPE','BDOGE','GRAD','TEST','DEMO']);
  const views={home:'viewHome',explore:'viewExplorePulse',pulse:'viewExplorePulse',wallet:'viewWallet',rewards:'viewRewards',ai:'viewAi',you:'viewWallet',coin:'viewCoin'};
  const tabs={home:'bnavForYou',explore:'bnavPulse',pulse:'bnavPulse',wallet:'bnavWallet',rewards:'bnavExplore',ai:'bnavYou'};
  let cached=[], activeCoin=null, exploreLane='best', homeLane='foryou';
  function toast(m){alert(m)}
  function isPhone(){return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)}
  function inMM(){return !!(window.ethereum&&window.ethereum.isMetaMask)||/MetaMaskMobile/i.test(navigator.userAgent)}
  function address(){const w=window.walletEngine;return (w&&(w.activeAddress||w.address))||localStorage.getItem('cession_address')||''}
  function saveAddr(a){if(a)localStorage.setItem('cession_address',a)}
  function isLive(c){if(!c||!c.symbol)return false;const s=String(c.symbol).toUpperCase();if(BLOCKED.has(s)||/test|demo/i.test(s+(c.name||'')))return false;return String(c.mintAddress||c.mint||'').length>=32}
  function hours(c){const t=Date.parse(c.createdAt||c.created||0);return t?Math.max(0,(Date.now()-t)/36e5):24}
  function forYouScore(c){const o=JSON.parse(localStorage.getItem('cession_signals')||'{"opens":{}}');const opens=Math.min(20,(o.opens&&o.opens[c.symbol]||0)*4);return (opens+Math.min(30,Number(c.uniqueTraders||0))+Math.min(20,Number(c.volume24hUsd||0)/500))*Math.exp(-0.05*hours(c))}
  function exploreScore(c){const trend=Math.min(40,Number(c.volume24hUsd||0)/400);const neu=Math.max(0,30-hours(c));if(exploreLane==='trending')return trend;if(exploreLane==='new')return neu;if(exploreLane==='worst')return -Number(c.change24h||0);return Number(c.change24h||0)}
  function empty(t,s){return '<div class="cx-empty"><h2>'+t+'</h2><p class="cx-muted">'+s+'</p></div>'}
  function card(c){const img=c.imageUrl||c.image||'';const chg=Number(c.change24h||0);const p=JSON.stringify({symbol:c.symbol,name:c.name||c.symbol,mint:c.mintAddress||c.mint||'',change24h:chg});return '<button class="cx-card-coin" type="button" onclick=\'CessionUI.openCoin('+p+')\'>'+(img?'<img src="'+img+'" alt="">':'')+'<div class="meta"><div class="name">'+(c.name||c.symbol)+'</div><div class="tick">'+c.symbol+(chg?(' '+(chg>0?'+':'')+chg.toFixed(1)+'%'):'')+'</div></div></button>'}
  function show(name){const key=views[name]?name:'home';document.querySelectorAll('.page-view').forEach(function(el){const on=el.id===views[key];el.classList.toggle('active',on);el.style.display=on?'block':'none'});document.querySelectorAll('.bottom-nav-slot').forEach(function(el){el.classList.remove('active')});const tab=document.getElementById(tabs[key]);if(tab)tab.classList.add('active');if(key==='home'||key==='explore')load();if(key==='wallet')sync();if(key==='rewards')loadRewards();if(key==='ai')bootAi();window.scrollTo(0,0)}
  function open(id){const m=document.getElementById(id);if(!m)return;m.style.display='flex';m.classList.add('open')}
  function close(id){const m=document.getElementById(id);if(!m)return;m.style.display='none';m.classList.remove('open')}
  async function loadBanner(){try{const r=await fetch('/api/ask/banner');const d=await r.json();const b=document.getElementById('askBanner');if(b)b.textContent='Ask  '+ (d.question||'Why are there no live coins yet?')}catch(e){}}
  async function load(){
    try{const r=await fetch('/api/pulse?lane=all&limit=50');const d=await r.json();cached=(d.feed||[]).filter(isLive)}catch(e){cached=[]}
    const q=(document.getElementById('tokenSearchInput')&&document.getElementById('tokenSearchInput').value||'').toLowerCase();
    let live=cached.filter(function(c){return !q||String(c.symbol).toLowerCase().includes(q)});
    const home=document.getElementById('forYouCoinsGrid');
    if(home){
      if(homeLane==='following'){home.innerHTML=empty('Following','Follow a creator from a coin page.');}
      else{const ranked=live.slice().sort(function(a,b){return forYouScore(b)-forYouScore(a)});if(!ranked.length)home.innerHTML=empty('No live coins yet.','Be the first to add a coin.');else{const parts=[];ranked.forEach(function(c,i){if(i&&i%6===0)parts.push('<div class="cx-ad">0.05 SOL to create. 0.50 percent trade fee.</div>');parts.push(card(c))});home.innerHTML=parts.join('')}}
    }
    const explore=document.getElementById('exploreGrid');
    const bots=document.getElementById('botsPanel');
    if(bots)bots.style.display=exploreLane==='bots'?'block':'none';
    if(exploreLane==='perps'){if(explore)explore.innerHTML=empty('Perpetuals','Not live.');return}
    if(exploreLane==='rewards'){show('rewards');return}
    if(exploreLane==='bots'){if(explore)explore.innerHTML='';loadBots();return}
    if(explore){
      let list=live.slice();
      if(exploreLane==='bundles'){explore.innerHTML=empty('No official bundles yet.','House coins only.');return}
      list.sort(function(a,b){return exploreScore(b)-exploreScore(a)});
      if(exploreLane==='best'||exploreLane==='worst')list=list.slice(0,10);
      explore.innerHTML=list.length?list.map(card).join(''):empty('No live coins yet.','Be the first to add a coin.');
    }
    loadBanner();
  }
  function setHomeLane(lane){homeLane=lane;document.getElementById('tabForYou').classList.toggle('on',lane==='foryou');document.getElementById('tabFollowing').classList.toggle('on',lane==='following');show('home')}
  function setExploreLane(lane){exploreLane=lane;document.querySelectorAll('#exploreWords button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-lane')===lane)});load()}
  function openCoin(coin){activeCoin=coin;const s=JSON.parse(localStorage.getItem('cession_signals')||'{"opens":{}}');s.opens=s.opens||{};s.opens[coin.symbol]=(s.opens[coin.symbol]||0)+1;localStorage.setItem('cession_signals',JSON.stringify(s));show('coin');document.getElementById('coinTitle').textContent=coin.name||coin.symbol;document.getElementById('coinMeta').textContent=coin.mint||'No live mint yet.'}
  function openTrade(side){if(!address()){open('walletModal');return}if(!activeCoin||!activeCoin.mint)return toast('No live mint to trade.');document.getElementById('tradeTitle').textContent=side==='sell'?'Sell':'Buy';document.getElementById('tradeCoinLabel').textContent=activeCoin.symbol||'';const p=JSON.parse(localStorage.getItem('cession_presets')||'{}');document.getElementById('tradeAmount').value=p.buySol||0.05;document.getElementById('tradeSlippage').value=p.slippage||1;open('tradeModal')}
  function savePresets(){const buy=document.getElementById('presetBuySol')||document.getElementById('tradeAmount');const slip=document.getElementById('presetSlippage')||document.getElementById('tradeSlippage');localStorage.setItem('cession_presets',JSON.stringify({buySol:parseFloat(buy&&buy.value||'0.05'),slippage:parseFloat(slip&&slip.value||'1')}));toast('Presets saved.')}
  async function sync(){
    const addr=address();const out=document.getElementById('walletScreenDisconnected');const inn=document.getElementById('walletScreenConnected');
    if(out&&inn){out.style.display=addr?'none':'block';inn.style.display=addr?'block':'none'}
    if(!addr)return;saveAddr(addr);
    document.getElementById('walletScreenAddress').textContent=addr;
    document.getElementById('settingsWalletAddress').textContent=addr;
    try{const r=await fetch('/api/wallets/'+encodeURIComponent(addr)+'/profile');const d=await r.json();document.getElementById('youCreateCount').textContent=(d.created&&d.created.length)||'none';document.getElementById('youHoldCount').textContent=(d.held&&d.held.length)||'none';document.getElementById('youTxCount').textContent=(d.transactions&&d.transactions.length)||'none'}catch(e){}
  }
  async function openStatement(){const addr=address();open('statementModal');const body=document.getElementById('statementBody');const btn=document.getElementById('statementDownloadBtn');if(!addr){body.textContent='No statements to display.';btn.style.display='none';return}try{const r=await fetch('/api/wallets/'+encodeURIComponent(addr)+'/statement');const d=await r.json();const n=d.count||(d.transactions||[]).length;if(!n){body.textContent='No statements to display.';btn.style.display='none'}else{body.textContent='Wallet '+addr+' · '+n+' trades';btn.style.display='block'}}catch(e){body.textContent='No statements to display.';btn.style.display='none'}}
  async function downloadCsv(){const addr=address();if(!addr)return toast('No statements to display.');const r=await fetch('/api/wallets/'+encodeURIComponent(addr)+'/trades');const d=await r.json();const rows=d.trades||[];if(!rows.length)return toast('No statements to display.');const csv=['time,type,symbol,sol,txHash'].concat(rows.map(function(t){return [t.time||'',t.type||'',t.symbol||'',t.sol||'',t.txHash||''].join(',')})).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='cession-statement.csv';a.click()}
  async function loadRewards(){const addr=address();const box=document.getElementById('rewardsBody');if(!addr){box.innerHTML='<p class="cx-muted">Connect a wallet. Rewards accrue from 0.25 percent holder fees after real volume. Accrued: 0 SOL.</p>';return}try{const r=await fetch('/api/ask/rewards/'+encodeURIComponent(addr));const d=await r.json();box.innerHTML='<p>'+d.status+'</p><p class="cx-muted">'+d.rule+' Accrued: '+(d.accruedSol||0)+' SOL.</p>'}catch(e){}}
  async function saveBot(){const r=await fetch('/api/ask/bots',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address:address(),symbol:document.getElementById('botSymbol').value,buySol:document.getElementById('botBuy').value})});const d=await r.json();toast(d.bot?'Saved '+d.bot.id:'Could not save bot');loadBots()}
  async function loadBots(){const r=await fetch('/api/ask/bots?address='+encodeURIComponent(address()||''));const d=await r.json();const el=document.getElementById('botList');if(el)el.textContent=(d.bots||[]).map(function(b){return b.symbol+' '+b.buySol+' SOL (not live)'}).join(' · ')||'No bots yet.'}
  function connectPhantom(){if(isPhone()&&!window.solana){location.href='https://phantom.app/ul/browse/'+encodeURIComponent(location.href);return}if(window.walletEngine&&window.walletEngine.connectPhantom)return window.walletEngine.connectPhantom();toast('Open this page in Phantom.')}
  function connectMetaMask(){if(isPhone()&&!inMM()){location.href='https://metamask.app.link/dapp/'+location.host+location.pathname;return}if(window.walletEngine&&window.walletEngine.connectMetaMask)return window.walletEngine.connectMetaMask();if(window.ethereum)window.ethereum.request({method:'eth_requestAccounts'}).then(function(a){if(a&&a[0]){saveAddr(a[0]);sync()}})}
  function addAi(who,text){const log=document.getElementById('aiLog');if(!log)return;const d=document.createElement('div');d.className='cx-msg '+who;d.textContent=text;log.appendChild(d);log.scrollTop=log.scrollHeight}
  function bootAi(){const log=document.getElementById('aiLog');if(log&&!log.dataset.ready){log.dataset.ready='1';addAi('bot','I use Cession data. Add XAI_API_KEY on Render for the full model. I can save a bot rule. I will not invent balances.')}}
  async function sendAi(){const input=document.getElementById('aiInput');const q=(input&&input.value||'').trim();if(!q)return;input.value='';addAi('me',q);try{const r=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,address:address()})});const d=await r.json();addAi('bot',d.reply||d.error||'No reply')}catch(e){addAi('bot','Ask is down.')}}
  window.CessionUI={go:show,open:open,close:close,openCreate:function(){open('deployModal')},openSettings:function(){sync();open('settingsModal')},openStatement:openStatement,downloadCsv:downloadCsv,savePresets:savePresets,openCoin:openCoin,openTrade:openTrade,confirmTrade:function(){toast('Sign this trade in your wallet.')},connectPhantom:connectPhantom,connectMetaMask:connectMetaMask,openStake:function(){open('stakeModal')},openPhantomStake:function(){location.href='https://phantom.app/ul/browse/'+encodeURIComponent('https://help.phantom.com')},sendAi:sendAi,toggleTheme:function(){const n=document.documentElement.getAttribute('data-theme')==='light'?'dark':'light';document.documentElement.setAttribute('data-theme',n);localStorage.setItem('cession_theme',n)},setHomeLane:setHomeLane,saveBot:saveBot};
  document.addEventListener('DOMContentLoaded',function(){
    document.documentElement.setAttribute('data-theme',localStorage.getItem('cession_theme')||'dark');
    const form=document.getElementById('deployCoinForm');if(form)form.addEventListener('submit',function(e){e.preventDefault();toast('Create is not live until the program is deployed.')});
    const ai=document.getElementById('aiInput');if(ai)ai.addEventListener('keydown',function(e){if(e.key==='Enter')sendAi()});
    const words=document.getElementById('exploreWords');if(words)words.addEventListener('click',function(e){const b=e.target.closest('button');if(b)setExploreLane(b.getAttribute('data-lane'))});
    if(inMM()&&window.ethereum)window.ethereum.request({method:'eth_accounts'}).then(function(a){if(a&&a[0]){saveAddr(a[0]);sync()}});
    show('home');
  });
})();
