import {useEffect,useState} from "react";
import EggInviteAuthor from "./EggInviteAuthor";
import {createClient} from "@supabase/supabase-js";

export const EGG_AI_SPHERES=[
 ["matter","Материальное"],["idea","Идея"],["marketing","Маркетинг"],
 ["design","Творчество"],["testDrive","Тест-драйв"],["commerce","Коммерция"],
 ["legal","Право"],["production","Производство"],["procurement","Комплектация"],["retail","Ритейл"]
] as const;
export type EggAiSphere=typeof EGG_AI_SPHERES[number][0];
export type EggAiBalance=Record<EggAiSphere,number>;
const defaults=()=>Object.fromEntries(EGG_AI_SPHERES.map(([id])=>[id,50])) as EggAiBalance;
const key=(projectId:string)=>"egg:ai-balance:v1:"+projectId;
const clamp=(value:number)=>Number.isFinite(value)?Math.max(0,Math.min(100,Math.round(value/5)*5)):50;
export function readEggAiBalance(projectId:string):EggAiBalance{
 const result=defaults();
 if(!projectId||typeof window==="undefined")return result;
 try{
  const saved=JSON.parse(localStorage.getItem(key(projectId))||"{}") as Record<string,unknown>;
  for(const [id] of EGG_AI_SPHERES)if(typeof saved[id]==="number")result[id]=clamp(saved[id] as number);
 }catch{/* corrupted browser preference: use safe defaults */}
 return result;
}
export function writeEggAiBalance(projectId:string,next:EggAiBalance){
 if(!projectId)return;
 localStorage.setItem(key(projectId),JSON.stringify(next));
 window.dispatchEvent(new CustomEvent("egg-ai-balance-changed",{detail:{projectId}}));
}
async function aiRequest(projectId:string,method:"GET"|"POST",sphere?:EggAiSphere,value?:number){
 const configResponse=await fetch("/api/egg-config",{cache:"no-store"});if(!configResponse.ok)throw Error("Конфигурация EGG недоступна");
 const config=await configResponse.json() as {supabaseUrl:string;publishableKey:string};
 const client=createClient(config.supabaseUrl,config.publishableKey);const {data:{session}}=await client.auth.getSession();
 if(!session)throw Error("Войдите как Автор");
 const response=await fetch("/api/egg-ai-balance"+(method==="GET"?"?project="+encodeURIComponent(projectId):""),{
  method,cache:"no-store",headers:{Authorization:"Bearer "+session.access_token,...(method==="POST"?{"Content-Type":"application/json"}:{})},
  ...(method==="POST"?{body:JSON.stringify({projectId,sphere,value})}:{})
 });
 const data=await response.json() as {shares?:Partial<EggAiBalance>;error?:string};
 if(!response.ok)throw Error(data.error??"Не удалось сохранить настройку");
 return data;
}
export function useEggAiBalance(projectId:string){
 const [balance,setBalance]=useState<EggAiBalance>(()=>readEggAiBalance(projectId));
 const [syncStatus,setSyncStatus]=useState<"loading"|"saved"|"error">("loading");
 useEffect(()=>{
  let active=true;
  const sync=()=>setBalance(readEggAiBalance(projectId));
  sync();window.addEventListener("storage",sync);window.addEventListener("egg-ai-balance-changed",sync);
  if(projectId)void aiRequest(projectId,"GET").then(data=>{
   if(!active)return;
   const next={...defaults(),...data.shares};writeEggAiBalance(projectId,next);setSyncStatus("saved");
  }).catch(()=>{if(active)setSyncStatus("error")});
  return()=>{active=false;window.removeEventListener("storage",sync);window.removeEventListener("egg-ai-balance-changed",sync)};
 },[projectId]);
 const setSphere=(sphere:EggAiSphere,value:number)=>{
  if(syncStatus!=="saved")return;
  const old=readEggAiBalance(projectId),next={...old,[sphere]:clamp(value)};
  writeEggAiBalance(projectId,next);setSyncStatus("loading");
  void aiRequest(projectId,"POST",sphere,next[sphere]).then(()=>setSyncStatus("saved")).catch(()=>{writeEggAiBalance(projectId,old);setSyncStatus("error")});
 };
 const reset=()=>{if(syncStatus!=="saved")return;setSyncStatus("loading");void (async()=>{try{for(const [sphere] of EGG_AI_SPHERES)await aiRequest(projectId,"POST",sphere,50);writeEggAiBalance(projectId,defaults());setSyncStatus("saved")}catch{setSyncStatus("error")}})()};
 return {balance,setSphere,reset,syncStatus};
}
export function EggAiSlider({projectId,sphere,disabled=false}:{projectId:string;sphere:EggAiSphere;disabled?:boolean}){
 const {balance,setSphere,syncStatus}=useEggAiBalance(projectId);
 const value=balance[sphere];
 return <div className="rounded-xl border border-foreground/15 p-3" data-testid={"egg-ai-slider-"+sphere}>
  <div className="mb-2 flex justify-between text-xs"><span>Участие ИИ</span><strong>{value}%</strong></div>
  <input aria-label={"Участие ИИ: "+sphere} className="w-full accent-foreground" type="range" min={0} max={100} step={5} value={value}
   disabled={disabled||syncStatus!=="saved"} onChange={e=>setSphere(sphere,Number(e.target.value))}/>
  <p className="mt-1 text-[11px] text-foreground/60">Автор {100-value}% · ИИ {value}%</p>
  <p className="mt-1 text-[11px] text-foreground/50">Настройка синхронизируется с Supabase. 0% блокирует ручной запуск ИИ из панели сферы; остальные значения пока показывают желаемую степень делегирования.</p>
 </div>;
}
export function EggAiControlDesk({projectId}:{projectId:string}){
 const {balance,setSphere,reset,syncStatus}=useEggAiBalance(projectId);
 const [inviteSphere,setInviteSphere]=useState<EggAiSphere|null>(null);
 const average=Math.round(EGG_AI_SPHERES.reduce((sum,[id])=>sum+balance[id],0)/EGG_AI_SPHERES.length);
 return <section className="rounded-xl border border-foreground/15 p-4" aria-label="Пульт участия ИИ" data-testid="egg-ai-control-desk">
  <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-medium">Пульт Автора · баланс сфер</h2><span className="text-sm">{average}% ИИ</span></div>
  <p className="mt-1 text-xs text-foreground/60">Среднее заданных уровней делегирования, не измерение выполненной работы.</p>
  <div className="mt-3 grid gap-3 sm:grid-cols-2">
   {EGG_AI_SPHERES.map(([id,label])=><label key={id} className="block text-xs">
    <span className="flex justify-between"><span>{label}</span><span>{balance[id]}%</span></span>
    <input aria-label={"Участие ИИ: "+label} type="range" min={0} max={100} step={5} value={balance[id]} disabled={syncStatus!=="saved"} onChange={e=>setSphere(id,Number(e.target.value))} className="mt-1 w-full accent-foreground"/>
    {id!=="matter"&&id!=="idea"&&<button type="button" onClick={()=>setInviteSphere(id)} className="mt-1 text-[11px] underline underline-offset-2">Участники · назначить</button>}
   </label>)}
  </div>
  {inviteSphere&&<div className="mt-3 rounded-lg border border-foreground/15 p-2"><div className="flex justify-between text-xs"><span>Приглашение · {EGG_AI_SPHERES.find(([id])=>id===inviteSphere)?.[1]}</span><button type="button" onClick={()=>setInviteSphere(null)} aria-label="Закрыть приглашение">×</button></div><EggInviteAuthor key={inviteSphere} projectId={projectId} initialSphere={inviteSphere}/></div>}
  <button type="button" onClick={reset} disabled={syncStatus!=="saved"} className="mt-3 rounded-lg border border-foreground/20 px-3 py-2 text-xs">Все по 50%</button>
  <p className="mt-2 text-[11px] text-foreground/55">Сохранение: {syncStatus==="saved"?"Supabase":syncStatus==="loading"?"синхронизация":"ошибка — обновите страницу"}. Утверждение ДНК и переход между уровнями остаются за Автором.</p>
 </section>;
}
