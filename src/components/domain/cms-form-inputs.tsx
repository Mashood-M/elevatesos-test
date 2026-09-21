"use client";

import React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
export interface Host {
  name: string;
  role: string;
}

export interface Organizer {
  name: string;
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-text-dim uppercase tracking-wider block">
        {label}
      </label>
      {children}
    </div>
  );
}

export function TInput({
  value,
  onChange,
  onBlur,
  placeholder,
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <input
      className={`h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 text-xs text-text ${
        mono ? "font-mono" : ""
      }`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
    />
  );
}

export function TArea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      rows={rows}
      className="w-full rounded-[var(--radius-md)] border border-border bg-bg px-3 py-2 text-xs text-text resize-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

export function StrList({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            className="h-8 flex-1 rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text"
            placeholder={placeholder}
            value={item}
            onChange={(e) => {
              const n = [...items];
              n[i] = e.target.value;
              onChange(n);
            }}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="text-text-dim hover:text-red-500 p-1"
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => onChange([...items, ""])}
      >
        <Plus size={12} /> Add
      </Button>
    </div>
  );
}

export function HostList({
  hosts,
  onChange,
}: {
  hosts: Host[];
  onChange: (v: Host[]) => void;
}) {
  return (
    <div className="space-y-2">
      {hosts.map((h, i) => (
        <div key={i} className="flex gap-2 items-center flex-wrap">
          <input
            className="h-8 flex-1 min-w-[140px] rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text"
            placeholder="Speaker/Host name"
            value={h.name}
            onChange={(e) => {
              const n = [...hosts];
              n[i] = { ...n[i], name: e.target.value };
              onChange(n);
            }}
          />
          <input
            className="h-8 flex-1 min-w-[180px] rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text"
            placeholder="Role / Company / Title"
            value={h.role}
            onChange={(e) => {
              const n = [...hosts];
              n[i] = { ...n[i], role: e.target.value };
              onChange(n);
            }}
          />
          <button
            type="button"
            onClick={() => onChange(hosts.filter((_, j) => j !== i))}
            className="text-text-dim hover:text-red-500 p-1"
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => onChange([...hosts, { name: "", role: "" }])}
      >
        <Plus size={12} /> Add Speaker/Host
      </Button>
    </div>
  );
}

export function OrgList({
  orgs,
  onChange,
}: {
  orgs: Organizer[];
  onChange: (v: Organizer[]) => void;
}) {
  return (
    <div className="space-y-2">
      {orgs.map((o, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            className="h-8 flex-1 rounded-[var(--radius-md)] border border-border bg-bg px-2 text-xs text-text"
            placeholder="Organizer name"
            value={o.name}
            onChange={(e) => {
              const n = [...orgs];
              n[i] = { name: e.target.value };
              onChange(n);
            }}
          />
          <button
            type="button"
            onClick={() => onChange(orgs.filter((_, j) => j !== i))}
            className="text-text-dim hover:text-red-500 p-1"
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => onChange([...orgs, { name: "" }])}
      >
        <Plus size={12} /> Add Organizer
      </Button>
    </div>
  );
}
