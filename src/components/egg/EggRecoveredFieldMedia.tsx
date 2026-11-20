import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";

type SavedPhoto={filename:string;src:string;sourceProjectId:string};

/** Read-only recovery layer. Deliberately does not change the live Field
 * selection: a 2/5 reconstruction is not the original five-card study.
 */
export default function EggRecoveredFieldMedia({projectId}:{projectId:string}){
 const [photos,setPhotos]=useState<SavedPhoto[]>([]);
 useEffect(()=>{
  let active=true;
  setPhotos([]);
  void(async()=>{
   try{
    const config=await fetch("/api/egg-config",{cache:"no-store"});
    if(!config.ok)return;
    const cfg=await config.json() as {supabaseUrl:string;publishableKey:string};
    const client=createClient(cfg.supabaseUrl,cfg.publishableKey);
    const {data:{user}}=await client.auth.getUser();
    if(!user||!active)return;
    const {data,error}=await client.from("egg_field_recovery_media")
     .select("filename,card,source_project_id").eq("project_id",projectId);
    if(error||!active)return;
    setPhotos((data??[]).flatMap(record=>{
     const card=record.card as {src?:unknown;type?:unknown};
     const src=typeof card?.src==="string"?card.src:"";
     if(card?.type!=="image"||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(src)||src.length>900000)
      return [];
     return [{filename:String(record.filename),src,
      sourceProjectId:String(record.source_project_id)}];
    }));
   }catch{/* Only show confirmed backup media, never claim restored files. */}
  })();
  return()=>{active=false};
 },[projectId]);
 if(!photos.length)return <p className="pointer-events-none absolute inset-x-8 top-1/2 text-center text-sm text-foreground/45">
   Материальное пусто. Ранее сохранённые исследования Идеи остаются в проекте.
  </p>;
 return <aside className="pointer-events-auto absolute left-1/2 top-[190px] z-30 w-[min(640px,calc(100vw-60px))] -translate-x-1/2 border border-foreground/15 bg-background/95 p-4 shadow-sm"
  aria-label="Резервные фотографии Материального" data-testid="egg-recovered-field-media">
   <h3 className="text-sm font-medium">Найдены фотографии в резерве · {photos.length} из 5</h3>
   <p className="mt-1 text-xs leading-relaxed text-foreground/60">
    Это сохранённые копии из других проектов EGG. Они не подменяют исходное Материальное
    и не изменяют завершённое исследование восьми сфер.
   </p>
   <div className="mt-3 grid grid-cols-2 gap-3">
    {photos.map(photo=><figure className="min-w-0 border border-foreground/10 p-2"
     key={photo.filename}>
      <img alt={"Найденная копия "+photo.filename} src={photo.src}
       className="h-36 w-full object-contain" loading="lazy"/>
      <figcaption className="mt-1 break-all text-[11px]">{photo.filename}</figcaption>
      <a href={photo.src} download={photo.filename}
       className="mt-1 inline-block border-b border-foreground/25 pb-0.5 text-[11px] text-foreground/70">
       Сохранить файл
      </a>
    </figure>)}
   </div>
   <p className="mt-3 text-[11px] text-foreground/55">
    Ещё три исходных изображения не найдены. Скачанные копии можно сохранить на устройстве.
   </p>
  </aside>;
}
