import { useEffect, useState, type FormEvent } from "react";

/**
 * Studio's private convenience gate. EGG itself runs on its own canonical
 * origin and uses Supabase authentication for project access.
 *
 * Never render the legacy UnoCalcEgg here: it is not the EGG project workspace.
 * This client-side code is NOT a security boundary for private project data.
 */
const EGG_ENTRY_URL = "https://egg.kolesnikov.studio/egg/connect";
const SESSION_KEY = "egg.preview.access";

/** A studio deep link returns to the user's existing EGG project after login. */
export function eggStudioEntryUrl(search: string): string {
  const params = new URLSearchParams(search);
  const project = params.get("project");
  if (!project || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(project))
    return EGG_ENTRY_URL;
  const entry = new URL(EGG_ENTRY_URL);
  entry.searchParams.set("returnProject", project);
  entry.searchParams.set("start", params.get("start") === "idea" ? "idea" : "author");
  return entry.toString();
}

export default function EggGate() {
  const [unlocked, setUnlocked] = useState(() => window.sessionStorage.getItem(SESSION_KEY) === "yes");
  const [password, setPassword] = useState("");
  const [invalid, setInvalid] = useState(false);

  const destination = eggStudioEntryUrl(window.location.search);
  useEffect(() => {
    if (unlocked) window.location.replace(destination);
  }, [unlocked, destination]);

  const enter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password === "5678") {
      window.sessionStorage.setItem(SESSION_KEY, "yes");
      setUnlocked(true);
      setInvalid(false);
    } else {
      setInvalid(true);
    }
  };

  if (unlocked) return <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
    <div className="space-y-4 text-center">
      <p className="text-sm text-foreground/60" role="status">Открываем рабочий EGG…</p>
      <a className="underline underline-offset-4" href={destination}>Перейти в EGG</a>
    </div>
  </main>;

  return <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
    <form onSubmit={enter} className="w-full max-w-xs space-y-5">
      <h1 className="text-center text-3xl font-extralight tracking-[.22em]">EGG</h1>
      <p className="text-center text-sm text-foreground/60">Введите пароль для входа</p>
      <input aria-label="Пароль" type="password" autoComplete="off"
        value={password} onChange={e=>{setPassword(e.target.value);setInvalid(false);}}
        className="w-full rounded-md border border-foreground/25 bg-transparent p-3 text-center tracking-[.3em]" autoFocus/>
      {invalid && <p role="alert" className="text-center text-sm">Неверный пароль</p>}
      <button type="submit" className="w-full rounded-md border border-foreground/40 p-3 text-sm">Открыть Яйцо</button>
    </form>
  </main>;
}
