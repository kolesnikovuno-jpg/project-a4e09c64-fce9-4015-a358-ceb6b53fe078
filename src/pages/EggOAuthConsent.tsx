import { useEffect, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** OAuth consent is always explicit; it never approves on page load. */
export default function EggOAuthConsent() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState<{ client?: { client_name?: string; client_id?: string }; scope?: string } | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [message, setMessage] = useState("Подключение к Яйцу");
  const [busy, setBusy] = useState(false);
  const id = new URLSearchParams(window.location.search).get("authorization_id") ?? "";

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/egg-config", { cache: "no-store" });
        if (!response.ok) throw new Error("Configuration unavailable");
        const config = await response.json() as { supabaseUrl: string; publishableKey: string };
        const auth = createClient(config.supabaseUrl, config.publishableKey);
        if (!active) return;
        setClient(auth);
        const { data: session } = await auth.auth.getSession();
        if (!active) return;
        setSignedIn(Boolean(session.session?.user));
        if (!session.session) { setMessage("Войдите в Яйцо, чтобы разрешить доступ ChatGPT."); return; }
        const result = await auth.auth.oauth.getAuthorizationDetails(id);
        if (result.error) throw result.error;
        if (!active) return;
        if (result.data && "redirect_url" in result.data) {
          window.location.assign(result.data.redirect_url);
          return;
        }
        if (result.data && "authorization_id" in result.data) {
          setDetails(result.data);
          setMessage("");
          return;
        }
        throw new Error("Unknown OAuth authorization response");
      } catch { if (active) setMessage("Не удалось загрузить запрос. Проверьте настройки OAuth в Supabase."); }
    })();
    return () => { active = false; };
  }, [id]);

  const login = async () => {
    if (!client || !email) return;
    setBusy(true);
    const redirect = window.location.origin + "/oauth/consent?authorization_id=" + encodeURIComponent(id);
    const { error } = await client.auth.signInWithOtp({
      email, options: { emailRedirectTo: redirect },
    });
    setMessage(error ? "Не удалось отправить ссылку входа." : "Проверьте почту и откройте ссылку входа.");
    setBusy(false);
  };
  const decide = async (approve: boolean) => {
    if (!client || !details) return;
    setBusy(true);
    const result = approve
      ? await client.auth.oauth.approveAuthorization(id)
      : await client.auth.oauth.denyAuthorization(id);
    if (result.error) { setMessage("Не удалось обработать разрешение."); setBusy(false); return; }
    const url = result.data?.redirect_url;
    if (url) window.location.assign(url);
    else { setMessage("Ответ сервера не содержит адреса возврата."); setBusy(false); }
  };
  return (
    <main className="mx-auto mt-16 max-w-lg rounded-xl border border-border bg-background p-7 text-foreground">
      <h1 className="mb-4 text-2xl font-medium">EGG Engine — разрешение доступа</h1>
      {message && <p className="mb-5 text-sm">{message}</p>}
      {!id && <p className="text-sm">Отсутствует идентификатор запроса авторизации.</p>}
      {id && !signedIn && client && (
        <div className="space-y-3">
          <label htmlFor="egg-email" className="block text-sm">Email Автора</label>
          <input id="egg-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full rounded border bg-background p-2" />
          <button type="button" disabled={busy || !email} onClick={login}
            className="rounded bg-foreground px-4 py-2 text-background">Получить ссылку входа</button>
        </div>
      )}
      {id && signedIn && details && (
        <div className="space-y-4">
          <p>Приложение: <strong>{details.client?.client_name || details.client?.client_id || "Неизвестный клиент"}</strong></p>
          <p className="text-sm">Запрашиваемые области доступа: {details.scope || "не указаны"}</p>
          <p className="text-sm">Доступ к проектам Яйца будет ограничен проверкой владельца. Решения Автора не делегируются.</p>
          <div className="flex gap-3">
            <button type="button" disabled={busy} onClick={() => decide(true)}
              className="rounded bg-foreground px-4 py-2 text-background">Разрешить</button>
            <button type="button" disabled={busy} onClick={() => decide(false)}
              className="rounded border px-4 py-2">Отклонить</button>
          </div>
        </div>
      )}
    </main>
  );
}
