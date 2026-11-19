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
  const [analytics, setAnalytics] = useState<{ page_views: number; request_opens: number; request_success: number; inquiries: number; sessions: number; scroll_3d: number; scroll_details: number; model_interact: number; ar_click: number; info_open: number; sources: Array<{source: string; visits: number}>; last_7_days: Array<{ day: string; views: number; opens: number }> } | null>(null);
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    const { data, error: statsError } = await supabase.rpc("lyra_admin_analytics");
    if (statsError) setAnalyticsError(statsError.message);
    else { setAnalytics(data as typeof analytics); setAnalyticsError(""); }
    setAnalyticsLoading(false);
  };
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
      void loadAnalytics();
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
      <section className="mb-10 border-b border-border/60 pb-8" aria-label="Lyra analytics">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium tracking-wide">Lyra / Analytics</h2>
          <button type="button" onClick={() => void loadAnalytics()} disabled={analyticsLoading} className="text-xs underline underline-offset-4 disabled:opacity-50">{analyticsLoading ? "Обновление…" : "Обновить"}</button>
        </div>
        {analyticsError && <p role="alert" className="mb-4 text-xs text-red-700">{analyticsError}</p>}
        {analytics ? <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Просмотры", analytics.page_views],
              ["Открытия формы", analytics.request_opens],
              ["Отправки формы", analytics.request_success],
              ["Заявки в базе", analytics.inquiries],
            ].map(([label, value]) => <div key={label} className="border border-border/60 p-4"><div className="text-[11px] text-muted-foreground">{label}</div><div className="mt-2 text-2xl tabular-nums">{value}</div></div>)}
          </div>
          <div className="mt-4 text-xs text-muted-foreground">Открытия формы / просмотры: {analytics.page_views ? (analytics.request_opens / analytics.page_views * 100).toFixed(1) + "%" : "—"} · Заявки / просмотры: {analytics.page_views ? (analytics.request_success / analytics.page_views * 100).toFixed(1) + "%" : "—"}</div>
          <h3 className="mt-8 mb-3 text-xs font-medium">Взаимодействие со страницей</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {[
              ["Сеансы", analytics.sessions],
              ["Дошли до 3D", analytics.scroll_3d],
              ["Дошли до описания", analytics.scroll_details],
              ["Взаимодействовали с 3D", analytics.model_interact],
              ["Открыли информацию", analytics.info_open],
              ["Нажали AR", analytics.ar_click],
            ].map(([label, value]) => <div key={label} className="border border-border/60 p-4"><div className="text-[11px] text-muted-foreground">{label}</div><div className="mt-2 text-xl tabular-nums">{value}</div></div>)}
          </div>
          <h3 className="mt-8 mb-3 text-xs font-medium">Источники переходов</h3>
          {analytics.sources.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-border/60"><th className="py-2 font-normal">Источник</th><th className="py-2 font-normal">Просмотры</th></tr></thead><tbody>{analytics.sources.map(row => <tr key={row.source} className="border-b border-border/30"><td className="py-2">{row.source}</td><td className="py-2 tabular-nums">{row.visits}</td></tr>)}</tbody></table></div> : <p className="text-xs text-muted-foreground">Переходов пока нет.</p>}
          <p className="mt-3 text-[11px] text-muted-foreground">Источник определяется по UTM или сайту перехода; при отсутствии данных показывается direct. Сеансы — не уникальные люди.</p>
          <h3 className="mt-7 mb-3 text-xs font-medium">Последние 7 дней</h3>
          <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-border/60"><th className="py-2 font-normal">Дата</th><th className="py-2 font-normal">Просмотры</th><th className="py-2 font-normal">Открытия формы</th></tr></thead><tbody>{analytics.last_7_days.map(row => <tr key={row.day} className="border-b border-border/30"><td className="py-2">{new Date(row.day).toLocaleDateString("ru-RU")}</td><td className="py-2 tabular-nums">{row.views}</td><td className="py-2 tabular-nums">{row.opens}</td></tr>)}</tbody></table></div>
          <p className="mt-3 text-[11px] text-muted-foreground">Новая аналитика учитывает события после её публикации. Ранее сохранённые заявки остаются в базе отдельно.</p>
        </> : !analyticsError ? <p className="text-xs text-muted-foreground">Загрузка аналитики…</p> : null}
      </section>
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
