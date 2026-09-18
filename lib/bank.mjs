import { getStore } from '@netlify/blobs';
import practical from '../server-data/practical-bank.json' with { type: 'json' };
import manifest from '../server-data/source-manifest.json' with { type: 'json' };

export { manifest };

const DRAFT_STORE='draft-question-bank';
const PUBLISHED_STORE='published-question-bank';

export function normalizeQuestion(q={}) {
  const out={...q};
  out.enabled = q.enabled !== false;
  out.approvedForPublish = q.approvedForPublish === true;
  out.reviewNotes = q.reviewNotes || '';
  out.explanationSource = q.explanationSource || '';
  out.answerSource = q.answerSource || q.sourceUrl || '';
  if (out.type==='academic') {
    out.acceptedAnswers = Array.isArray(out.acceptedAnswers) ? out.acceptedAnswers.map(x=>String(x).toUpperCase()) : [];
    out.options = out.options || {};
  }
  return out;
}

export function seedDraftItems(){
  // 術科先作為後台草稿；學科不放示範題，避免誤認為正式歷屆題。
  return practical.items.map(q=>normalizeQuestion({...q,approvedForPublish:false,enabled:true,reviewNotes:q.reviewNotes||'既有術科教學整理，請管理者確認後再發布。'}));
}

export async function getDraftItems(){
  try {
    const data=await getStore(DRAFT_STORE).get('bank/current',{type:'json'});
    if (data?.items) return data.items.map(normalizeQuestion);
  } catch {}
  return seedDraftItems();
}

export async function saveDraftItems(items,meta={}){
  const payload={version:new Date().toISOString(),meta,items:items.map(normalizeQuestion)};
  await getStore(DRAFT_STORE).setJSON('bank/current',payload);
  return payload;
}

export async function getPublishedSnapshot(){
  try {
    const data=await getStore(PUBLISHED_STORE).get('bank/current',{type:'json'});
    if(data?.items) return data;
  } catch {}
  return {version:null,publishedAt:null,publishedBy:null,items:[]};
}

export async function savePublishedSnapshot(items,user,summary={}){
  const payload={version:new Date().toISOString(),publishedAt:new Date().toISOString(),publishedBy:user?.email||'',summary,items:items.map(normalizeQuestion)};
  await getStore(PUBLISHED_STORE).setJSON('bank/current',payload);
  try{await getStore(PUBLISHED_STORE).setJSON(`history/${payload.version}`,payload)}catch{}
  return payload;
}

export function validateForPublish(q){
  const errors=[];
  if(!q.id) errors.push('缺少ID');
  if(!q.enabled) errors.push('已停用');
  if(!q.approvedForPublish) errors.push('尚未核准發布');
  if(!q.exam) errors.push('缺少年度/梯次');
  if(!q.group) errors.push('缺少類群');
  if(!q.subject) errors.push('缺少考科/技能');
  if(!q.sourceUrl) errors.push('缺少題目來源');
  if(q.type==='academic'){
    if(!q.text) errors.push('缺少題幹');
    const n=Object.keys(q.options||{}).length;
    if(![2,4].includes(n)) errors.push('選項不完整');
    if(!Array.isArray(q.acceptedAnswers)||!q.acceptedAnswers.length) errors.push('缺少答案');
    if(['needs-review','unverified',''].includes(q.verificationStatus||'')) errors.push('答案尚未驗證');
    if(!q.answerSource && !q.correctionNotice) errors.push('缺少答案來源');
  }else if(q.type==='practical'){
    if(!q.title||!q.prompt) errors.push('術科題目不完整');
    if(!q.explanation) errors.push('缺少教學答案/解析');
  }else errors.push('未知題型');
  return errors;
}

export function publicQuestion(q) {
  if (q.type==='academic') {
    return {id:q.id,type:q.type,year:q.year,session:q.session,exam:q.exam,group:q.group,subject:q.subject,subjectClassification:q.subjectClassification||'',number:q.number||null,text:q.text,options:q.options,official:!!q.official,verificationStatus:q.verificationStatus,sourceUrl:q.sourceUrl||'',sourceLabel:q.sourceLabel||''};
  }
  return {id:q.id,type:q.type,year:q.year,session:q.session,exam:q.exam,group:q.group,subject:q.subject,bodyRegion:q.bodyRegion,title:q.title,prompt:q.prompt,scenario:q.scenario,official:false,verificationStatus:q.verificationStatus,sourceUrl:q.sourceUrl||'',sourceLabel:q.sourceLabel||''};
}

export async function getAllBankItems() {
  const snap=await getPublishedSnapshot();
  return (snap.items||[]).filter(q=>q.enabled!==false);
}

export function chooseQuestions(items, params={}) {
  const {type='academic',year='',group='',subject='',exam='',count=20,random=true}=params;
  let pool=items.filter(q=>q.type===type);
  if (String(year)) pool=pool.filter(q=>String(q.year)===String(year));
  if (exam) pool=pool.filter(q=>q.exam===exam);
  if (group) pool=pool.filter(q=>q.group===group);
  if (subject) pool=pool.filter(q=>q.subject===subject);
  if (random) pool=[...pool].sort(()=>Math.random()-0.5);
  return pool.slice(0,Math.max(1,Math.min(Number(count)||20,100)));
}

export function summarize(items){
  const bySubject={}; const byExam={}; const byType={academic:0,practical:0}; const byStatus={};
  for(const q of items){
    byType[q.type]=(byType[q.type]||0)+1;
    bySubject[q.subject]=(bySubject[q.subject]||0)+1;
    byExam[q.exam]=(byExam[q.exam]||0)+1;
    byStatus[q.verificationStatus||'未標示']=(byStatus[q.verificationStatus||'未標示']||0)+1;
  }
  return {total:items.length,byType,bySubject,byExam,byStatus};
}
