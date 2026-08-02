"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

type ConfirmOpts = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type PromptOpts = {
  title: string;
  description?: string;
  label?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type AlertOpts = {
  title: string;
  description?: string;
  confirmLabel?: string;
};

type AppDialogsApi = {
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
  prompt: (opts: PromptOpts) => Promise<string | null>;
  alert: (opts: AlertOpts) => Promise<void>;
};

type ActiveDialog =
  | {
      kind: "confirm";
      opts: ConfirmOpts;
      resolve: (v: boolean) => void;
    }
  | {
      kind: "prompt";
      opts: PromptOpts;
      resolve: (v: string | null) => void;
    }
  | {
      kind: "alert";
      opts: AlertOpts;
      resolve: () => void;
    };

const AppDialogsContext = createContext<AppDialogsApi | null>(null);

export function useAppDialogs(): AppDialogsApi {
  const ctx = useContext(AppDialogsContext);
  if (!ctx) {
    throw new Error("useAppDialogs must be used within AppDialogProvider");
  }
  return ctx;
}

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveDialog | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  const confirm = useCallback((opts: ConfirmOpts) => {
    return new Promise<boolean>((resolve) => {
      setActive({ kind: "confirm", opts, resolve });
    });
  }, []);

  const prompt = useCallback((opts: PromptOpts) => {
    return new Promise<string | null>((resolve) => {
      setPromptValue(opts.defaultValue ?? "");
      setActive({ kind: "prompt", opts, resolve });
    });
  }, []);

  const alert = useCallback((opts: AlertOpts) => {
    return new Promise<void>((resolve) => {
      setActive({ kind: "alert", opts, resolve });
    });
  }, []);

  const closeConfirm = useCallback((value: boolean) => {
    setActive((cur) => {
      if (cur?.kind === "confirm") cur.resolve(value);
      return null;
    });
  }, []);

  const closePrompt = useCallback((value: string | null) => {
    setActive((cur) => {
      if (cur?.kind === "prompt") cur.resolve(value);
      return null;
    });
  }, []);

  const closeAlert = useCallback(() => {
    setActive((cur) => {
      if (cur?.kind === "alert") cur.resolve();
      return null;
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const current = active;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (current.kind === "confirm") closeConfirm(false);
        else if (current.kind === "prompt") closePrompt(null);
        else closeAlert();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, closeAlert, closeConfirm, closePrompt]);

  useEffect(() => {
    if (!active) return;
    if (active.kind === "prompt") {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      panelRef.current?.focus();
    }
  }, [active]);

  const api: AppDialogsApi = { confirm, prompt, alert };

  return (
    <AppDialogsContext.Provider value={api}>
      {children}
      {active ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute inset-0 bg-[color-mix(in_srgb,var(--charcoal-900)_45%,transparent)] backdrop-blur-[2px]"
            onClick={() => {
              if (active.kind === "confirm") closeConfirm(false);
              else if (active.kind === "prompt") closePrompt(null);
              else closeAlert();
            }}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={active.opts.description ? descId : undefined}
            tabIndex={-1}
            className={cn(
              "relative z-10 w-full max-w-md overflow-hidden rounded-[var(--radius)] bg-bg-panel p-5 shadow-[var(--shadow)] outline-none md:p-6",
            )}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2
                  id={titleId}
                  className="font-[family-name:var(--font-display)] text-[1.25rem] font-bold tracking-[-0.03em] text-text"
                >
                  {active.opts.title}
                </h2>
                {active.opts.description ? (
                  <p id={descId} className="mt-1 text-[13px] text-text-mute">
                    {active.opts.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (active.kind === "confirm") closeConfirm(false);
                  else if (active.kind === "prompt") closePrompt(null);
                  else closeAlert();
                }}
                aria-label="Close"
                className="rounded-full p-2 text-text-mute hover:bg-bg-hover hover:text-text"
              >
                <X size={18} />
              </button>
            </div>

            {active.kind === "prompt" ? (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  closePrompt(promptValue);
                }}
              >
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-text-dim">
                    {active.opts.label ?? "Value"}
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    className="h-10 w-full rounded-[10px] border border-border bg-bg px-3 text-[13px] text-text outline-none focus:border-[var(--secondary)]"
                    value={promptValue}
                    onChange={(e) => setPromptValue(e.target.value)}
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => closePrompt(null)}
                  >
                    {active.opts.cancelLabel ?? "Cancel"}
                  </Button>
                  <Button type="submit" variant="orange">
                    {active.opts.confirmLabel ?? "OK"}
                  </Button>
                </div>
              </form>
            ) : null}

            {active.kind === "confirm" ? (
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => closeConfirm(false)}
                >
                  {active.opts.cancelLabel ?? "Cancel"}
                </Button>
                <Button
                  type="button"
                  variant={active.opts.danger ? "danger" : "primary"}
                  onClick={() => closeConfirm(true)}
                >
                  {active.opts.confirmLabel ?? "Confirm"}
                </Button>
              </div>
            ) : null}

            {active.kind === "alert" ? (
              <div className="flex justify-end">
                <Button type="button" variant="primary" onClick={closeAlert}>
                  {active.opts.confirmLabel ?? "OK"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </AppDialogsContext.Provider>
  );
}
