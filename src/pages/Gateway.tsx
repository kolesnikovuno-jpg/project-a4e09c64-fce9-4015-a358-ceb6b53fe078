import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useLocale } from "@/i18n/useLocale";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";

const Gateway = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const { t, localePath } = useLocale();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password === "2222") {
      sessionStorage.setItem("unostudio-gateway", "ok");
      navigate(localePath("/unostudio"));
    } else {
      setError(true);
      setPassword("");
      setTimeout(() => setError(false), 600);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <LanguageSwitcher />
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-xs flex flex-col items-start gap-6"
      >
        <div className="-ml-[0.35em]">
          <span className="text-base tracking-[0.15em] font-normal text-foreground">
            .uno<span className="text-[9px] tracking-[0.08em] text-muted-foreground">{t.gateway.studio_suffix}</span>
          </span>
        </div>
        <motion.input
          type="password"
          inputMode="numeric"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••"
          animate={error ? { x: [-6, 6, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          className={`w-full bg-transparent border-b border-border/40 focus:border-primary outline-none text-foreground text-[15px] tracking-[0.3em] py-2 placeholder:text-muted-foreground/40 transition-colors ${
            error ? "border-destructive" : ""
          }`}
        />
        <button
          type="submit"
          className="text-[13px] text-primary/75 hover:text-primary/90 transition-colors tracking-[0.05em]"
        >
          {t.gateway.enter}
        </button>
      </motion.form>
    </div>
  );
};

export default Gateway;
