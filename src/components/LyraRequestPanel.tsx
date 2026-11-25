import "@/styles/uno-document.css";
import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/useLocale";
import { lyraSupabase } from "@/integrations/supabase/lyraClient";
import { trackLyra } from "@/lib/lyraAnalytics";

declare global {
  interface Window { gtag?: (...args: unknown[]) => void; }
}

type Intent = "purchase" | "custom" | "production";
type ContactChannel = "email" | "telegram" | "viber";
type Props = { open: boolean; onClose: () => void; frameColor?: string };

const labels = {
  en: { title: "LYRA / Request", intro: "Lyra is made to order in its original form, with a choice of color. Send a request to discuss the color, price and production timeframe. We will contact you using your selected channel.", purchase: "Acquire Lyra", custom: "Discuss color", production: "Production / collaboration", name: "Name", email: "Email", location: "Country / city", note: "Message (optional)", send: "Send request", sending: "Sending…", success: "Your request has been received. We will contact you using your selected channel.", error: "The request could not be sent. Please try again.", close: "Close" },
  ru: { title: "LYRA / Запрос", intro: "Lyra изготавливается под заказ в авторской форме, с возможностью выбора цвета. Отправьте запрос, чтобы обсудить цвет, стоимость и сроки. Мы свяжемся с вами выбранным способом.", purchase: "Приобретение Lyra", custom: "Выбор цвета", production: "Производство / сотрудничество", name: "Имя", email: "Email", location: "Страна / город", note: "Сообщение (необязательно)", send: "Отправить запрос", sending: "Отправка…", success: "Запрос получен. Мы свяжемся с вами выбранным способом.", error: "Не удалось отправить запрос. Попробуйте ещё раз.", close: "Закрыть" },
  uk: { title: "LYRA / Запит", intro: "Lyra виготовляється на замовлення в авторській формі, з можливістю вибору кольору. Надішліть запит, щоб обговорити колір, вартість і терміни. Ми зв’яжемося з вами обраним способом.", purchase: "Придбання Lyra", custom: "Вибір кольору", production: "Виробництво / співпраця", name: "Ім’я", email: "Email", location: "Країна / місто", note: "Повідомлення (необов’язково)", send: "Надіслати запит", sending: "Надсилання…", success: "Запит отримано. Ми зв’яжемося з вами обраним способом.", error: "Не вдалося надіслати запит. Спробуйте ще раз.", close: "Закрити" },
};

export default function LyraRequestPanel({ open, onClose, frameColor }: Props) {
  const { locale } = useLocale();
  const T = labels[locale];
  const [intent, setIntent] = useState<Intent>("purchase");
  const [name, setName] = useState("");
  const [contactChannel, setContactChannel] = useState<ContactChannel>("email");
  const [contactValue, setContactValue] = useState("");
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
    const cleanContact = contactValue.trim().slice(0, 255);
    const cleanEmail = contactChannel === "email" ? cleanContact : null;
    try {
      const { error: dbError } = await lyraSupabase.from("lyra_inquiries").insert({
        name: cleanName,
        email: cleanEmail,
        contact_channel: contactChannel,
        contact_value: cleanContact,
        location: location.trim().slice(0, 200),
        intent,
        message: [frameColor ? "Frame color (digital reference): " + frameColor : "", note.trim()].filter(Boolean).join("\n").slice(0,1500) || null,
        locale,
      } as never);
      if (dbError) throw dbError;
      setSuccess(true);
      trackLyra("request_success", locale);
      // Fire Google Ads only after the inquiry has been stored successfully.
      if (typeof window.gtag === "function") {
        window.gtag("event", "conversion", { send_to: "AW-18588333495/67EICJnL67wdELfrzZ9F" });
      }
    } catch (submissionError) {
      console.error("Lyra request failed", submissionError);
      setError(true);
    } finally { setSending(false); }
  };

  return (
    <>
      
      <div className={`fixed inset-0 z-[90] bg-[rgba(20,20,20,0.22)] transition-opacity duration-700 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={onClose} aria-hidden="true" />
      <aside role="dialog" aria-modal="true" aria-label={T.title} aria-hidden={!open}
        className={`lr-panel fixed right-0 top-0 z-[91] h-[100dvh] overflow-y-auto bg-[#F5EFEB] ${open ? "open" : "pointer-events-none"}`}>
        <button type="button" className="lr-close absolute right-[18px] top-[14px] text-[22px] font-light" onClick={onClose} aria-label={T.close}>×</button>
        <div className="lr-meta"><span>ref · lyra / request</span><span>{new Date().toISOString().slice(0,10)}</span></div>
        <h2 className="lr-title">{T.title}</h2>
        {success ? <p className="text-[12px] leading-[1.7]">{T.success}</p> : (
          <form onSubmit={submit} className="flex flex-col text-[12px]">
            <p className="lr-intro">{T.intro}</p>
            {frameColor && <p>Frame color · {frameColor.slice(0,7)} <span style={{display:"inline-block",width:18,height:18,background:frameColor.slice(0,7)}} /></p>}
            <hr className="lr-rule" />
            <fieldset className="lr-options"><legend className="lr-heading">{locale === "en" ? "Purpose" : locale === "uk" ? "Мета запиту" : "Цель запроса"}</legend>
              {(["purchase", "custom", "production"] as const).map((value) => (
                <label key={value} className="lr-option">
                  <input type="radio" name="lyra-intent" value={value} checked={intent === value} onChange={() => setIntent(value)} />
                  <span>{T[value]}</span>
                </label>
              ))}
            </fieldset>
            <hr className="lr-rule" />
            <div className="lr-heading lr-space">{locale === "en" ? "Contact" : "Контакт"}</div>
            <label className="lr-field">{T.name}<input className="lr-input" autoComplete="name" maxLength={100} required value={name} onChange={(e) => setName(e.target.value)} /></label>
            <fieldset className="lr-options"><legend className="lr-heading">{locale === "ru" ? "Способ связи" : locale === "uk" ? "Спосіб зв’язку" : "Preferred contact"}</legend>
              {(["email", "telegram", "viber"] as const).map((channel) => (
                <label key={channel} className="lr-option">
                  <input type="radio" name="lyra-contact-channel" value={channel} checked={contactChannel === channel} onChange={() => { setContactChannel(channel); setContactValue(""); }} />
                  <span>{channel === "email" ? "Email" : channel === "telegram" ? "Telegram" : "Viber"}</span>
                </label>
              ))}
            </fieldset>
            <label className="lr-field">
              {contactChannel === "email" ? T.email : contactChannel === "telegram" ? "Telegram" : "Viber"}
              <input className="lr-input" type={contactChannel === "email" ? "email" : contactChannel === "viber" ? "tel" : "text"} autoComplete={contactChannel === "email" ? "email" : contactChannel === "viber" ? "tel" : "off"} placeholder={contactChannel === "email" ? "name@example.com" : contactChannel === "telegram" ? "@username" : "+380…"} maxLength={255} minLength={contactChannel === "email" ? undefined : 3} pattern={contactChannel === "viber" ? "\\+?[0-9 ()-]{7,25}" : undefined} required value={contactValue} onChange={(e) => setContactValue(e.target.value)} />
            </label>
            <label className="lr-field">{T.location}<input className="lr-input" maxLength={200} required value={location} onChange={(e) => setLocation(e.target.value)} /></label>
            <hr className="lr-rule" />
            <div className="lr-heading lr-space">{locale === "en" ? "Details" : locale === "uk" ? "Деталі" : "Детали"}</div>
            <label className="lr-field">{T.note}<textarea className="min-h-20 lr-input" maxLength={1500} value={note} onChange={(e) => setNote(e.target.value)} /></label>
            {error && <p role="alert" className="text-[#9B4747] text-[11px]">{T.error}</p>}
            <hr className="lr-rule" />
            <button className="lr-send disabled:opacity-50" type="submit" disabled={sending}>{sending ? T.sending : T.send} →</button>
          </form>
        )}
      </aside>
    </>
  );
}
