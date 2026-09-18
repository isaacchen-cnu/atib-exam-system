import { getDraftItems, saveDraftItems, normalizeQuestion } from '../../lib/bank.mjs';
import { requireUser,isAdmin,json } from './_auth.mjs';
export default async(req)=>{
 const user=await requireUser();if(!user)return json({error:'請先登入'},401);if(!isAdmin(user))return json({error:'需要 admin 權限'},403);if(req.method!=='POST')return json({error:'Method not allowed'},405);
 let body;try{body=await req.json()}catch{return json({error:'JSON格式錯誤'},400)}
 const incoming=normalizeQuestion(body.question||{}); if(!incoming.id)return json({error:'缺少題目ID'},400);
 const items=await getDraftItems(); const i=items.findIndex(x=>x.id===incoming.id); if(i<0)items.push(incoming); else items[i]=incoming;
 await saveDraftItems(items,{lastEditedBy:user.email,lastEditedAt:new Date().toISOString()}); return json({ok:true,question:incoming});
};
