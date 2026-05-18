import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Case = Tables<"cases">;

const buildAiBrief = (c: Case) => `CASE ID: ${c.id}

Client:
Name: ${c.client_name || "Not provided"}
Email: ${c.email ?? ""}
Language: ${c.language ?? ""}

Client Input:
${c.raw_input ?? ""}

Task:
Use this case as an expert structural diagnostic draft.

Goal:
Generate an internal working draft for expert review, not final client output.

Required output:

1. Explicit client problem
What the client directly describes.

2. Hidden structural tension
What underlying contradiction, mismatch, uncertainty, or pattern may be driving the issue.

3. Structural diagnosis
Interpret the architecture of the situation.

4. Possible correction vectors
Suggest meaningful structural shifts, reframing directions, or interventions.

5. Draft expert response
Create a preliminary expert working response that can later be refined.

Important:
This is an internal production draft, not final client-facing output.`;

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
      }
    })();
    return () => { active = false; };
  }, [id, navigate]);

  const copyBrief = async () => {
    if (!c) return;
    try {
      await navigator.clipboard.writeText(buildAiBrief(c));
      toast({ title: "AI Brief скопирован" });
    } catch (e) {
      toast({ title: "Не удалось скопировать", description: String(e), variant: "destructive" });
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

  if (authorized === false) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <p className="text-foreground">Доступ только для администраторов.</p>
          <Button variant="outline" onClick={signOut}>Выйти</Button>
        </div>
      </main>
    );
  }

  if (!c) {
    return (
      <main className="min-h-screen bg-background px-6 py-8">
        <p className="text-muted-foreground">Загрузка…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <Link to="/operator/cases" className="text-sm text-muted-foreground hover:text-foreground">← Cases</Link>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={copyBrief}>Copy AI Brief</Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? "Сохранение…" : "Save"}</Button>
            <Button size="sm" variant="ghost" onClick={signOut}>Sign out</Button>
          </div>
        </header>

        <section className="border border-border rounded-lg p-4 bg-card space-y-2 text-sm">
          <div><span className="text-muted-foreground">Case ID:</span> <span className="font-mono">{c.id}</span></div>
          <div><span className="text-muted-foreground">Submission:</span> <span className="font-mono">{c.submission_id}</span></div>
          <div><span className="text-muted-foreground">Client:</span> {c.client_name || "—"}</div>
          <div><span className="text-muted-foreground">Email:</span> {c.email}</div>
          <div><span className="text-muted-foreground">Language:</span> {c.language ?? "—"}</div>
          <div><span className="text-muted-foreground">Created:</span> {c.created_at ? new Date(c.created_at).toLocaleString() : "—"}</div>
          {c.raw_input && (
            <div>
              <div className="text-muted-foreground mt-2 mb-1">Raw input:</div>
              <pre className="text-xs whitespace-pre-wrap bg-muted/30 p-3 rounded max-h-72 overflow-auto">{c.raw_input}</pre>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service_status">Service status</Label>
            <Input id="service_status" value={serviceStatus} onChange={(e) => setServiceStatus(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai_draft">AI draft</Label>
            <Textarea id="ai_draft" rows={10} value={aiDraft} onChange={(e) => setAiDraft(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="working_notes">Working notes</Label>
            <Textarea id="working_notes" rows={6} value={workingNotes} onChange={(e) => setWorkingNotes(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="final_output">Final output</Label>
            <Textarea id="final_output" rows={10} value={finalOutput} onChange={(e) => setFinalOutput(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pdf_url">PDF URL</Label>
            <Input id="pdf_url" value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>{saving ? "Сохранение…" : "Save"}</Button>
          </div>
        </section>
      </div>
    </main>
  );
}
