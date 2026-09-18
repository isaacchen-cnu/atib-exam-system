import { getDraftItems, saveDraftItems, normalizeQuestion } from '../../lib/bank.mjs';
import { requireUser,isAdmin,json } from './_auth.mjs';
export default async(req)=>{
 if(req.method!=='POST')return json({error:'Method not allowed'},405);const user=await requireUser();if(!user)return json({error:'請先登入'},401);if(!isAdmin(user))return json({error:'需要 admin 權限'},403);
 let body;try{body=await req.json()}catch{return json({error:'JSON格式錯誤'},400)} const incoming=Array.isArray(body.items)?body.items:[]; if(!incoming.length)return json({error:'沒有可匯入的題目'},400);
 const current=await getDraftItems(); const map=new Map(current.map(q=>[q.id,q])); let added=0,updated=0;
 for(const raw of incoming){if(!raw?.id)continue;const q=normalizeQuestion({...raw,approvedForPublish:raw.approvedForPublish===true});if(map.has(q.id))updated++;else added++;map.set(q.id,q)}
 const items=[...map.values()];await saveDraftItems(items,{lastImportBy:user.email,lastImportAt:new Date().toISOString()});return json({ok:true,added,updated,total:items.length});
};
