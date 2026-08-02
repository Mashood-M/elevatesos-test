import { Extension } from "@tiptap/core";

/** Tab / Shift-Tab indent for bullet, ordered, and task lists. */
export const DocumentListKeymap = Extension.create({
  name: "documentListKeymap",

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.commands.sinkListItem("listItem")) return true;
        if (this.editor.commands.sinkListItem("taskItem")) return true;
        return false;
      },
      "Shift-Tab": () => {
        if (this.editor.commands.liftListItem("listItem")) return true;
        if (this.editor.commands.liftListItem("taskItem")) return true;
        return false;
      },
    };
  },
});
