(function(){
  const BLOCKED=new Set(['TDOGE','QPEPE','BDOGE','GRAD','TEST','DEMO']);
  const ADS=['Cession does not hold keys.','Create fee is 0.05 SOL.','Trade fee is 0.50 percent.','Rewards pay after real volume.'];
  const views={home:'viewHome',explore:'viewExplorePulse',wallet:'viewWallet',rewards:'viewRewards',perps:'viewPerps',ai:'viewAi',coin:'viewCoin',bots:'viewBots'};
  const tabs={home:'bnavForYou',explore:'bnavPulse',wallet:'bnavWallet',rewards:'bnavExplore',ai:'bnavYou'};
  let cached=[], activeCoin=null, exploreLane='best', homeLane='foryou', askMode='ai', pnlRange='7d', chatTimer=null, coinTimer=null;
  function toast(m){alert(m)}
  function isPhone(){return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)}
  function address(){const w=window.walletEngine;return (w&&(w.activeAddress||w.address))||localStorage.getItem('cession_address')||''}
  function saveAddr(a){if(a)localStorage.setItem('cession_address',a)}
  function isLive(c){if(!c||!c.symbol)return false;const s=String(c.symbol).toUpperCase();if(BLOCKED.has(s)||/test|demo/i.test(s+(c.name||'')))return false;return String(c.mintAddress||c.mint||'').length>=32}
  function shortMint(mint){const value=String(mint||'');return value.length>6?value.slice(0,3)+'...'+value.slice(-3):value}
  function hours(c){const t=Date.parse(c.createdAt||c.created||0);return t?Math.max(0,(Date.now()-t)/36e5):24}
  function forYouScore(c){return (Math.min(30,Number(c.uniqueTraders||0))+Math.min(20,Number(c.volume24hUsd||0)/500))*Math.exp(-0.05*hours(c))}
  function exploreScore(c){if(exploreLane==='trending')return Number(c.volume24hUsd||0);const chg=Number(c.change24hPercent!==undefined?c.change24hPercent:c.change24h||0);if(exploreLane==='new')return -hours(c);if(exploreLane==='worst')return -chg;return chg}
  function passesDiscoveryFilters(c){const age=Number(document.getElementById('filterAge')&&document.getElementById('filterAge').value||0);const volume=Number(document.getElementById('filterVolume')&&document.getElementById('filterVolume').value||0);const liquidity=Number(document.getElementById('filterLiquidity')&&document.getElementById('filterLiquidity').value||0);const holders=Number(document.getElementById('filterHolders')&&document.getElementById('filterHolders').value||0);const safetyRequired=Boolean(document.getElementById('filterVerified')&&document.getElementById('filterVerified').checked);return (!age||hours(c)<=age)&&Number(c.volume24hUsd||0)>=volume&&Number(c.realSolRaised||0)>=liquidity&&Number(c.holdersCount||0)>=holders&&(!safetyRequired||Number(c.safetyAudit&&c.safetyAudit.score||0)>=90)}
  function empty(t,s){return '<div class="cx-empty"><h2>'+t+'</h2><p class="cx-muted">'+s+'</p></div>'}
  function ad(){return '<div class="cx-ad">'+ADS[Math.floor(Math.random()*ADS.length)]+'</div>'}
  function fmtMoney(v){const n=Number(v||0);if(n>=1e6)return '$'+(n/1e6).toFixed(1)+'M';if(n>=1e3)return '$'+(n/1e3).toFixed(1)+'K';return '$'+n.toFixed(0)}
  // Shared card visuals: real change %, market cap, safety-audit tier, and bonding-curve
  // graduation progress — all sourced straight from the pulse feed, nothing fabricated.
  function cardVisuals(c){
    const chg=Number(c.change24hPercent!==undefined?c.change24hPercent:c.change24h||0);
    const chgCls=chg>0?'up':chg<0?'down':'';
    const chgChip=chg?('<span class="cx-chip cx-chip-chg '+chgCls+'"><span class="arrow">'+(chg>0?'\u25B2':'\u25BC')+'</span>'+(chg>0?'+':'')+chg.toFixed(1)+'%</span>'):'';
    const mc=Number(c.marketCapUsd||0);
    const mcChip=mc?('<span class="cx-chip cx-chip-mc">'+fmtMoney(mc)+' MC</span>'):'';
    const safety=Number((c.safetyAudit&&c.safetyAudit.score)||c.safetyScore||0);
    const tier=safety>=90?'tier-a':safety>=70?'tier-b':'tier-c';
    const safeChip=safety?('<span class="cx-chip cx-chip-safe '+tier+'"><span class="dot"></span>'+safety+'</span>'):'';
    const pct=Math.max(0,Math.min(100,Number(c.curveProgressPercent||0)));
    const graduated=Boolean(c.isGraduated)||pct>=100;
    const curveBar='<div class="cx-curve-wrap"><div class="cx-curve-label"><span>'+(graduated?'Graduated':'To graduation')+'</span><span>'+Math.round(pct)+'%</span></div><div class="cx-curve-track"><div class="cx-curve-fill'+(graduated?' graduated':'')+'" style="width:'+pct+'%"></div></div></div>';
    return '<div class="cx-stat-row">'+chgChip+mcChip+safeChip+'</div>'+curveBar;
  }
  function card(c){const img=c.imageUrl||c.image||'';const mint=c.mintAddress||c.mint||'';const p=JSON.stringify({symbol:c.symbol,name:c.name||c.symbol,mint:mint});return '<button class="cx-card-coin" type="button" onclick=\'CessionUI.openCoin('+p+')\'>'+(img?'<img src="'+img+'" alt="">':'')+'<div class="meta"><div class="name">'+(c.name||c.symbol)+'</div><div class="tick">'+c.symbol+'</div><div class="tick">'+shortMint(mint)+'</div></div>'+cardVisuals(c)+'</button>'}
  function show(name){
    const key=views[name]?name:'home';
    document.querySelectorAll('.page-view').forEach(function(el){const on=el.id===views[key];el.classList.toggle('active',on);el.style.display=on?'block':'none'});
    document.querySelectorAll('.bottom-nav-slot').forEach(function(el){el.classList.remove('active')});
    const tab=document.getElementById(tabs[key]);if(tab)tab.classList.add('active');
    document.querySelectorAll('.cx-xtab').forEach(function(el){el.classList.remove('on')});
    const hid=key==='home'?(homeLane==='following'?'tabFollowing':'tabForYou'):key==='perps'?'tabPerps':key==='rewards'?'tabRewards':key==='ai'?'tabAi':key==='bots'?'tabBots':null;
    if(hid){const h=document.getElementById(hid);if(h)h.classList.add('on')}
    if(key==='home'||key==='explore')load();
    if(key==='wallet')sync();
    if(key==='rewards')loadRewards();
    if(key==='bots')loadBots();
    if(key==='ai'){bootAi();if(askMode==='chat')startChat()} else stopChat();
    if(key!=='coin'&&coinTimer){clearInterval(coinTimer);coinTimer=null}
    window.scrollTo(0,0);
  }
  function open(id){const m=document.getElementById(id);if(!m)return;m.style.display='flex';m.classList.add('open')}
  function close(id){const m=document.getElementById(id);if(!m)return;m.style.display='none';m.classList.remove('open')}
  async function load(){
    try{const r=await fetch('/api/pulse?lane=all&limit=50');const d=await r.json();cached=(d.feed||[]).filter(isLive)}catch(e){cached=[]}
    const home=document.getElementById('forYouCoinsGrid');
    if(home){
      const parts=[ad()];
      if(homeLane==='following'){
        const who=address();
        if(!who) parts.push(empty('Following','Connect a wallet to track creators you follow.'));
        else {
          let followed=new Set();
          try{
            const fr=await fetch('/api/wallets/'+encodeURIComponent(who)+'/following');
            const fd=await fr.json();
            followed=new Set((fd.follows||[]).map(function(row){return String(row.creator||'').toLowerCase()}));
          }catch(e){}
          const ranked=cached.filter(function(c){return followed.has(String(c.creator||'').toLowerCase())}).sort(function(a,b){return forYouScore(b)-forYouScore(a)});
          if(!ranked.length) parts.push(empty('Following','Follow a creator from a coin page.'));
          ranked.forEach(function(c,i){if(i&&i%5===0)parts.push(ad());parts.push(card(c))});
        }
      } else {
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
        let list=cached.filter(passesDiscoveryFilters).sort(function(a,b){return exploreScore(b)-exploreScore(a)});
        if(exploreLane==='best'||exploreLane==='worst') list=list.slice(0,10);
        explore.innerHTML=list.length?list.map(card).join(''):empty('No live coins yet.','Be the first to add a coin.');
      }
    }
    try{const r=await fetch('/api/ask/banner');const d=await r.json();const b=document.getElementById('askBanner');if(b)b.textContent='Ask  '+(d.question||'')}catch(e){}
  }
  function setHomeLane(lane){homeLane=lane;show('home')}
  function setExploreLane(lane){exploreLane=lane;document.querySelectorAll('#exploreWords button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-lane')===lane)});load()}
  function setTradeStatus(state,message){const status=document.getElementById('coinTradeStatus');if(!status)return;status.dataset.state=state;status.textContent=message}
  function renderTradeFeed(trades){const feed=document.getElementById('coinTradeFeedRows');if(!feed)return;feed.textContent='';if(!trades||!trades.length){feed.textContent='No confirmed trades yet.';return}trades.slice(0,12).forEach(function(trade){const row=document.createElement('div');const side=String(trade.type||trade.side||'BUY').toLowerCase();row.className='cx-live-trade '+(side==='sell'?'sell':'buy');const detail=document.createElement('span');detail.textContent=(side==='sell'?'SELL ':'BUY ')+(Number(trade.amountSol||trade.solAmount||0)).toFixed(4)+' SOL';const time=document.createElement('span');time.textContent=trade.time||'Now';row.appendChild(detail);row.appendChild(time);feed.appendChild(row)})}
  function renderCoin(coin){const mint=coin.mintAddress||coin.mint||'';const safety=coin.safetyAudit||{};const creatorStats=coin.creatorStats||{};const warnings=(safety.warnings||[]).join(', ')||'No reported flags';activeCoin=coin;document.getElementById('coinTitle').textContent=coin.name||coin.symbol;document.getElementById('coinMeta').textContent=mint||'No live mint yet.';document.getElementById('coinTrust').textContent=mint.length>=32?'Mint available':'Mint unavailable';document.getElementById('coinCreator').textContent=(shortMint(coin.creator)||'Unknown')+' · '+(creatorStats.launches||0)+' launches';document.getElementById('coinSafety').textContent=(safety.grade||'Unrated')+' · '+(safety.score||0)+'/100';document.getElementById('coinWarnings').textContent=warnings;document.getElementById('coinStats').textContent=(coin.holdersCount||0)+' holders · '+Number(coin.realSolRaised||0).toFixed(2)+' SOL liquidity';renderTradeFeed(coin.recentTrades)}
  async function refreshActiveCoin(){if(!activeCoin||!activeCoin.symbol)return;try{const r=await fetch('/api/tokens/'+encodeURIComponent(activeCoin.symbol));const d=await r.json();if(d.success&&d.token)renderCoin(d.token)}catch(e){}}
  async function openCoin(coin){activeCoin=coin;show('coin');renderCoin(coin);await refreshActiveCoin();if(coinTimer)clearInterval(coinTimer);coinTimer=setInterval(refreshActiveCoin,3000)}
  async function shareCoin(){if(!activeCoin)return;const mint=activeCoin.mintAddress||activeCoin.mint||'';const text='$'+(activeCoin.symbol||'TOKEN')+' · '+shortMint(mint)+' · '+Number(activeCoin.volume24hUsd||0).toFixed(0)+' USD volume';try{if(navigator.share){await navigator.share({title:activeCoin.name||activeCoin.symbol,text:text,url:location.href});setTradeStatus('idle','Share card sent')}else{await navigator.clipboard.writeText(text);setTradeStatus('idle','Share card copied')}}catch(e){if(e.name!=='AbortError')setTradeStatus('failed','Could not share this token card')}}
  async function followCreator(){const follower=address();if(!follower)return open('walletModal');if(!activeCoin||!activeCoin.creator)return toast('No creator found for this coin.');const r=await fetch('/api/wallets/follow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({follower:follower,creator:activeCoin.creator})});const d=await r.json();if(!d.success)return toast(d.error||'Could not follow creator.');toast('Now following this creator.');if(homeLane==='following')load()}
  function openTrade(side){if(!address()){open('walletModal');return}if(!activeCoin||!(activeCoin.mintAddress||activeCoin.mint))return toast('No live mint to trade.');document.getElementById('tradeTitle').textContent=side==='sell'?'Sell':'Buy';document.getElementById('tradeCoinLabel').textContent=activeCoin.symbol||'';setTradeStatus('pending','Ready for wallet confirmation');open('tradeModal')}
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
  async function syncUsernameFromSignup(addr){
    const name=String(localStorage.getItem('cession_username')||'').trim().toLowerCase();
    if(!addr||!name)return null;
    localStorage.setItem('cession_username:'+addr,name);
    try{
      const r=await fetch('/api/auth/username',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address:addr,username:name})});
      const d=await r.json();
      if(!d.success)return null;
      document.getElementById('profileName').textContent=d.username;
      return d.username;
    }catch(e){return null}
  }
  async function loadProfile(){
    const addr=address();if(!addr)return;
    try{
      const r=await fetch('/api/auth/profile/'+encodeURIComponent(addr));const d=await r.json();
      if(d.avatar) document.getElementById('profileAvatar').src=d.avatar;
      if(d.username){document.getElementById('profileName').textContent=d.username;localStorage.setItem('cession_username',String(d.username).toLowerCase());localStorage.setItem('cession_username:'+addr,String(d.username).toLowerCase());return}
      const synced=await syncUsernameFromSignup(addr);
      if(!synced){
        const fallback=String(localStorage.getItem('cession_username:'+addr)||localStorage.getItem('cession_username')||'').trim();
        if(fallback) document.getElementById('profileName').textContent=fallback;
      }
    }catch(e){}
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
  async function claimRewardsBonus(){
    const addr=address();
    if(!addr)return toast('Connect a wallet first.');
    const input=document.getElementById('bonusCodeInput');
    const code=String(input&&input.value||'').trim().toUpperCase();
    if(!code)return toast('Enter your promo code.');
    const r=await fetch('/api/wallets/'+encodeURIComponent(addr)+'/rewards-bonus/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:code})});
    const d=await r.json();
    if(!d.success)return toast(d.error||'Could not claim promo.');
    toast(d.claim&&d.claim.alreadyClaimed?'Promo already claimed.':'Promo claimed.');
    loadRewards();
  }
  async function loadRewards(){
    const body=document.getElementById('rewardsBody');
    const board=document.getElementById('rewardsLeaderboard');
    const addr=address();
    if(!addr){
      if(body)body.innerHTML='<p class="cx-muted">Connect a wallet to see your points, tier, and referral link.</p><button class="cx-door" type="button" onclick="CessionUI.connectPhantom()">Connect Phantom</button>';
    } else {
      try{
        const r=await fetch('/api/wallets/'+encodeURIComponent(addr)+'/rewards');
        const d=await r.json();
        if(d.success&&body){
          const rw=d.rewards;
          const campaign=d.campaign||{};
          const autoCode=String(localStorage.getItem('cession_gate_code')||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,32);
          const refLink=location.origin+rw.referralUrl;
          const nextLine=rw.nextTier?('<p class="cx-muted">'+rw.nextTier.pointsNeeded.toLocaleString()+' pts to '+rw.nextTier.name+' ('+rw.nextTier.feeDiscountPercent+'% fee discount)</p>'):'<p class="cx-muted">Max tier reached.</p>';
          const bonusLine=rw.bonusPoints?('<div class="cx-row"><span>Promo bonus</span><span>'+Number(rw.bonusPoints||0).toLocaleString()+' pts</span></div>'):'';
          const promoClaim=campaign.claimed
            ? '<p class="cx-muted">Promo claimed: '+Number(campaign.points||0).toLocaleString()+' pts</p>'
            : '<div class="cx-row"><input class="form-input-pump" id="bonusCodeInput" placeholder="Promo code" value="'+autoCode+'"><button class="cx-ghost" type="button" onclick="CessionUI.claimRewardsBonus()">Claim</button></div><p class="cx-muted">One-time onboarding promo.</p>';
          body.innerHTML='<div class="cx-row"><span>Tier</span><span>'+rw.tier+' ('+rw.feeDiscountPercent+'% fee discount)</span></div>'
            +'<div class="cx-row"><span>Points</span><span>'+rw.points.toLocaleString()+'</span></div>'
            +bonusLine
            +'<div class="cx-row"><span>Trading volume</span><span>'+rw.tradingVolumeSol+' SOL</span></div>'
            +'<div class="cx-row"><span>Referrals</span><span>'+rw.referredWalletsCount+' wallets, '+rw.referralVolumeSol+' SOL</span></div>'
            +nextLine
            +'<div class="cx-addr-box" id="rewardsRefLink">'+refLink+'</div>'
            +'<button class="cx-ghost" type="button" onclick="CessionUI.copyReferralLink()">Copy referral link</button>'
            +promoClaim;
        }
      }catch(e){if(body)body.innerHTML='<p class="cx-muted">Unable to load rewards right now.</p>'}
    }
    try{
      const lr=await fetch('/api/wallets/rewards/leaderboard');
      const ld=await lr.json();
      if(ld.success&&board){
        board.innerHTML=(ld.leaderboard||[]).length
          ? ld.leaderboard.map(function(entry,i){return '<div class="cx-row"><span>#'+(i+1)+' '+shortMint(entry.walletAddress)+'</span><span>'+entry.points.toLocaleString()+' pts ('+entry.tier+')</span></div>'}).join('')
          : '<p class="cx-muted">No traders on the board yet. Be the first.</p>';
      }
    }catch(e){if(board)board.innerHTML='<p class="cx-muted">Unable to load leaderboard right now.</p>'}
  }
  function copyReferralLink(){const el=document.getElementById('rewardsRefLink');if(!el)return;const text=el.textContent;if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){toast('Referral link copied')})}else{toast(text)}}
  async function saveBot(){const symbol=String(document.getElementById('botSymbol').value||'').trim().toUpperCase();const buySol=Number(document.getElementById('botBuy').value||0);if(!/^[A-Z0-9]{2,12}$/.test(symbol))return toast('Ticker is required (2-12 letters/numbers).');if(!Number.isFinite(buySol)||buySol<=0)return toast('SOL amount must be greater than 0.');const r=await fetch('/api/ask/bots',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address:address(),type:document.getElementById('botType').value,symbol:symbol,buySol:buySol,interval:document.getElementById('botInterval').value})});const d=await r.json();if(!d.success)return toast(d.error||'Could not save bot.');toast(d.notice||'Saved');loadBots()}
  async function loadBots(){const r=await fetch('/api/ask/bots?address='+encodeURIComponent(address()||''));const d=await r.json();const el=document.getElementById('botList');if(el)el.textContent=(d.bots||[]).map(function(b){return (b.type||'dca')+' '+b.symbol+' '+b.buySol+' SOL'}).join(' · ')||'No bots yet.'}
  function setAskMode(mode){askMode=mode;document.getElementById('askAiBox').style.display=mode==='ai'?'flex':'none';document.getElementById('askChatBox').style.display=mode==='chat'?'flex':'none';if(mode==='chat')startChat();else stopChat()}
  function safeMediaUrl(value){try{const url=new URL(value);return url.protocol==='https:'&&/\.(gif|png|webp|jpe?g)$/i.test(url.pathname)?url.href:''}catch(e){return ''}}
  function addLine(id,who,text,media){const log=document.getElementById(id);if(!log)return;const d=document.createElement('div');d.className='cx-msg '+who;d.textContent=text||'';const src=safeMediaUrl(media);if(src){const image=document.createElement('img');image.src=src;image.alt='';d.appendChild(document.createTextNode(' '));d.appendChild(image)}log.appendChild(d);log.scrollTop=log.scrollHeight}
  function bootAi(){const log=document.getElementById('aiLog');if(log&&!log.dataset.ready){log.dataset.ready='1';addLine('aiLog','bot','Ask anything. I also have live Cession coin data.')}}
  async function sendAi(){const input=document.getElementById('aiInput');const q=(input.value||'').trim();if(!q)return;input.value='';addLine('aiLog','me',q);const r=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,address:address()})});const d=await r.json();addLine('aiLog','bot',d.reply||'No reply')}
  function chatText(m){return (m.username||'anon')+'  P/L '+(m.pnl||'0')+'  '+(m.text||'')}
  async function loadChat(){const r=await fetch('/api/ask/chat');const d=await r.json();const log=document.getElementById('chatLog');if(!log)return;log.textContent='';(d.messages||[]).forEach(function(m){addLine('chatLog','bot',chatText(m),m.media)})}
  function startChat(){loadChat();if(chatTimer)clearInterval(chatTimer);chatTimer=setInterval(loadChat,2500)}
  function stopChat(){if(chatTimer){clearInterval(chatTimer);chatTimer=null}}
  async function sendChat(){const input=document.getElementById('chatInput');const q=(input.value||'').trim();if(!q)return;input.value='';const media=safeMediaUrl(q);await fetch('/api/ask/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:media?'':q,media:media||null,address:address(),username:document.getElementById('profileName').textContent,pnl:localStorage.getItem('cession_pnl')||'0'})});loadChat()}
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
  window.CessionUI={go:show,open:open,close:close,openCreate:function(){open('deployModal')},openSettings:function(){open('settingsModal')},openStatement:openStatement,downloadCsv:downloadCsv,savePresets:savePresets,openCoin:openCoin,openTrade:openTrade,shareCoin:shareCoin,followCreator:followCreator,setTradeStatus:setTradeStatus,confirmTrade:function(){const amount=Number(document.getElementById('tradeAmount')&&document.getElementById('tradeAmount').value||0);if(!address())return open('walletModal');if(!activeCoin||!(activeCoin.mintAddress||activeCoin.mint))return toast('No live mint to trade.');if(!Number.isFinite(amount)||amount<=0)return toast('Enter a valid amount.');setTradeStatus('pending','Trading requires wallet-signed on-chain transaction');toast('Trading flow is wallet-signed only. Connect wallet and confirm on-chain.');},connectPhantom:connectPhantom,connectMetaMask:connectMetaMask,claimApproved:function(){claimTicket(pendingTicket()).then(function(ok){if(!ok)toast('Not approved yet. Approve in the wallet, then tap again.')})},claimRewardsBonus:claimRewardsBonus,sendAi:sendAi,sendChat:sendChat,setAskMode:setAskMode,setHomeLane:setHomeLane,setExploreLane:setExploreLane,saveBot:saveBot,copyReferralLink:copyReferralLink};
  window.CessionCard={visuals:cardVisuals,fmtMoney:fmtMoney,shortMint:shortMint};
  document.addEventListener('DOMContentLoaded',function(){
    const form=document.getElementById('deployCoinForm');if(form)form.addEventListener('submit',async function(e){e.preventDefault();const name=String(document.getElementById('deployName').value||'').trim();const symbol=String(document.getElementById('deploySymbol').value||'').trim().toUpperCase();const imageUrl=String(document.getElementById('deployMedia').value||'').trim();if(!name||!symbol)return toast('Name and ticker are required.');const payload={name:name,symbol:symbol,imageUrl:imageUrl||null,creator:address()||null};const btn=form.querySelector('button[type="submit"]');if(btn)btn.disabled=true;try{const r=await fetch('/api/tokens/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!d.success)return toast(d.error||'Could not create coin.');toast('Coin created.');close('deployModal');form.reset();const firstBuy=document.getElementById('deployFirstBuy');if(firstBuy)firstBuy.value='0.06';await load();}catch(err){toast('Could not create coin.')}finally{if(btn)btn.disabled=false;}});
    const words=document.getElementById('exploreWords');if(words)words.addEventListener('click',function(e){const b=e.target.closest('button');if(b)setExploreLane(b.getAttribute('data-lane'))});
    const ranges=document.getElementById('pnlRange');if(ranges)ranges.addEventListener('click',function(e){const b=e.target.closest('button');if(!b)return;pnlRange=b.getAttribute('data-range');ranges.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x===b)});loadPnl()});
    ['filterAge','filterVolume','filterLiquidity','filterHolders','filterVerified'].forEach(function(id){const control=document.getElementById(id);if(control)control.addEventListener('change',load)});
    window.addEventListener('cession:trade-status',function(event){const detail=event.detail||{};setTradeStatus(detail.state||'idle',detail.message||'Trade status updated')});
    const file=document.getElementById('avatarFile');if(file)file.addEventListener('change',function(){const f=file.files&&file.files[0];if(!f)return;const r=new FileReader();r.onload=function(){saveAvatar(r.result)};r.readAsDataURL(f)});
    const brand=document.getElementById('footerBrand');
    if(brand){brand.addEventListener('click',function(){brand.classList.toggle('open')});brand.addEventListener('mouseleave',function(){brand.classList.remove('open')})}
    const hint=document.getElementById('connectHint');
    if(hint&&!document.getElementById('claimBtn')){
      const b=document.createElement('button');b.id='claimBtn';b.className='cx-door';b.type='button';b.textContent='I approved';b.onclick=function(){CessionUI.claimApproved()};hint.parentNode.appendChild(b);
    }
    const q=new URLSearchParams(location.search);
    const refMatch=location.pathname.match(/^\/r\/([A-Za-z0-9]{2,16})$/);
    if(refMatch)localStorage.setItem('cession_ref',refMatch[1].toUpperCase());
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
