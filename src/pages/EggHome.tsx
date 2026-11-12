import { Link } from "react-router-dom";
export default function EggHome(){
 return <main className="flex min-h-screen flex-col bg-background px-6 py-8 text-foreground">
  <header className="mx-auto flex w-full max-w-5xl items-center justify-between"><span className="text-xs tracking-[.22em]">EGG</span><Link to="/egg/connect" className="border-b border-foreground/35 pb-1 text-xs">Вход / Регистрация →</Link></header>
  <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center py-20 text-center">
   <div className="flex h-40 w-32 items-center justify-center rounded-[50%] border border-foreground/30 bg-foreground/[.025]"><div className="h-16 w-16 rounded-full border border-foreground/25 bg-foreground/10"/></div>
   <h1 className="mt-10 text-3xl font-extralight tracking-[.1em] sm:text-5xl">EGG</h1>
   <p className="mt-5 max-w-md text-sm leading-7 text-foreground/65">Пространство формирования идеи: от авторского замысла через независимую работу сфер к визуальному решению.</p>
   <Link to="/egg/connect" className="mt-9 rounded-full border border-foreground/40 px-7 py-3 text-sm hover:bg-foreground/5">Войти в EGG →</Link>
   <p className="mt-5 text-xs text-foreground/45">Вход, регистрация, проекты и подключение ИИ — в одном месте.</p>
  </section>
  <footer className="mx-auto flex w-full max-w-5xl justify-between text-xs text-foreground/40"><span>Concept → Prototype → Form</span><a href="https://kolesnikov.studio">kolesnikov.studio</a></footer>
 </main>;
}
