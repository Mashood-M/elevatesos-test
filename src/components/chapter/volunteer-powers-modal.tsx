"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  VOLUNTEER_POWER_DEFINITIONS,
  VOLUNTEER_POWER_PRESETS,
  DEFAULT_VOLUNTEER_POWERS,
} from "@/lib/volunteers";
import type { VolunteerPowers } from "@/types";
import { Check, QrCode, Shield, Sparkles } from "lucide-react";

interface VolunteerPowersModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  initialPowers?: VolunteerPowers;
  onSave: (powers: VolunteerPowers) => void;
  isIndividualOverride?: boolean;
  onResetToGroup?: () => void;
}

export function VolunteerPowersModal({
  open,
  onClose,
  title,
  subtitle,
  initialPowers = DEFAULT_VOLUNTEER_POWERS,
  onSave,
  isIndividualOverride = false,
  onResetToGroup,
}: VolunteerPowersModalProps) {
  const [powers, setPowers] = useState<VolunteerPowers>({ ...initialPowers });

  const activeCount = Object.values(powers).filter(Boolean).length;

  function togglePower(key: keyof VolunteerPowers) {
    setPowers((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function applyPreset(presetPowers: VolunteerPowers) {
    setPowers({ ...presetPowers });
  }

  function handleSave() {
    onSave(powers);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={subtitle || "Control delegated event actions and authority with checkbox configuration."}
    >
      <div className="space-y-5">
        {/* Quick Presets Bar */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold text-text-dim uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={12} className="text-[var(--accent)]" />
              Quick Presets
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {activeCount} of 6 Powers Active
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {VOLUNTEER_POWER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.powers)}
                className="text-left p-2 rounded-[10px] border border-border/80 bg-bg hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition text-xs group"
              >
                <div className="font-semibold text-text group-hover:text-[var(--accent)] truncate">
                  {preset.name}
                </div>
                <div className="text-[10px] text-text-mute truncate">
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Checkbox Setup Area */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-text-dim uppercase tracking-wider block">
            Delegated Powers (Checkbox Setup)
          </span>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {VOLUNTEER_POWER_DEFINITIONS.map((def) => {
              const isChecked = Boolean(powers[def.key]);
              return (
                <label
                  key={def.key}
                  className={`flex items-start gap-3 p-3 rounded-[12px] border cursor-pointer transition select-none ${
                    isChecked
                      ? "bg-emerald-500/5 border-emerald-500/40 shadow-sm"
                      : "bg-bg border-border/70 hover:border-border"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => togglePower(def.key)}
                    className="mt-0.5 h-4 w-4 rounded border-border text-emerald-500 focus:ring-emerald-500/30 cursor-pointer shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-text">
                        {def.label}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold shrink-0 ${
                          isChecked
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : "bg-bg-page border border-border text-text-mute"
                        }`}
                      >
                        {isChecked ? "ACTIVE" : "OFF"}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-dim mt-0.5 leading-relaxed">
                      {def.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border">
          {isIndividualOverride && onResetToGroup ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onResetToGroup();
                onClose();
              }}
              className="text-xs text-amber-500 hover:text-amber-600 px-2 h-auto py-1"
            >
              Reset to Group Default
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Button type="button" variant="ghost" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              type="button"
              variant="orange"
              onClick={handleSave}
              className="text-xs font-bold shadow-sm"
            >
              Save Powers
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
