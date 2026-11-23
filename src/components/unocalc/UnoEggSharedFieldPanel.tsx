import { useEffect, useState, type ChangeEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getEggFieldOriginalUrl, listEggFieldAssets, selectEggMaterial, uploadEggFieldOriginal, type EggFieldAsset } from "@/lib/eggSharedField";

type Locale = "ru" | "uk" | "en";
type Props = { client: SupabaseClient; projectId: string; locale: Locale };
const labels = {
  ru: { title:"Внешнее поле · оригиналы", choose:"Загрузить оригинал", loading:"Загрузка…", empty:"Оригиналов пока нет", view:"Открыть", select:"В Материальное", selected:"Отобрано в Материальное", privacy:"Приватное хранилище EGG. Файлы доступны только автору проекта. До 50 МБ на файл.", refresh:"Обновить" },
  uk: { title:"Зовнішнє поле · оригінали", choose:"Завантажити оригінал", loading:"Завантаження…", empty:"Оригіналів поки немає", view:"Відкрити", select:"До Матеріального", selected:"Відібрано до Матеріального", privacy:"Приватне сховище EGG. Файли доступні лише автору проєкту. До 50 МБ на файл.", refresh:"Оновити" },
  en: { title:"External field · originals", choose:"Upload original", loading:"Uploading…", empty:"No originals yet", view:"Open", select:"Select to Material", selected:"Selected to Material", privacy:"Private EGG storage. Files are available only to the project author. Up to 50 MB per file.", refresh:"Refresh" },
} as const;
const button = "min-h-10 rounded-full border border-foreground/25 px-3 py-2 text-[12px] text-foreground/75 disabled:opacity-40";

export function UnoEggSharedFieldPanel({ client, projectId, locale }: Props) {
  const t = labels[locale];
  const [assets, setAssets] = useState<EggFieldAsset[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
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
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    void execute(async () => { await uploadEggFieldOriginal(client, projectId, file); await refresh(); });
  };
  const view = (asset: EggFieldAsset) => void execute(async () => {
    const url = await getEggFieldOriginalUrl(client, asset);
    const tab = window.open(url, "_blank", "noopener,noreferrer");
    if (!tab) setMessage(url);
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
        <input data-testid="egg-shared-field-upload" type="file" className="sr-only" disabled={busy} onChange={upload} />
      </label>
      <button type="button" className={button} disabled={busy} onClick={() => void execute(refresh)}>{t.refresh}</button>
    </div>
    {assets.length === 0 && <p className="text-[11px] text-foreground/55">{t.empty}</p>}
    {assets.map(asset => <div key={asset.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-foreground/10 p-2">
      <span className="min-w-0 flex-1 break-all text-[12px]">{asset.original_name} · {(asset.size_bytes / 1024 / 1024).toFixed(2)} MB</span>
      <button type="button" className={button} disabled={busy} onClick={() => view(asset)}>{t.view}</button>
      <button type="button" className={button} disabled={busy || selected.includes(asset.id)} onClick={() => choose(asset)}>
        {selected.includes(asset.id) ? t.selected : t.select}
      </button>
    </div>)}
    {message && <p role="status" className="break-all text-[11px] text-foreground/65">{message}</p>}
  </section>;
}
