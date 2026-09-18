import { getStore } from '@netlify/blobs';
import { requireProfileUser, userMeta, json } from './_auth.mjs';
export default async () => {
  const auth=await requireProfileUser(); if(!auth.user)return json({error:auth.error},auth.status); const user=auth.user;
  const out=[];
  try{
    const store=getStore('attempts');
    const list=await store.list({prefix:'attempt/'});
    for(const b of list.blobs||[]){const a=await store.get(b.key,{type:'json'}); if(a?.user?.id===user.id)out.push({id:a.id,createdAt:a.createdAt,type:a.type,questionCount:a.questionCount,scored:a.scored,correct:a.correct,accuracy:a.accuracy,mode:a.mode});}
  }catch(e){}
  out.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  return json({attempts:out.slice(0,100)});
};
