import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "default" | "accent" | "success" | "danger";

const toneClassMap: Record<BadgeTone, string> = {
  default: "bg-slate-100 text-slate-700 border-slate-200",
  accent: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
};

type PremiumBadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
};

export function PremiumBadge({ children, tone = "default", className }: PremiumBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide",
        toneClassMap[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
