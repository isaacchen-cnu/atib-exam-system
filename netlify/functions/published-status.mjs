import { getPublishedSnapshot, summarize } from '../../lib/bank.mjs';
import { requireUser,isAdmin,json } from './_auth.mjs';
export default async()=>{const user=await requireUser();if(!user)return json({error:'請先登入'},401);if(!isAdmin(user))return json({error:'需要 admin 權限'},403);const s=await getPublishedSnapshot();return json({version:s.version,publishedAt:s.publishedAt,publishedBy:s.publishedBy,summary:s.summary||summarize(s.items||[])});};
