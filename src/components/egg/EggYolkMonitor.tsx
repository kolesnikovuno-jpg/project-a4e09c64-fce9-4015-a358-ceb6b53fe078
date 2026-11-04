import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
type Task = { sphere:string; status:string; decisions:Array<{outcome:string}> };
type Project = { id:string; level:number; iteration:number; tasks:Task[]; concepts?:Array<{status:string;text:string}> };
type FieldRow = {flow:"field"|"work"; sphere:string|null; origin:"internal"|"external"};

export default function EggYolkMonitor({project}:{project:Project}){
 const [rows,setRows]=useState<FieldRow[]>([]),[problem,setProblem]=useState("");
 useEffect(()=>{let live=true;
   async function load(){
     try{
      const res=await fetch("/api/egg-config",{cache:"no-store"});
      if(!res.ok)throw Error();
      const cfg=await res.json() as {supabaseUrl:string;publishableKey:string};
      const client=createClient(cfg.supabaseUrl,cfg.publishableKey);
      const {data,error}=await client.from("egg_field_items").select("flow,sphere,origin")
        .eq("project_id",project.id).order("created_at",{ascending:false}).limit(1000);
      if(error)throw error;
      if(live){setRows((data??[]) as FieldRow[]);setProblem("");}
     }catch{if(live)setProblem("Нет доступа к рабочему полю.")}
   }
   void load();
   const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void load()},20000);
   return()=>{live=false;window.clearInterval(timer)}
 },[project.id]);
 const accepted=project.tasks.filter(t=>t.status==="accepted" || t.decisions?.some(d=>d.outcome==="accept")).length;
 const approvedConcept=[...(project.concepts??[])].reverse().find(c=>c.status==="accepted");
 const formed=accepted>0||Boolean(approvedConcept);
 const active=project.tasks.filter(t=>["working","returned","question","revision_requested"].includes(t.status)).length;
 const field=rows.filter(x=>x.flow==="field").length;
 const work=rows.filter(x=>x.flow==="work").length;
 return <section className="rounded-xl border border-foreground/15 p-3 sm:p-4" aria-label="Информационное тело желтка">
   <h3 className="text-sm font-medium">Желток · состояние формирования</h3>
   <p className="mt-1 text-xs text-foreground/60">Это информационное отображение, не 3D-модель будущего предмета и не процент готовности.</p>
   <div className="mt-3 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
    <div className="flex items-center justify-center rounded-lg bg-foreground/[0.035] p-3">
     <svg viewBox="0 0 160 160" role="img" aria-label="Внутреннее утверждённое ядро и внешний слой проработки" className="h-40 w-40">
      <defs><radialGradient id="egg-yolk-state"><stop offset="0" stopColor="#eac66e" stopOpacity=".85"/><stop offset=".7" stopColor="#cb9c44" stopOpacity=".55"/><stop offset="1" stopColor="#c28d3b" stopOpacity=".12"/></radialGradient></defs>
      <circle cx="80" cy="80" r="67" fill="none" stroke="currentColor" strokeOpacity=".15" strokeWidth="1.2"/>
      <circle cx="80" cy="80" r="55" fill="none" stroke="#d3ac62" strokeOpacity={work>0?".8":".27"} strokeDasharray="3 7" strokeWidth={work>0?3:1.5}/>
      <circle cx="80" cy="80" r="43" fill="none" stroke="#b8b4ab" strokeOpacity={active>0?".7":".2"} strokeDasharray="2 5" strokeWidth={active>0?2:1}/>
      <circle cx="80" cy="80" r={formed?34:24} fill="url(#egg-yolk-state)" stroke="#b38b42" strokeOpacity={formed?".85":".3"} strokeWidth="1.5"/>
      <circle cx="80" cy="80" r="7" fill="#d5ad57" fillOpacity={formed?".9":".25"}/>
     </svg>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg border border-foreground/10 p-2">
        <p className="text-sm font-medium">{approvedConcept?"Принята":"Не принята"}</p>
        <p className="text-[11px] text-foreground/70">Концепция</p>
      </div>
      <div className="rounded-lg border border-foreground/10 p-2"><p className="text-lg font-medium tabular-nums">{accepted}</p><p className="text-[11px] text-foreground/70">Принятые задачи ядра</p></div>
      <div className="rounded-lg border border-foreground/10 p-2"><p className="text-lg font-medium tabular-nums">{active}</p><p className="text-[11px] text-foreground/70">Открытые задачи</p></div>
      <div className="rounded-lg border border-foreground/10 p-2"><p className="text-lg font-medium tabular-nums">{field}</p><p className="text-[11px] text-foreground/70">Записи в облаке</p></div>
      <div className="rounded-lg border border-foreground/10 p-2"><p className="text-lg font-medium tabular-nums">{work}</p><p className="text-[11px] text-foreground/70">Рабочие предложения</p></div>
    </div>
   </div>
   {problem&&<p className="mt-2 text-xs text-foreground/60">{problem}</p>}
   <p className="mt-3 text-xs text-foreground/60">Внутренний круг — принятое Автором; кольца — открытая работа и черновики. Картина обновляется при открытии и каждые 20 секунд. Черновики не входят в ядро автоматически.</p>
  </section>;
}
