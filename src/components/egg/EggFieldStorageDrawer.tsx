import { useEffect, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { FolderOpen } from "lucide-react";
import { UnoEggSharedFieldPanel } from "../unocalc/UnoEggSharedFieldPanel";
import { getEggAuthConfig } from "../../lib/eggRemoteApi";


/** The actual EGG external Field: collapsed file explorer, no separate route. */
export default function EggFieldStorageDrawer({ projectId }: { projectId: string }) {
  const locale = "ru" as const;
  const [open, setOpen] = useState(false);
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    let active = true;
    void getEggAuthConfig().then(async cfg => {
      const supabase = createClient(cfg.supabaseUrl, cfg.publishableKey);
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) throw new Error("Войдите в аккаунт EGG для доступа к файлам.");
      if (active) setClient(supabase);
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : String(err)); });
    return () => { active = false; };
  }, [open, projectId]);
  return <div data-testid="egg-field-storage-drawer"
    className="pointer-events-auto absolute right-5 top-[116px] z-[45] w-[min(390px,calc(100vw-40px))] sm:right-8"
    onPointerDown={event => event.stopPropagation()} onPointerMove={event => event.stopPropagation()}
    onWheel={event => event.stopPropagation()}>
    <details open={open} onToggle={event => setOpen(event.currentTarget.open)}
      className="rounded-xl border border-foreground/15 bg-background/95 shadow-sm backdrop-blur-md">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs text-foreground/75">
        <FolderOpen size={17} aria-hidden="true" />
        <span>{locale === "en" ? "Files" : locale === "uk" ? "Файли" : "Файлы"}</span>
        <span className="ml-auto text-foreground/40">{open ? "−" : "+"}</span>
      </summary>
      {open && <div className="max-h-[min(68dvh,650px)] overflow-y-auto border-t border-foreground/10 p-2">
        {error && <p role="status" className="break-words p-2 text-xs">{error}</p>}
        {!error && !client && <p role="status" className="p-2 text-xs text-foreground/60">Подключение хранилища…</p>}
        {client && <UnoEggSharedFieldPanel client={client} projectId={projectId} locale={locale} />}
      </div>}
    </details>
  </div>;
}
