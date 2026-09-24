import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "mute",
  className,
}: {
  children: React.ReactNode;
  tone?: "cyan" | "magenta" | "green" | "orange" | "amber" | "mute" | "blue" | "red";
  className?: string;
}) {
  const styles: Record<string, string> = {
    cyan:    "bg-orange-50 text-orange-600",
    magenta: "bg-violet-50 text-violet-600",
    green:   "bg-emerald-50 text-emerald-700",
    orange:  "bg-orange-50 text-orange-700",
    amber:   "bg-amber-50 text-amber-700",
    mute:    "bg-gray-100 text-gray-500",
    blue:    "bg-sky-50 text-sky-700",
    red:     "bg-red-50 text-red-600",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap",
        styles[tone] ?? styles.mute,
        className,
      )}
    >
      {children}
    </span>
  );
}
