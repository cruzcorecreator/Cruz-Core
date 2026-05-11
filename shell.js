(function(){
  const rankPower={banned:-1,member:0,bot:0,helper:1,mod:2,admin:3,tester:4,owner:5};
  const roleEmoji={owner:'👑',tester:'🧪',admin:'🛡️',mod:'🔨',helper:'✨',bot:'🤖',banned:'🚫',member:''};
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const nav=[['index.html','🏠','Home'],['games.html','🎮','Games'],['chatbox.html','💬','Chat'],['messages.html','✉️','Messages'],['users.html','👥','Users'],['profile.html','👤','Profile']];
  function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
  function pfp(u){return (window.FGAuth?.pickPhoto?.(u))||String(u?.photoURL||u?.pfp||u?.pfpUrl||u?.profilePic||u?.profilePicture||u?.profileImage||u?.avatar||u?.avatarUrl||u?.picture||u?.photo||u?.image||u?.icon||'').trim();}
  function nameOf(u){return u?.name||u?.displayName||u?.username||'player';}
  function avatar(u,cls='avatar'){const img=pfp(u),initial=esc(nameOf(u).slice(0,1).toUpperCase());return img?`<span class="${cls}" data-initial="${initial}"><img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove();this.parentElement.textContent=this.parentElement.dataset.initial||'U';"></span>`:`<span class="${cls}">${initial}</span>`}
  function canAdmin(u){return (rankPower[u?.role||u?.rank||'member']??0)>=3;}
  function logout(){
    try{
      // Log out without wiping saved profile data/PFP caches.
      ['fg.user.v4','fg.user.v3','fg.user.v2','gamehub_user','currentUser','authUser','signedInUser','loggedInUser'].forEach(k=>localStorage.removeItem(k));
      sessionStorage.clear();
    }catch(e){}
    location.href='index.html';
  }
  function navItems(u){return nav.concat(canAdmin(u)?[['admin.html','🛡️','Admin Panel']]:[]).map(([href,icon,label])=>`<a class="nav-item ${page===href?'active':''}" href="${href}"><span>${icon}</span><span>${label}</span></a>`).join('')}
  function renderUserBits(){
    const u=window.FGUser||{};
    const level=Number(u.level||0);const levelHtml=`<span class="top-level-pill">Lv ${level}</span>`;const display=`<span class="${rewardNameClass(u)}" ${rewardNameStyle(u)}>${esc(nameOf(u))}</span>`;const badges=rewardBadges(u);const htmlTop=`${avatar(u)}<span><b>${display} ${roleEmoji[u.role||u.rank||'member']||''} ${levelHtml} ${badges}</b><small class="rank">${esc(u.role||u.rank||'member')}</small></span><span class="status-dot"></span>`;
    const top=document.getElementById('shellTopUser');
    if(top) top.innerHTML=htmlTop;
    const side=document.getElementById('shellSideUser');
    if(side) side.innerHTML=`${avatar(u)}<div><b>${display} ${roleEmoji[u.role||u.rank||'member']||''} ${levelHtml} ${badges}</b><span class="rank">${esc(u.role||u.rank||'member')}</span></div>`;
    // Update any older/reused profile UI pieces across pages.
    document.querySelectorAll('[data-current-user-avatar], .current-user-avatar, .my-avatar, #profileAvatarSmall, #topbarAvatar, #sidebarAvatar').forEach(el=>{
      el.innerHTML=avatar(u, el.classList.contains('big-avatar')?'big-avatar':'avatar');
    });
    document.querySelectorAll('[data-current-user-name], .current-user-name, #topbarName, #sidebarName').forEach(el=>{el.textContent=nameOf(u)});
    document.querySelectorAll('[data-current-user-rank], .current-user-rank, #topbarRank, #sidebarRank').forEach(el=>{el.textContent=u.role||u.rank||'member'});
    const nav=document.getElementById('shellNav');
    if(nav) nav.innerHTML=`<div class="nav-title">Main</div>${navItems(u)}`;
  }

  function runStaffEvent(ev){
    const type = String(ev?.type || '').toLowerCase();
    const msg = String(ev?.message || '');
    const body = document.body;

    if(type==='custom'){
      const dur = Number(ev.duration || 2400);
      const text = String(ev.text || ev.command || 'Command');
      const emoji = String(ev.emoji || '🎵');
      const img = String(ev.imageUrl || '');
      const sound = String(ev.soundUrl || '');
      const shouldShake = !!ev.shake;
      const shouldRedirect = !!ev.redirect;
      const redirectUrl = String(ev.redirectUrl || '');
      if(sound){
        try{ new Audio(sound).play().catch(()=>{}); }catch(e){}
      }
            if(img){
        const old=document.getElementById('staffEventOverlay'); if(old) old.remove();
        const div=document.createElement('div');
        div.id='staffEventOverlay';
        div.style.cssText='position:fixed;inset:0;z-index:999999;background:#000;overflow:hidden;';
        const safeImg = img.replace(/"/g,'&quot;');
        div.innerHTML='<img src="'+safeImg+'" alt="" style="width:100vw;height:100vh;object-fit:cover;display:block;">';
        body.appendChild(div);
        setTimeout(()=>div.remove(), dur);
      } else {
        setTimeout(()=>overlay(text, emoji), 10);
      }
      if(shouldShake) setTimeout(()=>shake(), 60);
      if(shouldRedirect && redirectUrl) setTimeout(()=>{ location.href=redirectUrl; }, Math.max(300, dur));
      return;
    }

    function toast(text){
      if(window.FGAuth?.showNotice) window.FGAuth.showNotice(text);
      else alert(text);
    }

    function overlay(text, emoji){
      const old = document.getElementById('staffEventOverlay');
      if(old) old.remove();
      const div = document.createElement('div');
      div.id = 'staffEventOverlay';
      div.style.cssText = 'position:fixed;inset:0;z-index:999999;display:grid;place-items:center;background:rgba(0,0,0,.68);backdrop-filter:blur(8px);color:white;text-align:center;font-family:system-ui,sans-serif;';
      div.innerHTML = '<div style="font-size:min(16vw,110px);line-height:1">' + emoji + '</div><div style="font-size:clamp(28px,6vw,64px);font-weight:1000;margin-top:14px;text-shadow:0 12px 35px rgba(0,0,0,.55)">' + text + '</div>';
      body.appendChild(div);
      setTimeout(()=>div.remove(), 2400);
    }

    function shake(){
      body.animate([
        { transform:'translate(0,0) rotate(0deg)' },
        { transform:'translate(-12px,8px) rotate(-1deg)' },
        { transform:'translate(12px,-8px) rotate(1deg)' },
        { transform:'translate(-8px,-6px) rotate(.6deg)' },
        { transform:'translate(8px,6px) rotate(-.6deg)' },
        { transform:'translate(0,0) rotate(0deg)' }
      ], { duration:700, iterations:1 });
    }

    function confetti(){
      for(let i=0;i<70;i++){
        const p=document.createElement('span');
        p.textContent=['🎉','✨','⭐','💥','🟦','🟪','🟨'][Math.floor(Math.random()*7)];
        p.style.cssText='position:fixed;z-index:999999;left:'+Math.random()*100+'vw;top:-30px;font-size:'+(18+Math.random()*18)+'px;pointer-events:none;';
        document.body.appendChild(p);
        p.animate([
          { transform:'translateY(0) rotate(0deg)', opacity:1 },
          { transform:'translateY(110vh) rotate('+(Math.random()*720)+'deg)', opacity:.9 }
        ], { duration:1400+Math.random()*1300, easing:'cubic-bezier(.2,.7,.2,1)' }).onfinish=()=>p.remove();
      }
    }

    if(type==='kick'){ toast(msg || 'You were kicked from chat.'); location.href='index.html'; }
    else if(type==='explode'){ overlay('BOOM', '💥'); shake(); }
    else if(type==='yeet'){ overlay('YEET', '🌀'); body.animate([{transform:'translateX(0)'},{transform:'translateX(140vw) rotate(18deg)'},{transform:'translateX(0)'}],{duration:1200}); }
    else if(type==='bonk'){ overlay('BONK', '🔨'); shake(); }
    else if(type==='jumpscare'){ overlay('BOO', '👻'); shake(); }
    else if(type==='rickroll'){ overlay('NEVER GONNA GIVE YOU UP', '🎵'); }
    else if(type==='confetti'){ confetti(); toast('Confetti!'); }
    else if(type==='fakeban'){ overlay('FAKE BAN 😭', '🚫'); }
    else if(type==='dramaticmute'){ overlay('DRAMATIC MUTE', '🔇'); shake(); }
    else toast(msg || ('Staff event: '+type));
  }

  function listenStaffEvents(){
    if(window.__staffEventListenerStarted) return;
    const u = window.FGUser || {};
    if(!u.uid || !window.FGAuth) return;
    window.__staffEventListenerStarted = true;
    FGAuth.initFirebase().then(()=>{
      const db = FGAuth.db();
      const seenKey = 'seenStaffEvents_' + u.uid;
      let seen = {};
      try{ seen = JSON.parse(localStorage.getItem(seenKey)||'{}'); }catch(e){}
      db.ref('siteStaffEvents/' + u.uid).limitToLast(20).on('child_added', snap=>{
        if(seen[snap.key]) return;
        seen[snap.key] = Date.now();
        localStorage.setItem(seenKey, JSON.stringify(seen));
        runStaffEvent(snap.val() || {});
        setTimeout(()=>db.ref('siteStaffEvents/' + u.uid + '/' + snap.key).remove().catch(()=>{}), 5000);
      });
    });
  }


  
  function getLevelRewards(level){
    level=Number(level||0);
    return {
      activeMember: level>=5,
      bannerColor: level>=8,
      customNameColor: level>=10,
      profileFrame: level>=12,
      customStatus: level>=15,
      biggerBio: level>=20,
      glowName: level>=25,
      animatedAvatarBorder: level>=30,
      veteranTag: level>=35,
      rareTheme: level>=40,
      profileSpotlight: level>=45,
      rainbowName: level>=50,
      particleEffect: level>=60,
      secretTheme: level>=75,
      legendTag: level>=75,
      goldProfile: level>=100
    };
  }
  function rewardNameClass(u){
    const lvl=Number(u?.level||0), rewards=getLevelRewards(lvl), username=String(u?.username||'').toLowerCase();
    if(username==='cruz') return 'rgb-cruz-name';
    if(rewards.rainbowName && u?.useRainbowName) return 'rainbow-name';
    if(rewards.glowName && u?.useGlowName) return 'name-glow';
    return '';
  }
  function rewardNameStyle(u){
    const lvl=Number(u?.level||0), rewards=getLevelRewards(lvl), username=String(u?.username||'').toLowerCase();
    if(username==='cruz') return '';
    if(rewards.rainbowName && u?.useRainbowName) return '';
    const color=String(u?.nameColor||'').trim();
    return rewards.customNameColor && color ? `style="color:${esc(color)}"` : '';
  }
  function rewardBadges(u){
    const custom=String(u?.customTag||'').trim().slice(0,18);
    if(custom) return `<span class="custom-user-tag">${esc(custom).toUpperCase()}</span>`;
    const lvl=Number(u?.level||0), r=getLevelRewards(lvl);
    if(r.legendTag) return '<span class="legend-tag">LEGEND</span>';
    if(r.veteranTag) return '<span class="veteran-tag">VETERAN</span>';
    if(r.activeMember) return '<span class="active-member-tag">ACTIVE</span>';
    return '';
  }


function fgTopNotify(title,msg,kind='info'){
  let wrap=document.getElementById('fgTopNotifyWrap');
  if(!wrap){
    wrap=document.createElement('div');
    wrap.id='fgTopNotifyWrap';
    wrap.style.cssText='position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483600;display:flex;flex-direction:column;gap:10px;width:min(520px,calc(100% - 24px));pointer-events:none;';
    document.body.appendChild(wrap);
  }
  const n=document.createElement('div');
  n.style.cssText='pointer-events:auto;background:rgba(15,23,42,.96);border:1px solid rgba(96,165,250,.45);box-shadow:0 18px 60px rgba(0,0,0,.45);color:white;border-radius:18px;padding:13px 16px;font:800 14px Inter,system-ui;animation:fgToastIn .18s ease-out;';
  n.innerHTML=`<b>${esc(title)}</b><div style="font-weight:600;color:#cbd5e1;margin-top:3px">${esc(msg)}</div>`;
  n.onclick=()=>n.remove();
  wrap.appendChild(n);
  setTimeout(()=>{if(n.isConnected)n.remove()},6500);
}
function startTopNotifications(){
  if(window.__fgTopNotificationsStarted)return;
  const u=window.FGUser||{};
  if(!u.uid||!window.FGAuth)return;
  window.__fgTopNotificationsStarted=true;
  FGAuth.initFirebase().then(()=>{
    const db=FGAuth.db();
    const seen={friends:new Set(),dms:new Set(),tags:new Set()};
    const myUid=u.uid;
    const myUser=String(u.username||'').toLowerCase();
    const myName=String(u.name||u.displayName||u.username||'').toLowerCase();

    db.ref('siteSocial/friendRequests/'+myUid).limitToLast(10).on('child_added',s=>{
      const r=s.val()||{};
      if(seen.friends.has(s.key))return;
      seen.friends.add(s.key);
      if(Number(r.createdAt||0)&&Date.now()-Number(r.createdAt||0)>120000)return;
      fgTopNotify('Friend request',`${r.name||r.username||'Someone'} sent you a friend request`);
    });

    db.ref('siteDMIndex/'+myUid).limitToLast(20).on('child_added',s=>{
      const r=s.val()||{};
      if(seen.dms.has(s.key))return;
      seen.dms.add(s.key);
      if(Number(r.lastAt||0)&&Date.now()-Number(r.lastAt||0)>120000)return;
      if(r.fromUid===myUid)return;
      fgTopNotify('New DM',`${r.fromName||r.fromUsername||'Someone'}: ${String(r.lastText||'sent a message').slice(0,90)}`);
    });
    db.ref('siteDMIndex/'+myUid).limitToLast(20).on('child_changed',s=>{
      const r=s.val()||{};
      if(Number(r.lastAt||0)&&Date.now()-Number(r.lastAt||0)>120000)return;
      if(r.fromUid===myUid)return;
      fgTopNotify('New DM',`${r.fromName||r.fromUsername||'Someone'}: ${String(r.lastText||'sent a message').slice(0,90)}`);
    });

    db.ref('fun-and-games-chat/messages').limitToLast(25).on('child_added',s=>{
      const m=s.val()||{};
      if(seen.tags.has(s.key))return;
      seen.tags.add(s.key);
      if(m.uid===myUid)return;
      if(Number(m.createdAt||0)&&Date.now()-Number(m.createdAt||0)>120000)return;
      const text=String(m.text||'');
      const low=text.toLowerCase();
      const tagged=(myUser&&low.includes('@'+myUser))||(myName&&low.includes('@'+myName))||(myUser&&low.includes(myUser));
      if(tagged)fgTopNotify('You were tagged',`${m.name||m.username||'Someone'}: ${text.slice(0,100)}`);
    });
  }).catch(()=>{});
}

function startActiveLeveling(){
    if(window.__fgActiveLevelingStarted) return;
    const u=window.FGUser||{};
    if(!u.uid || !window.FGAuth) return;
    window.__fgActiveLevelingStarted=true;
    let active=false,lastAction=0,activeSeconds=0;
    const mark=()=>{active=true;lastAction=Date.now();};
    ['keydown','mousedown','touchstart','click'].forEach(ev=>window.addEventListener(ev,mark,{passive:true}));
    mark();
    FGAuth.initFirebase().then(()=>{
      const db=FGAuth.db();
      setInterval(async()=>{
        const now=Date.now();
        if(now-lastAction<=5000){
          activeSeconds+=3;
          if(activeSeconds>=60){
            activeSeconds=0;
            const ref=db.ref('siteUsers/'+u.uid);
            const snap=await ref.get().catch(()=>null);
            if(!snap||!snap.exists())return;
            const cur=snap.val()||{};
            const total=Number(cur.activeSeconds||0)+60;
            const earnedLevel=Math.floor(total/120);
            const currentLevel=Number(cur.level||0);
            const level=Math.max(currentLevel,earnedLevel);
            await ref.update({activeSeconds:total,level,lastActiveLevelTick:Date.now()});
          }
        }
      },3000);
    });
  }

  function build(){
    if(!document.getElementById('fgToastStyle')){const st=document.createElement('style');st.id='fgToastStyle';st.textContent='@keyframes fgToastIn{from{opacity:0;transform:translateY(-10px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}';document.head.appendChild(st)}
    listenStaffEvents();
    startActiveLeveling();
    startTopNotifications();
    if(document.querySelector('.app')){renderUserBits();return;}
    const u=window.FGUser||{};
    const app=document.createElement('div');app.className='app';app.innerHTML=`<aside class="side" id="uiSide"><div class="brand"><div class="logo">🎮</div><div><b>GameHub</b><span>Play. Connect. Win.</span></div></div><nav class="nav-block" id="shellNav"><div class="nav-title">Main</div>${navItems(u)}</nav><div class="side-card"><b>Online Now</b><p class="muted" id="sideOnline">loading...</p></div><a class="user-pill side-user-pill" id="shellSideUser" href="profile.html">${avatar(u)}<div><b><span class="${rewardNameClass(u)}" ${rewardNameStyle(u)}>${esc(nameOf(u))}</span> ${roleEmoji[u.role||u.rank||'member']||''} <span class="top-level-pill">Lv ${Number(u.level||0)}</span> ${rewardBadges(u)}</b><span class="rank">${esc(u.role||u.rank||'member')}</span></div></a></aside><main class="main"><header class="topbar"><button class="icon-btn mobile-menu" id="menuBtn" type="button">☰</button><input class="search" id="globalSearch" placeholder="Search games, users, and more..."><div></div><div class="top-actions"><a class="icon-btn" href="users.html" title="users">👥</a><a class="icon-btn" href="chatbox.html" title="chat">💬</a><a class="icon-btn" href="messages.html" title="messages">✉️</a><button class="icon-btn" id="logoutBtn" type="button" title="Log out">Log out</button><a class="user-pill" id="shellTopUser" href="profile.html">${avatar(u)}<span><b><span class="${rewardNameClass(u)}" ${rewardNameStyle(u)}>${esc(nameOf(u))}</span> ${roleEmoji[u.role||u.rank||'member']||''} <span class="top-level-pill">Lv ${Number(u.level||0)}</span> ${rewardBadges(u)}</b><small class="rank">${esc(u.role||u.rank||'member')}</small></span><span class="status-dot"></span></a></div></header><div id="pageMount"></div></main>`;
    document.body.prepend(app);
    const mount=document.getElementById('pageMount');
    [...document.body.children].filter(el=>el!==app&&el.id!=='fgSession'&&el.id!=='fgNotice'&&el.id!=='fgLoginWall'&&el.tagName!=='SCRIPT').forEach(el=>mount.appendChild(el));
    document.getElementById('menuBtn')?.addEventListener('click',()=>document.getElementById('uiSide')?.classList.toggle('open'));document.getElementById('logoutBtn')?.addEventListener('click',logout);
    document.getElementById('globalSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter'){const q=e.target.value.trim(); if(q) location.href='games.html?q='+encodeURIComponent(q)}});
    if(window.FGAuth){FGAuth.initFirebase().then(()=>{const db=FGAuth.db();db.ref('sitePresence').on('value',s=>{const all=s.val()||{};const count=Object.values(all).filter(p=>p&&p.online&&Date.now()-Number(p.lastSeen||0)<90000).length;const el=document.getElementById('sideOnline');if(el)el.textContent=count+' active user'+(count===1?'':'s')}); if(window.FGUser?.uid){db.ref('siteUsers/'+window.FGUser.uid).on('value',snap=>{if(!snap.exists())return; window.FGUser=FGAuth.normalizeUser({...window.FGUser,...snap.val()}); renderUserBits();});}})}
  }
  document.addEventListener('fg-auth-ready',build,{once:true});
  document.addEventListener('fg-user-updated',()=>{renderUserBits();});
  setTimeout(()=>{if(window.FGUser){listenStaffEvents();startActiveLeveling();} if(window.FGUser&&!document.querySelector('.app'))build();else renderUserBits()},700);
})();