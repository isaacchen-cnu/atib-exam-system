import './styles.css';
import { signup, login, logout, getUser, handleAuthCallback, requestPasswordRecovery, updateUser } from '@netlify/identity';

const app=document.querySelector('#app');
const state={user:null,meta:null,type:'academic',questions:[],responses:{},index:0,result:null,history:[],callback:null};
const esc=(s='')=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const pct=v=>v==null?'—':`${Math.round(v*100)}%`;
const datefmt=s=>new Intl.DateTimeFormat('zh-TW',{dateStyle:'medium',timeStyle:'short'}).format(new Date(s));

async function api(path,options={}){
 const res=await fetch(`/api/${path}`,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});
 const data=await res.json().catch(()=>({})); if(!res.ok)throw new Error(data.error||data.detail||`HTTP ${res.status}`); return data;
}

async function init(){
 try{
   if(location.hash){state.callback=await handleAuthCallback(); if(state.callback?.type==='confirmation'){history.replaceState({},'',location.pathname);}}
 }catch(e){console.warn(e)}
 state.user=await getUser();
 renderShell();
 if(state.callback?.type==='recovery'){showResetPassword();return;}
 if(state.user) await loadLoggedIn(); else showAuth(true);
}

function renderShell(){
 app.innerHTML=`
 <header class="topbar"><div class="container topbar-inner">
   <div class="brand"><img class="brand-logo" src="/logos/cnu.png" alt="嘉南藥理大學"><img class="brand-logo lab-logo" src="/logos/atib.png" alt="ATIB"><div>運動防護員模擬試題<small>嘉南藥理大學 運動管理系 × ATIB</small></div></div>
   <div class="nav-actions">
     ${state.user?`<span class="user-chip">${esc(state.user.userMetadata?.full_name||state.user.email||'')}</span>${state.user.roles?.includes('admin')?'<a class="btn btn-ghost btn-sm" href="/admin.html">管理後台</a>':''}<button id="historyBtn" class="btn btn-ghost btn-sm">練習紀錄</button><button id="logoutBtn" class="btn btn-ghost btn-sm">登出</button>`:'<button id="loginBtn" class="btn btn-ghost btn-sm">登入 / 註冊</button>'}
   </div>
 </div></header>
 <main id="main"></main>
 <footer class="footer"><div class="container">本系統以官方公布題目與更正公告作為歷屆學科計分依據。系統細分考科屬複習用分類；術科為實作自評，不取代正式檢定評分。若發現題目或解析疑義，請使用題目回報功能。</div></footer>
 <div id="modalRoot"></div>`;
 document.querySelector('#loginBtn')?.addEventListener('click',()=>showAuth());
 document.querySelector('#logoutBtn')?.addEventListener('click',async()=>{await logout();location.href='/'});
 document.querySelector('#historyBtn')?.addEventListener('click',showHistory);
 renderHome();
}

async function loadLoggedIn(){
 try{state.meta=await api('question-bank?meta=1');}catch(e){console.error(e);}
 try{state.history=(await api('user-history')).attempts||[];}catch{}
 renderHome();
}

function renderHome(){
 const main=document.querySelector('#main'); if(!main)return;
 if(!state.user){main.innerHTML=`<section class="hero"><div class="container hero-grid"><div><h1>像考駕照一樣，<br><span class="accent">反覆練到會。</span></h1><p>依年度、考科或隨機出題。學科交卷後立即顯示正確答案與檢討；術科以實作站方式自評並對照檢核點。</p></div><div class="hero-card"><h3>開始前需要登入</h3><p>使用 Email 建立帳號，並填寫姓名與單位。預設需要完成 Email 驗證後才能登入與作答。</p><button id="heroLogin" class="btn btn-primary">登入 / 免費註冊</button></div></div></section>`;document.querySelector('#heroLogin')?.addEventListener('click',()=>showAuth());return;}
 if(state.questions.length&&!state.result){renderExam();return;} if(state.result){renderResult();return;}
 const h=state.history||[]; const recent=h[0];
 main.innerHTML=`
 <section class="hero"><div class="container hero-grid">
  <div><h1>運動防護員檢定<br><span class="accent">模擬試題與考後檢討</span></h1><p>選擇學科或術科，再依歷屆年度、官方大類、細分考科或隨機方式練習。每次作答都會累積成績，供個人複習與整體錯題統計。</p>
   <div class="metric-row"><div class="metric"><strong>${state.meta?.total??'—'}</strong><span>已發布題目/實作站</span></div><div class="metric"><strong>${h.length}</strong><span>你的練習次數</span></div><div class="metric"><strong>${recent?.accuracy==null?'—':pct(recent.accuracy)}</strong><span>最近一次學科正確率</span></div></div>
  </div>
  <div class="hero-card"><h3>題庫可信度標示</h3><p>考生只能看到管理後台已核准並發布的題目。官方答案與更正公告優先；術科教學答案會與官方題目來源分開標示。</p><div class="notice info">為避免誤導考生，官方 PDF 能解析但學理詳解尚未逐題人工審核時，會直接告訴你「以官方答案計分、解析待複核」。</div></div>
 </div></section>
 <section class="section"><div class="container"><div class="panel">
  <div class="section-title"><div><h2>建立一份練習</h2><p>條件可以單獨使用，也可以交叉篩選。</p></div></div>
  <div class="mode-tabs"><button class="mode-btn ${state.type==='academic'?'active':''}" data-type="academic"><strong>學科</strong><span>選擇題，自動計分並逐題檢討</span></button><button class="mode-btn ${state.type==='practical'?'active':''}" data-type="practical"><strong>術科</strong><span>實作站、自我評量與標準檢核點</span></button></div>
  <form id="setupForm">
   <div class="form-grid">
    <div class="field"><label>年度 / 梯次</label><select id="examSelect"><option value="">全部年度（隨機）</option>${(state.meta?.exams||[]).map(e=>`<option value="${esc(e)}">${esc(e)}</option>`).join('')}</select></div>
    <div class="field"><label>${state.type==='academic'?'官方大類':'術科範圍'}</label><select id="groupSelect"><option value="">全部</option>${groupOptions()}</select></div>
    <div class="field"><label>${state.type==='academic'?'考科':'技能類型'}</label><select id="subjectSelect"><option value="">全部考科/技能</option>${subjectOptions()}</select></div>
    <div class="field"><label>題數</label><select id="countSelect">${[10,20,30,50,100].map(n=>`<option value="${n}" ${n===20?'selected':''}>${n} 題</option>`).join('')}</select></div>
   </div>
   ${state.type==='academic'?'<div class="notice info">考生端只會載入管理者已「發布」的正式題庫；草稿與待複核題不會出現在這裡。</div>':'<div class="notice">術科本質為動作實作與口述。系統不以「猜選項」假裝判定術科及格，而是在完成後顯示檢核點、解析與常見失分點，供考生自評。</div>'}
   <div id="setupStatus"></div><div class="setup-actions"><button class="btn btn-primary" type="submit">開始隨機出題</button></div>
  </form>
 </div></div></section>`;
 document.querySelectorAll('.mode-btn').forEach(b=>b.addEventListener('click',()=>{state.type=b.dataset.type;renderHome()}));
 document.querySelector('#setupForm')?.addEventListener('submit',startExam);
}
function groupOptions(){const groups=state.meta?.groupsByType?.[state.type]||[];return groups.map(g=>`<option value="${esc(g)}">${esc(g)}</option>`).join('')}
function subjectOptions(){return (state.meta?.subjectsByType?.[state.type]||[]).map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('')}

async function startExam(e){e.preventDefault();const box=document.querySelector('#setupStatus');box.innerHTML='<div class="notice info"><span class="loader"></span> 正在準備題目…</div>';
 const p=new URLSearchParams({type:state.type,count:document.querySelector('#countSelect').value,exam:document.querySelector('#examSelect').value,group:document.querySelector('#groupSelect').value,subject:document.querySelector('#subjectSelect').value,random:'1'});

 try{const data=await api(`question-bank?${p}`);if(!data.questions.length)throw new Error('目前沒有符合這組條件的可用題目。請由管理者先在後台完成核對並發布題庫。');state.questions=data.questions;state.responses={};state.index=0;state.result=null;state.mode=Object.fromEntries(p);renderExam();scrollTo({top:0,behavior:'smooth'});}catch(err){box.innerHTML=`<div class="notice danger">${esc(err.message)}</div>`}}

function renderExam(){const main=document.querySelector('#main'),q=state.questions[state.index],answered=Object.keys(state.responses).length;
 main.innerHTML=`<section class="section"><div class="container"><div class="exam-layout"><article class="question-card">${questionHTML(q)}<div class="question-actions"><button id="prevQ" class="btn btn-secondary" ${state.index===0?'disabled':''}>上一題</button><div><button id="nextQ" class="btn btn-secondary">${state.index===state.questions.length-1?'回到第一題':'下一題'}</button></div></div></article><aside class="exam-side"><strong>作答進度</strong><div class="progress-bar"><div class="progress-fill" style="width:${Math.round(answered/state.questions.length*100)}%"></div></div><div class="navigator">${state.questions.map((x,i)=>`<button class="nav-q ${state.responses[x.id]?'answered':''} ${i===state.index?'current':''}" data-i="${i}">${i+1}</button>`).join('')}</div><hr style="border:0;border-top:1px solid var(--line);margin:17px 0"><div style="font-size:12px;color:var(--muted);margin-bottom:10px">已完成 ${answered} / ${state.questions.length}</div><button id="submitExam" class="btn btn-primary" style="width:100%">交卷並立即檢討</button></aside></div></div></section>`;
 bindQuestion(q);document.querySelector('#prevQ').onclick=()=>{state.index--;renderExam()};document.querySelector('#nextQ').onclick=()=>{state.index=(state.index+1)%state.questions.length;renderExam()};document.querySelectorAll('.nav-q').forEach(b=>b.onclick=()=>{state.index=Number(b.dataset.i);renderExam()});document.querySelector('#submitExam').onclick=submitExam;
}
function questionHTML(q){const meta=`<div class="q-meta"><span class="badge">${esc(q.exam)}</span><span class="badge">${esc(q.group)}</span><span class="badge">${q.official&&q.subjectClassification==='system'?'系統分類：':''}${esc(q.subject)}</span>${q.official?'<span class="badge official">官方歷屆</span>':''}</div>`;
 if(q.type==='academic'){const selected=state.responses[q.id]?.answer;return `${meta}<div class="q-number">第 ${state.index+1} / ${state.questions.length} 題${q.number?`｜原卷第 ${q.number} 題`:''}</div><div class="q-text">${esc(q.text)}</div><div class="options">${Object.entries(q.options||{}).map(([k,v])=>`<label class="option ${selected===k?'selected':''}"><input type="radio" name="answer" value="${k}" ${selected===k?'checked':''}><span class="letter">${k}</span><span>${esc(v)}</span></label>`).join('')}</div>`;}
 const self=state.responses[q.id]?.selfAssessment||'';return `${meta}<div class="q-number">實作站 ${state.index+1} / ${state.questions.length}</div><div class="q-text">${esc(q.title)}</div><div class="practical-prompt">${esc(q.prompt)}</div>${q.scenario?`<div class="scenario"><strong>情境：</strong>${esc(q.scenario)}</div>`:''}<div style="margin-top:22px;font-weight:800">先完成實作，再記錄你的自評</div><div class="self-assess">${['掌握','部分掌握','不會'].map(x=>`<button class="self-btn ${self===x?'active':''}" data-self="${x}" type="button">${x}</button>`).join('')}</div>`}
function bindQuestion(q){if(q.type==='academic')document.querySelectorAll('input[name="answer"]').forEach(el=>el.onchange=()=>{state.responses[q.id]={id:q.id,answer:el.value};renderExam()});else document.querySelectorAll('[data-self]').forEach(el=>el.onclick=()=>{state.responses[q.id]={id:q.id,selfAssessment:el.dataset.self};renderExam()})}

async function submitExam(){const missing=state.questions.filter(q=>!state.responses[q.id]).length;if(missing&&!confirm(`還有 ${missing} 題未作答，仍要交卷嗎？`))return;const btn=document.querySelector('#submitExam');btn.disabled=true;btn.innerHTML='<span class="loader"></span> 計分中';
 const responses=state.questions.map(q=>state.responses[q.id]||{id:q.id});
 try{state.result=await api('submit-attempt',{method:'POST',body:JSON.stringify({type:state.type,mode:state.mode,responses})});state.questions=[];state.responses={};state.history=(await api('user-history')).attempts||[];renderResult();scrollTo({top:0,behavior:'smooth'})}catch(e){alert(e.message);btn.disabled=false;btn.textContent='交卷並立即檢討'}}

function renderResult(){const main=document.querySelector('#main'),r=state.result;const academic=r.review.some(x=>x.type==='academic');const score=academic&&r.attempt.scored?Math.round(r.attempt.correct/r.attempt.scored*100):null;
 main.innerHTML=`<section class="section"><div class="container"><div class="panel"><div class="result-hero">${academic?`<div class="score-ring" style="--score:${score}%"><strong>${score}%</strong></div>`:'<div style="font-size:70px;text-align:center">✓</div>'}<div><h2 style="margin:0 0 8px">${academic?'已完成，立即檢討':'術科實作站完成'}</h2><p style="color:var(--muted);line-height:1.7">${academic?`自動計分 ${r.attempt.scored} 題，答對 ${r.attempt.correct} 題。請不要只看分數，下面每題都有答案來源與解析狀態。`:'請逐站對照操作檢核點、教學解析與常見失分點。術科正式成績仍以實際檢定現場評分為準。'}</p><button id="newExam" class="btn btn-primary">再做一份練習</button></div></div></div><div class="review-list">${r.review.map(reviewHTML).join('')}</div></div></section>`;
 document.querySelector('#newExam').onclick=()=>{state.result=null;renderHome();scrollTo({top:0,behavior:'smooth'})};document.querySelectorAll('[data-report]').forEach(b=>b.onclick=()=>reportQuestion(b.dataset.report));}
function reviewHTML(x){if(x.type==='academic'){const good=x.isCorrect;return `<article class="review"><div class="review-head"><span class="badge ${good?'correct':'wrong'}">${good?'✓ 正確':'✕ 錯誤'}</span><span class="badge">${esc(x.exam)} #${x.number??'—'}</span><span class="badge">${esc(x.subject)}</span><span class="badge ${x.verificationStatus==='official-corrected'||x.verificationStatus==='official-bonus'?'warn':''}">${statusLabel(x.verificationStatus)}</span></div><div class="review-body"><strong>${esc(x.text)}</strong><div class="answer-box">你的答案：<b>${esc(x.userAnswer||'未作答')}</b>　｜　正確答案：<b>${esc((x.acceptedAnswers||[]).includes('BONUS')?'送分':(x.acceptedAnswers||[]).join(' 或 '))}</b></div><div class="explanation"><b>檢討：</b>${esc(x.explanation||'解析待複核')}</div><div class="source-note">${x.correctionNotice?`<a href="${esc(x.correctionNotice)}" target="_blank" rel="noopener">官方更正公告</a>　`:''}${x.sourceUrl?`<a href="${esc(x.sourceUrl)}" target="_blank" rel="noopener">${esc(x.sourceLabel||'題目來源')}</a>　`:''}${x.answerSource?`<a href="${esc(x.answerSource)}" target="_blank" rel="noopener">答案來源</a>　`:''}<button class="btn btn-secondary btn-sm" data-report="${esc(x.id)}">回報疑義</button></div></div></article>`}
 return `<article class="review"><div class="review-head"><span class="badge">${esc(x.exam)}</span><span class="badge">${esc(x.subject)}</span><span class="badge">自評：${esc(x.selfAssessment||'未作答')}</span></div><div class="review-body"><strong>${esc(x.title)}</strong>${x.checklist?.length?`<div class="answer-box"><b>操作檢核：</b> ${x.checklist.map(esc).join(' → ')}</div>`:''}<div class="explanation"><b>教學解析：</b>${esc(x.explanation||'')}</div><div class="notice"><b>常見失分：</b>${esc(x.pitfalls||'')}</div><div class="source-note">此處為教學整理，不宣稱是官方逐字評分表。 ${x.sourceUrl?`<a href="${esc(x.sourceUrl)}" target="_blank" rel="noopener">查看官方來源</a>`:''}　<button class="btn btn-secondary btn-sm" data-report="${esc(x.id)}">回報疑義</button></div></div></article>`}
function statusLabel(s){return ({'official-pdf':'官方 PDF','official-corrected':'官方更正','official-bonus':'官方送分','teaching-reviewed':'教學整理','manual-reviewed':'人工複核'})[s]||s||'待複核'}

async function reportQuestion(id){const message=prompt('請描述你認為有疑義的地方（例如：官方答案、更正公告、解析、分類）：');if(!message)return;try{await api('report-question',{method:'POST',body:JSON.stringify({questionId:id,message})});alert('已收到回報，管理端可進一步核對。')}catch(e){alert(e.message)}}
async function showHistory(){try{state.history=(await api('user-history')).attempts||[]}catch{}const root=document.querySelector('#modalRoot');root.innerHTML=`<div class="modal-backdrop"><div class="modal" style="width:min(800px,100%)"><h2>我的練習紀錄</h2><p>最多顯示最近 100 次。</p><div class="table-wrap"><table class="history-table"><thead><tr><th>時間</th><th>類型</th><th>題數</th><th>答對</th><th>正確率</th></tr></thead><tbody>${state.history.map(a=>`<tr><td>${datefmt(a.createdAt)}</td><td>${a.type==='academic'?'學科':'術科'}</td><td>${a.questionCount}</td><td>${a.type==='academic'?`${a.correct}/${a.scored}`:'—'}</td><td>${a.type==='academic'?pct(a.accuracy):'自評'}</td></tr>`).join('')||'<tr><td colspan="5">尚無紀錄</td></tr>'}</tbody></table></div><div class="modal-actions"><button id="closeHistory" class="btn btn-secondary">關閉</button></div></div></div>`;document.querySelector('#closeHistory').onclick=()=>root.innerHTML=''}


function showResetPassword(){
 const root=document.querySelector('#modalRoot');
 root.innerHTML=`<div class="modal-backdrop"><div class="modal"><h2>設定新密碼</h2><p>已驗證密碼重設連結，請輸入新的密碼。</p><div class="field"><label>新密碼</label><input id="newPw" type="password" minlength="8"></div><div class="field"><label>再次輸入</label><input id="newPw2" type="password" minlength="8"></div><div id="resetStatus" class="status-text"></div><div class="modal-actions"><button id="savePw" class="btn btn-primary">儲存新密碼</button></div></div></div>`;
 document.querySelector('#savePw').onclick=async()=>{const st=document.querySelector('#resetStatus');try{const a=document.querySelector('#newPw').value,b=document.querySelector('#newPw2').value;if(a.length<8)throw new Error('密碼至少 8 個字元');if(a!==b)throw new Error('兩次密碼不一致');await updateUser({password:a});location.href='/'}catch(e){st.className='status-text error';st.textContent=e.message}};
}

function showAuth(force=false){const root=document.querySelector('#modalRoot');let tab='login';
 const draw=()=>{root.innerHTML=`<div class="modal-backdrop"><div class="modal"><h2>${tab==='login'?'登入練習系統':tab==='signup'?'建立考生帳號':'重設密碼'}</h2><p>${tab==='signup'?'Email 用於帳號登入與驗證；姓名與單位用於個人成績及群體統計。':'登入後可保存跨裝置練習紀錄。'}</p><div class="auth-tabs"><button class="auth-tab ${tab==='login'?'active':''}" data-tab="login">登入</button><button class="auth-tab ${tab==='signup'?'active':''}" data-tab="signup">註冊</button></div>${tab==='recover'?recoverForm():authForm(tab)}<div id="authStatus" class="status-text"></div><div class="modal-actions">${!force?'<button id="closeAuth" class="btn btn-secondary">取消</button>':''}${tab==='login'?'<button id="forgotBtn" class="btn btn-secondary">忘記密碼</button>':''}<button id="authSubmit" class="btn btn-primary">${tab==='login'?'登入':tab==='signup'?'建立帳號':'寄送重設信'}</button></div></div></div>`;
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;draw()});document.querySelector('#closeAuth')?.addEventListener('click',()=>root.innerHTML='');document.querySelector('#forgotBtn')?.addEventListener('click',()=>{tab='recover';draw()});document.querySelector('#authSubmit').onclick=()=>doAuth(tab);};draw();}
function authForm(tab){return `<div class="field"><label>Email</label><input id="authEmail" type="email" autocomplete="email" required></div>${tab==='signup'?'<div class="field"><label>姓名</label><input id="nickname" maxlength="60" placeholder="請輸入姓名" required></div><div class="field"><label>單位</label><input id="unit" maxlength="100" placeholder="例如：嘉南藥理大學 運動管理系" required></div>':''}<div class="field"><label>密碼</label><input id="authPassword" type="password" minlength="8" autocomplete="current-password" required></div>${tab==='signup'?'<div class="field"><label>再次輸入密碼</label><input id="authPassword2" type="password" minlength="8" required></div>':''}`}
function recoverForm(){return `<div class="field"><label>Email</label><input id="authEmail" type="email" autocomplete="email" required></div>`}
async function doAuth(tab){const status=document.querySelector('#authStatus'),btn=document.querySelector('#authSubmit');status.className='status-text';status.textContent='處理中…';btn.disabled=true;try{const email=document.querySelector('#authEmail').value.trim();if(tab==='recover'){await requestPasswordRecovery(email);status.className='status-text ok';status.textContent='已寄出密碼重設信，請檢查信箱。';btn.disabled=false;return}
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('請輸入可用的 Email 格式');const password=document.querySelector('#authPassword').value;if(tab==='signup'){const p2=document.querySelector('#authPassword2').value;if(password!==p2)throw new Error('兩次密碼不一致');const nickname=document.querySelector('#nickname').value.trim(),unit=document.querySelector('#unit').value.trim();if(!nickname||!unit)throw new Error('請填寫姓名與單位');await signup(email,password,{full_name:nickname,unit});status.className='status-text ok';status.textContent='帳號已建立。若專案未開啟自動確認，請先到信箱點擊確認連結再登入。';btn.disabled=false;}else{await login(email,password);location.href='/'}}
 catch(e){status.className='status-text error';status.textContent=e.message||'操作失敗';btn.disabled=false}}

init();
