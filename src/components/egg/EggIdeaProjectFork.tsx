import {useState} from "react";
import {createClient} from "@supabase/supabase-js";
import type {MatterCard} from "./EggMatterDialogue";

type IdeaMessage={role:"user"|"assistant";content:string};
type SelectedMaterial=MatterCard&{location?:string};
export type IdeaForkDraft={
 intent:string;constraints:string;savedDraft:string;spacePhoto:string;
 messages:IdeaMessage[];materials:SelectedMaterial[];materialInsight:string;
};

export function copyIdeaForkToLocalProject(projectId:string,draft:IdeaForkDraft){
 // Only selected materials are inherited. The original unselected field,
 // previous AI sphere results, original project DNA and all flow cycles stay put.
 const entries:[string,string][]=[
  ["egg:idea-workspace:v1:"+projectId,JSON.stringify({
   intent:draft.intent,constraints:draft.constraints,
   messages:draft.messages.slice(-40),savedDraft:draft.savedDraft,
   spacePhoto:draft.spacePhoto,
  })],
  ["egg:project-field:v1:"+projectId,JSON.stringify(draft.materials.map(card=>({
   ...card,location:"matter",
  })))],
 ];
 if(draft.materialInsight.trim()){
  entries.push(["egg:matter-dialogue:v1:"+projectId,JSON.stringify([{
   role:"assistant",content:draft.materialInsight,
  }])]);
 }
 const written:string[]=[];
 try{
  for(const [key,value] of entries){
   if(localStorage.getItem(key)!==null)throw Error("destination_exists");
   localStorage.setItem(key,value);
   written.push(key);
  }
 }catch(error){
  for(const key of written)try{localStorage.removeItem(key);}catch{/* preserve original */}
  throw error;
 }
}

export default function EggIdeaProjectFork({draft,onCreated}:{
 draft:IdeaForkDraft;onCreated:(newId:string)=>void;
}){
 const [open,setOpen]=useState(false);
 const [title,setTitle]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [createdId,setCreatedId]=useState("");
 const start=()=>{setTitle(draft.intent.trim().slice(0,120)||"Новая идея");setError("");setOpen(v=>!v);};
 const hasInput=Boolean(draft.intent.trim());
 const finish=(id:string)=>{
  copyIdeaForkToLocalProject(id,draft);
  onCreated(id);
 };
 const create=async()=>{
  if(busy||!hasInput||!title.trim()||createdId)return;
  setBusy(true);setError("");
  try{
   const cfgResponse=await fetch("/api/egg-config",{cache:"no-store"});
   if(!cfgResponse.ok)throw Error("Не удалось получить настройки EGG.");
   const cfg=await cfgResponse.json() as {supabaseUrl:string;publishableKey:string};
   const auth=createClient(cfg.supabaseUrl,cfg.publishableKey);
   const {data:{session}}=await auth.auth.getSession();
   if(!session?.access_token)throw Error("Войдите в EGG, чтобы создать проект.");
   // No seed is supplied here: the Author will explicitly approve the DNA
   // inside the new project. This request does not launch any sphere.
   const response=await fetch("/api/egg",{method:"POST",headers:{
    "Content-Type":"application/json",Authorization:"Bearer "+session.access_token,
   },body:JSON.stringify({command:"create",title:title.trim().slice(0,120)})});
   const result=await response.json() as {ok?:boolean;projectId?:string;error?:string};
   if(!response.ok||!result.ok||!result.projectId||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result.projectId)){
    throw Error(result.error==="author_required"
      ?"Нужен вход под аккаунтом Автора.":result.error||"Не удалось создать отдельный проект.");
   }
   setCreatedId(result.projectId);
   finish(result.projectId);
  }catch(e){
   setError(e instanceof Error?(
    e.message==="QuotaExceededError"||e.name==="QuotaExceededError"?
     "Проект создан, но в браузере недостаточно памяти для переноса черновика. Исходные данные сохранены. Освободите место и повторите перенос.":
    e.message==="destination_exists"?
     "Проект уже содержит данные. Автоматический перенос остановлен, чтобы их не перезаписать.":
     e.message
   ):"Ошибка создания проекта.");
  }finally{setBusy(false);}
 };
 const retry=()=>{
  if(!createdId||busy)return;
  setError("");
  try{finish(createdId);}catch{
   setError("Не удалось перенести локальный черновик. Старый проект не изменён. Проверьте свободное место на этом устройстве.");
  }
 };
 return <section className="rounded-[12px] border border-foreground/20 bg-background/90 p-3"
  data-testid="egg-idea-project-fork">
  <div className="flex items-start justify-between gap-2">
   <div>
    <p className="text-xs font-medium">Новая идея · отдельный проект</p>
    <p className="mt-1 text-xs leading-relaxed text-foreground/65">
     Если замысел относится к другому объекту, можно создать самостоятельный проект из текущей идеи. Перенесутся только выбранные черновики и материалы — без прежней ДНК и циклов.
    </p>
   </div>
  </div>
  {!open?
   <button type="button" onClick={start}
    className="mt-3 min-h-10 rounded-full border border-foreground/30 px-4 py-2 text-xs"
    data-testid="egg-fork-open">Создать проект из этой идеи</button>:
   <div className="mt-3 space-y-3">
    <label className="block text-xs">Название нового проекта
     <input aria-label="Название нового проекта" value={title} onChange={e=>setTitle(e.target.value)}
      maxLength={120} className="mt-2 w-full rounded-xl border border-foreground/20 bg-background p-3 text-base outline-none md:text-sm"/>
    </label>
    <p className="text-xs leading-relaxed text-foreground/65">
     Перенесём: авторское намерение, рамки, {draft.spacePhoto?"фото пространства, ":""}
     {draft.materials.length} отобранных материалов, {draft.messages.length} сообщений диалога и сохранённый черновик.
     Исходная ДНК, результаты сфер и старые итерации <strong>не переносятся</strong>.
    </p>
    <p className="text-[11px] leading-relaxed text-foreground/55">
     Новый проект создаётся в аккаунте EGG. Холст, фото и материалы пока останутся в браузере этого устройства
     до явного утверждения ДНК и запуска нового цикла.
    </p>
    {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-2">
     {createdId?
      <button type="button" onClick={retry} className="rounded-full border border-foreground/30 px-4 py-2 text-xs">
       Повторить перенос в созданный проект
      </button>:
      <button type="button" disabled={!hasInput||!title.trim()||busy} onClick={()=>void create()}
       data-testid="egg-fork-create" className="min-h-10 rounded-full bg-foreground px-4 py-2 text-xs text-background disabled:opacity-35">
       {busy?"Создаём…":"Создать и открыть отдельную «Идею»"}
      </button>}
     <button type="button" disabled={busy} onClick={()=>setOpen(false)}
      className="rounded-full border border-foreground/20 px-4 py-2 text-xs">Отмена</button>
    </div>
    {!hasInput&&<p className="text-xs text-foreground/60">Для нового проекта сначала укажите намерение Автора выше.</p>}
  </div>}
 </section>;
}
