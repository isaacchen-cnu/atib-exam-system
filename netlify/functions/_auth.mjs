import { getUser } from '@netlify/identity';
export async function requireUser(){return await getUser();}
export function userMeta(user){return user?.userMetadata||user?.user_metadata||{};}
export async function requireProfileUser(){const user=await getUser();if(!user)return {user:null,error:'請先登入',status:401};const m=userMeta(user);if(!user.email||!String(m.full_name||'').trim()||!String(m.unit||'').trim())return {user:null,error:'帳號缺少姓名或單位，請重新完成註冊資料。',status:403};return {user,error:null,status:200};}
export function isAdmin(user){const roles=user?.roles||user?.app_metadata?.roles||user?.appMetadata?.roles||[];const roleAdmin=roles.includes('admin');const allow=(process.env.ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);const emailAdmin=!!user?.email&&allow.includes(user.email.toLowerCase());return roleAdmin||emailAdmin;}
export function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8'}});}
