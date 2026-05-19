import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { buildCaseBrief, downloadBriefFile } from "@/lib/caseBrief";
import { ManualCopyDialog } from "@/components/operator/ManualCopyDialog";

type Case = Tables<"cases">;

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  drafting: "Drafting",
  review: "Review",
  finalized: "Finalized",
  delivered: "Delivered",
  revision: "Revision",
  closed: "Closed",
};

const statusVariant = (s?: string | null): "default" | "secondary" | "outline" => {
  if (s === "delivered" || s === "finalized") return "default";
  if (s === "queued") return "outline";
  return "secondary";
};

export default function OperatorCases() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<Case[] | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [manualCopyText, setManualCopyText] = useState("");

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

  const downloadBrief = async (c: Case) => {
    try {
      const brief = await buildCaseBrief(c);
      downloadBriefFile(brief, c.id);
      toast({ title: "Case Brief скачан" });
    } catch (e) {
      toast({ title: "Не удалось подготовить Case Brief", description: String(e), variant: "destructive" });
    }
  };

  const copyBrief = async (c: Case) => {
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
      <ManualCopyDialog text={manualCopyText} onClose={() => setManualCopyText("")} />
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-medium">Cases</h1>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/operator/submissions">Submissions</Link>
            </Button>
            <Button variant="ghost" onClick={signOut}>Sign out</Button>
          </div>
        </header>

        {cases === null ? (
          <p className="text-muted-foreground">Загрузка…</p>
        ) : cases.length === 0 ? (
          <p className="text-muted-foreground">Пока нет кейсов.</p>
        ) : (
          <ul className="space-y-2">
            {cases.map((c) => (
              <li key={c.id} className="border border-border rounded-md px-3 py-2 bg-card space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {c.client_name ?? "—"} <span className="text-muted-foreground font-normal">· {c.email}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                      <Badge variant={statusVariant(c.service_status)} className="h-4 px-1.5 text-[10px] font-normal rounded-sm">
                        {STATUS_LABEL[c.service_status ?? ""] ?? (c.service_status ?? "—")}
                      </Badge>
                      <span className="font-mono">{c.id.slice(0, 8)}</span>
                      <span>· {c.language ?? "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" className="h-7 px-2.5 text-xs" asChild>
                      <Link to={`/operator/cases/${c.id}`}>Open case</Link>
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs font-normal" onClick={() => downloadBrief(c)}>
                      Download Brief
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs font-normal text-muted-foreground" onClick={() => copyBrief(c)}>
                      Copy Brief
                    </Button>
                  </div>
                </div>
                {c.raw_input && (
                  <pre className="text-[11px] whitespace-pre-wrap text-muted-foreground max-h-24 overflow-auto leading-snug">
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