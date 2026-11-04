import { useState } from "react";

type Phase="edit"|"review"|"approved";
const seed="Лёгкое кресло для отдыха и уединения, воздушная форма, дерево и натуральная ткань.";
const sample="Кресло как лёгкая пространственная оболочка для расслабления. Основные принципы: свободный контур, низкая посадка, натуральные материалы. Конструкция и комфорт требуют проверки.";

export default function EggIdeaDemo(){
 const [phase,setPhase]=useState<Phase>("edit");
 const [concept,setConcept]=useState(sample);
 const [feedback,setFeedback]=useState("");
 const [task,setTask]=useState("Какая конструкция сохранит лёгкость и обеспечит устойчивость?");
 const [released,setReleased]=useState(false);
 return <section className="mt-5 space-y-3 rounded-xl border border-foreground/15 p-3 sm:p-4" aria-label="Учебная сфера Идея">
  <h2 className="text-base font-medium">Сфера «Идея» · учебный цикл</h2>
  <p className="text-xs text-foreground/65">Проверка механики без регистрации. Сжатие здесь редактируется вручную; AI, сервер и реальные сферы не запускаются.</p>
  <div className="rounded-lg bg-foreground/5 p-3">
   <p className="text-xs font-medium">Идея Автора</p><p className="mt-1 text-sm">{seed}</p>
  </div>
  {phase==="edit"&&<div className="space-y-2">
   <label className="block text-xs">Концепция — смысловое сжатие
     <textarea rows={4} maxLength={1500} value={concept} onChange={e=>setConcept(e.target.value)} className="mt-1 w-full rounded-lg border border-foreground/20 bg-background p-3 text-sm"/>
   </label>
   <label className="block text-xs">Один вопрос для сферы «Производство»
     <input value={task} onChange={e=>setTask(e.target.value)} maxLength={300} className="mt-1 w-full rounded-lg border border-foreground/20 bg-background p-2 text-sm"/>
   </label>
   {feedback&&<p className="text-xs text-foreground/65">Замечание Автора: {feedback}</p>}
   <button type="button" disabled={!concept.trim()} onClick={()=>setPhase("review")} className="rounded-full border border-foreground/30 px-4 py-2 text-xs disabled:opacity-40">Передать на рассмотрение</button>
  </div>}
  {phase==="review"&&<div className="space-y-3 rounded-lg border border-amber-600/25 p-3">
   <p className="text-xs font-medium">Черновик · ещё не принят</p>
   <p className="whitespace-pre-wrap text-sm">{concept}</p>
   <label className="block text-xs">Замечание
     <input value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Что изменить?" className="mt-1 w-full rounded border border-foreground/20 bg-background p-2 text-sm"/>
   </label>
   <div className="flex flex-wrap gap-2">
    <button type="button" onClick={()=>setPhase("approved")} className="rounded-full bg-foreground px-3 py-2 text-xs text-background">Принять концепцию</button>
    <button type="button" onClick={()=>setPhase("edit")} className="rounded-full border border-foreground/30 px-3 py-2 text-xs">Вернуть на доработку</button>
   </div>
  </div>}
  {phase==="approved"&&<div className="space-y-3 rounded-lg border border-foreground/20 p-3">
    <p className="text-xs font-medium">Принятая концепция · внутреннее информационное поле</p>
    <p className="whitespace-pre-wrap text-sm">{concept}</p>
    <div className="rounded-lg bg-foreground/5 p-3">
     <p className="text-xs font-medium">Основной поток · Производство</p>
     <p className="mt-1 text-xs">{task.trim()||"Вопрос пока не сформулирован"}</p>
     <button type="button" disabled={released||!task.trim()} onClick={()=>setReleased(true)} className="mt-2 rounded-full border border-foreground/25 px-3 py-2 text-xs disabled:opacity-45">{released?"Вопрос направлен (симуляция)":"Передать вопрос"}</button>
    </div>
    <button type="button" onClick={()=>{setPhase("edit");setReleased(false)}} className="text-xs underline underline-offset-4">Начать новую версию</button>
  </div>}
 </section>;
}
