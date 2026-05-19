import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

/* Shared operator-workspace primitives.
   Visual language: flat, typography-led, no cards / shadows / colored badges.
   Reference: OperatorCaseDetail. */

export function OperatorShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="operator-workspace min-h-screen bg-background px-6 py-6">
      <div className="max-w-6xl mx-auto space-y-6">{children}</div>
    </main>
  );
}

export function UtilityRow({
  back,
  onSignOut,
}: {
  back?: { to: string; label: string };
  onSignOut?: () => void;
}) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      {back ? (
        <Link
          to={back.to}
          className="text-muted-foreground/80 hover:text-foreground transition-colors"
        >
          ← {back.label}
        </Link>
      ) : (
        <span />
      )}
      {onSignOut && (
        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex items-center gap-1 text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          <LogOut className="h-2.5 w-2.5" />
          Sign out
        </button>
      )}
    </div>
  );
}

export function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <header className="flex items-end flex-wrap gap-x-6 gap-y-3 border-b border-border/60 pb-3">
      {children}
    </header>
  );
}

export function BarGroup({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-[9px] uppercase tracking-[0.14em] font-semibold text-muted-foreground/70">
          {label}
        </span>
      )}
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}

export function ToolButton({
  children,
  onClick,
  disabled,
  emphasis = "ghost",
  title,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  emphasis?: "ghost" | "primary";
  title?: string;
  type?: "button" | "submit";
}) {
  const base =
    "text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed leading-none py-[3px]";
  const styles =
    emphasis === "primary"
      ? "text-foreground underline underline-offset-[5px] decoration-foreground/40 hover:decoration-foreground"
      : "text-foreground/75 hover:text-foreground";
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} className={cn(base, styles)}>
      {children}
    </button>
  );
}

export function ToolLink({
  to,
  children,
  emphasis = "ghost",
}: {
  to: string;
  children: React.ReactNode;
  emphasis?: "ghost" | "primary";
}) {
  const base = "text-[12px] font-medium transition-colors leading-none py-[3px]";
  const styles =
    emphasis === "primary"
      ? "text-foreground underline underline-offset-[5px] decoration-foreground/40 hover:decoration-foreground"
      : "text-foreground/75 hover:text-foreground";
  return (
    <Link to={to} className={cn(base, styles)}>
      {children}
    </Link>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
      {children}
    </div>
  );
}

export function MetaRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex gap-2 text-[11px] leading-relaxed">
      <span className="w-20 shrink-0 text-muted-foreground/80">{label}</span>
      <span className="min-w-0 flex-1 text-foreground font-medium">{value}</span>
    </div>
  );
}

export function WorkBlock({
  label,
  hint,
  action,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-[0.14em] text-foreground/80 font-semibold">
            {label}
          </span>
          {hint && <span className="text-[10px] text-muted-foreground/80">{hint}</span>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* Quiet state label — text-led, never a button. */
export function StateLabel({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "muted" | "done";
}) {
  const tones: Record<string, string> = {
    neutral: "text-foreground/80",
    muted: "text-muted-foreground",
    done: "text-foreground/70",
  };
  return (
    <span className={cn("text-[11px] font-medium", tones[tone])}>{children}</span>
  );
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-[11px] uppercase tracking-[0.18em] font-semibold text-foreground/70">
      {children}
    </h1>
  );
}

export function Divider() {
  return <div className="h-px w-full bg-border/60" />;
}

export function ListRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "py-3 border-b border-border/60 last:border-b-0",
        className
      )}
    >
      {children}
    </li>
  );
}

/* Compact custom select — visually consistent with StatusChip in case detail.
   Rendered as a flat text trigger with a chevron. */
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";

export function CompactSelect({
  value,
  onChange,
  options,
  disabled,
  align = "start",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  align?: "start" | "end";
}) {
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground/85 hover:text-foreground transition-colors disabled:opacity-40"
        >
          {current?.label ?? value}
          <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} sideOffset={4} className="w-44 p-1 rounded-none border-border shadow-none">
        <div className="flex flex-col">
          {options.map((o) => {
            const active = o.value === current?.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange(o.value)}
                className={cn(
                  "text-left text-[11px] px-2 py-1.5 transition-colors",
                  active
                    ? "text-foreground bg-muted/60"
                    : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}