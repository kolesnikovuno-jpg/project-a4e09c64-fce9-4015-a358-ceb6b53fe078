import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import EggAiHandoff from "./EggAiHandoff";

export default function EggSeedStart({ projectId, revision, proposal, onSaved }: { projectId: string; revision: number; proposal?: string; onSaved: () => void }) {
  const [seed, setSeed] = useState(proposal ?? "");
  useEffect(() => { if (proposal) setSeed(proposal); }, [proposal]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function approve() {
    if (!seed.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const configResponse = await fetch("/api/egg-config", { cache: "no-store" });
      if (!configResponse.ok) throw new Error("Сервис авторизации недоступен");
      const config = await configResponse.json() as { supabaseUrl: string; publishableKey: string };
      const auth = createClient(config.supabaseUrl, config.publishableKey);
      const { data } = await auth.auth.getSession();
      if (!data.session?.access_token) throw new Error("Войдите в аккаунт");
      const response = await fetch("/api/egg", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + data.session.access_token },
        body: JSON.stringify({ command: "set_seed", projectId, expectedRevision: revision, seed: seed.trim() }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось сохранить замысел");
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка");
    } finally { setBusy(false); }
  }
  return <div className="space-y-3 rounded-lg border border-foreground/20 p-4">
    <h3 className="font-medium">Начните со сферы Автора</h3>
    <p className="text-sm text-foreground/70">Проект создан. Сначала исследуйте замысел в ChatGPT, затем вставьте согласованную формулировку сюда. Утверждение исходной идеи запускает готовность проекта к работе сфер, но не запускает задачи автоматически.</p>
    <EggAiHandoff projectId={projectId} sphere="idea" revision={revision} level={1} iteration={1} seed={proposal??seed} />
    {proposal && <p role="status" className="rounded border border-foreground/20 p-3 text-sm">ChatGPT передал предложение. Проверьте и при необходимости измените текст перед утверждением. Это пока не исходный замысел проекта.</p>}
    <p className="break-all text-xs text-foreground/60">ID проекта для ChatGPT: {projectId}</p>
    <label htmlFor="egg-author-seed" className="block text-sm">Исходный замысел</label>
    <textarea id="egg-author-seed" rows={5} maxLength={10000} value={seed} onChange={event => setSeed(event.target.value)} placeholder="Сформулированная идея, наблюдение или гипотеза…" className="w-full rounded-lg border border-foreground/20 bg-background p-3 text-sm" />
    <button type="button" disabled={busy || !seed.trim()} onClick={approve} className="rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50">{busy ? "Сохраняем…" : "Утвердить исходный замысел"}</button>
    {error && <p role="alert" className="text-sm">{error}</p>}
  </div>;
}
