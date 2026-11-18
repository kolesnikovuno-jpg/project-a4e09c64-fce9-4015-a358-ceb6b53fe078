import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { lyraSupabase as supabase } from "@/integrations/supabase/lyraClient";
import { OperatorShell, UtilityRow, ActionBar, BarGroup, PageTitle, ToolLink, StateLabel, ListRow, CompactSelect } from "@/components/operator/ui";

type Inquiry = {
  id: string; created_at: string; name: string; email: string; location: string;
  intent: string; message: string | null; locale: string; status: string; operator_notes: string | null;
};
const options = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "in_discussion", label: "In discussion" },
  { value: "closed", label: "Closed" },
];
export default function OperatorLyra() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [items, setItems] = useState<Inquiry[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate("/operator/login", { replace: true }); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", sess.session.user.id);
      const admin = Array.isArray(roles) && roles.some((r: { role: string }) => r.role === "admin");
      if (!active) return;
      setAuthorized(admin);
      if (!admin) return;
      const { data, error: fetchError } = await supabase.from("lyra_inquiries").select("*").order("created_at", { ascending: false });
      if (!active) return;
      if (fetchError) setError(fetchError.message);
      else setItems((data ?? []) as unknown as Inquiry[]);
    })();
    return () => { active = false; };
  }, [navigate]);
  const changeStatus = async (id: string, status: string) => {
    setSaving(id); setError("");
    const { error: updateError } = await supabase.from("lyra_inquiries").update({ status } as never).eq("id", id);
    setSaving(null);
    if (updateError) setError(updateError.message);
    else setItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  };
  return <OperatorShell>
    <UtilityRow onSignOut={async () => { await supabase.auth.signOut(); navigate("/operator/login", { replace: true }); }} />
    <ActionBar><BarGroup label="View"><PageTitle>Lyra / Inquiries</PageTitle></BarGroup>
      <BarGroup label="Switch"><ToolLink to="/operator/submissions">Submissions</ToolLink><ToolLink to="/operator/cases">Cases</ToolLink></BarGroup></ActionBar>
    {authorized === null ? <p>Loading…</p> : !authorized ? <p>Admin access required.</p> : <>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {items.length === 0 && !error && <p className="text-sm text-muted-foreground">No Lyra inquiries yet.</p>}
      <ul>{items.map(item => <ListRow key={item.id}>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="min-w-0 text-sm">
            <div className="font-medium">{item.name} · <a href={`mailto:${item.email}`} className="underline">{item.email}</a></div>
            <div className="mt-1 text-xs text-muted-foreground">{item.intent} · {item.location} · {item.locale} · {new Date(item.created_at).toLocaleString()}</div>
            {item.message && <p className="mt-2 whitespace-pre-wrap text-xs">{item.message}</p>}
            <div className="mt-2"><StateLabel>{item.status}</StateLabel></div>
          </div>
          <div className="shrink-0"><CompactSelect value={item.status} options={options} disabled={saving === item.id} onChange={(value: string) => changeStatus(item.id, value)} /></div>
        </div>
      </ListRow>)}</ul>
    </>}
  </OperatorShell>;
}
