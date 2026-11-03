import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SupabaseClient } from "@supabase/supabase-js";

export default function EggNewProject({ client }: { client: SupabaseClient }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await client.auth.getSession();
      if (!data.session?.access_token) throw new Error("Требуется вход в аккаунт");
      const response = await fetch("/api/egg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + data.session.access_token,
        },
        body: JSON.stringify({ command: "create", title: title.trim() }),
      });
      const result = await response.json() as { projectId?: string; error?: string };
      if (!response.ok || !result.projectId) throw new Error(result.error || "Не удалось создать проект");
      navigate("/egg?project=" + encodeURIComponent(result.projectId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка создания проекта");
    } finally {
      setBusy(false);
    }
  }
  return <form onSubmit={submit} className="mb-5 rounded-lg border border-border p-4">
    <h3 className="mb-2 font-medium">Новый проект</h3>
    <p className="mb-3 text-sm text-muted-foreground">Для создания достаточно названия. Исходный замысел сформируете позже в сфере Автора.</p>
    <label htmlFor="egg-project-title" className="mb-1 block text-sm">Название проекта</label>
    <input id="egg-project-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={120} required placeholder="Например, лёгкое кресло" className="mb-3 w-full rounded border border-border bg-background p-3" />
    <button type="submit" disabled={busy || !title.trim()} className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50">{busy ? "Создаём…" : "Создать проект"}</button>
    {error && <p role="alert" className="mt-2 text-sm">{error}</p>}
  </form>;
}
