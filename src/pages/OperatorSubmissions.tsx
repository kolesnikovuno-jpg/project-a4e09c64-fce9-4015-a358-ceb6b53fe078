import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Submission = Tables<"submissions">;

export default function OperatorSubmissions() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Submission[] | null>(null);
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
        .from("submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        toast({ title: "Не удалось загрузить заявки", description: error.message, variant: "destructive" });
        return;
      }
      if (active) setItems((data ?? []) as Submission[]);
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/operator/login", { replace: true });
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
            {items.map((s) => (
              <li key={s.id} className="border border-border p-4 bg-card space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.name ?? "—"} · {s.email}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {s.language ?? "—"} · {s.status} · {s.created_at ? new Date(s.created_at).toLocaleString() : "—"}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/operator/submissions/${s.id}`}>Open submission</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}