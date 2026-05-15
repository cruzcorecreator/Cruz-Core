
/* GameHub emergency user/profile loading fix */
(function(){
  if(window.GH_USER_LOADING_FIX) return;
  window.GH_USER_LOADING_FIX = true;

  const esc = s => String(s ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const qs = new URLSearchParams(location.search);

  function localUser(){
    try{return window.FGUser || JSON.parse(localStorage.getItem('fg.user.v4') || localStorage.getItem('fg.user.v3') || '{}')}catch(e){return window.FGUser||{}}
  }
  function norm(uid,u){
    u=u||{};
    const out={...u};
    out.uid=out.uid||uid;
    out.username=out.username||out.name||uid;
    out.name=out.name||out.displayName||out.username||uid;
    out.displayName=out.displayName||out.name||out.username||uid;
    out.role=out.role||out.rank||'member';
    out.rank=out.rank||out.role||'member';
    return out;
  }
  async function getDb(){
    if(window.FGAuth?.initFirebase) await FGAuth.initFirebase();
    if(window.FGAuth?.db) return FGAuth.db();
    if(window.firebase?.database) return firebase.database();
    throw new Error('Firebase is not ready');
  }
  async function loadUsers(db){
    const users={};
    const paths=['siteUsers','fun-and-games-chat/profiles','profiles'];
    for(const path of paths){
      try{
        const s=await db.ref(path).get();
        const val=s.val()||{};
        for(const [uid,u] of Object.entries(val)) users[uid]=norm(uid,{...(users[uid]||{}),...u});
      }catch(e){console.warn('user path failed',path,e)}
    }
    const me=localUser();
    if(me?.uid) users[me.uid]=norm(me.uid,{...(users[me.uid]||{}),...me});
    for(const bot of [
      {uid:'bot-nova',username:'nova',name:'Nova',role:'bot',rank:'bot',verified:true,bot:true,isBot:true,photoURL:'https://mir-s3-cdn-cf.behance.net/projects/404/aa9f81144900743.Y3JvcCwxMTkyLDkzMywxNCww.jpg'},
      {uid:'bot-astro',username:'astro',name:'Astro',role:'bot',rank:'bot',verified:true,bot:true,isBot:true,photoURL:'https://cdn-icons-png.flaticon.com/512/4712/4712109.png'}
    ]) users[bot.uid]=norm(bot.uid,{...(users[bot.uid]||{}),...bot});
    window.__GH_ALL_USERS = users;
    return users;
  }
  function avatar(u){
    const img=u.photoURL||u.pfp||u.avatar||u.picture||'';
    if(img) return `<span class="avatar"><img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span>`;
    return `<span class="avatar">${esc((u.name||u.username||'U').slice(0,1).toUpperCase())}</span>`;
  }
  function userCard(u,admin=false){
    const ver=u.verified?'<span class="verified-badge" title="Verified">✓</span>':'';
    if(admin){
      return `<button class="person" data-select="${esc(u.uid)}" type="button" style="width:100%;text-align:left;color:white">${avatar(u)}<span><b>${esc(u.name||u.username)} ${ver} <span class="rank">${esc(u.role||'member')}</span></b><span>@${esc(u.username||'')} · ${esc(u.uid)}</span></span></button>`;
    }
    return `<article class="person" style="grid-template-columns:auto 1fr">${avatar(u)}<span><b><a href="viewprofile.html?id=${encodeURIComponent(u.uid)}">${esc(u.name||u.username)}</a> ${ver}</b><span>@${esc(u.username||'')} · ${esc(u.role||'member')} · ${esc(u.uid)}</span><span style="display:flex;gap:8px;flex-wrap:wrap;margin-top:7px"><a class="btn" href="messages.html?with=${encodeURIComponent(u.uid)}">Message</a><a class="btn" href="viewprofile.html?id=${encodeURIComponent(u.uid)}">Profile</a></span></span></article>`;
  }
  async function renderUsersPage(){
    const listEl=document.getElementById('usersList');
    if(!listEl) return;
    try{
      const db=await getDb();
      const users=await loadUsers(db);
      const q=(document.getElementById('userSearch')?.value||'').toLowerCase();
      const arr=Object.values(users).filter(u=>u&&u.uid).filter(u=>[u.name,u.username,u.uid,u.role,u.bio].join(' ').toLowerCase().includes(q)).sort((a,b)=>String(a.name||a.username).localeCompare(String(b.name||b.username)));
      if(document.getElementById('userCount')) userCount.textContent=arr.length+' users';
      listEl.innerHTML=arr.map(u=>userCard(u,false)).join('') || '<div class="empty">No users found in Firebase.</div>';
      const search=document.getElementById('userSearch');
      if(search && !search.dataset.ghFixBound){search.dataset.ghFixBound='1';search.addEventListener('input',renderUsersPage)}
    }catch(e){
      console.error(e);
      listEl.innerHTML='<div class="empty">Users failed to load: '+esc(e.message||e)+'</div>';
    }
  }
  async function renderAdminUsers(){
    const listEl=document.getElementById('usersList');
    if(!listEl) return;
    try{
      const db=await getDb();
      const users=await loadUsers(db);
      window.users=users;
      const q=(document.getElementById('userSearch')?.value||'').toLowerCase();
      const arr=Object.values(users).filter(u=>u&&u.uid).filter(u=>[u.name,u.username,u.uid,u.role,u.bio].join(' ').toLowerCase().includes(q)).sort((a,b)=>String(a.username||a.name).localeCompare(String(b.username||b.name)));
      listEl.innerHTML=arr.map(u=>userCard(u,true)).join('') || '<div class="empty">No users found in Firebase.</div>';
      const search=document.getElementById('userSearch');
      if(search && !search.dataset.ghFixBound){search.dataset.ghFixBound='1';search.addEventListener('input',renderAdminUsers)}
    }catch(e){
      console.error(e);
      listEl.innerHTML='<div class="empty">Admin users failed to load: '+esc(e.message||e)+'</div>';
    }
  }
  async function renderProfilePage(){
    const nameEl=document.getElementById('nameText');
    if(!nameEl) return;
    try{
      const db=await getDb();
      const users=await loadUsers(db);
      let id=qs.get('id')||qs.get('uid')||qs.get('username')||localUser().uid||'';
      if(users[id]===undefined){
        const found=Object.values(users).find(u=>String(u.username).toLowerCase()===String(id).toLowerCase());
        if(found) id=found.uid;
      }
      const u=users[id]||norm(id,{name:'profile not found',username:id});
      const ver=u.verified?'<span class="verified-badge" title="Verified">✓</span>':'';
      nameEl.innerHTML=`<span>${esc(u.name||u.username||'player')}</span>${ver}`;
      const bio=document.getElementById('bioText'); if(bio) bio.textContent=u.customStatus||u.bio||'No bio yet.';
      const role=document.getElementById('roleText'); if(role) role.textContent=u.role||u.rank||'member';
      const lvl=document.getElementById('levelText'); if(lvl) lvl.textContent='Lv '+Number(u.level||0);
      const av=document.getElementById('avatar');
      if(av){
        const img=u.photoURL||u.pfp||u.avatar||'';
        av.innerHTML=img?`<img src="${esc(img)}" loading="lazy" referrerpolicy="no-referrer">`:esc((u.name||u.username||'P').slice(0,1).toUpperCase());
      }
      const stats=document.getElementById('stats');
      if(stats) stats.innerHTML=`<div class="person"><span class="avatar">📅</span><span><b>${u.createdAt?new Date(u.createdAt).toLocaleString():'Unknown'}</b><span>account created</span></span></div><div class="person"><span class="avatar">⭐</span><span><b>${esc(u.role||'member')}</b><span>rank</span></span></div><div class="person"><span class="avatar">✓</span><span><b>${u.verified?'Verified':'Not verified'}</b><span>verified status</span></span></div><div class="person"><span class="avatar">⬆️</span><span><b>Lv ${Number(u.level||0)}</b><span>${Number(u.activeSeconds||0)} active seconds</span></span></div>`;
      const msg=document.getElementById('messageBtn'); if(msg) msg.onclick=()=>location.href='messages.html?with='+encodeURIComponent(u.uid);
    }catch(e){
      console.error(e);
      nameEl.textContent='Profile failed to load';
      const bio=document.getElementById('bioText'); if(bio) bio.textContent=String(e.message||e);
    }
  }
  async function renderOwnProfile(){
    if(page!=='profile.html') return;
    try{
      const db=await getDb();
      const users=await loadUsers(db);
      const me=localUser();
      const u=users[me.uid]||me;
      window.FGUser={...me,...u};
      localStorage.setItem('fg.user.v4',JSON.stringify(window.FGUser));
      localStorage.setItem('fg.user.v3',JSON.stringify(window.FGUser));
      if(typeof fill==='function') fill();
    }catch(e){console.warn('own profile fallback failed',e)}
  }
  async function renderMessageBots(){
    if(page!=='messages.html') return;
    const convos=document.getElementById('convos');
    if(!convos || convos.dataset.ghBotFixed) return;
    convos.dataset.ghBotFixed='1';
    const box=document.createElement('div');
    box.className='list';
    box.innerHTML=`<button class="person" type="button" data-gh-open-bot="bot-nova">${avatar({name:'Nova'})}<span><b>Nova</b><span>DM Nova bot</span></span></button><button class="person" type="button" data-gh-open-bot="bot-astro">${avatar({name:'Astro'})}<span><b>Astro</b><span>DM Astro bot</span></span></button>`;
    convos.prepend(box);
    document.addEventListener('click',e=>{
      const b=e.target.closest('[data-gh-open-bot]');
      if(!b)return;
      location.href='messages.html?with='+encodeURIComponent(b.dataset.ghOpenBot);
    });
  }
  function boot(){
    if(page==='users.html') renderUsersPage();
    if(page==='admin.html') renderAdminUsers();
    if(page==='viewprofile.html') renderProfilePage();
    if(page==='profile.html') renderOwnProfile();
    if(page==='messages.html') renderMessageBots();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
  setTimeout(boot,700);
  setTimeout(boot,1600);
})();
