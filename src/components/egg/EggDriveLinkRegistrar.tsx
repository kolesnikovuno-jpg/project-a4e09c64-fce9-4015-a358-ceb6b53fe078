import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

/**
 * A scoped Author action for attaching an already-created native Google Doc.
 * No Google file upload or Drive API permissions occur in the browser.
 */
type RegisteredFile = {
  id: string; fileId: string; title: string; webUrl?: string;
  collectionKey: string; status: "reported" | "author_confirmed";
  mimeType: string; registeredBy: "author" | "ai";
};

const extractDocId = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "docs.google.com" ||
      parsed.username || parsed.password || parsed.port || parsed.hash) return null;
    const match = /^\/document\/d\/([a-zA-Z0-9_-]{10,256})(?:\/|$)/.exec(parsed.pathname);
    return match?.[1] ?? null;
  } catch { return null; }
};
export default function EggDriveLinkRegistrar({
  projectId, revision, files, onSaved,
}:{
  projectId: string; revision: number; files: RegisteredFile[]; onSaved:()=>void;
}) {
  const [docUrl,setDocUrl]=useState(() => {
    if(typeof window==="undefined")return "";
    const params=new URLSearchParams(window.location.search);
    const id=params.get("driveDoc");
    return id && /^[A-Za-z0-9_-]{10,256}$/.test(id)
      ? "https://docs.google.com/document/d/"+id+"/edit" : "";
  });
  const [title,setTitle]=useState(()=>{
    if(typeof window==="undefined")return "";
    return new URLSearchParams(window.location.search).get("driveTitle")?.slice(0,250)??"";
  });
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const docId=extractDocId(docUrl);
  const registered=files.find(f=>f.fileId===docId && f.collectionKey==="idea/concepts");

  async function command(payload:Record<string,unknown>){
    setBusy(true);setError("");setMessage("");
    try{
      const cfgResponse=await fetch("/api/egg-config",{cache:"no-store"});
      if(!cfgResponse.ok)throw new Error("Сервис EGG не настроен для этой версии сайта. Откройте действующую тестовую ветку.");
      const cfg=await cfgResponse.json() as {supabaseUrl:string;publishableKey:string};
      const auth=createClient(cfg.supabaseUrl,cfg.publishableKey);
      const {data:{session}}=await auth.auth.getSession();
      if(!session?.access_token)throw new Error("Войдите в аккаунт EGG, затем повторите действие.");
      const response=await fetch("/api/egg",{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},
        body:JSON.stringify({projectId,expectedRevision:revision,...payload}),
      });
      const result=await response.json() as {ok?:boolean;error?:string};
      if(!response.ok || !result.ok)throw new Error(result.error==="revision_conflict"
        ?"Состояние проекта обновилось. Нажмите «Обновить» выше и повторите действие."
        :result.error||"Операция не выполнена");
      setMessage(payload.command==="register_file"
        ?"Ссылка зарегистрирована в EGG. Это запись о файле, а не загрузка документа."
        :"Ссылка подтверждена Автором.");
      onSaved();
    }catch(e){setError(e instanceof Error?e.message:"Не удалось сохранить ссылку.");}
    finally{setBusy(false);}
  }

  return <section className="space-y-3 rounded-lg border border-foreground/15 p-3" aria-label="Материалы концепции из Google Drive">
    <div>
      <h4 className="text-sm font-medium">Материалы концепции · Google Drive</h4>
      <p className="mt-1 text-xs leading-relaxed text-foreground/60">
        Привяжите уже существующий Google Документ к проекту EGG. Это сохраняет проверяемую ссылку, но не копирует файл и не утверждает концепцию.
      </p>
    </div>
    {files.filter(f=>f.collectionKey==="idea/concepts").map(file=><div key={file.id} className="rounded-lg bg-foreground/5 p-2">
      <p className="text-xs font-medium">{file.title}</p>
      <p className="mt-1 text-[11px] text-foreground/60">
        {file.status==="author_confirmed"?"Ссылка подтверждена Автором":"Ссылка зарегистрирована · ожидает подтверждения"}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {file.webUrl&&<a href={file.webUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline underline-offset-4">Открыть документ</a>}
        {file.status==="reported"&&<button type="button" disabled={busy}
          onClick={()=>void command({command:"confirm_file",artifactId:file.id})}
          className="rounded-full border border-foreground/25 px-3 py-1.5 text-xs disabled:opacity-40">
          Подтвердить ссылку
        </button>}
      </div>
    </div>)}
    <details open={Boolean(docUrl && !registered)}>
      <summary className="cursor-pointer text-xs font-medium">Привязать Google Документ</summary>
      <div className="mt-2 space-y-2">
        <label className="block text-xs">Ссылка на существующий Google Документ
          <input type="url" value={docUrl} onChange={e=>setDocUrl(e.target.value)} maxLength={1500}
            placeholder="https://docs.google.com/document/d/…/edit"
            className="mt-1 w-full rounded border border-foreground/20 bg-background p-2 text-xs"/>
        </label>
        <label className="block text-xs">Название документа
          <input type="text" value={title} onChange={e=>setTitle(e.target.value)} maxLength={250}
            placeholder="Концепция v1 — на утверждение"
            className="mt-1 w-full rounded border border-foreground/20 bg-background p-2 text-xs"/>
        </label>
        <button type="button" disabled={busy||!docId||!title.trim()||Boolean(registered)}
          onClick={()=>void command({
            command:"register_file",provider:"google_drive",
            operationId:"idea_doc_"+docId,
            fileId:docId, title:title.trim(),
            mimeType:"application/vnd.google-apps.document",
            collectionKey:"idea/concepts",
            webUrl:"https://docs.google.com/document/d/"+docId+"/edit",
          })} className="rounded-full border border-foreground/30 px-3 py-2 text-xs disabled:opacity-40">
          {registered?"Документ уже привязан":busy?"Сохраняем…":"Сохранить ссылку в EGG"}
        </button>
        {docUrl&&!docId&&<p role="alert" className="text-xs text-destructive">Используйте адрес существующего Google Документа.</p>}
      </div>
    </details>
    {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
    {message&&<p role="status" className="text-xs text-foreground/70">{message}</p>}
  </section>;
}
