import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { buildCaseBrief, downloadBriefFile, extractCaseAttachmentPaths } from "@/lib/caseBrief";
import { ManualCopyDialog } from "@/components/operator/ManualCopyDialog";
import { ChevronDown, ChevronRight, FileText, ExternalLink, LogOut } from "lucide-react";

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
const SERVICE_STATUS_VALUES = SERVICE_STATUSES.map((s) => s.value) as readonly string[];

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
  const [deliverySent, setDeliverySent] = useState(false);
  const [manualCopyText, setManualCopyText] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
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

  const save = async () => {
    if (!c) return;
    setSaving(true);
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
    setSaving(false);
    if (error) {
      toast({ title: "Не удалось сохранить", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Сохранено" });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/operator/login", { replace: true });
  };

  const generatePdf = async () => {
    if (!c) return;
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-case-pdf", {
      body: { case_id: c.id },
    });
    setGenerating(false);
    if (error) {
      toast({ title: "Не удалось сгенерировать PDF", description: error.message, variant: "destructive" });
      return;
    }
    const url = (data as { pdf_url?: string })?.pdf_url;
    if (url) {
      setPdfUrl(url);
      setC({ ...c, pdf_url: url });
      toast({ title: "PDF сгенерирован" });
      return url;
    }
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
    if (!pdfUrl && !deliverySent) {
      toast({ title: "Нет PDF", description: "Сначала сгенерируйте PDF.", variant: "destructive" });
      return;
    }
    setSending(true);

    // On resend, regenerate the PDF so the signed URL is fresh.
    let effectivePdfUrl = pdfUrl;
    if (deliverySent) {
      const { data: regen, error: regenErr } = await supabase.functions.invoke("generate-case-pdf", {
        body: { case_id: c.id },
      });
      if (regenErr) {
        setSending(false);
        toast({ title: "Не удалось обновить PDF", description: regenErr.message, variant: "destructive" });
        return;
      }
      const fresh = (regen as { pdf_url?: string })?.pdf_url;
      if (fresh) {
        effectivePdfUrl = fresh;
        setPdfUrl(fresh);
        setC({ ...c, pdf_url: fresh });
      }
    }

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
      toast({ title: "Письмо отправлено, но не удалось обновить кейс", description: updError.message, variant: "destructive" });
      return;
    }
    setDeliverySent(true);
    setServiceStatus("delivered");
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
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Account / utility row */}
        <div className="flex items-center justify-between text-xs">
          <Link
            to="/operator/cases"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Cases
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-3 w-3" />
            Sign out
          </button>
        </div>

        {/* Workflow top bar */}
        <header className="flex items-center flex-wrap gap-x-3 gap-y-2 rounded-md border border-border bg-card px-3 py-2 shadow-sm">
          <BarGroup>
            <ToolButton onClick={downloadBrief}>Download Brief</ToolButton>
            <ToolButton onClick={copyBrief}>Copy Brief</ToolButton>
          </BarGroup>

          <BarDivider />

          <BarGroup>
            <ToolButton onClick={generateAiDraft} disabled={generatingDraft}>
              {generatingDraft ? "…" : "Quick Draft"}
            </ToolButton>
            <ToolButton onClick={generatePdf} disabled={generating} emphasis="primary">
              {generating ? "…" : "Generate PDF"}
            </ToolButton>
          </BarGroup>

          <BarDivider />

          <BarGroup>
            {!deliverySent ? (
              <ToolButton
                onClick={sendToClient}
                disabled={sending || !pdfUrl}
                emphasis="primary"
                title={!pdfUrl ? "Нужен PDF" : ""}
              >
                {sending ? "Отправка…" : "Send to Client"}
              </ToolButton>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[11px] font-medium">
                  Delivered ✓
                </span>
                <ToolButton onClick={sendToClient} disabled={sending}>
                  {sending ? "Отправка…" : "Resend"}
                </ToolButton>
              </div>
            )}
          </BarGroup>

          <div className="flex-1" />

          <ToolButton onClick={save} disabled={saving} emphasis="primary">
            {saving ? "…" : "Save"}
          </ToolButton>
        </header>

        {/* Two-column workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* LEFT — context */}
          <aside className="space-y-6 text-xs">
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
              <Select
                value={SERVICE_STATUS_VALUES.includes(serviceStatus) ? serviceStatus : "queued"}
                onValueChange={setServiceStatus}
              >
                <SelectTrigger className="h-8 text-xs rounded-md bg-muted/40 border-border hover:bg-muted/70 transition-colors font-medium [&>span]:flex [&>span]:items-center [&>span]:gap-1.5 [&>span]:before:content-[''] [&>span]:before:h-1.5 [&>span]:before:w-1.5 [&>span]:before:rounded-full [&>span]:before:bg-foreground/60">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <pre className="text-[11px] whitespace-pre-wrap bg-muted/60 border border-border p-2.5 rounded-md max-h-80 overflow-auto leading-relaxed text-foreground/90">
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
                          className="group flex items-center gap-1.5 rounded-sm px-1.5 py-1 -mx-1.5 text-[11px] text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-colors"
                          title={a.name}
                        >
                          <FileText className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-foreground" />
                          <span className="truncate">{a.name}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <section className="space-y-2">
              <SectionLabel>PDF</SectionLabel>
              <div className="flex flex-col gap-1">
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
                  className="inline-flex items-center gap-1.5 text-[11px] text-foreground/80 hover:text-foreground hover:bg-muted/60 rounded-sm px-1.5 py-1 -mx-1.5 transition-colors disabled:opacity-40 text-left"
                >
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  {pdfUrl ? "Open latest PDF" : "No PDF yet"}
                </button>
                <button
                  type="button"
                  onClick={generatePdf}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-sm px-1.5 py-1 -mx-1.5 transition-colors disabled:opacity-40 text-left"
                >
                  {generating ? "Regenerating…" : "Regenerate PDF"}
                </button>
              </div>
            </section>
          </aside>

          {/* RIGHT — work area */}
          <section className="space-y-4 min-w-0">
            <WorkBlock
              label="AI draft"
              action={
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
              }
            >
              <Textarea
                rows={10}
                value={aiDraft}
                onChange={(e) => setAiDraft(e.target.value)}
                className="text-sm font-mono leading-relaxed bg-muted/30 border-border focus-visible:bg-background resize-y rounded-t-none border-t-0"
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
                rows={6}
                value={workingNotes}
                onChange={(e) => setWorkingNotes(e.target.value)}
                className="text-sm leading-relaxed bg-muted/30 border-border focus-visible:bg-background resize-y rounded-t-none border-t-0"
              />
            </WorkBlock>

            <WorkBlock
              label="Final output"
              hint="Paste final client-ready response here"
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
                rows={12}
                value={finalOutput}
                onChange={(e) => setFinalOutput(e.target.value)}
                className="text-sm leading-relaxed bg-muted/30 border-border focus-visible:bg-background resize-y rounded-t-none border-t-0"
              />
            </WorkBlock>
          </section>
        </div>
      </div>
    </main>
  );
}

/* ---------- Local presentational helpers ---------- */

function BarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1">{children}</div>;
}

function BarDivider() {
  return <div className="h-5 w-px bg-border/80" />;
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
    "h-7 px-2.5 text-xs font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const styles =
    emphasis === "primary"
      ? "text-foreground bg-foreground/[0.06] hover:bg-foreground/10 border border-border/60"
      : "text-foreground/70 hover:text-foreground hover:bg-muted";
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
  label: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/40">
        <div className="flex items-baseline gap-2">
          <Label className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold">
            {label}
          </Label>
          {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
        </div>
        {action}
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}
