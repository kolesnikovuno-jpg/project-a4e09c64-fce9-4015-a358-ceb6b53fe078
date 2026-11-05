import {useState} from "react";
import {createClient} from "@supabase/supabase-js";
import type {EggProject} from "../../lib/eggEngine";
import {validDriveWebUrl} from "../../lib/eggArtifacts";
import {
  buildEggVisualHistory,type EggVisualSnapshot,
} from "../../lib/eggVisualHistory";

function VisualFrame({item,role}:{item:EggVisualSnapshot|null;role:"before"|"after"}){
  const [failed,setFailed]=useState(false);
  const title=role==="before"?"Было":"Стало";
  return <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-foreground/15 p-3"
    data-testid={"egg-visual-"+role}>
    <p className="text-xs font-medium">{title}</p>
    {item?.media==="image"&&item.presentation==="inline_image"&&!failed
      ?<div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded bg-foreground/[0.035]">
        <img src={item.url} alt={item.title+" — визуальная версия, связаная Автором"}
          loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}
          className="h-full w-full object-contain" data-testid={"egg-visual-image-"+role}/>
      </div>
      :<div className="flex aspect-[4/3] items-center justify-center rounded border border-dashed border-foreground/15 bg-foreground/[0.02] p-3">
        <p className="max-w-[260px] text-center text-[11px] leading-relaxed text-foreground/55">
          {!item?"Нет закреплённой визуальной версии":
            failed?"Изображение недоступно для просмотра; ссылка сохранена.":
            item.media==="model"?"3D-файл доступен по внешней ссылке, без встроенного просмотра геометрии.":
            "Файл расположен во внешнем хранилище. Просмотр возможен по ссылке."}
        </p>
      </div>}
    {item?<div className="space-y-1 text-[11px]">
      <p className="font-medium break-words">{item.title}</p>
      <p className="text-foreground/65">{item.note}</p>
      <p className="break-all text-foreground/50">{item.id} · {item.sourceRef} · {item.media}</p>
      <p className="text-foreground/55">{item.sourceStatus==="concept_accepted"
        ?"Принятая концепция — ссылка на образ":"Источник привязан Автором, но форма не утверждена этим действием"}
      </p>
      <a href={item.url} target="_blank" rel="noopener noreferrer"
        className="inline-block underline underline-offset-2 text-foreground/80">
        Открыть исходный материал
      </a>
    </div>:<p className="text-[11px] text-foreground/50">
      Отсутствие изображения не означает отсутствие проектной работы.
    </p>}
  </div>;
}

export default function EggVisualHistoryPanel({project,revision,authorControls=false,onSaved}:{
  project:EggProject;revision:number|null;authorControls?:boolean;onSaved?:()=>void;
}){
  const history=buildEggVisualHistory(project);
  const [selectedCycle,setSelectedCycle]=useState<string>("latest");
  const [sourceRef,setSourceRef]=useState("");
  const [targetCycle,setTargetCycle]=useState<string>("baseline");
  const [note,setNote]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  const current=selectedCycle==="latest"
    ?history.comparisons.at(-1)??null
    :history.comparisons.find(c=>c.cycleId===selectedCycle)??null;
  const before=current?.before??history.baseline;
  const after=current?.after??null;
  const relation=current?.sourceRelation??"both_missing";
  const relationLabel=relation==="different_sources"?"Источники различаются; изменения формы не измерены":
    relation==="same_source"?"Та же ссылка на источник; версия не менялась":
    relation==="missing_before"?"Нет прежнего изображения для сопоставления":
    relation==="missing_after"?"Новой визуальной версии в этой итерации нет":
    "Двух зарегистрированных визуальных версий пока нет";

  const unverifiedDocs=(project.artifacts??[]).filter(a=>
    !a.mimeType.startsWith("image/")&&!/^(model\/|application\/(?:gltf|vnd\.usdz))/i.test(a.mimeType));
  async function pin(){
    if(!authorControls||revision===null||busy||!sourceRef||note.trim().length<8)return;
    setBusy(true);setMessage("");
    try{
      const config=await fetch("/api/egg-config",{cache:"no-store"});
      if(!config.ok)throw Error("Сервис EGG недоступен.");
      const cfg=await config.json() as {supabaseUrl:string;publishableKey:string};
      const client=createClient(cfg.supabaseUrl,cfg.publishableKey);
      const {data}=await client.auth.getSession();
      if(!data.session?.access_token)throw Error("Необходимо войти в EGG.");
      const response=await fetch("/api/egg",{
        method:"POST",headers:{"Content-Type":"application/json",
          Authorization:"Bearer "+data.session.access_token},
        body:JSON.stringify({
          command:"link_visual_version",projectId:project.id,expectedRevision:revision,
          cycleId:targetCycle==="baseline"?null:targetCycle,sourceRef,note:note.trim(),
        }),
      });
      let result:{error?:string}={};
      try{result=await response.json() as typeof result}catch{/* empty response */}
      if(!response.ok)throw Error(response.status===409?
        "Проект изменился. Обновите его состояние.":result.error??"Не удалось связать визуальную версию.");
      setMessage("Ссылка на визуальную версию сохранена в истории проекта.");
      setNote("");setSourceRef("");onSaved?.();
    }catch(e){setMessage(e instanceof Error?e.message:"Не удалось сохранить версию.");}
    finally{setBusy(false);}
  }
  return <section className="space-y-3 rounded-lg border border-foreground/15 p-3 sm:p-4"
    aria-label="Визуальные версии формы" data-testid="egg-visual-history">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h5 className="text-sm font-medium">Визуальная память · было / стало</h5>
      <span className="text-[10px] text-foreground/55">Dynamic Balance · визуальные версии</span>
    </div>
    <p className="text-[11px] leading-relaxed text-foreground/65">
      Сравниваются только реальные ссылки, привязанные Автором к версии. Изображения
      показываются рядом; 3D-файлы открываются по ссылке. Похожесть форм,
      пропорции и качество автоматически не определяются.
    </p>
    {history.comparisons.length>1&&<label className="block text-[11px]">
      Итерация для сравнения
      <select className="mt-1 w-full rounded border border-foreground/20 bg-background p-2"
        data-testid="egg-visual-cycle-select" value={current?.cycleId??"latest"}
        onChange={e=>setSelectedCycle(e.target.value)}>
        {history.comparisons.map(c=><option key={c.cycleId} value={c.cycleId}>
          Цикл {c.cycleId}</option>)}
      </select>
    </label>}
    {!current&&<p className="text-[11px] text-foreground/65">
      Пока нет потоковых циклов: исходная визуальная версия может быть зафиксирована отдельно.
    </p>}
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="egg-visual-side-by-side">
      <VisualFrame key={"before-"+(before?.id??"none")} item={before} role="before"/>
      <VisualFrame key={"after-"+(after?.id??"none")} item={after} role="after"/>
    </div>
    <p className="text-[11px] text-foreground/60" data-testid="egg-visual-comparison-status">
      {relationLabel}
    </p>
    {(history.snapshots.length>0)&&<details className="rounded border border-foreground/10 p-2"
      data-testid="egg-visual-version-list">
      <summary className="cursor-pointer text-[11px]">История закреплённых версий ({history.snapshots.length})</summary>
      <div className="mt-2 space-y-2">
        {history.snapshots.map(v=><p key={v.id} className="break-words text-[11px] text-foreground/65">
          {v.id} · {v.cycleId??"исходная версия"} · {v.sourceRef} · {v.createdAt.slice(0,16)} · {v.note}
        </p>)}
      </div>
    </details>}
    {history.candidates.length===0
      ?<div className="space-y-1 rounded border border-dashed border-foreground/20 p-3"
        data-testid="egg-visual-no-source">
        <p className="text-xs">Пока нет изображений или 3D-файлов, пригодных для привязки.</p>
        <p className="text-[11px] text-foreground/60">
          В EGG можно использовать ссылку на изображение концепции или
          подтверждённый Автором графический/3D-файл из материалов проекта.
          Текстовый документ не заменяет изображение.
        </p>
      </div>
      :authorControls&&revision!==null&&<div className="space-y-2 rounded border border-foreground/15 p-3"
        data-testid="egg-visual-pin-form">
        <p className="text-xs font-medium">Закрепить источник за версией · действие Автора</p>
        <label className="block text-[11px]">
          Исходный материал
          <select className="mt-1 w-full rounded border border-foreground/20 bg-background p-2"
            value={sourceRef} onChange={e=>setSourceRef(e.target.value)}>
            <option value="">Выберите существующее изображение / 3D</option>
            {history.candidates.map(s=><option value={s.sourceRef} key={s.sourceRef}>
              {s.title} · {s.sourceStatus} · {s.media}</option>)}
          </select>
        </label>
        <label className="block text-[11px]">
          Связать с состоянием
          <select className="mt-1 w-full rounded border border-foreground/20 bg-background p-2"
            value={targetCycle} onChange={e=>setTargetCycle(e.target.value)}>
            <option value="baseline">Исходная версия · до первого цикла</option>
            {(project.flowCycles??[]).map(c=><option key={c.id} value={c.id}>
              Цикл {c.id} · итерация {c.iteration}</option>)}
          </select>
        </label>
        <label className="block text-[11px]">
          Что представляет эта версия?
          <textarea rows={2} maxLength={800} value={note}
            className="mt-1 w-full rounded border border-foreground/20 bg-background p-2"
            onChange={e=>setNote(e.target.value)}
            placeholder="Например: первый образ кресла, без проверенной конструкции"/>
        </label>
        <button type="button" disabled={busy||!sourceRef||note.trim().length<8}
          onClick={()=>void pin()} className="rounded-full border border-foreground/35 px-3 py-2 text-xs disabled:opacity-40"
          data-testid="egg-visual-save">
          Сохранить визуальную версию
        </button>
        <p className="text-[10px] text-foreground/55">
          Привязка не означает принятие концепции или утверждение технической модели.
          Для следующей версии создаётся новая запись; предыдущая остаётся в истории.
        </p>
      </div>}
    {!!unverifiedDocs.length&&<details className="rounded border border-foreground/10 p-2"
      data-testid="egg-visual-document-context">
      <summary className="cursor-pointer text-[11px]">
        Документы проекта — не визуальные версии ({unverifiedDocs.length})
      </summary>
      <div className="mt-2 space-y-2 text-[11px] text-foreground/60">
        {unverifiedDocs.map(a=><div key={a.id}>
          {a.title} · {a.status==="author_confirmed"?"ссылка подтверждена Автором":"зарегистрирован, без подтверждения"}
          {a.webUrl&&validDriveWebUrl(a.webUrl,a.fileId)&&<a
            className="ml-2 underline underline-offset-2" href={a.webUrl}
            rel="noopener noreferrer" target="_blank">Открыть документ</a>}
        </div>)}
      </div>
    </details>}
    {message&&<p role="status" className="text-[11px] text-foreground/70">{message}</p>}
  </section>;
}
