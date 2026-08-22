(function(){
  const BLOCKED=new Set(['TDOGE','QPEPE','BDOGE','GRAD','TEST','DEMO']);
  const ADS=['Cession does not hold keys.','Create fee is 0.05 SOL.','Trade fee is 0.50 percent.','Rewards pay after real volume.'];
  const views={home:'viewHome',explore:'viewExplorePulse',wallet:'viewWallet',rewards:'viewRewards',perps:'viewPerps',ai:'viewAi',coin:'viewCoin',bots:'viewBots'};
  const tabs={home:'bnavMint',explore:'bnavMint',wallet:'bnavWallet',rewards:'bnavMint',ai:'bnavAi',perps:'bnavMint',bots:'bnavMint'};
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
    const hid=key==='home'?(homeLane==='following'?'tabFollowing':'tabForYou'):key==='perps'?'tabPerps':key==='rewards'?'tabRewards':key==='ai'?'tabAi':key==='bots'?'tabBots':key==='wallet'?'tabWallet':null;
    if(hid){const h=document.getElementById(hid);if(h)h.classList.add('on')}
    if(key==='home'||key==='explore')load();
    if(key==='wallet')sync();
    if(key==='rewards')loadRewards();
    if(key==='bots')loadBots();
    if(key==='ai'){bootAi();if(askMode==='chat')startChat()} else stopChat();
    if(key!=='coin'&&coinTimer){clearInterval(coinTimer);coinTimer=null}
    window.scrollTo(0,0);
  }
