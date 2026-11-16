import {useEffect,useMemo,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import type {EggProject} from "../../lib/eggEngine";
import type {EggIdeaHandoff} from "../../lib/eggIdeaHandoff";
import {eggIdeaHandoffSchema} from "../../lib/eggIdeaHandoff";
import {currentEggFlowCycle} from "../../lib/eggFlowCycle";
import type {MatterCard} from "./EggMatterDialogue";
import EggFlowCyclePanel from "./EggFlowCyclePanel";

const PREVIEW_LIMIT=42000;
/** This is an explicit, bounded transfer of an existing environment photo.
 * Unlike local previews, it becomes part of the Author-approved server record.
 */
export async function prepareEggSpatialPhoto(src:string):Promise<string>{
 if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(src))throw Error("photo_type");
 if(src.length<=PREVIEW_LIMIT)return src;
 const image=new Image();image.src=src;await image.decode();
 for(const [size,quality] of [[300,.40],[250,.32],[190,.26]] as const){
  const scale=Math.min(1,size/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext("2d");
  if(!context)throw Error("photo_canvas");
  context.drawImage(image,0,0,canvas.width,canvas.height);
  const data=canvas.toDataURL("image/jpeg",quality);
  if(data.length<=PREVIEW_LIMIT)return data;
 }
 throw Error("photo_too_large");
}

export default function EggIterationBridge({projectId,intent,constraints,savedDraft,
 spacePhoto,materials,materialInsight}:{
 projectId:string;intent:string;constraints:string;savedDraft:string;
 spacePhoto:string;materials:MatterCard[];materialInsight:string;
}){
 const [project,setProject]=useState<EggProject|null>(null);
 const [revision,setRevision]=useState<number|null>(null);
 const [authorToken,setAuthorToken]=useState("");
 const [seeding,setSeeding]=useState(false);
 const [refresh,setRefresh]=useState(0);
 const [loading,setLoading]=useState(true);
 const [notice,setNotice]=useState("");
 const [dnaDraft,setDnaDraft]=useState("");
 const [dnaEdited,setDnaEdited]=useState(false);
 const [packedPhoto,setPackedPhoto]=useState("");
 const [photoError,setPhotoError]=useState("");
 const [photoPending,setPhotoPending]=useState(false);
 useEffect(()=>{
  if(!dnaEdited)setDnaDraft((savedDraft||intent).slice(0,3000));
 },[savedDraft,intent,dnaEdited]);
 useEffect(()=>{
  let active=true;setLoading(true);setNotice("");
  void (async()=>{
   try{
    const response=await fetch("/api/egg-config",{cache:"no-store"});
    if(!response.ok)throw Error("Сервер EGG не настроен.");
    const cfg=await response.json() as {supabaseUrl:string;publishableKey:string};
    const client=createClient(cfg.supabaseUrl,cfg.publishableKey);
    const {data:{session}}=await client.auth.getSession();
    if(!session?.access_token)throw Error("Войдите в EGG, чтобы открыть серверный цикл.");
    const state=await fetch("/api/egg-project-state?project="+encodeURIComponent(projectId),{
     cache:"no-store",headers:{Authorization:"Bearer "+session.access_token},
    });
    if(!state.ok)throw Error(state.status===404?"Проект не найден в этом аккаунте.":"Не удалось прочитать состояние проекта.");
    const result=await state.json() as {revision:number;project:EggProject};
    if(!result.project||!Number.isSafeInteger(result.revision))throw Error("Неполное состояние проекта.");
    if(active){setProject(result.project);setRevision(result.revision);setAuthorToken(session.access_token);setNotice("");}
   }catch(error){
    if(active){setProject(null);setRevision(null);setAuthorToken("");setNotice(error instanceof Error?error.message:"Ошибка соединения с EGG.");}
   }finally{if(active)setLoading(false);}
  })();
  return()=>{active=false};
 },[projectId,refresh]);
 useEffect(()=>{
  let active=true;setPackedPhoto("");setPhotoError("");
  if(!spacePhoto){setPhotoPending(false);return;}
  setPhotoPending(true);
  void prepareEggSpatialPhoto(spacePhoto).then(data=>{
   if(active){setPackedPhoto(data);setPhotoPending(false);}
  }).catch(()=>{
   if(active){setPhotoError("Не удалось подготовить фото для первого круга. Загрузите новое JPG или удалите фотографию.");setPhotoPending(false);}
  });
  return()=>{active=false};
 },[spacePhoto]);
 const cycle=project?currentEggFlowCycle(project):null;
 const handoff=useMemo(():EggIdeaHandoff|null=>{
  if(!intent.trim()||!dnaDraft.trim()||materials.length>20||photoPending||photoError||(spacePhoto&&!packedPhoto))
   return null;
  const draft={
   intent:intent.trim().slice(0,3000),
   workingDna:dnaDraft.trim().slice(0,3000),
   constraints:constraints.trim().slice(0,1600),
   materialInsight:materialInsight.trim().slice(0,1400),
   materials:materials.map(m=>({
    id:m.id,type:m.type,text:m.text.slice(0,500),
    visualStatus:(m.type==="image"||m.type==="sketch"||m.type==="video"?"metadata_only":"text") as "metadata_only"|"text",
   })),
   ...(packedPhoto?{spatialContext:{
    role:"spatial_context" as const,
    caption:"Фото существующего пространства, только контекст размещения, не референс будущего объекта.",
    imageData:packedPhoto,
   }}:{}),
  };
  const valid=eggIdeaHandoffSchema.safeParse(draft);
  if(!valid.success)return null;
  if(JSON.stringify({command:"start_flow_cycle",projectId,expectedRevision:1,
   brief:"Итерация от сферы Идея",ideaHandoff:valid.data}).length>60000)return null;
  return valid.data;
 },[intent,dnaDraft,constraints,materialInsight,materials,photoPending,photoError,spacePhoto,packedPhoto,projectId]);
 const fixOriginalSeed=async()=>{
  if(!project||revision===null||!authorToken||!dnaDraft.trim()||seeding||project.seed.text.trim())return;
  setSeeding(true);setNotice("");
  try{
   const response=await fetch("/api/egg",{method:"POST",headers:{"Content-Type":"application/json",
    Authorization:"Bearer "+authorToken},
    body:JSON.stringify({command:"set_seed",projectId,expectedRevision:revision,seed:dnaDraft.trim()})});
   if(!response.ok)throw Error(response.status===409?"Проект изменился; обновите состояние.":"Не удалось утвердить исходную ДНК.");
   setRefresh(v=>v+1);
  }catch(e){setNotice(e instanceof Error?e.message:"Ошибка сохранения ДНК.");}
  finally{setSeeding(false);}
 };
 return <section className="egg-iteration-layout min-w-0 rounded-[12px] border-0 bg-background/85 p-0 sm:border sm:border-foreground/10 sm:p-2" data-testid="egg-idea-cycle-entry">
  <h3 className="text-sm font-medium">Рабочая ДНК · круг восьми сфер</h3>
  <div className="mt-3 space-y-3 text-xs leading-relaxed">
   <p className="text-foreground/65">Одна авторская опора → два потока → Желток → одно решение Автора. Черновик ИИ не утверждается автоматически.</p>
   {loading?<p role="status">Читаем состояние EGG…</p>:notice?<p role="alert">{notice} <button type="button" className="underline" onClick={()=>setRefresh(v=>v+1)}>Повторить</button></p>:null}
   {project&&<>
    <details className="rounded-lg border border-foreground/10 p-3" data-testid="egg-original-seed-details" open={!project.seed.text.trim()}>
     <summary className="cursor-pointer text-xs font-medium">Исходная ДНК проекта · подробности</summary>
     <p className="mt-2 text-foreground/50">Исходное зерно не изменяется при новых итерациях.</p>
     <p className="mt-1 whitespace-pre-wrap">{project.seed.text||"Не задана — сначала требуется утвердить исходное зерно проекта."}</p>
     {!project.seed.text.trim()&&<button type="button" disabled={!dnaDraft.trim()||seeding}
      onClick={()=>void fixOriginalSeed()} data-testid="egg-approve-original-seed"
      className="mt-3 rounded-full border border-foreground/35 px-3 py-2 text-xs disabled:opacity-40">
      {seeding?"Сохраняем…":"Утвердить исходную ДНК (один раз)"}</button>}
    </details>
    {(!cycle||cycle.status==="accepted")&&<>
     <label className="block text-xs font-medium">Рабочая версия ДНК для текущего круга
      <textarea aria-label="Рабочая ДНК первого круга" value={dnaDraft} onChange={e=>{setDnaDraft(e.target.value);setDnaEdited(true);}}
       maxLength={3000} rows={4} className="mt-2 w-full resize-y rounded-xl border border-foreground/20 bg-background p-3 text-base font-normal outline-none md:text-sm"
       placeholder="Сформулируйте инвариант идеи: что должно сохраняться при работе сфер"/>
     </label>
     <p className="text-foreground/55">Это новая рабочая опора цикла, не замена исходного зерна и не утверждение следующего уровня.</p>
     <p>Намерение Автора: <strong>{intent.trim()||"ещё не задано"}</strong></p>
     <p>Вход в сферы: {materials.length} материалов {materials.length>20?"(максимум 20 для первого круга)":"· метаданные карточек"}; карта поля {materialInsight?"есть":"не создана"}; фото среды {spacePhoto?(photoPending?"подготавливается":photoError||!packedPhoto?"ошибка":"приложено для пространственных сфер"):"не загружено"}.</p>
     {materials.some(m=>m.type==="image"||m.type==="sketch"||m.type==="video")&&<p className="text-foreground/55">Изображения карточек передаются как названия/подписи, без визуального содержимого. Только отдельно загруженное фото пространства поступит как изображение. Не считать другие файлы просмотренными.</p>}
     {photoError&&<p role="alert" className="text-red-700">{photoError}</p>}
     {materials.length>20&&<p role="alert">Для запуска сократите подборку до 20 карточек, чтобы ничего не было отброшено без вашего решения.</p>}
     <p className="font-medium">При нажатии «Утвердить пакет и запустить цикл» рабочая ДНК, отобранные тексты и фото будут записаны в серверный проект EGG, затем проверится доступ к ИИ. Запуск возможен только после явного действия Автора.</p>
    </>}
    <EggFlowCyclePanel project={project} revision={revision} authorControls
     initialHandoff={handoff??undefined} onSaved={()=>setRefresh(v=>v+1)}/>
   </>}
  </div>
 </section>;
}
