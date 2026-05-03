import { useEffect, useState } from "react";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const Unsubscribe = () => {
  const [state, setState] = useState<"loading" | "ready" | "done" | "already" | "invalid" | "error">("loading");
  const token = new URLSearchParams(window.location.search).get("token") || "";

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    fetch(`${FN_URL}?token=${encodeURIComponent(token)}`, { headers: { apikey: ANON } })
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) setState("ready");
        else if (d.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, [token]);

  const confirm = async () => {
    setState("loading");
    try {
      const r = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON },
        body: JSON.stringify({ token }),
      });
      const d = await r.json();
      if (d.success) setState("done");
      else if (d.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch {
      setState("error");
    }
  };

  return (
    <main style={wrap}>
      <div style={card}>
        <h1 style={h1}>kolesnikov.uno</h1>
        {state === "loading" && <p style={p}>…</p>}
        {state === "ready" && (
          <>
            <p style={p}>Confirm unsubscribe from kolesnikov emails.</p>
            <button onClick={confirm} style={btn}>Unsubscribe →</button>
          </>
        )}
        {state === "done" && <p style={p}>You have been unsubscribed.</p>}
        {state === "already" && <p style={p}>You are already unsubscribed.</p>}
        {state === "invalid" && <p style={p}>Invalid or expired link.</p>}
        {state === "error" && <p style={p}>Something went wrong. Please try again later.</p>}
      </div>
    </main>
  );
};

const wrap: React.CSSProperties = {
  minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
  background: "hsl(24 26% 93%)", fontFamily: "'JetBrains Mono','IBM Plex Mono',Menlo,monospace",
  color: "#3A3A3A", padding: "24px",
};
const card: React.CSSProperties = { maxWidth: 420, width: "100%", textAlign: "left" };
const h1: React.CSSProperties = { fontSize: 18, fontWeight: 300, letterSpacing: "0.04em", margin: "0 0 24px" };
const p: React.CSSProperties = { fontSize: 13, lineHeight: 1.7, margin: "0 0 18px" };
const btn: React.CSSProperties = {
  background: "transparent", border: "none", padding: "6px 0",
  fontFamily: "inherit", fontSize: 12, color: "#2A2A2A", cursor: "pointer",
  borderBottom: "1px dashed rgba(0,0,0,0.28)",
};

export default Unsubscribe;
