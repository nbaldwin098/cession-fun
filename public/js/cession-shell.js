(function(){
  const BLOCKED=new Set(['TDOGE','QPEPE','BDOGE','GRAD','TEST','DEMO']);
  const ADS=['Cession does not hold keys.','Create fee is 0.05 SOL.','Trade fee is 0.50 percent.','Rewards pay after real volume.'];
  const views={home:'viewHome',explore:'viewExplorePulse',wallet:'viewWallet',rewards:'viewRewards',perps:'viewPerps',ai:'viewAi',coin:'viewCoin',bots:'viewBots'};
  const tabs={home:'bnavForYou',explore:'bnavPulse',wallet:'bnavWallet',rewards:'bnavExplore',ai:'bnavYou'};
  let cached=[], activeCoin=null, exploreLane='best', homeLane='foryou', askMode='ai', pnlRange='7d', chatTimer=null;
  function toast(m){alert(m)}
  function isPhone(){return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)}
  function address(){const w=window.walletEngine;return (w&&(w.activeAddress||w.address))||localStorage.getItem('cession_address')||''}
  function saveAddr(a){if(a)localStorage.setItem('cession_address',a)}
  function isLive(c){if(!c||!c.symbol)return false;const s=String(c.symbol).toUpperCase();if(BLOCKED.has(s)||/test|demo/i.test(s+(c.name||'')))return false;return String(c.mintAddress||c.mint||'').length>=32}
  function hours(c){const t=Date.parse(c.createdAt||c.created||0);return t?Math.max(0,(Date.now()-t)/36e5):24}
  function forYouScore(c){return (Math.min(30,Number(c.uniqueTraders||0))+Math.min(20,Number(c.volume24hUsd||0)/500))*Math.exp(-0.05*hours(c))}
  function exploreScore(c){if(exploreLane==='trending')return Number(c.volume24hUsd||0);if(exploreLane==='new')return -hours(c);if(exploreLane==='worst')return -Number(c.change24h||0);return Number(c.change24h||0)}
  function empty(t,s){return '<div class="cx-empty"><h2>'+t+'</h2><p class="cx-muted">'+s+'</p></div>'}
  function ad(){return '<div class="cx-ad">'+ADS[Math.floor(Math.random()*ADS.length)]+'</div>'}
  function card(c){const img=c.imageUrl||c.image||'';const chg=Number(c.change24h||0);const p=JSON.stringify({symbol:c.symbol,name:c.name||c.symbol,mint:c.mintAddress||c.mint||''});return '<button class="cx-card-coin" type="button" onclick=\'CessionUI.openCoin('+p+')\'>'+(img?'<img src="'+img+'" alt="">':'')+'<div class="meta"><div class="name">'+(c.name||c.symbol)+'</div><div class="tick">'+c.symbol+(chg?(' '+(chg>0?'+':'')+chg.toFixed(1)+'%'):'')+'</div></div></button>'}
  function show(name){
    const key=views[name]?name:'home';
    document.querySelectorAll('.page-view').forEach(function(el){const on=el.id===views[key];el.classList.toggle('active',on);el.style.display=on?'block':'none'});
    document.querySelectorAll('.bottom-nav-slot').forEach(function(el){el.classList.remove('active')});
    const tab=document.getElementById(tabs[key]);if(tab)tab.classList.add('active');
    document.querySelectorAll('.cx-xtab').forEach(function(el){el.classList.remove('on')});
    const hid=key==='home'?(homeLane==='following'?'tabFollowing':'tabForYou'):key==='perps'?'tabPerps':key==='rewards'?'tabRewards':null;
    if(hid){const h=document.getElementById(hid);if(h)h.classList.add('on')}
    if(key==='home'||key==='explore')load();
    if(key==='wallet')sync();
    if(key==='rewards')loadRewards();
    if(key==='bots')loadBots();
    if(key==='ai'){bootAi();if(askMode==='chat')startChat()} else stopChat();
    window.scrollTo(0,0);
  }
  function open(id){const m=document.getElementById(id);if(!m)return;m.style.display='flex';m.classList.add('open')}
  function close(id){const m=document.getElementById(id);if(!m)return;m.style.display='none';m.classList.remove('open')}
  async function load(){
    try{const r=await fetch('/api/pulse?lane=all&limit=50');const d=await r.json();cached=(d.feed||[]).filter(isLive)}catch(e){cached=[]}
    const home=document.getElementById('forYouCoinsGrid');
    if(home){
      const parts=[ad()];
      if(homeLane==='following') parts.push(empty('Following','Follow a creator from a coin page.'));
      else {
        const ranked=cached.slice().sort(function(a,b){return forYouScore(b)-forYouScore(a)});
        if(!ranked.length) parts.push(empty('No live coins yet.','Be the first to add a coin.'));
        ranked.forEach(function(c,i){if(i&&i%5===0)parts.push(ad());parts.push(card(c))});
      }
      parts.push(ad());home.innerHTML=parts.join('');
    }
    const explore=document.getElementById('exploreGrid');
    if(explore){
      if(exploreLane==='bundles') explore.innerHTML=empty('No official bundles yet.','House coins only.');
      else {
        let list=cached.slice().sort(function(a,b){return exploreScore(b)-exploreScore(a)});
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
  function savePresets(){localStorage.setItem('cession_presets',JSON.stringify({buySol:parseFloat(document.getElementById('presetBuySol').value||'0.05'),slippage:parseFloat(document.getElementById('presetSlippage').value||'1')}));toast('Saved.')}
  function drawPnl(points){
    const c=document.getElementById('pnlChart');if(!c)return;const ctx=c.getContext('2d');const w=c.width,h=c.height;
    ctx.clearRect(0,0,w,h);ctx.strokeStyle='#3dd68c';ctx.lineWidth=2;ctx.beginPath();
    const vals=points&&points.length?points.map(function(p){return p.v}):[];
    if(!vals.length){for(let i=0;i<8;i++)vals.push(0)}
    const min=Math.min.apply(null,vals.concat(0)),max=Math.max.apply(null,vals.concat(0.01));
    vals.forEach(function(v,i){const x=i/(vals.length-1||1)*w;const y=h-8-((v-min)/(max-min||1))*(h-16);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)});
    ctx.stroke();
  }
  async function loadPnl(){
    const addr=address();if(!addr){drawPnl([]);return}
    try{const r=await fetch('/api/wallets/'+encodeURIComponent(addr)+'/pnl?range='+pnlRange);const d=await r.json();document.getElementById('profilePnl').textContent='P/L '+(d.total||0);localStorage.setItem('cession_pnl',String(d.total||0));drawPnl(d.points||[])}catch(e){drawPnl([])}
  }
  async function loadProfile(){
    const addr=address();if(!addr)return;
    try{
      const r=await fetch('/api/auth/profile/'+encodeURIComponent(addr));const d=await r.json();
      if(d.username) document.getElementById('profileName').textContent=d.username;
      if(d.avatar) document.getElementById('profileAvatar').src=d.avatar;
      if(d.exists && !d.usernameLocked) open('usernameModal');
      if(!d.exists) open('usernameModal');
    }catch(e){}
  }
  async function lockUsername(){
    const name=document.getElementById('newUsername').value;
    const r=await fetch('/api/auth/username',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address:address(),username:name})});
    const d=await r.json();if(!d.success)return toast(d.error||'Could not save');document.getElementById('profileName').textContent=d.username;close('usernameModal');
  }
  async function saveAvatar(dataUrl){
    await fetch('/api/auth/avatar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address:address(),avatar:dataUrl})});
    document.getElementById('profileAvatar').src=dataUrl;
  }
  async function sync(){
    const addr=address();
    const out=document.getElementById('walletScreenDisconnected');
    const inn=document.getElementById('walletScreenConnected');
    if(out&&inn){out.style.display=addr?'none':'block';inn.style.display=addr?'block':'none'}
    document.getElementById('walletScreenAddress').textContent=addr||'Not connected';
    if(!addr){drawPnl([]);return}saveAddr(addr);loadProfile();loadPnl();
    try{const r=await fetch('/api/wallets/'+encodeURIComponent(addr)+'/profile');const d=await r.json();document.getElementById('youCreateCount').textContent=(d.created&&d.created.length)||'none';document.getElementById('youHoldCount').textContent=(d.held&&d.held.length)||'none';document.getElementById('youTxCount').textContent=(d.transactions&&d.transactions.length)||'none'}catch(e){}
  }
  async function openStatement(){const addr=address();open('statementModal');const body=document.getElementById('statementBody');const btn=document.getElementById('statementDownloadBtn');if(!addr){body.textContent='No statements to display.';btn.style.display='none';return}try{const r=await fetch('/api/wallets/'+encodeURIComponent(addr)+'/statement');const d=await r.json();const n=d.count||(d.transactions||[]).length;if(!n){body.textContent='No statements to display.';btn.style.display='none'}else{body.textContent='Wallet '+addr+' · '+n+' trades';btn.style.display='block'}}catch(e){body.textContent='No statements to display.';btn.style.display='none'}}
  async function downloadCsv(){const addr=address();if(!addr)return toast('No statements to display.');const r=await fetch('/api/wallets/'+encodeURIComponent(addr)+'/trades');const d=await r.json();const rows=d.trades||[];if(!rows.length)return toast('No statements to display.');const csv=['time,type,symbol,sol,txHash'].concat(rows.map(function(t){return [t.time||'',t.type||'',t.symbol||'',t.sol||'',t.txHash||''].join(',')})).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='cession-statement.csv';a.click()}
  async function loadRewards(){try{const r=await fetch('/api/ask/rewards/'+encodeURIComponent(address()||'none'));const d=await r.json();document.getElementById('rewardsBody').innerHTML='<p>'+d.status+'</p><p class="cx-muted">'+d.rule+'</p>'}catch(e){}}
  async function saveBot(){const r=await fetch('/api/ask/bots',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address:address(),type:document.getElementById('botType').value,symbol:document.getElementById('botSymbol').value,buySol:document.getElementById('botBuy').value,interval:document.getElementById('botInterval').value})});const d=await r.json();toast(d.notice||'Saved');loadBots()}
  async function loadBots(){const r=await fetch('/api/ask/bots?address='+encodeURIComponent(address()||''));const d=await r.json();const el=document.getElementById('botList');if(el)el.textContent=(d.bots||[]).map(function(b){return (b.type||'dca')+' '+b.symbol+' '+b.buySol+' SOL'}).join(' · ')||'No bots yet.'}
  function setAskMode(mode){askMode=mode;document.getElementById('askAiBox').style.display=mode==='ai'?'flex':'none';document.getElementById('askChatBox').style.display=mode==='chat'?'flex':'none';if(mode==='chat')startChat();else stopChat()}
  function addLine(id,who,html){const log=document.getElementById(id);if(!log)return;const d=document.createElement('div');d.className='cx-msg '+who;d.innerHTML=html;log.appendChild(d);log.scrollTop=log.scrollHeight}
  function bootAi(){const log=document.getElementById('aiLog');if(log&&!log.dataset.ready){log.dataset.ready='1';addLine('aiLog','bot','Ask anything. I also have live Cession coin data.')}}
  async function sendAi(){const input=document.getElementById('aiInput');const q=(input.value||'').trim();if(!q)return;input.value='';addLine('aiLog','me',q.replace(/</g,''));const r=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,address:address()})});const d=await r.json();addLine('aiLog','bot',(d.reply||'No reply').replace(/</g,''))}
  function chatHtml(m){const media=m.media?' <img src="'+m.media+'" alt="">':'';return (m.username||'anon')+'  P/L '+(m.pnl||'0')+'  '+(m.text||'')+media}
  async function loadChat(){const r=await fetch('/api/ask/chat');const d=await r.json();const log=document.getElementById('chatLog');if(!log)return;log.innerHTML='';(d.messages||[]).forEach(function(m){addLine('chatLog','bot',chatHtml(m))})}
  function startChat(){loadChat();if(chatTimer)clearInterval(chatTimer);chatTimer=setInterval(loadChat,2500)}
  function stopChat(){if(chatTimer){clearInterval(chatTimer);chatTimer=null}}
  async function sendChat(){const input=document.getElementById('chatInput');const q=(input.value||'').trim();if(!q)return;input.value='';const media=/^https?:\/\/\S+\.(gif|png|webp|jpg|jpeg)(\?.*)?$/i.test(q)?q:'';await fetch('/api/ask/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:media?'':q,media:media||null,address:address(),username:document.getElementById('profileName').textContent,pnl:localStorage.getItem('cession_pnl')||'0'})});loadChat()}
  async function claimTicket(id){
    if(!id)return false;
    try{
      const s=await fetch('/api/auth/ticket/'+id);const row=await s.json();
      if(row.status==='complete'&&row.address){saveAddr(row.address);localStorage.removeItem('cession_ticket');sync();show('wallet');return true}
    }catch(e){}
    return false;
  }
  function pendingTicket(){return localStorage.getItem('cession_ticket')||''}
  async function startTicket(provider){
    const r=await fetch('/api/auth/ticket',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider})});
    const d=await r.json();
    localStorage.setItem('cession_ticket',d.ticket);
    const hint=document.getElementById('connectHint');
    if(hint)hint.innerHTML='Approve in the wallet. Then come back here and tap I approved.';
    const authUrl=d.authUrl;
    if(isPhone()){
      if(provider==='phantom') location.href='https://phantom.app/ul/browse/'+encodeURIComponent(authUrl);
      else location.href='https://metamask.app.link/dapp/'+location.host+'/auth.html?ticket='+d.ticket+'&provider=metamask';
    } else window.open(authUrl,'_blank');
  }
  function connectPhantom(){if(window.solana){window.solana.connect().then(function(res){if(res.publicKey){saveAddr(res.publicKey.toString());sync()}});return}startTicket('phantom')}
  function connectMetaMask(){if(window.ethereum){window.ethereum.request({method:'eth_requestAccounts'}).then(function(a){if(a&&a[0]){saveAddr(a[0]);sync()}});return}startTicket('metamask')}
  window.CessionUI={go:show,open:open,close:close,openCreate:function(){open('deployModal')},openSettings:function(){open('settingsModal')},openStatement:openStatement,downloadCsv:downloadCsv,savePresets:savePresets,openCoin:openCoin,openTrade:openTrade,confirmTrade:function(){toast('Sign this trade in your wallet.')},connectPhantom:connectPhantom,connectMetaMask:connectMetaMask,claimApproved:function(){claimTicket(pendingTicket()).then(function(ok){if(!ok)toast('Not approved yet. Approve in the wallet, then tap again.')})},openStake:function(){open('stakeModal')},openPhantomStake:function(){location.href='https://phantom.app/ul/browse/'+encodeURIComponent('https://help.phantom.com')},sendAi:sendAi,sendChat:sendChat,setAskMode:setAskMode,setHomeLane:setHomeLane,saveBot:saveBot,lockUsername:lockUsername};
  document.addEventListener('DOMContentLoaded',function(){
    const form=document.getElementById('deployCoinForm');if(form)form.addEventListener('submit',function(e){e.preventDefault();toast('Create is not live until the program is deployed.')});
    const words=document.getElementById('exploreWords');if(words)words.addEventListener('click',function(e){const b=e.target.closest('button');if(b)setExploreLane(b.getAttribute('data-lane'))});
    const ranges=document.getElementById('pnlRange');if(ranges)ranges.addEventListener('click',function(e){const b=e.target.closest('button');if(!b)return;pnlRange=b.getAttribute('data-range');ranges.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x===b)});loadPnl()});
    const file=document.getElementById('avatarFile');if(file)file.addEventListener('change',function(){const f=file.files&&file.files[0];if(!f)return;const r=new FileReader();r.onload=function(){saveAvatar(r.result)};r.readAsDataURL(f)});
    const brand=document.getElementById('footerBrand');
    if(brand){brand.addEventListener('click',function(){brand.classList.toggle('open')});brand.addEventListener('mouseleave',function(){brand.classList.remove('open')})}
    const hint=document.getElementById('connectHint');
    if(hint&&!document.getElementById('claimBtn')){
      const b=document.createElement('button');b.id='claimBtn';b.className='cx-door';b.type='button';b.textContent='I approved';b.onclick=function(){CessionUI.claimApproved()};hint.parentNode.appendChild(b);
    }
    const q=new URLSearchParams(location.search);
    const ticket=q.get('authTicket')||pendingTicket();
    if(ticket)claimTicket(ticket);
    document.addEventListener('visibilitychange',function(){if(!document.hidden)claimTicket(pendingTicket())});
    window.addEventListener('pageshow',function(){claimTicket(pendingTicket())});
    window.addEventListener('focus',function(){claimTicket(pendingTicket())});
    const ai=document.getElementById('aiInput');if(ai)ai.addEventListener('keydown',function(e){if(e.key==='Enter')sendAi()});
    const ch=document.getElementById('chatInput');if(ch)ch.addEventListener('keydown',function(e){if(e.key==='Enter')sendChat()});
    show('home');
  });
})();
