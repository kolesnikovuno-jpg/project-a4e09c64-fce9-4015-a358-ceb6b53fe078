import { useEffect, useState, type FormEvent } from "react";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type { EggProject } from "@/lib/eggEngine";
import {
  getEggAuthConfig, listEggServerProjects, readEggServerProject,
  stableFileOperationId, writeEggServerProject,
  type EggServerState,
} from "@/lib/eggRemoteApi";

type Locale = "ru" | "uk" | "en";
type Props = { locale: Locale; seed: string; localProject: EggProject | null };

const words = {
  ru: {
    title: "Сервер «Яйца» · независимая база",
    note: "Экспериментальный серверный контур. Локальные данные не передаются автоматически. Сначала авторизация, затем отдельное создание проекта и явная передача ссылок.",
    unavailable: "Серверный вход пока не доступен в этой сборке. Локальные материалы не затронуты.",
    email: "Электронная почта Автора", send: "Отправить код", token: "Код из письма",
    verify: "Войти", sent: "Запрос на вход отправлен. Проверьте почту.",
    otpHint: "Для входа по коду шаблон письма в новом Supabase должен содержать {{ .Token }}. При использовании magic link потребуется разрешённый адрес перенаправления.",
    signed: "Автор вошёл", logout: "Выйти", refresh: "Обновить с сервера",
    create: "Создать серверный проект", created: "Проект записан на сервер.",
    filePush: "Передать ссылку на сервер", sentFile: "Ссылка записана на сервер как неподтверждённая.",
    accept: "Подтвердить на сервере", confirmed: "Серверное подтверждение записано.",
    noSeed: "Сначала передайте зерно в Идею.", noRemote: "Для этого зерна серверного проекта пока нет.",
    serverProject: "Серверный проект", files: "Материалы на сервере",
    empty: "На сервере пока нет ссылок.", reported: "Ожидает подтверждения", accepted: "Подтверждено Автором",
    notSynced: "Локальные тексты, решения и история не объединяются с сервером. Эта проверка передаёт только зерно нового проекта и выбранные ссылки Google Drive.",
    genericError: "Операция не завершилась. Проверьте соединение и настройки Auth нового Supabase.",
    revisionError: "Проект изменился на сервере. Обновите состояние перед повтором.",
  },
  uk: {
    title: "Сервер «Яйця» · незалежна база",
    note: "Експериментальний серверний контур. Локальні дані не надсилаються автоматично. Спочатку авторизація, потім окреме створення проєкту й передавання посилань.",
    unavailable: "Серверний вхід поки недоступний у цій збірці. Локальні матеріали не змінено.",
    email: "Електронна пошта Автора", send: "Надіслати код", token: "Код із листа",
    verify: "Увійти", sent: "Запит на вхід надіслано. Перевірте пошту.",
    otpHint: "Для входу за кодом шаблон листа в новому Supabase має містити {{ .Token }}. Для magic link потрібна дозволена адреса перенаправлення.",
    signed: "Автор увійшов", logout: "Вийти", refresh: "Оновити з сервера",
    create: "Створити серверний проєкт", created: "Проєкт записано на сервер.",
    filePush: "Передати посилання на сервер", sentFile: "Посилання збережено на сервері без підтвердження.",
    accept: "Підтвердити на сервері", confirmed: "Серверне підтвердження записано.",
    noSeed: "Спочатку передайте зерно в Ідею.", noRemote: "Для цього зерна серверного проєкту ще немає.",
    serverProject: "Серверний проєкт", files: "Матеріали на сервері",
    empty: "На сервері ще немає посилань.", reported: "Очікує підтвердження", accepted: "Підтверджено Автором",
    notSynced: "Локальні тексти, рішення та історія не об'єднуються із сервером. Перевірка передає лише зерно нового проєкту та вибрані посилання Google Drive.",
    genericError: "Операцію не завершено. Перевірте з'єднання й налаштування Auth нового Supabase.",
    revisionError: "Проєкт на сервері змінено. Оновіть його перед повтором.",
  },
  en: {
    title: "Egg server · independent storage",
    note: "Experimental server workflow. Nothing uploads automatically. Sign in first, explicitly create a project and select which file references to submit.",
    unavailable: "Server sign-in is not available in this build. Local materials are unaffected.",
    email: "Author email", send: "Send code", token: "Email code",
    verify: "Sign in", sent: "Sign-in requested. Check your email.",
    otpHint: "For email codes, configure the new Supabase email template to include {{ .Token }}. Magic links require an allowed redirect URL.",
    signed: "Author signed in", logout: "Sign out", refresh: "Refresh server state",
    create: "Create server project", created: "Project created on server.",
    filePush: "Register link on server", sentFile: "Server stored the link as unconfirmed.",
    accept: "Confirm on server", confirmed: "Author confirmation stored on server.",
    noSeed: "Send your seed to Idea first.", noRemote: "No server project exists for this seed yet.",
    serverProject: "Server project", files: "Server materials",
    empty: "No registered files on server.", reported: "Awaiting confirmation", accepted: "Confirmed by Author",
    notSynced: "Local texts, decisions and history are NOT merged with the server. This pilot transfers only a newly created project seed and explicitly selected Google Drive references.",
    genericError: "Action failed. Check connection and Auth settings for independent Egg Supabase.",
    revisionError: "Server project changed. Refresh before retrying.",
  },
} as const;

const inputClass = "w-full rounded-lg border border-foreground/20 bg-transparent px-3 py-2 text-[12px] text-foreground";
const btnClass = "min-h-10 rounded-full border border-foreground/25 px-3 py-2 text-[12px] text-foreground/75 disabled:opacity-40";
const validateSeed = (seed: string) => seed.trim().length > 0 && seed.trim().length <= 10000;

/** Deliberately separate from the existing website/Lovable Supabase client. */
function ServerContent({ locale, seed, localProject }: Props) {
  const t = words[locale];
  const [authClient, setAuthClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [message, setMessage] = useState("");
  const [remote, setRemote] = useState<(EggServerState & { projectId: string }) | null>(null);

  useEffect(() => {
    let live = true;
    let unsubscribe: (() => void) | undefined;
    getEggAuthConfig().then(async config => {
      if (!live) return;
      const client = createClient(config.supabaseUrl, config.publishableKey, {
        auth: {
          storageKey: "egg-independent-auth-" + new URL(config.supabaseUrl).hostname,
          persistSession: true, autoRefreshToken: true,
          detectSessionInUrl: true, flowType: "pkce",
        },
      });
      const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
        if (live) setSession(nextSession);
      });
      unsubscribe = () => listener.subscription.unsubscribe();
      setAuthClient(client);
      const { data } = await client.auth.getSession();
      if (live) setSession(data.session);
    }).catch(() => { if (live) setUnavailable(true); });
    return () => { live = false; unsubscribe?.(); };
  }, []);

  const load = async (token: string) => {
    const matches = (await listEggServerProjects(token))
      .filter(item => item.seed === seed.trim());
    if (matches.length === 0) {
      setRemote(null);
      return;
    }
    const projectId = matches[0].projectId;
    const detail = await readEggServerProject(token, projectId);
    setRemote({ ...detail, projectId });
  };

  useEffect(() => {
    if (!session?.access_token || !validateSeed(seed)) {
      setRemote(null);
      return;
    }
    let cancelled = false;
    const token = session.access_token;
    // Initial read is non-mutating. A failed read does not delete local state.
    void listEggServerProjects(token)
      .then(async items => {
        const match = items.find(item => item.seed === seed.trim());
        return match
          ? { ...(await readEggServerProject(token, match.projectId)), projectId: match.projectId }
          : null;
      })
      .then(value => { if (!cancelled) setRemote(value); })
      .catch(() => { if (!cancelled) setMessage(t.genericError); });
    return () => { cancelled = true; };
  }, [session?.access_token, seed, locale]);

  const run = async (action: () => Promise<void>, success?: string) => {
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      await action();
      if (success) setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error && error.message === "revision_conflict"
        ? t.revisionError : t.genericError);
    } finally {
      setPending(false);
    }
  };

  const sendCode = (event: FormEvent) => {
    event.preventDefault();
    if (!authClient) return;
    void run(async () => {
      const { error } = await authClient.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin + window.location.pathname,
        },
      });
      if (error) throw error;
    }, t.sent);
  };

  const verifyCode = (event: FormEvent) => {
    event.preventDefault();
    if (!authClient) return;
    void run(async () => {
      const { data, error } = await authClient.auth.verifyOtp({
        email: email.trim(), token: otp.trim(), type: "email",
      });
      if (error || !data.session) throw error ?? new Error("No session");
      setSession(data.session);
      setOtp("");
    });
  };

  const createServer = () => {
    if (!session || !validateSeed(seed)) return;
    void run(async () => {
      const response = await writeEggServerProject(session.access_token, {
        command: "create", seed: seed.trim(),
      });
      if (typeof response.projectId !== "string") throw new Error("Invalid server response");
      const detail = await readEggServerProject(session.access_token, response.projectId);
      setRemote({ ...detail, projectId: response.projectId });
    }, t.created);
  };

  const refresh = () => {
    if (!session) return;
    void run(() => load(session.access_token));
  };

  const sendFile = (artifact: NonNullable<EggProject["artifacts"]>[number]) => {
    if (!session || !remote || !localProject) return;
    void run(async () => {
      await writeEggServerProject(session.access_token, {
        command: "register_file", projectId: remote.projectId,
        expectedRevision: remote.revision, provider: "google_drive",
        operationId: stableFileOperationId(localProject.id, artifact.id),
        fileId: artifact.fileId, title: artifact.title,
        mimeType: artifact.mimeType, collectionKey: artifact.collectionKey,
        ...(artifact.webUrl ? { webUrl: artifact.webUrl } : {}),
        ...(artifact.sphere ? { sphere: artifact.sphere } : {}),
      });
      await load(session.access_token);
    }, t.sentFile);
  };

  const confirmServerFile = (artifactId: string) => {
    if (!session || !remote) return;
    void run(async () => {
      await writeEggServerProject(session.access_token, {
        command: "confirm_file", projectId: remote.projectId,
        expectedRevision: remote.revision, artifactId,
      });
      await load(session.access_token);
    }, t.confirmed);
  };

  if (unavailable) return <p role="status" className="text-[12px] text-foreground/60">{t.unavailable}</p>;

  return (
    <div className="space-y-3 pt-3">
      <p className="text-[11px] leading-relaxed text-foreground/60">{t.note}</p>
      {!session ? (
        <>
          <form onSubmit={sendCode} className="space-y-2">
            <label className="block text-[11px] text-foreground/65">{t.email}
              <input data-testid="egg-server-email" type="email" autoComplete="email"
                className={inputClass} value={email} onChange={e => setEmail(e.target.value)}
                required maxLength={254} />
            </label>
            <button data-testid="egg-server-send-otp" disabled={pending || !authClient}
              className={btnClass}>{t.send}</button>
          </form>
          <form onSubmit={verifyCode} className="space-y-2">
            <label className="block text-[11px] text-foreground/65">{t.token}
              <input data-testid="egg-server-code" type="text" inputMode="numeric"
                autoComplete="one-time-code" className={inputClass} value={otp}
                onChange={e => setOtp(e.target.value)} required maxLength={16} />
            </label>
            <button data-testid="egg-server-signin" disabled={pending || !authClient || !otp.trim()}
              className={btnClass}>{t.verify}</button>
          </form>
          <p className="text-[10px] text-foreground/45">{t.otpHint}</p>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="break-all text-[11px] text-foreground/65">
              {t.signed}: {session.user.email ?? session.user.id}
            </span>
            <button type="button" className={btnClass} disabled={pending}
              onClick={() => { void run(async () => {
                const { error } = await authClient?.auth.signOut() ?? { error: null };
                if (error) throw error;
                setSession(null);
                setRemote(null);
              }); }}>{t.logout}</button>
          </div>
          {!validateSeed(seed) ? <p className="text-[12px]">{t.noSeed}</p> : !remote ? (
            <div className="space-y-2">
              <p className="text-[11px] text-foreground/60">{t.noRemote}</p>
              <button type="button" data-testid="egg-server-create" disabled={pending}
                className={btnClass} onClick={createServer}>{t.create}</button>
              <button type="button" className={btnClass} disabled={pending} onClick={refresh}>{t.refresh}</button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="break-all text-[11px] text-foreground/65">
                {t.serverProject}: {remote.projectId} · revision {remote.revision}
              </p>
              <button type="button" data-testid="egg-server-refresh" disabled={pending}
                className={btnClass} onClick={refresh}>{t.refresh}</button>
              <p className="text-[12px] text-foreground/75">{t.files}: {remote.project.files.length}</p>
              {remote.project.files.length === 0 &&
                <p className="text-[11px] text-foreground/55">{t.empty}</p>}
              {remote.project.files.map(item => (
                <div key={item.id} className="rounded-lg border border-foreground/10 p-2">
                  <p className="break-all text-[12px]">{item.title}</p>
                  <p className="text-[11px] text-foreground/55">
                    {item.status === "author_confirmed" ? t.accepted : t.reported}
                  </p>
                  {item.status !== "author_confirmed" && (
                    <button type="button" className={btnClass} disabled={pending}
                      data-testid={"egg-server-confirm-" + item.id}
                      onClick={() => confirmServerFile(item.id)}>{t.accept}</button>
                  )}
                </div>
              ))}
              {(localProject?.artifacts ?? []).filter(item =>
                !remote.project.files.some(remoteItem =>
                  remoteItem.operationId === stableFileOperationId(localProject!.id, item.id))
              ).map(item => (
                <div key={item.id} className="flex flex-wrap items-center gap-2">
                  <span className="break-all text-[11px]">{item.title}</span>
                  <button type="button" className={btnClass} disabled={pending}
                    data-testid={"egg-server-register-" + item.id}
                    onClick={() => sendFile(item)}>{t.filePush}</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {!!message && <p role="status" data-testid="egg-server-message"
        className="text-[11px] text-foreground/65">{message}</p>}
      <p className="text-[10px] leading-relaxed text-foreground/45">{t.notSynced}</p>
    </div>
  );
}

export function UnoEggServerPanel(props: Props) {
  const [opened, setOpened] = useState(false);
  return (
    <details data-testid="unocalc-egg-server-panel"
      className="rounded-xl border border-foreground/15 p-3"
      onToggle={event => setOpened(event.currentTarget.open)}>
      <summary className="cursor-pointer text-[12px] text-foreground/75">
        {words[props.locale].title}
      </summary>
      {opened && <ServerContent {...props} />}
    </details>
  );
}
