import { useCallback, useEffect, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type FieldItem = {
  id: string; sphere: string | null; flow: "field" | "work"; origin: "internal" | "external";
  title: string; content: string; source_kind: string; source_uri: string | null;
  claim_type: "fact" | "hypothesis" | "question" | "proposal";
  level: number | null; iteration: number | null; created_at: string;
};
type ExecutionMode = "auto" | "symbiosis" | "human";
const modeLabels: Record<ExecutionMode, string> = { auto: "AUTO · AI", symbiosis: "Симбиоз · AI + человек", human: "Личное участие" };
const evidenceLabels: Record<FieldItem["claim_type"], string> = {fact:"Факт (требует проверки)",hypothesis:"Гипотеза",question:"Вопрос",proposal:"Предложение"};
const kinds = [
 ["web","Интернет"],["document","Документ"],["database","База данных"],
 ["service","Сервис / приложение"],["human","Человек / эксперт"],
 ["observation","Наблюдение"],["device","Прибор / измерение"],
 ["ai","AI-исследование"],["other","Другой источник"],
] as const;
const sphereLabels: Record<string,string> = {
 marketing:"Маркетинг",legal:"Право",design:"Дизайн",production:"Производство",
 testDrive:"Тестдрайв",procurement:"Комплектация",commerce:"Коммерция",retail:"Ритейл",
};

/** Knowledge/work proposals are append-only and NEVER write to the approved EGG Engine core. */
export default function EggSphereWorkspace({ projectId, sphere, seed, level, iteration, readOnly = false, canManageMode = true }: {
 projectId: string; sphere: string; seed?: string; level?: number; iteration?: number; readOnly?: boolean; canManageMode?: boolean;
}) {
 const [db,setDb] = useState<SupabaseClient|null>(null);
 const [userId,setUserId] = useState("");
 const [items,setItems] = useState<FieldItem[]>([]);
 const [mode,setMode] = useState<ExecutionMode|null>(null);
 const [loading,setLoading] = useState(true);
 const [error,setError] = useState("");
 const [status,setStatus] = useState("");
 const [busy,setBusy] = useState(false);
 const [title,setTitle] = useState("");
 const [content,setContent] = useState("");
 const [flow,setFlow] = useState<"field"|"work">("field");
 const [origin,setOrigin] = useState<"internal"|"external">("external");
 const [sourceKind,setSourceKind] = useState("web");
 const [sourceUri,setSourceUri] = useState("");
 const [claimType,setClaimType] = useState<FieldItem["claim_type"]>("hypothesis");
 const read = useCallback(async (client:SupabaseClient) => {
   const { data, error:queryError }=await client.from("egg_field_items")
     .select("id,sphere,flow,origin,title,content,source_kind,source_uri,claim_type,level,iteration,created_at")
     .eq("project_id",projectId).or(`sphere.eq.${sphere},sphere.is.null`)
     .order("created_at",{ascending:false}).limit(120);
   if(queryError)throw queryError;
   const settings=await client.from("egg_sphere_settings").select("mode")
     .eq("project_id",projectId).eq("sphere",sphere).maybeSingle();
   if(settings.error)throw settings.error;
   setItems((data??[]) as FieldItem[]);
   setMode(settings.data?.mode as ExecutionMode | undefined ?? null);
 },[projectId,sphere]);
 useEffect(()=>{let live=true;setLoading(true);setDb(null);setUserId("");setError("");setItems([]);
  (async()=>{try {
    const response=await fetch("/api/egg-config",{cache:"no-store"});
    if(!response.ok)throw Error("config_unavailable");
    const cfg=await response.json() as {supabaseUrl:string;publishableKey:string};
    const client=createClient(cfg.supabaseUrl,cfg.publishableKey);
    const {data:{user}}=await client.auth.getUser();
    if(!user)throw Error("sign_in_required");
    const {data,error:queryError}=await client.from("egg_field_items")
      .select("id,sphere,flow,origin,title,content,source_kind,source_uri,claim_type,level,iteration,created_at")
      .eq("project_id",projectId).or(`sphere.eq.${sphere},sphere.is.null`)
      .order("created_at",{ascending:false}).limit(120);
    if(queryError)throw queryError;
    const settings=await client.from("egg_sphere_settings").select("mode").eq("project_id",projectId).eq("sphere",sphere).maybeSingle();
    if(settings.error)throw settings.error;
    if(live){setDb(client);setUserId(user.id);setItems((data??[]) as FieldItem[]);setMode(settings.data?.mode as ExecutionMode | undefined ?? null);setLoading(false);}
  }catch{if(live){setError("Рабочее поле недоступно. Требуется вход и доступ к этой сфере.");setLoading(false);}}
  })();return()=>{live=false}
 },[projectId,sphere]);
 async function saveItem(){
  if(readOnly||!db||!userId||!title.trim()||!content.trim()||busy)return;
  const url=sourceUri.trim();
  if(url && !/^https?:\/\/[^\s]+$/i.test(url)){setError("Разрешены только ссылки http:// и https://.");return;}
  setBusy(true);setError("");setStatus("");
  const {error:writeError}=await db.from("egg_field_items").insert({
   project_id:projectId,sphere,flow,origin,source_kind:origin==="internal"?"observation":sourceKind,
   title:title.trim(),content:content.trim(),source_uri:url||null,claim_type:claimType,
   level:level??null,iteration:iteration??null,created_by:userId,
  });
  if(writeError)setError("Не удалось сохранить запись. Проверьте права на эту сферу.");
  else {
   setTitle("");setContent("");setSourceUri("");setStatus("Запись добавлена в рабочее поле. Утверждённое ядро не изменилось.");
   try{await read(db)}catch{setError("Запись создана, но список обновить не удалось.")}
  }
  setBusy(false);
 }
 async function saveMode(next:ExecutionMode){
  if(!canManageMode||!db||!userId)return;
  setBusy(true);setError("");setStatus("");
  const {error:writeError}=await db.from("egg_sphere_settings").upsert({
   project_id:projectId,sphere,mode:next,updated_by:userId,updated_at:new Date().toISOString()
  },{onConflict:"project_id,sphere"});
  if(writeError)setError("Изменить режим может только Автор проекта.");
  else {setMode(next);setStatus("Режим сохранён. Автоматическое выполнение задач этим действием не запускается.");}
  setBusy(false);
 }
 const fieldItems=items.filter(x=>x.flow==="field");
 const workItems=items.filter(x=>x.flow==="work");
 return <section className="mt-4 space-y-4 rounded-xl border border-foreground/15 p-3 sm:p-4" aria-label="Рабочая среда сферы">
  <div>
   <h3 className="text-sm font-medium">Рабочая среда · {sphereLabels[sphere]||sphere}</h3>
   <p className="mt-1 text-xs leading-relaxed text-foreground/65">Два входа: внутреннее поле Яйца и внешние источники. Два выхода: новые сведения для общего поля и рабочие предложения для формирования желтка.</p>
  </div>
  {seed?.trim() && <div className="rounded-lg bg-foreground/5 p-3"><p className="text-xs font-medium">Исходная идея Автора</p><p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/80">{seed}</p></div>}
  <div className="rounded-lg border border-foreground/10 p-3">
   <label htmlFor="egg-sphere-mode" className="block text-xs font-medium">Режим работы сферы</label>
   <select id="egg-sphere-mode" value={mode??""} disabled={!canManageMode||!db||busy} onChange={event=>void saveMode(event.target.value as ExecutionMode)}
    className="mt-2 w-full rounded border border-foreground/20 bg-background p-2 text-sm">
    <option value="" disabled>Режим пока не назначен</option>
    {Object.entries(modeLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}
   </select>
   <p className="mt-2 text-xs text-foreground/55">Пока это назначение исполнителя; автономный AI-цикл ещё не подключён. Изменять режим вправе Автор.</p>
  </div>
  {loading&&<p className="text-sm">Загружаем рабочее поле…</p>}
  {db && <div className="grid gap-3 sm:grid-cols-2">
   <div className="rounded-lg border border-foreground/10 p-3">
    <h4 className="text-sm font-medium">Информационное облако · {fieldItems.length}</h4>
    <p className="my-1 text-xs text-foreground/60">Контекст, наблюдения и внешние материалы; сведения ещё не являются решением.</p>
    <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
     {fieldItems.length===0&&<p className="text-xs text-foreground/50">Записей пока нет.</p>}
     {fieldItems.map(item=><FieldCard key={item.id} item={item}/>)}
    </div>
   </div>
   <div className="rounded-lg border border-foreground/10 p-3">
    <h4 className="text-sm font-medium">Проработка · {workItems.length}</h4>
    <p className="my-1 text-xs text-foreground/60">Предложения и вопросы сферы. Перед утверждением они должны войти в единый результат итерации.</p>
    <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
     {workItems.length===0&&<p className="text-xs text-foreground/50">Рабочих записей пока нет.</p>}
     {workItems.map(item=><FieldCard key={item.id} item={item}/>)}
    </div>
   </div>
  </div>}
  {db && !readOnly && <details className="rounded-lg border border-foreground/15 p-3" open={false}>
   <summary className="cursor-pointer text-sm font-medium">Добавить информацию / результат</summary>
   <form className="mt-3 space-y-3" onSubmit={e=>{e.preventDefault();void saveItem()}}>
    <div className="grid grid-cols-2 gap-2">
     <label className="text-xs">Назначение
      <select value={flow} onChange={e=>setFlow(e.target.value as "field"|"work")} className="mt-1 w-full rounded border border-foreground/20 bg-background p-2 text-sm">
       <option value="field">В информационное облако</option><option value="work">В проработку сферы</option>
      </select>
     </label>
     <label className="text-xs">Происхождение
      <select value={origin} onChange={e=>setOrigin(e.target.value as "internal"|"external")} className="mt-1 w-full rounded border border-foreground/20 bg-background p-2 text-sm">
       <option value="internal">Внутреннее поле</option><option value="external">Внешнее поле</option>
      </select>
     </label>
    </div>
    {origin==="external"&&<label className="block text-xs">Тип источника
      <select value={sourceKind} onChange={e=>setSourceKind(e.target.value)} className="mt-1 w-full rounded border border-foreground/20 bg-background p-2 text-sm">
       {kinds.map(([id,label])=><option key={id} value={id}>{label}</option>)}
      </select>
    </label>}
    <label className="block text-xs">Характер сведений
     <select value={claimType} onChange={e=>setClaimType(e.target.value as FieldItem["claim_type"])} className="mt-1 w-full rounded border border-foreground/20 bg-background p-2 text-sm">
      {Object.entries(evidenceLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}
     </select>
    </label>
    <label className="block text-xs">Название
     <input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={180} className="mt-1 w-full rounded border border-foreground/20 bg-background p-2 text-sm"/>
    </label>
    <label className="block text-xs">Содержание
     <textarea value={content} onChange={e=>setContent(e.target.value)} required maxLength={8000} rows={3} className="mt-1 w-full rounded border border-foreground/20 bg-background p-2 text-sm"/>
    </label>
    <label className="block text-xs">Ссылка на источник (необязательно)
     <input type="url" value={sourceUri} onChange={e=>setSourceUri(e.target.value)} maxLength={1000} placeholder="https://…" className="mt-1 w-full rounded border border-foreground/20 bg-background p-2 text-sm"/>
    </label>
    <button type="submit" disabled={busy||!title.trim()||!content.trim()} className="rounded border border-foreground/30 px-4 py-2 text-sm disabled:opacity-40">Сохранить запись</button>
   </form>
   <p className="mt-2 text-xs text-foreground/55">Материалы регистрируются со ссылкой и происхождением. Автопоиск, загрузка файла и вызов внешнего сервиса требуют отдельных подключённых инструментов.</p>
  </details>}
  {status&&<p role="status" className="text-xs text-foreground/75">{status}</p>}
  {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
  {db&&<button type="button" onClick={()=>void read(db).catch(()=>setError("Не удалось обновить поле."))} className="text-xs underline underline-offset-4">Обновить сведения</button>}
 </section>;
}

function FieldCard({item}:{item:FieldItem}){
 return <article className="rounded-md bg-foreground/5 p-2">
  <p className="break-words text-xs font-medium">{item.title}</p>
  <p className="mt-1 text-[11px] text-foreground/55">{item.origin==="external"?"Внешнее":"Внутреннее"} · {evidenceLabels[item.claim_type]} · {new Date(item.created_at).toLocaleDateString()}</p>
  <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/80">{item.content}</p>
  {item.source_uri&&<a href={item.source_uri} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block break-all text-xs underline underline-offset-2">Открыть источник</a>}
 </article>;
}
