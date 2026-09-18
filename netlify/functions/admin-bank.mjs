import { getDraftItems, summarize, validateForPublish, getPublishedSnapshot } from '../../lib/bank.mjs';
import { requireUser,isAdmin,json } from './_auth.mjs';
export default async(req)=>{
 const user=await requireUser(); if(!user)return json({error:'請先登入'},401); if(!isAdmin(user))return json({error:'需要 admin 權限'},403);
 const url=new URL(req.url); const all=await getDraftItems(); let rows=all;
 const f={type:url.searchParams.get('type')||'',exam:url.searchParams.get('exam')||'',group:url.searchParams.get('group')||'',subject:url.searchParams.get('subject')||'',status:url.searchParams.get('status')||'',q:(url.searchParams.get('q')||'').trim().toLowerCase()};
 if(f.type)rows=rows.filter(x=>x.type===f.type); if(f.exam)rows=rows.filter(x=>x.exam===f.exam); if(f.group)rows=rows.filter(x=>x.group===f.group); if(f.subject)rows=rows.filter(x=>x.subject===f.subject); if(f.status)rows=rows.filter(x=>(x.verificationStatus||'')===f.status); if(f.q)rows=rows.filter(x=>JSON.stringify(x).toLowerCase().includes(f.q));
 const limit=Math.max(1,Math.min(Number(url.searchParams.get('limit')||100),300)); const offset=Math.max(0,Number(url.searchParams.get('offset')||0));
 const pub=await getPublishedSnapshot();
 return json({summary:summarize(all),published:{version:pub.version,publishedAt:pub.publishedAt,summary:pub.summary||summarize(pub.items||[])},filters:{exams:[...new Set(all.map(x=>x.exam).filter(Boolean))].sort().reverse(),groups:[...new Set(all.map(x=>x.group).filter(Boolean))],subjects:[...new Set(all.map(x=>x.subject).filter(Boolean))].sort(),statuses:[...new Set(all.map(x=>x.verificationStatus||'未標示'))].sort()},totalFiltered:rows.length,offset,limit,items:rows.slice(offset,offset+limit).map(q=>({...q,publishErrors:validateForPublish(q)}))});
};
