import { getStore } from '@netlify/blobs';
import { manifest } from '../../lib/bank.mjs';
import { requireUser,isAdmin,json } from './_auth.mjs';
export default async()=>{
 const user=await requireUser();if(!user)return json({error:'請先登入'},401);if(!isAdmin(user))return json({error:'需要 admin 權限'},403);
 const statuses=[];const store=getStore('official-question-bank');
 for(const s of manifest.sources){let meta=null;try{meta=await store.get(`meta/${s.key}`,{type:'json'})}catch{} statuses.push({...s,meta});}
 return json({sources:statuses,corrections:manifest.corrections});
};
