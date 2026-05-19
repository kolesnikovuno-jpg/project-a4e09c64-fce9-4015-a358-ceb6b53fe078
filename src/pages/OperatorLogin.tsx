import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { PageTitle, ToolButton } from "@/components/operator/ui";

export default function OperatorLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/operator/cases", { replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Ошибка входа", description: error.message, variant: "destructive" });
      return;
    }
    navigate("/operator/cases", { replace: true });
  };

  return (
    <main className="operator-workspace min-h-screen flex items-center justify-center bg-background px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-8">
        <PageTitle>Operator</PageTitle>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="rounded-none border-0 border-b border-border/60 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-foreground/60 h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="rounded-none border-0 border-b border-border/60 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-foreground/60 h-9 text-sm"
            />
          </div>
        </div>
        <div className="pt-2">
          <ToolButton type="submit" disabled={loading} emphasis="primary">
            {loading ? "Signing in…" : "Sign in"}
          </ToolButton>
        </div>
      </form>
    </main>
  );
}