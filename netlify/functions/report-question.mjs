import { getStore } from '@netlify/blobs';
import { requireProfileUser, userMeta, json } from './_auth.mjs';
export default async(req)=>{
 if(req.method!=='POST')return json({error:'Method not allowed'},405); const auth=await requireProfileUser(); if(!auth.user)return json({error:auth.error},auth.status); const user=auth.user;
 let body;try{body=await req.json()}catch{return json({error:'格式錯誤'},400)}
 if(!body.questionId||!String(body.message||'').trim())return json({error:'請填寫問題描述'},400);
 const report={id:crypto.randomUUID(),createdAt:new Date().toISOString(),questionId:body.questionId,message:String(body.message).slice(0,1500),user:{id:user.id,nickname:userMeta(user).full_name||'',unit:userMeta(user).unit||''}};
 try{await getStore('question-reports').setJSON(`report/${report.createdAt}-${report.id}`,report)}catch(e){console.error(e)}
 return json({ok:true});
};
