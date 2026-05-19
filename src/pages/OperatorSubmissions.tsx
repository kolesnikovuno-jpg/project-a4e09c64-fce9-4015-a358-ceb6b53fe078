import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import {
  OperatorShell,
  UtilityRow,
  ActionBar,
  BarGroup,
  PageTitle,
  ToolLink,
  ToolButton,
  StateLabel,
  ListRow,
  CompactSelect,
} from "@/components/operator/ui";

type Submission = Tables<"submissions">;

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "paid", label: "Paid" },
] as const;

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  accepted: "Accepted",
  rejected: "Rejected",
  paid: "Paid",
};

export default function OperatorSubmissions() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Submission[] | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<{ id: string; value: string } | null>(null);
  const [rowStatusValues, setRowStatusValues] = useState<Record<string, string>>({});

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
        .order("created_at", { ascending: false });
      if (error) {
        toast({ title: "Не удалось загрузить заявки", description: error.message, variant: "destructive" });
        return;
      }
      const list = (data ?? []) as Submission[];
      if (active) {
        setItems(list);
        const init: Record<string, string> = {};
        for (const s of list) init[s.id] = s.status;
        setRowStatusValues(init);
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/operator/login", { replace: true });
  };

  const generateAssessment = async (s: Submission) => {
    setGeneratingIds((prev) => new Set(prev).add(s.id));
    const { data, error } = await supabase.functions.invoke("generate-submission-assessment", {
      body: { submission_id: s.id },
    });
    setGeneratingIds((prev) => {
      const next = new Set(prev);
      next.delete(s.id);
      return next;
    });
    if (error) {
      toast({ title: "Не удалось сгенерировать", description: error.message, variant: "destructive" });
      return;
    }
    const notes = (data as { assessment_notes?: string })?.assessment_notes;
    if (notes) {
      setItems((prev) =>
        prev?.map((item) => (item.id === s.id ? { ...item, assessment_notes: notes } : item)) ?? null
      );
      toast({ title: "Оценка готова" });
    }
  };

  const commitStatusChange = async (id: string, value: string) => {
    setSavingIds((prev) => new Set(prev).add(id));
    const { error } = await supabase
      .from("submissions")
      .update({ status: value } as never)
      .eq("id", id);
    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (error) {
      toast({ title: "Не удалось обновить статус", description: error.message, variant: "destructive" });
      const original = items?.find((i) => i.id === id)?.status ?? "new";
      setRowStatusValues((prev) => ({ ...prev, [id]: original }));
      return;
    }
    setItems((prev) =>
      prev?.map((item) => (item.id === id ? { ...item, status: value } : item)) ?? null
    );
    toast({ title: "Статус обновлён" });
  };

  const handleStatusChange = (id: string, value: string) => {
    setRowStatusValues((prev) => ({ ...prev, [id]: value }));
    if (value === "accepted") {
      setPendingStatus({ id, value });
      setConfirmOpen(true);
      return;
    }
    commitStatusChange(id, value);
  };

  const confirmAccept = () => {
    if (!pendingStatus) return;
    setConfirmOpen(false);
    commitStatusChange(pendingStatus.id, pendingStatus.value);
    setPendingStatus(null);
  };

  const cancelAccept = () => {
    if (!pendingStatus) return;
    const original = items?.find((i) => i.id === pendingStatus.id)?.status ?? "new";
    setRowStatusValues((prev) => ({ ...prev, [pendingStatus.id]: original }));
    setPendingStatus(null);
    setConfirmOpen(false);
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
      <UtilityRow onSignOut={signOut} />
      <ActionBar>
        <BarGroup label="View">
          <PageTitle>Submissions</PageTitle>
        </BarGroup>
        <BarGroup label="Switch">
          <ToolLink to="/operator/cases">Cases</ToolLink>
        </BarGroup>
      </ActionBar>

        {items === null ? (
          <p className="text-muted-foreground text-sm">Загрузка…</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Пока нет заявок.</p>
        ) : (
          <ul>
            {items.map((s) => {
              const statusLabel = STATUS_LABELS[s.status] ?? s.status;
              const isGenerating = generatingIds.has(s.id);
              const isSaving = savingIds.has(s.id);
              const currentRowValue = rowStatusValues[s.id] ?? s.status;
              return (
                <ListRow key={s.id}>
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-foreground truncate">
                        <span className="font-medium">{s.name ?? "—"}</span>
                        <span className="text-muted-foreground"> · {s.email}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                        <StateLabel>{statusLabel}</StateLabel>
                        <span>· {s.language ?? "—"}</span>
                        {s.created_at && <span>· {new Date(s.created_at).toLocaleDateString()}</span>}
                        {s.assessment_notes && (
                          <span>· assessment ready</span>
                        )}
                      </div>
                      <div className="mt-2">
                        <CompactSelect
                          value={currentRowValue}
                          onChange={(value) => handleStatusChange(s.id, value)}
                          options={STATUS_OPTIONS as unknown as { value: string; label: string }[]}
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 pt-0.5">
                      <ToolButton onClick={() => generateAssessment(s)} disabled={isGenerating}>
                        {isGenerating ? "…" : "Generate Assessment"}
                      </ToolButton>
                      <ToolLink to={`/operator/submissions/${s.id}`} emphasis="primary">
                        Open
                      </ToolLink>
                    </div>
                  </div>
                </ListRow>
              );
            })}
          </ul>
        )}

      <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!open) cancelAccept(); }}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердить принятие?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие отправит клиенту письмо с запросом оплаты.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelAccept} className="rounded-none">Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAccept} className="rounded-none">Подтвердить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OperatorShell>
  );
}
