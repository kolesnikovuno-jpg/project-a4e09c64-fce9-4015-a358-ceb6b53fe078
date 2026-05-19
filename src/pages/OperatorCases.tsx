import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { buildCaseBrief, downloadBriefFile } from "@/lib/caseBrief";
import { ManualCopyDialog } from "@/components/operator/ManualCopyDialog";
import {
  OperatorShell,
  UtilityRow,
  ActionBar,
  BarGroup,
  ToolLink,
  ToolButton,
  PageTitle,
  StateLabel,
  ListRow,
} from "@/components/operator/ui";

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
      <main className="operator-workspace min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center space-y-4">
          <p className="text-foreground text-sm">Доступ только для администраторов.</p>
          <ToolButton onClick={signOut}>Sign out</ToolButton>
        </div>
      </main>
    );
  }

  return (
    <OperatorShell>
      <ManualCopyDialog text={manualCopyText} onClose={() => setManualCopyText("")} />
      <UtilityRow onSignOut={signOut} />
      <ActionBar>
        <BarGroup label="View">
          <PageTitle>Cases</PageTitle>
        </BarGroup>
        <BarGroup label="Switch">
          <ToolLink to="/operator/submissions">Submissions</ToolLink>
        </BarGroup>
      </ActionBar>

        {cases === null ? (
          <p className="text-muted-foreground text-sm">Загрузка…</p>
        ) : cases.length === 0 ? (
          <p className="text-muted-foreground text-sm">Пока нет кейсов.</p>
        ) : (
          <ul>
            {cases.map((c) => (
              <ListRow key={c.id}>
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-foreground truncate">
                      <span className="font-medium">{c.client_name ?? "—"}</span>
                      <span className="text-muted-foreground"> · {c.email}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                      <StateLabel>
                        {STATUS_LABEL[c.service_status ?? ""] ?? (c.service_status ?? "—")}
                      </StateLabel>
                      <span className="font-mono">{c.id.slice(0, 8)}</span>
                      <span>· {c.language ?? "—"}</span>
                      {c.created_at && <span>· {new Date(c.created_at).toLocaleDateString()}</span>}
                    </div>
                    {c.raw_input && (
                      <p className="text-[11px] text-muted-foreground/80 mt-2 line-clamp-2 leading-relaxed">
                        {c.raw_input}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0 pt-0.5">
                    <ToolLink to={`/operator/cases/${c.id}`} emphasis="primary">
                      Open
                    </ToolLink>
                    <ToolButton onClick={() => downloadBrief(c)}>Download Brief</ToolButton>
                    <ToolButton onClick={() => copyBrief(c)}>Copy</ToolButton>
                  </div>
                </div>
              </ListRow>
            ))}
          </ul>
        )}
    </OperatorShell>
  );
}