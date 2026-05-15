(function(){
'use strict';
const firebaseConfig={apiKey:'AIzaSyDvKpZacWOgca6PtoA6wP2QFX3JbI-Dvw4',authDomain:'funandgames-4e8c1.firebaseapp.com',databaseURL:'https://funandgames-4e8c1-default-rtdb.firebaseio.com',projectId:'funandgames-4e8c1',storageBucket:'funandgames-4e8c1.firebasestorage.app',messagingSenderId:'240713956788',appId:'1:240713956788:web:37b64a7a534f1e2bea06e1'};
const LS_USER='fg.user.v4',OWNER_USERNAME='cruz',OWNER_PASSWORD='Cruz10312',OWNER_UID='owner-cruz';
let db=null,auth=null,firebaseReady=null,booted=false,annBound=false;
const $=id=>document.getElementById(id);
function loadScript(src){
  return new Promise((resolve,reject)=>{
    if(src.includes('firebase-app')&&window.firebase?.apps)return resolve();
    if(src.includes('firebase-database')&&window.firebase?.database)return resolve();
    const existing=[...document.scripts].find(s=>s.src===src);
    if(existing){
      if(existing.dataset.loaded==='yes') return resolve();
      existing.addEventListener('load',()=>resolve(),{once:true});
      existing.addEventListener('error',()=>reject(new Error('Failed to load '+src)),{once:true});
      return;
    }
    const s=document.createElement('script');
    s.src=src;
    s.async=true;
    s.dataset.fgDynamic='yes';
    s.onload=()=>{s.dataset.loaded='yes';resolve();};
    s.onerror=()=>reject(new Error('Failed to load '+src));
    document.head.appendChild(s);
  });
}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function cleanUser(s=''){return String(s||'').toLowerCase().trim().replace(/[^a-z0-9_.-]/g,'').slice(0,24)}
function cleanName(s=''){return String(s||'').replace(/\s+/g,' ').trim().slice(0,24)}
function pickPhoto(u={}){return String(u.photoURL||u.pfp||u.pfpUrl||u.profilePic||u.profilePicture||u.profileImage||u.avatar||u.avatarUrl||u.picture||u.photo||u.image||u.icon||'').trim();}
function deviceId(){try{let id=localStorage.getItem('fg.deviceId');if(!id){id='dev-'+crypto.randomUUID();localStorage.setItem('fg.deviceId',id)}return id}catch(e){return 'dev-unknown'}}
function safeDeviceBanKey(id){return String(id||'').replace(/[.#$/[\]]/g,'_')}
async function getDeviceBan(){try{await initFirebase();const id=deviceId();const snap=await db.ref('siteDeviceBans/'+safeDeviceBanKey(id)).get();if(snap.exists()){const ban=snap.val()||{};if(ban.active!==false)return {...ban,deviceId:ban.deviceId||id}}}catch(e){console.warn('device ban check failed',e)}return null}
async function ensureDeviceAllowed(){const ban=await getDeviceBan();if(!ban)return true;clearLocal();showModerationPage('ban',{username:'this device'},{title:'Device Banned',description:'This device has been banned from GameHub.',reason:ban.reason||'Device banned by staff.'});return false}
function normalizeUser(u={}){const p=pickPhoto(u);const role=u.role||u.rank||'member';return {...u,photoURL:p,pfp:p,role,rank:role,name:u.name||u.displayName||u.username||'player'};}
function readLocal(){try{return normalizeUser(JSON.parse(localStorage.getItem(LS_USER)||localStorage.getItem('fg.user.v3')||localStorage.getItem('fg.user.v2')||'null'))}catch{return null}}
function storeLocal(u){
  const existing=readLocal()||window.FGUser||{};
  const oldPhoto=pickPhoto(existing);
  const newPhoto=pickPhoto(u||{});
  u=normalizeUser({...existing,...(u||{}),photoURL:newPhoto||oldPhoto||'',pfp:newPhoto||oldPhoto||'',sessionLoginAt:(existing.sessionLoginAt||Date.now())});
  localStorage.setItem(LS_USER,JSON.stringify(u));
  localStorage.setItem('fg.user.v3',JSON.stringify(u));
  window.FGUser=u;
}
function clearLocal(){localStorage.removeItem(LS_USER);localStorage.removeItem('fg.user.v3');localStorage.removeItem('fg.user.v2');window.FGUser=null;}
async function sha256(t){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(t)));return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function roleRank(r){return ({banned:-1,member:0,bot:0,helper:1,mod:2,admin:3,tester:4,owner:5}[r]??0)}
function roleEmoji(r){return ({owner:'👑',tester:'🧪',admin:'🛡️',mod:'🔨',helper:'✨',bot:'🤖',banned:'🚫',member:''}[r]||'')}
function pageName(){const f=(location.pathname.split('/').pop()||'index.html').toLowerCase();if(f==='game.html')return 'playing '+(new URLSearchParams(location.search).get('id')||'unknown');return f.replace('.html','')||'homepage'}
function currentGame(){const f=(location.pathname.split('/').pop()||'').toLowerCase();let id=null;if(f==='game.html')id=new URLSearchParams(location.search).get('id')||'unknown';return id?{id,title:id.replaceAll('-',' '),url:'game.html?id='+encodeURIComponent(id),playedAt:Date.now()}:null}
function injectStyles(){if($('fgAuthHardStyles'))return;const st=document.createElement('style');st.id='fgAuthHardStyles';st.textContent=`body.fg-locked{overflow:hidden!important}.fg-lock{position:fixed!important;inset:0!important;z-index:2147483647!important;display:grid!important;place-items:center!important;padding:22px!important;background:radial-gradient(circle at 18% 0%,rgba(56,189,248,.28),transparent 30%),radial-gradient(circle at 85% 0%,rgba(139,92,246,.24),transparent 33%),linear-gradient(145deg,#020617,#0b1220 58%,#030712)!important;color:#f8fafc!important;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}.fg-card{width:min(520px,100%)!important;padding:26px!important;border-radius:32px!important;background:rgba(15,23,42,.94)!important;border:1px solid rgba(255,255,255,.16)!important;box-shadow:0 35px 100px rgba(0,0,0,.62)!important;backdrop-filter:blur(22px)!important}.fg-card h1{margin:0 0 8px!important;font-size:clamp(2.8rem,10vw,5rem)!important;line-height:.84!important;letter-spacing:-.085em!important;text-transform:lowercase!important;color:white!important}.fg-card p{margin:0 0 16px!important;color:#a5b4cc!important;font-weight:650!important;line-height:1.55!important}.fg-tabs{display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important;margin:14px 0!important}.fg-card button,.fg-tabs button,.fg-session button,.fg-session a{border:1px solid rgba(255,255,255,.16)!important;border-radius:999px!important;background:rgba(255,255,255,.09)!important;color:white!important;min-height:48px!important;padding:0 16px!important;font-weight:900!important;cursor:pointer!important;text-decoration:none!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}.fg-tabs button.active,.fg-card .primary{background:linear-gradient(135deg,#38bdf8,#3b82f6)!important}.fg-card input{width:100%!important;height:54px!important;margin:8px 0!important;border-radius:17px!important;border:1px solid rgba(255,255,255,.15)!important;background:rgba(8,15,28,.75)!important;color:white!important;padding:0 15px!important;font:inherit!important;font-weight:760!important;outline:none!important}.fg-card .primary,.fg-card .google{width:100%!important;margin-top:10px!important}.fg-error{min-height:22px!important;margin-top:12px!important;color:#fecaca!important;font-weight:850!important}.fg-note{font-size:.86rem!important;color:#7dd3fc!important;margin-top:10px!important}.fg-session{position:fixed!important;right:14px!important;bottom:14px!important;z-index:2147483000!important;display:flex!important;gap:8px!important;align-items:center!important;padding:8px!important;border-radius:999px!important;background:rgba(2,6,23,.82)!important;border:1px solid rgba(255,255,255,.14)!important;box-shadow:0 14px 34px rgba(0,0,0,.34)!important;backdrop-filter:blur(18px)!important;color:white!important;font-family:Inter,system-ui!important}.fg-avatar{width:34px!important;height:34px!important;border-radius:50%!important;display:grid!important;place-items:center!important;background:linear-gradient(135deg,#38bdf8,#8b5cf6)!important;font-weight:950!important;overflow:hidden!important}.fg-avatar img{width:100%!important;height:100%!important;object-fit:cover!important}.fg-session strong{max-width:160px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}.fg-moderation-page{position:fixed!important;inset:0!important;z-index:2147483600!important;display:grid!important;place-items:center!important;background:#f2f4f5!important;color:#232527!important;font-family:Arial,Helvetica,sans-serif!important;padding:20px!important}.fg-mod-card{width:min(620px,100%)!important;background:white!important;border:1px solid #d4d4d4!important;border-radius:0!important;box-shadow:0 2px 8px rgba(0,0,0,.08)!important;padding:0!important}.fg-mod-head{padding:18px 22px!important;border-bottom:1px solid #e3e3e3!important;font-size:1.3rem!important;font-weight:700!important;color:#232527!important}.fg-mod-body{padding:22px!important;color:#393b3d!important;line-height:1.5!important}.fg-mod-body p{margin:0 0 14px!important}.fg-mod-reason{background:#f6f7f8!important;border:1px solid #e3e3e3!important;padding:12px!important;margin:10px 0 16px!important;color:#232527!important}.fg-mod-actions{display:flex!important;gap:10px!important;justify-content:flex-end!important;padding:16px 22px!important;border-top:1px solid #e3e3e3!important}.fg-mod-actions button{border:0!important;background:#335fff!important;color:white!important;font-weight:700!important;border-radius:8px!important;padding:10px 16px!important;cursor:pointer!important}.fg-mod-actions button.secondary{background:#e9eaeb!important;color:#232527!important}.fg-rules{margin:0 0 12px!important;padding:12px!important;border-radius:16px!important;background:rgba(96,165,250,.12)!important;border:1px solid rgba(96,165,250,.28)!important;color:#dbeafe!important;text-align:left!important;font-size:.86rem!important;line-height:1.35!important}.fg-notice{position:fixed!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;z-index:2147483500!important;display:none;max-width:min(580px,calc(100% - 40px))!important;padding:24px!important;border-radius:26px!important;background:rgba(15,23,42,.96)!important;border:1px solid rgba(96,165,250,.35)!important;box-shadow:0 24px 80px rgba(0,0,0,.55)!important;color:white!important;text-align:center!important;font:850 1.1rem/1.45 Inter,system-ui!important}@media(max-width:620px){.fg-session{left:10px!important;right:10px!important;bottom:10px!important;border-radius:20px!important;justify-content:space-between!important}.fg-card{padding:22px!important}}`;document.head.appendChild(st)}

function error(msg=''){
  const el=$('fgError');
  if(el) el.textContent=String(msg||'');
}
function showNotice(text=''){
  injectStyles();
  let el=$('fgNotice');
  if(!el){
    el=document.createElement('div');
    el.id='fgNotice';
    el.className='fg-notice';
    document.body.appendChild(el);
  }
  el.textContent=String(text||'');
  el.style.display='block';
  clearTimeout(window.__fgNoticeTimer);
  window.__fgNoticeTimer=setTimeout(()=>{if(el)el.style.display='none'},3500);
}
function logout(){
  clearLocal();
  try{sessionStorage.clear()}catch(e){}
  location.href='index.html';
}
function showSession(u={}){
  injectStyles();
  let el=$('fgSession');
  if(!el){
    el=document.createElement('div');
    el.id='fgSession';
    el.className='fg-session';
    document.body.appendChild(el);
  }
  const name=esc(u.name||u.displayName||u.username||'player');
  const role=esc(u.role||u.rank||'member');
  el.innerHTML=`<span><b>${name}</b><small>${role}</small></span><button id="fgLogoutBtn" type="button">log out</button>`;
  const b=$('fgLogoutBtn');
  if(b) b.onclick=logout;
}

function hideWall(){
  document.body.classList.remove('fg-locked');
  const wall=$('fgLoginWall');
  if(wall) wall.remove();
  const mod=$('fgModerationPage');
  if(mod) mod.remove();
}
function showWall(mode='signin',msg=''){injectStyles();document.body.classList.add('fg-locked');$('fgLoginWall')?.remove();const signup=mode==='signup';const wall=document.createElement('div');wall.id='fgLoginWall';wall.className='fg-lock';wall.innerHTML=`<div class="fg-card"><h1>${signup?'request account':'sign in'}</h1><p>You need an account before you can use this site.</p><div class="fg-tabs"><button id="fgIn" class="${!signup?'active':''}" type="button">sign in</button><a id="fgUp" class="${signup?'active':''}" href="https://forms.gle/GNyvjX1apkjKjAEs6" target="_blank" rel="noopener">request account</a></div><div id="fgForm"></div><div id="fgError" class="fg-error">${esc(msg)}</div></div>`;document.body.appendChild(wall);$('fgIn').onclick=()=>showWall('signin');renderForm(signup)}
function renderForm(signup){
  const f=$('fgForm');
  if(!f)return;
  f.innerHTML=signup
    ? `<div class="fg-rules"><b>request an account</b><br>Signups are handled through a Google Form now. Do not put your school email as your username. Use your real name.</div><a class="primary" style="display:block;text-align:center;text-decoration:none;padding:12px;border-radius:12px" href="https://forms.gle/GNyvjX1apkjKjAEs6" target="_blank" rel="noopener">open signup form</a><p class="fg-note">After staff creates your account, come back here and sign in.</p>`
    : `<input id="fgUser" placeholder="username, not email" autocomplete="off" autocapitalize="none" spellcheck="false" data-lpignore="true" data-form-type="other"><input id="fgPass" placeholder="password" type="password" autocomplete="current-password"><button id="fgLogin" class="primary" type="button">sign in</button>`;
  if(!signup){
    $('fgLogin').onclick=loginLocal;
    $('fgPass').addEventListener('keydown',e=>{if(e.key==='Enter')loginLocal()});
  }
}
async function initFirebase(){if(firebaseReady)return firebaseReady;firebaseReady=(async()=>{await loadScript('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');await loadScript('https://www.gstatic.com/firebasejs/10.12.5/firebase-database-compat.js');if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);db=firebase.database();return db})();return firebaseReady}
function profileBase(uid,username,name,hash,role='member',provider='site-account'){return normalizeUser({uid,username,name:name||username,provider,role,rank:role,passwordHash:hash||'',bio:'',photoURL:'',warnings:0,bannedUntil:0,timeoutUntil:0,mutedUntil:0,recentGames:[],deviceId:deviceId(),createdAt:Date.now(),lastSeen:Date.now()})}


async function ensureBotAccount(uid,username,name,bio,photoURL=''){
  try{
    await initFirebase();
    const hash=await sha256('Cruz10312');
    const ref=db.ref('siteUsers/'+uid);
    const snap=await ref.get();
    const base={uid,username,name,displayName:name,provider:'bot-account',role:'bot',rank:'bot',passwordHash:hash,bio,photoURL,pfp:photoURL,isBot:true,bot:true,verified:true,createdAt:Date.now(),lastSeen:Date.now(),currentPage:'helping users'};
    if(snap.exists()){
      const old=snap.val()||{};
      await ref.update({...base,...old,uid,username,name:old.name||name,displayName:old.displayName||old.name||name,role:'bot',rank:'bot',passwordHash:old.passwordHash||hash,isBot:true,bot:true,verified:true});
    }else{
      await ref.set(base);
    }
    await db.ref('siteUsernames/'+username).set(uid);
  }catch(e){console.warn(name+' bot seed failed',e)}
}

async function ensureNovaBot(){
  await ensureBotAccount('bot-nova','nova','Nova','GameHub AI bot account. Say nova when AI chat is enabled.','https://mir-s3-cdn-cf.behance.net/projects/404/aa9f81144900743.Y3JvcCwxMTkyLDkzMywxNCww.jpg');
  await ensureBotAccount('bot-astro','astro','Astro','GameHub AI bot account. Say astro when AI chat is enabled.','https://cdn-icons-png.flaticon.com/512/4712/4712109.png');
}
async function usernameTaken(username){await initFirebase();const snap=await db.ref('siteUsernames/'+username).get();return snap.exists()?snap.val():null}
async function saveUser(u){
  u=normalizeUser(u);
  await initFirebase();
  const r=db.ref('siteUsers/'+u.uid);
  const snap=await r.get();
  let next=u;
  if(snap.exists()){
    const old=normalizeUser(snap.val()||{});
    const oldPhoto=pickPhoto(old);
    const newPhoto=pickPhoto(u);
    next=normalizeUser({
      ...old,
      ...u,
      // Never wipe a saved profile picture just because a login/profileBase object has blank photo fields.
      photoURL:newPhoto||oldPhoto||'',
      pfp:newPhoto||oldPhoto||'',
      bio:(u.bio!==undefined && String(u.bio).trim()!=='') ? u.bio : (old.bio||''),
      role:old.role||u.role||'member',
      rank:old.role||u.role||'member',
      passwordHash:u.passwordHash||old.passwordHash||'',
      lastSeen:Date.now()
    });
  }
  await r.set(next);
  await db.ref('siteUsernames/'+next.username).set(next.uid);
  return next;
}
async function signupLocal(){try{error('');await initFirebase();if(!(await ensureDeviceAllowed()))return;const rawUser=String($('fgUser').value||'').trim(),rawName=String($('fgName').value||'').trim(),pass=$('fgPass').value;if(rawUser.includes('@'))throw new Error('Do not put your email. Username only.');if(/\s/.test(rawUser))throw new Error('Username cannot have spaces.');if(rawName.includes('@'))throw new Error('Display name is your real name, not your email.');const username=cleanUser(rawUser),name=cleanName(rawName);if(!username||!pass||!name)throw new Error('Fill out display name, username, and password.');if(name.length<2)throw new Error('Use your real display name.');if(username===OWNER_USERNAME)throw new Error('That username is reserved.');if(await usernameTaken(username))throw new Error('That username is already taken.');await finish(await saveUser(profileBase('user-'+username,username,name,await sha256(pass))))}catch(e){error(e.message||'Could not sign up.')}}
async function loginLocal(){try{error('');await initFirebase();if(!(await ensureDeviceAllowed()))return;const username=cleanUser($('fgUser').value),pass=$('fgPass').value;if(!username||!pass)throw new Error('Fill out username and password.');if(username===OWNER_USERNAME&&pass===OWNER_PASSWORD){sessionStorage.setItem('fg.ownerUnlocked','yes');await finish(await saveUser(profileBase(OWNER_UID,OWNER_USERNAME,'cruz',await sha256(pass),'owner','owner-login')));return}const uid=await usernameTaken(username);if(!uid)throw new Error('Account not found. Use sign up first.');const snap=await db.ref('siteUsers/'+uid).get();if(!snap.exists())throw new Error('Account record missing.');const u=normalizeUser(snap.val());if(u.passwordHash!==await sha256(pass))throw new Error('Wrong password.');await finish(u)}catch(e){error(e.message||'Could not sign in.')}}
async function googleLogin(){try{error('');await initFirebase();if(!(await ensureDeviceAllowed()))return;if(!auth)throw new Error('Google Auth not enabled');const result=await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());const gu=result.user;let username=cleanUser((gu.displayName||gu.email||'player').split('@')[0]);const existing=await db.ref('siteUsers/'+gu.uid).get();if(existing.exists()&&existing.val().username)username=existing.val().username;else if(await usernameTaken(username))username='google-'+gu.uid.slice(0,10).toLowerCase();const u=profileBase(gu.uid,username,gu.displayName||username,'','member','google');u.email=gu.email||'';u.photoURL=gu.photoURL||'';await finish(await saveUser(u))}catch(e){error('Google sign-in is not enabled yet or was blocked. Use username/password.')}}

function showModerationPage(kind,u={},data={}){
  hideWall();
  document.body.classList.add('fg-locked');
  const old=$('fgModerationPage'); if(old)old.remove();
  const title=data.title || (kind==='ban'?'Account Deleted / Banned':'Warning');
  const desc=data.description || data.text || (kind==='ban'?'Your account has been banned from this website.':'Your account has received a warning.');
  const reason=data.reason || u.banReason || u.warningReason || desc || 'No reason provided.';
  const div=document.createElement('div');
  div.id='fgModerationPage';
  div.className='fg-moderation-page';
  const appealHtml=kind==='ban'?`<div class="fg-mod-reason"><b>Appeal this ban</b><br><textarea id="fgBanAppealText" style="width:100%;min-height:90px;margin-top:8px;border-radius:10px;padding:10px" placeholder="Explain why staff should unban you..."></textarea></div>`:'';
  div.innerHTML=`<div class="fg-mod-card"><div class="fg-mod-head">${esc(title)}</div><div class="fg-mod-body"><p>${esc(desc)}</p><div class="fg-mod-reason"><b>Reason:</b><br>${esc(reason)}</div><p class="fg-note">Username: ${esc(u.username||'unknown')}</p>${appealHtml}</div><div class="fg-mod-actions"><button class="secondary" id="fgModLogout" type="button">Log Out</button>${kind==='ban'?'<button id="fgAppealBtn" type="button">Submit Appeal</button>':''}${kind==='warning'?'<button id="fgModOk" type="button">I Understand</button>':''}</div></div>`;
  document.body.appendChild(div);
  $('fgModLogout').onclick=()=>{clearLocal();location.href='index.html'};
  if(kind==='ban'&&$('fgAppealBtn'))$('fgAppealBtn').onclick=async()=>{try{await initFirebase();const text=String($('fgBanAppealText')?.value||'').trim();if(!text)return alert('Write an appeal first.');await db.ref('siteBanAppeals').push({uid:u.uid,username:u.username,name:u.name,reason:text,status:'open',deviceId:deviceId(),createdAt:Date.now()});alert('Appeal submitted.');}catch(e){alert('Could not submit appeal.')}};
  if(kind==='warning'&&$('fgModOk'))$('fgModOk').onclick=async()=>{try{if(data.id&&db)await db.ref('siteNotifications/'+u.uid+'/'+data.id).update({seen:true,seenAt:Date.now(),acknowledged:true});}catch(e){}div.remove();document.body.classList.remove('fg-locked');};
}

async function finish(raw){let u=normalizeUser(raw);if(!u||!u.uid)return;await initFirebase();if(!(await ensureDeviceAllowed()))return;if(u.role==='banned'||Number(u.bannedUntil||0)>Date.now()){storeLocal(u);await initFirebase();showModerationPage('ban',u,{title:u.banTitle||'Account Banned',description:u.banDescription||'You may not use GameHub right now.',reason:u.banReason||'No reason provided.'});return}if(Number(u.timeoutUntil||0)>Date.now()){showWall('signin','This account is timed out.');return}storeLocal(u);hideWall();showSession(u);await initFirebase();const userPresencePatch={lastSeen:Date.now(),lastLoginAt:Date.now(),deviceId:deviceId(),currentPage:pageName()};
if(pickPhoto(u)) userPresencePatch.photoURL=pickPhoto(u);
await db.ref('siteUsers/'+u.uid).update(userPresencePatch).catch(()=>{});const pr=db.ref('sitePresence/'+u.uid);await pr.set({uid:u.uid,username:u.username,name:u.name,role:u.role,photoURL:pickPhoto(u),pfp:pickPhoto(u),online:true,currentPage:pageName(),currentGame:currentGame()?.id||'',lastSeen:Date.now()}).catch(()=>{});pr.onDisconnect().set({uid:u.uid,username:u.username,name:u.name,role:u.role,photoURL:pickPhoto(u),pfp:pickPhoto(u),online:false,currentPage:'offline',currentGame:'',lastSeen:Date.now()});const g=currentGame();if(g){const recent=[g,...((u.recentGames||[]).filter(x=>x&&x.id!==g.id))].slice(0,10);u.recentGames=recent;storeLocal(u);await db.ref('siteUsers/'+u.uid).update({recentGames:recent,currentGame:g.id,lastPlayedAt:Date.now()}).catch(()=>{});await db.ref('homepageAdmin/gameStats/'+g.id+'/plays').transaction(v=>(Number(v)||0)+1).catch(()=>{});await db.ref('homepageAdmin/games/'+g.id+'/playCount').transaction(v=>(Number(v)||0)+1).catch(()=>{})}bindLive(u.uid);document.dispatchEvent(new CustomEvent('fg-auth-ready',{detail:u}))}
function bindLive(uid){if(annBound)return;annBound=true;initFirebase().then(()=>{db.ref('siteUsers/'+uid).on('value',snap=>{if(!snap.exists())return;const u=normalizeUser({...(window.FGUser||{}),...snap.val()});
if(Number(u.sessionRevokedAt||0)>Number((window.FGUser||{}).sessionLoginAt||0)){
  clearLocal();
  alert('You were logged out by staff.');
  location.href='index.html';
  return;
}
storeLocal(u);showSession(u);document.dispatchEvent(new CustomEvent('fg-user-updated',{detail:u}))});db.ref('siteDeviceBans/'+safeDeviceBanKey(deviceId())).on('value',snap=>{const ban=snap.val();if(ban&&ban.active!==false){clearLocal();showModerationPage('ban',{username:'this device'},{title:'Device Banned',description:'This device has been banned from GameHub.',reason:ban.reason||'Device banned by staff.'})}});db.ref('siteAnnouncements/current').on('value',snap=>{const a=snap.val();if(!a||!a.text)return;const age=Date.now()-Number(a.createdAt||0);if(age>6000){db.ref('siteAnnouncements/current').remove().catch(()=>{});return}if(a.id!==sessionStorage.getItem('fg.lastAnn')){sessionStorage.setItem('fg.lastAnn',a.id);showNotice(a.text)}setTimeout(()=>db.ref('siteAnnouncements/current').get().then(x=>{const cur=x.val();if(cur&&cur.id===a.id)db.ref('siteAnnouncements/current').remove().catch(()=>{})}).catch(()=>{}),Math.max(250,6100-age))});db.ref('siteNotifications/'+uid).on('value',snap=>{const all=snap.val()||{};Object.entries(all).forEach(([id,n])=>{if(n&&!n.seen&&(n.text||n.title||n.description)){if(n.type==='warning'||n.type==='reportResolved'){showModerationPage('warning',window.FGUser||{uid}, {...n,id, title:n.title||(n.type==='reportResolved'?'Report Resolved':'Warning'), description:n.description||n.text||'', reason:n.reason||n.text||''});}else{showNotice(n.text||n.title||'Notification');db.ref('siteNotifications/'+uid+'/'+id).update({seen:true,seenAt:Date.now()})}}})})})}
async function updateProfilePatch(patch){if(!window.FGUser?.uid)throw new Error('Not signed in.');const safe={};if('name'in patch)safe.name=cleanName(patch.name)||window.FGUser.name;if('bio'in patch)safe.bio=String(patch.bio||'').trim().slice(0,420);if('photoURL'in patch){const v=String(patch.photoURL||'').trim();safe.photoURL=(/^https:\/\//i.test(v)||/^data:image\//i.test(v))?v.slice(0,350000):''}await initFirebase();await db.ref('siteUsers/'+window.FGUser.uid).update(safe);const next=normalizeUser({...window.FGUser,...safe});storeLocal(next);await db.ref('sitePresence/'+next.uid).update({photoURL:pickPhoto(next),pfp:pickPhoto(next),name:next.name||next.username}).catch(()=>{});document.dispatchEvent(new CustomEvent('fg-user-updated',{detail:next}));return next}
window.FGAuth={initFirebase:()=>initFirebase(),db:()=>db,showWall,showNotice,updateProfilePatch,sha256,normalizeUser,pickPhoto,roleRank,roleEmoji,isOwnerSession:()=>sessionStorage.getItem('fg.ownerUnlocked')==='yes'||window.FGUser?.role==='owner'};
function boot(){if(booted)return;booted=true;injectStyles();const cached=readLocal();if(cached&&cached.uid){window.FGUser=cached;showSession(cached);hideWall();document.dispatchEvent(new CustomEvent('fg-auth-ready',{detail:cached}));initFirebase().then(async()=>{try{const snap=await db.ref('siteUsers/'+cached.uid).get();if(snap.exists())await finish(normalizeUser({...cached,...snap.val()}));else await finish(cached);setTimeout(()=>{if(!sessionStorage.getItem('fg.novaSeeded')){sessionStorage.setItem('fg.novaSeeded','yes');ensureNovaBot()}},1200)}catch(e){console.warn(e)}})}else{showWall('signin');setTimeout(()=>initFirebase().catch(()=>{}),50)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();