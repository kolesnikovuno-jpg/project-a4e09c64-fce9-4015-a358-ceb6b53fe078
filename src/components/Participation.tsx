import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/useLocale";
import { supabase } from "@/integrations/supabase/client";
import {
  getStatus,
  getUserId,
  getUserName,
  setStatus,
  setUserId,
  setUserName,
  refreshStatus,
  type ParticipationStatus,
} from "@/lib/participationUser";

type Props = {
  model: "lyra" | "nava";
  open: boolean;
  onClose: () => void;
};

type Stage = "intro" | "form" | "action";

const getStoredUserId = (): string | null => {
  try {
    return localStorage.getItem("user_id") || getUserId();
  } catch {
    return getUserId();
  }
};

const CONTRIBUTION_URLS: Record<"lyra" | "nava", string> = {
  lyra: "https://send.monobank.ua/jar/2ezcb2Nk2E",
  nava: "https://send.monobank.ua/jar/jCMAkkYaB",
};

const Participation = ({ model, open, onClose }: Props) => {
  const { t, locale } = useLocale();
  const T = t.participation;

  const [stage, setStage] = useState<Stage>(() => (getStoredUserId() ? "action" : "intro"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [telegram, setTelegram] = useState("");
  const [sentiment, setSentiment] = useState<"support" | "participation" | "undecided" | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setLocalStatus] = useState<ParticipationStatus>(() => getStatus(model));
  const [userName, setLocalUserName] = useState<string | null>(() => getUserName());

  // Recognise user immediately on mount — independent of `open`.
  // If user_id already exists in localStorage, skip the form entirely.
  useEffect(() => {
    const uid = getStoredUserId();
    if (uid) {
      setStage("action");
      setLocalUserName(getUserName());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stage === "intro" && getStoredUserId()) {
      setStage("action");
      return;
    }
    console.log("stage after init:", stage);
  }, [stage]);

  // On open: pick the right initial stage from cached identity, then
  // refresh the status from the webhook in the background.
  useEffect(() => {
    if (!open) {
      const id = window.setTimeout(() => {
        setError(null);
        setSubmitting(false);
      }, 600);
      return () => window.clearTimeout(id);
    }
    const cached = getStatus(model);
    const uid = getStoredUserId();
    setLocalStatus(cached);
    setLocalUserName(getUserName());
    // If we already know the user (user_id stored from a previous
    // submission or token exchange), skip the form entirely and go to
    // the action stage, regardless of current cached status.
    if (uid) {
      setStage("action");
    } else {
      setStage("intro");
    }
    // Background refresh — does not block UI.
    void refreshStatus(model).then(() => {
      setLocalStatus(getStatus(model));
      setLocalUserName(getUserName());
    });
  }, [open, model]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) return;
    setSubmitting(true);
    setError(null);
    const trimmedTelegram = telegram.trim().slice(0, 200);
    // Save user_id (= email) IMMEDIATELY, independent of webhook response.
    // This guarantees recognition on next page load even if the webhook fails.
    const emailAsId = trimmedEmail.slice(0, 255);
    try {
      localStorage.setItem("user_id", emailAsId);
      console.log("user_id saved:", localStorage.getItem("user_id"));
    } catch (e) {
      console.warn("localStorage write failed", e);
    }
    setUserId(emailAsId);
    setUserName(trimmedName.slice(0, 100));
    const existingUserId = emailAsId;
    const { error: dbError } = await supabase
      .from("participation_requests")
      .insert({
        model,
        name: trimmedName.slice(0, 100),
        email: trimmedEmail.slice(0, 255),
        message: message.trim() ? message.trim().slice(0, 2000) : null,
        locale,
        sentiment: sentiment || null,
      });
    if (dbError) {
      setSubmitting(false);
      setError(T.error);
      return;
    }
    // Fire-and-forget email notification to site owner.
    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "participation-request",
          idempotencyKey: `participation-${model}-${trimmedEmail}-${Date.now()}`,
          templateData: {
            name: trimmedName.slice(0, 100),
            email: trimmedEmail.slice(0, 255),
            message: message.trim() ? message.trim().slice(0, 2000) : "",
            model,
            locale,
            sentiment: sentiment || "",
            telegram: trimmedTelegram,
          },
        },
      });
    } catch (e) {
      // Non-fatal: data is already saved.
      console.warn("participation email notification failed", e);
    }
    // Fire-and-forget POST to Make webhook — ONE single object, never an array.
    try {
      const payloadOut = {
        kind: "participation_request",
        email: trimmedEmail.slice(0, 255),
        name: trimmedName.slice(0, 100),
        model_id: model,
        user_id: existingUserId,
        participation: sentiment === "undecided" ? "not_decided" : (sentiment || ""),
        message: message.trim() ? message.trim().slice(0, 2000) : "",
        telegram: trimmedTelegram,
      };
      const res = await fetch("https://hook.eu2.make.com/n4g9lw19rfw52krs9ff6gsvy7p7x5mnx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadOut),
      });
// Read user_id / user_name from the webhook response.
let data: any = null;
try {
  data = await res.json();
} catch (parseErr) {
  console.warn("participation: failed to parse webhook response", parseErr);
}
// Make often wraps payload in an array — unwrap it.
const payload = Array.isArray(data) ? data[0] : data;
if (payload && typeof payload === "object") {
  const rawUid = payload.user_id ?? payload.userId ?? payload.id;
  const uid =
    typeof rawUid === "string"
      ? rawUid.match(/\[([^\]]+)\]\(mailto:[^)]+\)/)?.[1] ?? rawUid
      : rawUid;

  if (typeof uid === "string" && uid) {
    localStorage.setItem("user_id", uid);
    setUserId(uid);
  }
}
    } catch (e) {
      console.warn("participation webhook failed", e);
    }
    // Always remember the name they typed as a friendly fallback.
    if (!getUserName()) setUserName(trimmedName.slice(0, 100));
    setStatus(model, "requested");
    setLocalStatus("requested");
    setLocalUserName(getUserName());
    setSubmitting(false);
    setStage("action");
  };

  return (
    <>
      <style>{`
        .pt-overlay{
          position:fixed; inset:0;
          background:rgba(20,20,20,0.18);
          backdrop-filter:blur(2px);
          -webkit-backdrop-filter:blur(2px);
          z-index:80; opacity:0; pointer-events:none;
          transition:opacity .7s cubic-bezier(0.22,0.61,0.36,1);
        }
        .pt-overlay.open{ opacity:1; pointer-events:auto; }
        .pt-panel{
          position:fixed; top:0; right:0; height:100%;
          width:34%; max-width:415px; min-width:325px;
          background:hsl(24 26% 93%);
          z-index:81;
          transform:translateX(100%);
          transition:transform .8s cubic-bezier(0.22,0.61,0.36,1);
          padding:42px 40px 56px 44px;
          overflow-y:auto;
          font-family:'JetBrains Mono','IBM Plex Mono','Menlo',ui-monospace,monospace;
          font-weight:400;
          font-size:12px; line-height:1.9;
          color:#3A3A3A;
          letter-spacing:0.01em;
          border-left:none;
          box-shadow:none;
        }
        .pt-panel::before{
          content:""; position:absolute; top:0; left:-110px; bottom:0;
          width:110px; pointer-events:none;
          background:linear-gradient(to right,
            hsla(24,26%,93%,0) 0%,
            hsla(24,26%,93%,0.03) 35%,
            hsla(24,26%,93%,0.12) 60%,
            hsla(24,26%,93%,0.45) 85%,
            hsla(24,26%,93%,1) 100%);
        }
        .pt-panel.open{ transform:translateX(0); }
        @media(max-width:768px){
          .pt-panel{ width:100%; min-width:0; max-width:none; padding:34px 24px 48px 26px; }
          .pt-panel::before{ display:none; }
        }
        .pt-close{
          position:absolute; top:14px; right:18px;
          background:transparent; border:none; cursor:pointer;
          font-size:22px; color:#9A9A9A; line-height:1;
          font-weight:300; font-family:inherit;
          transition:color .2s ease; opacity:0.7;
        }
        .pt-close:hover{ color:#1A1A1A; opacity:1; }
        .pt-title{
          font-size:21px; font-weight:250; letter-spacing:0.04em;
          color:#3A3A3A; margin:0 0 30px; line-height:1;
          font-family:'JetBrains Mono','IBM Plex Mono','Menlo',ui-monospace,monospace;
        }
        .pt-section{ padding:10px 0; }
        .pt-section-title{
          font-size:10px; letter-spacing:0.18em; text-transform:uppercase;
          color:#8A8A8A; margin-bottom:14px; font-weight:400;
        }
        .pt-text{ margin:0 0 6px; color:#3A3A3A; font-size:12.5px; line-height:1.95; white-space:pre-line; }
        .pt-rule{ border:0; border-top:1px dashed rgba(0,0,0,0.18); margin:0; height:0; }
        .pt-line{ margin:0 0 4px; color:#3A3A3A; font-size:12.5px; line-height:1.95; }
        .pt-line .k{ color:#8A8A8A; text-transform:lowercase; }
        .pt-line .sep{ color:#9A9A9A; margin:0 6px; }
        .pt-line .v{ color:#2A2A2A; }
        .pt-action{
          display:inline-flex; align-items:center; gap:8px;
          padding:6px 0;
          background:transparent; border:none;
          font-family:inherit; font-size:12px; font-weight:400;
          color:#8E8E8E; letter-spacing:0.02em; text-transform:lowercase;
          cursor:pointer; text-align:left;
          transition:color .2s ease;
          margin-top:14px;
        }
        .pt-action:hover{ color:#3A3A3A; }
        .pt-action .arrow{ color:#AEAEAE; font-size:12px; }
        .pt-form{ display:flex; flex-direction:column; gap:18px; margin-top:6px; }
        .pt-field{ display:flex; flex-direction:column; gap:4px; }
        .pt-label{
          font-size:10px; letter-spacing:0.14em; text-transform:lowercase;
          color:#8A8A8A;
        }
        .pt-input, .pt-textarea{
          background:transparent;
          border:none;
          border-bottom:1px solid rgba(0,0,0,0.18);
          padding:6px 0;
          font-family:inherit; font-size:13px; color:#1F1F1F;
          letter-spacing:0.01em;
          outline:none;
          border-radius:0;
        }
        .pt-textarea{ min-height:70px; resize:vertical; }
        .pt-input:focus, .pt-textarea:focus{ border-bottom-color:#1F1F1F; }
        .pt-error{ color:#B5524A; font-size:11px; margin-top:4px; }
        .pt-radio-group{
          display:flex; flex-direction:column; gap:8px;
          padding-top:2px;
        }
        .pt-radio{
          display:flex; align-items:center; gap:10px;
          cursor:pointer;
          font-family:inherit; font-size:12.5px;
          color:#3A3A3A; letter-spacing:0.01em;
          line-height:1.6;
          user-select:none;
        }
        .pt-radio input{
          appearance:none; -webkit-appearance:none;
          width:11px; height:11px; margin:0;
          border:1px solid rgba(0,0,0,0.32);
          border-radius:50%;
          background:transparent;
          cursor:pointer;
          flex-shrink:0;
          transition:border-color .2s ease, background .2s ease;
        }
        .pt-radio input:checked{
          border-color:#1F1F1F;
          background:radial-gradient(circle, #1F1F1F 0 3px, transparent 3.5px);
        }
        .pt-radio:hover input{ border-color:#1F1F1F; }
        .pt-link{
          display:inline-block; margin-top:18px;
          color:#2A2A2A; text-decoration:none;
          font-family:inherit; font-size:12px;
          letter-spacing:0.02em; text-transform:lowercase;
          border-bottom:1px dashed rgba(0,0,0,0.28);
          padding-bottom:2px;
          transition:color .2s ease;
        }
        .pt-link:hover{ color:#C97A63; }
        .pt-stage{ animation:ptFade .35s ease both; }
        @keyframes ptFade{ from{opacity:0;} to{opacity:1;} }
      `}</style>

      <div
        className={`pt-overlay ${open ? "open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside className={`pt-panel ${open ? "open" : ""}`} aria-hidden={!open}>
        <button className="pt-close" aria-label={T.close_aria} onClick={onClose}>×</button>
        <h2 className="pt-title">{T.title}</h2>

        {stage === "intro" && (
          <div className="pt-stage">
            <div className="pt-section">
              <p className="pt-text">{T.intro}</p>
            </div>
            <div className="pt-section">
              <p className="pt-line"><span className="k">{T.stage_label}</span><span className="sep">—</span><span className="v">{T.stage_value}</span></p>
              <p className="pt-line"><span className="k">{T.goal_label}</span><span className="sep">—</span><span className="v">{T.goal_value}</span></p>
            </div>
            <div className="pt-section">
              <p className="pt-text">{T.limit}</p>
            </div>
            <button className="pt-action" type="button" onClick={() => setStage("form")}>
              <span>{T.request_button}</span>
              <span className="arrow">→</span>
            </button>
          </div>
        )}

        {stage === "form" && (
          <form className="pt-stage pt-form" onSubmit={handleSubmit} noValidate>
            <div className="pt-field">
              <label className="pt-label" htmlFor="pt-name">{T.form_name}</label>
              <input
                id="pt-name"
                className="pt-input"
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="pt-field">
              <label className="pt-label" htmlFor="pt-email">{T.form_email}</label>
              <input
                id="pt-email"
                className="pt-input"
                type="email"
                required
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="pt-field">
              <label className="pt-label" htmlFor="pt-telegram">
                {T.form_telegram} <span style={{ opacity: 0.6 }}>· {T.form_message_optional}</span>
              </label>
              <input
                id="pt-telegram"
                className="pt-input"
                type="text"
                maxLength={200}
                placeholder={T.form_telegram_placeholder}
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="pt-field">
              <span className="pt-label">{T.form_sentiment_label}</span>
              <div className="pt-radio-group" role="radiogroup" aria-label={T.form_sentiment_label}>
                {([
                  ["support", T.form_sentiment_support],
                  ["participation", T.form_sentiment_participation],
                  ["undecided", T.form_sentiment_undecided],
                ] as const).map(([value, label]) => (
                  <label key={value} className="pt-radio">
                    <input
                      type="radio"
                      name="pt-sentiment"
                      value={value}
                      checked={sentiment === value}
                      onChange={() => setSentiment(value)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="pt-field">
              <label className="pt-label" htmlFor="pt-message">
                {T.form_message} <span style={{ opacity: 0.6 }}>· {T.form_message_optional}</span>
              </label>
              <textarea
                id="pt-message"
                className="pt-textarea"
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            {error && <div className="pt-error">{error}</div>}
            <button className="pt-action" type="submit" disabled={submitting}>
              <span>{submitting ? T.submitting : T.submit}</span>
              <span className="arrow">→</span>
            </button>
          </form>
        )}

        {stage === "action" && (
          <div className="pt-stage">
            {userName && (
              <div className="pt-section">
                <p className="pt-line">
                  <span className="k">{T.action_greeting}</span>
                  <span className="sep">—</span>
                  <span className="v">{userName}</span>
                </p>
              </div>
            )}
            <div className="pt-section">
              <p className="pt-section-title">
                {status === "allowed" ? T.action_allowed_title : T.action_requested_title}
              </p>
              <p className="pt-text">{T.success_text}</p>
            </div>
            <a
              className="pt-link"
              href={CONTRIBUTION_URLS[model]}
              target="_blank"
              rel="noopener noreferrer"
            >
              {T.proceed_link} ↗
            </a>
          </div>
        )}
      </aside>
    </>
  );
};

export default Participation;