import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export default function EggProjectActions({ client, project, onDone }: {
  client: SupabaseClient;
  project: { id: string; title: string; seed: string; revision: number; archivedAt?: string | null };
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = project.title || project.seed;
  async function act(action: "archive" | "restore" | "delete") {
    if (busy || (action === "delete" && confirm !== title)) return;
    setBusy(true); setError("");
    try {
      const { data } = await client.auth.getSession();
      if (!data.session?.access_token) throw new Error("Войдите в аккаунт");
      const response = await fetch("/api/egg-project-manage", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + data.session.access_token },
        body: JSON.stringify({ projectId: project.id, expectedRevision: project.revision, action, ...(action === "delete" ? { confirmTitle: confirm } : {}) }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось выполнить действие");
      setOpen(false); setConfirm(""); onDone();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ошибка"); }
    finally { setBusy(false); }
  }
  return <div className="mt-2">
    <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} className="rounded border border-border px-3 py-1 text-sm">Управление ···</button>
    {open && <div className="mt-3 space-y-3 rounded-lg border border-border p-3">
      <button type="button" disabled={busy} onClick={() => act(project.archivedAt ? "restore" : "archive")} className="rounded border border-border px-3 py-2 text-sm">{project.archivedAt ? "Восстановить из архива" : "Архивировать"}</button>
      <div className="border-t border-border pt-3">
        <p className="mb-2 text-sm">Окончательное удаление нельзя отменить. Введите точное название проекта для подтверждения:</p>
        <p className="mb-2 text-sm font-medium">{title}</p>
        <input aria-label="Подтверждение названия проекта" value={confirm} onChange={event => setConfirm(event.target.value)} className="mb-2 w-full rounded border border-border bg-background p-2 text-sm" />
        <button type="button" disabled={busy || !title || confirm !== title} onClick={() => act("delete")} className="rounded border border-destructive px-3 py-2 text-sm text-destructive disabled:opacity-40">Удалить окончательно</button>
      </div>
      {error && <p role="alert" className="text-sm">{error}</p>}
    </div>}
  </div>;
}
