"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useStore } from "@/context/store-context";
import { answerableQuestions } from "@/lib/forms/helpers";
import type { ElevatesStore, FormDefinition, FormQuestion } from "@/types";

function formatAnswer(
  v: unknown,
  question: FormQuestion | undefined,
  store: ElevatesStore,
): string {
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return v.join("; ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (question?.type === "representative" && typeof v === "string") {
    return store.profiles.find((p) => p.id === v)?.fullName ?? v;
  }
  return String(v);
}

export function FormResponses({
  form,
  canManage,
}: {
  form: FormDefinition;
  canManage: boolean;
}) {
  const { store, deleteFormResponse } = useStore();
  const [fromDate, setFromDate] = useState("");

  const cols = useMemo(() => answerableQuestions(form), [form]);
  const rows = useMemo(() => {
    let list = (store.formResponses ?? []).filter((r) => r.formId === form.id);
    if (fromDate) {
      const start = new Date(fromDate).getTime();
      list = list.filter((r) => new Date(r.submittedAt).getTime() >= start);
    }
    return list;
  }, [store.formResponses, form.id, fromDate]);

  function exportCsv() {
    const headers = [
      "Submitted",
      "Respondent",
      ...cols.map((c) => c.title),
    ];
    const lines = [headers.join(",")];
    for (const row of rows) {
      const user = store.profiles.find((p) => p.id === row.userId);
      const cells = [
        row.submittedAt,
        user?.fullName ?? row.userId,
        ...cols.map((c) => {
          const raw = formatAnswer(row.answers[c.id], c, store);
          return `"${raw.replace(/"/g, '""')}"`;
        }),
      ];
      lines.push(cells.join(","));
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.title.replace(/\s+/g, "-").toLowerCase()}-responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <TerminalPanel
      title="responses"
      meta={`${rows.length} row${rows.length === 1 ? "" : "s"}`}
    >
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <FieldLabel>From date</FieldLabel>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <Button variant="ghost" onClick={() => setFromDate("")}>
          Clear filter
        </Button>
        <Button variant="orange" onClick={exportCsv} disabled={!rows.length}>
          Export CSV
        </Button>
      </div>

      {!rows.length ? (
        <p className="text-sm text-text-dim">No responses yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b border-border text-text-dim">
                <th className="px-2 py-2 font-medium">Submitted</th>
                <th className="px-2 py-2 font-medium">Respondent</th>
                {cols.map((c) => (
                  <th key={c.id} className="px-2 py-2 font-medium">
                    {c.title}
                  </th>
                ))}
                {canManage ? (
                  <th className="px-2 py-2 font-medium"> </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const user = store.profiles.find((p) => p.id === row.userId);
                return (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="whitespace-nowrap px-2 py-2 text-text-dim">
                      {new Date(row.submittedAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-2 font-medium">
                      {user?.fullName ?? row.userId}
                    </td>
                    {cols.map((c) => (
                      <td key={c.id} className="max-w-[220px] truncate px-2 py-2">
                        {formatAnswer(row.answers[c.id], c, store)}
                      </td>
                    ))}
                    {canManage ? (
                      <td className="px-2 py-2">
                        <Button
                          variant="ghost"
                          onClick={() => deleteFormResponse(row.id)}
                        >
                          Delete
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </TerminalPanel>
  );
}
