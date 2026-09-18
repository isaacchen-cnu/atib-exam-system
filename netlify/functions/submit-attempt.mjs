import { getStore } from '@netlify/blobs';
import { getAllBankItems } from '../../lib/bank.mjs';
import { requireProfileUser, userMeta, json } from './_auth.mjs';

export default async (req) => {
  if(req.method!=='POST') return json({error:'Method not allowed'},405);
  const auth=await requireProfileUser(); if(!auth.user)return json({error:auth.error},auth.status); const user=auth.user;
  let body; try{body=await req.json();}catch{return json({error:'資料格式錯誤'},400)}
  const all=await getAllBankItems(); const map=new Map(all.map(q=>[q.id,q]));
  const responses=Array.isArray(body.responses)?body.responses:[];
  const review=[]; let correct=0,scored=0;
  for(const r of responses){
    const q=map.get(r.id); if(!q) continue;
    if(q.type==='academic'){
      const accepted=q.acceptedAnswers||[]; const bonus=accepted.includes('BONUS');
      const isCorrect=bonus || accepted.includes(String(r.answer||'').toUpperCase());
      if(q.autoScored!==false){scored++; if(isCorrect)correct++;}
      review.push({id:q.id,type:q.type,exam:q.exam,group:q.group,subject:q.subject,number:q.number,text:q.text,options:q.options,userAnswer:r.answer||'',acceptedAnswers:accepted,isCorrect,explanation:q.explanation||'',verificationStatus:q.verificationStatus,sourceUrl:q.sourceUrl||'',sourceLabel:q.sourceLabel||'',answerSource:q.answerSource||'',explanationSource:q.explanationSource||'',correctionNotice:q.correctionNotice||''});
    } else {
      const self=String(r.selfAssessment||'未作答');
      review.push({id:q.id,type:q.type,exam:q.exam,group:q.group,subject:q.subject,title:q.title,prompt:q.prompt,scenario:q.scenario,selfAssessment:self,checklist:q.checklist,explanation:q.explanation,pitfalls:q.pitfalls,verificationStatus:q.verificationStatus,sourceUrl:q.sourceUrl,sourceLabel:q.sourceLabel||'',explanationSource:q.explanationSource||''});
    }
  }
  const attempt={
    id:crypto.randomUUID(),createdAt:new Date().toISOString(),user:{id:user.id,nickname:userMeta(user).full_name||userMeta(user).nickname||'',unit:userMeta(user).unit||''},
    mode:body.mode||{},type:body.type||'academic',questionCount:review.length,scored,correct,accuracy:scored?correct/scored:null,
    answers:review.map(x=>({id:x.id,type:x.type,exam:x.exam,group:x.group,subject:x.subject,userAnswer:x.userAnswer||'',selfAssessment:x.selfAssessment||'',isCorrect:x.isCorrect??null}))
  };
  try{const store=getStore('attempts'); await store.setJSON(`attempt/${attempt.createdAt}-${attempt.id}`,attempt);}catch(e){console.error('store attempt failed',e)}
  return json({attempt:{id:attempt.id,createdAt:attempt.createdAt,questionCount:attempt.questionCount,scored,correct,accuracy:attempt.accuracy},review});
};
