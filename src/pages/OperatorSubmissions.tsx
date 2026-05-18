import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      <main className="operator-workspace min-h-screen flex items-center justify-center bg-background px-4">
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
          <h1 className="text-2xl font-medium">Submissions</h1>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/operator/cases">Cases</Link>
            </Button>
            <Button variant="ghost" onClick={signOut}>Sign out</Button>
          </div>
        </header>

        {items === null ? (
          <p className="text-muted-foreground">Загрузка…</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">Пока нет заявок.</p>
        ) : (
          <ul className="space-y-4">
            {items.map((s) => {
              const statusLabel = STATUS_LABELS[s.status] ?? s.status;
              const isGenerating = generatingIds.has(s.id);
              const isSaving = savingIds.has(s.id);
              const currentRowValue = rowStatusValues[s.id] ?? s.status;
              return (
                <li key={s.id} className="border border-border p-4 bg-card space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{s.name ?? "—"} · {s.email}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {s.language ?? "—"} · {s.created_at ? new Date(s.created_at).toLocaleString() : "—"}
                      </div>
                      <div className="mt-2 flex items-center gap-3 flex-wrap">
                        <span className="inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {statusLabel}
                        </span>
                        {s.assessment_notes && (
                          <span className="inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-foreground">
                            Assessment ready
                          </span>
                        )}
                        <div className="w-40">
                          <Select
                            value={currentRowValue}
                            onValueChange={(value) => handleStatusChange(s.id, value)}
                            disabled={isSaving}
                          >
                            <SelectTrigger className="h-8 text-xs rounded-none">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                              {STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => generateAssessment(s)} disabled={isGenerating}>
                        {isGenerating ? "Генерация…" : "Generate Assessment"}
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/operator/submissions/${s.id}`}>Open submission</Link>
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

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
    </main>
  );
}
