import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Question = {sphere:string;question:string};
type Concept = {
  id:string; text:string; visualUrl?:string; questions:Question[];
  status:"proposed"|"accepted"|"revision_requested"|"rejected";
  proposedBy:"author"|"ai"; createdAt:string; level:number; iteration:number;
  decision?:{outcome:"accept"|"revise"|"reject";reason:string;at:string};
};
type Task = {sourceConceptId?:string;sourceQuestionIndex?:number};
const names:Record<string,string>={
  marketing:"Маркетинг",legal:"Право",design:"Дизайн",production:"Производство",
  testDrive:"Тестдрайв",procurement:"Комплектация",commerce:"Коммерция",retail:"Ритейл",
};
const states:Record<Concept["status"],string>={
  proposed:"Ожидает решения Автора",accepted:"Принята Автором",
  revision_requested:"Возвращена на доработку",rejected:"Отклонена",
};

export default function EggIdeaWorkshop({projectId,seed,concepts,tasks,revision,onSaved}:{
  projectId:string;seed:string;concepts:Concept[];tasks:Task[];
  revision:number;onSaved:()=>void;
}){
  const accepted=[...concepts].reverse().find(c=>c.status==="accepted");
  const pending=concepts.find(c=>c.status==="proposed");
  const [text,setText]=useState("");
  const [visualUrl,setVisualUrl]=useState("");
  const [questions,setQuestions]=useState<Question[]>([]);
  const [remark,setRemark]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [note,setNote]=useState("");
  useEffect(()=>{setText("");setVisualUrl("");setQuestions([]);setRemark("");},[projectId]);
  async function command(payload:Record<string,unknown>){
    setBusy(true);setError("");setNote("");
    try{
      const cfgResponse=await fetch("/api/egg-config",{cache:"no-store"});
      if(!cfgResponse.ok)throw new Error("Сервис авторизации недоступен");
      const cfg=await cfgResponse.json() as {supabaseUrl:string;publishableKey:string};
      const client=createClient(cfg.supabaseUrl,cfg.publishableKey);
      const {data:{session}}=await client.auth.getSession();
      if(!session?.access_token)throw new Error("Для сохранения необходимо войти в аккаунт EGG.");
      const response=await fetch("/api/egg",{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},
        body:JSON.stringify({projectId,expectedRevision:revision,...payload}),
      });
      const result=await response.json() as {ok?:boolean;error?:string};
      if(!response.ok||!result.ok)
        throw new Error(result.error==="revision_conflict"
          ?"Проект обновился в другой вкладке. Обновите состояние и повторите действие."
          :result.error||"Операция не выполнена");
      if(payload.command==="propose_concept"){setText("");setVisualUrl("");setQuestions([]);}
      setRemark("");
      onSaved();
    }catch(e){setError(e instanceof Error?e.message:"Ошибка сохранения");}
    finally{setBusy(false);}
  }
  function addQuestion(){
    const taken=new Set(questions.map(q=>q.sphere));
    const next=Object.keys(names).find(s=>!taken.has(s));
    if(next)setQuestions(q=>[...q,{sphere:next,question:""}]);
  }
  const active=[...concepts].reverse().find(c=>c.status==="accepted");
  const unsubmitted=questions.some(q=>!q.question.trim());
  const visualOk=!visualUrl.trim()||/^https?:\/\/[^\s]+$/i.test(visualUrl.trim());

  return <section className="space-y-4 rounded-xl border border-foreground/20 p-3 sm:p-4" aria-label="Сфера Идея">
   <div>
    <h3 className="text-base font-medium">Сфера «Идея»</h3>
    <p className="mt-1 text-xs leading-relaxed text-foreground/65">Задача сферы — сжать авторскую идею до концепции. На выходе: информационное поле и вопросы для функциональных сфер. Черновик не изменяет утверждённый замысел.</p>
   </div>
   <div className="rounded-lg bg-foreground/[0.035] p-3">
     <p className="text-xs font-medium">Вход · идея Автора</p>
     <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground/80">{seed || "Замысел ещё не утверждён."}</p>
   </div>
   {accepted&&<div className="space-y-3 rounded-lg border border-foreground/15 p-3">
     <div className="flex flex-wrap items-center justify-between gap-2">
       <h4 className="text-sm font-medium">Последняя принятая концепция</h4>
       <span className="text-[11px] text-foreground/60">Уровень {accepted.level} · Итерация {accepted.iteration}</span>
     </div>
     <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{accepted.text}</p>
     {accepted.visualUrl&&<a href={accepted.visualUrl} target="_blank" rel="noopener noreferrer" className="inline-block break-all text-xs underline underline-offset-4">Открыть графический материал</a>}
     <div className="space-y-2">
       <p className="text-xs font-medium">Поток задач из концепции</p>
       {!accepted.questions.length&&<p className="text-xs text-foreground/60">Пока нет подготовленных вопросов для сфер. Концепция остаётся доступной как внутренний контекст.</p>}
       {accepted.questions.map((q,index)=>{
         const routed=tasks.some(t=>t.sourceConceptId===accepted.id&&t.sourceQuestionIndex===index);
         return <div key={index} className="rounded-lg border border-foreground/10 p-2">
           <p className="text-xs font-medium">{names[q.sphere]??q.sphere}</p>
           <p className="mt-1 whitespace-pre-wrap break-words text-xs text-foreground/70">{q.question}</p>
           <button type="button" disabled={busy||routed} onClick={()=>void command({command:"route_concept_question",conceptId:accepted.id,questionIndex:index})}
             className="mt-2 rounded-full border border-foreground/25 px-3 py-1.5 text-xs disabled:opacity-50">
             {routed?"Задача уже направлена":"Передать вопрос сфере"}
           </button>
         </div>;
       })}
     </div>
   </div>}
   {pending&&<div className="space-y-3 rounded-lg border border-amber-600/30 p-3">
     <div className="flex flex-wrap items-center justify-between">
       <h4 className="text-sm font-medium">Концепция на рассмотрении</h4>
       <span className="text-xs text-foreground/65">{pending.proposedBy==="ai"?"Предложение AI":"Черновик Автора"}</span>
     </div>
     <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{pending.text}</p>
     {pending.visualUrl&&<a href={pending.visualUrl} target="_blank" rel="noopener noreferrer" className="break-all text-xs underline">Графический материал</a>}
     {pending.questions.length>0&&<div className="space-y-1"><p className="text-xs font-medium">Предложенные вопросы</p>{pending.questions.map((q,i)=><p key={i} className="text-xs text-foreground/75">{names[q.sphere]}: {q.question}</p>)}</div>}
     <label className="block text-xs">Замечание / направление (для возврата обязательно)
      <textarea rows={2} value={remark} maxLength={10000} onChange={e=>setRemark(e.target.value)} placeholder="Что сохранить, что уточнить, куда направить следующую проработку…" className="mt-1 w-full rounded border border-foreground/20 bg-background p-2 text-sm"/>
     </label>
     <div className="flex flex-wrap gap-2">
       <button type="button" disabled={busy} onClick={()=>void command({command:"decide_concept",conceptId:pending.id,outcome:"accept",reason:remark.trim()||"Концепция утверждена Автором."})} className="rounded-full bg-foreground px-3 py-2 text-xs text-background disabled:opacity-50">Принять концепцию</button>
       <button type="button" disabled={busy||!remark.trim()} onClick={()=>void command({command:"decide_concept",conceptId:pending.id,outcome:"revise",reason:remark.trim()})} className="rounded-full border border-foreground/30 px-3 py-2 text-xs disabled:opacity-50">Вернуть с замечанием</button>
       <button type="button" disabled={busy||!remark.trim()} onClick={()=>void command({command:"decide_concept",conceptId:pending.id,outcome:"reject",reason:remark.trim()})} className="rounded-full border border-foreground/30 px-3 py-2 text-xs disabled:opacity-50">Отклонить</button>
     </div>
     <p className="text-xs text-foreground/60">До принятия концепция не становится частью утверждённого ядра и не создаёт задач автоматически.</p>
   </div>}
   {!pending&&seed.trim()&&<details className="rounded-lg border border-foreground/15 p-3" open={!accepted}>
     <summary className="cursor-pointer text-sm font-medium">{accepted?"Предложить следующую версию концепции":"Сформировать первую концепцию"}</summary>
     <div className="mt-3 space-y-3">
       <p className="text-xs text-foreground/65">Текстовая проработка пока выполняется вручную или с внешним AI через подключение EGG. Вы можете вставить сюда готовый результат. Для графики можно приложить доступную ссылку.</p>
       {accepted&&<button type="button" className="rounded-full border border-foreground/20 px-3 py-1.5 text-xs" onClick={()=>{setText(accepted.text);setVisualUrl(accepted.visualUrl??"");setQuestions(accepted.questions.map(q=>({...q})));setNote("Скопирована предыдущая версия для дальнейшей проработки.");}}>Взять принятую версию за основу</button>}
       <label className="block text-xs">Концепция: сущность, принципы, ограничения
         <textarea required rows={6} maxLength={10000} value={text} onChange={e=>setText(e.target.value)}
           placeholder="Краткое ядро концепции. Что должно остаться неизменным? Какой принцип определяет форму и содержание?" className="mt-1 w-full rounded border border-foreground/20 bg-background p-3 text-sm"/>
       </label>
       <label className="block text-xs">Графический материал (необязательно)
         <input type="url" maxLength={1200} value={visualUrl} onChange={e=>setVisualUrl(e.target.value)} placeholder="https://…"
           className="mt-1 w-full rounded border border-foreground/20 bg-background p-2 text-sm"/>
       </label>
       <div className="space-y-2">
         <p className="text-xs font-medium">Вопросы, вытекающие из концепции</p>
         <p className="text-xs text-foreground/60">Добавляйте только очевидные вопросы. Не нужно заполнять все сферы: информационное облако может оставаться открытым.</p>
         {questions.map((q,i)=><div key={i} className="flex flex-wrap items-start gap-2 rounded-lg border border-foreground/10 p-2">
           <select aria-label={"Сфера "+(i+1)} className="min-w-[120px] flex-1 rounded border border-foreground/20 bg-background p-2 text-xs"
            value={q.sphere} onChange={e=>setQuestions(list=>list.map((item,j)=>j===i?{...item,sphere:e.target.value}:item))}>
             {Object.entries(names).map(([key,label])=><option key={key} value={key} disabled={questions.some((other,j)=>j!==i&&other.sphere===key)}>{label}</option>)}
           </select>
           <input aria-label={"Вопрос "+(i+1)} maxLength={1000} value={q.question} onChange={e=>setQuestions(list=>list.map((item,j)=>j===i?{...item,question:e.target.value}:item))}
             placeholder="Что должна выяснить сфера?" className="min-w-[180px] flex-[3] rounded border border-foreground/20 bg-background p-2 text-xs"/>
           <button type="button" onClick={()=>setQuestions(list=>list.filter((_,j)=>j!==i))} className="rounded border border-foreground/20 px-2 py-2 text-xs">Убрать</button>
         </div>)}
         <button type="button" disabled={questions.length>=8} onClick={addQuestion} className="rounded-full border border-foreground/25 px-3 py-2 text-xs disabled:opacity-50">Добавить вопрос сфере</button>
       </div>
       <button type="button" disabled={busy||!text.trim()||unsubmitted||!visualOk} onClick={()=>void command({
          command:"propose_concept",text:text.trim(),visualUrl:visualUrl.trim()||undefined,
          questions:questions.map(q=>({sphere:q.sphere,question:q.question.trim()}))
        })} className="rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-40">
        {busy?"Сохраняем…":"Передать концепцию на утверждение"}
       </button>
     </div>
   </details>}
   {concepts.length>0&&<details className="rounded-lg border border-foreground/10 p-3">
     <summary className="cursor-pointer text-xs">История концептуальных версий · {concepts.length}</summary>
     <div className="mt-3 space-y-3">
       {[...concepts].reverse().map(c=><article key={c.id} className="rounded-lg bg-foreground/5 p-3">
         <p className="text-xs font-medium">{states[c.status]} · Уровень {c.level} / Итерация {c.iteration}</p>
         <p className="mt-1 text-[11px] text-foreground/55">{new Date(c.createdAt).toLocaleString()}</p>
         <p className="mt-2 whitespace-pre-wrap break-words text-xs">{c.text}</p>
         {c.decision&&<p className="mt-2 text-xs text-foreground/65">Решение Автора: {c.decision.reason}</p>}
       </article>)}
     </div>
   </details>}
   {note&&<p role="status" className="text-xs text-foreground/65">{note}</p>}
   {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
  </section>;
}
