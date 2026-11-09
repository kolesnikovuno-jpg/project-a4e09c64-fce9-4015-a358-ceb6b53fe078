import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EggNewProject from "../components/egg/EggNewProject";
import EggProjectActions from "../components/egg/EggProjectActions";
import { getEggAiFirstContactPrompt } from "../lib/eggAiOnboarding";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import {EGG_AUTH_CALLBACK,EGG_CANONICAL_ACCOUNT,eggAuthOriginMismatch} from "../lib/eggAuthRedirect";

const EGG_MCP_URL = "https://egg.kolesnikov.studio/api/mcp";
const AI_FIRST_CONTACT_PROMPT = getEggAiFirstContactPrompt();

export default function EggConnect() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authIssue, setAuthIssue] = useState("");
  const isTechnicalOrigin=eggAuthOriginMismatch(window.location.origin);
  const [projects, setProjects] = useState<Array<{ id: string; revision: number; title: string; seed: string; archivedAt?: string | null; level: number; iteration: number; tasks: Array<{id:string;sphere:string;status:string;findings:number}> }> | null>(null);
  const [projectError, setProjectError] = useState("");
  const [refreshProjects, setRefreshProjects] = useState(0);
  const [memberships, setMemberships] = useState<Array<{project_id:string;role:string;spheres:string[]}>>([]);
  const [inviteFeedback, setInviteFeedback] = useState("");
  const [mcpHealth, setMcpHealth] = useState<"checking"|"ready"|"outdated"|"unavailable">("checking");
  async function checkMcpHealth(){
    setMcpHealth("checking");
    try{
      const response=await fetch("/api/mcp-health",{cache:"no-store"});
      const payload=await response.json() as {ok?:boolean;toolNames?:unknown};
      if(!response.ok || payload.ok!==true){setMcpHealth("unavailable");return;}
      setMcpHealth(Array.isArray(payload.toolNames) &&
        payload.toolNames.includes("egg_get_onboarding_protocol") ? "ready" : "outdated");
    }catch{setMcpHealth("unavailable");}
  }
  useEffect(()=>{void checkMcpHealth();},[]);
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
        const auth = createClient(config.supabaseUrl, config.publishableKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
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
        const { data: listener } = auth.auth.onAuthStateChange((event, session) => {
          if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
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
    // Never issue one-time login links to ephemeral Vercel deployment hosts.
    const callbackUrl = window.location.hostname === "egg-test.kolesnikov.studio"
      ? "https://egg-test.kolesnikov.studio/egg/connect" : EGG_AUTH_CALLBACK;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        client.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: callbackUrl },
        }).then(({ error }) => ({ kind: "response" as const, error }))
          .catch((error: unknown) => ({ kind: "exception" as const, error })),
        new Promise<{ kind: "timeout" }>(resolve => {
          timeout = setTimeout(() => resolve({ kind: "timeout" }), 20000);
        }),
      ]);
      if (result.kind === "timeout") {
        setMessage("Диагностика AUTH_TIMEOUT: запрос не завершился за 20 секунд. Проверьте почту перед повторной попыткой.");
      } else if (result.kind === "exception") {
        const error = result.error;
        const name = error instanceof Error ? error.name : "UnknownError";
        const detail = error instanceof Error ? error.message : String(error);
        setMessage("Диагностика AUTH_EXCEPTION (" + name.slice(0, 60) + "): " + detail.slice(0, 220));
      } else {
        const error = result.error;
        if (!error) {
          setOtpRequested(true);
          setMessage("Письмо отправлено. Введите шестизначный код из письма ниже. Не переходите по ссылкам подтверждения.");
        } else {
          const status = error.status ?? "нет HTTP-кода";
          const code = "code" in error && typeof error.code === "string" ? error.code : "нет кода";
          setMessage("Диагностика AUTH_RESPONSE: HTTP " + status + ", " + code + ". " + error.message.slice(0, 220));
        }
      }
    } catch (error) {
      const detail = error instanceof Error ? error.name + ": " + error.message : String(error);
      setMessage("Диагностика AUTH_UNEXPECTED: " + detail.slice(0, 220));
    } finally {
      if (timeout) clearTimeout(timeout);
      setBusy(false);
    }
  }
  async function verifyEmailCode() {
    if (!client || !/^[0-9]{6}$/.test(otpCode) || !email.trim()) return;
    setOtpBusy(true);
    setMessage("");
    try {
      const { data, error } = await client.auth.verifyOtp({
        email: email.trim(),
        token: otpCode,
        type: "email",
      });
      if (error) {
        setMessage("Код не принят (" + (error.status ?? "без HTTP-кода") + "): " + error.message);
      } else if (data.session) {
        setUser(data.session.user);
        setOtpRequested(false);
        setOtpCode("");
        setAuthIssue("");
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        setMessage("Вход подтверждён.");
      } else {
        setMessage("Код проверен, но сеанс не получен. Обновите страницу.");
      }
    } catch (error) {
      setMessage("Ошибка проверки кода: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setOtpBusy(false);
    }
  }
  async function signInWithPassword() {
    if (!client || !email.trim() || !password) return;
    setPasswordBusy(true);
    setMessage("");
    try {
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setMessage("Вход по паролю: " + error.message + ". Если пароль ещё не установлен, его нужно задать для существующего аккаунта в Supabase.");
      } else if (data.user) {
        setUser(data.user);
        setPassword("");
        setOtpRequested(false);
        setAuthIssue("");
        setMessage("Вход выполнен.");
      }
    } catch (error) {
      setMessage("Ошибка соединения: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setPasswordBusy(false);
    }
  }
  async function requestPasswordRecovery() {
    if (!client || !email.trim()) return;
    setPasswordBusy(true);
    try {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: "https://egg-test.kolesnikov.studio/egg/connect",
      });
      setMessage(error ? "Не удалось отправить восстановление: " + error.message :
        "Письмо восстановления отправлено. Оно должно вернуть вас на egg-test.kolesnikov.studio/egg/connect.");
    } catch (error) {
      setMessage("Ошибка восстановления: " + (error instanceof Error ? error.message : String(error)));
    } finally { setPasswordBusy(false); }
  }
  async function saveRecoveredPassword() {
    if (!client || newPassword.length < 12) return;
    setPasswordBusy(true);
    try {
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) setMessage("Не удалось установить пароль: " + error.message);
      else { setNewPassword(""); setRecoveryMode(false); setMessage("Пароль установлен. Вы вошли в EGG."); }
    } finally { setPasswordBusy(false); }
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
      {isTechnicalOrigin && <section data-testid="egg-auth-canonical-warning"
        className="mb-5 space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm"
        aria-label="Адрес для входа EGG">
        <p className="font-medium">Вы открыли технический адрес EGG.</p>
        <p>Браузер хранит вход отдельно для каждого домена.
          Для постоянного доступа используйте основной адрес.
          Повторная регистрация не нужна. Тестовая сборка использует отдельный сеанс входа; её адрес должен быть разрешён в Supabase Auth Redirect URLs.</p>
        <a className="inline-block rounded border border-foreground/35 px-3 py-2 underline underline-offset-2"
          href={EGG_CANONICAL_ACCOUNT}>Открыть основной аккаунт EGG</a>
      </section>}
      <p className="mb-8 text-muted-foreground">Войдите один раз, выберите свой проект и откройте Яйцо. Подключение ChatGPT настраивается отдельно и не блокирует просмотр проектов.</p>
      <Link to="/egg/demo" className="mb-5 inline-flex rounded-full border border-border px-4 py-2 text-sm">Посмотреть демонстрацию EGG без входа</Link>
      <section className="mb-5 rounded-xl border border-border p-6">
        <h2 className="mb-3 text-xl font-medium">Вход и профиль</h2>
        {checkingSession ? (
          <p role="status" className="text-sm">Проверяем подтверждение входа…</p>
        ) : user ? (
          <div className="space-y-3">
            <p>Вы вошли как <strong>{user.email ?? "пользователь EGG"}</strong>.</p>
            <div className="flex flex-wrap gap-3"><Link to={projects?.length ? "/ru/egg?project=" + encodeURIComponent(projects![0].id) : "/egg"} className="rounded bg-foreground px-4 py-2 text-background">Открыть EGG</Link><button className="rounded border border-border px-4 py-2" onClick={signOut}>Выйти</button></div>
          </div>
        ) : (
          <div className="space-y-3">
            <label htmlFor="egg-connect-email" className="block text-sm">Электронная почта</label>
            <input id="egg-connect-email" type="email" autoComplete="email" value={email}
              onChange={event => setEmail(event.target.value)}
              className="w-full rounded border border-border bg-background p-3" placeholder="you@example.com" />
            <div className="space-y-2 rounded-lg border border-border p-3">
              <label htmlFor="egg-connect-password" className="block text-sm font-medium">Вход по паролю (без письма)</label>
              <input id="egg-connect-password" type="password" autoComplete="current-password"
                value={password} onChange={event => setPassword(event.target.value)}
                className="w-full rounded border border-border bg-background p-3"
                placeholder="Пароль существующего аккаунта" />
              <button disabled={!client || passwordBusy || !email.trim() || !password}
                onClick={signInWithPassword}
                className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50">
                {passwordBusy ? "Проверяем…" : "Войти по паролю"}
              </button>
              <p className="text-xs text-muted-foreground">Если аккаунт создавался по ссылке и пароля нет, сначала задайте пароль для существующего пользователя в панели Supabase. Новый аккаунт создавать не нужно.</p>
            </div>
            <button type="button" disabled={!client || passwordBusy || !email.trim()}
              onClick={requestPasswordRecovery} className="text-left text-sm underline underline-offset-4 disabled:opacity-50">
              Установить или восстановить пароль по письму
            </button>
            {recoveryMode && <div className="space-y-2 rounded-lg border border-border p-3">
              <label htmlFor="egg-new-password" className="block text-sm font-medium">Новый пароль (не менее 12 символов)</label>
              <input id="egg-new-password" type="password" autoComplete="new-password"
                value={newPassword} onChange={event=>setNewPassword(event.target.value)}
                className="w-full rounded border border-border bg-background p-3"/>
              <button type="button" disabled={passwordBusy || newPassword.length < 12}
                onClick={saveRecoveredPassword} className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50">
                Сохранить новый пароль
              </button>
            </div>}
            <button disabled={!client || busy || !email.trim()} onClick={sendLink}
              className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50">
              {busy ? "Отправляем…" : "Войти или зарегистрироваться по ссылке"}
            </button>
            {otpRequested && (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <label htmlFor="egg-otp-code" className="block text-sm">Шестизначный код из письма</label>
                <input id="egg-otp-code" type="text" inputMode="numeric" autoComplete="one-time-code"
                  maxLength={6} value={otpCode} onChange={event => setOtpCode(event.target.value.replace(/\\D/g, "").slice(0, 6))}
                  className="w-full rounded border border-border bg-background p-3 tracking-widest"
                  placeholder="000000" />
                <button disabled={otpBusy || !/^[0-9]{6}$/.test(otpCode)} onClick={verifyEmailCode}
                  className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50">
                  {otpBusy ? "Проверяем…" : "Подтвердить код"}
                </button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">Используйте тот же email, что и раньше.
              Если аккаунт уже существует, регистрация не повторяется.
              Ссылка для входа одноразовая; откройте последнее письмо в Safari.</p>
            <p className="text-xs text-muted-foreground">Вход через Google и Apple пока не настроен.</p>
          </div>
        )}
        {authIssue && <p role="alert" className="mt-3 text-sm text-destructive">{authIssue}</p>}
        {message && <p role="status" className="mt-3 text-sm">{message}</p>}
        {inviteFeedback && <p role="status" className="mt-3 text-sm">{inviteFeedback}</p>}
        {!user && window.location.hash.startsWith("#egg-invite=") && <p className="mt-3 text-sm">Войдите с почтой, на которую вас пригласили. После входа приглашение будет принято автоматически.</p>}
      </section>
      <section className="mb-5 rounded-xl border border-border p-6">
        <h2 className="mb-3 text-xl font-medium">Подключение личного ИИ</h2>
        <p className="mb-3 text-sm text-muted-foreground">Подключите EGG через MCP в своём ИИ-клиенте, если он поддерживает пользовательские MCP-подключения. Например, в настройках приложений ChatGPT. При запросе авторизации войдите в EGG и подтвердите доступ.</p>
        <div className="break-all rounded-lg bg-muted p-3 font-mono text-xs">{EGG_MCP_URL}</div>
        <button className="mt-3 rounded border border-border px-4 py-2" onClick={() => {
          navigator.clipboard.writeText(EGG_MCP_URL).then(() => setMessage("Адрес MCP скопирован.")).catch(() => setMessage("Не удалось скопировать адрес."));
        }}>Скопировать адрес подключения</button>
        <div className="mt-5 rounded-xl border border-border p-4" data-testid="egg-mcp-server-health">
          <h3 className="text-sm font-medium">Проверка EGG · обновление инструментов</h3>
          <p className="mt-2 text-sm" role="status" data-testid="egg-mcp-server-status">
            {mcpHealth==="checking" ? "Проверяем инструменты сервера EGG…" :
              mcpHealth==="ready" ? "Сервер EGG поддерживает новый протокол знакомства ИИ." :
              mcpHealth==="outdated" ? "Сервер EGG доступен, но новый инструмент пока не объявлен." :
              "Не удалось подтвердить готовность сервера EGG. Попробуйте повторить проверку."}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Это проверка <strong>сервера EGG</strong>, а не подключений в ChatGPT.
            Даже если ваш ИИ пока видит старые инструменты, при обычном чтении проекта
            через egg_get_project_state он получает краткий сигнал первого знакомства и
            напоминание проверить своё облако. Отдельное переподключение не требуется
            для этого существующего действия. Чтобы появился новый отдельный инструмент,
            обновите список инструментов EGG в настройках ИИ-клиента, если он это поддерживает.
            Облако переподключать не нужно.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" onClick={()=>void checkMcpHealth()}
              className="rounded border border-border px-3 py-2 text-xs">Повторить проверку</button>
            <a href="https://chatgpt.com/plugins" target="_blank" rel="noopener noreferrer"
              className="text-xs underline underline-offset-4">Открыть настройки плагинов ChatGPT</a>
          </div>
        </div>
        <div className="mt-5 border-t border-border pt-4" data-testid="egg-ai-first-contact">
          <h3 className="text-sm font-medium">Первый контакт · сигнал для вашего ИИ</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            При подключении EGG сообщает ИИ о структуре движка и предлагает вызвать
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">egg_get_onboarding_protocol</code>.
            Затем ИИ должен проверить наличие облачного хранилища <strong>в своей собственной среде</strong>.
            Если проверить доступ нельзя, он должен прямо об этом сказать и предложить настройку.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            EGG не получает доступ к облаку ИИ и не знает его фактический статус. Проверка зависит
            от возможностей и разрешений вашего ИИ-клиента. Для обсуждения идей облако необязательно;
            для сохранения файлов и версий оно потребуется.
          </p>
          <button type="button" data-testid="egg-copy-ai-onboarding"
            className="mt-3 rounded border border-border px-4 py-2 text-sm hover:border-foreground/40"
            onClick={()=>{
              navigator.clipboard.writeText(AI_FIRST_CONTACT_PROMPT)
                .then(()=>setMessage("Инструкция для личного ИИ скопирована. Вставьте её в его чат при первом подключении."))
                .catch(()=>setMessage("Не удалось скопировать. Откройте текст инструкции ниже и скопируйте его вручную."));
            }}>Скопировать инструкцию для моего ИИ</button>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-muted-foreground">Показать инструкцию для ручного переноса</summary>
            <textarea readOnly value={AI_FIRST_CONTACT_PROMPT} aria-label="Инструкция первого подключения для личного ИИ"
              rows={11} onFocus={e=>e.target.select()}
              className="mt-2 w-full resize-y rounded border border-border bg-background p-3 text-xs leading-relaxed"/>
          </details>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">EGG не устанавливает приложения в чужой ИИ автоматически. Доступность MCP-коннекторов определяется вашим ИИ-клиентом.</p>
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
        {user && projects?.map(project => <div key={project.id} className="mb-3 rounded-lg border border-border p-3"><p className="text-sm font-medium">{project.title || project.seed || "Без названия"}</p><p className="mt-1 text-xs text-muted-foreground">Ревизия {project.revision} · Уровень {project.level} · Итерация {project.iteration} · Задач {project.tasks.length}</p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">ID: {project.id}</p><Link to={"/ru/egg?project=" + encodeURIComponent(project.id)} className="mt-2 inline-block rounded border border-border px-3 py-1 text-sm">Открыть проект</Link>{client && <EggProjectActions client={client} project={project} onDone={() => setRefreshProjects(value => value + 1)} />}</div>)}
        {user && <Link to={projects?.length ? "/ru/egg?project=" + encodeURIComponent(projects![0].id) : "/egg"} className="mb-4 inline-block rounded border border-border px-4 py-2">Открыть Яйцо</Link>}
        <p className="text-sm text-muted-foreground">Создайте проект по названию или откройте существующий. Исходную идею можно сформировать и утвердить позже.</p>
        <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer"
          className="mt-4 inline-block rounded bg-foreground px-4 py-2 text-background">Открыть ChatGPT</a>
      </section>
    </main>
  );
}
