import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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

export default function OperatorCases() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<Case[] | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

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
        .order("created_at", { ascending: false });
      if (error) {
        toast({ title: "Не удалось загрузить кейсы", description: error.message, variant: "destructive" });
        return;
      }
      if (active) setCases(data ?? []);
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  const copyBrief = async (c: Case) => {
    try {
      await navigator.clipboard.writeText(buildAiBrief(c));
      toast({ title: "AI Brief скопирован" });
    } catch (e) {
      toast({ title: "Не удалось скопировать", description: String(e), variant: "destructive" });
    }
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

  return (
    <main className="operator-workspace min-h-screen bg-background px-6 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-medium">Cases</h1>
          <Button variant="ghost" onClick={signOut}>Sign out</Button>
        </header>

        {cases === null ? (
          <p className="text-muted-foreground">Загрузка…</p>
        ) : cases.length === 0 ? (
          <p className="text-muted-foreground">Пока нет кейсов.</p>
        ) : (
          <ul className="space-y-4">
            {cases.map((c) => (
              <li key={c.id} className="border border-border rounded-lg p-4 bg-card space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.client_name ?? "—"} · {c.email}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {c.id} · {c.language ?? "—"} · {c.service_status ?? "—"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/operator/cases/${c.id}`}>Open case</Link>
                    </Button>
                    <Button size="sm" onClick={() => copyBrief(c)}>Copy AI Brief</Button>
                  </div>
                </div>
                {c.raw_input && (
                  <pre className="text-xs whitespace-pre-wrap text-muted-foreground max-h-40 overflow-auto">
                    {c.raw_input}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}