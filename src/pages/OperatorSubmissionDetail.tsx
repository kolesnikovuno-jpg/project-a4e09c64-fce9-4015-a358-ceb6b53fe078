import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { FileText } from "lucide-react";
import {
  OperatorShell,
  UtilityRow,
  ActionBar,
  BarGroup,
  ToolButton,
  ToolLink,
  SectionLabel,
  MetaRow,
  WorkBlock,
  CompactSelect,
} from "@/components/operator/ui";

type Submission = Tables<"submissions"> & { assessment_notes?: string | null };

const STATUSES = [
  { value: "new", label: "New" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "paid", label: "Paid" },
] as const;
const STATUS_VALUES = STATUSES.map((s) => s.value) as readonly string[];

export default function OperatorSubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [s, setS] = useState<Submission | null>(null);
  const [status, setStatus] = useState("");
  const [assessmentNotes, setAssessmentNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [linkedCaseId, setLinkedCaseId] = useState<string | null>(null);
  const [signedLinks, setSignedLinks] = useState<Record<string, string>>({});

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
        .from("submissions")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) {
        toast({ title: "Не удалось загрузить заявку", description: error.message, variant: "destructive" });
        return;
      }
      if (active && data) {
        const row = data as Submission;
        setS(row);
        setStatus(row.status ?? "new");
        setAssessmentNotes(row.assessment_notes ?? "");
        const { data: caseRow } = await supabase
          .from("cases")
          .select("id")
          .eq("submission_id", row.id)
          .maybeSingle();
        if (active && caseRow) setLinkedCaseId(caseRow.id);

        const links = (row.supporting_links ?? "")
          .split("\n")
          .map((l) => l.match(/(intake\/[^\s]+)$/)?.[1])
          .filter((p): p is string => !!p);
        if (links.length) {
          const { data: signed } = await supabase.storage
            .from("clarity-attachments")
            .createSignedUrls(links, 3600);
          if (active && signed) {
            const map: Record<string, string> = {};
            signed.forEach((s) => { if (s.path && s.signedUrl) map[s.path] = s.signedUrl; });
            setSignedLinks(map);
          }
        }
      }
    })();
    return () => { active = false; };
  }, [id, navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/operator/login", { replace: true });
  };

  const save = async () => {
    if (!s) return;
    setSaving(true);
    const { error } = await supabase
      .from("submissions")
      .update({ status, assessment_notes: assessmentNotes } as never)
      .eq("id", s.id);
    setSaving(false);
    if (error) {
      toast({ title: "Не удалось сохранить", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Сохранено" });
  };

  const generateAssessment = async () => {
    if (!s) return;
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-submission-assessment", {
      body: { submission_id: s.id },
    });
    setGenerating(false);
    if (error) {
      toast({ title: "Не удалось сгенерировать", description: error.message, variant: "destructive" });
      return;
    }
    const notes = (data as { assessment_notes?: string })?.assessment_notes;
    if (notes) {
      setAssessmentNotes(notes);
      toast({ title: "Оценка готова" });
    }
  };

  if (authorized === false) {
    return (
      <main className="operator-workspace min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center space-y-4">
          <p className="text-foreground text-sm">Доступ только для администраторов.</p>
          <ToolButton onClick={signOut}>Sign out</ToolButton>
        </div>
      </main>
    );
  }

  if (!s) {
    return (
      <OperatorShell>
        <p className="text-muted-foreground text-sm">Загрузка…</p>
      </OperatorShell>
    );
  }

  return (
    <OperatorShell>
      <UtilityRow back={{ to: "/operator/submissions", label: "Submissions" }} onSignOut={signOut} />

      <ActionBar>
        <BarGroup label="Review">
          <ToolButton onClick={generateAssessment} disabled={generating} emphasis="primary">
            {generating ? "…" : "Generate Assessment"}
          </ToolButton>
        </BarGroup>
        {linkedCaseId && (
          <BarGroup label="Case">
            <ToolLink to={`/operator/cases/${linkedCaseId}`}>Open Case</ToolLink>
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
      </ActionBar>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* LEFT — context */}
        <aside className="space-y-7 text-xs">
          <section className="space-y-2">
            <SectionLabel>Submission</SectionLabel>
            <MetaRow label="ID" value={<span className="font-mono">{s.id.slice(0, 8)}</span>} />
            <MetaRow label="Name" value={s.name || "—"} />
            <MetaRow label="Email" value={<span className="break-all">{s.email}</span>} />
            <MetaRow label="Language" value={s.language ?? "—"} />
            <MetaRow
              label="Created"
              value={s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
            />
            {linkedCaseId && (
              <MetaRow
                label="Case"
                value={
                  <ToolLink to={`/operator/cases/${linkedCaseId}`}>
                    CASE-{linkedCaseId.slice(0, 8)}
                  </ToolLink>
                }
              />
            )}
          </section>

          <section className="space-y-2">
            <SectionLabel>Status</SectionLabel>
            <CompactSelect
              value={STATUS_VALUES.includes(status) ? status : "new"}
              onChange={setStatus}
              options={STATUSES as unknown as { value: string; label: string }[]}
            />
          </section>

          {s.supporting_links && (
            <section className="space-y-2">
              <SectionLabel>Attachments</SectionLabel>
              <ul className="space-y-0.5">
                {s.supporting_links.split("\n").map((line, i) => {
                  const m = line.match(/(intake\/[^\s]+)$/);
                  if (m) {
                    const path = m[1];
                    const label = line.replace(/\s*—\s*intake\/.*$/, "").trim() || path;
                    const href = signedLinks[path];
                    return (
                      <li key={i}>
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-1.5 py-0.5 text-[11px] text-foreground/75 hover:text-foreground transition-colors"
                            title={label}
                          >
                            <FileText className="h-3 w-3 shrink-0 text-muted-foreground/60 group-hover:text-foreground" />
                            <span className="truncate underline-offset-2 group-hover:underline">{label}</span>
                          </a>
                        ) : (
                          <span className="flex items-center gap-1.5 py-0.5 text-[11px] text-muted-foreground/70">
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="truncate">{label} …</span>
                          </span>
                        )}
                      </li>
                    );
                  }
                  return (
                    <li key={i} className="text-[11px] text-muted-foreground whitespace-pre-wrap">
                      {line}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </aside>

        {/* RIGHT — request content + assessment */}
        <section className="space-y-8 min-w-0">
          <WorkBlock label="Situation">
            <pre className="text-sm leading-relaxed border-t border-border/60 pt-2 whitespace-pre-wrap text-foreground/90">
              {s.situation ?? "—"}
            </pre>
          </WorkBlock>

          <WorkBlock label="Uncertainty">
            <pre className="text-sm leading-relaxed border-t border-border/60 pt-2 whitespace-pre-wrap text-foreground/90">
              {s.uncertainty ?? "—"}
            </pre>
          </WorkBlock>

          <WorkBlock label="Scope">
            <pre className="text-sm leading-relaxed border-t border-border/60 pt-2 whitespace-pre-wrap text-foreground/90">
              {s.scope ?? "—"}
            </pre>
          </WorkBlock>

          <WorkBlock
            label="Assessment notes"
            hint="Operator working notes for this submission"
            action={
              <button
                type="button"
                onClick={async () => {
                  if (!assessmentNotes) return;
                  try {
                    await navigator.clipboard.writeText(assessmentNotes);
                    toast({ title: "Скопировано" });
                  } catch {
                    toast({ title: "Не удалось скопировать", variant: "destructive" });
                  }
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                disabled={!assessmentNotes}
              >
                Copy
              </button>
            }
          >
            <Textarea
              id="assessment_notes"
              rows={14}
              value={assessmentNotes}
              onChange={(e) => setAssessmentNotes(e.target.value)}
              className="text-sm leading-relaxed bg-transparent border-0 border-t border-border/60 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-y px-0 py-2 shadow-none"
            />
          </WorkBlock>
        </section>
      </div>
    </OperatorShell>
  );
}