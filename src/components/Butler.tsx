import {useState} from "react";
import {useLocation} from "react-router-dom";
type Message={role:"user"|"assistant";content:string};
export default function Butler(){
 const {pathname}=useLocation();
 const locale=pathname.split("/")[1];
 const lang=locale==="uk"||locale==="en"?locale:"ru";
 const t={ru:["Напишите сообщение","Отправить","Сейчас Butler недоступен","Закрыть"],uk:["Напишіть повідомлення","Надіслати","Зараз Butler недоступний","Закрити"],en:["Write a message","Send","Butler is currently unavailable","Close"]}[lang];
 const [open,setOpen]=useState(false),[messages,setMessages]=useState<Message[]>([]),[input,setInput]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [inquiry,setInquiry]=useState(false),[contact,setContact]=useState(""),[summary,setSummary]=useState(""),[consent,setConsent]=useState(false),[receipt,setReceipt]=useState("");
 if(!["kolesnikov.studio","www.kolesnikov.studio"].includes(window.location.hostname)&&!window.location.hostname.endsWith(".vercel.app"))return null;
 async function send(e:React.FormEvent){
 e.preventDefault();const message=input.trim();if(!message||busy)return;
 setBusy(true);setError("");
 try{const response=await fetch("/api/butler",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message,locale:lang,history:messages.slice(-6).map(m=>({...m,content:m.content.slice(0,1800)}))})});
 const data=await response.json();if(!response.ok||typeof data.answer!=="string")throw new Error();
 setMessages(old=>[...old,{role:"user",content:message},{role:"assistant",content:data.answer}]);setInput("");
 if(data.inquiry&&!receipt&&!inquiry){setContact(typeof data.inquiry.contact==="string"?data.inquiry.contact:"");setSummary(data.inquiry.summary);setConsent(false);setInquiry(true);}
 }catch{setError(t[2]);}finally{setBusy(false);}
 }
 return <aside className="fixed bottom-5 right-5 z-50 text-sm">
 {open&&<section aria-label="Butler" className="max-h-[85dvh] overflow-y-auto mb-3 w-[min(22rem,calc(100vw-2.5rem))] rounded-xl border border-neutral-400/40 bg-background/95 text-foreground p-4 shadow-lg backdrop-blur">
 <div className="flex justify-between"><strong>Butler</strong><button onClick={()=>setOpen(false)} aria-label={t[3]}>×</button></div>
 <div role="log" className="my-3 max-h-[40vh] overflow-auto space-y-3">{messages.map((m,i)=><p key={i} className="whitespace-pre-wrap break-words"><strong>{m.role==="assistant"?"Butler":"›"}</strong> {m.content}</p>)}</div>
 {error&&<p role="alert">{error}</p>}
 {messages.length>0&&!inquiry&&<button className="underline my-2" onClick={()=>{setSummary(messages.filter(m=>m.role==="user").map(m=>m.content).join("\n").slice(0,4000));setInquiry(true)}}>{lang==="ru"?"Оформить обращение":lang==="uk"?"Оформити звернення":"Prepare an inquiry"}</button>}
 {inquiry&&<form className="space-y-2 my-2" onSubmit={async e=>{e.preventDefault();if(busy||!consent)return;setBusy(true);setError("");try{const r=await fetch("/api/butler-inquiry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contact,summary,consent})});const d=await r.json();if(!r.ok||!d.id)throw new Error();setReceipt(d.id);}catch{setError(t[2]);}finally{setBusy(false);}}}>
 {receipt?<p role="status">{lang==="ru"?"Обращение зарегистрировано":lang==="uk"?"Звернення зареєстровано":"Inquiry registered"}: {receipt}</p>:<><input required maxLength={320} value={contact} onChange={e=>setContact(e.target.value)} placeholder={lang==="ru"?"Контакт":lang==="uk"?"Контакт":"Contact"} className="w-full border rounded bg-transparent p-2"/><textarea required maxLength={4000} value={summary} onChange={e=>setSummary(e.target.value)} className="w-full border rounded bg-transparent p-2"/><label className="flex gap-2"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>{lang==="ru"?"Согласен передать контакт и текст студии":lang==="uk"?"Погоджуюся передати контакт і текст студії":"I consent to sharing my contact and text with the studio"}</label><button disabled={busy||!consent} type="submit">{t[1]}</button></>}
 </form>}
 <form onSubmit={send} className="flex gap-2"><input aria-label={t[0]} placeholder={t[0]} value={input} maxLength={4000} onChange={e=>setInput(e.target.value)} className="min-w-0 flex-1 border rounded bg-transparent p-2"/><button disabled={busy||!input.trim()} type="submit">{busy?"…":t[1]}</button></form>
 </section>}
 <button aria-expanded={open} onClick={()=>setOpen(v=>!v)} className="rounded-full border border-neutral-400/50 bg-background/90 text-foreground px-4 py-2">Butler</button>
 </aside>;
}
