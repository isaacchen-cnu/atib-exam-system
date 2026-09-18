import { getStore } from '@netlify/blobs';
import { getAllBankItems } from '../../lib/bank.mjs';
import { requireUser,isAdmin,json } from './_auth.mjs';
export default async () => {
  const user=await requireUser(); if(!user) return json({error:'請先登入'},401); if(!isAdmin(user))return json({error:'需要 admin 權限'},403);
  const attempts=[];
  try{const store=getStore('attempts'); const list=await store.list({prefix:'attempt/'}); for(const b of list.blobs||[]){const a=await store.get(b.key,{type:'json'}); if(a)attempts.push(a)}}catch(e){}
  const bank=await getAllBankItems(); const bmap=new Map(bank.map(q=>[q.id,q]));
  const qstat=new Map(), subject=new Map(), practical=new Map(), unit=new Map(), users=new Set(); let totalScored=0,totalCorrect=0;
  for(const a of attempts){
    if(a.user?.id)users.add(a.user.id); const u=a.user?.unit||'未填單位'; unit.set(u,(unit.get(u)||0)+1);
    for(const r of a.answers||[]){
      const q=bmap.get(r.id);
      if(r.type==='practical'){
        const ps=practical.get(r.id)||{id:r.id,exam:r.exam,group:r.group,subject:r.subject,title:q?.title||r.id,attempts:0,partial:0,unknown:0};
        ps.attempts++; if(r.selfAssessment==='部分掌握')ps.partial++; if(r.selfAssessment==='不會'||!r.selfAssessment||r.selfAssessment==='未作答')ps.unknown++; practical.set(r.id,ps); continue;
      }
      if(r.isCorrect===null||r.isCorrect===undefined)continue;
      totalScored++; if(r.isCorrect)totalCorrect++;
      const s=qstat.get(r.id)||{id:r.id,exam:r.exam,group:r.group,subject:r.subject,text:q?.text||r.id,attempts:0,wrong:0}; s.attempts++; if(!r.isCorrect)s.wrong++; qstat.set(r.id,s);
      const ss=subject.get(r.subject)||{subject:r.subject,attempts:0,wrong:0}; ss.attempts++; if(!r.isCorrect)ss.wrong++; subject.set(r.subject,ss);
    }
  }
  const hardest=[...qstat.values()].map(x=>({...x,errorRate:x.attempts?x.wrong/x.attempts:0})).sort((a,b)=>b.errorRate-a.errorRate||b.attempts-a.attempts).slice(0,100);
  const subjects=[...subject.values()].map(x=>({...x,errorRate:x.wrong/x.attempts})).sort((a,b)=>b.errorRate-a.errorRate);
  const practicalDifficulty=[...practical.values()].map(x=>({...x,difficultyRate:x.attempts?(x.partial+x.unknown)/x.attempts:0,unknownRate:x.attempts?x.unknown/x.attempts:0})).sort((a,b)=>b.difficultyRate-a.difficultyRate||b.attempts-a.attempts).slice(0,100);
  return json({summary:{attempts:attempts.length,users:users.size,totalScored,totalCorrect,accuracy:totalScored?totalCorrect/totalScored:null},hardest,subjects,practicalDifficulty,units:[...unit.entries()].map(([name,attempts])=>({name,attempts})).sort((a,b)=>b.attempts-a.attempts)});
};
