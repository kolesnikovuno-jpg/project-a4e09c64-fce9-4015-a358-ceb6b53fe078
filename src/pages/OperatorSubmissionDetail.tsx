import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

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
      <main className="operator-workspace min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <p className="text-foreground">Доступ только для администраторов.</p>
          <Button variant="outline" onClick={signOut}>Выйти</Button>
        </div>
      </main>
    );
  }

  if (!s) {
    return (
      <main className="operator-workspace min-h-screen bg-background px-6 py-8">
        <p className="text-muted-foreground">Загрузка…</p>
      </main>
    );
  }

  return (
    <main className="operator-workspace min-h-screen bg-background px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <Link to="/operator/submissions" className="text-sm text-muted-foreground hover:text-foreground">← Submissions</Link>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={generateAssessment} disabled={generating}>
              {generating ? "Генерация…" : "Generate Assessment"}
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? "Сохранение…" : "Save"}</Button>
            <Button size="sm" variant="ghost" onClick={signOut}>Sign out</Button>
          </div>
        </header>

        <section className="border border-border p-4 bg-card space-y-2 text-sm">
          <div><span className="text-muted-foreground">Submission ID:</span> <span className="font-mono">{s.id}</span></div>
          <div><span className="text-muted-foreground">Name:</span> {s.name || "—"}</div>
          <div><span className="text-muted-foreground">Email:</span> {s.email}</div>
          <div><span className="text-muted-foreground">Language:</span> {s.language ?? "—"}</div>
          <div><span className="text-muted-foreground">Status:</span> {s.status}</div>
          <div><span className="text-muted-foreground">Created:</span> {s.created_at ? new Date(s.created_at).toLocaleString() : "—"}</div>

          <div>
            <div className="text-muted-foreground mt-3 mb-1">Situation:</div>
            <pre className="text-xs whitespace-pre-wrap bg-muted/30 p-3 max-h-72 overflow-auto">{s.situation ?? ""}</pre>
          </div>
          <div>
            <div className="text-muted-foreground mt-3 mb-1">Uncertainty:</div>
            <pre className="text-xs whitespace-pre-wrap bg-muted/30 p-3 max-h-72 overflow-auto">{s.uncertainty ?? ""}</pre>
          </div>
          <div>
            <div className="text-muted-foreground mt-3 mb-1">Scope:</div>
            <pre className="text-xs whitespace-pre-wrap bg-muted/30 p-3 max-h-72 overflow-auto">{s.scope ?? ""}</pre>
          </div>
          {s.supporting_links && (
            <div>
              <div className="text-muted-foreground mt-3 mb-1">Supporting links:</div>
              <pre className="text-xs whitespace-pre-wrap bg-muted/30 p-3 max-h-72 overflow-auto">{s.supporting_links}</pre>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={STATUS_VALUES.includes(status) ? status : "new"}
              onValueChange={setStatus}
            >
              <SelectTrigger id="status" className="rounded-none">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {STATUSES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="assessment_notes">Assessment notes</Label>
              <Button
                size="sm"
                variant="outline"
                disabled={!assessmentNotes}
                onClick={async () => {
                  if (!assessmentNotes) return;
                  try {
                    await navigator.clipboard.writeText(assessmentNotes);
                    toast({ title: "Скопировано" });
                  } catch {
                    toast({ title: "Не удалось скопировать", variant: "destructive" });
                  }
                }}
              >
                Copy Assessment
              </Button>
            </div>
            <Textarea
              id="assessment_notes"
              rows={14}
              value={assessmentNotes}
              onChange={(e) => setAssessmentNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>{saving ? "Сохранение…" : "Save"}</Button>
          </div>
        </section>
      </div>
    </main>
  );
}