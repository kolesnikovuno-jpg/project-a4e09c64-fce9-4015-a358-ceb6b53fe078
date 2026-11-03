import { useEffect, useState } from "react";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const EGG_MCP_URL = "https://project-a4e09c64-fce9-40-git-e8febd-kolesnikovuno-jpgs-projects.vercel.app/api/mcp";

export default function EggConnect() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    (async () => {
      try {
        const response = await fetch("/api/egg-config", { cache: "no-store" });
        if (!response.ok) throw new Error("config");
        const config = await response.json() as { supabaseUrl: string; publishableKey: string };
        const auth = createClient(config.supabaseUrl, config.publishableKey);
        if (!active) return;
        setClient(auth);
        const { data } = await auth.auth.getUser();
        if (active) setUser(data.user);
        const { data: listener } = auth.auth.onAuthStateChange((_event, session) => {
          if (active) setUser(session?.user ?? null);
        });
        unsubscribe = () => listener.subscription.unsubscribe();
      } catch {
        if (active) setMessage("Сервис входа временно недоступен.");
      }
    })();
    return () => { active = false; unsubscribe?.(); };
  }, []);
  async function sendLink() {
    if (!client || !email.trim()) return;
    setBusy(true);
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + "/egg/connect" },
    });
    setMessage(error ? "Не удалось отправить ссылку. Попробуйте позднее." : "Проверьте почту: ссылка для входа отправлена.");
    setBusy(false);
  }
  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
    setMessage("Вы вышли из аккаунта EGG.");
  }
  return (
    <main className="mx-auto max-w-2xl px-5 py-14 text-foreground">
      <p className="mb-2 text-sm text-muted-foreground">EGG Engine · подключение</p>
      <h1 className="mb-3 text-3xl font-medium">Ваше Яйцо в ChatGPT</h1>
      <p className="mb-8 text-muted-foreground">Сначала войдите в EGG, затем разрешите ChatGPT доступ к вашему аккаунту. Устанавливать сервер или вводить API-ключ не требуется.</p>
      <section className="mb-5 rounded-xl border border-border p-6">
        <h2 className="mb-3 text-xl font-medium">1. Аккаунт EGG</h2>
        {user ? (
          <div className="space-y-3">
            <p>Вы вошли как <strong>{user.email ?? "пользователь EGG"}</strong>.</p>
            <button className="rounded border border-border px-4 py-2" onClick={signOut}>Выйти</button>
          </div>
        ) : (
          <div className="space-y-3">
            <label htmlFor="egg-connect-email" className="block text-sm">Электронная почта</label>
            <input id="egg-connect-email" type="email" autoComplete="email" value={email}
              onChange={event => setEmail(event.target.value)}
              className="w-full rounded border border-border bg-background p-3" placeholder="you@example.com" />
            <button disabled={!client || busy || !email.trim()} onClick={sendLink}
              className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50">
              {busy ? "Отправляем…" : "Войти или зарегистрироваться по ссылке"}
            </button>
            <p className="text-sm text-muted-foreground">Вход через Google и Apple запланирован, но пока не настроен.</p>
          </div>
        )}
        {message && <p role="status" className="mt-3 text-sm">{message}</p>}
      </section>
      <section className="mb-5 rounded-xl border border-border p-6">
        <h2 className="mb-3 text-xl font-medium">2. Подключите EGG к ChatGPT</h2>
        <p className="mb-3 text-sm text-muted-foreground">Откройте настройки приложений ChatGPT и добавьте EGG как доступный MCP-коннектор, если такая возможность есть в вашем аккаунте. При запросе разрешения войдите в EGG и подтвердите доступ.</p>
        <div className="break-all rounded-lg bg-muted p-3 font-mono text-xs">{EGG_MCP_URL}</div>
        <button className="mt-3 rounded border border-border px-4 py-2" onClick={() => {
          navigator.clipboard.writeText(EGG_MCP_URL).then(() => setMessage("Адрес MCP скопирован.")).catch(() => setMessage("Не удалось скопировать адрес."));
        }}>Скопировать адрес подключения</button>
        <p className="mt-3 text-sm text-muted-foreground">Автоматическая установка приложения в ChatGPT пока не поддерживается этим сайтом. Доступность пользовательских MCP-коннекторов зависит от настроек ChatGPT.</p>
      </section>
      <section className="rounded-xl border border-border p-6">
        <h2 className="mb-3 text-xl font-medium">3. Начните работу</h2>
        <p className="text-sm text-muted-foreground">После подключения выберите EGG в ChatGPT и попросите открыть проект. Сейчас для чтения нужен ID проекта; автоматический список ваших проектов появится в следующей версии.</p>
        <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer"
          className="mt-4 inline-block rounded bg-foreground px-4 py-2 text-background">Открыть ChatGPT</a>
      </section>
    </main>
  );
}
