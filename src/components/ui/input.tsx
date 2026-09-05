import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function FieldLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("mb-1.5 block text-[12px] font-medium text-text-dim", className)}>
      {children}
    </label>
  );
}

const field =
  "w-full h-11 rounded-full border-0 bg-bg px-4 text-[13px] text-text outline-none shadow-[var(--shadow-sm)] placeholder:text-text-mute focus:ring-2 focus:ring-[var(--accent-soft)]";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(field, className)} {...props} />;
  }
);

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        field,
        "h-auto min-h-[104px] rounded-[var(--radius-sm)] py-3",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(field, "pr-8", className)} {...props}>
      {children}
    </select>
  );
}
