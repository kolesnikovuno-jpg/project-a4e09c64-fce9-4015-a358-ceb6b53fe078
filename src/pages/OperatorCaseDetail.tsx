import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { buildCaseBrief, downloadBriefFile, extractCaseAttachmentPaths } from "@/lib/caseBrief";
import { ManualCopyDialog } from "@/components/operator/ManualCopyDialog";
import { ChevronDown, ChevronRight, FileText, ExternalLink, LogOut, Check } from "lucide-react";

type Case = Tables<"cases">;

const SERVICE_STATUSES = [
  { value: "queued", label: "Queued" },
  { value: "drafting", label: "Drafting" },
  { value: "review", label: "Review" },
  { value: "finalized", label: "Finalized" },
  { value: "delivered", label: "Delivered" },
  { value: "revision", label: "Revision" },
  { value: "closed", label: "Closed" },
] as const;

export default function OperatorCaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [c, setC] = useState<Case | null>(null);
  const [serviceStatus, setServiceStatus] = useState("");
  const [aiDraft, setAiDraft] = useState("");
  const [workingNotes, setWorkingNotes] = useState("");
  const [finalOutput, setFinalOutput] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [sending, setSending] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<"" | "saving" | "generating" | "done">("");
  const [sendStatus, setSendStatus] = useState<"" | "saving" | "generating" | "sending" | "done">("");
  // Snapshot of final_output that the current pdfUrl was generated from.
  // Used to detect outdated PDFs without persisting extra DB fields.
  const [pdfSnapshot, setPdfSnapshot] = useState<string>("");
  const [deliverySent, setDeliverySent] = useState(false);
  const [manualCopyText, setManualCopyText] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [aiDraftOpen, setAiDraftOpen] = useState(true);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate("/operator/login", { replace: true });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles" as never)
        .select("role")
        .eq("user_id", sess.session.user.id);
      const isAdmin = Array.isArray(roles) && roles.some((r: { role: string }) => r.role === "admin");
      if (!active) return;
      if (!isAdmin) {
        setAuthorized(false);
        return;
      }
      setAuthorized(true);
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) {
        toast({ title: "Не удалось загрузить кейс", description: error.message, variant: "destructive" });
        return;
      }
      if (active && data) {
        setC(data);
        setServiceStatus(data.service_status ?? "");
        setAiDraft(data.ai_draft ?? "");
        setWorkingNotes(data.working_notes ?? "");
        setFinalOutput(data.final_output ?? "");
        setPdfUrl(data.pdf_url ?? "");
        // Assume the persisted PDF matches the persisted final_output.
        setPdfSnapshot(data.final_output ?? "");
        setDeliverySent(Boolean((data as { delivery_email_sent?: boolean }).delivery_email_sent));
        const atts = extractCaseAttachmentPaths(data);
        if (atts.length > 0) {
          const { data: signed } = await supabase.storage
            .from("clarity-attachments")
            .createSignedUrls(atts.map((a) => a.path), 60 * 60);
          const map: Record<string, string> = {};
          signed?.forEach((s, i) => {
            const p = s.path ?? atts[i]?.path;
            if (p && s.signedUrl) map[p] = s.signedUrl;
          });
          if (active) setAttachmentUrls(map);
        }
      }
    })();
    return () => { active = false; };
  }, [id, navigate]);

  const downloadBrief = async () => {
    if (!c) return;
    try {
      const brief = await buildCaseBrief(c);
      downloadBriefFile(brief, c.id);
      toast({ title: "Case Brief скачан" });
    } catch (e) {
      toast({ title: "Не удалось подготовить Case Brief", description: String(e), variant: "destructive" });
    }
  };

  const copyBrief = async () => {
    if (!c) return;
    try {
      const brief = await buildCaseBrief(c);
      try {
        await navigator.clipboard.writeText(brief);
        toast({ title: "Case Brief скопирован" });
      } catch {
        setManualCopyText(brief);
        toast({ title: "Clipboard blocked", description: "Открыл ручное копирование." });
      }
    } catch (e) {
      toast({ title: "Не удалось подготовить Case Brief", description: String(e), variant: "destructive" });
    }
  };

  const isDirty = (): boolean => {
    if (!c) return false;
    return (
      (c.ai_draft ?? "") !== aiDraft ||
      (c.working_notes ?? "") !== workingNotes ||
      (c.final_output ?? "") !== finalOutput ||
      (c.service_status ?? "") !== serviceStatus
    );
  };

  const persist = async (): Promise<boolean> => {
    if (!c) return false;
    const { error } = await supabase
      .from("cases")
      .update({
        service_status: serviceStatus,
        ai_draft: aiDraft,
        working_notes: workingNotes,
        final_output: finalOutput,
        pdf_url: pdfUrl,
      })
      .eq("id", c.id);
    if (error) {
      toast({ title: "Не удалось сохранить", description: error.message, variant: "destructive" });
      return false;
    }
    setC({
      ...c,
      ai_draft: aiDraft,
      working_notes: workingNotes,
      final_output: finalOutput,
      service_status: serviceStatus,
      pdf_url: pdfUrl,
    });
    return true;
  };

  const save = async () => {
    if (!c) return;
    setSaving(true);
    const ok = await persist();
    setSaving(false);
    if (ok) toast({ title: "Сохранено" });
  };

  const ensureSaved = async (): Promise<boolean> => {
    if (!isDirty()) return true;
    return await persist();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/operator/login", { replace: true });
  };

  const generatePdf = async () => {
    if (!c) return;
    if (!finalOutput.trim()) {
      toast({
        title: "Final output is empty. Add client response before generating PDF.",
        variant: "destructive",
      });
      return;
    }
    setGenerating(true);
    if (isDirty()) {
      setPdfStatus("saving");
      const saved = await persist();
      if (!saved) {
        setGenerating(false);
        setPdfStatus("");
        toast({
          title: "Unable to save latest changes. PDF generation cancelled.",
          variant: "destructive",
        });
        return null;
      }
    }
    setPdfStatus("generating");
    const { data, error } = await supabase.functions.invoke("generate-case-pdf", {
      body: { case_id: c.id },
    });
    setGenerating(false);
    if (error) {
      setPdfStatus("");
      toast({ title: "Не удалось сгенерировать PDF", description: error.message, variant: "destructive" });
      return null;
    }
    const url = (data as { pdf_url?: string })?.pdf_url;
    if (url) {
      setPdfUrl(url);
      setPdfSnapshot(finalOutput);
      setC((prev) => (prev ? { ...prev, pdf_url: url } : prev));
      setPdfStatus("done");
      setTimeout(() => setPdfStatus((s) => (s === "done" ? "" : s)), 1800);
      toast({ title: "PDF сгенерирован" });
      return url;
    }
    setPdfStatus("");
    return null;
  };

  const generateAiDraft = async () => {
    if (!c) return;
    setGeneratingDraft(true);
    const { data, error } = await supabase.functions.invoke("generate-case-ai-draft", {
      body: { case_id: c.id },
    });
    setGeneratingDraft(false);
    if (error) {
      toast({ title: "Не удалось сгенерировать черновик", description: error.message, variant: "destructive" });
      return;
    }
    const draft = (data as { ai_draft?: string; service_status?: string })?.ai_draft;
    if (draft) {
      setAiDraft(draft);
      setServiceStatus("drafting");
      setC({ ...c, ai_draft: draft, service_status: "drafting" });
      toast({ title: "AI черновик готов" });
    }
  };

  const sendToClient = async () => {
    if (!c) return;
    if (sending) return;

    if (!finalOutput.trim()) {
      toast({
        title: "Final output is empty. Add client response before sending.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    setSendStatus("saving");

    // Ensure latest editor content is persisted before any send/regen.
    if (isDirty()) {
      const saved = await ensureSaved();
      if (!saved) {
        setSending(false);
        setSendStatus("");
        toast({
          title: "Unable to save latest changes. Send cancelled.",
          variant: "destructive",
        });
        return;
      }
    }

    // Regenerate PDF if missing, outdated relative to final_output, or on resend.
    let effectivePdfUrl = pdfUrl;
    const pdfOutdated =
      !effectivePdfUrl || pdfSnapshot !== finalOutput || deliverySent;
    if (pdfOutdated) {
      setSendStatus("generating");
      const { data: regen, error: regenErr } = await supabase.functions.invoke("generate-case-pdf", {
        body: { case_id: c.id },
      });
      if (regenErr) {
        setSending(false);
        setSendStatus("");
        toast({
          title: "Не удалось сгенерировать PDF. Отправка отменена.",
          description: regenErr.message,
          variant: "destructive",
        });
        return;
      }
      const fresh = (regen as { pdf_url?: string })?.pdf_url;
      if (fresh) {
        effectivePdfUrl = fresh;
        setPdfUrl(fresh);
        setPdfSnapshot(finalOutput);
        setC((prev) => (prev ? { ...prev, pdf_url: fresh } : prev));
      } else {
        setSending(false);
        setSendStatus("");
        toast({
          title: "Не удалось сгенерировать PDF. Отправка отменена.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!effectivePdfUrl) {
      setSending(false);
      setSendStatus("");
      toast({
        title: "PDF недоступен. Отправка отменена.",
        variant: "destructive",
      });
      return;
    }

    setSendStatus("sending");

    // Unique idempotency key per send attempt — first send uses a stable key,
    // every resend appends a timestamp so the email queue does not dedupe it.
    const idempotencyKey = deliverySent
      ? `case-delivery-${c.id}-resend-${Date.now()}`
      : `case-delivery-${c.id}`;

    const { error: sendError } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "case-delivery",
        recipientEmail: c.email,
        idempotencyKey,
        templateData: {
          pdf_url: effectivePdfUrl,
          language: c.language ?? "en",
        },
      },
    });
    if (sendError) {
      setSending(false);
      setSendStatus("");
      toast({ title: "Не удалось отправить", description: sendError.message, variant: "destructive" });
      return;
    }
    const wasResend = deliverySent;
    const { error: updError } = await supabase
      .from("cases")
      .update({
        service_status: "delivered",
        delivery_email_sent: true,
      } as never)
      .eq("id", c.id);
    setSending(false);
    if (updError) {
      setSendStatus("");
      toast({ title: "Письмо отправлено, но не удалось обновить кейс", description: updError.message, variant: "destructive" });
      return;
    }
    setDeliverySent(true);
    setServiceStatus("delivered");
    setSendStatus("done");
    setTimeout(() => setSendStatus((s) => (s === "done" ? "" : s)), 1800);
    toast({ title: wasResend ? "Повторно отправлено клиенту" : "Отправлено клиенту" });
  };

  if (authorized === false) {
    return (
      <main className="operator-workspace min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <p className="text-foreground">Доступ только для администраторов.</p>
          <Button variant="outline" onClick={signOut}>Выйти</Button>
        </div>
      </main>
    );
  }

  if (!c) {
    return (
<main className="operator-workspace min-h-screen bg-background px-6 py-8">
        <p className="text-muted-foreground">Загрузка…</p>
      </main>
    );
  }

  const attachments = extractCaseAttachmentPaths(c);

  return (
    <main className="operator-workspace min-h-screen bg-background px-6 py-6">
      <ManualCopyDialog text={manualCopyText} onClose={() => setManualCopyText("")} />
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Account / utility row */}
        <div className="flex items-center justify-between text-[11px]">
          <Link
            to="/operator/cases"
            className="text-muted-foreground/80 hover:text-foreground transition-colors"
          >
            ← Cases
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1 text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            <LogOut className="h-2.5 w-2.5" />
            Sign out
          </button>
        </div>

        {/* Workflow top bar */}
        <header className="flex items-end flex-wrap gap-x-6 gap-y-3 border-b border-border/60 pb-3">
          <BarGroup label="Case">
            <ToolButton onClick={downloadBrief}>Download Brief</ToolButton>
            <ToolButton onClick={copyBrief}>Copy Brief</ToolButton>
          </BarGroup>

          <BarGroup label="Work">
            <ToolButton onClick={generateAiDraft} disabled={generatingDraft}>
              {generatingDraft ? "…" : "Quick Draft"}
            </ToolButton>
          </BarGroup>

          <BarGroup label="Output">
            <ToolButton onClick={generatePdf} disabled={generating}>
              {generating ? "…" : "Generate PDF"}
            </ToolButton>
            {pdfStatus && (
              <span className="text-[11px] text-muted-foreground/70">
                {pdfStatus === "saving"
                  ? "Saving…"
                  : pdfStatus === "generating"
                  ? "Generating PDF…"
                  : "Done."}
              </span>
            )}
            {!deliverySent ? (
              <div className="flex items-center gap-2">
                <ToolButton
                  onClick={sendToClient}
                  disabled={sending || !finalOutput.trim()}
                  emphasis="primary"
                >
                  {sending ? "…" : "Send to Client"}
                </ToolButton>
                {sendStatus && (
                  <span className="text-[11px] text-muted-foreground/70">
                    {sendStatus === "saving"
                      ? "Saving…"
                      : sendStatus === "generating"
                      ? "Generating PDF…"
                      : sendStatus === "sending"
                      ? "Sending…"
                      : "Sent."}
                  </span>
                )}
                {!sendStatus && !finalOutput.trim() && (
                  <span className="text-[11px] text-muted-foreground/60">(final output empty)</span>
                )}
              </div>
            ) : null}
          </BarGroup>

          {deliverySent && (
            <BarGroup label="State">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground/70">
                <Check className="h-3 w-3 text-foreground/50" />
                Delivered
              </span>
              <ToolButton onClick={sendToClient} disabled={sending || !finalOutput.trim()}>
                {sending ? "…" : "Resend"}
              </ToolButton>
              {sendStatus && (
                <span className="text-[11px] text-muted-foreground/70">
                  {sendStatus === "saving"
                    ? "Saving…"
                    : sendStatus === "generating"
                    ? "Generating PDF…"
                    : sendStatus === "sending"
                    ? "Sending…"
                    : "Sent."}
                </span>
              )}
            </BarGroup>
          )}

          <div className="flex-1" />

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="text-[11px] font-medium text-foreground/70 hover:text-foreground transition-colors disabled:opacity-40 pb-[2px]"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </header>

        {/* Two-column workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* LEFT — context */}
          <aside className="space-y-7 text-xs">
            <section className="space-y-2">
              <SectionLabel>Case info</SectionLabel>
              <MetaRow label="ID" value={<span className="font-mono">{c.id.slice(0, 8)}</span>} />
              <MetaRow
                label="Source"
                value={
                  c.submission_id ? (
                    <Link
                      to={`/operator/submissions/${c.submission_id}`}
                      className="font-mono underline-offset-2 hover:underline"
                    >
                      SUB-{c.submission_id.slice(0, 8)}
                    </Link>
                  ) : (
                    <span className="italic text-muted-foreground">—</span>
                  )
                }
              />
              <MetaRow label="Client" value={c.client_name || "—"} />
              <MetaRow label="Email" value={<span className="break-all">{c.email}</span>} />
              <MetaRow label="Language" value={c.language ?? "—"} />
              <MetaRow
                label="Created"
                value={c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
              />
            </section>

            <section className="space-y-2">
              <SectionLabel>Workflow status</SectionLabel>
              <StatusChip value={serviceStatus} onChange={setServiceStatus} />
            </section>

            {c.raw_input && (
              <section className="space-y-2">
                <button
                  type="button"
                  onClick={() => setRequestOpen((v) => !v)}
                  className="flex items-center gap-1 w-full text-[10px] uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {requestOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  Client request
                </button>
                {requestOpen && (
                  <pre className="text-[11px] whitespace-pre-wrap border-l border-border/70 pl-3 py-1 max-h-80 overflow-auto leading-relaxed text-foreground/80">
                    {c.raw_input}
                  </pre>
                )}
              </section>
            )}

            {attachments.length > 0 && (
              <section className="space-y-2">
                <SectionLabel>Attachments ({attachments.length})</SectionLabel>
                <ul className="space-y-0.5">
                  {attachments.map((a) => {
                    const url = attachmentUrls[a.path];
                    return (
                      <li key={a.path}>
                        <a
                          href={url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            if (!url) {
                              e.preventDefault();
                              toast({ title: "Ссылка недоступна", variant: "destructive" });
                            }
                          }}
                          className="group flex items-center gap-1.5 py-0.5 text-[11px] text-foreground/75 hover:text-foreground transition-colors"
                          title={a.name}
                        >
                          <FileText className="h-3 w-3 shrink-0 text-muted-foreground/60 group-hover:text-foreground" />
                          <span className="truncate underline-offset-2 group-hover:underline">{a.name}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <section className="space-y-2">
              <SectionLabel>PDF</SectionLabel>
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={async () => {
                    let url = pdfUrl;
                    if (!url) {
                      const fresh = await generatePdf();
                      url = fresh ?? "";
                    }
                    if (url) window.open(url, "_blank", "noopener,noreferrer");
                  }}
                  disabled={!pdfUrl && generating}
                  className="inline-flex items-center gap-1.5 text-[11px] text-foreground/75 hover:text-foreground transition-colors disabled:opacity-40 text-left py-0.5"
                >
                  <ExternalLink className="h-3 w-3 text-muted-foreground/60" />
                  {pdfUrl ? "Open latest PDF" : "No PDF yet"}
                </button>
                <button
                  type="button"
                  onClick={generatePdf}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/80 hover:text-foreground transition-colors disabled:opacity-40 text-left py-0.5"
                >
                  {generating ? "Regenerating…" : "Regenerate PDF"}
                </button>
              </div>
            </section>
          </aside>

          {/* RIGHT — work area */}
          <section className="space-y-8 min-w-0">
            <WorkBlock
              label="Final output"
              hint="Client-ready response · paste or refine here"
              action={
                <button
                  type="button"
                  onClick={async () => {
                    if (!finalOutput) return;
                    try {
                      await navigator.clipboard.writeText(finalOutput);
                      toast({ title: "Final output скопирован" });
                    } catch (e) {
                      toast({ title: "Не удалось скопировать", description: String(e), variant: "destructive" });
                    }
                  }}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                  disabled={!finalOutput}
                >
                  Copy
                </button>
              }
            >
              <Textarea
                rows={16}
                value={finalOutput}
                onChange={(e) => setFinalOutput(e.target.value)}
                className="text-sm leading-relaxed bg-transparent border-0 border-t border-border/60 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-y px-0 py-2 shadow-none"
                placeholder="Paste or refine the final response…"
              />
            </WorkBlock>

            <WorkBlock
              label="Working notes"
              action={
                <button
                  type="button"
                  onClick={async () => {
                    if (!workingNotes) return;
                    try {
                      await navigator.clipboard.writeText(workingNotes);
                      toast({ title: "Notes скопированы" });
                    } catch (e) {
                      toast({ title: "Не удалось скопировать", description: String(e), variant: "destructive" });
                    }
                  }}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                  disabled={!workingNotes}
                >
                  Copy
                </button>
              }
            >
              <Textarea
                rows={10}
                value={workingNotes}
                onChange={(e) => setWorkingNotes(e.target.value)}
                className="text-sm leading-relaxed bg-transparent border-0 border-t border-border/60 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-y px-0 py-2 shadow-none"
              />
            </WorkBlock>

            <WorkBlock
              label={
                <button
                  type="button"
                  onClick={() => setAiDraftOpen((v) => !v)}
                  className="flex items-center gap-1"
                >
                  AI draft
                  {aiDraftOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              }
              action={
                aiDraftOpen ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!aiDraft) {
                        toast({ title: "Черновик пуст", variant: "destructive" });
                        return;
                      }
                      try {
                        await navigator.clipboard.writeText(aiDraft);
                        toast({ title: "AI Draft скопирован" });
                      } catch (e) {
                        toast({ title: "Не удалось скопировать", description: String(e), variant: "destructive" });
                      }
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                    disabled={!aiDraft}
                  >
                    Copy
                  </button>
                ) : null
              }
            >
              {aiDraftOpen && (
                <Textarea
                  rows={6}
                  value={aiDraft}
                  onChange={(e) => setAiDraft(e.target.value)}
                  className="text-sm font-mono leading-relaxed bg-transparent border-0 border-t border-border/60 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-y px-0 py-2 shadow-none"
                />
              )}
            </WorkBlock>
          </section>
        </div>
      </div>
    </main>
  );
}

/* ---------- Local presentational helpers ---------- */

function BarGroup({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-[9px] uppercase tracking-[0.14em] font-semibold text-muted-foreground/70">
          {label}
        </span>
      )}
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  disabled,
  emphasis = "ghost",
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  emphasis?: "ghost" | "primary";
  title?: string;
}) {
  const base =
    "text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed leading-none py-[3px]";
  const styles =
    emphasis === "primary"
      ? "text-foreground underline underline-offset-[5px] decoration-foreground/40 hover:decoration-foreground"
      : "text-foreground/75 hover:text-foreground";
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{children}</div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-[11px] leading-relaxed">
      <span className="w-16 shrink-0 text-muted-foreground/80">{label}</span>
      <span className="min-w-0 flex-1 text-foreground font-medium">{value}</span>
    </div>
  );
}

function WorkBlock({
  label,
  hint,
  action,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-[0.14em] text-foreground/80 font-semibold">
            {label}
          </span>
          {hint && <span className="text-[10px] text-muted-foreground/80">{hint}</span>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatusChip({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const current = SERVICE_STATUSES.find((s) => s.value === value) ?? SERVICE_STATUSES[0];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground/85 hover:text-foreground transition-colors"
        >
          {current.label}
          <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-44 p-1 rounded-none border-border shadow-none"
      >
        <div className="flex flex-col">
          {SERVICE_STATUSES.map((s) => {
            const active = s.value === current.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => onChange(s.value)}
                className={`text-left text-[11px] px-2 py-1.5 transition-colors ${
                  active ? "text-foreground bg-muted/60" : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
