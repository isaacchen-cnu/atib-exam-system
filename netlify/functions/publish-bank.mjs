import { getDraftItems, savePublishedSnapshot, validateForPublish, summarize } from '../../lib/bank.mjs';
import { requireUser,isAdmin,json } from './_auth.mjs';
export default async(req)=>{
 const user=await requireUser();if(!user)return json({error:'請先登入'},401);if(!isAdmin(user))return json({error:'需要 admin 權限'},403);if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const draft=await getDraftItems(); const publishable=[]; const blocked=[];
 for(const q of draft){const errs=validateForPublish(q); if(errs.length)blocked.push({id:q.id,exam:q.exam,subject:q.subject,title:q.text||q.title||'',errors:errs}); else publishable.push(q)}
 if(!publishable.length)return json({error:'目前沒有可發布的題目。請先在後台核准題目。',blocked:blocked.slice(0,50)},400);
 const summary=summarize(publishable); const snap=await savePublishedSnapshot(publishable,user,summary); return json({ok:true,publishedAt:snap.publishedAt,summary,blockedCount:blocked.length,blocked:blocked.slice(0,100)});
};
