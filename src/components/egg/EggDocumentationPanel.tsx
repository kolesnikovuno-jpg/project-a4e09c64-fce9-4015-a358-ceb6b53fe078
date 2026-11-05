import { useMemo, useState } from "react";
import { Archive, Clock3, Download, Layers3, ShieldCheck } from "lucide-react";
import type { EggProject } from "../../lib/eggEngine";
import {
  buildEggProductMemory, findDocumentationGaps, buildEggDocumentationBundle,
  type PackageOrigin, type VisualDraft,
} from "../../lib/eggDocumentation";

const safeDate=(value:string)=>{
  if(!value)return "—";
  const date=new Date(value);
  return Number.isFinite(date.getTime())?date.toLocaleString("ru-RU"):"—";
};

/**
 * Shared documentation release point for the Yolk and the Author sphere.
 * Exports an explicitly unapproved draft locally and never writes project state.
 */
export default function EggDocumentationPanel({
  project,revision,origin,visual,externalPreviewOpen=false,
}:{
  project:EggProject|null;
  revision:number|null;
  origin:PackageOrigin;
  visual?:VisualDraft|null;
  externalPreviewOpen?:boolean;
}){
  const [expanded,setExpanded]=useState(false);
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);
  const entries=useMemo(()=>project?buildEggProductMemory(project):[],[project]);
  const gaps=useMemo(()=>project?findDocumentationGaps(project):[],[project]);
  const model=origin==="yolk"&&!externalPreviewOpen?visual??undefined:undefined;
  const last=entries.slice(expanded?-70:-6).reverse();
  function download(){
    if(!project||revision===null||busy)return;
    setBusy(true);setStatus("");
    try{
      const output=buildEggDocumentationBundle({
        project,revision,generatedAt:new Date().toISOString(),origin,
        visual:model,
      });
      const blob=new Blob([new Uint8Array(output.zip)],{type:"application/zip"});
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");
      link.href=url;link.download=output.filename;
      document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),60000);
      setStatus("Архив сформирован для скачивания. В EGG и облако ничего не записано.");
    }catch(error){
      setStatus(error instanceof Error?error.message:"Не удалось подготовить архив.");
    }finally{setBusy(false);}
  }
  return <section className="rounded-2xl border border-foreground/15 bg-foreground/[0.015] p-4 sm:p-6"
    aria-label="Память продукта и пакет документации" data-testid={"egg-docs-"+origin}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <Layers3 className="h-5 w-5 shrink-0 text-foreground/55"/>
        <div>
          <h2 className="text-base font-light tracking-[-0.01em]">Память продукта / пакет документации</h2>
          <p className="mt-1 text-xs text-foreground/55">
            Точка формирования · {origin==="author"?"Автор":"Желток"} · единый формат EGG
          </p>
        </div>
      </div>
      <span className="rounded-full border border-foreground/25 px-3 py-1 text-[11px] text-foreground/65">
        Черновик · не утверждён
      </span>
    </div>
    {!project||revision===null?(
      <p className="mt-4 text-sm leading-relaxed text-foreground/65">
        Для сборки настоящего пакета откройте проект EGG из аккаунта.
        Демонстрационная модель не считается продуктовой документацией.
      </p>
    ):<>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-foreground/10 p-2">
          <p className="text-lg font-light tabular-nums">{entries.length}</p>
          <p className="text-[10px] text-foreground/55">Записей памяти</p>
        </div>
        <div className="rounded-lg border border-foreground/10 p-2">
          <p className="text-lg font-light tabular-nums">{project.artifacts?.length??0}</p>
          <p className="text-[10px] text-foreground/55">Материалов</p>
        </div>
        <div className="rounded-lg border border-foreground/10 p-2">
          <p className="text-lg font-light tabular-nums">{revision}</p>
          <p className="text-[10px] text-foreground/55">Ревизия</p>
        </div>
      </div>
      <div className="mt-4 border-t border-foreground/10 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-2 text-sm font-medium">
            <Clock3 className="h-4 w-4 text-foreground/50"/> История формирования
          </h3>
          <button type="button" onClick={()=>setExpanded(v=>!v)}
            className="text-xs underline underline-offset-4 text-foreground/70"
            aria-expanded={expanded} data-testid={"egg-memory-toggle-"+origin}>
            {expanded?"Свернуть":"Развернуть"}
          </button>
        </div>
        <div className="mt-3 space-y-2" data-testid={"egg-memory-list-"+origin}>
          {last.length===0&&<p className="text-xs text-foreground/55">Записей пока нет.</p>}
          {last.map(entry=><article key={entry.id} className="border-l border-foreground/20 py-1 pl-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-[11px] text-foreground/75">{entry.title}</p>
              <p className="text-[10px] text-foreground/40">{safeDate(entry.at)}</p>
            </div>
            <p className="mt-1 text-[10px] text-foreground/55">
              {entry.status}
              {entry.level!==null?" · уровень "+entry.level+" / итерация "+entry.iteration:" · общий контекст"}
              {" · "+entry.sourceId}
            </p>
            {expanded&&<p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/65">{entry.description}</p>}
          </article>)}
        </div>
      </div>
      <div className="mt-4 border-t border-foreground/10 pt-4">
        <h3 className="inline-flex items-center gap-2 text-sm font-medium">
          <Archive className="h-4 w-4 text-foreground/50"/> Состав документации
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-foreground/65">
          ДНК и концепции · отчёт восьми сфер · история решений · реестр файлов и версий ·
          точный снимок проекта на ревизии {revision}.
        </p>
        {origin==="yolk"&&<p className="mt-2 text-xs leading-relaxed text-foreground/65">
          {externalPreviewOpen?"Открытый локальный GLB не включается в архив автоматически. Сначала сохраните его отдельно.":
          model?"Текущий пространственный эскиз включается как экспериментальный GLB (без утверждения).":
          "3D-эскиз ещё не выбран. Данные проекта будут включены без локального GLB."}
        </p>}
        <p className="mt-2 text-xs leading-relaxed text-foreground/55">
          Ссылки на документы в облаке учитываются, но сами внешние файлы в архив не скачиваются.
          Архив создаётся только в браузере — личный ИИ сможет сохранить его в облако отдельно.
        </p>
        <details className="mt-3 rounded-lg border border-foreground/10 p-3" data-testid={"egg-document-gaps-"+origin}>
          <summary className="cursor-pointer text-xs text-foreground/75">
            <ShieldCheck className="mr-1 inline h-3.5 w-3.5"/> Что ещё требуется для окончательного выпуска ({gaps.length})
          </summary>
          <ul className="mt-3 space-y-2 text-xs text-foreground/65">
            {gaps.map(g=><li key={g}>— {g}</li>)}
          </ul>
        </details>
        <button type="button" onClick={download} disabled={busy}
          data-testid={"egg-document-download-"+origin}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-foreground/45 px-4 py-2 text-xs font-medium text-foreground/85 hover:bg-foreground/5 disabled:opacity-40">
          <Download className="h-4 w-4"/> {busy?"Формирование…":"Сформировать архив ZIP · черновик"}
        </button>
        {status&&<p role="status" className="mt-2 text-xs leading-relaxed text-foreground/70">{status}</p>}
      </div>
    </>}
  </section>;
}
