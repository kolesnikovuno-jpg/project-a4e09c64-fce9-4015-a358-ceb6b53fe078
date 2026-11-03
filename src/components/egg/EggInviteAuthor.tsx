import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
const spheres:Record<string,string>={marketing:"Маркетинг",legal:"Право",design:"Дизайн",production:"Производство",testDrive:"Тестдрайв",procurement:"Комплектация",commerce:"Коммерция",retail:"Ритейл"};
export default function EggInviteAuthor({projectId}:{projectId:string}){
 const [email,setEmail]=useState(""),[sphere,setSphere]=useState("design"),[role,setRole]=useState("contributor"),[inviteUrl,setInviteUrl]=useState(""),[status,setStatus]=useState(""),[busy,setBusy]=useState(false);
 async function invite(){
  if(!email.trim()||busy)return;setBusy(true);setStatus("");setInviteUrl("");
  try{
   const cfgRes=await fetch("/api/egg-config");if(!cfgRes.ok)throw Error("config");
   const cfg=await cfgRes.json() as {supabaseUrl:string;publishableKey:string};
   const auth=createClient(cfg.supabaseUrl,cfg.publishableKey);const {data}=await auth.auth.getSession();if(!data.session)throw Error("auth");
   const response=await fetch("/api/egg-invitations",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+data.session.access_token},body:JSON.stringify({action:"create",projectId,email:email.trim(),role,spheres:role==="observer"?[]:[sphere]})});
   if(!response.ok)throw Error("invite");
   const payload=await response.json() as {token:string};
   setInviteUrl(window.location.origin+"/egg/connect#egg-invite="+payload.token);setStatus("Приглашение создано. Передайте ссылку адресату лично. Срок действия — 7 дней.");
  }catch{setStatus("Не удалось создать приглашение. Проверьте адрес и права Автора.");}
  setBusy(false);
 }
 return <section className="mt-5 rounded-xl border border-foreground/15 p-3 sm:p-4"><h3 className="mb-2 text-sm font-medium">Пригласить участника</h3><p className="mb-3 text-xs text-foreground/60">Доступ получает только владелец указанной и подтверждённой почты. Для участника назначается одна сфера; другие можно добавить позднее.</p>
 <div className="grid gap-2 sm:grid-cols-2"><input type="email" aria-label="Почта участника" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Почта участника" className="rounded border border-foreground/20 bg-background p-2 text-sm"/>
 <select aria-label="Роль" value={role} onChange={e=>setRole(e.target.value)} className="rounded border border-foreground/20 bg-background p-2 text-sm"><option value="contributor">Участник</option><option value="observer">Наблюдатель</option></select>
 {role==="contributor"&&<select aria-label="Сфера участника" value={sphere} onChange={e=>setSphere(e.target.value)} className="rounded border border-foreground/20 bg-background p-2 text-sm">{Object.entries(spheres).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>}
 <button type="button" onClick={()=>void invite()} disabled={busy||!email.trim()} className="rounded border border-foreground/30 p-2 text-sm disabled:opacity-40">Создать приглашение</button></div>
 {status&&<p role="status" className="mt-2 text-xs">{status}</p>}
 {inviteUrl&&<div className="mt-2 space-y-2"><p className="break-all rounded bg-foreground/5 p-2 text-xs">{inviteUrl}</p><button type="button" onClick={()=>void navigator.clipboard.writeText(inviteUrl).then(()=>setStatus("Ссылка скопирована."))} className="rounded border border-foreground/20 px-3 py-2 text-xs">Скопировать ссылку</button></div>}
 </section>;
}