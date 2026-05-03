import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/useLocale";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  model: "lyra" | "nava";
  open: boolean;
  onClose: () => void;
};

const CONTRIBUTION_URL = "https://send.monobank.ua/jar/2ezcb2Nk2E";

const Participation = ({ model, open, onClose }: Props) => {
  const { t, locale } = useLocale();
  const T = t.participation;

  type Stage = "intro" | "form" | "success";
  const [stage, setStage] = useState<Stage>("intro");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset whenever popup is closed/reopened.
  useEffect(() => {
    if (!open) {
      const id = window.setTimeout(() => {
        setStage("intro");
        setName("");
        setEmail("");
        setMessage("");
        setError(null);
        setSubmitting(false);
      }, 600);
      return () => window.clearTimeout(id);
    }
  }, [open]);

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
    const { error: dbError } = await supabase
      .from("participation_requests")
      .insert({
        model,
        name: trimmedName.slice(0, 100),
        email: trimmedEmail.slice(0, 255),
        message: message.trim() ? message.trim().slice(0, 2000) : null,
        locale,
      });
    setSubmitting(false);
    if (dbError) {
      setError(T.error);
      return;
    }
    setStage("success");
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
          background:#F5EFEB;
          z-index:81;
          transform:translateX(100%);
          transition:transform .8s cubic-bezier(0.22,0.61,0.36,1);
          padding:42px 40px 56px 44px;
          overflow-y:auto;
          font-family:'JetBrains Mono','IBM Plex Mono','Menlo',ui-monospace,monospace;
          font-weight:400;
          font-size:12px; line-height:1.8;
          color:#3A3A3A;
          letter-spacing:0.01em;
          border-left:1px solid rgba(0,0,0,0.05);
        }
        .pt-panel.open{ transform:translateX(0); }
        @media(max-width:768px){
          .pt-panel{ width:100%; min-width:0; max-width:none; padding:34px 24px 48px 26px; }
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
          font-size:26px; font-weight:300; letter-spacing:0.04em;
          color:#1F1F1F; margin:0 0 28px; line-height:1;
          font-family:'JetBrains Mono','IBM Plex Mono','Menlo',ui-monospace,monospace;
        }
        .pt-section{ padding:14px 0; }
        .pt-section-title{
          font-size:10px; letter-spacing:0.18em; text-transform:uppercase;
          color:#8A8A8A; margin-bottom:14px; font-weight:400;
        }
        .pt-text{ margin:0; color:#3A3A3A; font-size:12.5px; line-height:1.85; white-space:pre-line; }
        .pt-rule{ border:0; border-top:1px dashed rgba(0,0,0,0.18); margin:0; height:0; }
        .pt-row{ display:flex; gap:18px; padding:5px 0; font-size:12px; }
        .pt-row .k{ color:#8A8A8A; min-width:110px; text-transform:lowercase; }
        .pt-row .v{ color:#2A2A2A; flex:1; }
        .pt-action{
          display:inline-flex; align-items:center; gap:8px;
          padding:6px 0;
          background:transparent; border:none;
          font-family:inherit; font-size:12px; font-weight:400;
          color:#2A2A2A; letter-spacing:0.02em; text-transform:lowercase;
          cursor:pointer; text-align:left;
          transition:color .2s ease;
          margin-top:10px;
        }
        .pt-action:hover{ color:#C97A63; }
        .pt-action .arrow{ color:#9A9A9A; font-size:12px; }
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
              <div className="pt-row"><span className="k">{T.stage_label}</span><span className="v">{T.stage_value}</span></div>
              <div className="pt-row"><span className="k">{T.goal_label}</span><span className="v">{T.goal_value}</span></div>
            </div>
            <hr className="pt-rule" />
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

        {stage === "success" && (
          <div className="pt-stage">
            <div className="pt-section">
              <p className="pt-text">{T.success_text}</p>
            </div>
            <a
              className="pt-link"
              href={CONTRIBUTION_URL}
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