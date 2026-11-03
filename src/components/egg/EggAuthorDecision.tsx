import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Outcome = "accept" | "revise" | "reject";
export default function EggAuthorDecision({ projectId, revision, taskId, onSaved }: {
  projectId: string; revision: number; taskId: string; onSaved: () => void;
}) {
  const [outcome, setOutcome] = useState<Outcome>("accept");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async () => {
    if (!reason.trim() || busy) return;
    setBusy(true); setMessage("");
    try {
      const configResponse = await fetch("/api/egg-config", { cache: "no-store" });
      if (!configResponse.ok) throw new Error("config");
      const config = await configResponse.json() as { supabaseUrl: string; publishableKey: string };
      const client = createClient(config.supabaseUrl, config.publishableKey);
      const { data } = await client.auth.getSession();
      if (!data.session?.access_token) throw new Error("auth");
      const response = await fetch("/api/egg", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + data.session.access_token },
        body: JSON.stringify({ command: "decide", projectId, expectedRevision: revision, taskId, outcome, reason: reason.trim() }),
      });
      if (response.status === 409) { setMessage("Проект изменился. Обновите состояние и повторите решение."); onSaved(); return; }
      if (!response.ok) throw new Error("save");
      setReason(""); setMessage("Решение Автора сохранено."); onSaved();
    } catch { setMessage("Не удалось сохранить решение. Проверьте авторизацию и попробуйте снова."); }
    finally { setBusy(false); }
  };
  return <div className="mt-3 space-y-2 border-t border-foreground/10 pt-3">
    <label className="block text-xs font-medium">Решение Автора</label>
    <select aria-label="Решение" value={outcome} onChange={event => setOutcome(event.target.value as Outcome)} className="w-full rounded border border-foreground/20 bg-background p-2 text-sm">
      <option value="accept">Принять</option>
      <option value="revise">Вернуть на доработку</option>
      <option value="reject">Отклонить</option>
    </select>
    <textarea aria-label="Основание решения" value={reason} onChange={event => setReason(event.target.value)} maxLength={10000} placeholder="Основание решения (обязательно)" className="w-full rounded border border-foreground/20 bg-background p-2 text-sm" rows={2} />
    <button type="button" disabled={busy || !reason.trim()} onClick={submit} className="rounded border border-foreground/30 px-3 py-2 text-xs disabled:opacity-40">{busy ? "Сохраняем…" : "Подтвердить решение"}</button>
    {message && <p role="status" className="text-xs">{message}</p>}
  </div>;
}
