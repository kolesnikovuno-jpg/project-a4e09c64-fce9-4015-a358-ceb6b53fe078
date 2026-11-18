import {useEffect,useState} from "react";

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
export function useEggAiBalance(projectId:string){
 const [balance,setBalance]=useState<EggAiBalance>(()=>readEggAiBalance(projectId));
 useEffect(()=>{
  const sync=()=>setBalance(readEggAiBalance(projectId));
  sync();
  window.addEventListener("storage",sync);
  window.addEventListener("egg-ai-balance-changed",sync);
  return()=>{window.removeEventListener("storage",sync);window.removeEventListener("egg-ai-balance-changed",sync)};
 },[projectId]);
 const setSphere=(sphere:EggAiSphere,value:number)=>{
  const next={...readEggAiBalance(projectId),[sphere]:clamp(value)};
  writeEggAiBalance(projectId,next);
 };
 const reset=()=>writeEggAiBalance(projectId,defaults());
 return {balance,setSphere,reset};
}
export function EggAiSlider({projectId,sphere,disabled=false}:{projectId:string;sphere:EggAiSphere;disabled?:boolean}){
 const {balance,setSphere}=useEggAiBalance(projectId);
 const value=balance[sphere];
 return <div className="rounded-xl border border-foreground/15 p-3" data-testid={"egg-ai-slider-"+sphere}>
  <div className="mb-2 flex justify-between text-xs"><span>Участие ИИ</span><strong>{value}%</strong></div>
  <input aria-label={"Участие ИИ: "+sphere} className="w-full accent-foreground" type="range" min={0} max={100} step={5} value={value}
   disabled={disabled} onChange={e=>setSphere(sphere,Number(e.target.value))}/>
  <p className="mt-1 text-[11px] text-foreground/60">Автор {100-value}% · ИИ {value}%</p>
  <p className="mt-1 text-[11px] text-foreground/50">Настройка хранится в этом браузере. 0% блокирует ручной запуск ИИ из панели сферы; остальные значения пока показывают желаемую степень делегирования.</p>
 </div>;
}
export function EggAiControlDesk({projectId}:{projectId:string}){
 const {balance,setSphere,reset}=useEggAiBalance(projectId);
 const average=Math.round(EGG_AI_SPHERES.reduce((sum,[id])=>sum+balance[id],0)/EGG_AI_SPHERES.length);
 return <section className="rounded-xl border border-foreground/15 p-4" aria-label="Пульт участия ИИ" data-testid="egg-ai-control-desk">
  <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-medium">Пульт Автора · баланс сфер</h2><span className="text-sm">{average}% ИИ</span></div>
  <p className="mt-1 text-xs text-foreground/60">Среднее заданных уровней делегирования, не измерение выполненной работы.</p>
  <div className="mt-3 grid gap-3 sm:grid-cols-2">
   {EGG_AI_SPHERES.map(([id,label])=><label key={id} className="block text-xs">
    <span className="flex justify-between"><span>{label}</span><span>{balance[id]}%</span></span>
    <input aria-label={"Участие ИИ: "+label} type="range" min={0} max={100} step={5} value={balance[id]} onChange={e=>setSphere(id,Number(e.target.value))} className="mt-1 w-full accent-foreground"/>
   </label>)}
  </div>
  <button type="button" onClick={reset} className="mt-3 rounded-lg border border-foreground/20 px-3 py-2 text-xs">Все по 50%</button>
  <p className="mt-2 text-[11px] text-foreground/55">Локальное сохранение на устройстве. Утверждение ДНК и переход между уровнями остаются за Автором.</p>
 </section>;
}
