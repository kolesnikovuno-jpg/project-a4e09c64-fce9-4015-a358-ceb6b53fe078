import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import {makePreview,type MatterCard} from "./EggMatterDialogue";
import {waitForEggAiRequest,postponeEggAiRequests} from "../../lib/eggAiPacing";
import {buildEggIdeaExternalField,type EggOuterFieldCard} from "../../lib/eggIdeaExternalField";
import {parseEggFormedIdea} from "../../lib/eggFormedIdeaView";
import {
 EGG_IDEA_EXTERIOR_ORDER,EGG_IDEA_EXTERIOR_LENSES,eggIdeaExteriorProgress,
 eggIdeaExteriorSourceKey,type EggIdeaExteriorFinding,
} from "../../lib/eggIdeaExterior";

type Selected=MatterCard&{location?:string};
type Snapshot={sourceKey:string;findings:EggIdeaExteriorFinding[];idea:string;updatedAt:string};
const empty=(sourceKey:string):Snapshot=>({sourceKey,findings:[],idea:"",updatedAt:""});
const storageKey=(id:string)=>"egg:idea-exterior:v1:"+id;
function restore(projectId:string,key:string):Snapshot{
 try{
  const data=JSON.parse(localStorage.getItem(storageKey(projectId))||"null") as Partial<Snapshot>|null;
  if(data?.sourceKey!==key||!Array.isArray(data.findings))return empty(key);
  const findings=data.findings.filter(f=>f&&EGG_IDEA_EXTERIOR_ORDER.some(id=>id===f.sphere)&&
    typeof f.text==="string"&&f.text.trim().length>=8).map(f=>({sphere:f.sphere,text:f.text.slice(0,1200)}));
  return {sourceKey:key,findings,idea:typeof data.idea==="string"?data.idea.slice(0,2500):"",
    updatedAt:typeof data.updatedAt==="string"?data.updatedAt:""};
 }catch{return empty(key);}
}
const asMessage=(sphere:string)=>"Исследуй инициацию Автора через профессиональную позицию "+sphere+
 ". Внешний круг, до формирования ДНК. Дай краткий независимый диагностический результат.";
export default function EggIdeaExteriorRound({
 projectId,intent,constraints,materials,fieldCards,materialInsight,sketchImage,spacePhoto,visualKey,onIdeaReady,onProceed,
}:{
 projectId:string;intent:string;constraints:string;materials:Selected[];
 fieldCards:EggOuterFieldCard[];materialInsight:string;sketchImage:string;spacePhoto:string;
 visualKey:string;onIdeaReady:(idea:string)=>void;onProceed?:(idea:string)=>void;
}){
 const externalField=useMemo(()=>buildEggIdeaExternalField(fieldCards),[fieldCards]);
 const sourceKey=eggIdeaExteriorSourceKey({intent,constraints,materialInsight,
  selected:materials,field:externalField,visualKey});
 const [snapshot,setSnapshot]=useState<Snapshot>(()=>restore(projectId,sourceKey));
 const [running,setRunning]=useState(false);
 const [message,setMessage]=useState("");
 const runId=useRef(0);
 const requestController=useRef<AbortController|null>(null);
 const validSnapshot=snapshot.sourceKey===sourceKey?snapshot:empty(sourceKey);
 const count=eggIdeaExteriorProgress(validSnapshot.findings);
 const formed=useMemo(()=>parseEggFormedIdea(validSnapshot.idea),[validSnapshot.idea]);
 const store=useCallback((next:Snapshot)=>{
  setSnapshot(next);
  try{localStorage.setItem(storageKey(projectId),JSON.stringify(next));}
  catch{setMessage("Нет места для сохранения локального исследования. Проверьте хранилище браузера.");}
 },[projectId]);
 useEffect(()=>{
  runId.current++;
  requestController.current?.abort();requestController.current=null;
  setRunning(false);setSnapshot(restore(projectId,sourceKey));setMessage("");
 },[projectId,sourceKey]);
 useEffect(()=>{
  onIdeaReady(formed.idea);
 },[formed.idea,onIdeaReady]);
 useEffect(()=>()=>{runId.current++;requestController.current?.abort();},[]);

 async function run(){
  if(running||!intent.trim())return;
  const current=++runId.current;
  setRunning(true);setMessage("");
  let next=validSnapshot;
  try{
   const configResponse=await fetch("/api/egg-config",{cache:"no-store"});
   if(!configResponse.ok)throw Error("Настройки ИИ недоступны.");
   const config=await configResponse.json() as {supabaseUrl:string;publishableKey:string};
   const auth=createClient(config.supabaseUrl,config.publishableKey);
   const {data:{session}}=await auth.auth.getSession();
   if(!session?.access_token)throw Error("Для исследования нужно войти в EGG.");
   const payloadMaterials=await Promise.all(materials.slice(0,18).map(async(m,i)=>({
    id:m.id,type:m.type,text:m.text.slice(0,1500),
    ...(i<8&&(m.type==="image"||m.type==="sketch")?{imageData:await makePreview(m)}:{}),
   })));
   const visual=[
    ...(spacePhoto?[{id:"space-context-photo",type:"image" as const,text:"Фото существующей среды. Не форма проектируемого объекта.",imageData:spacePhoto}]:[]),
    ...(sketchImage?[{id:"author-idea-sketch",type:"sketch" as const,text:"Авторский скетч замысла (не утверждённая форма).",imageData:sketchImage}]:[]),
   ];
   const post=async(extra:Record<string,unknown>,userText:string):Promise<string>=>{
    await waitForEggAiRequest({onWaiting:seconds=>setMessage("Ограничение частоты ИИ; повтор через "+seconds+" с")});
    if(runId.current!==current)throw Error("Исследование остановлено");
    const controller=new AbortController();requestController.current=controller;
    const response=await fetch("/api/egg-flow-ai?op=idea-dialogue",{
     method:"POST",signal:controller.signal,
     headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},
     body:JSON.stringify({
      projectId,intent:intent.slice(0,3000),constraints:constraints.slice(0,2000),
      materialInsight:materialInsight.slice(0,4000),materials:[...visual,...payloadMaterials],
      externalField,messages:[{role:"user",content:userText.slice(0,3000)}],...extra,
     }),
    });
    if(response.status===429)postponeEggAiRequests(70000);
    const result=await response.json() as {ok?:boolean;reply?:string;error?:string};
    if(!response.ok||!result.ok||!result.reply)
      throw Error(response.status===429?"Провайдер ограничил запросы. Результаты сохранены; позже можно продолжить.":
        "ИИ не завершил исследование: "+(result.error||response.status));
    return result.reply.slice(0,1200);
   };
   for(const sphere of EGG_IDEA_EXTERIOR_ORDER){
    if(runId.current!==current)throw Error("Исследование остановлено");
    if(next.findings.some(f=>f.sphere===sphere))continue;
    setMessage("Внешний круг · "+EGG_IDEA_EXTERIOR_LENSES[sphere].name);
    const reply=await post({externalSphere:sphere},asMessage(EGG_IDEA_EXTERIOR_LENSES[sphere].name));
    next={...next,findings:[...next.findings,{sphere,text:reply}],idea:"",
      updatedAt:new Date().toISOString()};
    store(next);
   }
   if(!next.idea){
    setMessage("Синтезируем сформированную Идею");
    const summary=await post({externalFindings:next.findings},
     "Синтезируй результаты восьми независимых исследовательских сфер. "+
     "Сформулируй ОДНУ рабочую Идею, главное напряжение и максимум один вопрос. "+
     "Идея — ОДНО ёмкое предложение, не пересказ инициации и не список референсов. "+
     "Не вынуждай Автора выбирать между двумя качествами, если замысел именно в их сочетании. "+
     "Раздели идею и доказательные основания. ДНК пока не создавай и ничего не утверждай.");
    next={...next,idea:summary,updatedAt:new Date().toISOString()};
    store(next);
   }
   setMessage("Внешний круг завершён · Идея предложена Автору");
  }catch(e){
   if(runId.current===current)setMessage(e instanceof Error?e.message:"Ошибка исследования");
  }finally{
   if(runId.current===current){setRunning(false);requestController.current=null;}
  }
 }
 function stop(){
  runId.current++;requestController.current?.abort();requestController.current=null;
  setRunning(false);setMessage("Остановлено. Сохранённые вклады сфер можно использовать при продолжении.");
 }
 return <section className="space-y-3 rounded-xl border border-foreground/15 bg-background/70 p-3"
  data-testid="egg-idea-external-round" aria-label="Внешний круг восьми сфер">
  <div className="flex items-center justify-between gap-2">
   <div><h3 className="text-sm font-medium">Исследование Идеи</h3>
    <p className="text-[11px] text-foreground/60">
      {validSnapshot.idea?"Сформированная Идея · требуется решение Автора":
       "Внешний круг · "+count+"/8 сфер"}
    </p></div>
   {running?<button type="button" onClick={stop} className="rounded-full border border-foreground/30 px-3 py-2 text-xs">Остановить</button>:
    <button type="button" onClick={()=>void run()} disabled={!intent.trim()||!!validSnapshot.idea}
     data-testid="egg-idea-start-research"
     className="rounded-full bg-[#607466] px-4 py-2 text-xs text-white disabled:opacity-40">
     {validSnapshot.idea?"Завершено":count>0?"Продолжить внешний круг":"Пуск · 8 сфер"}
    </button>}
  </div>
  {running&&<div role="progressbar" aria-label="Исследование восьми сфер"
    aria-valuenow={count} aria-valuemin={0} aria-valuemax={8}
    className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
    <div className="h-full rounded-full bg-[#607466] transition-all" style={{width:Math.round(count/8*100)+"%"}}/>
  </div>}
  {message&&<p role="status" className="text-xs text-foreground/65">{message}</p>}
  {validSnapshot.idea&&<div className="border-t border-foreground/10 pt-3"
    data-testid="egg-exterior-formed-idea">
    <p className="text-[11px] text-foreground/55">Сформированная Идея · предложение, не утверждено</p>
    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed" data-testid="egg-formed-idea-core">{formed.idea}</p>
    {onProceed&&<button type="button" onClick={()=>onProceed(formed.idea)}
      disabled={!formed.idea.trim()} data-testid="egg-proceed-to-dna"
      className="mt-3 min-h-10 rounded-full bg-[#607466] px-4 py-2 text-sm text-white disabled:opacity-40">
      Продолжить → ДНК
    </button>}
    <details className="mt-3 border-t border-foreground/10 pt-3 text-xs text-foreground/65" data-testid="egg-idea-research-details">
      <summary className="cursor-pointer">Анализ · напряжение, вопрос, основания</summary>
      {formed.tension&&<p className="mt-3 whitespace-pre-wrap leading-relaxed">
        <strong>Возможное напряжение:</strong> {formed.tension}
      </p>}
      {formed.question&&<p className="mt-3 whitespace-pre-wrap leading-relaxed">
        <strong>Вопрос для Автора:</strong> {formed.question}
      </p>}
      <details className="mt-3 border-t border-foreground/10 pt-2">
        <summary className="cursor-pointer">Полный исследовательский вывод</summary>
        <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">{formed.fullText}</p>
      </details>
    </details>
   </div>}
  {count>0&&<details className="text-xs text-foreground/65">
   <summary className="cursor-pointer" data-testid="egg-exterior-detail-toggle">Вклады сфер · {count}/8</summary>
   <div className="mt-3 space-y-2">
    {EGG_IDEA_EXTERIOR_ORDER.map(sphere=>{
     const f=validSnapshot.findings.find(v=>v.sphere===sphere);
     return <div key={sphere} className="rounded-lg border border-foreground/10 p-2">
      <p className="font-medium">{EGG_IDEA_EXTERIOR_LENSES[sphere].name} · {f?"исследовано":"ожидает"}</p>
      {f&&<p className="mt-1 whitespace-pre-wrap">{f.text}</p>}
     </div>;
    })}
   </div>
  </details>}
  <p className="text-[10px] text-foreground/50">
    Восемь отдельных запросов ИИ и итоговый синтез расходуют токены. Интернет и содержимое ссылок
    пока не проверяются автоматически; используется текст, выбранное Материальное и доступные изображения.
  </p>
 </section>;
}
