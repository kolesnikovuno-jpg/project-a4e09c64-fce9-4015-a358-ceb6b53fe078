import {useState} from "react";
import {useLocation, Link} from "react-router-dom";
type Message={role:"user"|"assistant";content:string};
export default function Butler(){
 const {pathname}=useLocation();
 const locale=pathname.split("/")[1];
 const lang=locale==="uk"||locale==="en"?locale:"ru";
 const t={ru:["Напишите сообщение","Отправить","Сейчас Butler недоступен","Закрыть"],uk:["Напишіть повідомлення","Надіслати","Зараз Butler недоступний","Закрити"],en:["Write a message","Send","Butler is currently unavailable","Close"]}[lang];
 const [open,setOpen]=useState(false),[messages,setMessages]=useState<Message[]>([]),[input,setInput]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 if(!["kolesnikov.studio","www.kolesnikov.studio"].includes(window.location.hostname)&&!window.location.hostname.endsWith(".vercel.app"))return null;
 async function send(e:React.FormEvent){
 e.preventDefault();const message=input.trim();if(!message||busy)return;
 setBusy(true);setError("");
 try{const response=await fetch("/api/butler",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message,locale:lang,history:messages.slice(-6).map(m=>({...m,content:m.content.slice(0,1800)}))})});
 const data=await response.json();if(!response.ok||typeof data.answer!=="string")throw new Error();
 setMessages(old=>[...old,{role:"user",content:message},{role:"assistant",content:data.answer}]);setInput("");
 }catch{setError(t[2]);}finally{setBusy(false);}
 }
 return <aside className="fixed bottom-5 right-5 z-50 text-sm">
 {open&&<section aria-label="Butler" className="mb-3 w-[min(22rem,calc(100vw-2.5rem))] rounded-xl border border-neutral-400/40 bg-background/95 text-foreground p-4 shadow-lg backdrop-blur">
 <div className="flex justify-between"><strong>Butler</strong><button onClick={()=>setOpen(false)} aria-label={t[3]}>×</button></div>
 <div role="log" className="my-3 max-h-[40vh] overflow-auto space-y-3">{messages.map((m,i)=><p key={i} className="whitespace-pre-wrap break-words"><strong>{m.role==="assistant"?"Butler":"›"}</strong> {m.content}</p>)}</div>
 {error&&<p role="alert">{error}</p>}
 {messages.length>0&&<Link className="block underline my-2" to={`/${lang}/start`} onClick={()=>setOpen(false)}>{lang==="ru"?"Оформить обращение":lang==="uk"?"Оформити звернення":"Prepare an inquiry"}</Link>}
 <form onSubmit={send} className="flex gap-2"><input aria-label={t[0]} placeholder={t[0]} value={input} maxLength={4000} onChange={e=>setInput(e.target.value)} className="min-w-0 flex-1 border rounded bg-transparent p-2"/><button disabled={busy||!input.trim()} type="submit">{busy?"…":t[1]}</button></form>
 </section>}
 <button aria-expanded={open} onClick={()=>setOpen(v=>!v)} className="rounded-full border border-neutral-400/50 bg-background/90 text-foreground px-4 py-2">Butler</button>
 </aside>;
}
