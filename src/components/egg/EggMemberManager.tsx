import {useCallback,useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
const names:Record<string,string>={marketing:"Маркетинг",design:"Творчество",testDrive:"Тест-драйв",commerce:"Коммерция",legal:"Право",production:"Производство",procurement:"Комплектация",retail:"Ритейл"};
type Member={user_id:string;role:"observer"|"contributor";spheres:string[]};
export default function EggMemberManager({projectId}:{projectId:string}){
 const [members,setMembers]=useState<Member[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const call=useCallback(async(action:string,extra:Record<string,unknown>={})=>{
  const cfgResponse=await fetch("/api/egg-config",{cache:"no-store"});if(!cfgResponse.ok)throw Error("Нет конфигурации");
  const cfg=await cfgResponse.json() as {supabaseUrl:string;publishableKey:string};
  const auth=createClient(cfg.supabaseUrl,cfg.publishableKey);const {data:{session}}=await auth.auth.getSession();
  if(!session)throw Error("Необходим вход Автора");
  const response=await fetch("/api/egg-invitations",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({action,projectId,...extra})});
  const result=await response.json() as {members?:Member[];error?:string};
  if(!response.ok)throw Error(result.error??"Ошибка доступа");
  return result;
 },[projectId]);
 const refresh=useCallback(async()=>{setLoading(true);try{const data=await call("list");setMembers(data.members??[]);setError("");}catch(e){setError(e instanceof Error?e.message:"Не удалось прочитать участников");}finally{setLoading(false)}},[call]);
 useEffect(()=>{void refresh()},[refresh]);
 const change=async(member:Member)=>{setBusy(member.user_id);setNotice("");try{await call("update_member",{memberId:member.user_id,role:member.role,spheres:member.spheres});setNotice("Права сохранены");await refresh()}catch(e){setError(e instanceof Error?e.message:"Ошибка сохранения")}finally{setBusy("")}};
 const remove=async(member:Member)=>{if(!window.confirm("Отозвать доступ участника к проекту? История его работы сохранится."))return;setBusy(member.user_id);setNotice("");try{await call("remove_member",{memberId:member.user_id});setNotice("Доступ отозван");await refresh()}catch(e){setError(e instanceof Error?e.message:"Ошибка отзыва")}finally{setBusy("")}};
 return <section className="rounded-xl border border-foreground/15 p-3 sm:p-4" aria-label="Участники проекта">
  <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-medium">Участники проекта</h3><button type="button" onClick={()=>void refresh()} className="text-xs underline">Обновить</button></div>
  <p className="mt-1 text-xs text-foreground/60">Доступ ограничен назначенными сферами. Изменение или отзыв разрешений не удаляет выполненную работу.</p>
  {loading&&<p className="mt-2 text-xs">Загрузка…</p>}
  {error&&<p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
  {notice&&<p role="status" className="mt-2 text-xs">{notice}</p>}
  {!loading&&members.length===0&&<p className="mt-3 text-xs text-foreground/60">Подключённых участников пока нет.</p>}
  <div className="mt-3 space-y-3">{members.map(member=><MemberRow key={member.user_id} member={member} busy={!!busy} onSave={change} onRemove={remove}/>)}</div>
 </section>;
}
function MemberRow({member,busy,onSave,onRemove}:{member:Member;busy:boolean;onSave:(m:Member)=>void;onRemove:(m:Member)=>void}){
 const [role,setRole]=useState<Member["role"]>(member.role),[selected,setSelected]=useState<string[]>(member.spheres);
 useEffect(()=>{setRole(member.role);setSelected(member.spheres)},[member.role,member.spheres]);
 return <div className="rounded-lg border border-foreground/10 p-3 text-xs">
  <p className="break-all font-medium">Участник · {member.user_id}</p>
  <label className="mt-2 block">Роль<select value={role} disabled={busy} onChange={e=>setRole(e.target.value as Member["role"])} className="ml-2 rounded border border-foreground/20 bg-background p-1"><option value="contributor">Участник</option><option value="observer">Наблюдатель</option></select></label>
  {role==="contributor"&&<fieldset className="mt-2 grid grid-cols-2 gap-2"><legend className="mb-1">Доступные сферы</legend>{Object.entries(names).map(([id,label])=><label key={id} className="flex items-center gap-1"><input type="checkbox" disabled={busy} checked={selected.includes(id)} onChange={e=>setSelected(old=>e.target.checked?[...old,id]:old.filter(x=>x!==id))}/>{label}</label>)}</fieldset>}
  <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy||(role==="contributor"&&selected.length===0)} onClick={()=>onSave({...member,role,spheres:role==="observer"?[]:selected})} className="rounded border border-foreground/25 px-3 py-2 disabled:opacity-40">Сохранить права</button><button type="button" disabled={busy} onClick={()=>onRemove(member)} className="rounded border border-foreground/25 px-3 py-2 disabled:opacity-40">Отозвать доступ</button></div>
 </div>;
}
