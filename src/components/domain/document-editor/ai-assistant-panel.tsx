"use client";

import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";

export function AiAssistantPanel({
  editor,
  editable,
}: {
  editor: Editor | null;
  editable: boolean;
}) {
  function insert(html: string) {
    if (!editor || !editable) return;
    editor.chain().focus().insertContent(html).run();
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed text-text-dim">
        Demo AI assistant — inserts suggested copy into the document. No
        external model call.
      </p>
      <Button
        variant="ghost"
        className="h-auto w-full justify-start whitespace-normal px-2 py-2 text-left text-[12px]"
        disabled={!editable}
        onClick={() =>
          insert(
            `<h2>Executive summary</h2><p>This activity strengthened peer learning and delivered a tangible chapter asset. Recommend repeating the format next month with tighter CR coordination.</p>`,
          )
        }
      >
        Improve summary
      </Button>
      <Button
        variant="ghost"
        className="h-auto w-full justify-start whitespace-normal px-2 py-2 text-left text-[12px]"
        disabled={!editable}
        onClick={() =>
          insert(
            `<h2>Highlights</h2><ul><li>Strong first-year participation</li><li>Mentor unblocking in real time</li><li>Reusable assets for the next workshop</li></ul>`,
          )
        }
      >
        Expand highlights
      </Button>
      <Button
        variant="ghost"
        className="h-auto w-full justify-start whitespace-normal px-2 py-2 text-left text-[12px]"
        disabled={!editable}
        onClick={() =>
          insert(
            `<h2>Next steps</h2><p>Confirm venue, publish registration, and brief CRs 48 hours before the session.</p>`,
          )
        }
      >
        Draft next steps
      </Button>
    </div>
  );
}
