import { useState } from "react";

const stages = [
 {title:"Идея → Концепция",inside:"Концепция выделяет свойства и принципы",outside:"Внешнее поле пока не запрашивалось",result:"Исходная структура"},
 {title:"Поступление внешнего сигнала",inside:"Концепция и вопросы проекта",outside:"Например: сведения о материалах с указанием источника",result:"Облако знаний пополняется"},
 {title:"Проработка сферы",inside:"Сфера сопоставляет замысел, ограничения и факты",outside:"Проверка гипотезы по доступным данным",result:"Предложение, ещё не утверждённое"},
 {title:"Решение Автора",inside:"Принятый результат закрепляется в ядре",outside:"Исходные источники сохраняются в истории",result:"Желток приобретает определённость"},
];
export default function EggFieldDemo(){
 const [step,setStep]=useState(0);
 const stage=stages[step];
 return <section className="mt-5 space-y-3 rounded-xl border border-foreground/15 p-3 sm:p-4">
   <h2 className="text-base font-medium">Как работает информационное Яйцо</h2>
   <p className="text-xs text-foreground/65">Интерактивная учебная схема. Не отправляет данные, не запускает AI и не изменяет реальные проекты.</p>
   <div className="grid gap-2 sm:grid-cols-2">
    <div className="rounded-lg border border-foreground/15 p-3">
      <p className="text-xs font-medium">Внутреннее поле</p><p className="mt-1 text-xs text-foreground/70">{stage.inside}</p>
    </div>
    <div className="rounded-lg border border-foreground/15 p-3">
      <p className="text-xs font-medium">Внешнее поле</p><p className="mt-1 text-xs text-foreground/70">{stage.outside}</p>
    </div>
   </div>
   <div className="flex items-center justify-center gap-4 rounded-lg bg-foreground/[0.035] p-3">
     <svg viewBox="0 0 144 144" className="h-28 w-28" role="img" aria-label="Состояние информационного тела">
      <circle cx="72" cy="72" r="61" fill="none" stroke="currentColor" strokeOpacity=".18"/>
      <circle cx="72" cy="72" r="50" fill="none" stroke="#bc9452" strokeOpacity={step>0?".7":".2"} strokeDasharray="4 6" strokeWidth="2"/>
      <circle cx="72" cy="72" r="37" fill="none" stroke="#a5a5a5" strokeOpacity={step>1?".6":".12"} strokeDasharray="2 5"/>
      <circle cx="72" cy="72" r={step===3?29:19} fill="#d1a553" fillOpacity={step===3?".72":".21"} stroke="#c09447" strokeOpacity={step===3?".85":".28"}/>
     </svg>
     <div className="max-w-[180px] space-y-1">
      <p className="text-sm font-medium">{stage.title}</p>
      <p className="text-xs text-foreground/70">{stage.result}</p>
      <p className="text-[11px] text-foreground/50">Шаг {step+1} из 4</p>
     </div>
   </div>
   <div className="flex flex-wrap gap-2">
    <button type="button" onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0} className="rounded-full border border-foreground/30 px-3 py-2 text-xs disabled:opacity-35">Назад</button>
    <button type="button" onClick={()=>setStep(s=>Math.min(3,s+1))} disabled={step===3} className="rounded-full border border-foreground/30 px-3 py-2 text-xs disabled:opacity-35">Следующий этап</button>
    <button type="button" onClick={()=>setStep(0)} className="ml-auto rounded-full px-3 py-2 text-xs underline underline-offset-4">Повторить</button>
   </div>
 </section>;
}
