import "@/styles/uno-document.css";
import { useState, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useLocale } from "@/i18n/useLocale";
import { lyraSupabase as studioSupabase } from "@/integrations/supabase/lyraClient";

export const collaborationLabels = {
  "en": {
    "link": "Collaboration",
    "invitation": "At this stage, Nava is open to collaboration in prototyping, technological solutions and further realization.",
    "title": "NAVA / Collaboration",
    "intro": "Choose one or more ways you would like to collaborate. Your proposal is a starting point for discussion and creates no financial or other obligations.",
    "formats": "Ways to collaborate",
    "materials": "Materials and technologies",
    "prototype": "Prototype fabrication",
    "production": "Production partnership",
    "financial": "Financial participation",
    "other": "Other forms of collaboration",
    "name": "Name",
    "contact": "Preferred contact",
    "note": "Message (optional)",
    "send": "Send proposal",
    "sending": "Sending…",
    "success": "Your proposal has been received. Further terms can be discussed individually.",
    "error": "Could not send the proposal. Please try again.",
    "choose": "Select at least one option.",
    "close": "Close"
  },
  "ru": {
    "link": "Сотрудничество",
    "invitation": "На данном этапе Nava открыта для сотрудничества в области прототипирования, технологических решений и дальнейшей реализации объекта.",
    "title": "NAVA / Сотрудничество",
    "intro": "Выберите один или несколько форматов сотрудничества. Предложение служит началом диалога и не создаёт финансовых или иных обязательств.",
    "formats": "Форматы сотрудничества",
    "materials": "Материалы и технологии",
    "prototype": "Изготовление прототипа",
    "production": "Производственное партнёрство",
    "financial": "Финансовое участие",
    "other": "Другой формат сотрудничества",
    "name": "Имя",
    "contact": "Способ связи",
    "note": "Сообщение (необязательно)",
    "send": "Отправить предложение",
    "sending": "Отправка…",
    "success": "Предложение получено. Дальнейшие условия можно обсудить индивидуально.",
    "error": "Не удалось отправить предложение. Попробуйте ещё раз.",
    "choose": "Выберите хотя бы один вариант.",
    "close": "Закрыть"
  },
  "uk": {
    "link": "Співпраця",
    "invitation": "На цьому етапі Nava відкрита до співпраці у сфері прототипування, технологічних рішень та подальшої реалізації об’єкта.",
    "title": "NAVA / Співпраця",
    "intro": "Оберіть один або кілька форматів співпраці. Пропозиція є початком діалогу та не створює фінансових чи інших зобов’язань.",
    "formats": "Формати співпраці",
    "materials": "Матеріали й технології",
    "prototype": "Виготовлення прототипу",
    "production": "Виробниче партнерство",
    "financial": "Фінансова участь",
    "other": "Інший формат співпраці",
    "name": "Ім’я",
    "contact": "Спосіб зв’язку",
    "note": "Повідомлення (необов’язково)",
    "send": "Надіслати пропозицію",
    "sending": "Надсилання…",
    "success": "Пропозицію отримано. Подальші умови можна обговорити індивідуально.",
    "error": "Не вдалося надіслати пропозицію. Спробуйте ще раз.",
    "choose": "Оберіть хоча б один варіант.",
    "close": "Закрити"
  }
} as const;
const formats = ["materials","prototype","production","financial","other"] as const;
type Format = typeof formats[number];
type Channel = "email" | "telegram" | "viber";

export default function NavaCollaborationPanel() {
  const { locale } = useLocale();
  const T = collaborationLabels[locale];
  const [open,setOpen] = useState(false);
  const [selected,setSelected] = useState<Format[]>([]);
  const [name,setName] = useState("");
  const [channel,setChannel] = useState<Channel>("email");
  const [contact,setContact] = useState("");
  const [note,setNote] = useState("");
  const [sending,setSending] = useState(false);
  const [success,setSuccess] = useState(false);
  const [error,setError] = useState<"choose"|"error"|null>(null);
  const busy = useRef(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy.current || success) return;
    if (!selected.length) { setError("choose"); return; }
    if (!name.trim() || contact.trim().length < 3) { setError("error"); return; }
    busy.current=true; setSending(true); setError(null);
    try {
      const { error: dbError } = await studioSupabase.from("studio_collaboration_requests").insert({
        model:"nava", formats:selected, name:name.trim(), contact_channel:channel,
        contact_value:contact.trim(), message:note.trim() || null, locale,
      });
      if (dbError) throw dbError;
      setSuccess(true);
    } catch { setError("error"); }
    finally { busy.current=false; setSending(false); }
  };
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="nava-collaboration-link studio-object-panel-trigger" style={{background:"transparent",border:0,padding:0,cursor:"pointer",fontFamily:"var(--font-body)",fontSize:13,fontWeight:300,letterSpacing:".04em",color:"hsl(0 0% 38%)"}}>{T.link} <span aria-hidden="true">↗</span></button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[10000] bg-[rgba(20,20,20,0.22)]" />
        <Dialog.Content className="lr-panel open fixed right-0 top-0 z-[10001] h-[100dvh] overflow-y-auto bg-[#F5EFEB]" style={{maxHeight:"100dvh"}}>
          <Dialog.Close asChild><button type="button" className="lr-close absolute right-[18px] top-[14px] text-[22px] font-light" aria-label={T.close}>×</button></Dialog.Close>
          <div className="lr-meta"><span>ref · nava / collaboration</span><span>{new Date().toISOString().slice(0,10)}</span></div>
          <Dialog.Title className="lr-title" style={{fontSize:"clamp(21px, 4vw, 27px)",lineHeight:1.2,overflowWrap:"anywhere"}}>{T.title}</Dialog.Title>
          <Dialog.Description className="lr-intro">{T.intro}</Dialog.Description>
          {success ? <p role="status">{T.success}</p> : <form onSubmit={submit} className="flex flex-col text-[12px]">
            <hr className="lr-rule" />
            <fieldset className="lr-options">
              <legend className="lr-heading">{T.formats}</legend>
              {formats.map(value => <label className="lr-option" key={value}>
                <input type="checkbox" style={{borderRadius:0}} checked={selected.includes(value)} onChange={e=>{setSelected(prev=>e.target.checked?[...prev,value]:prev.filter(item=>item!==value));setError(null);}} />
                <span>{T[value]}</span>
              </label>)}
            </fieldset>
            <hr className="lr-rule" />
            <label className="lr-field">{T.name}<input className="lr-input" autoComplete="name" maxLength={100} required value={name} onChange={e=>setName(e.target.value)} /></label>
            <fieldset className="lr-options"><legend className="lr-heading">{T.contact}</legend>
              {(["email","telegram","viber"] as const).map(value=><label className="lr-option" key={value}><input type="radio" name="nava-contact" checked={channel===value} onChange={()=>{setChannel(value);setContact("");}} /><span>{value==="email"?"Email":value==="telegram"?"Telegram":"Viber"}</span></label>)}
            </fieldset>
            <label className="lr-field">{channel==="email"?"Email":channel==="telegram"?"Telegram":"Viber"}<input className="lr-input" type={channel==="email"?"email":channel==="viber"?"tel":"text"} autoComplete={channel==="email"?"email":channel==="viber"?"tel":"off"} placeholder={channel==="email"?"name@example.com":channel==="telegram"?"@username":"+380…"} required minLength={3} maxLength={255} pattern={channel==="viber"?"\\+?[0-9 ()-]{7,25}":undefined} value={contact} onChange={e=>setContact(e.target.value)} /></label>
            <label className="lr-field">{T.note}<textarea className="lr-input min-h-20" maxLength={1500} value={note} onChange={e=>setNote(e.target.value)} /></label>
            {error && <p role="alert" className="text-[#9B4747]">{T[error]}</p>}
            <hr className="lr-rule" />
            <button type="submit" className="lr-send disabled:opacity-50" disabled={sending}>{sending?T.sending:T.send} →</button>
          </form>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
