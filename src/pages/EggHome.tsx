import { Link } from "react-router-dom";
import UnoEggScene from "../components/unocalc/UnoEggScene";
export default function EggHome(){
 return <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-8" data-testid="egg-public-home">
  <header className="mx-auto flex max-w-[1100px] items-center justify-between gap-4">
   <span className="text-xl font-extralight tracking-[.18em]">EGG</span>
   <nav className="flex items-center gap-5 text-xs"><Link to="/egg/connect" className="border-b border-foreground/40 pb-1">Войти / Регистрация</Link></nav>
  </header>
  <div className="mx-auto mt-4 max-w-[1100px]">
   <UnoEggScene locale="ru" guest />
  </div>
  <footer className="mx-auto mt-5 flex max-w-[1100px] items-center justify-center gap-6 text-xs text-foreground/65">
   <Link to="/egg/connect" className="border-b border-foreground/30 pb-1">Мои проекты</Link>
   <Link to="/egg/connect" className="border-b border-foreground/30 pb-1">Желток · 3D (после входа)</Link>
  </footer>
 </main>;
}
