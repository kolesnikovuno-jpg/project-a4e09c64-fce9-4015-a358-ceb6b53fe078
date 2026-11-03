import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import EggProjectChat from "../components/egg/EggProjectChat";
const names:Record<string,string>={marketing:"Маркетинг",legal:"Право",design:"Дизайн",production:"Производство",testDrive:"Тестдрайв",procurement:"Комплектация",commerce:"Коммерция",retail:"Ритейл"};
export default function EggCollaboration(){
 const [params]=useSearchParams(),projectId=params.get("project")??"";
 const [role,setRole]=useState(""),[spheres,setSpheres]=useState<string[]>([]),[error,setError]=useState(""),[checking,setChecking]=useState(true);
 useEffect(()=>{let alive=true;(async()=>{try{
  if(!/^[0-9a-f-]{36}$/i.test(projectId))throw Error();
  const cfgRes=await fetch("/api/egg-config");if(!cfgRes.ok)throw Error();
  const cfg=await cfgRes.json() as {supabaseUrl:string;publishableKey:string};const auth=createClient(cfg.supabaseUrl,cfg.publishableKey);
  const {data:{user}}=await auth.auth.getUser();if(!user)throw Error();
  const {data,error:dbError}=await auth.from("egg_project_members").select("role,spheres").eq("project_id",projectId).eq("user_id",user.id).maybeSingle();
  if(dbError||!data)throw Error();if(alive){setRole(data.role);setSpheres(data.spheres);setError("");}
 }catch{if(alive)setError("Нет доступа к проекту. Примите приглашение и войдите в нужный аккаунт.");}finally{if(alive)setChecking(false)}})();return()=>{alive=false}},[projectId]);
 return <main className="mx-auto max-w-2xl px-5 py-10 text-foreground"><Link to="/egg/connect" className="text-sm underline underline-offset-4">← Аккаунт EGG</Link><h1 className="mt-5 text-2xl font-medium">Совместная работа</h1><p className="mt-2 break-all text-xs text-foreground/60">Проект: {projectId}</p>
 {checking&&<p className="mt-5 text-sm">Проверяем доступ…</p>}
 {error&&<p role="status" className="mt-5 text-sm">{error}</p>}
 {role&&<><p className="mt-3 text-sm">Роль: {role==="observer"?"Наблюдатель":"Участник"} · Сферы: {spheres.map(s=>names[s]||s).join(", ")||"только общий канал"}</p><EggProjectChat projectId={projectId} activeSphere={null}/></>}
 </main>;
}