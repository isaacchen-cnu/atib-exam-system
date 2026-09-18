import { getDraftItems, saveDraftItems } from '../../lib/bank.mjs';
import { requireUser,isAdmin,json } from './_auth.mjs';
function contentOK(q){
 if(!q.enabled||!q.exam||!q.group||!q.subject||!q.sourceUrl)return false;
 if(q.type==='academic')return !!q.text && [2,4].includes(Object.keys(q.options||{}).length) && Array.isArray(q.acceptedAnswers)&&q.acceptedAnswers.length>0 && !['needs-review','unverified',''].includes(q.verificationStatus||'') && !!(q.answerSource||q.correctionNotice);
 if(q.type==='practical')return !!q.title&&!!q.prompt&&!!q.explanation;
 return false;
}
export default async(req)=>{
 const user=await requireUser();if(!user)return json({error:'請先登入'},401);if(!isAdmin(user))return json({error:'需要 admin 權限'},403);if(req.method!=='POST')return json({error:'Method not allowed'},405);
 let body;try{body=await req.json()}catch{return json({error:'JSON格式錯誤'},400)} const action=body.action;const f=body.filter||{};let items=await getDraftItems();let touched=0,skipped=0;
 for(const q of items){let match=true;if(f.type&&q.type!==f.type)match=false;if(f.exam&&q.exam!==f.exam)match=false;if(f.subject&&q.subject!==f.subject)match=false;if(f.status&&(q.verificationStatus||'')!==f.status)match=false;if(f.q&&!JSON.stringify(q).toLowerCase().includes(String(f.q).toLowerCase()))match=false;if(!match)continue;
   if(action==='approve'){if(contentOK(q)){q.approvedForPublish=true;touched++}else skipped++;}else if(action==='unapprove'){q.approvedForPublish=false;touched++;}else return json({error:'未知操作'},400);
 }
 await saveDraftItems(items,{bulkAction:action,bulkBy:user.email,bulkAt:new Date().toISOString()});return json({ok:true,touched,skipped});
};
