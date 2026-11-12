import { useState, type FormEvent } from "react";
import UnoCalcEgg from "./UnoCalcEgg";

/** A simple preview gate, not server-side authentication. */
export default function EggGate() {
  const [unlocked, setUnlocked] = useState(() => window.sessionStorage.getItem("egg.preview.access") === "yes");
  const [password, setPassword] = useState("");
  const [invalid, setInvalid] = useState(false);
  const enter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password === "5678") {
      window.sessionStorage.setItem("egg.preview.access", "yes");
      setUnlocked(true);
      setInvalid(false);
    } else setInvalid(true);
  };
  if (unlocked) return <UnoCalcEgg />;
  return <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
    <form onSubmit={enter} className="w-full max-w-xs space-y-5">
      <h1 className="text-center text-3xl font-extralight tracking-[.22em]">EGG</h1>
      <p className="text-center text-sm text-foreground/60">Введите пароль для входа</p>
      <input aria-label="Пароль" type="password" autoComplete="off" value={password} onChange={e=>{setPassword(e.target.value);setInvalid(false);}} className="w-full rounded-md border border-foreground/25 bg-transparent p-3 text-center tracking-[.3em]" autoFocus />
      {invalid && <p role="alert" className="text-center text-sm">Неверный пароль</p>}
      <button type="submit" className="w-full rounded-md border border-foreground/40 p-3 text-sm">Открыть Яйцо</button>
    </form>
  </main>;
}
