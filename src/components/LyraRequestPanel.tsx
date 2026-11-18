import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/useLocale";
import { lyraSupabase } from "@/integrations/supabase/lyraClient";

type Intent = "purchase" | "custom" | "production";
type Props = { open: boolean; onClose: () => void };

const labels = {
  en: { title: "LYRA / Request", intro: "Tell us how you would like to approach Lyra. Availability, production terms and pricing are confirmed individually.", purchase: "Acquire Lyra", custom: "Custom execution", production: "Production / collaboration", name: "Name", email: "Email", location: "Country / city", note: "Message (optional)", send: "Send request", sending: "Sending…", success: "Your request has been received. We will contact you by email.", error: "The request could not be sent. Please try again.", close: "Close" },
  ru: { title: "LYRA / Запрос", intro: "Расскажите, что вас интересует. Возможность изготовления, сроки и стоимость согласовываются индивидуально.", purchase: "Приобретение Lyra", custom: "Индивидуальное исполнение", production: "Производство / сотрудничество", name: "Имя", email: "Email", location: "Страна / город", note: "Сообщение (необязательно)", send: "Отправить запрос", sending: "Отправка…", success: "Запрос получен. Мы свяжемся с вами по электронной почте.", error: "Не удалось отправить запрос. Попробуйте ещё раз.", close: "Закрыть" },
  uk: { title: "LYRA / Запит", intro: "Розкажіть, що вас цікавить. Можливість виготовлення, терміни та вартість узгоджуються індивідуально.", purchase: "Придбання Lyra", custom: "Індивідуальне виконання", production: "Виробництво / співпраця", name: "Ім’я", email: "Email", location: "Країна / місто", note: "Повідомлення (необов’язково)", send: "Надіслати запит", sending: "Надсилання…", success: "Запит отримано. Ми зв’яжемося з вами електронною поштою.", error: "Не вдалося надіслати запит. Спробуйте ще раз.", close: "Закрити" },
};

export default function LyraRequestPanel({ open, onClose }: Props) {
  const { locale } = useLocale();
  const T = labels[locale];
  const [intent, setIntent] = useState<Intent>("purchase");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending || success) return;
    setSending(true);
    setError(false);
    const cleanName = name.trim().slice(0, 100);
    const cleanEmail = email.trim().slice(0, 255);
    const details = `Commercial Lyra inquiry\nIntent: ${intent}\nLocation: ${location.trim().slice(0, 200)}\nMessage: ${note.trim().slice(0, 1500)}`;
    try {
      const { error: dbError } = await lyraSupabase.from("lyra_inquiries").insert({
        name: cleanName,
        email: cleanEmail,
        location: location.trim().slice(0, 200),
        intent,
        message: note.trim().slice(0, 1500) || null,
        locale,
      } as never);
      if (dbError) throw dbError;
      setSuccess(true);
    } catch (submissionError) {
      console.error("Lyra request failed", submissionError);
      setError(true);
    } finally { setSending(false); }
  };

  return (
    <>
      <div className={`fixed inset-0 z-[90] bg-black/25 transition-opacity duration-500 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={onClose} aria-hidden="true" />
      <aside role="dialog" aria-modal="true" aria-label={T.title} aria-hidden={!open}
        className={`fixed right-0 top-0 z-[91] h-[100dvh] w-full max-w-[440px] overflow-y-auto bg-[#F5EFEB] px-7 py-12 text-[#333] shadow-xl transition-transform duration-500 md:px-11 ${open ? "translate-x-0" : "translate-x-full pointer-events-none"}`}>
        <button type="button" className="absolute right-6 top-5 text-2xl font-light" onClick={onClose} aria-label={T.close}>×</button>
        <h2 className="mb-7 text-xl font-light tracking-widest">{T.title}</h2>
        {success ? <p className="text-sm leading-7">{T.success}</p> : (
          <form onSubmit={submit} className="flex flex-col gap-6 text-sm">
            <p className="max-w-sm text-xs leading-6 text-[#666]">{T.intro}</p>
            <fieldset className="flex flex-col gap-3">
              {(["purchase", "custom", "production"] as const).map((value) => (
                <label key={value} className="flex cursor-pointer items-center gap-3">
                  <input type="radio" name="lyra-intent" value={value} checked={intent === value} onChange={() => setIntent(value)} />
                  <span>{T[value]}</span>
                </label>
              ))}
            </fieldset>
            <label className="flex flex-col gap-2">{T.name}<input className="border-b border-[#aaa] bg-transparent p-2 outline-none" autoComplete="name" maxLength={100} required value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="flex flex-col gap-2">{T.email}<input className="border-b border-[#aaa] bg-transparent p-2 outline-none" type="email" autoComplete="email" maxLength={255} required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="flex flex-col gap-2">{T.location}<input className="border-b border-[#aaa] bg-transparent p-2 outline-none" maxLength={200} required value={location} onChange={(e) => setLocation(e.target.value)} /></label>
            <label className="flex flex-col gap-2">{T.note}<textarea className="min-h-20 border-b border-[#aaa] bg-transparent p-2 outline-none" maxLength={1500} value={note} onChange={(e) => setNote(e.target.value)} /></label>
            {error && <p role="alert" className="text-red-700">{T.error}</p>}
            <button className="self-start border-b border-[#555] pb-1 tracking-wide disabled:opacity-50" type="submit" disabled={sending}>{sending ? T.sending : T.send} →</button>
          </form>
        )}
      </aside>
    </>
  );
}
