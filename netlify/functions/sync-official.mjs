import { getStore } from '@netlify/blobs';
import { manifest, getDraftItems, saveDraftItems, normalizeQuestion } from '../../lib/bank.mjs';
import { parseOfficialPdf } from '../../lib/pdf-parser.mjs';
import { requireUser,isAdmin,json } from './_auth.mjs';
export default async(req)=>{
 if(req.method!=='POST')return json({error:'Method not allowed'},405);const user=await requireUser();if(!user)return json({error:'請先登入'},401);if(!isAdmin(user))return json({error:'需要 admin 權限'},403);
 let body;try{body=await req.json()}catch{return json({error:'格式錯誤'},400)} const source=manifest.sources.find(s=>s.key===body.key);if(!source)return json({error:'找不到來源'},404);
 if(source.status==='manual-review-required')return json({status:'manual-review-required',message:'此來源為掃描檔，禁止自動判答案，請人工複核後用 JSON 匯入。',source});
 try{const res=await fetch(source.url);if(!res.ok)throw new Error(`下載失敗 ${res.status}`);const parsed=await parseOfficialPdf(await res.arrayBuffer(),source);const complete=parsed.integrity?.length?parsed.integrity.every(x=>x.complete):false;const meta={syncedAt:new Date().toISOString(),sourceKey:source.key,status:parsed.status,numPages:parsed.numPages,totalTextItems:parsed.totalTextItems,integrity:parsed.integrity||[],itemCount:parsed.items?.length||0,complete};await getStore('official-question-bank').setJSON(`meta/${source.key}`,meta);
 const draft=await getDraftItems();const map=new Map(draft.map(q=>[q.id,q]));for(const raw of parsed.items||[]){const existing=map.get(raw.id);const q=normalizeQuestion({...raw,answerSource:raw.correctionNotice||raw.sourceUrl||source.url,sourceLabel:'官方歷屆試題/解答',approvedForPublish:existing?.approvedForPublish===true,enabled:existing?.enabled!==false,reviewNotes:existing?.reviewNotes||''});map.set(q.id,{...existing,...q})}await saveDraftItems([...map.values()],{lastSyncSource:source.key,lastSyncAt:new Date().toISOString(),lastSyncBy:user.email});return json({ok:true,meta,imported:parsed.items?.length||0});
 }catch(e){console.error(e);return json({error:'同步失敗',detail:String(e.message||e)},500)}
};
