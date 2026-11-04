import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EggNewProject from "../components/egg/EggNewProject";
import EggProjectActions from "../components/egg/EggProjectActions";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const EGG_MCP_URL = "https://project-a4e09c64-fce9-40-git-e8febd-kolesnikovuno-jpgs-projects.vercel.app/api/mcp";

export default function EggConnect() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authIssue, setAuthIssue] = useState("");
  const [projects, setProjects] = useState<Array<{ id: string; revision: number; title: string; seed: string; archivedAt?: string | null; level: number; iteration: number; tasks: Array<{id:string;sphere:string;status:string;findings:number}> }> | null>(null);
  const [projectError, setProjectError] = useState("");
  const [refreshProjects, setRefreshProjects] = useState(0);
  const [memberships, setMemberships] = useState<Array<{project_id:string;role:string;spheres:string[]}>>([]);
  const [inviteFeedback, setInviteFeedback] = useState("");
  useEffect(() => {
    if (!client || !user) { setProjects(null); return; }
    let active = true;
    (async () => {
      try {
        const { data } = await client.auth.getSession();
        if (!data.session?.access_token) throw new Error("No session");
        const response = await fetch("/api/egg-my-projects", { headers: { Authorization: "Bearer " + data.session.access_token }, cache: "no-store" });
        if (!response.ok) throw new Error("Projects unavailable");
        const result = await response.json() as { projects: NonNullable<typeof projects> };
        if (active) { setProjects(result.projects); setProjectError(""); }
      } catch { if (active) setProjectError("Не удалось загрузить проекты. Повторите вход или обновите страницу."); }
    })();
    return () => { active = false; };
  }, [client, user, refreshProjects]);
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
        // The client detects Supabase's magic-link URL callback during initialization.
        // The session must finish initializing before the sign-up form can appear.
        const callbackParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const callbackError = callbackParams.get("error_code") || callbackParams.get("error");
        if (callbackError && active) {
          const expired = /expired|invalid|access_denied/i.test(callbackError);
          setAuthIssue(expired
            ? "Ссылка подтверждения недействительна или уже использована. Откройте страницу в Safari и запросите новую ссылку."
            : "Не удалось завершить вход по ссылке. Код ошибки: " + callbackError.replace(/[^a-z_0-9-]/gi, "").slice(0, 50));
        }
        const { data: initialSession, error: sessionError } = await auth.auth.getSession();
        if (!active) return;
        setClient(auth);
        if (initialSession.session) setUser(initialSession.session.user);
        if (sessionError) setAuthIssue("Не удалось сохранить сеанс EGG. Откройте ссылку в Safari в обычной вкладке.");
        const { data: listener } = auth.auth.onAuthStateChange((_event, session) => {
          if (active) { setUser(session?.user ?? null); if (session) setAuthIssue(""); }
        });
        unsubscribe = () => listener.subscription.unsubscribe();
        setCheckingSession(false);
      } catch {
        if (active) { setMessage("Сервис входа временно недоступен."); setCheckingSession(false); }
      }
    })();
    return () => { active = false; unsubscribe?.(); };
  }, []);
  useEffect(() => {
    if (!client || !user) { setMemberships([]); return; }
    let active = true;
    client.from("egg_project_members").select("project_id,role,spheres").eq("user_id", user.id).then(({data,error}) => {
      if (active && !error) setMemberships(data ?? []);
    });
    return () => { active = false; };
  }, [client, user, refreshProjects]);

  useEffect(() => {
    if (!client || !user) return;
    const match = /^#egg-invite=([a-zA-Z0-9_-]{43})$/.exec(window.location.hash);
    const saved = window.localStorage.getItem("egg.pendingInvite");
    const token = match?.[1] ?? (saved && /^[a-zA-Z0-9_-]{43}$/.test(saved) ? saved : null);
    if (!token) return;
    let active = true;
    (async () => {
      try {
        const {data} = await client.auth.getSession();
        if (!data.session) throw new Error("session");
        const response = await fetch("/api/egg-invitations", {method:"POST",
          headers:{"Content-Type":"application/json", Authorization:"Bearer "+data.session.access_token},
          body:JSON.stringify({action:"accept",token})});
        if (!response.ok) throw new Error("invitation");
        const result = await response.json() as {projectId:string};
        if (active) {
          window.localStorage.removeItem("egg.pendingInvite");
          window.history.replaceState(null,"",window.location.pathname+window.location.search);
          setInviteFeedback("Приглашение принято. Вы можете открыть совместную работу.");
          setRefreshProjects(value=>value+1);
          window.location.assign("/egg/collab?project="+encodeURIComponent(result.projectId));
        }
      } catch { if(active)setInviteFeedback("Не удалось принять приглашение. Проверьте, что вы вошли с указанной в приглашении почтой, и срок ссылки не истёк."); }
    })();
    return () => { active=false; };
  }, [client,user]);

  async function sendLink() {
    if (!client || !email.trim()) return;
    const invited = /^#egg-invite=([a-zA-Z0-9_-]{43})$/.exec(window.location.hash);
    if (invited) window.localStorage.setItem("egg.pendingInvite", invited[1]);
    setBusy(true);
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + "/egg/connect" },
    });
    setMessage(error ? (error.status === 429 || /rate limit|too many/i.test(error.message) ? "Превышен лимит отправки писем. Подождите перед повторной попыткой." : `Ошибка входа (${error.status ?? "неизвестно"}): ${error.message}`) : "Проверьте почту: ссылка для входа отправлена.");
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
      <h1 className="mb-3 text-3xl font-medium">Аккаунт EGG</h1>
      <p className="mb-8 text-muted-foreground">Войдите один раз, выберите свой проект и откройте Яйцо. Подключение ChatGPT настраивается отдельно и не блокирует просмотр проектов.</p>
      <Link to="/egg/demo" className="mb-5 inline-flex rounded-full border border-border px-4 py-2 text-sm">Посмотреть демонстрацию EGG без входа</Link>
      <section className="mb-5 rounded-xl border border-border p-6">
        <h2 className="mb-3 text-xl font-medium">Вход и профиль</h2>
        {checkingSession ? (
          <p role="status" className="text-sm">Проверяем подтверждение входа…</p>
        ) : user ? (
          <div className="space-y-3">
            <p>Вы вошли как <strong>{user.email ?? "пользователь EGG"}</strong>.</p>
            <div className="flex flex-wrap gap-3"><Link to={projects?.length ? "/egg?project=" + encodeURIComponent(projects![0].id) : "/egg"} className="rounded bg-foreground px-4 py-2 text-background">Открыть EGG</Link><button className="rounded border border-border px-4 py-2" onClick={signOut}>Выйти</button></div>
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
        {authIssue && <p role="alert" className="mt-3 text-sm text-destructive">{authIssue}</p>}
        {message && <p role="status" className="mt-3 text-sm">{message}</p>}
        {inviteFeedback && <p role="status" className="mt-3 text-sm">{inviteFeedback}</p>}
        {!user && window.location.hash.startsWith("#egg-invite=") && <p className="mt-3 text-sm">Войдите с почтой, на которую вас пригласили. После входа приглашение будет принято автоматически.</p>}
      </section>
      <section className="mb-5 rounded-xl border border-border p-6">
        <h2 className="mb-3 text-xl font-medium">Подключение ChatGPT · настройка</h2>
        <p className="mb-3 text-sm text-muted-foreground">Откройте настройки приложений ChatGPT и добавьте EGG как доступный MCP-коннектор, если такая возможность есть в вашем аккаунте. При запросе разрешения войдите в EGG и подтвердите доступ.</p>
        <div className="break-all rounded-lg bg-muted p-3 font-mono text-xs">{EGG_MCP_URL}</div>
        <button className="mt-3 rounded border border-border px-4 py-2" onClick={() => {
          navigator.clipboard.writeText(EGG_MCP_URL).then(() => setMessage("Адрес MCP скопирован.")).catch(() => setMessage("Не удалось скопировать адрес."));
        }}>Скопировать адрес подключения</button>
        <p className="mt-3 text-sm text-muted-foreground">Автоматическая установка приложения в ChatGPT пока не поддерживается этим сайтом. Доступность пользовательских MCP-коннекторов зависит от настроек ChatGPT.</p>
      </section>
      {user && memberships.length>0 && <section className="mb-5 rounded-xl border border-border p-6">
        <h2 className="mb-3 text-xl font-medium">Проекты, куда меня пригласили</h2>
        {memberships.map(member=><div key={member.project_id} className="mb-2 rounded border border-border p-3">
          <p className="break-all text-xs text-muted-foreground">{member.project_id}</p>
          <p className="my-2 text-sm">{member.role==="observer"?"Наблюдатель":"Участник"} · {member.spheres.join(", ")||"общий чат"}</p>
          <Link to={"/egg/collab?project="+encodeURIComponent(member.project_id)} className="text-sm underline underline-offset-4">Открыть чаты</Link>
        </div>)}
      </section>}
      <section className="rounded-xl border border-border p-6">
        <h2 className="mb-3 text-xl font-medium">Мои проекты</h2>
        <p className="mb-3 text-sm text-muted-foreground">Проекты ниже читаются из EGG Engine. Визуальное Яйцо пока сохраняет изменения локально: эти два состояния ещё не синхронизированы.</p>
        {user && client && <EggNewProject client={client} />}
        {user && projectError && <p role="status" className="mb-3 text-sm">{projectError}</p>}
        {user && projects === null && !projectError && <p className="mb-3 text-sm">Загружаем проекты…</p>}
        {user && projects?.length === 0 && <p className="mb-3 text-sm">В аккаунте пока нет серверных проектов EGG.</p>}
        {user && projects?.map(project => <div key={project.id} className="mb-3 rounded-lg border border-border p-3"><p className="text-sm font-medium">{project.title || project.seed || "Без названия"}</p><p className="mt-1 text-xs text-muted-foreground">Ревизия {project.revision} · Уровень {project.level} · Итерация {project.iteration} · Задач {project.tasks.length}</p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">ID: {project.id}</p><Link to={"/egg?project=" + encodeURIComponent(project.id)} className="mt-2 inline-block rounded border border-border px-3 py-1 text-sm">Открыть проект</Link>{client && <EggProjectActions client={client} project={project} onDone={() => setRefreshProjects(value => value + 1)} />}</div>)}
        {user && <Link to={projects?.length ? "/egg?project=" + encodeURIComponent(projects![0].id) : "/egg"} className="mb-4 inline-block rounded border border-border px-4 py-2">Открыть Яйцо</Link>}
        <p className="text-sm text-muted-foreground">Создайте проект по названию или откройте существующий. Исходную идею можно сформировать и утвердить позже.</p>
        <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer"
          className="mt-4 inline-block rounded bg-foreground px-4 py-2 text-background">Открыть ChatGPT</a>
      </section>
    </main>
  );
}
