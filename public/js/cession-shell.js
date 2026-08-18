(function(){
  const BLOCKED=new Set(['TDOGE','QPEPE','BDOGE','GRAD','TEST','DEMO']);
  const ADS=['Cession does not hold keys.','Create fee is 0.05 SOL.','Trade fee is 0.50 percent.','Rewards pay after real volume.','Park 7 SOL for the program deploy.'];
  const views={home:'viewHome',explore:'viewExplorePulse',wallet:'viewWallet',rewards:'viewRewards',perps:'viewPerps',ai:'viewAi',coin:'viewCoin'};
  const tabs={home:'bnavForYou',explore:'bnavPulse',wallet:'bnavWallet',rewards:'bnavExplore',ai:'bnavYou'};
  let cached=[], activeCoin=null, exploreLane='best', homeLane='foryou', askMode='ai';
  function toast(m){alert(m)}
  function isPhone(){return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)}
  function inMM(){return !!(window.ethereum&&window.ethereum.isMetaMask)||/MetaMaskMobile/i.test(navigator.userAgent)}
  function address(){const w=window.walletEngine;return (w&&(w.activeAddress||w.address))||localStorage.getItem('cession_address')||''}
  function saveAddr(a){if(a)localStorage.setItem('cession_address',a)}
  function profile(){try{return JSON.parse(localStorage.getItem('cession_profile')||'{}')}catch(e){return {}}}
  function pnlText(){return localStorage.getItem('cession_pnl')||'0'}
  function isLive(c){if(!c||!c.symbol)return false;const s=String(c.symbol).toUpperCase();if(BLOCKED.has(s)||/test|demo/i.test(s+(c.name||'')))return false;return String(c.mintAddress||c.mint||'').length>=32}
  function hours(c){const t=Date.parse(c.createdAt||c.created||0);return t?Math.max(0,(Date.now()-t)/36e5):24}
  function forYouScore(c){return (Math.min(30,Number(c.uniqueTraders||0))+Math.min(20,Number(c.volume24hUsd||0)/500))*Math.exp(-0.05*hours(c))}
  function exploreScore(c){if(exploreLane==='trending')return Number(c.volume24hUsd||0);if(exploreLane==='new')return -hours(c);if(exploreLane==='worst')return -Number(c.change24h||0);return Number(c.change24h||0)}
  function empty(t,s){return '<div class="cx-empty"><h2>'+t+'</h2><p class="cx-muted">'+s+'</p></div>'}
  function ad(){return '<div class="cx-ad">'+ADS[Math.floor(Math.random()*ADS.length)]+'</div>'}
  function card(c){const img=c.imageUrl||c.image||'';const chg=Number(c.change24h||0);const p=JSON.stringify({symbol:c.symbol,name:c.name||c.symbol,mint:c.mintAddress||c.mint||''});return '<button class="cx-card-coin" type="button" onclick=\'CessionUI.openCoin('+p+')\'>'+(img?'<img src="'+img+'" alt="">':'')+'<div class="meta"><div class="name">'+(c.name||c.symbol)+'</div><div class="tick">'+c.symbol+(chg?(' '+(chg>0?'+':'')+chg.toFixed(1)+'%'):'')+'</div></div></button>'}
  function setHeader(name){
    document.querySelectorAll('.cx-xtab').forEach(function(el){el.classList.remove('on')});
    const map={home:'tabForYou',perps:'tabPerps',following:'tabFollowing',rewards:'tabRewards'};
    const id=homeLane==='following'&&name==='home'?'tabFollowing':map[name];
    const el=document.getElementById(id);if(el)el.classList.add('on');
  }
  function show(name){
    const key=views[name]?name:'home';
    document.querySelectorAll('.page-view').forEach(function(el){const on=el.id===views[key];el.classList.toggle('active',on);el.style.display=on?'block':'none'});
    document.querySelectorAll('.bottom-nav-slot').forEach(function(el){el.classList.remove('active')});
    const tab=document.getElementById(tabs[key]);if(tab)tab.classList.add('active');
    setHeader(key==='home'? (homeLane==='following'?'following':'home'):key);
    if(key==='home'||key==='explore')load();
    if(key==='wallet')sync();
    if(key==='rewards')loadRewards();
    if(key==='ai'){bootAi();if(askMode==='chat')loadChat()}
    window.scrollTo(0,0);
  }
  function open(id){const m=document.getElementById(id);if(!m)return;m.style.display='flex';m.classList.add('open')}
  function close(id){const m=document.getElementById(id);if(!m)return;m.style.display='none';m.classList.remove('open')}
  async function load(){
    try{const r=await fetch('/api/pulse?lane=all&limit=50');const d=await r.json();cached=(d.feed||[]).filter(isLive)}catch(e){cached=[]}
    const live=cached.slice();
    const home=document.getElementById('forYouCoinsGrid');
    if(home){
      const parts=[ad()];
      if(homeLane==='following') parts.push(empty('Following','Follow a creator from a coin page.'));
      else {
        const ranked=live.slice().sort(function(a,b){return forYouScore(b)-forYouScore(a)});
        if(!ranked.length) parts.push(empty('No live coins yet.','Be the first to add a coin.'));
        ranked.forEach(function(c,i){if(i&&i%5===0)parts.push(ad());parts.push(card(c))});
      }
      parts.push(ad());
      home.innerHTML=parts.join('');
    }
    const explore=document.getElementById('exploreGrid');
    if(explore){
      if(exploreLane==='bundles') explore.innerHTML=empty('No official bundles yet.','House coins only.');
      else {
        let list=live.slice().sort(function(a,b){return exploreScore(b)-exploreScore(a)});
        if(exploreLane==='best'||exploreLane==='worst') list=list.slice(0,10);
        explore.innerHTML=list.length?list.map(card).join(''):empty('No live coins yet.','Be the first to add a coin.');
      }
    }
    try{const r=await fetch('/api/ask/banner');const d=await r.json();const b=document.getElementById('askBanner');if(b)b.textContent='Ask  '+(d.question||'')}catch(e){}
  }
  function setHomeLane(lane){homeLane=lane;show('home')}
  function setExploreLane(lane){exploreLane=lane;document.querySelectorAll('#exploreWords button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-lane')===lane)});load()}
  function openCoin(coin){activeCoin=coin;show('coin');document.getElementById('coinTitle').textContent=coin.name||coin.symbol;document.getElementById('coinMeta').textContent=coin.mint||'No live mint yet.'}
  function openTrade(side){if(!address()){open('walletModal');return}if(!activeCoin||!activeCoin.mint)return toast('No live mint to trade.');document.getElementById('tradeTitle').textContent=side==='sell'?'Sell':'Buy';document.getElementById('tradeCoinLabel').textContent=activeCoin.symbol||'';open('tradeModal')}
  function savePresets(){
    const p=profile();
    p.name=document.getElementById('profileNameInput').value||p.name||'anon';
    p.avatar=document.getElementById('profileAvatarInput').value||p.avatar||'';
    localStorage.setItem('cession_profile',JSON.stringify(p));
    localStorage.setItem('cession_presets',JSON.stringify({buySol:parseFloat(document.getElementById('presetBuySol').value||'0.05'),slippage:parseFloat(document.getElementById('presetSlippage').value||'1')}));
    paintProfile();toast('Saved.');
  }
  function paintProfile(){
    const p=profile();
    document.getElementById('profileName').textContent=p.name||'anon';
    const av=document.getElementById('profileAvatar');if(p.avatar)av.src=p.avatar;
    const pnl=document.getElementById('profilePnl');pnl.textContent='P/L '+pnlText();pnl.classList.toggle('down',String(pnlText()).indexOf('-')===0);
  }
  async function sync(){
    paintProfile();
    const addr=address();
    const out=document.getElementById('walletScreenDisconnected');
    const inn=document.getElementById('walletScreenConnected');
    if(out&&inn){out.style.display=addr?'none':'block';inn.style.display=addr?'block':'none'}
    document.getElementById('walletScreenAddress').textContent=addr||'Not connected';
    if(!addr)return;saveAddr(addr);
    try{const r=await fetch('/api/wallets/'+encodeURIComponent(addr)+'/profile');const d=await r.json();document.getElementById('youCreateCount').textContent=(d.created&&d.created.length)||'none';document.getElementById('youHoldCount').textContent=(d.held&&d.held.length)||'none';document.getElementById('youTxCount').textContent=(d.transactions&&d.transactions.length)||'none'}catch(e){}
    loadBots();
  }
  async function openStatement(){const addr=address();open('statementModal');const body=document.getElementById('statementBody');const btn=document.getElementById('statementDownloadBtn');if(!addr){body.textContent='No statements to display.';btn.style.display='none';return}try{const r=await fetch('/api/wallets/'+encodeURIComponent(addr)+'/statement');const d=await r.json();const n=d.count||(d.transactions||[]).length;if(!n){body.textContent='No statements to display.';btn.style.display='none'}else{body.textContent='Wallet '+addr+' · '+n+' trades';btn.style.display='block'}}catch(e){body.textContent='No statements to display.';btn.style.display='none'}}
  async function downloadCsv(){const addr=address();if(!addr)return toast('No statements to display.');const r=await fetch('/api/wallets/'+encodeURIComponent(addr)+'/trades');const d=await r.json();const rows=d.trades||[];if(!rows.length)return toast('No statements to display.');const csv=['time,type,symbol,sol,txHash'].concat(rows.map(function(t){return [t.time||'',t.type||'',t.symbol||'',t.sol||'',t.txHash||''].join(',')})).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='cession-statement.csv';a.click()}
  async function loadRewards(){const addr=address();const box=document.getElementById('rewardsBody');try{const r=await fetch('/api/ask/rewards/'+encodeURIComponent(addr||'none'));const d=await r.json();box.innerHTML='<p>'+d.status+'</p><p class="cx-muted">'+d.rule+'</p>'}catch(e){box.textContent='Not live yet.'}}
  async function saveBot(){const r=await fetch('/api/ask/bots',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address:address(),type:document.getElementById('botType').value,symbol:document.getElementById('botSymbol').value,buySol:document.getElementById('botBuy').value,interval:document.getElementById('botInterval').value})});const d=await r.json();toast(d.notice||'Saved');loadBots()}
  async function loadBots(){const r=await fetch('/api/ask/bots?address='+encodeURIComponent(address()||''));const d=await r.json();const el=document.getElementById('botList');if(el)el.textContent=(d.bots||[]).map(function(b){return (b.type||'dca')+' '+b.symbol+' '+b.buySol+' SOL'}).join(' · ')||'No bots yet.'}
  function setAskMode(mode){askMode=mode;document.getElementById('askAiBox').style.display=mode==='ai'?'flex':'none';document.getElementById('askChatBox').style.display=mode==='chat'?'flex':'none';if(mode==='chat')loadChat()}
  function addLine(id,who,text){const log=document.getElementById(id);if(!log)return;const d=document.createElement('div');d.className='cx-msg '+who;d.textContent=text;log.appendChild(d);log.scrollTop=log.scrollHeight}
  function bootAi(){const log=document.getElementById('aiLog');if(log&&!log.dataset.ready){log.dataset.ready='1';addLine('aiLog','bot','I use Cession data only.')}}
  async function sendAi(){const input=document.getElementById('aiInput');const q=(input.value||'').trim();if(!q)return;input.value='';addLine('aiLog','me',q);const r=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,address:address()})});const d=await r.json();addLine('aiLog','bot',d.reply||'No reply')}
  async function loadChat(){const r=await fetch('/api/ask/chat');const d=await r.json();const log=document.getElementById('chatLog');if(!log)return;log.innerHTML='';(d.messages||[]).forEach(function(m){addLine('chatLog','bot',(m.username||'anon')+'  P/L '+(m.pnl||'0')+'  '+m.text)})}
  async function sendChat(){const input=document.getElementById('chatInput');const q=(input.value||'').trim();if(!q)return;input.value='';const p=profile();await fetch('/api/ask/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:q,address:address(),username:p.name||'anon',pnl:pnlText()})});loadChat()}
  function connectPhantom(){if(isPhone()&&!window.solana){location.href='https://phantom.app/ul/browse/'+encodeURIComponent(location.href);return}if(window.walletEngine&&window.walletEngine.connectPhantom)return window.walletEngine.connectPhantom()}
  function connectMetaMask(){if(isPhone()&&!inMM()){location.href='https://metamask.app.link/dapp/'+location.host+location.pathname;return}if(window.ethereum)window.ethereum.request({method:'eth_requestAccounts'}).then(function(a){if(a&&a[0]){saveAddr(a[0]);sync()}})}
  window.CessionUI={go:show,open:open,close:close,openCreate:function(){open('deployModal')},openSettings:function(){open('settingsModal')},openStatement:openStatement,downloadCsv:downloadCsv,savePresets:savePresets,openCoin:openCoin,openTrade:openTrade,confirmTrade:function(){toast('Sign this trade in your wallet.')},connectPhantom:connectPhantom,connectMetaMask:connectMetaMask,openStake:function(){open('stakeModal')},openPhantomStake:function(){location.href='https://phantom.app/ul/browse/'+encodeURIComponent('https://help.phantom.com')},sendAi:sendAi,sendChat:sendChat,setAskMode:setAskMode,setHomeLane:setHomeLane,saveBot:saveBot};
  document.addEventListener('DOMContentLoaded',function(){
    const form=document.getElementById('deployCoinForm');if(form)form.addEventListener('submit',function(e){e.preventDefault();toast('Create is not live until the program is deployed.')});
    const words=document.getElementById('exploreWords');if(words)words.addEventListener('click',function(e){const b=e.target.closest('button');if(b)setExploreLane(b.getAttribute('data-lane'))});
    const ai=document.getElementById('aiInput');if(ai)ai.addEventListener('keydown',function(e){if(e.key==='Enter')sendAi()});
    const ch=document.getElementById('chatInput');if(ch)ch.addEventListener('keydown',function(e){if(e.key==='Enter')sendChat()});
    paintProfile();show('home');
  });
})();
