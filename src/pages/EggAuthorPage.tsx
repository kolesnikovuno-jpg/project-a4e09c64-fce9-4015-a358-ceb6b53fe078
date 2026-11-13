import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import EggAuthorCanvas from "../components/egg/EggAuthorCanvas";

export default function EggAuthorPage(){
 const [params]=useSearchParams();const projectId=params.get("project")??"";
 const [state,setState]=useState<{seed:string;revision:number}|null>(null);
 const [error,setError]=useState("");const [refresh,setRefresh]=useState(0);
 useEffect(()=>{if(!projectId){setError("Не указан проект");return;}let alive=true;
 (async()=>{try{const r=await fetch("/api/egg-config",{cache:"no-store"});if(!r.ok)throw new Error("Не удалось загрузить настройки");
 const c=await r.json() as {supabaseUrl:string;publishableKey:string};const auth=createClient(c.supabaseUrl,c.publishableKey);const {data:{session}}=await auth.auth.getSession();
 if(!session)throw new Error("Для работы с проектом необходимо войти в EGG");
 const response=await fetch("/api/egg-project-state?project="+encodeURIComponent(projectId),{cache:"no-store",headers:{Authorization:"Bearer "+session.access_token}});
 if(!response.ok)throw new Error("Нет доступа к проекту или проект не найден");
 const result=await response.json() as {revision:number;project:{seed:{text:string}}};
 if(alive){setState({seed:result.project.seed.text,revision:result.revision});setError("");}
 }catch(e){if(alive)setError(e instanceof Error?e.message:"Ошибка загрузки");}})();return()=>{alive=false};},[projectId,refresh]);
 return <main className="min-h-screen bg-background p-2 sm:p-4">
  <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
   <Link className="text-sm underline underline-offset-4" to={"/ru/egg?project="+encodeURIComponent(projectId)}>← Вернуться к Яйцу</Link>
   <span className="text-xs text-foreground/60">EGG · Автор · Рабочее пространство v0.1</span>
  </header>
  {error&&<div role="alert" className="rounded-lg border p-4 text-sm">{error} <Link to="/egg/connect" className="ml-2 underline">Войти</Link></div>}
  {!error&&!state&&<p className="p-4 text-sm">Загружаем проект…</p>}
  {state&&<EggAuthorCanvas projectId={projectId} seed={state.seed} revision={state.revision} onSaved={()=>setRefresh(v=>v+1)}/>}
 </main>;
}
