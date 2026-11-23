import { useEffect, useState, type ChangeEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getEggFieldOriginalUrl, listEggFieldAssets, selectEggMaterial, uploadEggFieldOriginal, type EggFieldAsset } from "@/lib/eggSharedField";

type Locale = "ru" | "uk" | "en";
type Props = { client: SupabaseClient; projectId: string; locale: Locale };
const labels = {
  ru: { title:"Внешнее поле · оригиналы", choose:"Загрузить файлы", loading:"Загрузка…", empty:"Оригиналов пока нет", view:"Открыть", select:"В Материальное", selected:"Отобрано в Материальное", privacy:"Приватное хранилище EGG. Файлы доступны только автору проекта. До 50 МБ на файл.", refresh:"Обновить" },
  uk: { title:"Зовнішнє поле · оригінали", choose:"Завантажити файли", loading:"Завантаження…", empty:"Оригіналів поки немає", view:"Відкрити", select:"До Матеріального", selected:"Відібрано до Матеріального", privacy:"Приватне сховище EGG. Файли доступні лише автору проєкту. До 50 МБ на файл.", refresh:"Оновити" },
  en: { title:"External field · originals", choose:"Upload files", loading:"Uploading…", empty:"No originals yet", view:"Open", select:"Select to Material", selected:"Selected to Material", privacy:"Private EGG storage. Files are available only to the project author. Up to 50 MB per file.", refresh:"Refresh" },
} as const;
const button = "min-h-10 rounded-full border border-foreground/25 px-3 py-2 text-[12px] text-foreground/75 disabled:opacity-40";

export function UnoEggSharedFieldPanel({ client, projectId, locale }: Props) {
  const t = labels[locale];
  const [assets, setAssets] = useState<EggFieldAsset[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadProgress,setUploadProgress] = useState<{done:number;total:number}|null>(null);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [preview,setPreview] = useState<{id:string;url:string}|null>(null);
  const refresh = async () => setAssets(await listEggFieldAssets(client, projectId));
  useEffect(() => {
    let active = true;
    void listEggFieldAssets(client, projectId)
      .then(items => { if (active) setAssets(items); })
      .catch(error => { if (active) setMessage(error instanceof Error ? error.message : String(error)); });
    return () => { active = false; };
  }, [client, projectId]);
  const execute = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setMessage("");
    try { await fn(); } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy(false); }
  };
  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    void execute(async () => {
      setUploadProgress({done:0,total:files.length});
      let completed=0;
      const failures:string[]=[];
      try {
        for (const file of files) {
          try { await uploadEggFieldOriginal(client, projectId, file); completed++; }
          catch (error) { failures.push(file.name+": "+(error instanceof Error?error.message:String(error))); }
          setUploadProgress({done:completed+failures.length,total:files.length});
        }
        await refresh();
        setMessage("Загружено "+completed+" из "+files.length+" файлов."+
          (failures.length?" Ошибки: "+failures.join("; "):""));
      } finally { setUploadProgress(null); }
    });
  };
  const view = (asset: EggFieldAsset) => void execute(async () => {
    const url = await getEggFieldOriginalUrl(client, asset);
    // Safari on iPad can block window.open after an awaited network request.
    // Render the original inside the project folder instead of exposing
    // the private signed URL as a long error message.
    setPreview({id:asset.id,url});
  });
  const choose = (asset: EggFieldAsset) => void execute(async () => {
    await selectEggMaterial(client, projectId, asset.id);
    setSelected(current => [...current, asset.id]);
    setMessage(t.selected);
  });
  return <section data-testid="egg-shared-field" className="space-y-3 rounded-xl border border-foreground/15 p-3">
    <p className="text-[12px] text-foreground/75">{t.title} · {assets.length}</p>
    <p className="text-[11px] text-foreground/55">{t.privacy}</p>
    <div className="flex flex-wrap items-center gap-2">
      <label className={button + " cursor-pointer"}>{busy ? t.loading : t.choose}
        <input data-testid="egg-shared-field-upload" type="file" multiple className="sr-only" disabled={busy} onChange={upload} />
      </label>
      <button type="button" className={button} disabled={busy} onClick={() => void execute(refresh)}>{t.refresh}</button>
    </div>
    {uploadProgress && <p role="status" className="text-[11px] text-foreground/65">Загрузка: {uploadProgress.done}/{uploadProgress.total}</p>}
    {assets.length === 0 && <p className="text-[11px] text-foreground/55">{t.empty}</p>}
    {assets.map(asset => <div key={asset.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-foreground/10 p-2">
      <span className="min-w-0 flex-1 break-all text-[12px]">{asset.original_name} · {(asset.size_bytes / 1024 / 1024).toFixed(2)} MB</span>
      <button type="button" className={button} disabled={busy} onClick={() => view(asset)}>{t.view}</button>
      {preview?.id===asset.id && <div className="w-full space-y-2"><button type="button" className={button} onClick={()=>setPreview(null)}>Закрыть просмотр</button>{asset.mime_type.startsWith("image/")?<img src={preview.url} alt={asset.original_name} className="max-h-[60dvh] w-full rounded-lg object-contain"/>:<a href={preview.url} target="_blank" rel="noopener noreferrer" className="block break-words text-xs underline">Открыть оригинал</a>}</div>}
      <button type="button" className={button} disabled={busy || selected.includes(asset.id)} onClick={() => choose(asset)}>
        {selected.includes(asset.id) ? t.selected : t.select}
      </button>
    </div>)}
    {message && <p role="status" className="break-all text-[11px] text-foreground/65">{message}</p>}
  </section>;
}
