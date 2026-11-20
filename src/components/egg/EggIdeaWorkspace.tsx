import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BrainCircuit, Check, Send, X } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { makePreview, type MatterCard } from "./EggMatterDialogue";
import EggWorkspaceNavigation from "./EggWorkspaceNavigation";
import EggIterationBridge from "./EggIterationBridge";
import EggFormStudyAccess from "./EggFormStudyAccess";
import EggWorkspaceSync from "./EggWorkspaceSync";
import EggIdeaProjectFork from "./EggIdeaProjectFork";
import EggDnaFormation from "./EggDnaFormation";
import EggIdeaExteriorRound from "./EggIdeaExteriorRound";
import EggAuthorProcessMonitor from "./EggAuthorProcessMonitor";
import EggSketchEditor, {type SketchStroke} from "./EggSketchEditor";
import type {EggIdeaHandoff} from "../../lib/eggIdeaHandoff";
import {eggIdeaFormSourceId} from "../../lib/eggIdeaFormSource";
import {buildEggIdeaExternalField} from "../../lib/eggIdeaExternalField";
import {eggMaterialInsight,isEggMaterialMapCurrent,readEggMaterialMapRecord,
 readLocalEggMaterialMap,eggMaterialMapKey,type EggMaterialMapRecord} from "../../lib/eggMaterialMap";
import {waitForEggAiRequest,postponeEggAiRequests} from "../../lib/eggAiPacing";

declare const __EGG_BUILD_SHA__:string;
type Message={role:"user"|"assistant";content:string};
const ideaMessageLabel=(message:Message):string=>{
 if(message.role!=="user")return message.content;
 if(message.content.startsWith("Предложи КАНДИДАТ ДНК"))return "Сформировать предложение ДНК";
 if(message.content.startsWith("Исследуй исходное намерение"))return "Исследовать идею";
 if(message.content.startsWith("Исследуй моё намерение"))return "Проявить идею";
 return message.content;
};
const readableIdeaText=(value:string)=>value
 .replace(/^\\s*#{1,4}\\s+/gm,"")
 .replace(/\\*\\*/g,"");
type FieldItem=MatterCard&{location?:string;sourceUrl?:string};
type IdeaRecord={intent:string;constraints:string;messages:Message[];savedDraft:string;spacePhoto:string};
const readJSON=(key:string):unknown=>{
 try{return JSON.parse(localStorage.getItem(key)??"null");}catch{return null;}
};
export default function EggIdeaWorkspace({projectId,onClose,onOpenMatter,onOpenField,onOpenConcept,onOpenYolk,onProjectCreated}:{
 projectId:string;onClose:()=>void;onOpenMatter:()=>void;
 onOpenField?:()=>void;onOpenConcept?:()=>void;onOpenYolk?:()=>void;
 onProjectCreated?:(projectId:string)=>void;
}){
 const key="egg:idea-workspace:v1:"+projectId;
 const [intent,setIntent]=useState("");
 const [constraints,setConstraints]=useState("");
 const [draft,setDraft]=useState("");
 const [savedDraft,setSavedDraft]=useState("");
 const [draftSavedNotice,setDraftSavedNotice]=useState(false);
 const [spacePhoto,setSpacePhoto]=useState("");
 const [messages,setMessages]=useState<Message[]>([]);
 const [materials,setMaterials]=useState<FieldItem[]>([]);
 const [fieldCards,setFieldCards]=useState<FieldItem[]>([]);
 const [materialInsight,setMaterialInsight]=useState("");
 const [materialMap,setMaterialMap]=useState<EggMaterialMapRecord|null>(null);
 const [exteriorIdea,setExteriorIdea]=useState("");
 const onExteriorIdea=useCallback((value:string)=>setExteriorIdea(previous=>previous===value?previous:value),[]);
 const [loaded,setLoaded]=useState(false);
 const [cycleEntryOpen,setCycleEntryOpen]=useState(false);
 const dnaStepRef=useRef<HTMLDetailsElement>(null);
 const [reviewedDna,setReviewedDna]=useState<{dna:string;idea:string}|null>(null);
 const onDnaReview=useCallback((next:{dna:string;idea:string}|null)=>setReviewedDna(old=>
  old?.dna===next?.dna&&old?.idea===next?.idea?old:next),[]);
 const [sketchOpen,setSketchOpen]=useState(false);
 const [sketchStrokes,setSketchStrokes]=useState<SketchStroke[]>([]);
 const [sketchImage,setSketchImage]=useState("");
 const [sketchEpoch,setSketchEpoch]=useState(0);
 const visualSourceKey=useMemo(()=>eggIdeaFormSourceId({
  intent:"",constraints:"",draft:"",materialInsight:"",materials:[],spacePhoto,formReference:sketchImage,
 }),[spacePhoto,sketchImage]);
 const [mobilePane,setMobilePane]=useState<"canvas"|"dialogue">("canvas");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const bottom=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  try{
   const value=JSON.parse(localStorage.getItem("egg:idea-sketch:v1:"+projectId)||"[]");
   setSketchStrokes(Array.isArray(value)?value.slice(0,1000):[]);
   const reference=localStorage.getItem("egg:form-reference:v1:"+projectId)||"";
   setSketchImage(/^data:image\/jpeg;base64,/.test(reference)&&reference.length<210000?reference:"");
  }catch{setSketchStrokes([]);setSketchImage("");}
 },[projectId]);
 const saveSketch=async(strokes:SketchStroke[])=>{
  setSketchStrokes(strokes);setSketchOpen(false);
  try{
   localStorage.setItem("egg:idea-sketch:v1:"+projectId,JSON.stringify(strokes));
   const preview=strokes.length?await makePreview({id:"author-idea-sketch",type:"sketch",text:"Авторский рисунок замысла",strokes}):undefined;
   if(strokes.length&&!preview)throw Error("sketch_preview_unavailable");
   if(preview&&preview.length>=210000)throw Error("sketch_preview_too_large");
   const referenceKey="egg:form-reference:v1:"+projectId;
   if(preview)localStorage.setItem(referenceKey,preview); else localStorage.removeItem(referenceKey);
   setSketchImage(preview||"");setSketchEpoch(v=>v+1);
  }catch{setError("Рисунок не удалось сохранить полностью. Сохраните более простой скетч.");}
 };
 useEffect(()=>{
  const state=readJSON(key) as Partial<IdeaRecord>|null;
  if(state){
   setIntent(typeof state.intent==="string"?state.intent:"");
   setConstraints(typeof state.constraints==="string"?state.constraints:"");
   setSavedDraft(typeof state.savedDraft==="string"?state.savedDraft:"");
   setSpacePhoto(typeof state.spacePhoto==="string"&&/^data:image\/jpeg;base64,/.test(state.spacePhoto)&&state.spacePhoto.length<210000?state.spacePhoto:"");
   setMessages(Array.isArray(state.messages)?state.messages.filter(m=>m&&(m.role==="user"||m.role==="assistant")&&typeof m.content==="string").slice(-40):[]);
  }
  const source=readJSON("egg:project-field:v1:"+projectId);
  setFieldCards(Array.isArray(source)?source:[]);
  const selected=Array.isArray(source)?source.filter((m:FieldItem)=>
   m&&m.location==="matter"&&typeof m.id==="string"&&typeof m.text==="string").slice(0,100):[];
  setMaterials(selected);
  const localMap=readLocalEggMaterialMap(projectId);
  setMaterialMap(localMap);
  // The last assistant answer is NOT an approved Material research result.
  setMaterialInsight(eggMaterialInsight(localMap,selected));
  setLoaded(true);
 },[key,projectId]);
 useEffect(()=>{
  // Read-only recovery for a new browser: Material's owner-scoped snapshot can
  // be used only if its approved source cards still match this project.
  let active=true;
  void(async()=>{
   try{
    const cfgResponse=await fetch("/api/egg-config",{cache:"no-store"});
    if(!cfgResponse.ok)return;
    const cfg=await cfgResponse.json() as {supabaseUrl:string;publishableKey:string};
    const client=createClient(cfg.supabaseUrl,cfg.publishableKey);
    const {data:{session}}=await client.auth.getSession();
    if(!session?.access_token||!active)return;
    const [{data:researchRow},{data:fieldRow}]=await Promise.all([
     client.from("egg_workspace_snapshots").select("payload")
      .eq("project_id",projectId).eq("scope","research").maybeSingle(),
     client.from("egg_workspace_snapshots").select("payload")
      .eq("project_id",projectId).eq("scope","field").maybeSingle(),
    ]);
    if(!active)return;
    const remoteMap=readEggMaterialMapRecord(researchRow?.payload);
    // Field is available to Idea research even when no Material map has been
    // accepted. The raw Field stays contextual, not an Author-approved source.
    const localField=readJSON("egg:project-field:v1:"+projectId);
    const recoveredField=Array.isArray(localField)&&localField.length?localField:fieldRow?.payload;
    if(Array.isArray(recoveredField))setFieldCards(recoveredField);
    // Never overwrite a local unreviewed map or a different accepted revision.
    const localMap=readLocalEggMaterialMap(projectId);
    if(!remoteMap||remoteMap.status!=="accepted"||
      (localMap&&(localMap.status!=="accepted"||
        localMap.sourceKey!==remoteMap.sourceKey||
        localMap.acceptedAt!==remoteMap.acceptedAt)))return;
    const source=readJSON("egg:project-field:v1:"+projectId);
    const field=Array.isArray(source)&&source.length?source:fieldRow?.payload;
    const chosen=Array.isArray(field)?field.filter((m:FieldItem)=>
     m&&m.location==="matter"&&typeof m.id==="string"&&typeof m.text==="string").slice(0,100):[];
    const insight=eggMaterialInsight(remoteMap,chosen);
    if(!insight)return;
    setMaterials(chosen);
    setMaterialMap(remoteMap);
    setMaterialInsight(insight);
    try{localStorage.setItem(eggMaterialMapKey(projectId),JSON.stringify(remoteMap));}
    catch{/* Snapshot remains accessible in server-side owner-scoped storage. */}
   }catch{/* No session/network: use only locally approved map. */}
  })();
  return()=>{active=false;};
 },[projectId]);
 useEffect(()=>{
  if(loaded)try{localStorage.setItem(key,JSON.stringify({intent,constraints,messages:messages.slice(-40),savedDraft,spacePhoto}));}catch{setError("Недостаточно места для сохранения черновика.");}
 },[key,intent,constraints,messages,savedDraft,spacePhoto,loaded]);
 useEffect(()=>{bottom.current?.scrollIntoView?.({behavior:"smooth",block:"nearest"});},[messages,busy]);
 const latestAnswer=useMemo(()=>[...messages].reverse().find(m=>m.role==="assistant")?.content??"",[messages]);
 const addSpacePhoto=async(file:File|undefined)=>{
  if(!file)return;
  if(!file.type.startsWith("image/")||file.size>12_000_000){
   setError("Выберите изображение до 12 МБ.");return;
  }
  setError("");
  try{
   const src=await new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>typeof reader.result==="string"?resolve(reader.result):reject(Error("file_read_failed"));
    reader.onerror=()=>reject(Error("file_read_failed"));
    reader.readAsDataURL(file);
   });
   const preview=await makePreview({id:"space-context-photo",type:"image",text:"Контекст существующего пространства",src});
   if(!preview||preview.length>=210000)throw Error("preview_failed");
   setSpacePhoto(preview);
  }catch{setError("Не удалось прочитать фотографию. Попробуйте JPG или PNG.");}
 };
 const restoreApproved=(handoff:EggIdeaHandoff)=>{
  // Copy only the Author-approved snapshot. Conversation history is local-only.
  // The running cycle remains on the server, and is not started again here.
  setIntent(handoff.intent);
  setConstraints(handoff.constraints);
  setSpacePhoto(handoff.spatialContext?.imageData??"");
  setMaterialInsight(handoff.materialInsight);
  const storageKey="egg:project-field:v1:"+projectId;
  const stored=readJSON(storageKey);
  const existing=Array.isArray(stored)?stored.filter((m:FieldItem)=>m&&typeof m.id==="string"):[];
  const byId=new Map<string,FieldItem>(existing.map((m:FieldItem)=>[m.id,m]));
  const chosen:FieldItem[]=handoff.materials.map(m=>({
   ...byId.get(m.id),id:m.id,type:m.type,text:m.text,location:"matter",
  }));
  // Preserve anything in the outside field; only the selected matter set is restored.
  const field=existing.filter((m:FieldItem)=>m.location!=="matter"&&!chosen.some(n=>n.id===m.id));
  try{localStorage.setItem(storageKey,JSON.stringify([...field,...chosen]));}
  catch{setError("Не удалось сохранить восстановленные материалы в браузере. Серверный цикл остаётся целым.");}
  setMaterials(chosen);
  setCycleEntryOpen(true);
 };
 const submit=async(text:string)=>{
  if(!intent.trim()||!text.trim()||busy)return;
  const next:Message={role:"user",content:text.trim().slice(0,3000)};
  const history=[...messages,next].slice(-16);
  setMessages(previous=>[...previous,next]);setDraft("");setBusy(true);setError("");
  try{
   const cfgResponse=await fetch("/api/egg-config",{cache:"no-store"});
   if(!cfgResponse.ok)throw Error("Не удалось получить настройки EGG.");
   const cfg=await cfgResponse.json() as {supabaseUrl:string;publishableKey:string};
   const auth=createClient(cfg.supabaseUrl,cfg.publishableKey);
   const {data:{session}}=await auth.auth.getSession();
   if(!session?.access_token)throw Error("Войдите в аккаунт EGG.");
   const payloadMaterials=await Promise.all(materials.slice(0,100-(spacePhoto?1:0)-(sketchImage?1:0)).map(async(m,i)=>({
    id:m.id,type:m.type,text:m.text.slice(0,2000),
    ...(m.type==="link"&&/^https?:\/\//.test(m.text)?{url:m.text.slice(0,2048)}:{}),
    ...(i<12&&(m.type==="image"||m.type==="sketch")?{imageData:await makePreview(m)}:{})
   })));
   const externalField=buildEggIdeaExternalField(fieldCards);
   const ideaMaterials=[
    ...(spacePhoto?[{id:"space-context-photo",type:"image" as const,text:"Фотография существующего пространства — контекст размещения, НЕ референс формы проектируемого объекта",imageData:spacePhoto}]:[]),
    ...(sketchImage?[{id:"author-idea-sketch",type:"sketch" as const,text:"Авторский рисунок замысла — референс формы, не утверждённая модель",imageData:sketchImage}]:[]),
    ...payloadMaterials,
   ];
   await waitForEggAiRequest({onWaiting:seconds=>setError("Ограничение запросов ИИ: повтор через "+seconds+" с…")});
   setError("");
   const response=await fetch("/api/egg-flow-ai?op=idea-dialogue",{
    method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},
    body:JSON.stringify({projectId,materials:ideaMaterials,externalField,messages:history,intent:intent.slice(0,3000),constraints:constraints.slice(0,2000),materialInsight})
   });
   const data=await response.json() as {ok?:boolean;reply?:string;error?:string};
   if(response.status===429){
    postponeEggAiRequests(70_000);
    throw Error("Провайдер ИИ ограничил запросы; черновик сохранён, повторите позже.");
   }
   if(!response.ok||!data.ok||!data.reply)throw Error(data.error==="model_incomplete"?"ИИ не завершил мысль. Попробуйте уточнить запрос.":data.error??"Ошибка ИИ.");
   setMessages(previous=>[...previous,{role:"assistant",content:data.reply!}]);
  }catch(e){setError(e instanceof Error?e.message:"Не удалось получить ответ ИИ.");}
  finally{setBusy(false);}
 };
 return <section aria-label="Сфера Идея — мастерская" data-testid="egg-idea-workspace"
  className={"fixed inset-0 z-[90] flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background text-foreground md:flex-row"+(cycleEntryOpen?" egg-idea-reading":"")}
  style={{backgroundImage:"radial-gradient(hsl(var(--foreground) / .10) 1px, transparent 1px)",backgroundSize:"25px 25px"}}>
  <div className="shrink-0 border-b border-foreground/10 bg-background/95 px-4 pb-2 pt-[max(.65rem,env(safe-area-inset-top))] md:hidden" data-testid="egg-idea-mobile-tabs">
  <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">Идея</span><button type="button" aria-label="Закрыть сферу Идея" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/15"><X size={17}/></button></div>
  <div className="mt-1 grid grid-cols-2 gap-2" role="tablist" aria-label="Режим мастерской Идея">
   <button type="button" role="tab" aria-selected={mobilePane==="canvas"} onClick={()=>setMobilePane("canvas")} className={"min-h-10 rounded-full px-3 text-sm "+(mobilePane==="canvas"?"bg-[#607466] text-white":"bg-foreground/5 text-foreground/75")}>Холст</button>
   <button type="button" role="tab" aria-selected={mobilePane==="dialogue"} onClick={()=>setMobilePane("dialogue")} className={"min-h-10 rounded-full px-3 text-sm "+(mobilePane==="dialogue"?"bg-[#607466] text-white":"bg-foreground/5 text-foreground/75")}>Диалог с ИИ</button>
  </div>
 </div>
 <div data-testid="egg-idea-canvas-pane" className={"min-h-0 min-w-0 w-full flex-1 flex-col px-4 py-3 md:w-1/2 md:px-8 md:py-5 "+(mobilePane==="canvas"?"flex":"hidden md:flex")}>
   <div className="mb-6 flex items-center justify-between gap-2">
    <h2 className="text-lg font-light">Идея <span className="text-xs opacity-50">· Автор инициирует</span></h2>
    <button type="button" onClick={onOpenMatter} className="flex items-center gap-1 rounded-full bg-background/80 px-3 py-2 text-xs shadow-sm"><ArrowLeft size={14}/> Материальное</button>
   </div>
   <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-36 md:pb-5">
    <EggAuthorProcessMonitor projectId={projectId} onOpenConcept={onOpenConcept} onOpenYolk={onOpenYolk}/>
    <label className="block text-xs text-foreground/60">Намерение Автора
     <textarea aria-label="Намерение Автора" value={intent} maxLength={3000} rows={4} onChange={e=>{setIntent(e.target.value);setDraftSavedNotice(false);}}
      placeholder="Что хочешь инициировать? Например: неутилитарный элемент пространства — отдельная нота…"
      className="mt-2 w-full resize-y rounded-xl border border-foreground/15 bg-background/80 p-3 text-base outline-none focus:border-foreground/40 md:text-sm"/>
    </label>
    <div className="flex flex-wrap items-center gap-3">
     <button type="button" onClick={()=>setSketchOpen(true)} className="rounded-full border border-foreground/30 px-3 py-2 text-xs" data-testid="egg-author-draw-sketch">
      {sketchStrokes.length?"Изменить рисунок":"Нарисовать скетч"}</button>
     <button type="button" data-testid="egg-save-author-draft"
      disabled={!intent.trim()||!loaded}
      onClick={()=>{setSavedDraft(intent.trim());setDraftSavedNotice(true);}}
      className="rounded-full border border-foreground/30 bg-background/70 px-3 py-2 text-xs disabled:opacity-40">
      <Check size={13} className="mr-1 inline"/> Сохранить черновик идеи
     </button>
     {draftSavedNotice&&<span role="status" className="text-[11px] text-foreground/60">Сохранено в этом браузере · не утверждено</span>}
     <button type="button" data-testid="egg-open-current-idea-yolk"
      disabled={!intent.trim()||!loaded}
      onClick={()=>{
       // Snapshot only; Author has not approved a cycle or DNA.
       try{localStorage.setItem(key,JSON.stringify({
        intent,constraints,messages:messages.slice(-40),savedDraft,spacePhoto,
       }));}catch{/* local draft remains unaffected */}
       if(onOpenYolk)onOpenYolk();
       else window.location.assign("/egg/yolk?project="+encodeURIComponent(projectId));
      }}
      className="rounded-full border border-foreground/35 bg-background px-3 py-2 text-xs disabled:opacity-40">
      Желток · 3D-поле
     </button>
     <EggWorkspaceSync projectId={projectId} scope="idea" ready={loaded}
      value={{intent,constraints,savedDraft,spacePhoto,messages:messages.slice(-40)}}
      isEmpty={v=>!v.intent.trim()&&!v.savedDraft.trim()&&!v.spacePhoto&&!v.constraints.trim()&&!v.messages.length}
      onRestore={v=>{
       if(!v||typeof v!=="object")return;
       setIntent(typeof v.intent==="string"?v.intent.slice(0,3000):"");
       setConstraints(typeof v.constraints==="string"?v.constraints.slice(0,2000):"");
       setSavedDraft(typeof v.savedDraft==="string"?v.savedDraft.slice(0,4000):"");
       setSpacePhoto(typeof v.spacePhoto==="string"&&
        /^data:image\/jpeg;base64,/.test(v.spacePhoto)&&v.spacePhoto.length<210000?v.spacePhoto:"");
       setMessages(Array.isArray(v.messages)?v.messages.filter(m=>m&&
        (m.role==="assistant"||m.role==="user")&&typeof m.content==="string").slice(-40):[]);
      }} className="w-full" />
    </div>
    {sketchImage&&<div className="flex items-center gap-3 rounded-lg border border-foreground/10 p-2">
      <img src={sketchImage} alt="Авторский скетч идеи" className="h-24 w-32 rounded bg-white object-contain"/>
      <p className="text-[11px] text-foreground/60">Авторский рисунок участвует в исследовании Идеи и может использоваться как референс формы. Сохраняется в этом браузере, не является ДНК или CAD.</p>
    </div>}
    <EggIdeaExteriorRound projectId={projectId} intent={intent} constraints={constraints}
     materials={materials} fieldCards={fieldCards} materialInsight={materialInsight}
     sketchImage={sketchImage} spacePhoto={spacePhoto} visualKey={visualSourceKey}
     onIdeaReady={onExteriorIdea}/>
    <details className="rounded-xl border border-foreground/10 bg-background/50 p-3" data-testid="egg-idea-supplementary">
     <summary className="cursor-pointer text-xs font-medium text-foreground/70">
      Материалы и инструменты · {materials.length} выбрано
     </summary>
     <div className="mt-3 space-y-4">
    <label className="block text-xs text-foreground/60">Рамки · необязательно
     <textarea aria-label="Рамки идеи" value={constraints} maxLength={2000} rows={2} onChange={e=>setConstraints(e.target.value)}
      placeholder="Габариты, среда, характер, ограничения — только если определены"
      className="mt-2 w-full resize-y rounded-xl border border-foreground/15 bg-background/80 p-3 text-base outline-none focus:border-foreground/40 md:text-sm"/>
    </label>
    <div className="space-y-2 rounded-xl border border-foreground/10 bg-background/40 p-3">
     <label className="block text-xs text-foreground/70">Фото пространства · контекст, не референс формы
      <input aria-label="Загрузить фото пространства" type="file" accept="image/*"
       onChange={e=>{void addSpacePhoto(e.currentTarget.files?.[0]);e.currentTarget.value="";}}
       className="mt-2 block w-full text-xs file:mr-3 file:rounded-full file:border-0 file:bg-foreground/10 file:px-3 file:py-2"/>
     </label>
     {spacePhoto&&<div className="flex items-start gap-2">
      <img src={spacePhoto} alt="Загруженное фото пространства" className="max-h-36 min-w-0 flex-1 rounded-lg object-contain"/>
      <button type="button" onClick={()=>setSpacePhoto("")} aria-label="Удалить фото пространства" className="rounded-full border border-foreground/20 p-2"><X size={14}/></button>
     </div>}
     <p className="text-[10px] opacity-55">Фото используется в диалоге и при создании образа как среда, а не образец формы. Размеры из фотографии не определяются; оригинал сохраняется локально в уменьшенном виде.</p>
    </div>
    <div className="space-y-2">
     <div className="text-xs text-foreground/70">Поле из «Материального» · {materials.length} материалов</div>
     {materialInsight?<div data-testid="egg-accepted-material-map" className="space-y-1">
       <p className="text-[11px] font-medium text-[#607466]">Карта «Материального» · принята Автором</p>
       <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-foreground/65">{materialInsight}</p>
      </div>:
      <p className="text-xs opacity-50">{materialMap&&!isEggMaterialMapCurrent(materialMap,materials)?
       "Подборка изменилась после исследования. Вернитесь в Материальное и обновите карту.":
       "Принятой карты исследования ещё нет. Вернитесь в Материальное, проверьте и примите её; идею можно инициировать самостоятельно."}</p>}
     <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {materials.map(m=><div key={m.id} className="min-w-0 rounded-lg bg-background/50 p-2">
       {m.src?.startsWith("data:image/")?<img src={m.src} alt={m.text||"Материал"} className="h-24 w-full object-contain"/>:<div className="line-clamp-4 break-words text-xs">{m.text||m.type}</div>}
       {m.src&&<p className="mt-1 truncate text-[10px] opacity-60">{m.text||m.type}</p>}
      </div>)}
     </div>
    </div>
    {savedDraft&&<div className="space-y-2 rounded-xl border border-foreground/15 bg-background/50 p-3">
     <div className="text-xs font-medium">Сохранённый черновик · не утверждён</div>
     <p className="whitespace-pre-wrap text-xs">{savedDraft}</p>
    </div>}
    {intent.trim().length>=8&&<EggFormStudyAccess key={projectId+":"+sketchEpoch} projectId={projectId} intent={intent}
     constraints={constraints} savedDraft={savedDraft} materialInsight={materialInsight}
     materials={materials} spacePhoto={spacePhoto}/>}
    {intent.trim().length<8&&<p className="rounded-xl border border-foreground/10 bg-background/40 p-3 text-xs text-foreground/55">
     Первичный дизайнерский скетч и выбор стиля появятся после формулировки идеи.
    </p>}
    {onProjectCreated&&<EggIdeaProjectFork draft={{intent,constraints,savedDraft,spacePhoto,messages,materials,materialInsight}} onCreated={onProjectCreated}/>}
     </div>
    </details>
    <details className="rounded-xl border border-foreground/15 bg-background/75 p-3" data-testid="egg-author-dna-step">
     <summary className="cursor-pointer text-sm font-medium">
      {reviewedDna?"ДНК · проверена Автором":exteriorIdea?"Следующий шаг · выделить ДНК из Идеи":"ДНК · после внешнего круга сфер"}
     </summary>
     <div className="mt-3">
    <EggDnaFormation projectId={projectId} intent={intent} constraints={constraints}
     materials={materials} materialInsight={materialInsight} visualSourceKey={visualSourceKey+":"+exteriorIdea} latestAnswer={latestAnswer}
     suggestedIdea={exteriorIdea}
     onRequestAi={prompt=>{void submit(prompt);setMobilePane("dialogue");}}
     onReviewChange={onDnaReview}/>
     </div>
    </details>
    <div className="min-w-0 rounded-[14px] border border-foreground/15 bg-background/90 p-2 sm:p-3">
     <button type="button" aria-expanded={cycleEntryOpen} onClick={()=>setCycleEntryOpen(v=>!v)}
      className="w-full py-1 text-left text-sm font-medium" data-testid="egg-open-iteration">
      {cycleEntryOpen?"Свернуть работу сфер":"Результат сфер · действие Автора"}
     </button>
     {cycleEntryOpen&&<EggIterationBridge projectId={projectId} intent={intent} constraints={constraints}
      savedDraft={savedDraft} spacePhoto={spacePhoto} materials={materials} materialInsight={materialInsight}
      dnaCandidate={reviewedDna?.dna||""} approvedIdea={reviewedDna?.idea||""} dnaReviewed={!!reviewedDna}
      onRestoreApproved={restoreApproved}/>}
    </div>
    <details className="rounded-xl border border-foreground/10 bg-background/30 p-3"
      data-testid="egg-project-passport">
     <summary className="cursor-pointer text-xs text-foreground/65">
      Паспорт проекта · версия и сохранение
     </summary>
     <div className="mt-3 space-y-1.5 text-[11px] leading-relaxed text-foreground/65">
      <p><strong>Проект EGG:</strong> <code className="break-all">{projectId}</code></p>
      <p><strong>Версия сайта:</strong> <code>{typeof __EGG_BUILD_SHA__==="string"?__EGG_BUILD_SHA__:"local"}</code> · GitHub → Vercel</p>
      <p><strong>Рабочая линия:</strong> integration/egg-unified-2026-11-12</p>
      <p><strong>Этот холст:</strong> локальный черновик с отдельной серверной синхронизацией. Статус сохранения отображается у поля намерения. Он не равен утверждённому циклу и не меняет ДНК.</p>
     </div>
    </details>
   </div>
  </div>
  <div data-testid="egg-idea-dialogue-pane" className={"min-h-0 min-w-0 w-full flex-1 flex-col px-4 py-3 md:w-1/2 md:px-6 md:py-5 "+(mobilePane==="dialogue"?"flex":"hidden md:flex")}>
   <div className="mb-3 flex items-center justify-between gap-2">
    <div className="flex items-center gap-2 text-sm"><BrainCircuit size={16}/> Идея · Автор ↔ ИИ</div>
    <button type="button" onClick={onClose} aria-label="Закрыть сферу Идея" className="rounded-full bg-background/70 p-2"><X size={17}/></button>
   </div>
   <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-24 pt-3 md:pb-3" aria-live="polite">
    {!messages.length&&<div className="space-y-3 text-sm text-foreground/65">
     <p>Задай намерение слева. ИИ подтянет материалы и последний анализ из «Материального», затем поможет проявить первую версию идеи.</p>
     <button type="button" disabled={!intent.trim()||busy} onClick={()=>void submit("Исследуй моё намерение в контексте поля. Предложи первую образно-смысловую версию идеи, её инварианты и один вопрос мне.")} className="rounded-full bg-[#607466] px-4 py-2 text-xs text-white disabled:opacity-35">Обсудить с ИИ</button>
    </div>}
    {messages.map((m,i)=><div key={i} className={"max-w-[96%] whitespace-pre-wrap break-words p-3 text-sm leading-relaxed "+(m.role==="user"?"ml-auto rounded-xl bg-foreground/[.06] text-right":"mr-auto")}>
     <div className="mb-1 text-[10px] opacity-50">{m.role==="user"?"Автор":"ИИ · гипотеза, не утверждена"}</div>
     {m.role==="assistant"?readableIdeaText(m.content):ideaMessageLabel(m)}
    </div>)}
    {busy&&<p role="status" className="text-xs opacity-60">ИИ исследует намерение и поле…</p>}
    {error&&<p role="alert" className="text-xs text-red-800">{error}</p>}
    <div ref={bottom}/>
   </div>
   {latestAnswer&&<button type="button" className="mb-3 flex items-center justify-center gap-2 rounded-full border border-foreground/20 bg-background/70 p-2 text-xs" onClick={()=>setSavedDraft(latestAnswer)}>
    <Check size={14}/> Сохранить ответ как черновик идеи
   </button>}
   <form className="flex shrink-0 gap-2 pb-[max(.5rem,env(safe-area-inset-bottom))]" onSubmit={e=>{e.preventDefault();void submit(draft);}}>
    <textarea aria-label="Уточнение идеи" rows={2} maxLength={3000} value={draft} onChange={e=>setDraft(e.target.value)}
     placeholder={intent.trim()?"Уточни, возрази, предложи образ…":"Сначала задай намерение слева"}
     className="min-w-0 flex-1 resize-none rounded-xl border border-foreground/15 bg-background/90 p-3 text-base outline-none md:text-sm"/>
    <button type="submit" aria-label="Отправить уточнение идеи" disabled={!draft.trim()||!intent.trim()||busy}
     className="self-end rounded-full bg-[#607466] p-3 text-white disabled:opacity-35"><Send size={17}/></button>
   </form>
   <p className="text-[10px] opacity-55">Локальный черновик · не меняет ДНК, уровень или решения Автора</p>
  </div>
  {sketchOpen&&<EggSketchEditor initialStrokes={sketchStrokes} onSave={strokes=>{void saveSketch(strokes);}} onClose={()=>setSketchOpen(false)}/>}
  <EggWorkspaceNavigation active="idea" onOpenField={onOpenField} onOpenMatter={onOpenMatter}
   onOpenIdea={()=>{}} onOpenConcept={onOpenConcept} onOpenYolk={onOpenYolk}/>
 </section>;
}
